from typing import Optional
from uuid import UUID
from fastapi import Depends, HTTPException, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedError, ForbiddenError, PaymentRequiredError
from app.repositories.user_repository import UserRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise UnauthorizedError()
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise UnauthorizedError("Token inválido o expirado")
    user = await UserRepository(db).get_by_id(UUID(user_id))
    if not user:
        raise UnauthorizedError()
    return user


async def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:
    if not user.is_active:
        raise ForbiddenError("Cuenta desactivada")
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        user_id = decode_access_token(credentials.credentials)
        if not user_id:
            return None
        return await UserRepository(db).get_by_id(UUID(user_id))
    except Exception:
        return None


def require_role(role: str):
    async def check_role(user: User = Depends(get_current_active_user)) -> User:
        if user.role != role:
            raise ForbiddenError("Permisos insuficientes")
        return user
    return check_role


async def require_active_subscription(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not await SubscriptionRepository(db).has_active(user.id):
        raise PaymentRequiredError()
    return user
