from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import require_role
from app.services.video_service import VideoService
from app.schemas.video import VideoCreate, VideoUpdate, VideoListItem
from app.models.user import User

router = APIRouter(prefix="/admin/videos", tags=["admin"])
admin_user = require_role("admin")


@router.get("")
async def list_videos(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    videos, total = await VideoService(db).list_admin(status=status, search=search, offset=offset, limit=limit)
    return {"items": [VideoListItem.model_validate(v) for v in videos], "total": total, "offset": offset, "limit": limit}


@router.post("", status_code=201)
async def create_video(
    data: VideoCreate,
    current_user: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    video = await VideoService(db).create(
        title=data.title, created_by=current_user.id,
        description=data.description, category_id=data.category_id,
        tag_ids=data.tag_ids, is_free=data.is_free, status=data.status,
    )
    return VideoListItem.model_validate(video)


@router.get("/{video_id}")
async def get_video(video_id: UUID, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    from app.repositories.video_repository import VideoRepository
    video = await VideoRepository(db).get_by_id(video_id)
    if not video:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Video")
    return VideoListItem.model_validate(video)


@router.patch("/{video_id}")
async def update_video(
    video_id: UUID, data: VideoUpdate,
    _: User = Depends(admin_user), db: AsyncSession = Depends(get_db),
):
    video = await VideoService(db).update(video_id, **data.model_dump(exclude_none=True))
    return VideoListItem.model_validate(video)


@router.delete("/{video_id}", status_code=204)
async def archive_video(video_id: UUID, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    await VideoService(db).archive(video_id)


@router.post("/{video_id}/publish")
async def publish_video(video_id: UUID, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    video = await VideoService(db).publish(video_id)
    return VideoListItem.model_validate(video)


@router.post("/{video_id}/upload-url")
async def get_upload_url(
    video_id: UUID,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mock endpoint — in production generates a real S3 presigned URL.
    Returns a fake upload URL for testing purposes.
    """
    return {
        "upload_url": f"https://mock-s3.example.com/videos/{video_id}?mock=true",
        "video_url": f"https://mock-cdn.example.com/videos/{video_id}/video.mp4",
        "expires_in": 3600,
    }
