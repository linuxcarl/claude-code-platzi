"""
Shared fixtures for all tests.

Integration tests use httpx.AsyncClient against the real FastAPI app + DB.
Unit tests mock the database session directly.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import create_app
from app.core.database import get_db
from app.core.security import hash_password
from app.config import settings


# ---------------------------------------------------------------------------
# Database session (function-scoped — each test gets its own connection)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db():
    """Yield an async DB session; rollback after each test for isolation."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()
    await engine.dispose()


# ---------------------------------------------------------------------------
# FastAPI app + HTTP client
# ---------------------------------------------------------------------------

@pytest.fixture
def app():
    return create_app()


@pytest_asyncio.fixture
async def client(app, db):
    """AsyncClient wired to the test DB session via dependency override."""

    async def _override_db():
        yield db

    app.dependency_overrides[get_db] = _override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def test_user(db):
    """Create a regular user and return its data."""
    from app.repositories.user_repository import UserRepository
    repo = UserRepository(db)
    user = await repo.create({
        "email": "testuser@example.com",
        "hashed_password": hash_password("Password1!"),
        "full_name": "Test User",
        "role": "user",
        "is_active": True,
    })
    await db.flush()
    return user


@pytest_asyncio.fixture
async def test_admin(db):
    """Create an admin user and return its data."""
    from app.repositories.user_repository import UserRepository
    repo = UserRepository(db)
    user = await repo.create({
        "email": "testadmin@example.com",
        "hashed_password": hash_password("Admin123!"),
        "full_name": "Test Admin",
        "role": "admin",
        "is_active": True,
    })
    await db.flush()
    return user


@pytest_asyncio.fixture
async def user_token(client, test_user):
    """Login as test_user, return access token."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "Password1!",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_token(client, test_admin):
    """Login as test_admin, return access token."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": "testadmin@example.com",
        "password": "Admin123!",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]
