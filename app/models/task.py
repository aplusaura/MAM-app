from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, Numeric, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.client import Client

from app.models.project import Project
from app.models.department import Department


class Task(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    revision_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    client_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    priority: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False
    )  # low | medium | high | critical
    status: Mapped[str] = mapped_column(
        String(50), default="todo", nullable=False
    )
    # todo | in_progress | review | revisions_needed | waiting_approval | am_review | moderator_review | done | overdue | paused
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    task_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    # video_editing | design | content_writing | shooting | social_media | other
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    estimated_hours: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    actual_hours: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    revision_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revision_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # revision_type: "internal" (team) | "external" (client)
    final_link: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    parent_task_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )

    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to])
    assigner: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_by])
    client: Mapped[Optional["Client"]] = relationship("Client")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="tasks")
    department: Mapped[Optional["Department"]] = relationship("Department")
    parent_task: Mapped[Optional["Task"]] = relationship(
        "Task", remote_side="Task.id", back_populates="subtasks"
    )
    subtasks: Mapped[List["Task"]] = relationship("Task", back_populates="parent_task")
    comments: Mapped[List["TaskComment"]] = relationship(
        "TaskComment", back_populates="task", cascade="all, delete-orphan"
    )
    checklists: Mapped[List["TaskChecklist"]] = relationship(
        "TaskChecklist", back_populates="task", cascade="all, delete-orphan"
    )
    dependencies: Mapped[List["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.task_id",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    status_history: Mapped[List["TaskStatusHistory"]] = relationship(
        "TaskStatusHistory", back_populates="task", cascade="all, delete-orphan"
    )
    attachments: Mapped[List["TaskAttachment"]] = relationship(
        "TaskAttachment", back_populates="task", cascade="all, delete-orphan"
    )
    time_entries: Mapped[List["TimeEntry"]] = relationship(
        "TimeEntry", back_populates="task", cascade="all, delete-orphan"
    )


class TaskComment(Base, TimestampMixin):
    __tablename__ = "task_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    task: Mapped["Task"] = relationship("Task", back_populates="comments")
    user: Mapped[Optional["User"]] = relationship("User")


class TaskChecklist(Base, TimestampMixin):
    __tablename__ = "task_checklists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(300), nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    task: Mapped["Task"] = relationship("Task", back_populates="checklists")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    depends_on_task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )

    task: Mapped["Task"] = relationship("Task", foreign_keys=[task_id], back_populates="dependencies")
    depends_on: Mapped["Task"] = relationship("Task", foreign_keys=[depends_on_task_id])


class TaskStatusHistory(Base):
    __tablename__ = "task_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    changed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    task: Mapped["Task"] = relationship("Task", back_populates="status_history")
    changed_by_user: Mapped[Optional["User"]] = relationship("User")


class TaskAttachment(Base, TimestampMixin):
    __tablename__ = "task_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    uploaded_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    task: Mapped["Task"] = relationship("Task", back_populates="attachments")
    uploader: Mapped[Optional["User"]] = relationship("User")


class TimeEntry(Base, TimestampMixin):
    __tablename__ = "time_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    task: Mapped["Task"] = relationship("Task", back_populates="time_entries")
    user: Mapped[Optional["User"]] = relationship("User")
