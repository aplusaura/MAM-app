from typing import Optional
from sqlalchemy.orm import Session
from app.models.role import Role, Permission, RolePermission
from app.core.exceptions import NotFoundError, ConflictError
from app.schemas.role import RoleCreate, RoleUpdate


def list_roles(db: Session):
    return db.query(Role).all()


def get_role_with_permissions(db: Session, role_id: int):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise NotFoundError("Role not found")
    permissions = (
        db.query(Permission)
        .join(RolePermission, Permission.id == RolePermission.permission_id)
        .filter(RolePermission.role_id == role_id)
        .all()
    )
    role.__dict__["permissions"] = permissions
    return role


def create_role(db: Session, payload: RoleCreate) -> Role:
    existing = db.query(Role).filter(Role.slug == payload.slug).first()
    if existing:
        raise ConflictError("Role slug already exists")

    role = Role(name=payload.name, slug=payload.slug, description=payload.description)
    db.add(role)
    db.flush()

    for perm_id in payload.permission_ids:
        db.add(RolePermission(role_id=role.id, permission_id=perm_id))

    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role_id: int, payload: RoleUpdate) -> Role:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise NotFoundError("Role not found")

    if payload.name is not None:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description

    if payload.permission_ids is not None:
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        for perm_id in payload.permission_ids:
            db.add(RolePermission(role_id=role_id, permission_id=perm_id))

    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role_id: int) -> None:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise NotFoundError("Role not found")
    db.delete(role)
    db.commit()


def list_permissions(db: Session, module: Optional[str] = None):
    q = db.query(Permission)
    if module:
        q = q.filter(Permission.module == module)
    return q.all()
