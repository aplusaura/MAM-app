from sqlalchemy.orm import Session
from app.models.department import Department
from app.core.exceptions import NotFoundError, ConflictError
from app.schemas.department import DepartmentCreate, DepartmentUpdate


def list_departments(db: Session):
    return db.query(Department).all()


def create_department(db: Session, payload: DepartmentCreate) -> Department:
    existing = db.query(Department).filter(Department.name == payload.name).first()
    if existing:
        raise ConflictError("Department name already exists")
    dept = Department(name=payload.name, description=payload.description)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def update_department(db: Session, dept_id: int, payload: DepartmentUpdate) -> Department:
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise NotFoundError("Department not found")
    if payload.name is not None:
        dept.name = payload.name
    if payload.description is not None:
        dept.description = payload.description
    db.commit()
    db.refresh(dept)
    return dept


def delete_department(db: Session, dept_id: int) -> None:
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise NotFoundError("Department not found")
    db.delete(dept)
    db.commit()
