from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError, ConflictError
from app.repositories.favorite_repository import FavoriteRepository
from app.repositories.video_repository import VideoRepository


class FavoriteService:
    def __init__(self, db: AsyncSession):
        self.repo = FavoriteRepository(db)
        self.video_repo = VideoRepository(db)

    async def add(self, user_id: UUID, video_id: UUID):
        video = await self.video_repo.get_by_id(video_id)
        if not video:
            raise NotFoundError("Video")
        existing = await self.repo.get_by_user_video(user_id, video_id)
        if existing:
            raise ConflictError("El video ya está en favoritos")
        return await self.repo.create({"user_id": user_id, "video_id": video_id})

    async def remove(self, user_id: UUID, video_id: UUID):
        favorite = await self.repo.get_by_user_video(user_id, video_id)
        if not favorite:
            raise NotFoundError("Favorito")
        await self.repo.delete(favorite)

    async def list_for_user(self, user_id: UUID, *, offset: int = 0, limit: int = 20):
        return await self.repo.list_for_user(user_id, skip=offset, limit=limit)

    async def is_favorited(self, user_id: UUID, video_id: UUID) -> bool:
        return await self.repo.is_favorited(user_id, video_id)
