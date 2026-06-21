from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TaskChecklistCreate(BaseModel):
    label: str
    order: int = 0


class TaskChecklistUpdate(BaseModel):
    label: Optional[str] = None
    is_done: Optional[bool] = None
    order: Optional[int] = None


class TaskChecklistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    label: str
    is_done: bool
    order: int


class TaskCommentCreate(BaseModel):
    content: str


class TaskCommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    user_id: Optional[int] = None
    content: str
    created_at: datetime
    updated_at: datetime


class TaskStatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_status: Optional[str] = None
    to_status: str
    changed_at: datetime


class TaskAttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    uploaded_by: Optional[int] = None
    original_filename: str
    file_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_to: Optional[int] = None
    department_id: Optional[int] = None
    priority: str = "medium"
    status: str = "todo"
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    parent_task_id: Optional[int] = None
    task_type: Optional[str] = None  # video_editing | design | content_writing | shooting | social_media | other


class TaskCreate(TaskBase):
    checklist: List[TaskChecklistCreate] = []
    dependency_ids: List[int] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_to: Optional[int] = None
    department_id: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    parent_task_id: Optional[int] = None
    revision_notes: Optional[str] = None
    revision_type: Optional[str] = None  # "internal" | "external"
    final_link: Optional[str] = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_code: Optional[str] = None
    assigned_by: Optional[int] = None
    actual_hours: Optional[float] = None
    revision_count: int
    revision_notes: Optional[str] = None
    revision_type: Optional[str] = None
    final_link: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TaskDetail(TaskRead):
    comments: List[TaskCommentRead] = []
    checklists: List[TaskChecklistRead] = []
    status_history: List[TaskStatusHistoryRead] = []
    attachments: List[TaskAttachmentRead] = []


class TimeEntryCreate(BaseModel):
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None


class TimeEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    user_id: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime


class TaskListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_code: Optional[str] = None
    title: str
    status: str
    priority: str
    assigned_to: Optional[int] = None
    assigned_by: Optional[int] = None
    task_type: Optional[str] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    created_at: Optional[datetime] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    department_id: Optional[int] = None
    description: Optional[str] = None
    estimated_hours: Optional[float] = None
    revision_notes: Optional[str] = None
    revision_type: Optional[str] = None
    revision_count: int = 0
    team_leader_name: Optional[str] = None
    account_manager_name: Optional[str] = None
