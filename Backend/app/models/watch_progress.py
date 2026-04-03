import uuid
from datetime import datetime
from sqlalchemy import Integer, Boolean, DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class WatchProgress(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "watch_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    video_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("videos.id", ondelete="CASCADE"), nullable=False
    )
    watched_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_watched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="watch_progress")
    video: Mapped["Video"] = relationship("Video", back_populates="watch_progress")

    __table_args__ = (
        UniqueConstraint("user_id", "video_id", name="uq_watch_progress_user_video"),
        Index("ix_watch_progress_user", "user_id"),
        Index("ix_watch_progress_user_completed", "user_id", "is_completed"),
        Index("ix_watch_progress_user_last_watched", "user_id", "last_watched_at"),
    )
