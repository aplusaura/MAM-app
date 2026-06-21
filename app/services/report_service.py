from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.finance import Invoice, Payment, Expense
from app.models.task import Task
from app.models.project import Project
from app.models.lead import Lead
from app.models.employee import Employee
from app.models.content import ContentItem


def revenue_by_month(db: Session, year: int):
    results = (
        db.query(
            extract("month", Payment.payment_date).label("month"),
            func.sum(Payment.amount).label("total"),
        )
        .filter(extract("year", Payment.payment_date) == year)
        .group_by(extract("month", Payment.payment_date))
        .order_by("month")
        .all()
    )
    return [{"month": int(r.month), "total": float(r.total or 0)} for r in results]


def revenue_by_client(db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None):
    q = (
        db.query(
            Invoice.client_id,
            func.sum(Payment.amount).label("total_paid"),
        )
        .join(Payment, Payment.invoice_id == Invoice.id)
    )
    if start_date:
        q = q.filter(Payment.payment_date >= start_date)
    if end_date:
        q = q.filter(Payment.payment_date <= end_date)
    results = q.group_by(Invoice.client_id).all()
    return [{"client_id": r.client_id, "total_paid": float(r.total_paid or 0)} for r in results]


def overdue_invoices(db: Session):
    today = date.today()
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.due_date < today,
            Invoice.payment_status.notin_(["paid", "cancelled"]),
            Invoice.deleted_at.is_(None),
        )
        .all()
    )
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "total_amount": float(inv.total_amount),
            "amount_paid": float(inv.amount_paid),
            "due_date": str(inv.due_date),
            "days_overdue": (today - inv.due_date).days,
        }
        for inv in invoices
    ]


def task_completion_rate(db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None):
    q = db.query(Task).filter(Task.deleted_at.is_(None))
    if start_date:
        q = q.filter(Task.created_at >= start_date)
    if end_date:
        q = q.filter(Task.created_at <= end_date)
    total = q.count()
    done = q.filter(Task.status == "done").count()
    rate = round((done / total * 100), 1) if total > 0 else 0
    return {"total_tasks": total, "completed_tasks": done, "completion_rate_pct": rate}


def overdue_tasks(db: Session):
    today = date.today()
    tasks = (
        db.query(Task)
        .filter(
            Task.due_date < today,
            Task.status.notin_(["done"]),
            Task.deleted_at.is_(None),
        )
        .all()
    )
    return [
        {
            "id": t.id,
            "title": t.title,
            "assigned_to": t.assigned_to,
            "due_date": str(t.due_date),
            "days_overdue": (today - t.due_date).days,
            "status": t.status,
        }
        for t in tasks
    ]


def employee_productivity(db: Session):
    results = (
        db.query(
            Task.assigned_to,
            func.count(Task.id).label("total_tasks"),
            func.sum(
                func.cast(Task.status == "done", db.bind.dialect.name == "postgresql" and "integer" or "integer")
            ).label("done_tasks"),
        )
        .filter(Task.deleted_at.is_(None), Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
        .all()
    )
    return [
        {"user_id": r.assigned_to, "total_tasks": r.total_tasks, "done_tasks": r.done_tasks or 0}
        for r in results
    ]


def project_progress_summary(db: Session):
    projects = db.query(Project).filter(Project.deleted_at.is_(None)).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "status": p.status,
            "progress_percent": p.progress_percent,
            "due_date": str(p.due_date) if p.due_date else None,
            "client_id": p.client_id,
        }
        for p in projects
    ]


def lead_conversion_report(db: Session):
    total = db.query(Lead).filter(Lead.deleted_at.is_(None)).count()
    won = db.query(Lead).filter(Lead.stage == "won", Lead.deleted_at.is_(None)).count()
    lost = db.query(Lead).filter(Lead.stage == "lost", Lead.deleted_at.is_(None)).count()
    converted = db.query(Lead).filter(Lead.converted_to_client_id.isnot(None)).count()
    return {
        "total_leads": total,
        "won": won,
        "lost": lost,
        "converted_to_client": converted,
        "conversion_rate_pct": round(converted / total * 100, 1) if total > 0 else 0,
    }


def content_performance(db: Session):
    results = (
        db.query(ContentItem.status, func.count(ContentItem.id).label("count"))
        .filter(ContentItem.deleted_at.is_(None))
        .group_by(ContentItem.status)
        .all()
    )
    return [{"status": r.status, "count": r.count} for r in results]
