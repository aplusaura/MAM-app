from sqlalchemy.orm import Session
from app.models.department import Department

DEPARTMENTS = [
    {"name": "Management", "description": "Executive and management team"},
    {"name": "Account Management", "description": "Client relations and account handling"},
    {"name": "Project Management", "description": "Project planning and operations"},
    {"name": "Content & Copywriting", "description": "Script writing and content creation"},
    {"name": "Video Production", "description": "Shooting, editing, and post-production"},
    {"name": "Design", "description": "Graphic design and visual assets"},
    {"name": "Social Media", "description": "Social media management and publishing"},
    {"name": "Sales & Business Development", "description": "Lead generation and business growth"},
    {"name": "Finance", "description": "Invoicing, payments, and financial reporting"},
]


def seed_departments(db: Session) -> dict:
    created = {}
    for dept_data in DEPARTMENTS:
        existing = db.query(Department).filter(Department.name == dept_data["name"]).first()
        if not existing:
            dept = Department(**dept_data)
            db.add(dept)
            db.flush()
            created[dept_data["name"]] = dept
        else:
            created[dept_data["name"]] = existing
    db.commit()
    print(f"  Departments: {len(created)} ready")
    return created
