from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, Numeric, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.client import Client


class LeadSource(Base):
    __tablename__ = "lead_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="source")


class Lead(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lead_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    company_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("lead_sources.id", ondelete="SET NULL"), nullable=True
    )
    interested_service: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    expected_budget: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    assigned_to: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    stage: Mapped[str] = mapped_column(
        String(50), default="new_lead", nullable=False
    )
    # stages: new_lead | contacted | qualified | meeting_scheduled |
    #         proposal_sent | negotiation | won | lost | follow_up_later
    next_followup_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    last_contact_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    converted_to_client_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )

    source: Mapped[Optional["LeadSource"]] = relationship("LeadSource", back_populates="leads")
    assigned_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to])
    converted_client: Mapped[Optional["Client"]] = relationship(
        "Client", back_populates="leads", foreign_keys=[converted_to_client_id]
    )
    activities: Mapped[List["LeadActivity"]] = relationship(
        "LeadActivity", back_populates="lead", cascade="all, delete-orphan"
    )


class LeadActivity(Base, TimestampMixin):
    __tablename__ = "lead_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    activity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # call | email | meeting | note | stage_change
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="activities")
    user: Mapped[Optional["User"]] = relationship("User")
