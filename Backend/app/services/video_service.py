from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError, ConflictError
from app.repositories.video_repository import VideoRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.tag_repository import TagRepository
from app.repositories.watch_progress_repository import WatchProgressRepository
from app.repositories.favorite_repository import FavoriteRepository
from app.repositories.subscription_repository import SubscriptionRepository


class VideoService:
    def __init__(self, db: AsyncSession):
        self.repo = VideoRepository(db)
        self.category_repo = CategoryRepository(db)
        self.tag_repo = TagRepository(db)
        self.progress_repo = WatchProgressRepository(db)
        self.favorite_repo = FavoriteRepository(db)
        self.subscription_repo = SubscriptionRepository(db)

    async def list_published(self, *, category: Optional[str] = None, search: Optional[str] = None,
                              tag: Optional[str] = None, is_free: Optional[bool] = None,
                              sort: str = "recent", offset: int = 0, limit: int = 20):
        videos, total = await self.repo.list_published(
            category_slug=category, search=search, tag_slug=tag,
            is_free=is_free, sort=sort, skip=offset, limit=limit,
        )
        return videos, total

    async def get_by_slug(self, slug: str, current_user=None):
        video = await self.repo.get_by_slug(slug)
        if not video:
            raise NotFoundError("Video", slug)

        # Check access for paid content
        if not video.is_free and video.video_url:
            if not current_user or not await self.subscription_repo.has_active(current_user.id):
                video.video_url = None
                video.hls_url = None

        return video

    async def create(self, title: str, created_by: UUID, description: Optional[str] = None,
                     category_id: Optional[UUID] = None, tag_ids: list[UUID] = None,
                     is_free: bool = False, status: str = "draft"):
        slug = slugify(title)
        existing = await self.repo.get_by_slug(slug)
        if existing:
            slug = f"{slug}-{str(created_by)[:8]}"

        video = await self.repo.create({
            "title": title, "slug": slug, "description": description,
            "category_id": category_id, "created_by": created_by,
            "is_free": is_free, "status": status,
        })

        if tag_ids:
            tags = await self.tag_repo.get_by_ids(tag_ids)
            video.tags = list(tags)
            await self.repo.db.flush()

        return await self.repo.get_by_id(video.id)

    async def update(self, video_id: UUID, **kwargs):
        video = await self.repo.get_by_id(video_id)
        if not video:
            raise NotFoundError("Video")

        tag_ids = kwargs.pop("tag_ids", None)
        updates = {k: v for k, v in kwargs.items() if v is not None}
        if updates:
            await self.repo.update(video, updates)

        if tag_ids is not None:
            tags = await self.tag_repo.get_by_ids(tag_ids)
            video.tags = list(tags)
            await self.repo.db.flush()

        return await self.repo.get_by_id(video_id)

    async def publish(self, video_id: UUID):
        video = await self.repo.get_by_id(video_id)
        if not video:
            raise NotFoundError("Video")
        await self.repo.update(video, {
            "status": "published",
            "published_at": datetime.now(timezone.utc),
        })
        return await self.repo.get_by_id(video_id)

    async def archive(self, video_id: UUID):
        video = await self.repo.get_by_id(video_id)
        if not video:
            raise NotFoundError("Video")
        await self.repo.update(video, {"status": "archived"})

    async def list_admin(self, *, status: Optional[str] = None, search: Optional[str] = None,
                          offset: int = 0, limit: int = 20):
        return await self.repo.list_admin(status=status, search=search, skip=offset, limit=limit)
