from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError, ConflictError
from app.repositories.subscription_repository import SubscriptionPlanRepository, SubscriptionRepository
from app.repositories.payment_repository import PaymentRepository


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.plan_repo = SubscriptionPlanRepository(db)
        self.sub_repo = SubscriptionRepository(db)
        self.payment_repo = PaymentRepository(db)

    async def list_plans(self):
        return await self.plan_repo.list_active()

    async def get_current(self, user_id: UUID):
        return await self.sub_repo.get_active_for_user(user_id)

    async def has_active(self, user_id: UUID) -> bool:
        return await self.sub_repo.has_active(user_id)

    async def create_subscription(self, user_id: UUID, plan_id: UUID, billing_cycle: str):
        plan = await self.plan_repo.get_by_id(plan_id)
        if not plan:
            raise NotFoundError("Plan")

        existing = await self.sub_repo.get_active_for_user(user_id)
        if existing and existing.status == "active":
            raise ConflictError("Ya tienes una suscripción activa")

        now = datetime.now(timezone.utc)
        period_end = now + (timedelta(days=365) if billing_cycle == "annual" else timedelta(days=30))

        subscription = await self.sub_repo.create({
            "user_id": user_id,
            "plan_id": plan_id,
            "status": "active",
            "billing_cycle": billing_cycle,
            "current_period_start": now,
            "current_period_end": period_end,
        })

        # Record payment
        price = float(plan.annual_price if billing_cycle == "annual" else plan.monthly_price)
        await self.payment_repo.create({
            "user_id": user_id,
            "subscription_id": subscription.id,
            "amount": price,
            "currency": plan.currency,
            "status": "succeeded",
            "paid_at": now,
        })

        return subscription

    async def cancel(self, user_id: UUID):
        subscription = await self.sub_repo.get_active_for_user(user_id)
        if not subscription or subscription.status != "active":
            raise NotFoundError("Suscripción activa")

        return await self.sub_repo.update(subscription, {
            "status": "canceled",
            "canceled_at": datetime.now(timezone.utc),
        })

    async def get_payment_history(self, user_id: UUID, *, offset: int = 0, limit: int = 20):
        return await self.payment_repo.list_for_user(user_id, skip=offset, limit=limit)
