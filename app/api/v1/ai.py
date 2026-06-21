import json
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from google import genai

from app.api.deps import require_permission, get_db
from app.core.config import settings
from app.core.permissions import Permissions
from app.ai import weekly_report, workload_distribution, delay_detection, smart_search

client = genai.Client(api_key=settings.GEMINI_API_KEY)

router = APIRouter()


def _sanitize_for_prompt(text: str, max_length: int = 500) -> str:
    """Remove prompt injection patterns and cap length."""
    if not text:
        return ""
    # Truncate to max length
    text = str(text)[:max_length]
    # Remove characters that break prompt structure
    text = text.replace("```", "").replace("---", "").replace("###", "")
    # Remove any instruction-like patterns
    text = re.sub(r'(?i)(ignore|disregard|forget).{0,30}(previous|above|prior|instruction)', '', text)
    return text.strip()


def _llm(prompt: str, max_tokens: int = 200, temperature: float = 0.5, timeout: int = 90) -> str:
    """Call Google Gemini API using new google-genai library."""
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
        )
        return response.text.strip()
    except Exception as e:
        error_msg = str(e)
        if "API key" in error_msg or "authentication" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Gemini API key is invalid or not configured.")
        raise HTTPException(status_code=500, detail=f"AI error: {error_msg}")


def _extract_json(text: str):
    """Extract JSON from LLM output that may contain extra text."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting JSON block from markdown fences
    match = re.search(r'```(?:json)?\s*([\s\S]+?)\s*```', text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Use JSONDecoder to find first valid JSON object/array at any position
    decoder = json.JSONDecoder()
    for i in range(len(text)):
        if text[i] in ('{', '['):
            try:
                obj, _ = decoder.raw_decode(text, i)
                return obj
            except json.JSONDecodeError:
                continue
    raise HTTPException(status_code=500, detail="AI returned invalid JSON. Please try again.")


@router.get("/weekly-report", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def get_weekly_report(db: Session = Depends(get_db)):
    return weekly_report.generate(db)


@router.get("/workload", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def get_workload_distribution(db: Session = Depends(get_db)):
    return workload_distribution.analyze(db)


@router.get("/delays", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def get_delay_risks(db: Session = Depends(get_db)):
    return delay_detection.detect(db)


@router.get("/search", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def smart_search_query(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    return smart_search.search(db, q)


class ProposalRequest(BaseModel):
    client_name: str
    service: str
    scope: str
    timeline: str
    budget: Optional[str] = None
    notes: Optional[str] = None


@router.post("/generate-proposal", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def generate_proposal(payload: ProposalRequest):
    client_name = _sanitize_for_prompt(payload.client_name, 100)
    service = _sanitize_for_prompt(payload.service, 100)
    scope = _sanitize_for_prompt(payload.scope, 300)
    timeline = _sanitize_for_prompt(payload.timeline, 50)
    budget = _sanitize_for_prompt(payload.budget or "To be discussed", 50)
    notes = _sanitize_for_prompt(payload.notes or "None", 200)

    prompt = f"""Write a professional client proposal for a marketing agency. Use the exact details below. Be specific and concise.

CLIENT: {client_name}
SERVICE: {service}
SCOPE: {scope}
TIMELINE: {timeline}
BUDGET: {budget}
NOTES: {notes}

Write the proposal with these 5 sections. Use the client name and service details throughout:

**Executive Summary**
- [2 sentences about what we will deliver for {client_name}]

**Scope & Deliverables**
- [Specific deliverable 1 based on the scope]
- [Specific deliverable 2]
- [Specific deliverable 3]

**Timeline**
- [Phase 1 with week range]
- [Phase 2 with week range]
- [Final delivery at {timeline}]

**Investment**
- Service: {service}
- Budget: {budget}
- Payment: [suggested payment schedule]

**Next Steps**
- [Action 1]
- [Action 2]
- [Sign-off / kickoff date suggestion]"""

    text = _llm(prompt, max_tokens=300, temperature=0.7, timeout=120)
    return {"proposal": text}


@router.post("/estimate-project", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def estimate_project(payload: dict):
    brief = _sanitize_for_prompt(payload.get("brief", ""), 300)
    service_type = _sanitize_for_prompt(payload.get("service_type", ""), 100)
    budget = _sanitize_for_prompt(payload.get("budget", ""), 50)
    timeline = _sanitize_for_prompt(payload.get("timeline", ""), 50)

    prompt = f"""Agency project estimate. Reply with ONLY valid JSON, no text outside it.

