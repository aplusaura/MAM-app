from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends

from app.api.deps import DbSession, CurrentUser, require_permission, get_current_user
from app.core.permissions import Permissions
from app.models.notification import ActivityLog
from app.models.user import User
from app.schemas.user import UserRead, UserCreate, UserUpdate, UserPermissionCreate, UserPermissionRead
from app.services import user_service

router = APIRouter()


@router.get("/", response_model=List[UserRead], dependencies=[Depends(require_permission(Permissions.VIEW_USERS))])
def list_users(db: DbSession, skip: int = 0, limit: int = 100):
    return user_service.list_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(require_permission(Permissions.VIEW_USERS))])
def get_user(user_id: int, db: DbSession):
    return user_service.get_user(db, user_id)


@router.post("/", response_model=UserRead, dependencies=[Depends(require_permission(Permissions.CREATE_USER))])
def create_user(payload: UserCreate, db: DbSession):
    return user_service.create_user(db, payload)


@router.patch("/{user_id}", response_model=UserRead, dependencies=[Depends(require_permission(Permissions.EDIT_USER))])
def update_user(user_id: int, payload: UserUpdate, db: DbSession):
    return user_service.update_user(db, user_id, payload)


@router.delete("/{user_id}", dependencies=[Depends(require_permission(Permissions.DELETE_USER))])
def delete_user(user_id: int, db: DbSession):
    user_service.delete_user(db, user_id)
    return {"message": "User deleted"}


@router.get("/{user_id}/permissions", response_model=List[UserPermissionRead], dependencies=[Depends(require_permission(Permissions.MANAGE_PERMISSIONS))])
def get_user_permissions(user_id: int, db: DbSession):
    return user_service.list_user_permissions(db, user_id)


@router.post("/{user_id}/permissions", response_model=UserPermissionRead)
def set_user_permission(
    user_id: int,
    payload: UserPermissionCreate,
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    require_permission(Permissions.MANAGE_PERMISSIONS)(current_user=current_user, db=db)
    result = user_service.set_user_permission(db, user_id, payload)
    log = ActivityLog(
        user_id=current_user.id,
        action="permission_change",
        entity_type="user",
        entity_id=user_id,
        details=f"Permission ID {payload.permission_id} set to granted={payload.granted} for user {user_id}",
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    return result


@router.delete("/{user_id}/permissions/{permission_id}")
def remove_user_permission(
    user_id: int,
    permission_id: int,
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    require_permission(Permissions.MANAGE_PERMISSIONS)(current_user=current_user, db=db)
    user_service.remove_user_permission(db, user_id, permission_id)
    log = ActivityLog(
        user_id=current_user.id,
        action="permission_change",
        entity_type="user",
        entity_id=user_id,
        details=f"Permission ID {permission_id} removed for user {user_id}",
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    return {"message": "Permission override removed"}
