"""
AI Feature 2: Workload Distribution
Analyzes current task distribution across employees and suggests rebalancing.
Considers: open tasks count, due dates, availability status, department.
"""
from datetime import date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.employee import Employee


def analyze(db: Session) -> dict:
    today = date.today()
    urgent_threshold = today + timedelta(days=3)

    # Current open task count per user
    task_counts = (
        db.query(Task.assigned_to, func.count(Task.id).label("open_tasks"))
        .filter(Task.status.notin_(["done"]), Task.deleted_at.is_(None), Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
        .all()
    )
    task_map = {r.assigned_to: r.open_tasks for r in task_counts}

    # Urgent tasks (due within 3 days) unassigned or overloaded
    urgent_unassigned = (
        db.query(Task)
        .filter(
            Task.status.notin_(["done"]),
            Task.due_date <= urgent_threshold,
            Task.assigned_to.is_(None),
            Task.deleted_at.is_(None),
        )
        .all()
    )

    # Active employees and their availability
    employees = (
        db.query(Employee)
        .filter(Employee.status == "active", Employee.deleted_at.is_(None))
        .all()
    )

    employee_loads = []
    for emp in employees:
        open_count = task_map.get(emp.user_id, 0)
        load_level = (
            "overloaded" if open_count > 10
            else "busy" if open_count > 5
            else "available"
        )
        employee_loads.append({
            "employee_id": emp.id,
            "user_id": emp.user_id,
            "full_name": emp.full_name,
            "department_id": emp.department_id,
            "availability_status": emp.availability_status,
            "open_task_count": open_count,
            "load_level": load_level,
        })

    # Overloaded employees
    overloaded = [e for e in employee_loads if e["load_level"] == "overloaded"]
    # Available employees
    available = [e for e in employee_loads if e["load_level"] == "available" and e["availability_status"] == "available"]

    suggestions = []
    for task in urgent_unassigned:
        if available:
            suggestions.append({
                "task_id": task.id,
                "task_title": task.title,
                "due_date": str(task.due_date),
                "suggestion": f"Assign to {available[0]['full_name']} (lowest current load)",
                "suggested_user_id": available[0]["user_id"],
            })

    avg_load = sum(e["open_task_count"] for e in employee_loads) / max(len(employee_loads), 1)

    return {
        "summary": {
            "total_active_employees": len(employees),
            "average_open_tasks_per_employee": round(avg_load, 1),
            "overloaded_count": len(overloaded),
            "available_count": len(available),
        },
        "employee_loads": employee_loads,
        "overloaded_employees": overloaded,
        "urgent_unassigned_tasks": [
            {"id": t.id, "title": t.title, "due_date": str(t.due_date)}
            for t in urgent_unassigned
        ],
        "suggestions": suggestions,
    }
