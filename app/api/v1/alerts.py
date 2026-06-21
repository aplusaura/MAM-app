from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_permission, get_db, get_current_user
from app.core.permissions import Permissions
from app.models.task import Task
from app.models.finance import Invoice
from app.models.lead import Lead
from app.models.user import User

router = APIRouter()


@router.get("")
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    fourteen_days_ago = today - timedelta(days=14)
    
    overdue_tasks = db.query(
        Task.id,
        Task.title,
        Task.due_date,
        Task.priority,
    ).filter(
        Task.deleted_at == None,
        Task.due_date < today,
        Task.status.notin_(["done", "cancelled"]),
    ).all()
    
    unpaid_invoices = db.query(
        Invoice.id,
        Invoice.invoice_number,
        Invoice.client_id,
        Invoice.due_date,
        Invoice.total_amount,
    ).filter(
        Invoice.deleted_at == None,
        Invoice.payment_status != "paid",
    ).all()
    
    stale_leads = db.query(
        Lead.id,
        Lead.lead_name,
        Lead.company_name,
        Lead.last_contact_date,
        Lead.stage,
    ).filter(
        Lead.deleted_at == None,
        Lead.stage.notin_(["won", "lost"]),
        Lead.updated_at < fourteen_days_ago,
    ).all()
    
    alerts = []
    
    if overdue_tasks:
        critical_count = sum(1 for t in overdue_tasks if t[3] == "critical")
        high_count = sum(1 for t in overdue_tasks if t[3] == "high")
        
        severity = "critical" if critical_count > 0 else ("high" if high_count > 0 else "medium")
        
        alerts.append({
            "type": "overdue_tasks",
            "severity": severity,
            "count": len(overdue_tasks),
            "items": [
                {
                    "id": t[0],
                    "title": t[1],
                    "due_date": str(t[2]),
                    "priority": t[3],
                }
                for t in overdue_tasks[:10]
            ],
        })
    
    unpaid_total = sum(float(inv[4] or 0) for inv in unpaid_invoices)
    if unpaid_invoices:
        overdue_inv = [inv for inv in unpaid_invoices if inv[3] and inv[3] < today]
        severity = "high" if overdue_inv else "medium"
        
        alerts.append({
            "type": "unpaid_invoices",
            "severity": severity,
            "count": len(unpaid_invoices),
            "total_amount": unpaid_total,
            "items": [
                {
                    "id": inv[0],
                    "invoice_number": inv[1],
                    "client_id": inv[2],
                    "due_date": str(inv[3]) if inv[3] else None,
                    "amount": float(inv[4] or 0),
                }
                for inv in unpaid_invoices[:10]
            ],
        })
    
    if stale_leads:
        alerts.append({
            "type": "stale_leads",
            "severity": "low",
            "count": len(stale_leads),
            "items": [
                {
                    "id": lead[0],
                    "name": lead[1],
                    "company": lead[2],
                    "last_contact": str(lead[3]) if lead[3] else None,
                    "stage": lead[4],
                }
                for lead in stale_leads[:10]
            ],
        })
    
    return alerts
