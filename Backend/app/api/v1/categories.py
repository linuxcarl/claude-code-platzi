from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.category_service import CategoryService
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def list_categories(
    include_count: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    items = await CategoryService(db).list_active(include_count=include_count)
    result = []
    for cat, count in items:
        data = CategoryResponse.model_validate(cat)
        if include_count:
            data.video_count = count
        result.append(data)
    return {"items": result, "total": len(result)}


@router.get("/{slug}", response_model=CategoryResponse)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    return await CategoryService(db).get_by_slug(slug)
