from typing import List
from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_permission
from app.core.permissions import Permissions
from app.schemas.department import DepartmentRead, DepartmentCreate, DepartmentUpdate
from app.services import department_service

router = APIRouter()


@router.get("/", response_model=List[DepartmentRead])
def list_departments(db: DbSession):
    return department_service.list_departments(db)


@router.post("/", response_model=DepartmentRead, dependencies=[Depends(require_permission(Permissions.MANAGE_DEPARTMENTS))])
def create_department(payload: DepartmentCreate, db: DbSession):
    return department_service.create_department(db, payload)


@router.patch("/{dept_id}", response_model=DepartmentRead, dependencies=[Depends(require_permission(Permissions.MANAGE_DEPARTMENTS))])
def update_department(dept_id: int, payload: DepartmentUpdate, db: DbSession):
    return department_service.update_department(db, dept_id, payload)


@router.delete("/{dept_id}", dependencies=[Depends(require_permission(Permissions.MANAGE_DEPARTMENTS))])
def delete_department(dept_id: int, db: DbSession):
    department_service.delete_department(db, dept_id)
    return {"message": "Department deleted"}
