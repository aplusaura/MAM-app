from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.task import Task, TaskStatusHistory
from app.services.task_service import _generate_task_code


SEED_TASKS = [
    {
        "title": "Write scripts for Horizon RE — Week 1 Reels",
        "description": "Write 3 reel scripts for Horizon Real Estate Q1 campaign week 1.",
        "project": "Horizon RE — Q1 Social Media Campaign",
        "priority": "high",
        "status": "done",
        "start_date": date(2025, 1, 6),
        "due_date": date(2025, 1, 10),
        "assigned_to": "lina@agency.com",
        "estimated_hours": 4.0,
        "actual_hours": 3.5,
    },
    {
        "title": "Shoot product reels — Bloom Beauty March",
        "description": "Photograph and shoot reels for Bloom Beauty March content plan.",
        "project": "Bloom Beauty — March Content Plan",
        "priority": "high",
        "status": "in_progress",
        "start_date": date(2025, 3, 5),
        "due_date": date(2025, 3, 15),
        "assigned_to": "khalid@agency.com",
        "estimated_hours": 8.0,
    },
    {
        "title": "Edit reel — Bloom Beauty March R1",
        "description": "Edit the first reel for Bloom Beauty March content, include captions and music.",
        "project": "Bloom Beauty — March Content Plan",
        "priority": "high",
        "status": "review",
        "start_date": date(2025, 3, 10),
        "due_date": date(2025, 3, 17),
        "assigned_to": "khalid@agency.com",
        "estimated_hours": 5.0,
    },
    {
        "title": "Create NovaTech brand video storyboard",
        "description": "Design and present a storyboard for NovaTech corporate brand video.",
        "project": "NovaTech — Corporate Brand Video",
        "priority": "medium",
        "status": "todo",
        "start_date": date(2025, 3, 15),
        "due_date": date(2025, 3, 25),
        "assigned_to": "ahmed@agency.com",
        "estimated_hours": 6.0,
    },
    {
        "title": "Write March caption copy — Bloom Beauty",
        "description": "Write all captions for Bloom Beauty's March Instagram and TikTok posts.",
        "project": "Bloom Beauty — March Content Plan",
        "priority": "high",
        "status": "in_progress",
        "start_date": date(2025, 3, 1),
        "due_date": date(2025, 3, 12),
        "assigned_to": "lina@agency.com",
        "estimated_hours": 3.0,
    },
    {
        "title": "Schedule Horizon RE — Week 2 posts",
        "description": "Schedule approved posts for Week 2 across Instagram and TikTok.",
        "project": "Horizon RE — Q1 Social Media Campaign",
        "priority": "medium",
        "status": "waiting_approval",
        "start_date": date(2025, 1, 13),
        "due_date": date(2025, 1, 15),
        "assigned_to": "sara@agency.com",
        "estimated_hours": 2.0,
    },
    {
        "title": "Design graphics — Horizon RE Q1 Feed",
        "description": "Design on-brand graphics for Horizon RE Q1 Instagram feed.",
        "project": "Horizon RE — Q1 Social Media Campaign",
        "priority": "high",
        "status": "done",
        "start_date": date(2025, 1, 3),
        "due_date": date(2025, 1, 8),
        "assigned_to": "ahmed@agency.com",
        "estimated_hours": 6.0,
        "actual_hours": 7.0,
    },
    {
        "title": "NovaTech — Kickoff meeting preparation",
        "description": "Prepare the project kickoff deck and meeting agenda for NovaTech.",
        "project": "NovaTech — Corporate Brand Video",
        "priority": "medium",
        "status": "done",
        "start_date": date(2025, 2, 14),
        "due_date": date(2025, 2, 15),
        "assigned_to": "ahmed@agency.com",
        "estimated_hours": 2.0,
        "actual_hours": 1.5,
    },
]


def seed_tasks(db: Session, project_map: dict, user_map: dict) -> None:
    admin_user = user_map.get("admin@agency.com") or list(user_map.values())[0]
    count = 0

    for data in SEED_TASKS:
        existing = db.query(Task).filter(Task.title == data["title"]).first()
        if existing:
            continue

        project_name = data.pop("project", None)
        project = project_map.get(project_name)
        assigned_email = data.pop("assigned_to", None)
        assigned_user = user_map.get(assigned_email) if assigned_email else None

        task = Task(
            **data,
            project_id=project.id if project else None,
            client_id=project.client_id if project else None,
            assigned_to=assigned_user.id if assigned_user else None,
            assigned_by=admin_user.id,
        )
        task.task_code = _generate_task_code(db, task.task_type if hasattr(task, 'task_type') else None)
        db.add(task)
        db.flush()

        db.add(TaskStatusHistory(
            task_id=task.id,
            changed_by=admin_user.id,
            from_status=None,
            to_status=data["status"],
            changed_at=datetime.now(timezone.utc),
        ))
        count += 1

    db.commit()
    print(f"  Tasks: {count} created")
