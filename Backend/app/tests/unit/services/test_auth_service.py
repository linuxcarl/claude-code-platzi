"""Unit tests for AuthService — mock the DB session."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone

from app.services.auth_service import AuthService
from app.core.exceptions import ConflictError, UnauthorizedError, ForbiddenError, ValidationError


def _make_user(*, email="u@example.com", is_active=True, role="user"):
    user = MagicMock()
    user.id = uuid4()
    user.email = email
    user.full_name = "Test User"
    user.hashed_password = "$2b$12$hashed"
    user.is_active = is_active
    user.role = role
    return user


def _make_service(db=None):
    return AuthService(db or AsyncMock())


# ---------------------------------------------------------------------------
# register
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_success():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    svc.token_repo = AsyncMock()
    svc.user_repo.get_by_email.return_value = None
    new_user = _make_user()
    svc.user_repo.create.return_value = new_user

    result = await svc.register("new@example.com", "Password1!", "New User")

    svc.user_repo.create.assert_called_once()
    assert result is new_user


@pytest.mark.asyncio
async def test_register_duplicate_email_raises_conflict():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    svc.user_repo.get_by_email.return_value = _make_user()

    with pytest.raises(ConflictError):
        await svc.register("existing@example.com", "Password1!", "Dup")


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_success():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    svc.token_repo = AsyncMock()
    user = _make_user()
    svc.user_repo.get_by_email.return_value = user

    with patch("app.services.auth_service.verify_password", return_value=True), \
         patch("app.services.auth_service.create_access_token", return_value="access-tok"), \
         patch.object(svc, "_create_refresh_token", new=AsyncMock(return_value="refresh-tok")):

        access, refresh = await svc.login("u@example.com", "Password1!")

    assert access == "access-tok"
    assert refresh == "refresh-tok"


@pytest.mark.asyncio
async def test_login_wrong_password_raises_unauthorized():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    user = _make_user()
    svc.user_repo.get_by_email.return_value = user

    with patch("app.services.auth_service.verify_password", return_value=False):
        with pytest.raises(UnauthorizedError):
            await svc.login("u@example.com", "wrong")


@pytest.mark.asyncio
async def test_login_unknown_user_raises_unauthorized():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    svc.user_repo.get_by_email.return_value = None

    with pytest.raises(UnauthorizedError):
        await svc.login("ghost@example.com", "Password1!")


@pytest.mark.asyncio
async def test_login_inactive_user_raises_forbidden():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    user = _make_user(is_active=False)
    svc.user_repo.get_by_email.return_value = user

    with patch("app.services.auth_service.verify_password", return_value=True):
        with pytest.raises(ForbiddenError):
            await svc.login("u@example.com", "Password1!")


# ---------------------------------------------------------------------------
# refresh
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refresh_valid_token():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    svc.token_repo = AsyncMock()

    token_obj = MagicMock()
    token_obj.user_id = uuid4()
    svc.token_repo.get_valid_token.return_value = token_obj
    svc.user_repo.get_active_by_id.return_value = _make_user()

    with patch("app.services.auth_service.create_access_token", return_value="new-access"):
        result = await svc.refresh("valid-refresh")

    assert result == "new-access"


@pytest.mark.asyncio
async def test_refresh_invalid_token_raises_unauthorized():
    svc = _make_service()
    svc.token_repo = AsyncMock()
    svc.token_repo.get_valid_token.return_value = None

    with pytest.raises(UnauthorizedError):
        await svc.refresh("bad-token")


# ---------------------------------------------------------------------------
# change_password
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_change_password_wrong_current_raises_validation():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    svc.token_repo = AsyncMock()
    user = _make_user()
    svc.user_repo.get_by_id.return_value = user

    with patch("app.services.auth_service.verify_password", return_value=False):
        with pytest.raises(ValidationError):
            await svc.change_password(user.id, "wrong-current", "NewPass1!")


@pytest.mark.asyncio
async def test_change_password_success():
    svc = _make_service()
    svc.user_repo = AsyncMock()
    svc.token_repo = AsyncMock()
    user = _make_user()
    svc.user_repo.get_by_id.return_value = user

    with patch("app.services.auth_service.verify_password", return_value=True), \
         patch("app.services.auth_service.hash_password", return_value="new-hash"):
        await svc.change_password(user.id, "OldPass1!", "NewPass1!")

    svc.user_repo.update.assert_called_once_with(user, {"hashed_password": "new-hash"})
    svc.token_repo.revoke_all_for_user.assert_called_once_with(user.id)