Brief: {brief}
Service: {service_type}, Budget: {budget}, Timeline: {timeline}

JSON format:
{{"summary":"one sentence","estimated_hours":40,"estimated_cost":5000,"tasks":[{{"title":"t","type":"design","hours":10,"priority":"high","description":"d"}}],"timeline_weeks":4,"risks":["r1"],"recommendations":["r1"]}}"""

    raw = _llm(prompt, max_tokens=500, temperature=0.2, timeout=120)
    return _extract_json(raw)


@router.post("/score-leads", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def score_leads(db: Session = Depends(get_db)):
    from app.models.lead import Lead
    leads = db.query(Lead).filter(Lead.deleted_at == None, Lead.stage.notin_(["won", "lost"])).limit(100).all()

    if not leads:
        return []

    lead_data = [
        {
            "id": lead.id,
            "name": lead.lead_name,
            "company": lead.company_name,
            "stage": lead.stage,
            "budget": str(lead.expected_budget) if lead.expected_budget else "unknown",
            "service": lead.interested_service or "unknown",
            "notes": (lead.notes or "")[:200],
        }
        for lead in leads
    ]

    prompt = f"""You are a sales analyst. Score these leads 0-100 based on conversion probability.

Leads:
{json.dumps(lead_data, indent=2)}

Consider: stage progression (meeting_scheduled/qualified/proposal_sent = higher score), budget clarity, specific service interest, notes quality.

Return ONLY a valid JSON array — no explanation, no markdown:
[{{"id": 1, "score": 75, "reason": "Qualified with clear budget"}}]"""

    raw = _llm(prompt, max_tokens=300, temperature=0.2, timeout=120)
    return _extract_json(raw)


@router.post("/client-insights", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def get_client_insights(db: Session = Depends(get_db)):
    from datetime import date, timedelta
    from sqlalchemy import func
    from app.models.client import Client
    from app.models.project import Project
    from app.models.finance import Invoice, Payment

    today = date.today()
    ninety_days_ago = today - timedelta(days=90)

    clients = db.query(Client).filter(Client.deleted_at == None).all()
    if not clients:
        return []

    client_ids = [c.id for c in clients]

    project_counts = dict(
        db.query(Project.client_id, func.count(Project.id))
        .filter(Project.client_id.in_(client_ids), Project.deleted_at == None)
        .group_by(Project.client_id)
        .all()
    )

    invoice_totals_90d = dict(
        db.query(Invoice.client_id, func.sum(Invoice.total_amount))
        .filter(
            Invoice.client_id.in_(client_ids),
            Invoice.deleted_at == None,
            Invoice.issue_date >= ninety_days_ago,
        )
        .group_by(Invoice.client_id)
        .all()
    )

    paid_amounts = dict(
        db.query(Invoice.client_id, func.sum(Invoice.amount_paid))
        .filter(Invoice.client_id.in_(client_ids), Invoice.deleted_at == None)
        .group_by(Invoice.client_id)
        .all()
    )

    outstanding_amounts = dict(
        db.query(Invoice.client_id, func.sum(Invoice.total_amount - Invoice.amount_paid))
        .filter(
            Invoice.client_id.in_(client_ids),
            Invoice.deleted_at == None,
            Invoice.payment_status != "paid",
        )
        .group_by(Invoice.client_id)
        .all()
    )

    overdue_client_ids = set(
        row[0] for row in db.query(Invoice.client_id)
        .filter(
            Invoice.client_id.in_(client_ids),
            Invoice.deleted_at == None,
            Invoice.payment_status != "paid",
            Invoice.due_date < today,
        )
        .distinct()
        .all()
    )

    payment_counts = dict(
        db.query(Invoice.client_id, func.count(Payment.id))
        .join(Payment, Payment.invoice_id == Invoice.id)
        .filter(Invoice.client_id.in_(client_ids), Invoice.deleted_at == None)
        .group_by(Invoice.client_id)
        .all()
    )

    client_data = [
        {
            "id": c.id,
            "name": _sanitize_for_prompt(c.name or "", 80),
            "projects": project_counts.get(c.id, 0),
            "revenue_90d": float(invoice_totals_90d.get(c.id, 0) or 0),
            "total_paid": float(paid_amounts.get(c.id, 0) or 0),
            "outstanding": float(outstanding_amounts.get(c.id, 0) or 0),
            "has_overdue": c.id in overdue_client_ids,
            "payment_reliability": payment_counts.get(c.id, 0),
        }
        for c in clients
    ]

    prompt = f"""You are an agency account manager. Analyze these clients. For each, calculate a health score (0-100) based on: revenue, payment history, project activity, and overdue status. Then give 3 specific insights and 1 recommendation.

