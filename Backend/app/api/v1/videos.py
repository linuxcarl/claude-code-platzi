from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_optional_user
from app.services.video_service import VideoService
from app.services.favorite_service import FavoriteService
from app.services.watch_progress_service import WatchProgressService
from app.schemas.video import VideoListItem, VideoDetail, VideoListParams
from app.schemas.common import PaginatedResponse
from app.models.user import User

router = APIRouter(prefix="/videos", tags=["videos"])


@router.get("", response_model=PaginatedResponse)
async def list_videos(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    is_free: Optional[bool] = Query(None),
    sort: str = Query("recent"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    videos, total = await VideoService(db).list_published(
        category=category, search=search, tag=tag,
        is_free=is_free, sort=sort, offset=offset, limit=limit,
    )
    return PaginatedResponse(
        items=[VideoListItem.model_validate(v) for v in videos],
        total=total, offset=offset, limit=limit,
    )


@router.get("/{slug}", response_model=VideoDetail)
async def get_video(
    slug: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    svc = VideoService(db)
    video = await svc.get_by_slug(slug, current_user)
    result = VideoDetail.model_validate(video)

    if current_user:
        fav_svc = FavoriteService(db)
        result.is_favorited = await fav_svc.is_favorited(current_user.id, video.id)

        progress_svc = WatchProgressService(db)
        try:
            progress = await progress_svc.get_for_video(current_user.id, video.id)
            from app.schemas.video import UserProgressBrief
            result.user_progress = UserProgressBrief(
                watched_seconds=progress.watched_seconds,
                is_completed=progress.is_completed,
            )
        except Exception:
            pass

    return result
