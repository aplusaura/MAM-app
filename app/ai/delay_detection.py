"""
AI Feature 3: Expected Delay Detection
Detects projects and tasks likely to be delayed based on:
- Too many open tasks
- Overdue dependencies
- Low progress vs remaining time
- Approaching deadlines
- Blocked/waiting status
"""
from datetime import date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from app.models.project import Project
from app.models.task import Task, TaskDependency


def detect(db: Session) -> dict:
    today = date.today()
    warning_window = today + timedelta(days=14)

    at_risk_projects = []
    projects = (
        db.query(Project)
        .filter(
            Project.status.notin_(["completed", "cancelled"]),
            Project.deleted_at.is_(None),
            Project.due_date.isnot(None),
        )
        .all()
    )

    for p in projects:
        risks = []

        if p.due_date <= today:
            risks.append("due_date_passed")
        elif p.due_date <= warning_window:
            days_left = (p.due_date - today).days
            # Progress should be at least proportional to time elapsed
            if p.start_date:
                total_days = (p.due_date - p.start_date).days
                elapsed = (today - p.start_date).days
                expected_progress = min(100, int(elapsed / max(total_days, 1) * 100))
                if p.progress_percent < expected_progress - 20:
                    risks.append("behind_schedule")
            if p.progress_percent < 50 and days_left <= 7:
                risks.append("critically_behind")
            risks.append("approaching_deadline")

        # Count blocked tasks in this project
        blocked = (
            db.query(Task)
            .filter(
                Task.project_id == p.id,
                Task.status.in_(["waiting_approval", "revisions_needed"]),
                Task.deleted_at.is_(None),
            )
            .count()
        )
        if blocked > 0:
            risks.append(f"has_{blocked}_blocked_tasks")

        # Count tasks with overdue dependencies
        overdue_deps = (
            db.query(TaskDependency)
            .join(Task, TaskDependency.depends_on_task_id == Task.id)
            .filter(
                Task.project_id == p.id,
                Task.due_date < today,
                Task.status.notin_(["done"]),
            )
            .count()
        )
        if overdue_deps > 0:
            risks.append(f"has_{overdue_deps}_overdue_dependencies")

        if risks:
            at_risk_projects.append({
                "project_id": p.id,
                "project_name": p.name,
                "due_date": str(p.due_date),
                "progress_percent": p.progress_percent,
                "status": p.status,
                "risk_factors": risks,
                "risk_level": "critical" if "due_date_passed" in risks or "critically_behind" in risks else "warning",
            })

    # Overdue tasks not yet done
    overdue_tasks = (
        db.query(Task)
        .filter(
            Task.due_date < today,
            Task.status.notin_(["done"]),
            Task.deleted_at.is_(None),
        )
        .limit(50)
        .all()
    )

    # Tasks with unresolved dependencies
    DependsOnTask = aliased(Task)

    blocked_tasks = (
        db.query(Task)
        .join(TaskDependency, TaskDependency.task_id == Task.id)
        .join(DependsOnTask, TaskDependency.depends_on_task_id == DependsOnTask.id)
        .filter(
            Task.status.notin_(["done"]),
            DependsOnTask.status.notin_(["done"]),
            Task.deleted_at.is_(None),
        )
        .all()
    )

    return {
        "generated_at": str(today),
        "at_risk_projects": sorted(at_risk_projects, key=lambda x: x["risk_level"], reverse=True),
        "overdue_tasks": [
            {
                "id": t.id,
                "title": t.title,
                "due_date": str(t.due_date),
                "assigned_to": t.assigned_to,
                "project_id": t.project_id,
                "days_overdue": (today - t.due_date).days,
            }
            for t in overdue_tasks
        ],
        "summary": {
            "projects_at_risk": len(at_risk_projects),
            "overdue_tasks_count": len(overdue_tasks),
        },
    }
