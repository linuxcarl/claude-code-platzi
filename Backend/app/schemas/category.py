from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_count: Optional[int] = None
    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
