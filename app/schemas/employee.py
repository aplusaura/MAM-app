from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.schemas.role import RoleRead
from app.schemas.department import DepartmentRead


class EmployeeBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: str = "full_time"
    salary: Optional[float] = None
    join_date: Optional[date] = None
    skills: Optional[List[str]] = None
    status: str = "active"
    availability_status: str = "available"
    profile_image_url: Optional[str] = None
    notes: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None


class EmployeeCreate(EmployeeBase):
    user_id: Optional[int] = None
    email: Optional[str] = None
    password: Optional[str] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    salary: Optional[float] = None
    join_date: Optional[date] = None
    skills: Optional[List[str]] = None
    status: Optional[str] = None
    availability_status: Optional[str] = None
    profile_image_url: Optional[str] = None
    notes: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class EmployeeDirectReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    job_title: Optional[str] = None
    status: str
    availability_status: str


class EmployeeDetail(EmployeeRead):
    role: Optional[RoleRead] = None
    department: Optional[DepartmentRead] = None
    direct_reports: List["EmployeeDirectReport"] = []


class EmployeeListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    full_name: str
    job_title: Optional[str] = None
    phone: Optional[str] = None
    employment_type: Optional[str] = None
    skills: Optional[List[str]] = None
    status: str
    availability_status: str
    profile_image_url: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None


class BonusCreate(BaseModel):
    amount: float
    reason: Optional[str] = None


class BonusRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    given_by_user_id: Optional[int] = None
    amount: float
    reason: Optional[str] = None
    created_at: datetime


class LeaveRequestCreate(BaseModel):
    leave_type: str  # vacation | sick | personal | other
    start_date: date
    end_date: date
    days_count: int
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    status: str  # approved | denied


class LeaveRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    days_count: int
    reason: Optional[str] = None
    status: str
    reviewed_by: Optional[int] = None
    created_at: datetime


class WorkSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    date: date
    clock_in: datetime
    clock_out: Optional[datetime] = None
    total_hours: Optional[float] = None


class WorkSessionCreate(BaseModel):
    date: date
    total_hours: float  # decimal hours, e.g. 7.5


class WorkSessionUpdate(BaseModel):
    total_hours: Optional[float] = None
    date: Optional[date] = None


class EmployeeEvaluationCreate(BaseModel):
    period_month: int
    period_year: int
    score: int  # 1-5
    notes: Optional[str] = None
    evaluation_type: str = "TL"  # TL | AM | CEO


class EmployeeEvaluationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    evaluated_by: Optional[int] = None
    period_month: int
    period_year: int
    score: int
    notes: Optional[str] = None
    evaluation_type: str
    created_at: datetime
