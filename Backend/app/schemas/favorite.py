from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.video import VideoListItem


class FavoriteCreate(BaseModel):
    video_id: UUID


class FavoriteResponse(BaseModel):
    id: UUID
    video_id: UUID
    created_at: datetime
    model_config = {"from_attributes": True}


class FavoriteWithVideo(BaseModel):
    id: UUID
    video: VideoListItem
    created_at: datetime
    model_config = {"from_attributes": True}
