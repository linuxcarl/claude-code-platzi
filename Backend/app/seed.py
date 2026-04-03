"""Seed script: populates DB with initial data."""
import asyncio
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
# Import all models to register relationships
from app.models.base import Base  # noqa
from app.models.auth import RefreshToken  # noqa
from app.models.watch_progress import WatchProgress  # noqa
from app.models.favorite import Favorite  # noqa
from app.models.subscription import SubscriptionPlan, Subscription  # noqa
from app.models.payment import Payment  # noqa
from app.models.user import User
from app.models.category import Category
from app.models.tag import Tag, video_tags  # noqa
from app.models.video import Video


async def seed():
    async with AsyncSessionLocal() as db:
        # Admin user
        admin = User(
            email="admin@platziflix.com",
            hashed_password=hash_password("Admin123!"),
            full_name="Admin Platziflix",
            role="admin",
        )
        db.add(admin)
        await db.flush()

        # Test user
        user = User(
            email="user@platziflix.com",
            hashed_password=hash_password("User123!"),
            full_name="Usuario Test",
            role="user",
        )
        db.add(user)

        # Categories
        cats = [
            Category(name="Desarrollo Web", slug="desarrollo-web", description="Cursos de desarrollo web frontend y backend", sort_order=1),
            Category(name="Data Science", slug="data-science", description="Python, Machine Learning, IA", sort_order=2),
            Category(name="DevOps", slug="devops", description="Docker, Kubernetes, CI/CD", sort_order=3),
        ]
        for c in cats:
            db.add(c)
        await db.flush()

        # Tags
        tags = [
            Tag(name="Python", slug="python"),
            Tag(name="FastAPI", slug="fastapi"),
            Tag(name="JavaScript", slug="javascript"),
            Tag(name="React", slug="react"),
            Tag(name="Docker", slug="docker"),
        ]
        for t in tags:
            db.add(t)
        await db.flush()

        # Videos
        videos = [
            Video(title="Introducción a FastAPI", slug="introduccion-fastapi", description="Aprende FastAPI desde cero con ejemplos prácticos", is_free=True, status="published", category_id=cats[0].id, created_by=admin.id),
            Video(title="SQLAlchemy 2.0 Avanzado", slug="sqlalchemy-2-avanzado", description="Domina el ORM más potente de Python", is_free=False, status="published", category_id=cats[0].id, created_by=admin.id),
            Video(title="Python para Data Science", slug="python-data-science", description="NumPy, Pandas y visualización de datos", is_free=True, status="published", category_id=cats[1].id, created_by=admin.id),
            Video(title="Docker y Docker Compose", slug="docker-docker-compose", description="Containeriza tus aplicaciones profesionalmente", is_free=False, status="published", category_id=cats[2].id, created_by=admin.id),
            Video(title="Next.js 15 Full Stack", slug="nextjs-15-fullstack", description="Crea aplicaciones full stack modernas con Next.js", is_free=False, status="published", category_id=cats[0].id, created_by=admin.id),
        ]
        for v in videos:
            db.add(v)
        await db.flush()

        # Assign tags via direct insert into pivot table
        from sqlalchemy import insert, text
        tag_assignments = [
            (videos[0].id, tags[0].id), (videos[0].id, tags[1].id),
            (videos[1].id, tags[0].id), (videos[1].id, tags[1].id),
            (videos[2].id, tags[0].id),
            (videos[3].id, tags[4].id),
            (videos[4].id, tags[2].id), (videos[4].id, tags[3].id),
        ]
        for vid_id, tag_id in tag_assignments:
            await db.execute(
                text("INSERT INTO video_tags (video_id, tag_id) VALUES (:vid, :tag)"),
                {"vid": vid_id, "tag": tag_id},
            )

        # Subscription plans
        plans = [
            SubscriptionPlan(name="Básico", slug="basico", description="Acceso a contenido básico", monthly_price=9.99, annual_price=99.99, currency="USD", features=["Acceso a videos básicos", "Soporte por email"], sort_order=1),
            SubscriptionPlan(name="Premium", slug="premium", description="Acceso completo a todo el contenido", monthly_price=19.99, annual_price=199.99, currency="USD", features=["Acceso a todos los videos", "Soporte prioritario", "Descargas offline"], sort_order=2),
        ]
        for p in plans:
            db.add(p)

        await db.commit()
        print("✓ Seed completado: admin, usuarios, categorías, tags, videos, planes")


if __name__ == "__main__":
    asyncio.run(seed())
