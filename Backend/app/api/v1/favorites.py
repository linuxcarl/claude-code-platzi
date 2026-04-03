from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.services.favorite_service import FavoriteService
from app.schemas.favorite import FavoriteCreate, FavoriteResponse, FavoriteWithVideo
from app.schemas.video import VideoListItem
from app.models.user import User

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post("", response_model=FavoriteResponse, status_code=201)
async def add_favorite(
    data: FavoriteCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    fav = await FavoriteService(db).add(current_user.id, data.video_id)
    return FavoriteResponse(id=fav.id, video_id=fav.video_id, created_at=fav.created_at)


@router.delete("/{video_id}", status_code=204)
async def remove_favorite(
    video_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await FavoriteService(db).remove(current_user.id, video_id)


@router.get("")
async def list_favorites(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await FavoriteService(db).list_for_user(current_user.id, offset=offset, limit=limit)
    result = [
        {"id": f.id, "video": VideoListItem.model_validate(f.video), "created_at": f.created_at}
        for f in items
    ]
    return {"items": result, "total": total, "offset": offset, "limit": limit}
