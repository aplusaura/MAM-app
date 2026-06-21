"""
Seed runner — run with: python -m app.seed.seed_runner
Idempotent: safe to re-run, will skip existing records.
"""
import sys
import os

# Ensure the app root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.db.base import Base  # noqa: ensure models are loaded
from app.db.session import engine
from app.seed.departments import seed_departments
from app.seed.roles_permissions import seed_roles_and_permissions
from app.seed.users_employees import seed_users_employees
from app.seed.clients import seed_clients
from app.seed.leads import seed_leads
from app.seed.projects import seed_projects
from app.seed.tasks import seed_tasks
from app.seed.invoices import seed_invoices


def run():
    print("=== MAM Seed Runner ===")
    print("Creating tables if not exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("\nSeeding data...")

        print("[1/8] Departments")
        dept_map = seed_departments(db)

        print("[2/8] Roles & Permissions")
        role_map = seed_roles_and_permissions(db)

        print("[3/8] Users & Employees")
        user_map = seed_users_employees(db, role_map, dept_map)

        print("[4/8] Clients")
        client_map = seed_clients(db)

        print("[5/8] Leads")
        seed_leads(db, user_map)

        print("[6/8] Projects")
        project_map = seed_projects(db, client_map, user_map)

        print("[7/8] Tasks")
        seed_tasks(db, project_map, user_map)

        print("[8/8] Invoices")
        seed_invoices(db, client_map, user_map)

        print("\n=== Seed complete! ===")
        print("\nAdmin login:")
        print("  Email:    admin@agency.com")
        print("  Password: Admin1234!")

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
