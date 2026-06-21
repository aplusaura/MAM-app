import os
import secrets
import string
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File

from app.api.deps import DbSession, CurrentUser, require_permission
from app.core.permissions import Permissions
from app.core.config import settings
from app.schemas.employee import (
    EmployeeRead, EmployeeDetail, EmployeeCreate, EmployeeUpdate, EmployeeListItem, BonusCreate, BonusRead,
    LeaveRequestCreate, LeaveRequestRead, LeaveRequestUpdate,
    WorkSessionRead, WorkSessionCreate, WorkSessionUpdate, EmployeeEvaluationCreate, EmployeeEvaluationRead,
)
from app.services import employee_service

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# NAMED ROUTES FIRST (must be registered before /{employee_id} to avoid shadowing)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[EmployeeListItem], dependencies=[Depends(require_permission(Permissions.VIEW_EMPLOYEES))])
def list_employees(
    db: DbSession,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
):
    return employee_service.list_employees(db, skip=skip, limit=limit, status=status, department_id=department_id)


@router.get("/working-now")
def working_now(db: DbSession, current_user: CurrentUser):
    from app.models.employee import Employee
    from app.models.task import Task
    busy = (
        db.query(Employee)
        .filter(Employee.availability_status == "busy", Employee.deleted_at.is_(None))
        .all()
    )
    result = []
    for emp in busy:
        task = None
        if emp.user_id:
            task = (
                db.query(Task)
                .filter(Task.assigned_to == emp.user_id, Task.status == "in_progress", Task.deleted_at.is_(None))
                .order_by(Task.updated_at.desc())
                .first()
            )
        result.append({
            "id": emp.id,
            "full_name": emp.full_name,
            "job_title": emp.job_title,
            "profile_image_url": emp.profile_image_url,
            "current_task": {"id": task.id, "title": task.title, "task_code": task.task_code} if task else None,
        })
    return result


@router.get("/leaderboard")
def leaderboard(db: DbSession, current_user: CurrentUser):
    from app.models.employee import Employee, EmployeeEvaluation
    from app.models.task import Task
    from app.models.user import User
    from sqlalchemy import func, case
    from datetime import date
    now = date.today()

    superuser_ids = {uid for (uid,) in db.query(User.id).filter(User.is_superuser == True).all()}  # noqa: E712
    employees = [
        e for e in db.query(Employee).filter(
            Employee.deleted_at.is_(None), Employee.status == "active", Employee.user_id.isnot(None)
        ).all()
        if e.user_id not in superuser_ids
    ]
    user_ids = [e.user_id for e in employees]
    emp_ids = [e.id for e in employees]
    if not user_ids:
        return []

    task_rows = (
        db.query(
            Task.assigned_to,
            func.count(Task.id).label("total"),
            func.sum(case((Task.status == "done", 1), else_=0)).label("done"),
        )
        .filter(
            Task.assigned_to.in_(user_ids),
            Task.deleted_at.is_(None),
            func.extract("month", Task.updated_at) == now.month,
            func.extract("year", Task.updated_at) == now.year,
        )
        .group_by(Task.assigned_to)
        .all()
    )
    task_map = {uid: (int(total), int(done)) for uid, total, done in task_rows}

    eval_rows = (
        db.query(EmployeeEvaluation.employee_id, func.avg(EmployeeEvaluation.score))
        .filter(
            EmployeeEvaluation.employee_id.in_(emp_ids),
            EmployeeEvaluation.period_month == now.month,
            EmployeeEvaluation.period_year == now.year,
        )
        .group_by(EmployeeEvaluation.employee_id)
        .all()
    )
    eval_map = {eid: float(avg) for eid, avg in eval_rows}

    ranking = []
    for emp in employees:
        total, done = task_map.get(emp.user_id, (0, 0))
        avg_score = eval_map.get(emp.id)
        completion_rate = (done / total) if total > 0 else 0.0
        task_pts = min(done / 10.0, 1.0) * 30
        completion_pts = completion_rate * 30
        eval_pts = (avg_score / 5.0 * 25) if avg_score else 0
        performance_score = round(task_pts + completion_pts + eval_pts)
        ranking.append({
            "id": emp.id,
            "full_name": emp.full_name,
            "job_title": emp.job_title,
            "profile_image_url": emp.profile_image_url,
            "tasks_done": done,
            "avg_score": round(avg_score, 2) if avg_score else None,
            "performance_score": performance_score,
        })
    ranking.sort(key=lambda x: x["performance_score"], reverse=True)
    for i, r in enumerate(ranking):
        r["rank"] = i + 1
    return ranking


