from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, Numeric, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.client import Client

from app.models.milestone import Milestone


class Project(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    project_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="planning", nullable=False
    )
    # planning | in_progress | waiting_client | on_hold | under_review | completed | cancelled
    priority: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False
    )  # low | medium | high | critical
    budget: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="projects")
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
    members: Mapped[List["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    status_history: Mapped[List["ProjectStatusHistory"]] = relationship(
        "ProjectStatusHistory", back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project")  # type: ignore[name-defined]
    content_items: Mapped[List["ContentItem"]] = relationship("ContentItem", back_populates="project")  # type: ignore[name-defined]
    milestones: Mapped[List["Milestone"]] = relationship(
        "Milestone", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectMember(Base, TimestampMixin):
    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role_in_project: Mapped[str] = mapped_column(
        String(50), default="member", nullable=False
    )  # lead | member | observer

    project: Mapped["Project"] = relationship("Project", back_populates="members")
    user: Mapped["User"] = relationship("User")


class ProjectStatusHistory(Base):
    __tablename__ = "project_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    changed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="status_history")
    changed_by_user: Mapped[Optional["User"]] = relationship("User")
