from sqlalchemy.orm import Session
from app.models.role import Role, Permission, RolePermission
from app.core.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS

ROLES = [
    {"name": "Super Admin", "slug": "super_admin", "description": "Full system access"},
    {"name": "Admin / Partner", "slug": "admin", "description": "Administrative access"},
    {"name": "CEO", "slug": "ceo", "description": "Chief Executive Officer — full access"},
    {"name": "Account Manager", "slug": "account_manager", "description": "Manages client accounts"},
    {"name": "Team Leader", "slug": "team_leader", "description": "Leads a department team"},
    {"name": "Project Manager", "slug": "project_manager", "description": "Manages projects and tasks"},
    {"name": "Content Creator", "slug": "content_creator", "description": "Script writing and content creation"},
    {"name": "Video Editor", "slug": "video_editor", "description": "Video editing and post-production"},
    {"name": "Graphic Designer", "slug": "graphic_designer", "description": "Visual design and assets"},
    {"name": "Reel Maker", "slug": "reel_maker", "description": "Short-form social video production"},
    {"name": "Videographer", "slug": "videographer", "description": "Video shooting and raw footage"},
    {"name": "Social Media Executive", "slug": "social_media", "description": "Social media management"},
    {"name": "Moderator", "slug": "moderator", "description": "Community management and moderation"},
    {"name": "Media Buyer", "slug": "media_buyer", "description": "Paid advertising and campaign management"},
    {"name": "Marketing Specialist", "slug": "marketing_specialist", "description": "Marketing strategy and campaigns"},
    {"name": "Photographer / Videographer", "slug": "photographer", "description": "Photography and video shooting"},
    {"name": "Sales / Business Development", "slug": "sales", "description": "Lead generation and sales"},
    {"name": "Finance", "slug": "finance", "description": "Financial management"},
]


def seed_roles_and_permissions(db: Session) -> dict:
    # Seed permissions
    perm_map = {}
    for module, slug, description in ALL_PERMISSIONS:
        existing = db.query(Permission).filter(Permission.slug == slug).first()
        if not existing:
            perm = Permission(
                name=slug.replace("_", " ").title(),
                slug=slug,
                module=module,
                description=description,
            )
            db.add(perm)
            db.flush()
            perm_map[slug] = perm
        else:
            perm_map[slug] = existing

    # Seed roles
    role_map = {}
    for role_data in ROLES:
        existing = db.query(Role).filter(Role.slug == role_data["slug"]).first()
        if not existing:
            role = Role(**role_data)
            db.add(role)
            db.flush()
            role_map[role_data["slug"]] = role
        else:
            role_map[role_data["slug"]] = existing

    # Assign permissions to roles
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

    db.commit()
    print(f"  Permissions: {len(perm_map)} ready")
    print(f"  Roles: {len(role_map)} ready")
    return role_map
