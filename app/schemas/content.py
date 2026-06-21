from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ContentBase(BaseModel):
    title: str
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    platform: Optional[str] = None
    content_type: Optional[str] = None
    hook: Optional[str] = None
    caption: Optional[str] = None
    cta: Optional[str] = None
    script_text: Optional[str] = None
    assigned_writer: Optional[int] = None
    assigned_shooter: Optional[int] = None
    assigned_editor: Optional[int] = None
    assigned_designer: Optional[int] = None
    publish_date: Optional[date] = None
    status: str = "idea"


class ContentCreate(ContentBase):
    pass


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    platform: Optional[str] = None
    content_type: Optional[str] = None
    hook: Optional[str] = None
    caption: Optional[str] = None
    cta: Optional[str] = None
    script_text: Optional[str] = None
    assigned_writer: Optional[int] = None
    assigned_shooter: Optional[int] = None
    assigned_editor: Optional[int] = None
    assigned_designer: Optional[int] = None
    publish_date: Optional[date] = None
    status: Optional[str] = None


class ContentRead(ContentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class PublishingScheduleCreate(BaseModel):
    platform: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None


class PublishingScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content_item_id: int
    platform: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    status: str
    notes: Optional[str] = None


class ContentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    status: str
    platform: Optional[str] = None
    content_type: Optional[str] = None
    publish_date: Optional[date] = None
    client_id: Optional[int] = None
