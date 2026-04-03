from typing import Optional, Sequence
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.watch_progress import WatchProgress
from app.repositories.base import BaseRepository


class WatchProgressRepository(BaseRepository[WatchProgress]):
    def __init__(self, db: AsyncSession):
        super().__init__(WatchProgress, db)

    async def get_for_user_video(self, user_id: UUID, video_id: UUID) -> Optional[WatchProgress]:
        result = await self.db.execute(
            select(WatchProgress).where(
                WatchProgress.user_id == user_id,
                WatchProgress.video_id == video_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self, user_id: UUID, video_id: UUID, watched_seconds: int, total_seconds: int
    ) -> WatchProgress:
        existing = await self.get_for_user_video(user_id, video_id)
        is_completed = total_seconds > 0 and watched_seconds >= total_seconds * 0.9
        now = datetime.now(timezone.utc)

        if existing:
            existing.watched_seconds = watched_seconds
            existing.total_seconds = total_seconds
            existing.is_completed = is_completed
            existing.last_watched_at = now
            await self.db.flush()
            await self.db.refresh(existing)
            return existing

        return await self.create({
            "user_id": user_id,
            "video_id": video_id,
            "watched_seconds": watched_seconds,
            "total_seconds": total_seconds,
            "is_completed": is_completed,
            "last_watched_at": now,
        })

    async def list_history(
        self,
        user_id: UUID,
        *,
        completed: Optional[bool] = None,
        sort: str = "recent",
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[WatchProgress], int]:
        query = (
            select(WatchProgress)
            .options(selectinload(WatchProgress.video))
            .where(WatchProgress.user_id == user_id)
        )

        if completed is not None:
            query = query.where(WatchProgress.is_completed == completed)

        if sort == "oldest":
            query = query.order_by(asc(WatchProgress.last_watched_at))
        else:
            query = query.order_by(desc(WatchProgress.last_watched_at))

        count_result = await self.db.execute(
            select(func.count()).select_from(
                select(WatchProgress).where(WatchProgress.user_id == user_id).subquery()
            )
        )
        total = count_result.scalar_one()

        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total
