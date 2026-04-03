from typing import Optional
from uuid import UUID
from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError, ConflictError
from app.repositories.category_repository import CategoryRepository


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.repo = CategoryRepository(db)

    async def list_active(self, include_count: bool = False):
        categories = await self.repo.list_active()
        if include_count:
            result = []
            for cat in categories:
                count = await self.repo.count_videos(cat.id)
                result.append((cat, count))
            return result
        return [(cat, None) for cat in categories]

    async def get_by_slug(self, slug: str):
        category = await self.repo.get_by_slug(slug)
        if not category:
            raise NotFoundError("Categoría", slug)
        return category

    async def create(self, name: str, description: Optional[str] = None, image_url: Optional[str] = None):
        slug = slugify(name)
        existing = await self.repo.get_by_slug(slug)
        if existing:
            raise ConflictError(f"Ya existe una categoría con el slug '{slug}'")
        return await self.repo.create({"name": name, "slug": slug, "description": description, "image_url": image_url})

    async def update(self, category_id: UUID, **kwargs):
        category = await self.repo.get_by_id(category_id)
        if not category:
            raise NotFoundError("Categoría")
        return await self.repo.update(category, {k: v for k, v in kwargs.items() if v is not None})

    async def deactivate(self, category_id: UUID):
        category = await self.repo.get_by_id(category_id)
        if not category:
            raise NotFoundError("Categoría")
        await self.repo.update(category, {"is_active": False})
