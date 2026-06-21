from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Integer, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class File(Base, TimestampMixin):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    original_name: Mapped[str] = mapped_column(String(300), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(300), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    entity_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # client | project | task | content | invoice | employee
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    uploaded_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    uploader: Mapped[Optional["User"]] = relationship("User")
