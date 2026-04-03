from typing import Optional, Sequence
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.subscription import SubscriptionPlan, Subscription
from app.repositories.base import BaseRepository


class SubscriptionPlanRepository(BaseRepository[SubscriptionPlan]):
    def __init__(self, db: AsyncSession):
        super().__init__(SubscriptionPlan, db)

    async def list_active(self) -> Sequence[SubscriptionPlan]:
        result = await self.db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active == True)
            .order_by(SubscriptionPlan.sort_order)
        )
        return result.scalars().all()


class SubscriptionRepository(BaseRepository[Subscription]):
    def __init__(self, db: AsyncSession):
        super().__init__(Subscription, db)

    async def get_active_for_user(self, user_id: UUID) -> Optional[Subscription]:
        result = await self.db.execute(
            select(Subscription)
            .options(selectinload(Subscription.plan))
            .where(
                Subscription.user_id == user_id,
                Subscription.status.in_(["active", "canceled"]),
            )
            .order_by(Subscription.current_period_end.desc())
        )
        return result.scalar_one_or_none()

    async def has_active(self, user_id: UUID) -> bool:
        from datetime import datetime, timezone
        from sqlalchemy import and_
        result = await self.db.execute(
            select(Subscription).where(
                and_(
                    Subscription.user_id == user_id,
                    Subscription.status == "active",
                    Subscription.current_period_end > datetime.now(timezone.utc),
                )
            )
        )
        return result.scalar_one_or_none() is not None
