from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User


class ShootingBrief(Base):
    __tablename__ = "shooting_briefs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    what_was_shot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    shoot_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    crew_present: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    what_happened: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_footage_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    task: Mapped["Task"] = relationship("Task")
    creator: Mapped[Optional["User"]] = relationship("User")
