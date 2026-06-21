from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(
        String(50), default="other", nullable=False
    )  # meeting | shoot | deadline | publishing | followup | reminder | other
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    linked_project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    linked_task_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    linked_lead_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("leads.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
    attendees: Mapped[List["EventAttendee"]] = relationship(
        "EventAttendee", back_populates="event", cascade="all, delete-orphan"
    )
    reminders: Mapped[List["Reminder"]] = relationship(
        "Reminder", back_populates="event", cascade="all, delete-orphan"
    )


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    response_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending | accepted | declined

    event: Mapped["Event"] = relationship("Event", back_populates="attendees")
    user: Mapped["User"] = relationship("User")


class Reminder(Base, TimestampMixin):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    event_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User")
    event: Mapped[Optional["Event"]] = relationship("Event", back_populates="reminders")
