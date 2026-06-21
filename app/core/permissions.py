"""
All permission slugs used across the system.
These must match the slugs seeded in the permissions table.
"""


class Permissions:
    # Users
    VIEW_USERS = "view_users"
    CREATE_USER = "create_user"
    EDIT_USER = "edit_user"
    DELETE_USER = "delete_user"

    # Employees
    VIEW_EMPLOYEES = "view_employees"
    CREATE_EMPLOYEE = "create_employee"
    EDIT_EMPLOYEE = "edit_employee"
    DELETE_EMPLOYEE = "delete_employee"
    VIEW_OWN_PROFILE = "view_own_profile"
    EDIT_OWN_PROFILE = "edit_own_profile"

    # Clients
    VIEW_ALL_CLIENTS = "view_all_clients"
    VIEW_ASSIGNED_CLIENTS = "view_assigned_clients"
    CREATE_CLIENT = "create_client"
    EDIT_CLIENT = "edit_client"
    DELETE_CLIENT = "delete_client"

    # Leads
    VIEW_ALL_LEADS = "view_all_leads"
    VIEW_ASSIGNED_LEADS = "view_assigned_leads"
    CREATE_LEAD = "create_lead"
    EDIT_LEAD = "edit_lead"
    DELETE_LEAD = "delete_lead"
    CONVERT_LEAD = "convert_lead"

    # Projects
    VIEW_ALL_PROJECTS = "view_all_projects"
    VIEW_ASSIGNED_PROJECTS = "view_assigned_projects"
    CREATE_PROJECT = "create_project"
    EDIT_PROJECT = "edit_project"
    DELETE_PROJECT = "delete_project"
    MANAGE_PROJECT_MEMBERS = "manage_project_members"

    # Tasks
    VIEW_ALL_TASKS = "view_all_tasks"
    VIEW_ASSIGNED_TASKS = "view_assigned_tasks"
    CREATE_TASK = "create_task"
    EDIT_TASK = "edit_task"
    DELETE_TASK = "delete_task"
    ASSIGN_TASK = "assign_task"
    REASSIGN_TASK = "reassign_task"

    # Content
    VIEW_CONTENT = "view_content"
    CREATE_CONTENT = "create_content"
    EDIT_CONTENT = "edit_content"
    DELETE_CONTENT = "delete_content"
    APPROVE_CONTENT = "approve_content"
    PUBLISH_CONTENT = "publish_content"

    # Calendar
    VIEW_CALENDAR = "view_calendar"
    CREATE_EVENT = "create_event"
    EDIT_EVENT = "edit_event"
    DELETE_EVENT = "delete_event"

    # Finance
    VIEW_FINANCE = "view_finance"
    CREATE_INVOICE = "create_invoice"
    EDIT_INVOICE = "edit_invoice"
    DELETE_INVOICE = "delete_invoice"
    RECORD_PAYMENT = "record_payment"
    VIEW_EXPENSES = "view_expenses"
    CREATE_EXPENSE = "create_expense"

    # Reports
    VIEW_REPORTS = "view_reports"
    EXPORT_REPORTS = "export_reports"

    # AI
    ACCESS_AI_TOOLS = "access_ai_tools"

    # System
    MANAGE_ROLES = "manage_roles"
    MANAGE_PERMISSIONS = "manage_permissions"
    MANAGE_DEPARTMENTS = "manage_departments"
    UPLOAD_ATTACHMENTS = "upload_attachments"
    VIEW_ACTIVITY_LOGS = "view_activity_logs"


