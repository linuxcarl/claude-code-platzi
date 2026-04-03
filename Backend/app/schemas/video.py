from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import PaginationParams


class CategoryBrief(BaseModel):
    id: UUID
    name: str
    slug: str
    model_config = {"from_attributes": True}


class TagBrief(BaseModel):
    id: UUID
    name: str
    slug: str
    model_config = {"from_attributes": True}


class UserProgressBrief(BaseModel):
    watched_seconds: int
    is_completed: bool


class VideoListItem(BaseModel):
    id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    is_free: bool
    status: str
    category: Optional[CategoryBrief] = None
    tags: List[TagBrief] = []
    published_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class VideoDetail(VideoListItem):
    video_url: Optional[str] = None
    hls_url: Optional[str] = None
    user_progress: Optional[UserProgressBrief] = None
    is_favorited: Optional[bool] = None


class VideoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tag_ids: List[UUID] = Field(default_factory=list)
    is_free: bool = False
    status: str = Field(default="draft", pattern="^(draft|published)$")


class VideoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tag_ids: Optional[List[UUID]] = None
    is_free: Optional[bool] = None
    status: Optional[str] = Field(None, pattern="^(draft|processing|published|archived)$")
    video_url: Optional[str] = None
    hls_url: Optional[str] = None
    duration_seconds: Optional[int] = None


class VideoListParams(PaginationParams):
    category: Optional[str] = None
    search: Optional[str] = None
    tag: Optional[str] = None
    is_free: Optional[bool] = None
    sort: str = Field(default="recent", pattern="^(recent|popular|oldest)$")
