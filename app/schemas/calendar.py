from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "other"
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    all_day: bool = False
    location: Optional[str] = None
    linked_project_id: Optional[int] = None
    linked_task_id: Optional[int] = None
    linked_lead_id: Optional[int] = None


class EventCreate(EventBase):
    attendee_ids: List[int] = []


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    all_day: Optional[bool] = None
    location: Optional[str] = None
    linked_project_id: Optional[int] = None
    linked_task_id: Optional[int] = None
    linked_lead_id: Optional[int] = None


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: Optional[int] = None
    created_at: datetime


class ReminderCreate(BaseModel):
    event_id: Optional[int] = None
    title: str
    remind_at: datetime


class ReminderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    event_id: Optional[int] = None
    title: str
    remind_at: datetime
    is_sent: bool
