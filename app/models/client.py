from datetime import date
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, Numeric, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User


class Client(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True, index=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    service_type: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    package_type: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contract_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    renewal_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    monthly_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    contract_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="active", nullable=False
    )  # active | inactive | paused | churned
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    contacts: Mapped[List["ClientContact"]] = relationship(
        "ClientContact", back_populates="client", cascade="all, delete-orphan"
    )
    client_notes: Mapped[List["ClientNote"]] = relationship(
        "ClientNote", back_populates="client", cascade="all, delete-orphan"
    )
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="client")  # type: ignore[name-defined]
    invoices: Mapped[List["Invoice"]] = relationship("Invoice", back_populates="client")  # type: ignore[name-defined]
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="converted_client")  # type: ignore[name-defined]


class ClientContact(Base, TimestampMixin):
    __tablename__ = "client_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    client: Mapped["Client"] = relationship("Client", back_populates="contacts")


class ClientNote(Base, TimestampMixin):
    __tablename__ = "client_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    client: Mapped["Client"] = relationship("Client", back_populates="client_notes")
    user: Mapped[Optional["User"]] = relationship("User")
