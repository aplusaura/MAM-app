from typing import List
from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_permission
from app.core.permissions import Permissions
from app.schemas.role import RoleRead, RoleCreate, RoleUpdate, RoleWithPermissions
from app.services import role_service

router = APIRouter()


@router.get("/", response_model=List[RoleRead])
def list_roles(db: DbSession):
    return role_service.list_roles(db)


@router.get("/{role_id}", response_model=RoleWithPermissions)
def get_role(role_id: int, db: DbSession):
    return role_service.get_role_with_permissions(db, role_id)


@router.post("/", response_model=RoleRead, dependencies=[Depends(require_permission(Permissions.MANAGE_ROLES))])
def create_role(payload: RoleCreate, db: DbSession):
    return role_service.create_role(db, payload)


@router.patch("/{role_id}", response_model=RoleRead, dependencies=[Depends(require_permission(Permissions.MANAGE_ROLES))])
def update_role(role_id: int, payload: RoleUpdate, db: DbSession):
    return role_service.update_role(db, role_id, payload)


@router.delete("/{role_id}", dependencies=[Depends(require_permission(Permissions.MANAGE_ROLES))])
def delete_role(role_id: int, db: DbSession):
    role_service.delete_role(db, role_id)
    return {"message": "Role deleted"}
