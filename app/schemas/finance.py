from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float = Field(default=1, ge=0)
    unit_price: float = Field(ge=0)


class InvoiceItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    description: str
    quantity: float
    unit_price: float
    total: float


class InvoiceBase(BaseModel):
    client_id: Optional[int] = None
    issue_date: date
    due_date: Optional[date] = None
    discount_amount: float = Field(default=0, ge=0)
    tax_amount: float = Field(default=0, ge=0)
    payment_status: str = "draft"
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    client_id: Optional[int] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    discount_amount: Optional[float] = Field(default=None, ge=0)
    tax_amount: Optional[float] = Field(default=None, ge=0)
    payment_status: Optional[str] = None
    notes: Optional[str] = None


class InvoiceRead(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_number: str
    subtotal: float
    total_amount: float
    amount_paid: float
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class InvoiceDetail(InvoiceRead):
    items: List[InvoiceItemRead] = []


class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float = Field(ge=0)
    payment_date: date
    method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_id: int
    amount: float
    payment_date: date
    method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    recorded_by: Optional[int] = None
    created_at: datetime


class ExpenseBase(BaseModel):
    title: str
    category: Optional[str] = None
    amount: float = Field(ge=0)
    expense_date: date
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    expense_date: Optional[date] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    notes: Optional[str] = None


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    recorded_by: Optional[int] = None
    created_at: datetime
