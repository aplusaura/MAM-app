from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.calendar import Event, EventAttendee, Reminder
from app.models.user import User
from app.core.exceptions import NotFoundError
from app.schemas.calendar import EventCreate, EventUpdate, ReminderCreate


def list_events(
    db: Session,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    event_type: Optional[str] = None,
):
    q = db.query(Event)
    if start:
        q = q.filter(Event.start_datetime >= start)
    if end:
        q = q.filter(Event.start_datetime <= end)
    if event_type:
        q = q.filter(Event.event_type == event_type)
    return q.order_by(Event.start_datetime).all()


def get_event(db: Session, event_id: int) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise NotFoundError("Event not found")
    return event


def create_event(db: Session, payload: EventCreate, current_user: User) -> Event:
    event = Event(
        title=payload.title,
        description=payload.description,
        event_type=payload.event_type,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        all_day=payload.all_day,
        location=payload.location,
        linked_project_id=payload.linked_project_id,
        linked_task_id=payload.linked_task_id,
        linked_lead_id=payload.linked_lead_id,
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()

    db.add(EventAttendee(event_id=event.id, user_id=current_user.id, response_status="accepted"))
    for uid in payload.attendee_ids:
        if uid != current_user.id:
            db.add(EventAttendee(event_id=event.id, user_id=uid, response_status="pending"))

    db.commit()
    db.refresh(event)
    return event


def update_event(db: Session, event_id: int, payload: EventUpdate) -> Event:
    event = get_event(db, event_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event_id: int) -> None:
    event = get_event(db, event_id)
    db.delete(event)
    db.commit()


def list_reminders(db: Session, user_id: int):
    return db.query(Reminder).filter(Reminder.user_id == user_id).order_by(Reminder.remind_at).all()


def create_reminder(db: Session, payload: ReminderCreate, current_user: User) -> Reminder:
    reminder = Reminder(
        user_id=current_user.id,
        event_id=payload.event_id,
        title=payload.title,
        remind_at=payload.remind_at,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder
