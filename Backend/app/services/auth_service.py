import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password, verify_password, create_access_token
from app.core.exceptions import ConflictError, UnauthorizedError, ForbiddenError, ValidationError
from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.config import settings


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_repo = RefreshTokenRepository(db)

    async def register(self, email: str, password: str, full_name: str):
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictError("El email ya está registrado")

        user = await self.user_repo.create({
            "email": email,
            "hashed_password": hash_password(password),
            "full_name": full_name,
        })
        return user

    async def login(self, email: str, password: str) -> tuple[str, str]:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Credenciales inválidas")
        if not user.is_active:
            raise ForbiddenError("Cuenta desactivada")

        access_token = create_access_token(str(user.id))
        refresh_token = await self._create_refresh_token(user.id)
        return access_token, refresh_token

    async def refresh(self, token_value: str) -> str:
        token = await self.token_repo.get_valid_token(token_value)
        if not token:
            raise UnauthorizedError("Refresh token inválido o expirado")

        user = await self.user_repo.get_active_by_id(token.user_id)
        if not user:
            raise UnauthorizedError("Usuario no encontrado")

        return create_access_token(str(user.id))

    async def logout(self, token_value: str) -> None:
        token = await self.token_repo.get_valid_token(token_value)
        if token:
            await self.token_repo.revoke(token)

    async def change_password(self, user_id: UUID, current_password: str, new_password: str) -> None:
        user = await self.user_repo.get_by_id(user_id)
        if not user or not verify_password(current_password, user.hashed_password):
            raise ValidationError("La contraseña actual es incorrecta")

        await self.user_repo.update(user, {"hashed_password": hash_password(new_password)})
        await self.token_repo.revoke_all_for_user(user_id)

    async def _create_refresh_token(self, user_id: UUID) -> str:
        token_value = secrets.token_urlsafe(64)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await self.token_repo.create({
            "user_id": user_id,
            "token": token_value,
            "expires_at": expires_at,
        })
        return token_value
