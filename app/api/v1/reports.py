from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date, datetime, timezone
from calendar import monthrange

from sqlalchemy import func, extract
from app.api.deps import DbSession, require_permission
from app.core.permissions import Permissions
from app.services import report_service
from app.models.project import Project
from app.models.task import Task

router = APIRouter()


@router.get("/revenue/monthly", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def revenue_monthly(db: DbSession, year: Optional[int] = Query(default=None)):
    year = year or date.today().year
    return report_service.revenue_by_month(db, year)


@router.get("/revenue/by-client", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def revenue_by_client(db: DbSession, start_date: Optional[date] = Query(None), end_date: Optional[date] = Query(None)):
    return report_service.revenue_by_client(db, start_date=start_date, end_date=end_date)


@router.get("/invoices/overdue", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def overdue_invoices(db: DbSession):
    return report_service.overdue_invoices(db)


@router.get("/tasks/completion", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def task_completion(db: DbSession, start_date: Optional[date] = Query(None), end_date: Optional[date] = Query(None)):
    return report_service.task_completion_rate(db, start_date=start_date, end_date=end_date)


@router.get("/tasks/overdue", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def overdue_tasks(db: DbSession):
    return report_service.overdue_tasks(db)


@router.get("/tasks/stats", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def tasks_stats(db: DbSession):
    total = db.query(func.count(Task.id)).filter(Task.deleted_at.is_(None)).scalar() or 0
    by_status_rows = db.query(Task.status, func.count(Task.id)).filter(Task.deleted_at.is_(None)).group_by(Task.status).all()
    by_status = {r[0]: r[1] for r in by_status_rows}
    overdue = db.query(func.count(Task.id)).filter(Task.deleted_at.is_(None), Task.due_date < date.today(), Task.status.notin_(["done", "cancelled"])).scalar() or 0
    return {"total": total, "by_status": by_status, "overdue": overdue}


@router.get("/projects/stats", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def projects_stats(db: DbSession):
    from app.models.client import Client
    from app.models.lead import Lead

    total = db.query(func.count(Project.id)).filter(Project.deleted_at.is_(None)).scalar() or 0
    by_status_rows = db.query(Project.status, func.count(Project.id)).filter(Project.deleted_at.is_(None)).group_by(Project.status).all()
    by_status = {r[0]: r[1] for r in by_status_rows}

    # Current month stats
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    active_clients_this_month = db.query(func.count(Client.id)).filter(
        Client.deleted_at.is_(None),
        Client.status == "active",
        Client.created_at >= month_start,
    ).scalar() or 0

    leads_this_month = db.query(func.count(Lead.id)).filter(
        Lead.deleted_at.is_(None),
        Lead.converted_to_client_id.is_(None),
        Lead.created_at >= month_start,
    ).scalar() or 0

    won_leads_this_month = db.query(func.count(Lead.id)).filter(
        Lead.deleted_at.is_(None),
        Lead.stage == "won",
        Lead.updated_at >= month_start,
    ).scalar() or 0

    return {
        "total": total,
        "by_status": by_status,
        "active_clients_this_month": active_clients_this_month,
        "leads_this_month": leads_this_month,
        "won_leads_this_month": won_leads_this_month,
    }


@router.get("/employees/productivity", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def employee_productivity(db: DbSession):
    return report_service.employee_productivity(db)


@router.get("/projects/summary", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def projects_summary(db: DbSession):
    return report_service.project_progress_summary(db)


@router.get("/leads/conversion", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def lead_conversion(db: DbSession):
    return report_service.lead_conversion_report(db)


@router.get("/content/performance", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def content_performance(db: DbSession):
    return report_service.content_performance(db)


@router.get("/client/{client_id}/monthly", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def client_monthly_report(client_id: int, db: DbSession, month: int = Query(...), year: int = Query(...)):
    from app.models.task import Task
    from sqlalchemy import func
    tasks = db.query(Task).filter(
        Task.client_id == client_id,
        Task.deleted_at.is_(None),
        func.extract("month", Task.created_at) == month,
        func.extract("year", Task.created_at) == year,
    ).all()
    by_type: dict = {}
    for t in tasks:
        key = t.task_type or "other"
        by_type[key] = by_type.get(key, 0) + 1
    return {"client_id": client_id, "month": month, "year": year, "total": len(tasks), "by_type": by_type}


@router.get("/team/monthly", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def team_monthly_report(db: DbSession, month: int = Query(...), year: int = Query(...)):
    from app.models.task import Task
    from sqlalchemy import func
    from datetime import date
    tasks = db.query(Task).filter(
        Task.deleted_at.is_(None),
        func.extract("month", Task.created_at) == month,
        func.extract("year", Task.created_at) == year,
    ).all()
    done = [t for t in tasks if t.status == "done"]
    delayed = [t for t in tasks if t.due_date and t.due_date < date.today() and t.status not in ("done", "cancelled")]
    avg_hours = None
    hours_list = [float(t.actual_hours) for t in done if t.actual_hours]
    if hours_list:
        avg_hours = round(sum(hours_list) / len(hours_list), 2)
    return {
        "month": month, "year": year,
        "total_tasks": len(tasks),
        "completed": len(done),
        "delayed": len(delayed),
        "avg_actual_hours": avg_hours,
        "overdue": len(delayed),
        "completion_rate": int(float(len(done)) / len(tasks) * 10000) / 10000 if tasks else 0,
    }


@router.get("/employee/{employee_id}/monthly", dependencies=[Depends(require_permission(Permissions.VIEW_REPORTS))])
def employee_monthly_report(employee_id: int, db: DbSession, month: int = Query(...), year: int = Query(...)):
    from app.models.task import Task
    from app.models.employee import Employee
    from sqlalchemy import func
    from datetime import date
    from app.services import employee_service
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp or not emp.user_id:
        return {"tasks": [], "total": 0}
    tasks = db.query(Task).filter(
        Task.assigned_to == emp.user_id,
        Task.deleted_at.is_(None),
        func.extract("month", Task.created_at) == month,
        func.extract("year", Task.created_at) == year,
    ).all()
    done = [t for t in tasks if t.status == "done"]
    delayed = [t for t in tasks if t.due_date and t.due_date < date.today() and t.status not in ("done", "cancelled")]
    return {
        "employee_id": employee_id,
        "month": month, "year": year,
        "total_tasks": len(tasks),
        "completed": len(done),
        "delayed": len(delayed),
        "by_type": {k: sum(1 for t in tasks if (t.task_type or "other") == k) for k in set((t.task_type or "other") for t in tasks)},
    }
