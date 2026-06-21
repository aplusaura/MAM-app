from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class LeadActivityCreate(BaseModel):
    activity_type: str
    description: Optional[str] = None
    occurred_at: datetime


class LeadActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    lead_id: int
    user_id: Optional[int] = None
    activity_type: str
    description: Optional[str] = None
    occurred_at: datetime
    created_at: datetime


class LeadBase(BaseModel):
    lead_name: str
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source_id: Optional[int] = None
    interested_service: Optional[str] = None
    expected_budget: Optional[float] = None
    assigned_to: Optional[int] = None
    stage: str = "new_lead"
    next_followup_date: Optional[date] = None
    last_contact_date: Optional[date] = None
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    lead_name: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source_id: Optional[int] = None
    interested_service: Optional[str] = None
    expected_budget: Optional[float] = None
    assigned_to: Optional[int] = None
    stage: Optional[str] = None
    next_followup_date: Optional[date] = None
    last_contact_date: Optional[date] = None
    notes: Optional[str] = None


class LeadStageUpdate(BaseModel):
    stage: str
    note: Optional[str] = None


class LeadConvert(BaseModel):
    """Convert a won lead to a client."""
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class LeadRead(LeadBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    converted_to_client_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class LeadDetail(LeadRead):
    activities: List[LeadActivityRead] = []


class LeadListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    lead_name: str
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    interested_service: Optional[str] = None
    stage: str
    assigned_to: Optional[int] = None
    next_followup_date: Optional[date] = None
    expected_budget: Optional[float] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
