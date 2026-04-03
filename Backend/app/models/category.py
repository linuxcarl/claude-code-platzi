from sqlalchemy import String, Text, Integer, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class Category(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    videos: Mapped[list["Video"]] = relationship("Video", back_populates="category")

    __table_args__ = (Index("ix_categories_active_sort", "is_active", "sort_order"),)
