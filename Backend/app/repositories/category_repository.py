from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category
from app.models.video import Video
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, db: AsyncSession):
        super().__init__(Category, db)

    async def get_by_slug(self, slug: str) -> Optional[Category]:
        result = await self.db.execute(select(Category).where(Category.slug == slug))
        return result.scalar_one_or_none()

    async def list_active(self) -> Sequence[Category]:
        result = await self.db.execute(
            select(Category)
            .where(Category.is_active == True)
            .order_by(Category.sort_order, Category.name)
        )
        return result.scalars().all()

    async def count_videos(self, category_id) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Video).where(
                Video.category_id == category_id, Video.status == "published"
            )
        )
        return result.scalar_one()
