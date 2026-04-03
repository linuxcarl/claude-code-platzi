from typing import Sequence, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tag import Tag
from app.repositories.base import BaseRepository


class TagRepository(BaseRepository[Tag]):
    def __init__(self, db: AsyncSession):
        super().__init__(Tag, db)

    async def get_by_slug(self, slug: str) -> Optional[Tag]:
        result = await self.db.execute(select(Tag).where(Tag.slug == slug))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Tag]:
        result = await self.db.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()

    async def search(self, query: Optional[str] = None) -> Sequence[Tag]:
        stmt = select(Tag).order_by(Tag.name)
        if query:
            stmt = stmt.where(Tag.name.ilike(f"{query}%"))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_ids(self, ids: list) -> Sequence[Tag]:
        result = await self.db.execute(select(Tag).where(Tag.id.in_(ids)))
        return result.scalars().all()
