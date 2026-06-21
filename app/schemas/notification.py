from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    body: Optional[str] = None
    type: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    created_at: datetime


class DirectMessageCreate(BaseModel):
    content: str


class DirectMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_user_id: int
    to_user_id: int
    content: str
    is_read: bool
    created_at: datetime


class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    ip_address: Optional[str] = None
    created_at: datetime
