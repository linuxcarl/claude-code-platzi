from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.api.deps import require_role
from app.models.user import User
from app.models.video import Video
from app.models.category import Category
from app.models.subscription import Subscription
from app.models.payment import Payment

router = APIRouter(prefix="/admin/dashboard", tags=["admin"])
admin_user = require_role("admin")


@router.get("/stats")
async def get_stats(
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_videos = await db.scalar(select(func.count()).select_from(Video))
    published_videos = await db.scalar(
        select(func.count()).select_from(Video).where(Video.status == "published")
    )
    total_users = await db.scalar(select(func.count()).select_from(User))
    total_categories = await db.scalar(select(func.count()).select_from(Category))
    active_subscriptions = await db.scalar(
        select(func.count()).select_from(Subscription).where(Subscription.status == "active")
    )
    total_revenue = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "succeeded")
    )

    return {
        "total_videos": total_videos or 0,
        "published_videos": published_videos or 0,
        "total_users": total_users or 0,
        "total_categories": total_categories or 0,
        "active_subscriptions": active_subscriptions or 0,
        "total_revenue": float(total_revenue or 0),
    }
