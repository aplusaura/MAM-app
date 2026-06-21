import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Body, Depends, Query, HTTPException, UploadFile, File

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.config import settings
from app.core.permissions import Permissions
from app.schemas.task import (
    TaskRead, TaskDetail, TaskCreate, TaskUpdate, TaskListItem,
    TaskCommentCreate, TaskCommentRead,
    TaskChecklistCreate, TaskChecklistUpdate, TaskChecklistRead,
    TaskAttachmentRead,
    TimeEntryCreate, TimeEntryRead,
)
from app.schemas.shooting_brief import ShootingBriefRead, ShootingBriefCreate, ShootingBriefUpdate
from app.services import task_service

router = APIRouter()


@router.get("/moderator-queue", response_model=List[TaskListItem])
def moderator_queue(db: DbSession, current_user: CurrentUser):
    from app.models.task import Task
    return db.query(Task).filter(Task.status == "moderator_review", Task.deleted_at.is_(None)).all()


@router.get("/", response_model=List[TaskListItem])
def list_tasks(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    assigned_to: Optional[int] = Query(None),
    my_tasks: bool = Query(False),
):
    return task_service.list_tasks(
        db, current_user=current_user, skip=skip, limit=limit,
        status=status, project_id=project_id, assigned_to=assigned_to, my_tasks=my_tasks,
    )


@router.get("/{task_id}", response_model=TaskDetail)
def get_task(task_id: int, db: DbSession, current_user: CurrentUser):
    return task_service.get_task(db, task_id)


@router.post("/", response_model=TaskRead, dependencies=[Depends(require_permission(Permissions.CREATE_TASK))])
def create_task(payload: TaskCreate, db: DbSession, current_user: CurrentUser):
    return task_service.create_task(db, payload, current_user)


@router.patch("/{task_id}", response_model=TaskRead, dependencies=[Depends(require_permission(Permissions.EDIT_TASK))])
def update_task(task_id: int, payload: TaskUpdate, db: DbSession, current_user: CurrentUser):
    return task_service.update_task(db, task_id, payload, current_user)


@router.delete("/{task_id}", dependencies=[Depends(require_permission(Permissions.DELETE_TASK))])
def delete_task(task_id: int, db: DbSession):
    task_service.delete_task(db, task_id)
    return {"message": "Task deleted"}


@router.post("/{task_id}/comments", response_model=TaskCommentRead)
def add_comment(task_id: int, payload: TaskCommentCreate, db: DbSession, current_user: CurrentUser):
    return task_service.add_comment(db, task_id, payload, current_user)


@router.post("/{task_id}/checklist", response_model=TaskChecklistRead)
def add_checklist_item(task_id: int, payload: TaskChecklistCreate, db: DbSession, current_user: CurrentUser):
    return task_service.add_checklist_item(db, task_id, payload)


@router.patch("/{task_id}/checklist/{item_id}", response_model=TaskChecklistRead)
def update_checklist_item(task_id: int, item_id: int, payload: TaskChecklistUpdate, db: DbSession, current_user: CurrentUser):
    return task_service.update_checklist_item(db, item_id, payload)


# --- Shooting Brief ---

