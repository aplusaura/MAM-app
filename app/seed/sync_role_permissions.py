"""
Sync role permissions — run with: python -m app.seed.sync_role_permissions
Safe to re-run: only adds missing role-permission links, never removes.
Use this when ROLE_PERMISSIONS is updated to add new roles or permissions.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.role import Role, Permission, RolePermission
from app.core.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS, ROLES as ROLES_DEFS
from app.seed.roles_permissions import ROLES


def run():
    db = SessionLocal()
    try:
        # Ensure all permissions exist
        perm_map = {}
        for module, slug, description in ALL_PERMISSIONS:
            existing = db.query(Permission).filter(Permission.slug == slug).first()
            if not existing:
                from app.models.role import Permission as Perm
                p = Perm(name=slug.replace("_", " ").title(), slug=slug, module=module, description=description)
                db.add(p)
                db.flush()
                perm_map[slug] = p
            else:
                perm_map[slug] = existing

        # Ensure all roles exist
        role_map = {}
        for role_data in ROLES:
            existing = db.query(Role).filter(Role.slug == role_data["slug"]).first()
            if not existing:
                r = Role(**role_data)
                db.add(r)
                db.flush()
                role_map[role_data["slug"]] = r
                print(f"  Created role: {role_data['slug']}")
            else:
                role_map[role_data["slug"]] = existing

        # Assign permissions to roles
        added = 0
        for role_slug, permission_slugs in ROLE_PERMISSIONS.items():
            role = role_map.get(role_slug)
            if not role:
                continue
            for perm_slug in permission_slugs:
                perm = perm_map.get(perm_slug)
                if not perm:
                    continue
                existing = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id,
                ).first()
                if not existing:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                    added += 1

        db.commit()
        print(f"Sync complete. Added {added} new role-permission links.")
    except Exception as e:
        db.rollback()
        print(f"Sync failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
