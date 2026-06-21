# Import all models here so Alembic can detect them for autogenerate
from app.db.base_class import Base  # noqa: F401
from app.models.role import Role, Permission, RolePermission  # noqa: F401
from app.models.department import Department  # noqa: F401
from app.models.user import User, UserPermission  # noqa: F401
from app.models.employee import Employee, EmployeeBonus, LeaveRequest, WorkSession, EmployeeEvaluation  # noqa: F401
from app.models.client import Client, ClientContact, ClientNote  # noqa: F401
from app.models.lead import LeadSource, Lead, LeadActivity  # noqa: F401
from app.models.project import Project, ProjectMember, ProjectStatusHistory  # noqa: F401
from app.models.milestone import Milestone  # noqa: F401
from app.models.task import Task, TaskComment, TaskChecklist, TaskDependency, TaskStatusHistory, TaskAttachment, TimeEntry  # noqa: F401
from app.models.content import ContentItem, ContentAsset, PublishingSchedule, ContentPlan  # noqa: F401
from app.models.calendar import Event, EventAttendee, Reminder  # noqa: F401
from app.models.finance import Invoice, InvoiceItem, Payment, Expense  # noqa: F401
from app.models.file import File  # noqa: F401
from app.models.notification import Notification, ActivityLog, DirectMessage  # noqa: F401
from app.models.shooting_brief import ShootingBrief  # noqa: F401
