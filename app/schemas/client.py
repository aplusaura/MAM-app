from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ClientContactBase(BaseModel):
    name: str
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_primary: bool = False


class ClientContactCreate(ClientContactBase):
    pass


class ClientContactRead(ClientContactBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int


class ClientNoteCreate(BaseModel):
    content: str


class ClientNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    user_id: Optional[int] = None
    content: str
    created_at: datetime


class ClientBase(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    service_type: Optional[str] = None
    package_type: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[date] = None
    renewal_date: Optional[date] = None
    monthly_value: Optional[float] = None
    contract_value: Optional[float] = None
    status: str = "active"
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    service_type: Optional[str] = None
    package_type: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[date] = None
    renewal_date: Optional[date] = None
    monthly_value: Optional[float] = None
    contract_value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_code: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ClientDetail(ClientRead):
    contacts: List[ClientContactRead] = []
    client_notes: List[ClientNoteRead] = []


class ClientListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_code: Optional[str] = None
    logo_url: Optional[str] = None
    company_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    industry: Optional[str] = None
    service_type: Optional[str] = None
    status: str
    monthly_value: Optional[float] = None
    renewal_date: Optional[date] = None
