from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.services.watch_progress_service import WatchProgressService
from app.schemas.watch_progress import ProgressUpdate, ProgressResponse, ProgressWithVideo, ProgressListParams
from app.schemas.common import PaginatedResponse
from app.models.user import User

router = APIRouter(prefix="/progress", tags=["progress"])


@router.post("", response_model=ProgressResponse)
async def update_progress(
    data: ProgressUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    progress = await WatchProgressService(db).update_progress(
        current_user.id, data.video_id, data.watched_seconds, data.total_seconds
    )
    return ProgressResponse(
        video_id=progress.video_id,
        watched_seconds=progress.watched_seconds,
        total_seconds=progress.total_seconds,
        is_completed=progress.is_completed,
        last_watched_at=progress.last_watched_at,
    )


@router.get("")
async def get_history(
    completed: Optional[bool] = Query(None),
    sort: str = Query("recent"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await WatchProgressService(db).get_history(
        current_user.id, completed=completed, sort=sort, offset=offset, limit=limit
    )
    from app.schemas.video import VideoListItem
    result = []
    for p in items:
        result.append({
            "video": VideoListItem.model_validate(p.video),
            "watched_seconds": p.watched_seconds,
            "total_seconds": p.total_seconds,
            "is_completed": p.is_completed,
            "last_watched_at": p.last_watched_at,
        })
    return {"items": result, "total": total, "offset": offset, "limit": limit}


@router.get("/{video_id}", response_model=ProgressResponse)
async def get_video_progress(
    video_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    progress = await WatchProgressService(db).get_for_video(current_user.id, video_id)
    return ProgressResponse(
        video_id=progress.video_id,
        watched_seconds=progress.watched_seconds,
        total_seconds=progress.total_seconds,
        is_completed=progress.is_completed,
        last_watched_at=progress.last_watched_at,
    )
