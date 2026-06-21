from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectMember, ProjectStatusHistory
from app.models.milestone import Milestone
from app.models.user import User
from app.core.exceptions import NotFoundError, ConflictError
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectMemberCreate, MilestoneCreate, MilestoneUpdate


def list_projects(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
):
    q = db.query(Project).filter(Project.deleted_at.is_(None))
    if status:
        q = q.filter(Project.status == status)
    if client_id:
        q = q.filter(Project.client_id == client_id)
    return q.offset(skip).limit(limit).all()


def get_project(db: Session, project_id: int) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id, Project.deleted_at.is_(None)
    ).first()
    if not project:
        raise NotFoundError("Project not found")
    return project


def create_project(db: Session, payload: ProjectCreate, current_user: User) -> Project:
    project = Project(
        name=payload.name,
        client_id=payload.client_id,
        project_type=payload.project_type,
        description=payload.description,
        start_date=payload.start_date,
        due_date=payload.due_date,
        status=payload.status,
        priority=payload.priority,
        budget=payload.budget,
        progress_percent=payload.progress_percent,
        created_by=current_user.id,
    )
    db.add(project)
    db.flush()

    # Add creator as lead member
    db.add(ProjectMember(project_id=project.id, user_id=current_user.id, role_in_project="lead"))
    # Add additional members
    for uid in payload.member_ids:
        if uid != current_user.id:
            db.add(ProjectMember(project_id=project.id, user_id=uid, role_in_project="member"))

    db.add(ProjectStatusHistory(
        project_id=project.id,
        changed_by=current_user.id,
        from_status=None,
        to_status=payload.status,
        changed_at=datetime.now(timezone.utc),
    ))
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project_id: int, payload: ProjectUpdate, current_user: User) -> Project:
    project = get_project(db, project_id)
    update_data = payload.model_dump(exclude_unset=True)
    old_status = project.status

    for key, value in update_data.items():
        setattr(project, key, value)

    if "status" in update_data and update_data["status"] != old_status:
        db.add(ProjectStatusHistory(
            project_id=project.id,
            changed_by=current_user.id,
            from_status=old_status,
            to_status=update_data["status"],
            changed_at=datetime.now(timezone.utc),
        ))

    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: int) -> None:
    project = get_project(db, project_id)
    project.deleted_at = datetime.now(timezone.utc)
    db.commit()


def add_member(db: Session, project_id: int, payload: ProjectMemberCreate) -> ProjectMember:
    get_project(db, project_id)
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == payload.user_id,
    ).first()
    if existing:
        raise ConflictError("User is already a member of this project")

    member = ProjectMember(
        project_id=project_id,
        user_id=payload.user_id,
        role_in_project=payload.role_in_project,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def remove_member(db: Session, project_id: int, user_id: int) -> None:
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise NotFoundError("Member not found in project")
    db.delete(member)
    db.commit()


# ── Milestone service functions ───────────────────────────────────────────────

def list_milestones(db: Session, project_id: int) -> List[Milestone]:
    get_project(db, project_id)
    return (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .order_by(Milestone.is_completed.asc(), Milestone.due_date.asc().nullslast(), Milestone.id.asc())
        .all()
    )


def create_milestone(db: Session, project_id: int, payload: MilestoneCreate) -> Milestone:
    get_project(db, project_id)
    milestone = Milestone(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


def update_milestone(
    db: Session, project_id: int, milestone_id: int, payload: MilestoneUpdate
) -> Milestone:
    get_project(db, project_id)
    milestone = db.query(Milestone).filter(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    ).first()
    if not milestone:
        raise NotFoundError("Milestone not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(milestone, key, value)

    # Track completion timestamp
    if "is_completed" in update_data:
        if update_data["is_completed"] and milestone.completed_at is None:
            milestone.completed_at = datetime.now(timezone.utc)
        elif not update_data["is_completed"]:
            milestone.completed_at = None

    db.commit()
    db.refresh(milestone)
    return milestone


def delete_milestone(db: Session, project_id: int, milestone_id: int) -> None:
    get_project(db, project_id)
    milestone = db.query(Milestone).filter(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    ).first()
    if not milestone:
        raise NotFoundError("Milestone not found")
    db.delete(milestone)
    db.commit()
