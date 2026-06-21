from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectMember, ProjectStatusHistory


SEED_PROJECTS = [
    {
        "name": "Horizon RE — Q1 Social Media Campaign",
        "client": "Horizon Real Estate",
        "project_type": "Social Media Campaign",
        "description": "Full Q1 social media content production for Instagram and TikTok.",
        "start_date": date(2025, 1, 1),
        "due_date": date(2025, 3, 31),
        "status": "in_progress",
        "priority": "high",
        "budget": 24000.00,
        "progress_percent": 65,
    },
    {
        "name": "Bloom Beauty — March Content Plan",
        "client": "Bloom Beauty",
        "project_type": "Monthly Content",
        "description": "Monthly content calendar, reels, stories, and copywriting for March.",
        "start_date": date(2025, 3, 1),
        "due_date": date(2025, 3, 31),
        "status": "in_progress",
        "priority": "high",
        "budget": 12000.00,
        "progress_percent": 40,
    },
    {
        "name": "NovaTech — Corporate Brand Video",
        "client": "NovaTech Solutions",
        "project_type": "Brand Video",
        "description": "2-minute corporate brand video for website and LinkedIn.",
        "start_date": date(2025, 2, 15),
        "due_date": date(2025, 4, 15),
        "status": "planning",
        "priority": "medium",
        "budget": 15000.00,
        "progress_percent": 10,
    },
]


def seed_projects(db: Session, client_map: dict, user_map: dict) -> dict:
    project_map = {}
    admin_user = user_map.get("admin@agency.com") or list(user_map.values())[0]
    pm_user = user_map.get("ahmed@agency.com") or admin_user

    for data in SEED_PROJECTS:
        existing = db.query(Project).filter(Project.name == data["name"]).first()
        if existing:
            project_map[data["name"]] = existing
            continue

        client_name = data.pop("client")
        client = client_map.get(client_name)

        project = Project(
            **data,
            client_id=client.id if client else None,
            created_by=admin_user.id,
        )
        db.add(project)
        db.flush()

        db.add(ProjectMember(project_id=project.id, user_id=admin_user.id, role_in_project="lead"))
        if pm_user.id != admin_user.id:
            db.add(ProjectMember(project_id=project.id, user_id=pm_user.id, role_in_project="member"))

        db.add(ProjectStatusHistory(
            project_id=project.id,
            changed_by=admin_user.id,
            from_status=None,
            to_status=data["status"],
            changed_at=datetime.now(timezone.utc),
        ))

        project_map[data["name"]] = project

    db.commit()
    print(f"  Projects: {len(project_map)} ready")
    return project_map
