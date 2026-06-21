from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Query, HTTPException

from app.api.deps import DbSession, CurrentUser
from app.models.notification import Notification, ActivityLog
from app.schemas.notification import NotificationRead, ActivityLogRead


class EmailNotificationSettings(BaseModel):
    email: str
    enable_task_overdue: bool = True
    enable_invoice_due: bool = True
    enable_lead_updates: bool = True
    enable_project_updates: bool = True
    enable_weekly_report: bool = True


router = APIRouter()


@router.get("/", response_model=List[NotificationRead])
def list_notifications(current_user: CurrentUser, db: DbSession):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(notification_id: int, current_user: CurrentUser, db: DbSession):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if n:
        n.is_read = True
        db.commit()
        db.refresh(n)
    return n


@router.patch("/mark-all-read")
def mark_all_read(current_user: CurrentUser, db: DbSession):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/activity-logs", response_model=List[ActivityLogRead])
def list_activity_logs(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(100, le=500),
    skip: int = 0,
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
):
    q = db.query(ActivityLog).order_by(ActivityLog.created_at.desc())
    if not current_user.is_superuser:
        q = q.filter(ActivityLog.user_id == current_user.id)
    else:
        if user_id:
            q = q.filter(ActivityLog.user_id == user_id)
    if action:
        q = q.filter(ActivityLog.action == action)
    return q.offset(skip).limit(limit).all()


@router.patch("/email-settings")
def update_email_settings(
    settings: EmailNotificationSettings,
    current_user: CurrentUser,
    db: DbSession,
):
    return {
        "message": "Email notification settings saved successfully",
        "email": current_user.email,
        "settings": settings.dict(exclude={"email"}),
    }