# All permissions as a flat list for seeding
ALL_PERMISSIONS = [
    # module, slug, description
    ("users", Permissions.VIEW_USERS, "View all users"),
    ("users", Permissions.CREATE_USER, "Create new users"),
    ("users", Permissions.EDIT_USER, "Edit user accounts"),
    ("users", Permissions.DELETE_USER, "Delete users"),
    ("employees", Permissions.VIEW_EMPLOYEES, "View all employees"),
    ("employees", Permissions.CREATE_EMPLOYEE, "Create employees"),
    ("employees", Permissions.EDIT_EMPLOYEE, "Edit employee profiles"),
    ("employees", Permissions.DELETE_EMPLOYEE, "Delete employees"),
    ("employees", Permissions.VIEW_OWN_PROFILE, "View own profile"),
    ("employees", Permissions.EDIT_OWN_PROFILE, "Edit own profile"),
    ("clients", Permissions.VIEW_ALL_CLIENTS, "View all clients"),
    ("clients", Permissions.VIEW_ASSIGNED_CLIENTS, "View assigned clients only"),
    ("clients", Permissions.CREATE_CLIENT, "Create clients"),
    ("clients", Permissions.EDIT_CLIENT, "Edit clients"),
    ("clients", Permissions.DELETE_CLIENT, "Delete clients"),
    ("leads", Permissions.VIEW_ALL_LEADS, "View all leads"),
    ("leads", Permissions.VIEW_ASSIGNED_LEADS, "View assigned leads only"),
    ("leads", Permissions.CREATE_LEAD, "Create leads"),
    ("leads", Permissions.EDIT_LEAD, "Edit leads"),
    ("leads", Permissions.DELETE_LEAD, "Delete leads"),
    ("leads", Permissions.CONVERT_LEAD, "Convert lead to client"),
    ("projects", Permissions.VIEW_ALL_PROJECTS, "View all projects"),
    ("projects", Permissions.VIEW_ASSIGNED_PROJECTS, "View assigned projects only"),
    ("projects", Permissions.CREATE_PROJECT, "Create projects"),
    ("projects", Permissions.EDIT_PROJECT, "Edit projects"),
    ("projects", Permissions.DELETE_PROJECT, "Delete projects"),
    ("projects", Permissions.MANAGE_PROJECT_MEMBERS, "Manage project members"),
    ("tasks", Permissions.VIEW_ALL_TASKS, "View all tasks"),
    ("tasks", Permissions.VIEW_ASSIGNED_TASKS, "View assigned tasks only"),
    ("tasks", Permissions.CREATE_TASK, "Create tasks"),
    ("tasks", Permissions.EDIT_TASK, "Edit tasks"),
    ("tasks", Permissions.DELETE_TASK, "Delete tasks"),
    ("tasks", Permissions.ASSIGN_TASK, "Assign tasks to employees"),
    ("tasks", Permissions.REASSIGN_TASK, "Reassign tasks"),
    ("content", Permissions.VIEW_CONTENT, "View content items"),
    ("content", Permissions.CREATE_CONTENT, "Create content items"),
    ("content", Permissions.EDIT_CONTENT, "Edit content items"),
    ("content", Permissions.DELETE_CONTENT, "Delete content items"),
    ("content", Permissions.APPROVE_CONTENT, "Approve content"),
    ("content", Permissions.PUBLISH_CONTENT, "Publish content"),
    ("calendar", Permissions.VIEW_CALENDAR, "View calendar"),
    ("calendar", Permissions.CREATE_EVENT, "Create calendar events"),
    ("calendar", Permissions.EDIT_EVENT, "Edit calendar events"),
    ("calendar", Permissions.DELETE_EVENT, "Delete calendar events"),
    ("finance", Permissions.VIEW_FINANCE, "View finance module"),
    ("finance", Permissions.CREATE_INVOICE, "Create invoices"),
    ("finance", Permissions.EDIT_INVOICE, "Edit invoices"),
    ("finance", Permissions.DELETE_INVOICE, "Delete invoices"),
    ("finance", Permissions.RECORD_PAYMENT, "Record payments"),
    ("finance", Permissions.VIEW_EXPENSES, "View expenses"),
    ("finance", Permissions.CREATE_EXPENSE, "Create expenses"),
    ("reports", Permissions.VIEW_REPORTS, "View reports"),
    ("reports", Permissions.EXPORT_REPORTS, "Export reports"),
    ("ai", Permissions.ACCESS_AI_TOOLS, "Access AI tools"),
    ("system", Permissions.MANAGE_ROLES, "Manage roles"),
    ("system", Permissions.MANAGE_PERMISSIONS, "Manage permissions"),
    ("system", Permissions.MANAGE_DEPARTMENTS, "Manage departments"),
    ("system", Permissions.UPLOAD_ATTACHMENTS, "Upload attachments"),
    ("system", Permissions.VIEW_ACTIVITY_LOGS, "View activity logs"),
]


