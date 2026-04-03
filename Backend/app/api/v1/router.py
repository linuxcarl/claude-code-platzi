from fastapi import APIRouter
from app.api.v1 import auth, users, videos, categories, tags, watch_progress, favorites, subscriptions
from app.api.v1.admin import videos as admin_videos, categories as admin_categories, users as admin_users

api_router = APIRouter()


@api_router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "platziflix-api"}


api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(videos.router)
api_router.include_router(categories.router)
api_router.include_router(tags.router)
api_router.include_router(watch_progress.router)
api_router.include_router(favorites.router)
api_router.include_router(subscriptions.router)
api_router.include_router(admin_videos.router)
api_router.include_router(admin_categories.router)
api_router.include_router(admin_users.router)
