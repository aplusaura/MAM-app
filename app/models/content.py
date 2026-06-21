from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.client import Client

from app.models.project import Project
from app.models.file import File


class ContentItem(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "content_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    platform: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # instagram | tiktok | youtube | facebook | twitter | linkedin
    content_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # reel | post | story | video | blog | ad
    hook: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    script_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_writer: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_shooter: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_editor: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_designer: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    publish_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="idea", nullable=False
    )
    # idea | script_writing | script_approved | shooting_scheduled | shot |
    # editing | internal_review | revisions | approved | scheduled | published
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    client: Mapped[Optional["Client"]] = relationship("Client")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="content_items")
    writer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_writer])
    shooter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_shooter])
    editor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_editor])
    designer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_designer])
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
    assets: Mapped[List["ContentAsset"]] = relationship(
        "ContentAsset", back_populates="content_item", cascade="all, delete-orphan"
    )
    publishing_schedules: Mapped[List["PublishingSchedule"]] = relationship(
        "PublishingSchedule", back_populates="content_item", cascade="all, delete-orphan"
    )


class ContentAsset(Base, TimestampMixin):
    __tablename__ = "content_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content_item_id: Mapped[int] = mapped_column(
        ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), nullable=False
    )
    asset_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # script | raw_footage | final_video | thumbnail | graphic

    content_item: Mapped["ContentItem"] = relationship("ContentItem", back_populates="assets")
    file: Mapped["File"] = relationship("File")


class PublishingSchedule(Base, TimestampMixin):
    __tablename__ = "publishing_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content_item_id: Mapped[int] = mapped_column(
        ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="scheduled", nullable=False
    )  # scheduled | published | failed | cancelled
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    content_item: Mapped["ContentItem"] = relationship("ContentItem", back_populates="publishing_schedules")


class ContentPlan(Base):
    __tablename__ = "content_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # instagram | tiktok | youtube | facebook | blog | other
    status: Mapped[str] = mapped_column(String(30), default="draft", nullable=False)
    # draft | scheduled | published | cancelled
    content_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # reel | post | story | video | blog
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    publish_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
