from fastapi import APIRouter, Depends, Response, Cookie, Request
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ChangePasswordRequest, MessageResponse
from app.schemas.user import UserResponse
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService(db).register(data.email, data.password, data.full_name)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token = await AuthService(db).login(data.email, data.password)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # True in production
        samesite="strict",
        path="/api/v1/auth",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: Optional[str] = Cookie(None), db: AsyncSession = Depends(get_db)):
    from app.core.exceptions import UnauthorizedError
    if not refresh_token:
        raise UnauthorizedError("Refresh token no encontrado")
    access_token = await AuthService(db).refresh(refresh_token)
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        await AuthService(db).logout(refresh_token)
    response.delete_cookie("refresh_token", path="/api/v1/auth")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await AuthService(db).change_password(current_user.id, data.current_password, data.new_password)
    return MessageResponse(message="Contraseña actualizada exitosamente")
