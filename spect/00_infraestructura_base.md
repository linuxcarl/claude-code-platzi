# Technical Analysis: Infraestructura Base (Fase 0)

> Platziflix - Plataforma de video streaming educativo
> Fase: 0 de 6
> Semana estimada: 1
> Dependencias: Ninguna
>
> **Agentes asignados**:
> - `@backend` — Scaffolding FastAPI, config, database, models base, repositories, exceptions, Docker, pytest
> - `@frontend` — Scaffolding Next.js, Tailwind, componentes UI base, layouts, cliente HTTP

---

## Problema

Establecer la base del proyecto desde cero: estructura de directorios, configuracion de base de datos, containerizacion, y las abstracciones fundamentales (mixins, BaseRepository, exception handlers) sobre las cuales se construiran todos los modulos posteriores. Sin esta fase, ninguna otra puede comenzar.

## Impacto Arquitectonico

- **Backend**: Scaffolding completo de FastAPI con Clean Architecture, configuracion de Alembic, database engine async, middleware transversal
- **Frontend**: Scaffolding de Next.js con TypeScript, Tailwind CSS, cliente HTTP base, componentes UI fundamentales
- **Database**: PostgreSQL levantado via Docker, engine SQLAlchemy async conectado, migraciones configuradas
- **Security**: Estructura de manejo de errores unificada, request ID para trazabilidad
- **Performance**: Async desde el dia uno (asyncpg), estructura preparada para indices y cache

---

## Solucion Propuesta

### Estructura del Backend

```
backend/
|-- alembic/
|   |-- versions/
|   |-- env.py
|   |-- alembic.ini
|
|-- app/
|   |-- __init__.py
|   |-- main.py                       # FastAPI app factory, middleware, CORS
|   |-- config.py                     # Settings con Pydantic BaseSettings
|   |
|   |-- api/
|   |   |-- __init__.py
|   |   |-- deps.py                   # Dependencias compartidas (get_db)
|   |   |-- v1/
|   |   |   |-- __init__.py
|   |   |   |-- router.py             # Router principal
|   |
|   |-- schemas/
|   |   |-- __init__.py
|   |   |-- common.py                 # PaginationParams, PaginatedResponse, ErrorResponse
|   |
|   |-- services/
|   |   |-- __init__.py
|   |
|   |-- repositories/
|   |   |-- __init__.py
|   |   |-- base.py                   # BaseRepository con CRUD generico
|   |
|   |-- models/
|   |   |-- __init__.py
|   |   |-- base.py                   # Base, TimestampMixin, UUIDPrimaryKeyMixin
|   |
|   |-- core/
|   |   |-- __init__.py
|   |   |-- exceptions.py             # Excepciones de dominio
|   |   |-- middleware.py              # Request ID, logging
|   |   |-- database.py               # Engine, SessionLocal, get_db
|   |
|   |-- tests/
|   |   |-- __init__.py
|   |   |-- conftest.py               # Fixtures compartidas (test DB, client)
|   |   |-- unit/
|   |   |-- integration/
|
|-- requirements/
|   |-- base.txt
|   |-- dev.txt
|   |-- test.txt
|
|-- Dockerfile
|-- pyproject.toml
|-- .env.example
```

### Estructura del Frontend

```
frontend/
|-- public/
|   |-- images/
|   |-- favicon.ico
|
|-- src/
|   |-- app/
|   |   |-- layout.tsx               # Root layout
|   |   |-- page.tsx                  # Home placeholder
|   |   |-- not-found.tsx
|   |   |-- error.tsx
|   |   |-- loading.tsx
|   |
|   |-- components/
|   |   |-- ui/                       # Button, Input, Modal, Card
|   |   |-- layout/                   # Navbar, Footer
|   |
|   |-- lib/
|   |   |-- api/
|   |   |   |-- client.ts             # Base client con interceptors
|   |   |-- utils/
|   |   |-- types/
|   |   |   |-- common.ts
|
|-- tailwind.config.ts
|-- next.config.ts
|-- tsconfig.json
|-- package.json
|-- .env.local.example
```

### Codigo Clave: Models Base

```python
# backend/app/models/base.py
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class UUIDPrimaryKeyMixin:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

### Codigo Clave: BaseRepository

```python
# backend/app/repositories/base.py
from typing import TypeVar, Generic, Type, Optional, Sequence
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID) -> Optional[ModelType]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self, *, skip: int = 0, limit: int = 20
    ) -> Sequence[ModelType]:
        result = await self.db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def count(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar_one()

    async def create(self, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete(self, db_obj: ModelType) -> None:
        await self.db.delete(db_obj)
        await self.db.flush()
```

### Codigo Clave: Manejo de Errores Unificado

```python
# backend/app/core/exceptions.py
from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: dict = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message=f"{resource} '{identifier}' no encontrado",
            status_code=404,
        )


class ConflictError(AppException):
    def __init__(self, message: str):
        super().__init__(code="CONFLICT", message=message, status_code=409)


class ForbiddenError(AppException):
    def __init__(self, message: str = "No tienes permisos para esta accion"):
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


# Exception handler para registrar en FastAPI
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )
```

### Codigo Clave: Configuracion

```python
# backend/app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Platziflix API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://platziflix:password@localhost:5432/platziflix"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: platziflix
      POSTGRES_PASSWORD: password
      POSTGRES_DB: platziflix
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U platziflix"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://platziflix:password@db:5432/platziflix
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1

volumes:
  pgdata:
```

### Schemas Comunes

```python
# backend/app/schemas/common.py
from typing import TypeVar, Generic, Sequence, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    items: Sequence[T]
    total: int
    offset: int
    limit: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
    request_id: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
```

---

## Checklist de Implementacion

### Backend
- [ ] Inicializar proyecto FastAPI con estructura de directorios
- [ ] Configurar `pyproject.toml`, requirements, linting (ruff), formatting (black)
- [ ] Implementar `config.py` con Pydantic BaseSettings
- [ ] Implementar `core/database.py` con engine async y session factory
- [ ] Implementar `models/base.py` con mixins (Base, TimestampMixin, UUIDPrimaryKeyMixin)
- [ ] Configurar Alembic para migraciones
- [ ] Implementar `repositories/base.py` con CRUD generico
- [ ] Implementar middleware de request ID y logging
- [ ] Implementar `core/exceptions.py` y exception handlers globales
- [ ] Implementar `schemas/common.py` (PaginationParams, PaginatedResponse, ErrorResponse)
- [ ] Endpoint `GET /health` con check de BD
- [ ] Configurar Docker + docker-compose (app + postgres)
- [ ] Configurar pytest con fixtures de test DB

### Frontend
- [ ] Inicializar proyecto Next.js con TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar ESLint + Prettier
- [ ] Implementar `lib/api/client.ts` (fetch wrapper con interceptors)
- [ ] Implementar componentes UI base (Button, Input, Modal, Card)
- [ ] Implementar layouts base (root, main con navbar)
- [ ] Configurar variables de entorno

---

## Criterio de Completitud

`docker-compose up` levanta backend + postgres, `GET /health` responde 200, frontend renderiza layout base en `http://localhost:3000`.
