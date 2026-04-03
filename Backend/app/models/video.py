import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin
from app.models.tag import video_tags


class Video(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "videos"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(280), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hls_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    category: Mapped["Category | None"] = relationship("Category", back_populates="videos")
    created_by_user: Mapped["User | None"] = relationship("User", back_populates="created_videos")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary=video_tags, back_populates="videos"
    )
    watch_progress: Mapped[list["WatchProgress"]] = relationship(
        "WatchProgress", back_populates="video", cascade="all, delete-orphan"
    )
    favorites: Mapped[list["Favorite"]] = relationship(
        "Favorite", back_populates="video", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_videos_category_status", "category_id", "status"),
        Index("ix_videos_status_published", "status", "published_at"),
        Index("ix_videos_free_status", "is_free", "status"),
    )
