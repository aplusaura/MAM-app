"""
AI Feature 1: Weekly Report Generation
Generates an operational summary of the past 7 days from live DB data.
No external AI API required — logic is rule-based aggregation.
Can be extended to pass results to an LLM for natural language summaries.
"""
from datetime import date, timedelta, datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.project import Project
from app.models.lead import Lead
from app.models.finance import Invoice, Payment, Expense
from app.models.employee import Employee


def generate(db: Session) -> dict:
    today = date.today()
    week_start = today - timedelta(days=7)

    # Tasks
    completed_tasks = (
        db.query(Task)
        .filter(Task.status == "done", Task.updated_at >= week_start, Task.deleted_at.is_(None))
        .count()
    )
    overdue_tasks = (
        db.query(Task)
        .filter(Task.due_date < today, Task.status.notin_(["done"]), Task.deleted_at.is_(None))
        .count()
    )

    # Projects
    active_projects = db.query(Project).filter(
        Project.status == "in_progress", Project.deleted_at.is_(None)
    ).count()
    risky_projects = db.query(Project).filter(
        Project.status == "in_progress",
        Project.due_date <= today + timedelta(days=7),
        Project.progress_percent < 80,
        Project.deleted_at.is_(None),
    ).all()

    # Employee workload
    workload = (
        db.query(Task.assigned_to, func.count(Task.id).label("open_tasks"))
        .filter(Task.status.notin_(["done"]), Task.deleted_at.is_(None), Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
        .all()
    )

    # Lead movement
    leads_moved = (
        db.query(Lead)
        .filter(Lead.updated_at >= week_start, Lead.deleted_at.is_(None))
        .count()
    )
    leads_won = db.query(Lead).filter(
        Lead.stage == "won", Lead.updated_at >= week_start, Lead.deleted_at.is_(None)
    ).count()

    # Finance
    invoices_sent = db.query(Invoice).filter(
        Invoice.payment_status == "sent",
        Invoice.issue_date >= week_start,
        Invoice.deleted_at.is_(None),
    ).count()
    payments_received = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.payment_date >= week_start)
        .scalar()
    ) or 0
    expenses_total = (
        db.query(func.sum(Expense.amount))
        .filter(Expense.expense_date >= week_start)
        .scalar()
    ) or 0

    return {
        "period": {"from": str(week_start), "to": str(today)},
        "tasks": {
            "completed_this_week": completed_tasks,
            "currently_overdue": overdue_tasks,
        },
        "projects": {
            "active": active_projects,
            "at_risk": [
                {
                    "id": p.id,
                    "name": p.name,
                    "due_date": str(p.due_date),
                    "progress_percent": p.progress_percent,
                }
                for p in risky_projects
            ],
        },
        "employee_workload": [
            {"user_id": w.assigned_to, "open_tasks": w.open_tasks}
            for w in workload
        ],
        "leads": {
            "moved_this_week": leads_moved,
            "won_this_week": leads_won,
        },
        "finance": {
            "invoices_sent": invoices_sent,
            "payments_received": float(payments_received),
            "expenses_total": float(expenses_total),
            "net": float(payments_received) - float(expenses_total),
        },
    }
