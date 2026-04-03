from typing import Optional, Sequence
from uuid import UUID
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment import Payment
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Payment, db)

    async def get_by_gateway_id(self, gateway_payment_id: str) -> Optional[Payment]:
        result = await self.db.execute(
            select(Payment).where(Payment.gateway_payment_id == gateway_payment_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self, user_id: UUID, *, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[Payment], int]:
        query = (
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(desc(Payment.created_at))
        )
        count_result = await self.db.execute(
            select(func.count()).select_from(
                select(Payment).where(Payment.user_id == user_id).subquery()
            )
        )
        total = count_result.scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total
