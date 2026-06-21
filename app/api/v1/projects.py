from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.permissions import Permissions
from app.models.project import Project
from app.schemas.project import (
    ProjectRead, ProjectDetail, ProjectCreate, ProjectUpdate, ProjectListItem,
    ProjectMemberCreate, ProjectMemberRead,
    MilestoneCreate, MilestoneUpdate, MilestoneRead,
)
from app.services import project_service

router = APIRouter()


@router.get("/", response_model=List[ProjectListItem])
def list_projects(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
):
    return project_service.list_projects(db, current_user=current_user, skip=skip, limit=limit, status=status, client_id=client_id)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, db: DbSession, current_user: CurrentUser):
    return project_service.get_project(db, project_id)


@router.post("/", response_model=ProjectRead, dependencies=[Depends(require_permission(Permissions.CREATE_PROJECT))])
def create_project(payload: ProjectCreate, db: DbSession, current_user: CurrentUser):
    return project_service.create_project(db, payload, current_user)


@router.patch("/{project_id}", response_model=ProjectRead, dependencies=[Depends(require_permission(Permissions.EDIT_PROJECT))])
def update_project(project_id: int, payload: ProjectUpdate, db: DbSession, current_user: CurrentUser):
    return project_service.update_project(db, project_id, payload, current_user)


@router.delete("/{project_id}", dependencies=[Depends(require_permission(Permissions.DELETE_PROJECT))])
def delete_project(project_id: int, db: DbSession):
    project_service.delete_project(db, project_id)
    return {"message": "Project deleted"}


@router.post("/{project_id}/members", response_model=ProjectMemberRead, dependencies=[Depends(require_permission(Permissions.MANAGE_PROJECT_MEMBERS))])
def add_member(project_id: int, payload: ProjectMemberCreate, db: DbSession):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at == None).first()  # noqa: E711
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_service.add_member(db, project_id, payload)


@router.delete("/{project_id}/members/{user_id}", dependencies=[Depends(require_permission(Permissions.MANAGE_PROJECT_MEMBERS))])
def remove_member(project_id: int, user_id: int, db: DbSession):
    project_service.remove_member(db, project_id, user_id)
    return {"message": "Member removed"}


# ── Milestone endpoints ────────────────────────────────────────────────────────

@router.get("/{project_id}/milestones", response_model=List[MilestoneRead])
def list_milestones(project_id: int, db: DbSession, current_user: CurrentUser):
    return project_service.list_milestones(db, project_id)


@router.post("/{project_id}/milestones", response_model=MilestoneRead)
def create_milestone(project_id: int, payload: MilestoneCreate, db: DbSession, current_user: CurrentUser):
    return project_service.create_milestone(db, project_id, payload)


@router.patch("/{project_id}/milestones/{milestone_id}", response_model=MilestoneRead)
def update_milestone(project_id: int, milestone_id: int, payload: MilestoneUpdate, db: DbSession, current_user: CurrentUser):
    return project_service.update_milestone(db, project_id, milestone_id, payload)


@router.delete("/{project_id}/milestones/{milestone_id}")
def delete_milestone(project_id: int, milestone_id: int, db: DbSession, current_user: CurrentUser):
    project_service.delete_milestone(db, project_id, milestone_id)
    return {"message": "Milestone deleted"}
