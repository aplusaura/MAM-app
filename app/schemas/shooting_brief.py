from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ShootingBriefBase(BaseModel):
    what_was_shot: Optional[str] = None
    location: Optional[str] = None
    shoot_date: Optional[datetime] = None
    crew_present: Optional[str] = None
    what_happened: Optional[str] = None
    raw_footage_notes: Optional[str] = None


class ShootingBriefCreate(ShootingBriefBase):
    pass


class ShootingBriefUpdate(ShootingBriefBase):
    pass


class ShootingBriefRead(ShootingBriefBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
