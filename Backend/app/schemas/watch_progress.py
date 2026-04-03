from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import PaginationParams
from app.schemas.video import VideoListItem


class ProgressUpdate(BaseModel):
    video_id: UUID
    watched_seconds: int = Field(..., ge=0)
    total_seconds: int = Field(..., ge=0)


class ProgressResponse(BaseModel):
    video_id: UUID
    watched_seconds: int
    total_seconds: int
    is_completed: bool
    last_watched_at: datetime
    model_config = {"from_attributes": True}


class ProgressWithVideo(BaseModel):
    video: VideoListItem
    watched_seconds: int
    total_seconds: int
    is_completed: bool
    last_watched_at: datetime
    model_config = {"from_attributes": True}


class ProgressListParams(PaginationParams):
    completed: Optional[bool] = None
    sort: str = Field(default="recent", pattern="^(recent|oldest)$")
