from typing import Annotated
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedError, ForbiddenError
from app.models.user import User, UserPermission
from app.models.role import RolePermission, Permission
from app.models.employee import Employee


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise UnauthorizedError("Invalid or expired token")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id), User.deleted_at.is_(None)).first()

    if not user:
        raise UnauthorizedError("User not found")
    if not user.is_active:
        raise UnauthorizedError("Inactive user")

    return user


def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise ForbiddenError("Superuser access required")
    return current_user


def _user_has_permission(user: User, permission_slug: str, db: Session) -> bool:
    override = (
        db.query(UserPermission)
        .join(Permission, UserPermission.permission_id == Permission.id)
        .filter(
            UserPermission.user_id == user.id,
            Permission.slug == permission_slug,
        )
        .first()
    )
    if override is not None:
        return override.granted

    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not employee or not employee.role_id:
        return False

    has_role_perm = (
        db.query(RolePermission)
        .join(Permission, RolePermission.permission_id == Permission.id)
        .filter(
            RolePermission.role_id == employee.role_id,
            Permission.slug == permission_slug,
        )
        .first()
    )
    return has_role_perm is not None


def get_all_user_permissions(user: User, db: Session) -> list[str]:
    """Batch-fetch all permission slugs for a user in 2 queries instead of N."""
    # 1. Get all user-level overrides
    overrides = (
        db.query(Permission.slug, UserPermission.granted)
        .join(Permission, UserPermission.permission_id == Permission.id)
        .filter(UserPermission.user_id == user.id)
        .all()
    )
    granted = {slug for slug, is_granted in overrides if is_granted}
    revoked = {slug for slug, is_granted in overrides if not is_granted}

    # 2. Get role permissions
    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    role_perms: set[str] = set()
    if employee and employee.role_id:
        role_perms = {
            slug for (slug,) in
            db.query(Permission.slug)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(RolePermission.role_id == employee.role_id)
            .all()
        }

    return list((role_perms | granted) - revoked)


def require_permission(permission_slug: str):
    """Dependency factory — requires a specific permission."""

    def checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if current_user.is_superuser:
            return current_user
        if not _user_has_permission(current_user, permission_slug, db):
            raise ForbiddenError(f"Permission required: {permission_slug}")
        return current_user

    return checker


# Typed aliases
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