@router.get("/me/today-session")
def me_today_session_early(db: DbSession, current_user: CurrentUser):
    from app.models.employee import Employee, WorkSession
    from datetime import date
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return None
    session = db.query(WorkSession).filter(WorkSession.employee_id == emp.id, WorkSession.date == date.today()).order_by(WorkSession.id.desc()).first()
    return session


@router.post("/me/clock-in", response_model=WorkSessionRead)
def clock_in(db: DbSession, current_user: CurrentUser):
    from app.models.employee import Employee, WorkSession
    from datetime import date, datetime, timezone
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    today = date.today()
    existing = db.query(WorkSession).filter(WorkSession.employee_id == emp.id, WorkSession.date == today, WorkSession.clock_out.is_(None)).first()
    if existing:
        return existing
    session = WorkSession(employee_id=emp.id, date=today, clock_in=datetime.now(timezone.utc))
    db.add(session)
    emp.availability_status = "busy"
    db.commit()
    db.refresh(session)
    return session


@router.post("/me/clock-out", response_model=WorkSessionRead)
def clock_out(db: DbSession, current_user: CurrentUser):
    from app.models.employee import Employee, WorkSession
    from datetime import date, datetime, timezone
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    session = db.query(WorkSession).filter(
        WorkSession.employee_id == emp.id,
        WorkSession.date == date.today(),
        WorkSession.clock_out.is_(None),
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="No active session found")
    now = datetime.now(timezone.utc)
    session.clock_out = now
    clock_in_utc = session.clock_in if session.clock_in.tzinfo is not None else session.clock_in.replace(tzinfo=timezone.utc)
    delta = now - clock_in_utc
    session.total_hours = round(delta.total_seconds() / 3600, 2)
    emp.availability_status = "available"
    db.commit()
    db.refresh(session)
    return session


@router.get("/me/today-session", response_model=WorkSessionRead)
def today_session(db: DbSession, current_user: CurrentUser):
    from app.models.employee import Employee, WorkSession
    from datetime import date
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    session = db.query(WorkSession).filter(WorkSession.employee_id == emp.id, WorkSession.date == date.today()).order_by(WorkSession.id.desc()).first()
    if not session:
        raise HTTPException(status_code=404, detail="No session today")
    return session


