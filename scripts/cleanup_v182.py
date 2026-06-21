#!/usr/bin/env python3
"""
MAM V1.8.2 Data Cleanup Script
Soft-deletes stale tasks, projects, and demo data.
Run from the project root: python scripts/cleanup_v182.py [--dry-run]
"""

import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.task import Task
from app.models.project import Project
from app.models.employee import Employee

DRY_RUN = "--dry-run" in sys.argv
NOW = datetime.now(timezone.utc)
CUTOFF_90 = NOW - timedelta(days=90)
CUTOFF_180 = NOW - timedelta(days=180)

DEMO_EMAIL_PATTERNS = ("@example.com", "@test.com", "@demo.com", "@fake.com")


def main():
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        print(f"{'[DRY RUN] ' if DRY_RUN else ''}Running MAM V1.8.2 data cleanup...")

        # 1. Soft-delete tasks: done + not touched in 90 days
        stale_tasks = db.query(Task).filter(
            Task.status == "done",
            Task.updated_at < CUTOFF_90.replace(tzinfo=None),
            Task.deleted_at.is_(None),
        ).all()
        print(f"  Stale done tasks to soft-delete: {len(stale_tasks)}")
        if not DRY_RUN:
            for t in stale_tasks:
                t.deleted_at = NOW.replace(tzinfo=None)

        # 2. Soft-delete projects: no tasks updated in 90 days (and project itself old)
        all_projects = db.query(Project).filter(Project.deleted_at.is_(None)).all()
        stale_projects = []
        for p in all_projects:
            tasks = db.query(Task).filter(
                Task.project_id == p.id,
                Task.deleted_at.is_(None),
            ).all()
            active_tasks = [t for t in tasks if t.updated_at and t.updated_at >= CUTOFF_90.replace(tzinfo=None)]
            if not active_tasks and p.created_at and p.created_at < CUTOFF_90.replace(tzinfo=None):
                stale_projects.append(p)
        print(f"  Stale projects to soft-delete: {len(stale_projects)}")
        if not DRY_RUN:
            for p in stale_projects:
                p.deleted_at = NOW.replace(tzinfo=None)

        # 3. Remove demo employees by email pattern
        all_employees = db.query(Employee).filter(Employee.deleted_at.is_(None)).all()
        demo_employees = [
            e for e in all_employees
            if e.email and any(e.email.endswith(pat) for pat in DEMO_EMAIL_PATTERNS)
        ]
        print(f"  Demo employees to soft-delete: {len(demo_employees)}")
        if not DRY_RUN:
            for e in demo_employees:
                e.deleted_at = NOW.replace(tzinfo=None)

        if not DRY_RUN:
            db.commit()
            print("  Committed all changes.")
        else:
            print("  [DRY RUN] No changes committed.")

    print("Cleanup complete.")


if __name__ == "__main__":
    main()
