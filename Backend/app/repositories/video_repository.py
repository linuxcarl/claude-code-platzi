from typing import Optional, Sequence
from uuid import UUID
from sqlalchemy import select, func, or_, desc, asc, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.video import Video
from app.models.tag import Tag, video_tags
from app.repositories.base import BaseRepository


class VideoRepository(BaseRepository[Video]):
    def __init__(self, db: AsyncSession):
        super().__init__(Video, db)

    def _base_query(self):
        return select(Video).options(
            selectinload(Video.category),
            selectinload(Video.tags),
        )

    async def get_by_id(self, id: UUID) -> Optional[Video]:
        result = await self.db.execute(
            self._base_query().where(Video.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Video]:
        result = await self.db.execute(
            self._base_query().where(Video.slug == slug)
        )
        return result.scalar_one_or_none()

    async def list_published(
        self,
        *,
        category_slug: Optional[str] = None,
        search: Optional[str] = None,
        tag_slug: Optional[str] = None,
        is_free: Optional[bool] = None,
        sort: str = "recent",
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Video], int]:
        query = self._base_query().where(Video.status == "published")

        if category_slug:
            from app.models.category import Category
            query = query.join(Video.category).where(Category.slug == category_slug)

        if tag_slug:
            query = query.join(Video.tags).where(Tag.slug == tag_slug)

        if is_free is not None:
            query = query.where(Video.is_free == is_free)

        if search:
            query = query.where(
                text("videos.search_vector @@ plainto_tsquery('spanish', :q)")
            ).params(q=search)

        if sort == "oldest":
            query = query.order_by(asc(Video.published_at))
        else:
            query = query.order_by(desc(Video.published_at))

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total

    async def list_admin(
        self,
        *,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Video], int]:
        query = self._base_query()

        if status:
            query = query.where(Video.status == status)
        if search:
            query = query.where(Video.title.ilike(f"%{search}%"))

        query = query.order_by(desc(Video.created_at))

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total
