from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.content import ContentItem, PublishingSchedule
from app.models.user import User
from app.core.exceptions import NotFoundError
from app.schemas.content import ContentCreate, ContentUpdate, PublishingScheduleCreate


def list_content(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    platform: Optional[str] = None,
):
    q = db.query(ContentItem).filter(ContentItem.deleted_at.is_(None))
    if status:
        q = q.filter(ContentItem.status == status)
    if client_id:
        q = q.filter(ContentItem.client_id == client_id)
    if platform:
        q = q.filter(ContentItem.platform == platform)
    return q.offset(skip).limit(limit).all()


def get_content(db: Session, content_id: int) -> ContentItem:
    item = db.query(ContentItem).filter(
        ContentItem.id == content_id, ContentItem.deleted_at.is_(None)
    ).first()
    if not item:
        raise NotFoundError("Content item not found")
    return item


def create_content(db: Session, payload: ContentCreate, current_user: User) -> ContentItem:
    item = ContentItem(**payload.model_dump(), created_by=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_content(db: Session, content_id: int, payload: ContentUpdate, current_user: User) -> ContentItem:
    item = get_content(db, content_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_content(db: Session, content_id: int) -> None:
    item = get_content(db, content_id)
    item.deleted_at = datetime.now(timezone.utc)
    db.commit()


def schedule_content(db: Session, content_id: int, payload: PublishingScheduleCreate) -> PublishingSchedule:
    get_content(db, content_id)
    schedule = PublishingSchedule(
        content_item_id=content_id,
        platform=payload.platform,
        scheduled_at=payload.scheduled_at,
        notes=payload.notes,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule
