"""
Auto-assign tasks to employees based on task_type and current workload.
Uses 8hr/day capacity planning based on estimated_hours of open tasks.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.task import Task

TASK_TYPE_DEPT = {
    "content_writing": 4,   # Content & Copywriting
    "video_editing": 5,      # Video Production
    "shooting": 5,           # Video Production
    "design": 6,             # Design
    "social_media": 7,       # Social Media
}

DAILY_CAPACITY_HOURS = 8.0


def find_best_employee(db: Session, task_type: str) -> int | None:
    """
    Return the user_id of the least-loaded available employee in the matching dept.
    Uses estimated_hours (capacity planning) instead of raw task count.
    Falls back to any available employee if no dept match.
    """
    dept_id = TASK_TYPE_DEPT.get(task_type)

    q = (
        db.query(Employee)
        .filter(
            Employee.deleted_at.is_(None),
            Employee.status == "active",
            Employee.availability_status.in_(["available", "busy"]),
            Employee.user_id.isnot(None),
        )
    )
    if dept_id:
        q = q.filter(Employee.department_id == dept_id)

    employees = q.all()
    if not employees:
        return None

    def assigned_hours(emp: Employee) -> float:
        total = db.query(func.sum(Task.estimated_hours)).filter(
            Task.assigned_to == emp.user_id,
            Task.deleted_at.is_(None),
            Task.status.notin_(["done", "cancelled"]),
            Task.estimated_hours.isnot(None),
        ).scalar()
        return float(total or 0)

    # Sort by current assigned hours (least first) for capacity-based assignment
    loads = [(emp, assigned_hours(emp)) for emp in employees]
    loads.sort(key=lambda x: x[1])

    # Return employee with least assigned hours
    return loads[0][0].user_id
