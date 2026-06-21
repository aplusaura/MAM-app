from typing import List
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from app.api.deps import DbSession, CurrentUser
from app.models.notification import DirectMessage
from app.schemas.notification import DirectMessageCreate, DirectMessageRead

router = APIRouter()


@router.get("/conversations")
def list_conversations(db: DbSession, current_user: CurrentUser):
    """Returns latest message per conversation partner."""
    from sqlalchemy import or_, func
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
    return [
        {
            "partner_id": partner_id,
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