Clients: {json.dumps(client_data)}

Reply ONLY with valid JSON array (no markdown, no extra text):
[{{"client_id": 1, "client_name": "Name", "health_score": 85, "insights": ["insight1", "insight2", "insight3"], "recommendation": "action"}}]"""

    raw = _llm(prompt, max_tokens=600, temperature=0.3, timeout=120)
    return _extract_json(raw)


@router.post("/crm-followup", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def crm_followup(db: Session = Depends(get_db)):
    from app.models.lead import Lead
    leads = db.query(Lead).filter(Lead.deleted_at == None).order_by(Lead.updated_at.desc()).limit(10).all()

    if not leads:
        return []

    lead_lines = "\n".join(
        f"- ID:{lead.id} Name:{_sanitize_for_prompt(lead.lead_name or '', 80)} "
        f"Company:{_sanitize_for_prompt(lead.company_name or '', 80)} "
        f"Stage:{lead.stage or 'unknown'} "
        f"Budget:{str(lead.expected_budget) if lead.expected_budget else 'unknown'} "
        f"LastUpdated:{str(lead.updated_at)[:10] if lead.updated_at else 'unknown'}"
        for lead in leads
    )

    prompt = f"""For each lead below, suggest ONE short follow-up action (call, email, meeting) and the best timing. Be concise.

Leads:
{lead_lines}

Return ONLY a valid JSON array — no explanation, no markdown:
[{{"lead_id": 1, "lead_name": "Name", "action": "Send follow-up email", "timing": "Within 24 hours"}}]"""

    raw = _llm(prompt, max_tokens=400, temperature=0.3, timeout=120)
    return _extract_json(raw)


@router.get("/financial-insights", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def get_financial_insights(db: Session = Depends(get_db)):
    from datetime import date
    from sqlalchemy import func
    from app.models.finance import Invoice, Expense
    from app.models.client import Client

    today = date.today()
    month_start = today.replace(day=1)

    total_invoices = db.query(func.count(Invoice.id)).filter(Invoice.deleted_at == None).scalar() or 0
    total_paid = db.query(func.sum(Invoice.amount_paid)).filter(Invoice.deleted_at == None).scalar() or 0
    total_outstanding = db.query(
        func.sum(Invoice.total_amount - Invoice.amount_paid)
    ).filter(Invoice.deleted_at == None, Invoice.payment_status != "paid").scalar() or 0
    total_expenses_month = db.query(func.sum(Expense.amount)).filter(
        Expense.expense_date >= month_start
    ).scalar() or 0

    top_clients_raw = db.query(
        Client.company_name, func.sum(Invoice.amount_paid).label("revenue")
    ).join(Invoice, Invoice.client_id == Client.id).filter(
        Invoice.deleted_at == None, Client.deleted_at == None
    ).group_by(Client.id, Client.company_name).order_by(func.sum(Invoice.amount_paid).desc()).limit(3).all()
    top_clients = [{"client": name, "revenue": float(rev or 0)} for name, rev in top_clients_raw]

    data = {
        "total_invoices": total_invoices,
        "total_paid": float(total_paid),
        "total_outstanding": float(total_outstanding),
        "total_expenses_this_month": float(total_expenses_month),
        "top_clients_by_revenue": top_clients,
    }

    prompt = f"""You are a financial advisor for a marketing agency. Analyze this data and give 3 actionable insights: {json.dumps(data)}. Format as JSON array of {{"insight": "...", "recommendation": "...", "priority": "high|medium|low"}}. Return ONLY valid JSON array, no other text."""

    raw = _llm(prompt, max_tokens=400, temperature=0.3, timeout=120)
    return _extract_json(raw)


class TimelineRequest(BaseModel):
    project_name: str
    deliverables: str
    team_size: int = 3
    deadline: str = ""


@router.post("/generate-timeline", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def generate_timeline(payload: TimelineRequest):
    project_name = _sanitize_for_prompt(payload.project_name, 100)
    deliverables = _sanitize_for_prompt(payload.deliverables, 400)
    deadline = _sanitize_for_prompt(payload.deadline, 50)

    prompt = f"""You are a project manager. Generate a realistic timeline with phases for this project.

Project: {project_name}
Deliverables: {deliverables}
Team size: {payload.team_size}
Deadline: {deadline or "flexible"}

