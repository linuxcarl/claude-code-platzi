from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError
from app.repositories.watch_progress_repository import WatchProgressRepository


class WatchProgressService:
    def __init__(self, db: AsyncSession):
        self.repo = WatchProgressRepository(db)

    async def update_progress(self, user_id: UUID, video_id: UUID, watched_seconds: int, total_seconds: int):
        return await self.repo.upsert(user_id, video_id, watched_seconds, total_seconds)

    async def get_history(self, user_id: UUID, *, completed: Optional[bool] = None,
                           sort: str = "recent", offset: int = 0, limit: int = 20):
        return await self.repo.list_history(
            user_id, completed=completed, sort=sort, skip=offset, limit=limit
        )

    async def get_for_video(self, user_id: UUID, video_id: UUID):
        progress = await self.repo.get_for_user_video(user_id, video_id)
        if not progress:
            raise NotFoundError("Progreso")
        return progress