@router.patch("/work-sessions/{session_id}", response_model=WorkSessionRead)
def update_work_session(session_id: int, payload: WorkSessionUpdate, db: DbSession, current_user: CurrentUser):
    from app.models.employee import WorkSession
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin only")
    ws = db.query(WorkSession).filter(WorkSession.id == session_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Work session not found")
    if payload.total_hours is not None:
        if payload.total_hours < 0 or payload.total_hours > 24:
            raise HTTPException(status_code=422, detail="total_hours must be between 0 and 24")
        ws.total_hours = round(payload.total_hours, 2)
        from datetime import timedelta
        ws.clock_out = ws.clock_in + timedelta(hours=payload.total_hours)
    if payload.date is not None:
        ws.date = payload.date
    db.commit()
    db.refresh(ws)
    return ws


@router.delete("/work-sessions/{session_id}", status_code=204)
def delete_work_session(session_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.employee import WorkSession
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin only")
    ws = db.query(WorkSession).filter(WorkSession.id == session_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Work session not found")
    db.delete(ws)
    db.commit()


@router.patch("/leave-requests/{request_id}", response_model=LeaveRequestRead)
def review_leave_request(request_id: int, payload: LeaveRequestUpdate, db: DbSession, current_user: CurrentUser):
    from app.models.employee import LeaveRequest, Employee
    from app.models.notification import Notification
    from app.models.user import User
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin only")
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    req.status = payload.status
    req.reviewed_by = current_user.id
    db.commit()
    db.refresh(req)

    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    verdict = "approved" if payload.status == "approved" else "denied"
    if emp and emp.user_id:
        db.add(Notification(
            user_id=emp.user_id,
            title=f"Leave Request {verdict.capitalize()}",
            body=f"Your {req.leave_type.replace('_', ' ')} leave request has been {verdict} by {current_user.email}.",
            type=f"leave_{verdict}",
            entity_type="leave_request",
            entity_id=req.id,
        ))

    if payload.status == "approved" and emp and emp.manager_id:
        manager = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        if manager and manager.user_id:
            db.add(Notification(
                user_id=manager.user_id,
                title=f"Team Member Leave Approved — {emp.full_name}",
                body=f"{emp.full_name}'s {req.leave_type.replace('_', ' ')} leave has been approved ({req.start_date} → {req.end_date}, {req.days_count} day(s)).",
                type="leave_approved",
                entity_type="leave_request",
                entity_id=req.id,
            ))

    db.commit()
    return req


@router.put("/leave-requests/{request_id}", response_model=LeaveRequestRead)
def edit_leave_request(request_id: int, payload: LeaveRequestCreate, db: DbSession, current_user: CurrentUser):
    from app.models.employee import LeaveRequest, Employee
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not current_user.is_superuser and (not emp or emp.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not allowed")
    if req.status != "pending" and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Only pending requests can be edited")
    req.leave_type = payload.leave_type
    req.start_date = payload.start_date
    req.end_date = payload.end_date
    req.days_count = payload.days_count
    req.reason = payload.reason
    db.commit()
    db.refresh(req)
    return req


@router.delete("/leave-requests/{request_id}", status_code=204)
def delete_leave_request_by_id(request_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.employee import LeaveRequest, Employee
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not current_user.is_superuser and (not emp or emp.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not allowed")
    if req.status != "pending" and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Only pending requests can be deleted")
    db.delete(req)
    db.commit()


@router.get("/leave-requests/pending", response_model=List[LeaveRequestRead])
def pending_leave_requests(db: DbSession, current_user: CurrentUser):
    from app.models.employee import LeaveRequest
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin only")
    return db.query(LeaveRequest).filter(LeaveRequest.status == "pending").order_by(LeaveRequest.created_at.desc()).all()


# ──────────────────────────────────────────────────────────────────────────────
# PARAMETERIZED ROUTES (after all named routes)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{employee_id}", response_model=EmployeeDetail, dependencies=[Depends(require_permission(Permissions.VIEW_EMPLOYEES))])
def get_employee(employee_id: int, db: DbSession):
    return employee_service.get_employee(db, employee_id)


@router.post("/", dependencies=[Depends(require_permission(Permissions.CREATE_EMPLOYEE))])
def create_employee(payload: EmployeeCreate, db: DbSession, current_user: CurrentUser):
    emp, generated_email, generated_password = employee_service.create_employee(db, payload)
    return {
        "id": emp.id,
        "full_name": emp.full_name,
        "job_title": emp.job_title,
        "status": emp.status,
        "department_id": emp.department_id,
        "role_id": emp.role_id,
        "generated_email": generated_email,
        "generated_password": generated_password,
    }


@router.patch("/{employee_id}", response_model=EmployeeRead, dependencies=[Depends(require_permission(Permissions.EDIT_EMPLOYEE))])
def update_employee(employee_id: int, payload: EmployeeUpdate, db: DbSession):
    return employee_service.update_employee(db, employee_id, payload)


@router.delete("/{employee_id}", dependencies=[Depends(require_permission(Permissions.DELETE_EMPLOYEE))])
def delete_employee(employee_id: int, db: DbSession):
    employee_service.delete_employee(db, employee_id)
    return {"message": "Employee deleted"}


@router.get("/{employee_id}/workdays")
def get_employee_workdays(employee_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.task import Task
    from sqlalchemy import cast, Date, distinct
    emp = employee_service.get_employee(db, employee_id)
    if not emp.user_id:
        return {"dates": [], "total_days": 0}
    dates_q = (
        db.query(distinct(cast(Task.updated_at, Date)))
        .filter(
            Task.assigned_to == emp.user_id,
            Task.status.in_(["in_progress", "done"]),
            Task.deleted_at.is_(None),
        )
        .order_by(cast(Task.updated_at, Date).desc())
        .all()
    )
    dates = [str(row[0]) for row in dates_q if row[0]]
    return {"dates": dates, "total_days": len(dates)}


@router.get("/{employee_id}/credentials")
def get_employee_credentials(employee_id: int, db: DbSession, current_user: CurrentUser):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super admin only")
    emp = employee_service.get_employee(db, employee_id)
    if not emp.user_id:
        raise HTTPException(status_code=404, detail="Employee has no linked user account")
    from app.models.user import User
    user = db.query(User).filter(User.id == emp.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
    return {"email": user.email}


@router.post("/{employee_id}/upload-photo")
def upload_employee_photo(
    employee_id: int,
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    from app.models.employee import Employee
    emp = employee_service.get_employee(db, employee_id)
    if not current_user.is_superuser and emp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "employees")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    photo_url = f"/uploads/employees/{filename}"
    db_emp = db.query(Employee).filter(Employee.id == employee_id).first()
    old_url = db_emp.profile_image_url
    if old_url:
        old_path = os.path.join(settings.UPLOAD_DIR, "employees", os.path.basename(old_url))
        if os.path.exists(old_path):
            os.remove(old_path)
    db_emp.profile_image_url = photo_url
    db.commit()
    return {"profile_image_url": photo_url}


@router.post("/{employee_id}/bonuses", response_model=BonusRead)
def give_bonus(employee_id: int, payload: BonusCreate, db: DbSession, current_user: CurrentUser):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super admin only")
    return employee_service.create_bonus(db, employee_id, payload.amount, payload.reason, current_user.id)


@router.get("/{employee_id}/bonuses", response_model=List[BonusRead])
def get_bonuses(employee_id: int, db: DbSession, current_user: CurrentUser):
    emp = employee_service.get_employee(db, employee_id)
    if not current_user.is_superuser and emp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return employee_service.list_bonuses(db, employee_id)


@router.post("/{employee_id}/reset-password")
def reset_employee_password(employee_id: int, db: DbSession, current_user: CurrentUser):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super admin only")
    emp = employee_service.get_employee(db, employee_id)
    if not emp.user_id:
        raise HTTPException(status_code=404, detail="Employee has no linked user account")
    from app.models.user import User
    from app.core.security import hash_password
    user = db.query(User).filter(User.id == emp.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
    alphabet = string.ascii_letters + string.digits
    new_password = "".join(secrets.choice(alphabet) for _ in range(12))
    user.password_hash = hash_password(new_password)
    db.commit()
    return {"new_password": new_password, "email": user.email}


@router.get("/{employee_id}/kpis")
def get_employee_kpis(employee_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.task import Task
    from sqlalchemy import func
    from datetime import date
    emp = employee_service.get_employee(db, employee_id)
    if not emp.user_id:
        return {"tasks_done": 0, "overdue_rate": 0, "avg_hours": None}
    now = date.today()
    total_done = db.query(func.count(Task.id)).filter(
        Task.assigned_to == emp.user_id, Task.status == "done", Task.deleted_at.is_(None),
    ).scalar() or 0
    total_tasks = db.query(func.count(Task.id)).filter(
        Task.assigned_to == emp.user_id, Task.deleted_at.is_(None),
    ).scalar() or 0
    overdue = db.query(func.count(Task.id)).filter(
        Task.assigned_to == emp.user_id, Task.deleted_at.is_(None),
        Task.due_date < now, Task.status.notin_(["done", "cancelled"]),
    ).scalar() or 0
    avg_hours = db.query(func.avg(Task.actual_hours)).filter(
        Task.assigned_to == emp.user_id, Task.status == "done", Task.deleted_at.is_(None), Task.actual_hours.isnot(None),
    ).scalar()
    from app.models.employee import EmployeeEvaluation
    avg_score = db.query(func.avg(EmployeeEvaluation.score)).filter(
        EmployeeEvaluation.employee_id == employee_id,
    ).scalar()
    return {
        "tasks_done": total_done,
        "total_tasks": total_tasks,
        "overdue_count": overdue,
        "overdue_rate": round(overdue / total_tasks, 4) if total_tasks else 0,
        "avg_completion_rate": round(total_done / total_tasks, 4) if total_tasks else 0,
        "avg_actual_hours": round(float(avg_hours), 2) if avg_hours else None,
        "avg_score": round(float(avg_score), 2) if avg_score else None,
    }


@router.post("/{employee_id}/evaluations", response_model=EmployeeEvaluationRead)
def create_evaluation(employee_id: int, payload: EmployeeEvaluationCreate, db: DbSession, current_user: CurrentUser):
    from app.models.employee import EmployeeEvaluation
    ev = EmployeeEvaluation(employee_id=employee_id, evaluated_by=current_user.id, **payload.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.get("/{employee_id}/evaluations", response_model=List[EmployeeEvaluationRead])
def list_evaluations(employee_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.employee import EmployeeEvaluation
    return db.query(EmployeeEvaluation).filter(EmployeeEvaluation.employee_id == employee_id).order_by(EmployeeEvaluation.created_at.desc()).all()


@router.get("/{employee_id}/work-sessions", response_model=List[WorkSessionRead])
def list_work_sessions(employee_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.employee import WorkSession
    emp = employee_service.get_employee(db, employee_id)
    if not current_user.is_superuser and emp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return db.query(WorkSession).filter(WorkSession.employee_id == employee_id).order_by(WorkSession.date.desc()).limit(90).all()


@router.post("/{employee_id}/work-sessions", response_model=WorkSessionRead)
def create_work_session(employee_id: int, payload: WorkSessionCreate, db: DbSession, current_user: CurrentUser):
    from app.models.employee import WorkSession
    from datetime import datetime as dt, timezone
    emp = employee_service.get_employee(db, employee_id)
    if not current_user.is_superuser and emp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    if payload.total_hours < 0 or payload.total_hours > 24:
        raise HTTPException(status_code=422, detail="total_hours must be between 0 and 24")
    clock_in_dt = dt.combine(payload.date, dt.min.time()).replace(tzinfo=timezone.utc)
    from datetime import timedelta
    clock_out_dt = clock_in_dt + timedelta(hours=payload.total_hours)
    session = WorkSession(
        employee_id=employee_id,
        date=payload.date,
        clock_in=clock_in_dt,
        clock_out=clock_out_dt,
        total_hours=round(payload.total_hours, 2),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{employee_id}/leave-requests", response_model=LeaveRequestRead)
def create_leave_request(employee_id: int, payload: LeaveRequestCreate, db: DbSession, current_user: CurrentUser):
    from app.models.employee import LeaveRequest, Employee
    from app.models.notification import Notification
    from app.models.user import User
    emp = employee_service.get_employee(db, employee_id)
    if not current_user.is_superuser and emp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    req = LeaveRequest(employee_id=employee_id, **payload.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    superusers = db.query(User).filter(
        User.is_superuser == True,  # noqa: E712
        User.is_active == True,  # noqa: E712
        User.deleted_at == None,  # noqa: E711
    ).limit(3).all()
    for su in superusers:
        notif = Notification(
            user_id=su.id,
            title=f"Leave Request — {emp.full_name}",
            body=f"{emp.full_name} requested {payload.leave_type.replace('_', ' ')} leave from {payload.start_date} to {payload.end_date} ({payload.days_count} day(s)). Please review and approve or deny.",
            type="leave_request",
            entity_type="leave_request",
            entity_id=req.id,
        )
        db.add(notif)
    db.commit()
    return req


@router.get("/{employee_id}/leave-requests", response_model=List[LeaveRequestRead])
def list_leave_requests(employee_id: int, db: DbSession, current_user: CurrentUser):
    from app.models.employee import LeaveRequest
    emp = employee_service.get_employee(db, employee_id)
    if not current_user.is_superuser and emp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee_id).order_by(LeaveRequest.created_at.desc()).all()