Reply ONLY with valid JSON: {{"phases": [{{"name": "str", "duration_weeks": 1, "tasks": ["str"], "dependencies": ["str"]}}], "total_weeks": 1, "risks": ["str"]}}"""

    raw = _llm(prompt, max_tokens=600, temperature=0.3, timeout=120)
    return _extract_json(raw)


@router.post("/chat", dependencies=[Depends(require_permission(Permissions.ACCESS_AI_TOOLS))])
def chat_with_data(payload: dict, db: Session = Depends(get_db)):
    from datetime import date, timedelta
    from sqlalchemy import func
    question = _sanitize_for_prompt(payload.get("question", ""), 500)
    today = date.today()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    try:
        from app.models.task import Task
        from app.models.project import Project
        from app.models.employee import Employee
        from app.models.client import Client
        from app.models.finance import Invoice, Payment
        from app.models.lead import Lead

        total_tasks = db.query(Task).filter(Task.deleted_at == None).count()
        completed_tasks = db.query(Task).filter(Task.deleted_at == None, Task.status == "done").count()
        overdue_tasks = db.query(Task).filter(
            Task.deleted_at == None,
            Task.due_date < today,
            Task.status.notin_(["done", "cancelled"]),
        ).count()
        active_projects = db.query(Project).filter(
            Project.deleted_at == None, Project.status == "in_progress").count()
        completed_projects = db.query(Project).filter(
            Project.deleted_at == None, Project.status == "completed").count()
        active_employees = db.query(Employee).filter(Employee.status == "active").count()
        total_clients = db.query(Client).filter(Client.deleted_at == None).count()

        # Revenue data
        revenue_this_month = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_date >= month_start
        ).scalar() or 0
        revenue_last_month = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_date >= last_month_start,
            Payment.payment_date < month_start,
        ).scalar() or 0
        unpaid_invoices = db.query(func.count(Invoice.id)).filter(
            Invoice.deleted_at == None, Invoice.payment_status == "unpaid"
        ).scalar() or 0
        total_receivable = db.query(
            func.sum(Invoice.total_amount - Invoice.amount_paid)
        ).filter(Invoice.deleted_at == None, Invoice.payment_status != "paid").scalar() or 0

        # Lead pipeline counts by stage
        leads_by_stage = db.query(Lead.stage, func.count(Lead.id)).filter(
            Lead.deleted_at == None
        ).group_by(Lead.stage).limit(100).all()
        lead_summary = ", ".join(f"{s}:{c}" for s, c in leads_by_stage) if leads_by_stage else "none"

        # Per-employee overdue task counts
        emp_overdue = db.query(
            Employee.full_name,
            func.count(Task.id).label("overdue")
        ).join(Task, Task.assigned_to == Employee.user_id).filter(
            Task.deleted_at == None,
            Task.due_date < today,
            Task.status.notin_(["done", "cancelled"]),
            Employee.status == "active",
        ).group_by(Employee.full_name).order_by(func.count(Task.id).desc()).limit(5).all()

        emp_lines = ", ".join(f"{n}:{c}" for n, c in emp_overdue) if emp_overdue else "none"
        rev_this = float(revenue_this_month)
        rev_last = float(revenue_last_month)
        revenue_trend = "up" if rev_this > rev_last else ("down" if rev_this < rev_last else "same as last month")
    except Exception:
        total_tasks = overdue_tasks = active_projects = active_employees = total_clients = 0
        completed_tasks = completed_projects = unpaid_invoices = 0
        rev_this = rev_last = total_receivable = 0
        emp_lines = lead_summary = "unavailable"
        revenue_trend = "unknown"

    prompt = f"""You are an AI assistant for a marketing agency. You must answer ONLY using the data listed below. Do NOT invent or estimate any numbers not explicitly given. If the data does not contain enough information to answer, say exactly: "I don't have that data available."

AGENCY DATA ({today}):
- Tasks: {total_tasks} total | {completed_tasks} completed | {overdue_tasks} overdue
- Projects: {active_projects} active | {completed_projects} completed
- Employees: {active_employees} active | Clients: {total_clients} total
- Revenue this month: ${rev_this:,.0f} | Last month: ${rev_last:,.0f} | Trend: {revenue_trend}
- Unpaid invoices: {unpaid_invoices} | Total receivable: ${float(total_receivable):,.0f}
- Lead pipeline (stage:count): {lead_summary}
- Most overdue tasks by employee (name:count): {emp_lines}

Question: {question}

Answer in 2-3 sentences using ONLY the numbers above:"""

    answer = _llm(prompt, max_tokens=200, temperature=0.2, timeout=90)
    return {"answer": answer}
