from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.permissions import Permissions
from app.schemas.finance import (
    InvoiceRead, InvoiceDetail, InvoiceCreate, InvoiceUpdate,
    PaymentCreate, PaymentRead,
    ExpenseRead, ExpenseCreate, ExpenseUpdate,
)
from app.services import finance_service

router = APIRouter()

# --- Invoices ---

@router.get("/invoices", response_model=List[InvoiceRead], dependencies=[Depends(require_permission(Permissions.VIEW_FINANCE))])
def list_invoices(
    db: DbSession,
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[int] = Query(None),
    payment_status: Optional[str] = Query(None),
):
    return finance_service.list_invoices(db, skip=skip, limit=limit, client_id=client_id, payment_status=payment_status)


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetail, dependencies=[Depends(require_permission(Permissions.VIEW_FINANCE))])
def get_invoice(invoice_id: int, db: DbSession):
    return finance_service.get_invoice(db, invoice_id)


@router.post("/invoices", response_model=InvoiceRead, dependencies=[Depends(require_permission(Permissions.CREATE_INVOICE))])
def create_invoice(payload: InvoiceCreate, db: DbSession, current_user: CurrentUser):
    return finance_service.create_invoice(db, payload, current_user)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceRead, dependencies=[Depends(require_permission(Permissions.EDIT_INVOICE))])
def update_invoice(invoice_id: int, payload: InvoiceUpdate, db: DbSession):
    return finance_service.update_invoice(db, invoice_id, payload)


@router.delete("/invoices/{invoice_id}", dependencies=[Depends(require_permission(Permissions.DELETE_INVOICE))])
def delete_invoice(invoice_id: int, db: DbSession):
    finance_service.delete_invoice(db, invoice_id)
    return {"message": "Invoice deleted"}

# --- Payments ---

@router.get("/payments", response_model=List[PaymentRead], dependencies=[Depends(require_permission(Permissions.VIEW_FINANCE))])
def list_payments(db: DbSession, invoice_id: Optional[int] = Query(None)):
    return finance_service.list_payments(db, invoice_id=invoice_id)


@router.post("/payments", response_model=PaymentRead, dependencies=[Depends(require_permission(Permissions.RECORD_PAYMENT))])
def record_payment(payload: PaymentCreate, db: DbSession, current_user: CurrentUser):
    return finance_service.record_payment(db, payload, current_user)

# --- Expenses ---

@router.get("/expenses", response_model=List[ExpenseRead], dependencies=[Depends(require_permission(Permissions.VIEW_EXPENSES))])
def list_expenses(
    db: DbSession,
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
):
    return finance_service.list_expenses(db, skip=skip, limit=limit, client_id=client_id, project_id=project_id)


@router.post("/expenses", response_model=ExpenseRead, dependencies=[Depends(require_permission(Permissions.CREATE_EXPENSE))])
def create_expense(payload: ExpenseCreate, db: DbSession, current_user: CurrentUser):
    return finance_service.create_expense(db, payload, current_user)


@router.patch("/expenses/{expense_id}", response_model=ExpenseRead, dependencies=[Depends(require_permission(Permissions.CREATE_EXPENSE))])
def update_expense(expense_id: int, payload: ExpenseUpdate, db: DbSession):
    return finance_service.update_expense(db, expense_id, payload)
