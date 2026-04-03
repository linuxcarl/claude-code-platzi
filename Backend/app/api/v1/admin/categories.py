from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import require_role
from app.services.category_service import CategoryService
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.models.user import User

router = APIRouter(prefix="/admin/categories", tags=["admin"])
admin_user = require_role("admin")


@router.get("")
async def list_categories(_: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    from app.repositories.category_repository import CategoryRepository
    cats = await CategoryRepository(db).get_all(limit=100)
    return {"items": [CategoryResponse.model_validate(c) for c in cats], "total": len(cats)}


@router.post("", status_code=201)
async def create_category(data: CategoryCreate, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    cat = await CategoryService(db).create(data.name, data.description, data.image_url)
    return CategoryResponse.model_validate(cat)


@router.patch("/{category_id}")
async def update_category(category_id: UUID, data: CategoryUpdate, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    cat = await CategoryService(db).update(category_id, **data.model_dump(exclude_none=True))
    return CategoryResponse.model_validate(cat)


@router.delete("/{category_id}", status_code=204)
async def deactivate_category(category_id: UUID, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    await CategoryService(db).deactivate(category_id)
