import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin


class Favorite(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "favorites"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    video_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("videos.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    video: Mapped["Video"] = relationship("Video", back_populates="favorites")

    __table_args__ = (
        UniqueConstraint("user_id", "video_id", name="uq_favorites_user_video"),
        Index("ix_favorites_user", "user_id"),
        Index("ix_favorites_user_created", "user_id", "created_at"),
    )
