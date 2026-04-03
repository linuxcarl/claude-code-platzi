from typing import Optional, Sequence
from uuid import UUID
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.favorite import Favorite
from app.repositories.base import BaseRepository


class FavoriteRepository(BaseRepository[Favorite]):
    def __init__(self, db: AsyncSession):
        super().__init__(Favorite, db)

    async def get_by_user_video(self, user_id: UUID, video_id: UUID) -> Optional[Favorite]:
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.video_id == video_id,
            )
        )
        return result.scalar_one_or_none()

    async def is_favorited(self, user_id: UUID, video_id: UUID) -> bool:
        return await self.get_by_user_video(user_id, video_id) is not None

    async def list_for_user(
        self, user_id: UUID, *, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[Favorite], int]:
        query = (
            select(Favorite)
            .options(selectinload(Favorite.video))
            .where(Favorite.user_id == user_id)
            .order_by(desc(Favorite.created_at))
        )
        count_result = await self.db.execute(
            select(func.count()).select_from(
                select(Favorite).where(Favorite.user_id == user_id).subquery()
            )
        )
        total = count_result.scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total