@router.get("/{task_id}/shooting-brief", response_model=ShootingBriefRead)
def get_shooting_brief(task_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.shooting_brief import ShootingBrief
    brief = db.query(ShootingBrief).filter(ShootingBrief.task_id == task_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Shooting brief not found")
    return brief


@router.post("/{task_id}/shooting-brief", response_model=ShootingBriefRead)
def create_shooting_brief(task_id: int, payload: ShootingBriefCreate, db: DbSession, current_user: CurrentUser):
    from app.models.shooting_brief import ShootingBrief
    existing = db.query(ShootingBrief).filter(ShootingBrief.task_id == task_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Shooting brief already exists for this task")
    now = datetime.now(timezone.utc)
    brief = ShootingBrief(
        task_id=task_id,
        created_by=current_user.id,
        created_at=now,
        updated_at=now,
        **payload.model_dump(exclude_unset=False),
    )
    db.add(brief)
    db.commit()
    db.refresh(brief)
    return brief


@router.patch("/{task_id}/shooting-brief", response_model=ShootingBriefRead)
def update_shooting_brief(task_id: int, payload: ShootingBriefUpdate, db: DbSession, current_user: CurrentUser):
    from app.models.shooting_brief import ShootingBrief
    brief = db.query(ShootingBrief).filter(ShootingBrief.task_id == task_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Shooting brief not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(brief, key, value)
    brief.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(brief)
    return brief


# --- Attachments ---

@router.get("/{task_id}/attachments", response_model=List[TaskAttachmentRead])
def list_attachments(task_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.task import TaskAttachment
    return db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).order_by(TaskAttachment.created_at.desc()).all()


@router.post("/{task_id}/attachments", response_model=TaskAttachmentRead)
def upload_attachment(
    task_id: int,
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    from app.models.task import Task, TaskAttachment
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    max_size = 20 * 1024 * 1024  # 20 MB
    contents = file.file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")

    ext = os.path.splitext(file.filename or "file")[1].lower()
    upload_dir = os.path.join(settings.UPLOAD_DIR, "tasks", str(task_id))
    os.makedirs(upload_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, stored_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    attachment = TaskAttachment(
        task_id=task_id,
        uploaded_by=current_user.id,
        original_filename=file.filename or stored_name,
        file_url=f"/uploads/tasks/{task_id}/{stored_name}",
        file_size=len(contents),
        mime_type=file.content_type,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.delete("/{task_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(task_id: int, attachment_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.task import TaskAttachment
    attachment = db.query(TaskAttachment).filter(
        TaskAttachment.id == attachment_id,
        TaskAttachment.task_id == task_id,
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    # Only uploader or superuser can delete
    if attachment.uploaded_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not allowed to delete this attachment")
    # Remove file from disk
    file_path = os.path.join(settings.UPLOAD_DIR, "tasks", str(task_id), os.path.basename(attachment.file_url))
    if os.path.exists(file_path):
        os.remove(file_path)
    db.delete(attachment)
    db.commit()


# --- Task Workflow ---

def _get_task_or_404(db, task_id: int):
    from app.models.task import Task
    t = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


def _record_status(db, task, from_status: str, to_status: str, user_id: int):
    from app.models.task import TaskStatusHistory
    db.add(TaskStatusHistory(
        task_id=task.id,
        changed_by=user_id,
        from_status=from_status,
        to_status=to_status,
        changed_at=datetime.now(timezone.utc),
    ))


def _notify(db, user_id: int, title: str, body: str, entity_id: int):
    from app.models.notification import Notification
    from sqlalchemy.sql import func
    db.add(Notification(
        user_id=user_id,
        title=title,
        body=body,
        entity_type="task",
        entity_id=entity_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    ))


@router.post("/{task_id}/submit-delivery")
def submit_delivery(task_id: int, db: DbSession, current_user: CurrentUser):
    task = _get_task_or_404(db, task_id)
    prev = task.status
    task.status = "waiting_approval"
    _record_status(db, task, prev, "waiting_approval", current_user.id)
    db.commit()
    return {"status": task.status}


@router.post("/{task_id}/approve")
def approve_task(task_id: int, db: DbSession, current_user: CurrentUser):
    from app.api.deps import _user_has_permission
    task = _get_task_or_404(db, task_id)
    is_privileged = current_user.is_superuser or _user_has_permission(current_user, "edit_task", db)
    if task.assigned_to and task.assigned_to == current_user.id and not is_privileged:
        raise HTTPException(status_code=403, detail="You cannot approve your own task")
    prev = task.status
    next_status = "am_review" if prev == "waiting_approval" else "done"
    task.status = next_status
    _record_status(db, task, prev, next_status, current_user.id)
    if task.assigned_to:
        _notify(db, task.assigned_to, "Task approved", f"Your task '{task.title}' has been approved.", task.id)
    db.commit()
    return {"status": task.status}


@router.post("/{task_id}/reject")
def reject_task(task_id: int, body: dict = Body(default={}), db: DbSession = None, current_user: CurrentUser = None):
    task = _get_task_or_404(db, task_id)
    prev = task.status
    task.status = "revisions_needed"
    task.revision_count = (task.revision_count or 0) + 1
    notes = (body or {}).get("notes", "") if isinstance(body, dict) else ""
    if notes:
        task.revision_notes = notes
    _record_status(db, task, prev, "revisions_needed", current_user.id)
    if notes:
        from app.schemas.task import TaskCommentCreate as _TCC
        task_service.add_comment(db, task.id, _TCC(content=f"[Rejection reason]: {notes}"), current_user)
    notify_msg = f"Task '{task.title}' has been sent back for revisions."
    if notes:
        notify_msg += f" Reason: {notes}"
    if task.assigned_to:
        _notify(db, task.assigned_to, "Task needs revisions", notify_msg, task.id)
    db.commit()
    return {"status": task.status}


@router.post("/{task_id}/send-to-moderator")
def send_to_moderator(task_id: int, db: DbSession, current_user: CurrentUser):
    task = _get_task_or_404(db, task_id)
    prev = task.status
    task.status = "moderator_review"
    _record_status(db, task, prev, "moderator_review", current_user.id)
    db.commit()
    return {"status": task.status}


@router.post("/{task_id}/mark-published")
def mark_published(task_id: int, db: DbSession, current_user: CurrentUser):
    task = _get_task_or_404(db, task_id)
    prev = task.status
    task.status = "done"
    _record_status(db, task, prev, "done", current_user.id)
    db.commit()
    return {"status": task.status}


@router.post("/{task_id}/mark-urgent")
def mark_urgent(task_id: int, db: DbSession, current_user: CurrentUser, pause_task_id: Optional[int] = None):
    task = _get_task_or_404(db, task_id)
    task.priority = "critical"
    task.is_urgent = True
    if pause_task_id:
        pause_task = _get_task_or_404(db, pause_task_id)
        prev = pause_task.status
        pause_task.status = "paused"
        _record_status(db, pause_task, prev, "paused", current_user.id)
    db.commit()
    return {"status": "urgent", "priority": task.priority}


@router.post("/{task_id}/pause")
def pause_task(task_id: int, db: DbSession, current_user: CurrentUser):
    task = _get_task_or_404(db, task_id)
    prev = task.status
    task.status = "paused"
    _record_status(db, task, prev, "paused", current_user.id)
    db.commit()
    return {"status": task.status}


@router.post("/{task_id}/resume")
def resume_task(task_id: int, db: DbSession, current_user: CurrentUser):
    task = _get_task_or_404(db, task_id)
    prev = task.status
    task.status = "in_progress"
    _record_status(db, task, prev, "in_progress", current_user.id)
    db.commit()
    return {"status": task.status}


# --- Time Entries ---

@router.get("/{task_id}/time-entries", response_model=List[TimeEntryRead])
def list_time_entries(task_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.task import TimeEntry
    return db.query(TimeEntry).filter(TimeEntry.task_id == task_id).order_by(TimeEntry.created_at.desc()).all()


@router.post("/{task_id}/time-entries", response_model=TimeEntryRead)
def create_time_entry(task_id: int, payload: TimeEntryCreate, db: DbSession, current_user: CurrentUser):
    from app.models.task import TimeEntry
    entry = TimeEntry(
        task_id=task_id,
        user_id=current_user.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
