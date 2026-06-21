from sqlalchemy.orm import Session
from app.models.user import User, UserPermission
from app.core.security import hash_password
from app.core.exceptions import NotFoundError, ConflictError
from app.schemas.user import UserCreate, UserUpdate, UserPermissionCreate


def list_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).filter(User.deleted_at.is_(None)).offset(skip).limit(limit).all()


def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise NotFoundError("User not found")
    return user


def create_user(db: Session, payload: UserCreate) -> User:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise ConflictError("Email already registered")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
        is_superuser=payload.is_superuser,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
    user = get_user(db, user_id)
    if payload.email is not None:
        user.email = payload.email.lower()
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    from datetime import datetime, timezone
    from fastapi import HTTPException
    user = get_user(db, user_id)
    if user.is_superuser:
        raise HTTPException(status_code=403, detail="Super Admin account cannot be deleted")
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()


def set_user_permission(db: Session, user_id: int, payload: UserPermissionCreate) -> UserPermission:
    # Upsert: remove existing override for this permission then re-add
    existing = db.query(UserPermission).filter(
        UserPermission.user_id == user_id,
        UserPermission.permission_id == payload.permission_id,
    ).first()
    if existing:
        existing.granted = payload.granted
        db.commit()
        db.refresh(existing)
        return existing

    override = UserPermission(
        user_id=user_id,
        permission_id=payload.permission_id,
        granted=payload.granted,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return override


def list_user_permissions(db: Session, user_id: int) -> list[UserPermission]:
    return db.query(UserPermission).filter(UserPermission.user_id == user_id).all()


def remove_user_permission(db: Session, user_id: int, permission_id: int) -> None:
    override = db.query(UserPermission).filter(
        UserPermission.user_id == user_id,
        UserPermission.permission_id == permission_id,
    ).first()
    if override:
        db.delete(override)
        db.commit()
