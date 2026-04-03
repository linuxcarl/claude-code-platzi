from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.services.subscription_service import SubscriptionService
from app.schemas.subscription import PlanResponse, SubscriptionCreate, SubscriptionResponse, PaymentHistoryItem
from app.models.user import User

router = APIRouter(tags=["subscriptions"])


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    return await SubscriptionService(db).list_plans()


@router.post("/subscriptions", response_model=SubscriptionResponse, status_code=201)
async def create_subscription(
    data: SubscriptionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await SubscriptionService(db).create_subscription(current_user.id, data.plan_id, data.billing_cycle)
    await db.refresh(sub, ["plan"])
    return sub


@router.get("/subscriptions/current")
async def get_current_subscription(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await SubscriptionService(db).get_current(current_user.id)
    if not sub:
        return None
    return SubscriptionResponse.model_validate(sub)


@router.post("/subscriptions/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await SubscriptionService(db).cancel(current_user.id)
    await db.refresh(sub, ["plan"])
    return sub


@router.get("/payments/history")
async def get_payment_history(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await SubscriptionService(db).get_payment_history(
        current_user.id, offset=offset, limit=limit
    )
    return {
        "items": [PaymentHistoryItem.model_validate(p) for p in items],
        "total": total, "offset": offset, "limit": limit,
    }
