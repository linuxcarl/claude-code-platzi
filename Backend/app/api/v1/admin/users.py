from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import require_role
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse
from app.models.user import User

router = APIRouter(prefix="/admin/users", tags=["admin"])
admin_user = require_role("admin")


@router.get("")
async def list_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    users = await UserRepository(db).get_all(skip=offset, limit=limit)
    total = await UserRepository(db).count()
    return {"items": [UserResponse.model_validate(u) for u in users], "total": total, "offset": offset, "limit": limit}


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    is_active: Optional[bool] = None,
    role: Optional[str] = None,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Usuario")
    updates = {}
    if is_active is not None:
        updates["is_active"] = is_active
    if role is not None:
        updates["role"] = role
    return await repo.update(user, updates)
