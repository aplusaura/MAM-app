from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from sqlalchemy.orm import Session

from app.models.finance import Invoice, InvoiceItem, Payment, Expense
from app.models.user import User
from app.core.exceptions import NotFoundError, BadRequestError
from app.schemas.finance import InvoiceCreate, InvoiceUpdate, PaymentCreate, ExpenseCreate, ExpenseUpdate


def _next_invoice_number(db: Session) -> str:
    count = db.query(Invoice).count()
    return f"INV-{count + 1:05d}"


def list_invoices(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[int] = None,
    payment_status: Optional[str] = None,
):
    q = db.query(Invoice).filter(Invoice.deleted_at.is_(None))
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    if payment_status:
        q = q.filter(Invoice.payment_status == payment_status)
    return q.offset(skip).limit(limit).all()


def get_invoice(db: Session, invoice_id: int) -> Invoice:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.deleted_at.is_(None)).first()
    if not inv:
        raise NotFoundError("Invoice not found")
    return inv


def create_invoice(db: Session, payload: InvoiceCreate, current_user: User) -> Invoice:
    subtotal = sum(item.quantity * item.unit_price for item in payload.items)
    subtotal = Decimal(str(subtotal)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    discount = Decimal(str(payload.discount_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    tax = Decimal(str(payload.tax_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total = (subtotal - discount + tax).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    invoice = Invoice(
        invoice_number=_next_invoice_number(db),
        client_id=payload.client_id,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        subtotal=subtotal,
        discount_amount=payload.discount_amount,
        tax_amount=payload.tax_amount,
        total_amount=total,
        amount_paid=0,
        payment_status=payload.payment_status,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(invoice)
    db.flush()

    for item in payload.items:
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=item.quantity * item.unit_price,
        ))

    db.commit()
    db.refresh(invoice)
    return invoice


def update_invoice(db: Session, invoice_id: int, payload: InvoiceUpdate) -> Invoice:
    invoice = get_invoice(db, invoice_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(invoice, key, value)
    db.commit()
    db.refresh(invoice)
    return invoice


def delete_invoice(db: Session, invoice_id: int) -> None:
    invoice = get_invoice(db, invoice_id)
    invoice.deleted_at = datetime.now(timezone.utc)
    db.commit()


def list_payments(db: Session, invoice_id: Optional[int] = None):
    q = db.query(Payment)
    if invoice_id:
        q = q.filter(Payment.invoice_id == invoice_id)
    return q.all()


def record_payment(db: Session, payload: PaymentCreate, current_user: User) -> Payment:
    invoice = get_invoice(db, payload.invoice_id)

    remaining = float(invoice.total_amount) - float(invoice.amount_paid)
    if float(payload.amount) > remaining + 0.01:  # 1 cent tolerance
        raise BadRequestError(f"Payment amount exceeds remaining balance of {remaining:.2f}")

    payment = Payment(
        invoice_id=payload.invoice_id,
        amount=payload.amount,
        payment_date=payload.payment_date,
        method=payload.method,
        reference_number=payload.reference_number,
        notes=payload.notes,
        recorded_by=current_user.id,
    )
    db.add(payment)

    # Update invoice paid amount and status
    invoice.amount_paid = float(invoice.amount_paid) + payload.amount
    if invoice.amount_paid >= invoice.total_amount:
        invoice.payment_status = "paid"
    elif invoice.amount_paid > 0:
        invoice.payment_status = "partial"

    db.commit()
    db.refresh(payment)
    return payment


def list_expenses(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[int] = None,
    project_id: Optional[int] = None,
):
    q = db.query(Expense)
    if client_id:
        q = q.filter(Expense.client_id == client_id)
    if project_id:
        q = q.filter(Expense.project_id == project_id)
    return q.offset(skip).limit(limit).all()


def create_expense(db: Session, payload: ExpenseCreate, current_user: User) -> Expense:
    expense = Expense(**payload.model_dump(), recorded_by=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update_expense(db: Session, expense_id: int, payload: ExpenseUpdate) -> Expense:
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise NotFoundError("Expense not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense
