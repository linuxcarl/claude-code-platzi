import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Table, Column, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin

video_tags = Table(
    "video_tags",
    Base.metadata,
    Column(
        "video_id",
        ForeignKey("videos.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Tag(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    videos: Mapped[list["Video"]] = relationship(
        "Video", secondary=video_tags, back_populates="tags"
    )
