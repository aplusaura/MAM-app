from collections import defaultdict
from datetime import date
from typing import Dict, List

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession, CurrentUser
from app.models.task import Task
from app.models.user import User
from app.services.email_service import send_task_overdue_notification

router = APIRouter()

_DONE_STATUSES = {"done", "completed", "cancelled", "canceled"}


@router.post("/send-overdue-digest", summary="Send overdue-task digest emails to each assignee")
def send_overdue_digest(current_user: CurrentUser, db: DbSession):
    """
    Find all overdue tasks (due_date < today, status not done/cancelled),
    group them by assignee, and send one digest email per assignee.

    Requires superuser or the manage_notifications permission.
    """
    if not current_user.is_superuser:
        from app.api.deps import _user_has_permission
        if not _user_has_permission(current_user, "manage_notifications", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="manage_notifications permission required",
            )

    today = date.today()

    overdue_tasks = (
        db.query(Task)
        .filter(
            Task.deleted_at.is_(None),
            Task.due_date < today,
            Task.assigned_to.isnot(None),
        )
        .all()
    )

    # Filter out completed / cancelled tasks in Python to avoid case issues
    overdue_tasks = [
        t for t in overdue_tasks if (t.status or "").lower() not in _DONE_STATUSES
    ]

    if not overdue_tasks:
        return {"sent": 0, "skipped": 0}

    # Group by assignee user id
    by_assignee: Dict[int, List[Task]] = defaultdict(list)
    for task in overdue_tasks:
        by_assignee[task.assigned_to].append(task)

    sent = 0
    skipped = 0

    for user_id, tasks in by_assignee.items():
        assignee: User | None = db.get(User, user_id)
        if not assignee or not assignee.email:
            skipped += len(tasks)
            continue

        # Build digest body listing all overdue tasks
        task_lines = "\n".join(
            f"  - {t.title} (due {t.due_date})" for t in tasks
        )
        subject = f"[{len(tasks)} overdue task{'s' if len(tasks) != 1 else ''}] Action required"
        body = (
            f"Hi {assignee.full_name or assignee.email},\n\n"
            f"You have {len(tasks)} overdue task{'s' if len(tasks) != 1 else ''} "
            f"that require your attention:\n\n"
            f"{task_lines}\n\n"
            f"Please update these tasks or contact your manager if you need assistance.\n\n"
            f"This is an automated digest notification."
        )

        # Reuse the individual helper but pass the first task for the signature;
        # for a digest we call send_email directly via the service module.
        from app.services.email_service import send_email

        ok = send_email(assignee.email, subject, body)
        if ok:
            sent += 1
        else:
            skipped += 1

    return {"sent": sent, "skipped": skipped}