# Default permissions per role slug
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": [p[1] for p in ALL_PERMISSIONS],  # all permissions
    "admin": [
        Permissions.VIEW_USERS, Permissions.CREATE_USER, Permissions.EDIT_USER,
        Permissions.VIEW_EMPLOYEES, Permissions.CREATE_EMPLOYEE, Permissions.EDIT_EMPLOYEE,
        Permissions.VIEW_ALL_CLIENTS, Permissions.CREATE_CLIENT, Permissions.EDIT_CLIENT, Permissions.DELETE_CLIENT,
        Permissions.VIEW_ALL_LEADS, Permissions.CREATE_LEAD, Permissions.EDIT_LEAD, Permissions.DELETE_LEAD, Permissions.CONVERT_LEAD,
        Permissions.VIEW_ALL_PROJECTS, Permissions.CREATE_PROJECT, Permissions.EDIT_PROJECT, Permissions.DELETE_PROJECT, Permissions.MANAGE_PROJECT_MEMBERS,
        Permissions.VIEW_ALL_TASKS, Permissions.CREATE_TASK, Permissions.EDIT_TASK, Permissions.DELETE_TASK, Permissions.ASSIGN_TASK, Permissions.REASSIGN_TASK,
        Permissions.VIEW_CONTENT, Permissions.CREATE_CONTENT, Permissions.EDIT_CONTENT, Permissions.APPROVE_CONTENT, Permissions.PUBLISH_CONTENT,
        Permissions.VIEW_CALENDAR, Permissions.CREATE_EVENT, Permissions.EDIT_EVENT,
        Permissions.VIEW_FINANCE, Permissions.CREATE_INVOICE, Permissions.EDIT_INVOICE, Permissions.RECORD_PAYMENT, Permissions.VIEW_EXPENSES, Permissions.CREATE_EXPENSE,
        Permissions.VIEW_REPORTS, Permissions.EXPORT_REPORTS,
        Permissions.ACCESS_AI_TOOLS,
        Permissions.MANAGE_ROLES, Permissions.MANAGE_DEPARTMENTS, Permissions.UPLOAD_ATTACHMENTS, Permissions.VIEW_ACTIVITY_LOGS,
    ],
    "account_manager": [
        Permissions.VIEW_ALL_CLIENTS, Permissions.CREATE_CLIENT, Permissions.EDIT_CLIENT,
        Permissions.VIEW_ALL_LEADS, Permissions.CREATE_LEAD, Permissions.EDIT_LEAD, Permissions.CONVERT_LEAD,
        Permissions.VIEW_ALL_PROJECTS, Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ALL_TASKS, Permissions.VIEW_ASSIGNED_TASKS, Permissions.CREATE_TASK,
        Permissions.VIEW_CONTENT, Permissions.CREATE_CONTENT,
        Permissions.VIEW_CALENDAR, Permissions.CREATE_EVENT,
        Permissions.VIEW_FINANCE,
        Permissions.VIEW_REPORTS,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "project_manager": [
        Permissions.VIEW_ALL_CLIENTS, Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ALL_PROJECTS, Permissions.CREATE_PROJECT, Permissions.EDIT_PROJECT, Permissions.MANAGE_PROJECT_MEMBERS,
        Permissions.VIEW_ALL_TASKS, Permissions.CREATE_TASK, Permissions.EDIT_TASK, Permissions.ASSIGN_TASK, Permissions.REASSIGN_TASK,
        Permissions.VIEW_CONTENT, Permissions.CREATE_CONTENT, Permissions.EDIT_CONTENT, Permissions.APPROVE_CONTENT,
        Permissions.VIEW_CALENDAR, Permissions.CREATE_EVENT, Permissions.EDIT_EVENT,
        Permissions.VIEW_REPORTS,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
        Permissions.VIEW_EMPLOYEES,
    ],
    "content_creator": [
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.EDIT_TASK,
        Permissions.VIEW_CONTENT, Permissions.CREATE_CONTENT, Permissions.EDIT_CONTENT,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "video_editor": [
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.EDIT_TASK,
        Permissions.VIEW_CONTENT, Permissions.EDIT_CONTENT,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "graphic_designer": [
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.EDIT_TASK,
        Permissions.VIEW_CONTENT, Permissions.EDIT_CONTENT,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "social_media": [
        Permissions.VIEW_ALL_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS,
        Permissions.VIEW_CONTENT, Permissions.EDIT_CONTENT, Permissions.PUBLISH_CONTENT,
        Permissions.VIEW_CALENDAR, Permissions.CREATE_EVENT,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "photographer": [
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.EDIT_TASK,
        Permissions.VIEW_CONTENT,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "sales": [
        Permissions.VIEW_ALL_CLIENTS, Permissions.CREATE_CLIENT,
        Permissions.VIEW_ALL_LEADS, Permissions.CREATE_LEAD, Permissions.EDIT_LEAD, Permissions.CONVERT_LEAD,
        Permissions.VIEW_CALENDAR, Permissions.CREATE_EVENT,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "finance": [
        Permissions.VIEW_ALL_CLIENTS,
        Permissions.VIEW_FINANCE, Permissions.CREATE_INVOICE, Permissions.EDIT_INVOICE, Permissions.RECORD_PAYMENT,
        Permissions.VIEW_EXPENSES, Permissions.CREATE_EXPENSE,
        Permissions.VIEW_REPORTS, Permissions.EXPORT_REPORTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
}


# ---------------------------------------------------------------------------
# Additional mappings for company org-chart roles (see docs/info/org-structure.md)
# ---------------------------------------------------------------------------
ROLE_PERMISSIONS.update({
    "ceo": [p[1] for p in ALL_PERMISSIONS],  # CEO = full access like super_admin
    "team_leader": [
        Permissions.VIEW_EMPLOYEES,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ALL_PROJECTS, Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ALL_TASKS, Permissions.VIEW_ASSIGNED_TASKS,
        Permissions.CREATE_TASK, Permissions.EDIT_TASK, Permissions.ASSIGN_TASK, Permissions.REASSIGN_TASK,
        Permissions.VIEW_REPORTS,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_CALENDAR, Permissions.CREATE_EVENT,
    ],
    "reel_maker": [
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.EDIT_TASK,
        Permissions.VIEW_CONTENT, Permissions.EDIT_CONTENT,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "videographer": [
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.EDIT_TASK,
        Permissions.VIEW_CONTENT,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "media_buyer": [
        Permissions.VIEW_ALL_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS, Permissions.VIEW_ALL_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.VIEW_ALL_TASKS,
        Permissions.VIEW_REPORTS,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "marketing_specialist": [
        Permissions.VIEW_ALL_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS,
        Permissions.VIEW_REPORTS,
        Permissions.VIEW_CALENDAR, Permissions.CREATE_EVENT,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
    "moderator": [
        Permissions.VIEW_ASSIGNED_CLIENTS,
        Permissions.VIEW_ASSIGNED_PROJECTS,
        Permissions.VIEW_ASSIGNED_TASKS, Permissions.EDIT_TASK,
        Permissions.VIEW_CONTENT, Permissions.EDIT_CONTENT, Permissions.PUBLISH_CONTENT,
        Permissions.VIEW_CALENDAR,
        Permissions.UPLOAD_ATTACHMENTS,
        Permissions.VIEW_OWN_PROFILE, Permissions.EDIT_OWN_PROFILE,
    ],
})
