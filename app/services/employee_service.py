import secrets
import string
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.user import User
from app.core.security import hash_password
from app.core.exceptions import NotFoundError, ConflictError
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


def list_employees(
    db: Session, skip: int = 0, limit: int = 100,
    status: Optional[str] = None, department_id: Optional[int] = None,
):
    q = (
        db.query(Employee)
        .options(joinedload(Employee.department), joinedload(Employee.role))
        .filter(Employee.deleted_at.is_(None))
    )
    if status:
        q = q.filter(Employee.status == status)
    if department_id:
        q = q.filter(Employee.department_id == department_id)
    return q.offset(skip).limit(limit).all()


def get_employee(db: Session, employee_id: int) -> Employee:
    emp = (
        db.query(Employee)
        .options(joinedload(Employee.department), joinedload(Employee.role))
        .filter(Employee.id == employee_id, Employee.deleted_at.is_(None))
        .first()
    )
    if not emp:
        raise NotFoundError("Employee not found")
    return emp


def create_employee(db: Session, payload: EmployeeCreate) -> Employee:
    user_id = payload.user_id

    # Auto-generate credentials if no user_id given
    generated_email = None
    generated_password = None
    if not user_id:
        # Auto-generate email from full_name
        if payload.email:
            email = payload.email.lower()
        else:
            import re
            import unicodedata
            normalized = unicodedata.normalize("NFKD", payload.full_name)
            ascii_name = normalized.encode("ascii", "ignore").decode("ascii").lower()
            name_parts = ascii_name.split()
            name_parts = [re.sub(r"[^a-z0-9]", "", p) for p in name_parts if re.sub(r"[^a-z0-9]", "", p)]
            if not name_parts:
                name_parts = ["employee"]
            base = (name_parts[0] + ("." + name_parts[-1] if len(name_parts) > 1 else "")) + "@agency.com"
            # Ensure uniqueness
            email = base
            counter = 1
            while db.query(User).filter(User.email == email).first():
                email = base.replace("@agency.com", f"{counter}@agency.com")
                counter += 1
            generated_email = email

        # Auto-generate password if not provided
        if payload.password:
            password = payload.password
        else:
            chars = string.ascii_letters + string.digits
            password = secrets.choice(string.ascii_uppercase) + secrets.choice(string.digits) + "".join(secrets.choice(chars) for _ in range(6))
            generated_password = password

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ConflictError("Email already registered")
        user = User(
            email=email,
            password_hash=hash_password(password),
            is_active=True,
        )
        db.add(user)
        db.flush()
        user_id = user.id

    emp = Employee(
        user_id=user_id,
        full_name=payload.full_name,
        phone=payload.phone,
        job_title=payload.job_title,
        department_id=payload.department_id,
        role_id=payload.role_id,
        manager_id=payload.manager_id,
        employment_type=payload.employment_type,
        salary=payload.salary,
        join_date=payload.join_date,
        skills=payload.skills,
        status=payload.status,
        availability_status=payload.availability_status,
        profile_image_url=payload.profile_image_url,
        notes=payload.notes,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp, generated_email, generated_password


def update_employee(db: Session, employee_id: int, payload: EmployeeUpdate) -> Employee:
    emp = get_employee(db, employee_id)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(emp, key, value)
    db.commit()
    db.refresh(emp)
    return emp


def delete_employee(db: Session, employee_id: int) -> None:
    from fastapi import HTTPException
    emp = get_employee(db, employee_id)
    if emp.user_id:
        linked_user = db.query(User).filter(User.id == emp.user_id).first()
        if linked_user and linked_user.is_superuser:
            raise HTTPException(status_code=403, detail="Super Admin account cannot be deleted")
    emp.deleted_at = datetime.now(timezone.utc)
    db.commit()


def create_bonus(db: Session, employee_id: int, amount: float, reason: Optional[str], given_by_user_id: int):
    from app.models.employee import EmployeeBonus
    from app.models.notification import Notification
    emp = get_employee(db, employee_id)
    bonus = EmployeeBonus(
        employee_id=employee_id,
        given_by_user_id=given_by_user_id,
        amount=amount,
        reason=reason,
    )
    db.add(bonus)
    # Send notification to employee if they have a user account
    if emp.user_id:
        reason_text = f" — {reason}" if reason else ""
        notif = Notification(
            user_id=emp.user_id,
            title="You received a bonus!",
            body=f"${amount:,.2f} bonus added to your salary this month{reason_text}.",
            type="bonus",
            entity_type="employee",
            entity_id=employee_id,
        )
        db.add(notif)
    db.commit()
    db.refresh(bonus)
    return bonus


def list_bonuses(db: Session, employee_id: int):
    from app.models.employee import EmployeeBonus
    get_employee(db, employee_id)
    return db.query(EmployeeBonus).filter(EmployeeBonus.employee_id == employee_id).order_by(EmployeeBonus.created_at.desc()).all()
