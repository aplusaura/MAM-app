from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ── Milestone schemas ──────────────────────────────────────────────────────────

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: Optional[bool] = None


class MilestoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ProjectMemberCreate(BaseModel):
    user_id: int
    role_in_project: str = "member"


class ProjectMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    user_id: int
    role_in_project: str
    created_at: datetime


class ProjectStatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_status: Optional[str] = None
    to_status: str
    note: Optional[str] = None
    changed_at: datetime


class ProjectBase(BaseModel):
    name: str
    client_id: Optional[int] = None
    project_type: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    status: str = "planning"
    priority: str = "medium"
    budget: Optional[float] = None
    progress_percent: int = 0


class ProjectCreate(ProjectBase):
    member_ids: List[int] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[int] = None
    project_type: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    budget: Optional[float] = None
    progress_percent: Optional[int] = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectRead):
    members: List[ProjectMemberRead] = []
    status_history: List[ProjectStatusHistoryRead] = []


class ProjectListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    status: str
    priority: str
    progress_percent: int
    client_id: Optional[int] = None
    due_date: Optional[date] = None
