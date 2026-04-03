"""Unit tests for VideoService and WatchProgressService."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.video_service import VideoService
from app.services.watch_progress_service import WatchProgressService
from app.core.exceptions import NotFoundError


def _make_video(*, is_free=True, video_url="http://cdn/v.mp4", hls_url=None, status="published"):
    v = MagicMock()
    v.id = uuid4()
    v.title = "Test Video"
    v.slug = "test-video"
    v.is_free = is_free
    v.video_url = video_url
    v.hls_url = hls_url
    v.status = status
    return v


def _make_svc():
    svc = VideoService(AsyncMock())
    svc.repo = AsyncMock()
    svc.category_repo = AsyncMock()
    svc.tag_repo = AsyncMock()
    svc.progress_repo = AsyncMock()
    svc.favorite_repo = AsyncMock()
    svc.subscription_repo = AsyncMock()
    return svc


# ---------------------------------------------------------------------------
# list_published
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_published_returns_videos():
    svc = _make_svc()
    videos = [_make_video(), _make_video()]
    svc.repo.list_published.return_value = (videos, 2)

    result, total = await svc.list_published()

    assert len(result) == 2
    assert total == 2
    svc.repo.list_published.assert_called_once()


@pytest.mark.asyncio
async def test_list_published_passes_filters():
    svc = _make_svc()
    svc.repo.list_published.return_value = ([], 0)

    await svc.list_published(category="python", search="django", is_free=True)

    call_kwargs = svc.repo.list_published.call_args.kwargs
    assert call_kwargs["category_slug"] == "python"
    assert call_kwargs["search"] == "django"
    assert call_kwargs["is_free"] is True


# ---------------------------------------------------------------------------
# get_by_slug
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_by_slug_free_video_no_auth():
    svc = _make_svc()
    video = _make_video(is_free=True)
    svc.repo.get_by_slug.return_value = video

    result = await svc.get_by_slug("test-video", current_user=None)

    # Free video — url should remain intact
    assert result.video_url == "http://cdn/v.mp4"


@pytest.mark.asyncio
async def test_get_by_slug_paid_without_subscription_strips_url():
    svc = _make_svc()
    video = _make_video(is_free=False)
    svc.repo.get_by_slug.return_value = video

    user = MagicMock()
    user.id = uuid4()
    svc.subscription_repo.has_active.return_value = False

    result = await svc.get_by_slug("test-video", current_user=user)

    assert result.video_url is None
    assert result.hls_url is None


@pytest.mark.asyncio
async def test_get_by_slug_paid_with_active_subscription_keeps_url():
    svc = _make_svc()
    video = _make_video(is_free=False)
    svc.repo.get_by_slug.return_value = video

    user = MagicMock()
    user.id = uuid4()
    svc.subscription_repo.has_active.return_value = True

    result = await svc.get_by_slug("test-video", current_user=user)

    assert result.video_url == "http://cdn/v.mp4"


@pytest.mark.asyncio
async def test_get_by_slug_not_found_raises():
    svc = _make_svc()
    svc.repo.get_by_slug.return_value = None

    with pytest.raises(NotFoundError):
        await svc.get_by_slug("no-exist")


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_video_generates_slug():
    svc = _make_svc()
    svc.repo.get_by_slug.return_value = None  # no slug conflict
    new_video = _make_video()
    svc.repo.create.return_value = new_video

    result = await svc.create(title="My New Video", created_by=uuid4())

    assert result is new_video
    call_data = svc.repo.create.call_args[0][0]
    assert "slug" in call_data
    assert call_data["slug"] == "my-new-video"


@pytest.mark.asyncio
async def test_create_video_slug_collision_appends_suffix():
    svc = _make_svc()
    # first call returns existing (collision), second returns None
    svc.repo.get_by_slug.return_value = _make_video()  # simulate collision
    new_video = _make_video()
    svc.repo.create.return_value = new_video
    created_by = uuid4()

    result = await svc.create(title="My New Video", created_by=created_by)

    call_data = svc.repo.create.call_args[0][0]
    assert str(created_by)[:8] in call_data["slug"]


# ---------------------------------------------------------------------------
# WatchProgressService
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_watch_progress_update():
    svc = WatchProgressService(AsyncMock())
    svc.repo = AsyncMock()
    uid, vid = uuid4(), uuid4()
    progress = MagicMock()
    svc.repo.upsert.return_value = progress

    result = await svc.update_progress(uid, vid, 120, 600)

    svc.repo.upsert.assert_called_once_with(uid, vid, 120, 600)
    assert result is progress


@pytest.mark.asyncio
async def test_watch_progress_get_for_video_not_found():
    svc = WatchProgressService(AsyncMock())
    svc.repo = AsyncMock()
    svc.repo.get_for_user_video.return_value = None

    with pytest.raises(NotFoundError):
        await svc.get_for_video(uuid4(), uuid4())


@pytest.mark.asyncio
async def test_watch_progress_get_history():
    svc = WatchProgressService(AsyncMock())
    svc.repo = AsyncMock()
    svc.repo.list_history.return_value = ([], 0)

    await svc.get_history(uuid4(), completed=True)

    svc.repo.list_history.assert_called_once()
    call_kwargs = svc.repo.list_history.call_args.kwargs
    assert call_kwargs["completed"] is True
