"""Integration tests for /auth endpoints — hit the real FastAPI app + DB."""
import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# register
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "new_register@example.com",
        "password": "SecurePass1!",
        "full_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new_register@example.com"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "testuser@example.com",  # same as test_user fixture
        "password": "SecurePass1!",
        "full_name": "Dup",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "SecurePass1!",
        "full_name": "Bad",
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "Password1!",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data.get("token_type", "bearer") == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "WrongPass!",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "Password1!",
    })
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# me (protected route)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, user_token):
    resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "testuser@example.com"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_logout(client: AsyncClient, user_token):
    resp = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code in (200, 204)
