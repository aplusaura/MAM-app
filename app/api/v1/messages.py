from typing import List
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from app.api.deps import DbSession, CurrentUser
from app.models.notification import DirectMessage
from app.schemas.notification import DirectMessageCreate, DirectMessageRead

router = APIRouter()


@router.get("/contacts")
def list_contacts(db: DbSession, current_user: CurrentUser):
    """Returns all active employees with user accounts for starting new conversations."""
    from app.models.employee import Employee
    employees = (
        db.query(Employee.user_id, Employee.full_name, Employee.job_title, Employee.profile_image_url)
        .filter(Employee.deleted_at.is_(None), Employee.status == "active", Employee.user_id.isnot(None))
        .all()
    )
    return [
        {"user_id": uid, "full_name": name, "job_title": title, "profile_image_url": img}
        for uid, name, title, img in employees
        if uid != current_user.id
    ]


@router.get("/conversations")
def list_conversations(db: DbSession, current_user: CurrentUser):
    """Returns latest message per conversation partner."""
    from sqlalchemy import or_, func
    from app.models.employee import Employee
    rows = (
        db.query(DirectMessage)
        .filter(or_(DirectMessage.from_user_id == current_user.id, DirectMessage.to_user_id == current_user.id))
        .order_by(DirectMessage.created_at.desc())
        .all()
    )
    seen = {}
    for msg in rows:
        partner = msg.to_user_id if msg.from_user_id == current_user.id else msg.from_user_id
        if partner not in seen:
            seen[partner] = msg

    partner_ids = list(seen.keys())
    name_map = {}
    if partner_ids:
        emps = db.query(Employee.user_id, Employee.full_name).filter(
            Employee.user_id.in_(partner_ids), Employee.deleted_at.is_(None)
        ).all()
        name_map = {uid: name for uid, name in emps}

    return [
        {
            "partner_id": partner_id,
            "partner_name": name_map.get(partner_id, f"User #{partner_id}"),
            "last_message": msg.content,
            "last_at": msg.created_at,
            "unread": db.query(func.count(DirectMessage.id)).filter(
                DirectMessage.from_user_id == partner_id,
                DirectMessage.to_user_id == current_user.id,
                DirectMessage.is_read == False,  # noqa: E712
            ).scalar() or 0,
        }
        for partner_id, msg in seen.items()
    ]


@router.get("/unread-count")
def unread_count(db: DbSession, current_user: CurrentUser):
    from sqlalchemy import func
    count = db.query(func.count(DirectMessage.id)).filter(
        DirectMessage.to_user_id == current_user.id,
        DirectMessage.is_read == False,  # noqa: E712
    ).scalar() or 0
    return {"unread": count}


@router.get("/{user_id}", response_model=List[DirectMessageRead])
def get_messages(user_id: int, db: DbSession, current_user: CurrentUser):
    from sqlalchemy import or_
    db.query(DirectMessage).filter(
        DirectMessage.from_user_id == user_id,
        DirectMessage.to_user_id == current_user.id,
        DirectMessage.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return (
        db.query(DirectMessage)
        .filter(
            or_(
                (DirectMessage.from_user_id == current_user.id) & (DirectMessage.to_user_id == user_id),
                (DirectMessage.from_user_id == user_id) & (DirectMessage.to_user_id == current_user.id),
            )
        )
        .order_by(DirectMessage.created_at.asc())
        .limit(200)
        .all()
    )


@router.post("/{user_id}", response_model=DirectMessageRead)
def send_message(user_id: int, payload: DirectMessageCreate, db: DbSession, current_user: CurrentUser):
    msg = DirectMessage(
        from_user_id=current_user.id,
        to_user_id=user_id,
        content=payload.content,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/message/{message_id}")
def delete_message(message_id: int, db: DbSession, current_user: CurrentUser):
    """Soft-delete a message. Only the sender can delete their own messages."""
    msg = db.query(DirectMessage).filter(DirectMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.from_user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    msg.is_deleted = True
    msg.content = "This message was deleted"
    db.commit()
    return {"ok": True}


@router.delete("/chat/{partner_id}")
def delete_chat(partner_id: int, db: DbSession, current_user: CurrentUser):
    """Super Admin only: permanently delete all messages between current user and partner."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only Super Admin can delete entire chats")
    from sqlalchemy import or_
    db.query(DirectMessage).filter(
        or_(
            (DirectMessage.from_user_id == current_user.id) & (DirectMessage.to_user_id == partner_id),
            (DirectMessage.from_user_id == partner_id) & (DirectMessage.to_user_id == current_user.id),
        )
    ).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}
