from fastapi import APIRouter

from app.api.v1 import (
    alerts,
    auth,
    users,
    employees,
    roles,
    permissions,
    departments,
    clients,
    leads,
    projects,
    tasks,
    content,
    calendar,
    finance,
    files,
    reports,
    ai,
    notifications,
    notifications_email,
    messages,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(employees.router, prefix="/employees", tags=["Employees"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["Permissions"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(content.router, prefix="/content", tags=["Content"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(finance.router, prefix="/finance", tags=["Finance"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(notifications_email.router, prefix="/notifications/email", tags=["Notifications"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
