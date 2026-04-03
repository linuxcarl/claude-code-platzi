from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.tag_repository import TagRepository

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("")
async def list_tags(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    tags = await TagRepository(db).search(search)
    return {"items": [{"id": t.id, "name": t.name, "slug": t.slug} for t in tags], "total": len(tags)}
