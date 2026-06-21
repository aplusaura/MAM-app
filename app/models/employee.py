from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, Numeric, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.role import Role

from app.models.department import Department


class Employee(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True
    )
    role_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("roles.id", ondelete="SET NULL"), nullable=True
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    manager_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    employment_type: Mapped[str] = mapped_column(
        String(50), default="full_time", nullable=False
    )  # full_time | part_time | contractor | freelancer
    salary: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    join_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="active", nullable=False
    )  # active | inactive | on_leave
    availability_status: Mapped[str] = mapped_column(
        String(50), default="available", nullable=False
    )  # available | busy | unavailable
    profile_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="employee")
    role: Mapped[Optional["Role"]] = relationship("Role", back_populates="employees")
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="employees"
    )
    manager: Mapped[Optional["Employee"]] = relationship(
        "Employee", remote_side="Employee.id", back_populates="direct_reports"
    )
    direct_reports: Mapped[List["Employee"]] = relationship(
        "Employee", back_populates="manager"
    )
    bonuses: Mapped[List["EmployeeBonus"]] = relationship(
        "EmployeeBonus", back_populates="employee", cascade="all, delete-orphan"
    )
    leave_requests: Mapped[List["LeaveRequest"]] = relationship(
        "LeaveRequest", back_populates="employee", cascade="all, delete-orphan"
    )
    work_sessions: Mapped[List["WorkSession"]] = relationship(
        "WorkSession", back_populates="employee", cascade="all, delete-orphan"
    )
    evaluations: Mapped[List["EmployeeEvaluation"]] = relationship(
        "EmployeeEvaluation", foreign_keys="EmployeeEvaluation.employee_id",
        back_populates="employee", cascade="all, delete-orphan"
    )


class EmployeeBonus(Base):
    __tablename__ = "employee_bonuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    given_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    employee: Mapped["Employee"] = relationship("Employee", back_populates="bonuses")
    given_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[given_by_user_id])


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    leave_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # vacation | sick | personal | other
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_count: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending | approved | denied
    reviewed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    employee: Mapped["Employee"] = relationship("Employee", back_populates="leave_requests")
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by])


class WorkSession(Base):
    __tablename__ = "work_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    clock_in: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    clock_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_hours: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="work_sessions")


class EmployeeEvaluation(Base, TimestampMixin):
    __tablename__ = "employee_evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    evaluated_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evaluation_type: Mapped[str] = mapped_column(
        String(20), default="TL", nullable=False
    )  # TL | AM | CEO

    employee: Mapped["Employee"] = relationship(
        "Employee", foreign_keys=[employee_id], back_populates="evaluations"
    )
    evaluator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[evaluated_by])
