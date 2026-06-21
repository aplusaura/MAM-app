from datetime import date
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.employee import Employee
from app.core.security import hash_password


SEED_USERS = [
    {
        "email": "admin@agency.com",
        "password": "Admin1234!",
        "is_superuser": True,
        "employee": {
            "full_name": "System Admin",
            "job_title": "Super Admin",
            "department": "Management",
            "role": "super_admin",
            "employment_type": "full_time",
            "join_date": date(2024, 1, 1),
            "status": "active",
            "availability_status": "available",
        },
    },
    {
        "email": "omar@agency.com",
        "password": "Password123!",
        "is_superuser": False,
        "employee": {
            "full_name": "Omar Al-Rashid",
            "job_title": "Managing Partner",
            "department": "Management",
            "role": "admin",
            "employment_type": "full_time",
            "join_date": date(2023, 3, 1),
            "status": "active",
            "availability_status": "available",
            "phone": "+971501234567",
        },
    },
    {
        "email": "sara@agency.com",
        "password": "Password123!",
        "is_superuser": False,
        "employee": {
            "full_name": "Sara Khalil",
            "job_title": "Account Manager",
            "department": "Account Management",
            "role": "account_manager",
            "employment_type": "full_time",
            "join_date": date(2023, 6, 1),
            "status": "active",
            "availability_status": "available",
            "phone": "+971502345678",
        },
    },
    {
        "email": "ahmed@agency.com",
        "password": "Password123!",
        "is_superuser": False,
        "employee": {
            "full_name": "Ahmed Hassan",
            "job_title": "Project Manager",
            "department": "Project Management",
            "role": "project_manager",
            "employment_type": "full_time",
            "join_date": date(2023, 9, 1),
            "status": "active",
            "availability_status": "available",
            "phone": "+971503456789",
            "skills": ["project management", "client communication", "budgeting"],
        },
    },
    {
        "email": "lina@agency.com",
        "password": "Password123!",
        "is_superuser": False,
        "employee": {
            "full_name": "Lina Nasser",
            "job_title": "Content Creator",
            "department": "Content & Copywriting",
            "role": "content_creator",
            "employment_type": "full_time",
            "join_date": date(2024, 1, 15),
            "status": "active",
            "availability_status": "available",
            "skills": ["script writing", "copywriting", "content strategy"],
        },
    },
    {
        "email": "khalid@agency.com",
        "password": "Password123!",
        "is_superuser": False,
        "employee": {
            "full_name": "Khalid Mansour",
            "job_title": "Video Editor",
            "department": "Video Production",
            "role": "video_editor",
            "employment_type": "full_time",
            "join_date": date(2024, 2, 1),
            "status": "active",
            "availability_status": "busy",
            "skills": ["premiere pro", "after effects", "color grading"],
        },
    },
]


def seed_users_employees(db: Session, role_map: dict, dept_map: dict) -> dict:
    user_map = {}

    for data in SEED_USERS:
        existing = db.query(User).filter(User.email == data["email"]).first()
        if existing:
            user_map[data["email"]] = existing
            continue

        user = User(
            email=data["email"],
            password_hash=hash_password(data["password"]),
            is_active=True,
            is_superuser=data["is_superuser"],
        )
        db.add(user)
        db.flush()

        emp_data = data["employee"]
        role = role_map.get(emp_data["role"])
        dept = dept_map.get(emp_data["department"])

        emp = Employee(
            user_id=user.id,
            full_name=emp_data["full_name"],
            job_title=emp_data["job_title"],
            department_id=dept.id if dept else None,
            role_id=role.id if role else None,
            employment_type=emp_data.get("employment_type", "full_time"),
            join_date=emp_data.get("join_date"),
            status=emp_data.get("status", "active"),
            availability_status=emp_data.get("availability_status", "available"),
            phone=emp_data.get("phone"),
            skills=emp_data.get("skills"),
        )
        db.add(emp)
        user_map[data["email"]] = user

    db.commit()
    print(f"  Users & Employees: {len(user_map)} ready")
    return user_map
