from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def get_profile(self, user_id: UUID):
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("Usuario")
        return user

    async def update_profile(self, user_id: UUID, full_name: Optional[str], avatar_url: Optional[str]):
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("Usuario")
        updates = {}
        if full_name is not None:
            updates["full_name"] = full_name
        if avatar_url is not None:
            updates["avatar_url"] = avatar_url
        if updates:
            user = await self.user_repo.update(user, updates)
        return user
