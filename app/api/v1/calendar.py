from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from datetime import datetime

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.permissions import Permissions
from app.schemas.calendar import EventRead, EventCreate, EventUpdate, ReminderCreate, ReminderRead
from app.services import calendar_service

router = APIRouter()


@router.get("/events", response_model=List[EventRead])
def list_events(
    db: DbSession,
    current_user: CurrentUser,
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
):
    return calendar_service.list_events(db, start=start, end=end, event_type=event_type)


@router.get("/events/{event_id}", response_model=EventRead)
def get_event(event_id: int, db: DbSession, current_user: CurrentUser):
    return calendar_service.get_event(db, event_id)


@router.post("/events", response_model=EventRead, dependencies=[Depends(require_permission(Permissions.CREATE_EVENT))])
def create_event(payload: EventCreate, db: DbSession, current_user: CurrentUser):
    return calendar_service.create_event(db, payload, current_user)


@router.patch("/events/{event_id}", response_model=EventRead, dependencies=[Depends(require_permission(Permissions.EDIT_EVENT))])
def update_event(event_id: int, payload: EventUpdate, db: DbSession, current_user: CurrentUser):
    return calendar_service.update_event(db, event_id, payload)


@router.delete("/events/{event_id}", dependencies=[Depends(require_permission(Permissions.DELETE_EVENT))])
def delete_event(event_id: int, db: DbSession):
    calendar_service.delete_event(db, event_id)
    return {"message": "Event deleted"}


@router.get("/reminders", response_model=List[ReminderRead])
def list_reminders(db: DbSession, current_user: CurrentUser):
    return calendar_service.list_reminders(db, current_user.id)


@router.post("/reminders", response_model=ReminderRead)
def create_reminder(payload: ReminderCreate, db: DbSession, current_user: CurrentUser):
    return calendar_service.create_reminder(db, payload, current_user)
