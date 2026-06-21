from datetime import datetime, timezone, date as date_type
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task, TaskComment, TaskChecklist, TaskDependency, TaskStatusHistory
from app.models.user import User
from app.core.exceptions import NotFoundError
from app.schemas.task import TaskCreate, TaskUpdate, TaskCommentCreate, TaskChecklistCreate, TaskChecklistUpdate

TASK_TYPE_CODE_PREFIX = {
    "video_editing": "VID",
    "design": "DES",
    "content_writing": "CNT",
    "shooting": "SHT",
    "social_media": "SOC",
    "other": "TSK",
}


def _generate_task_code(db: Session, task_type: Optional[str]) -> str:
    prefix = TASK_TYPE_CODE_PREFIX.get(task_type or "", "TSK")
    last_code = (
        db.query(Task.task_code)
        .filter(Task.task_type == task_type, Task.task_code.isnot(None))
        .order_by(Task.id.desc())
        .first()
    )
    if last_code and last_code[0]:
        try:
            num = int(last_code[0].split("-")[-1])
        except (ValueError, IndexError):
            num = db.query(func.count(Task.id)).filter(Task.task_type == task_type).scalar() or 0
    else:
        num = 0
    return f"{prefix}-{(num + 1):03d}"


def _get_team_leader_name(db: Session, project_id: int) -> Optional[str]:
    """Return the full_name of the 'lead' ProjectMember for a project."""
    from app.models.project import ProjectMember
    from app.models.employee import Employee
    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.role_in_project == "lead")
        .first()
    )
    if not member:
        return None
    emp = db.query(Employee).filter(Employee.user_id == member.user_id).first()
    return emp.full_name if emp else None


def _get_account_manager_name(db: Session, assigned_by_user_id: Optional[int]) -> Optional[str]:
    """Return the full_name of assigned_by if they have account_manager role."""
    if not assigned_by_user_id:
        return None
    from app.models.employee import Employee
    emp = db.query(Employee).filter(Employee.user_id == assigned_by_user_id).first()
    if not emp or not emp.role:
        return None
    if emp.role.slug == "account_manager":
        return emp.full_name
    return None


def _create_notification(db: Session, user_id: int, title: str, body: Optional[str] = None,
                          notif_type: Optional[str] = None, entity_type: Optional[str] = None,
                          entity_id: Optional[int] = None) -> None:
    from app.models.notification import Notification
    n = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=notif_type,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(n)


def list_tasks(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    my_tasks: bool = False,
):
    q = db.query(Task).filter(Task.deleted_at.is_(None))
    if status:
        q = q.filter(Task.status == status)
    if project_id:
        q = q.filter(Task.project_id == project_id)
    if my_tasks:
        q = q.filter(Task.assigned_to == current_user.id)
    elif assigned_to:
        q = q.filter(Task.assigned_to == assigned_to)
    tasks = q.offset(skip).limit(limit).all()

    # Enrich with team_leader_name and account_manager_name
    for task in tasks:
        task.team_leader_name = None
        task.account_manager_name = None
        if task.project_id:
            task.team_leader_name = _get_team_leader_name(db, task.project_id)
        task.account_manager_name = _get_account_manager_name(db, task.assigned_by)

    return tasks


def get_task(db: Session, task_id: int) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise NotFoundError("Task not found")
    return task


def create_task(db: Session, payload: TaskCreate, current_user: User) -> Task:
    from app.services.auto_assign import find_best_employee, TASK_TYPE_DEPT
    # Auto-assign if task_type is given and assigned_to is not explicitly set
    assigned_to = payload.assigned_to
    dept_id = payload.department_id
    if not assigned_to and payload.task_type:
        assigned_to = find_best_employee(db, payload.task_type)
        if not dept_id and payload.task_type in TASK_TYPE_DEPT:
            dept_id = TASK_TYPE_DEPT[payload.task_type]

    task = Task(
        task_code=_generate_task_code(db, payload.task_type),
        title=payload.title,
        description=payload.description,
        client_id=payload.client_id,
        project_id=payload.project_id,
        assigned_to=assigned_to,
        assigned_by=current_user.id,
        department_id=dept_id,
        priority=payload.priority,
        status=payload.status,
        task_type=payload.task_type,
        start_date=payload.start_date,
        due_date=payload.due_date,
        estimated_hours=payload.estimated_hours,
        parent_task_id=payload.parent_task_id,
    )
    db.add(task)
    db.flush()

    for i, item in enumerate(payload.checklist):
        db.add(TaskChecklist(task_id=task.id, label=item.label, order=item.order or i))

    for dep_id in payload.dependency_ids:
        db.add(TaskDependency(task_id=task.id, depends_on_task_id=dep_id))

    db.add(TaskStatusHistory(
        task_id=task.id,
        changed_by=current_user.id,
        from_status=None,
        to_status=payload.status,
        changed_at=datetime.now(timezone.utc),
    ))

    # Notify assignee
    if assigned_to:
        _create_notification(
            db, user_id=assigned_to,
            title=f"New task assigned: {payload.title}",
            notif_type="task_assigned",
            entity_type="task",
            entity_id=task.id,
        )

    db.commit()
    db.refresh(task)
    return task


def _recalc_project_progress(db: Session, project_id: int) -> None:
    """Recalculate project progress_percent based on completed tasks."""
    from app.models.project import Project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return
    all_tasks = db.query(Task).filter(
        Task.project_id == project_id,
        Task.deleted_at.is_(None)
    ).all()
    if not all_tasks:
        project.progress_percent = 0
    else:
        done = sum(1 for t in all_tasks if t.status == "done")
        project.progress_percent = round((done / len(all_tasks)) * 100)
    db.commit()


def update_task(db: Session, task_id: int, payload: TaskUpdate, current_user: User) -> Task:
    task = get_task(db, task_id)
    old_status = task.status
    old_assigned_to = task.assigned_to
    old_due_date = task.due_date
    update_data = payload.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(task, key, value)

    new_status = update_data.get("status")
    if new_status and new_status != old_status:
        db.add(TaskStatusHistory(
            task_id=task.id,
            changed_by=current_user.id,
            from_status=old_status,
            to_status=new_status,
            changed_at=datetime.now(timezone.utc),
        ))

        # in_progress: notify assigner that task was started
        if new_status == "in_progress" and task.assigned_by and task.assigned_by != current_user.id:
            _create_notification(
                db, user_id=task.assigned_by,
                title=f"Task started: {task.title}",
                body=f"{current_user.email} started working on this task",
                notif_type="task_started",
                entity_type="task",
                entity_id=task.id,
            )

        # review: notify team leader that task is ready for review
        elif new_status == "review":
            try:
                if task.project_id:
                    from app.models.project import ProjectMember
                    from app.models.employee import Employee
                    member = db.query(ProjectMember).filter(
                        ProjectMember.project_id == task.project_id,
                        ProjectMember.role_in_project == "lead",
                    ).first()
                    if member and member.user_id:
                        emp = db.query(Employee).filter(Employee.user_id == member.user_id).first()
                        if emp and emp.user_id:
                            _create_notification(
                                db, user_id=emp.user_id,
                                title=f"Task ready for review: {task.title}",
                                body="Please review and approve or request revisions",
                                notif_type="task_review",
                                entity_type="task",
                                entity_id=task.id,
                            )
                # Also notify assigner
                if task.assigned_by and task.assigned_by != current_user.id:
                    _create_notification(
                        db, user_id=task.assigned_by,
                        title=f"Task submitted for review: {task.title}",
                        notif_type="task_review",
                        entity_type="task",
                        entity_id=task.id,
                    )
            except Exception:
                pass  # Never block a status update due to notification failure

        # revisions_needed: notify the assigned employee
        elif new_status == "revisions_needed":
            task.revision_count = (task.revision_count or 0) + 1
            if task.assigned_to and task.assigned_to != current_user.id:
                revision_notes = update_data.get("revision_notes") or task.revision_notes
                revision_type = update_data.get("revision_type") or task.revision_type
                type_label = "Client revision" if revision_type == "external" else "Internal revision"
                _create_notification(
                    db, user_id=task.assigned_to,
                    title=f"{type_label} requested: {task.title}",
                    body=revision_notes or "Please review the feedback and resubmit",
                    notif_type="task_revision",
                    entity_type="task",
                    entity_id=task.id,
                )

        # done: notify assigner
        elif new_status == "done":
            if task.assigned_by and task.assigned_by != current_user.id:
                _create_notification(
                    db, user_id=task.assigned_by,
                    title=f"Task completed: {task.title}",
                    notif_type="task_done",
                    entity_type="task",
                    entity_id=task.id,
                )

        else:
            # Generic status change notification to assigner
            if task.assigned_by and task.assigned_by != current_user.id:
                _create_notification(
                    db, user_id=task.assigned_by,
                    title=f"Task status updated: {task.title}",
                    body=f"Status changed to {new_status}",
                    notif_type="task_status_changed",
                    entity_type="task",
                    entity_id=task.id,
                )

    # due_date postponed: notify assigner
    new_due_date = update_data.get("due_date")
    if new_due_date and old_due_date and new_due_date > old_due_date:
        if task.assigned_by and task.assigned_by != current_user.id:
            _create_notification(
                db, user_id=task.assigned_by,
                title=f"Task deadline changed: {task.title}",
                body=f"New due date: {new_due_date}",
                notif_type="task_postponed",
                entity_type="task",
                entity_id=task.id,
            )

    # Notify new assignee if assignment changed
    new_assigned_to = update_data.get("assigned_to")
    if new_assigned_to and new_assigned_to != old_assigned_to:
        _create_notification(
            db, user_id=new_assigned_to,
            title=f"Task assigned to you: {task.title}",
            notif_type="task_assigned",
            entity_type="task",
            entity_id=task.id,
        )

    db.commit()
    db.refresh(task)

    # Auto-update project progress when task status changes
    if new_status and task.project_id:
        _recalc_project_progress(db, task.project_id)

    return task


def delete_task(db: Session, task_id: int) -> None:
    task = get_task(db, task_id)
    task.deleted_at = datetime.now(timezone.utc)
    db.commit()


def add_comment(db: Session, task_id: int, payload: TaskCommentCreate, current_user: User) -> TaskComment:
    get_task(db, task_id)
    comment = TaskComment(task_id=task_id, user_id=current_user.id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def add_checklist_item(db: Session, task_id: int, payload: TaskChecklistCreate) -> TaskChecklist:
    get_task(db, task_id)
    item = TaskChecklist(task_id=task_id, label=payload.label, order=payload.order)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_checklist_item(db: Session, item_id: int, payload: TaskChecklistUpdate) -> TaskChecklist:
    item = db.query(TaskChecklist).filter(TaskChecklist.id == item_id).first()
    if not item:
        raise NotFoundError("Checklist item not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item
