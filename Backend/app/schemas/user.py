from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=512)
