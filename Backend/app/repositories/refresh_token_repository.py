from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auth import RefreshToken
from app.repositories.base import BaseRepository


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, db: AsyncSession):
        super().__init__(RefreshToken, db)

    async def get_valid_token(self, token: str) -> Optional[RefreshToken]:
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token == token,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        return result.scalar_one_or_none()

    async def revoke(self, token: RefreshToken) -> None:
        token.is_revoked = True
        await self.db.flush()

    async def revoke_all_for_user(self, user_id: UUID) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
            .values(is_revoked=True)
        )
