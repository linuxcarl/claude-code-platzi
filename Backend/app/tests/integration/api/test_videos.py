"""Integration tests for /videos endpoints — list with filters, get by slug, paywall."""
import pytest
from httpx import AsyncClient
from uuid import uuid4
from app.core.security import hash_password


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_category(db, name="Programación"):
    from app.repositories.category_repository import CategoryRepository
    from slugify import slugify
    repo = CategoryRepository(db)
    cat = await repo.create({"name": name, "slug": slugify(name), "sort_order": 1})
    await db.flush()
    return cat


async def _create_video(db, created_by, *, title="Test Video", is_free=True, status="published",
                         category_id=None, video_url="http://cdn/test.mp4"):
    from app.repositories.video_repository import VideoRepository
    from slugify import slugify
    repo = VideoRepository(db)
    uid = uuid4()
    video = await repo.create({
        "title": title,
        "slug": slugify(title) + f"-{str(uid)[:6]}",
        "is_free": is_free,
        "status": status,
        "category_id": category_id,
        "video_url": video_url,
        "created_by": created_by,
    })
    await db.flush()
    return video


# ---------------------------------------------------------------------------
# List videos
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_videos_returns_published(client: AsyncClient, db, test_user):
    await _create_video(db, test_user.id, title="Published Free", is_free=True, status="published")
    await _create_video(db, test_user.id, title="Draft Video", is_free=True, status="draft")

    resp = await client.get("/api/v1/videos")

    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    # draft videos should not appear
    titles = [v["title"] for v in data["items"]]
    assert "Draft Video" not in titles


@pytest.mark.asyncio
async def test_list_videos_free_filter(client: AsyncClient, db, test_user):
    await _create_video(db, test_user.id, title="Free Vid", is_free=True, status="published")
    await _create_video(db, test_user.id, title="Premium Vid", is_free=False, status="published")

    resp = await client.get("/api/v1/videos?is_free=true")

    assert resp.status_code == 200
    items = resp.json()["items"]
    assert all(v["is_free"] for v in items)


@pytest.mark.asyncio
async def test_list_videos_search_filter(client: AsyncClient, db, test_user):
    await _create_video(db, test_user.id, title="Python Basics", is_free=True, status="published")
    await _create_video(db, test_user.id, title="Django Advanced", is_free=True, status="published")

    resp = await client.get("/api/v1/videos?search=Python")

    assert resp.status_code == 200
    items = resp.json()["items"]
    for v in items:
        assert "python" in v["title"].lower() or "python" in (v.get("description") or "").lower()


@pytest.mark.asyncio
async def test_list_videos_pagination(client: AsyncClient, db, test_user):
    for i in range(5):
        await _create_video(db, test_user.id, title=f"Paginated Video {i}", status="published")

    # The API uses offset/limit (not page/page_size)
    resp = await client.get("/api/v1/videos?limit=2")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) <= 2


# ---------------------------------------------------------------------------
# Get by slug
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_video_by_slug_free(client: AsyncClient, db, test_user):
    video = await _create_video(db, test_user.id, title="Free Slug Video", is_free=True, status="published")

    resp = await client.get(f"/api/v1/videos/{video.slug}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == video.slug
    # Free video → url present even without auth
    assert data["video_url"] == "http://cdn/test.mp4"


@pytest.mark.asyncio
async def test_get_video_by_slug_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/videos/this-slug-does-not-exist")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Paywall
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_paid_video_without_auth_strips_url(client: AsyncClient, db, test_user):
    video = await _create_video(db, test_user.id, title="Premium Paywall Video", is_free=False, status="published")

    resp = await client.get(f"/api/v1/videos/{video.slug}")

    assert resp.status_code == 200
    data = resp.json()
    # video_url should be None/null for unauthenticated users on paid content
    assert data["video_url"] is None


@pytest.mark.asyncio
async def test_get_paid_video_with_auth_but_no_subscription_strips_url(
    client: AsyncClient, db, test_user, user_token
):
    video = await _create_video(db, test_user.id, title="Premium No Sub Video", is_free=False, status="published")

    resp = await client.get(
        f"/api/v1/videos/{video.slug}",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert resp.status_code == 200
    assert resp.json()["video_url"] is None


# ---------------------------------------------------------------------------
# Category filter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_videos_by_category(client: AsyncClient, db, test_user):
    # Use a unique category name to avoid collisions with seed data
    cat = await _create_category(db, "UniqueTestCat12345")
    await _create_video(db, test_user.id, title="FastAPI Course XYZ", status="published", category_id=cat.id)

    resp = await client.get(f"/api/v1/videos?category_slug={cat.slug}")

    assert resp.status_code == 200
    items = resp.json()["items"]
    # Our specific video should appear in the filtered results
    titles = [v["title"] for v in items]
    assert "FastAPI Course XYZ" in titles
