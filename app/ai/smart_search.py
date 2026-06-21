"""
AI Feature 4: Smart Search
Performs keyword search across clients, projects, tasks, content items, and leads.
Searches names, titles, descriptions, and notes fields.
Can be extended with vector embeddings for semantic search.
"""
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.project import Project
from app.models.task import Task
from app.models.lead import Lead
from app.models.content import ContentItem


def search(db: Session, query: str) -> dict:
    q = f"%{query.lower()}%"

    # Clients
    clients = (
        db.query(Client)
        .filter(
            Client.deleted_at.is_(None),
            or_(
                func.lower(Client.company_name).like(q),
                func.lower(Client.contact_person).like(q),
                func.lower(Client.notes).like(q),
                func.lower(Client.industry).like(q),
            ),
        )
        .limit(10)
        .all()
    )

    # Projects
    projects = (
        db.query(Project)
        .filter(
            Project.deleted_at.is_(None),
            or_(
                func.lower(Project.name).like(q),
                func.lower(Project.description).like(q),
                func.lower(Project.project_type).like(q),
            ),
        )
        .limit(10)
        .all()
    )

    # Tasks
    tasks = (
        db.query(Task)
        .filter(
            Task.deleted_at.is_(None),
            or_(
                func.lower(Task.title).like(q),
                func.lower(Task.description).like(q),
            ),
        )
        .limit(10)
        .all()
    )

    # Leads
    leads = (
        db.query(Lead)
        .filter(
            Lead.deleted_at.is_(None),
            or_(
                func.lower(Lead.lead_name).like(q),
                func.lower(Lead.company_name).like(q),
                func.lower(Lead.notes).like(q),
                func.lower(Lead.interested_service).like(q),
            ),
        )
        .limit(10)
        .all()
    )

    # Content items
    content = (
        db.query(ContentItem)
        .filter(
            ContentItem.deleted_at.is_(None),
            or_(
                func.lower(ContentItem.title).like(q),
                func.lower(ContentItem.hook).like(q),
                func.lower(ContentItem.caption).like(q),
                func.lower(ContentItem.script_text).like(q),
            ),
        )
        .limit(10)
        .all()
    )

    return {
        "query": query,
        "results": {
            "clients": [
                {"id": c.id, "type": "client", "title": c.company_name, "subtitle": c.contact_person}
                for c in clients
            ],
            "projects": [
                {"id": p.id, "type": "project", "title": p.name, "subtitle": p.status}
                for p in projects
            ],
            "tasks": [
                {"id": t.id, "type": "task", "title": t.title, "subtitle": t.status}
                for t in tasks
            ],
            "leads": [
                {"id": l.id, "type": "lead", "title": l.lead_name, "subtitle": l.stage}
                for l in leads
            ],
            "content": [
                {"id": ci.id, "type": "content", "title": ci.title, "subtitle": ci.platform}
                for ci in content
            ],
        },
        "total_results": len(clients) + len(projects) + len(tasks) + len(leads) + len(content),
    }
