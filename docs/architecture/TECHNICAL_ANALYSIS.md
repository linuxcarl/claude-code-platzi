# Analisis Tecnico Completo: Platziflix

> Plataforma de video streaming educativo  
> Fecha: 2026-04-02  
> Estado: Greenfield MVP  
> Autor: Arquitectura de Software

---

## Tabla de Contenidos

1. [Problema y Contexto](#1-problema-y-contexto)
2. [Decisiones Arquitectonicas Clave](#2-decisiones-arquitectonicas-clave)
3. [Diagrama ER de Base de Datos](#3-diagrama-er-de-base-de-datos)
4. [Database Schema Completo](#4-database-schema-completo)
5. [Arquitectura de Capas y Estructura de Directorios](#5-arquitectura-de-capas-y-estructura-de-directorios)
6. [API Contracts por Modulo](#6-api-contracts-por-modulo)
7. [Security Considerations](#7-security-considerations)
8. [Plan de Implementacion por Fases](#8-plan-de-implementacion-por-fases)

---

## 1. Problema y Contexto

### Que estamos construyendo

Platziflix es una plataforma de video streaming educativo que permite a los usuarios descubrir, reproducir y trackear su progreso en contenido de video organizado por categorias. El sistema soporta roles diferenciados (usuario y administrador), suscripciones con integracion de pagos, y un panel administrativo para gestion de contenido.

### Restricciones

- **Stack fijo**: FastAPI + Next.js + PostgreSQL + SQLAlchemy
- **Patron**: Clean Architecture estricta (Router -> Service -> Repository -> DB)
- **MVP**: 6 modulos con capacidad de deploy independiente por fase
- **Escalabilidad**: Disenar para 10x la carga inicial desde el dia uno
- **Video storage**: Almacenamiento externo (S3/CloudFront o equivalente), no en base de datos

### Supuestos

- Los videos se almacenan en un servicio de object storage (AWS S3 o compatible)
- El streaming se realiza via URLs pre-firmadas o CDN, no desde el backend directamente
- La pasarela de pagos es Stripe (arquitectura adaptable a otras pasarelas)
- El MVP soporta un solo idioma (espanol) con estructura preparada para i18n

---

## 2. Decisiones Arquitectonicas Clave

### 2.1 Autenticacion: JWT con Refresh Tokens

**Decision**: JWT stateless con access token (15 min) + refresh token (7 dias) almacenado en base de datos.

**Justificacion**:
- Access tokens cortos minimizan ventana de exposicion si se comprometen
- Refresh tokens en BD permiten revocacion inmediata (logout, cambio de password)
- Stateless para el 99% de requests (solo valida firma JWT), stateful solo en refresh
- El access token viaja en header `Authorization: Bearer <token>`
- El refresh token viaja en cookie HttpOnly, Secure, SameSite=Strict

**Alternativa descartada**: Sessions server-side — requieren almacenamiento centralizado (Redis), agrega latencia a cada request, y no escala tan bien horizontalmente.

### 2.2 Storage de Videos: Object Storage + CDN

**Decision**: Videos en AWS S3 (o MinIO para desarrollo local) con CloudFront como CDN.

**Flujo**:
1. Admin sube video -> Backend genera presigned URL de upload -> Frontend sube directo a S3
2. S3 Event trigger procesa el video (transcodificacion futura)
3. Usuario solicita video -> Backend genera presigned URL de descarga/streaming con expiracion
4. CloudFront cachea y distribuye

**Justificacion**:
- El backend nunca toca los bytes del video (desacopla compute de storage)
- Presigned URLs permiten upload/download seguro sin exponer credenciales
- CDN reduce latencia y carga en origin
- Preparado para transcodificacion con AWS MediaConvert o FFmpeg en pipeline async

### 2.3 Streaming: HLS con Progressive Fallback

**Decision**: HTTP Live Streaming (HLS) como formato principal, con progressive download como fallback.

**Justificacion**:
- HLS es el estandar de facto para streaming adaptativo
- Soporta adaptive bitrate (el reproductor ajusta calidad segun ancho de banda)
- Compatible con todos los navegadores modernos (via hls.js en los que no lo soportan nativamente)
- Progressive download como fallback para videos cortos o entornos limitados

### 2.4 Estrategia de Cache

**Capas de cache**:

| Capa | Tecnologia | TTL | Que cachea |
|------|-----------|-----|------------|
| CDN | CloudFront | 24h | Archivos de video, thumbnails, assets estaticos |
| HTTP | Cache-Control headers | 5min | Listado de catalogo, categorias |
| Aplicacion | Redis (futuro) | 5min | Queries frecuentes, sesiones |
| BD | Indices PostgreSQL | N/A | Optimizacion de queries |

**Para el MVP**: Solo cache HTTP (Cache-Control headers) y CDN. Redis se introduce en la fase de optimizacion post-MVP.

### 2.5 Manejo de Errores: Estrategia Unificada

**Estructura de error consistente en toda la API**:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "El video solicitado no existe",
    "details": {},
    "request_id": "req_abc123"
  }
}
```

**Codigos de error del dominio**:

| Codigo | HTTP Status | Significado |
|--------|------------|-------------|
| VALIDATION_ERROR | 422 | Input invalido |
| RESOURCE_NOT_FOUND | 404 | Recurso no existe |
| UNAUTHORIZED | 401 | No autenticado |
| FORBIDDEN | 403 | Sin permisos |
| CONFLICT | 409 | Conflicto (ej: email duplicado) |
| PAYMENT_REQUIRED | 402 | Suscripcion requerida |
| RATE_LIMITED | 429 | Demasiadas peticiones |
| INTERNAL_ERROR | 500 | Error interno del servidor |

---

## 3. Diagrama ER de Base de Datos

```mermaid
erDiagram
    users {
        uuid id PK
        varchar email UK
        varchar hashed_password
        varchar full_name
        varchar avatar_url
        varchar role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        varchar token UK
        timestamp expires_at
        boolean is_revoked
        timestamp created_at
    }

    categories {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        varchar image_url
        integer sort_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    videos {
        uuid id PK
        varchar title
        varchar slug UK
        text description
        varchar thumbnail_url
        varchar video_url
        varchar hls_url
        integer duration_seconds
        varchar status
        uuid category_id FK
        uuid created_by FK
        integer sort_order
        boolean is_free
        timestamp published_at
        timestamp created_at
        timestamp updated_at
    }

    tags {
        uuid id PK
        varchar name UK
        varchar slug UK
        timestamp created_at
    }

    video_tags {
        uuid video_id PK,FK
        uuid tag_id PK,FK
    }

    watch_progress {
        uuid id PK
        uuid user_id FK
        uuid video_id FK
        integer watched_seconds
        integer total_seconds
        boolean is_completed
        timestamp last_watched_at
        timestamp created_at
        timestamp updated_at
    }

    favorites {
        uuid id PK
        uuid user_id FK
        uuid video_id FK
        timestamp created_at
    }

    subscription_plans {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        decimal monthly_price
        decimal annual_price
        varchar currency
        jsonb features
        boolean is_active
        integer sort_order
        timestamp created_at
        timestamp updated_at
    }

    subscriptions {
        uuid id PK
        uuid user_id FK
        uuid plan_id FK
        varchar status
        varchar billing_cycle
        varchar payment_gateway
        varchar gateway_subscription_id UK
        timestamp current_period_start
        timestamp current_period_end
        timestamp canceled_at
        timestamp created_at
        timestamp updated_at
    }

    payments {
        uuid id PK
        uuid user_id FK
        uuid subscription_id FK
        decimal amount
        varchar currency
        varchar status
        varchar payment_gateway
        varchar gateway_payment_id UK
        varchar gateway_invoice_id
        jsonb metadata
        timestamp paid_at
        timestamp created_at
    }

    users ||--o{ refresh_tokens : "has"
    users ||--o{ watch_progress : "tracks"
    users ||--o{ favorites : "saves"
    users ||--o{ subscriptions : "subscribes"
    users ||--o{ payments : "pays"
    users ||--o{ videos : "creates"
    categories ||--o{ videos : "contains"
    videos ||--o{ video_tags : "tagged_with"
    tags ||--o{ video_tags : "applied_to"
    videos ||--o{ watch_progress : "tracked_in"
    videos ||--o{ favorites : "favorited_in"
    subscription_plans ||--o{ subscriptions : "defines"
    subscriptions ||--o{ payments : "generates"
```

---

## 4. Database Schema Completo

### 4.1 SQLAlchemy Models

A continuacion se definen todos los modelos. Cada modelo incluye indices explicitamente.

```python
# ==============================================================================
# backend/app/models/base.py
# ==============================================================================
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


# ==============================================================================
# backend/app/models/user.py
# ==============================================================================
from sqlalchemy import Column, String, Boolean, Index
from sqlalchemy.orm import relationship


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(512), nullable=True)
    role = Column(String(20), nullable=False, default="user")  # user, admin
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    watch_progress = relationship("WatchProgress", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    created_videos = relationship("Video", back_populates="created_by_user")

    __table_args__ = (
        Index("ix_users_role_active", "role", "is_active"),
    )


# ==============================================================================
# backend/app/models/auth.py
# ==============================================================================
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class RefreshToken(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "refresh_tokens"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(512), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("ix_refresh_tokens_user_revoked", "user_id", "is_revoked"),
        Index("ix_refresh_tokens_expires", "expires_at"),
    )


# ==============================================================================
# backend/app/models/category.py
# ==============================================================================
from sqlalchemy import Column, String, Text, Integer, Boolean, Index
from sqlalchemy.orm import relationship


class Category(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "categories"

    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    videos = relationship("Video", back_populates="category")

    __table_args__ = (
        Index("ix_categories_active_sort", "is_active", "sort_order"),
    )


# ==============================================================================
# backend/app/models/video.py
# ==============================================================================
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class Video(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "videos"

    title = Column(String(255), nullable=False)
    slug = Column(String(280), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(512), nullable=True)
    video_url = Column(String(512), nullable=True)      # URL directa / progressive
    hls_url = Column(String(512), nullable=True)         # URL de manifiesto HLS
    duration_seconds = Column(Integer, nullable=True)
    status = Column(
        String(20), nullable=False, default="draft"
    )  # draft, processing, published, archived
    category_id = Column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    created_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sort_order = Column(Integer, default=0, nullable=False)
    is_free = Column(Boolean, default=False, nullable=False)
    published_at = Column(DateTime, nullable=True)

    # Relationships
    category = relationship("Category", back_populates="videos")
    created_by_user = relationship("User", back_populates="created_videos")
    tags = relationship("Tag", secondary="video_tags", back_populates="videos")
    watch_progress = relationship("WatchProgress", back_populates="video", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="video", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_videos_category_status", "category_id", "status"),
        Index("ix_videos_status_published", "status", "published_at"),
        Index("ix_videos_free_status", "is_free", "status"),
    )


# ==============================================================================
# backend/app/models/tag.py
# ==============================================================================
from sqlalchemy import Column, String, Table, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


video_tags = Table(
    "video_tags",
    Base.metadata,
    Column("video_id", UUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "tags"

    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(60), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    videos = relationship("Video", secondary=video_tags, back_populates="tags")


# ==============================================================================
# backend/app/models/watch_progress.py
# ==============================================================================
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class WatchProgress(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "watch_progress"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    watched_seconds = Column(Integer, default=0, nullable=False)
    total_seconds = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    last_watched_at = Column(DateTime, nullable=False)

    # Relationships
    user = relationship("User", back_populates="watch_progress")
    video = relationship("Video", back_populates="watch_progress")

    __table_args__ = (
        UniqueConstraint("user_id", "video_id", name="uq_watch_progress_user_video"),
        Index("ix_watch_progress_user", "user_id"),
        Index("ix_watch_progress_user_completed", "user_id", "is_completed"),
        Index("ix_watch_progress_user_last_watched", "user_id", "last_watched_at"),
    )


# ==============================================================================
# backend/app/models/favorite.py
# ==============================================================================
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class Favorite(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "favorites"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="favorites")
    video = relationship("Video", back_populates="favorites")

    __table_args__ = (
        UniqueConstraint("user_id", "video_id", name="uq_favorites_user_video"),
        Index("ix_favorites_user", "user_id"),
        Index("ix_favorites_user_created", "user_id", "created_at"),
    )


# ==============================================================================
# backend/app/models/subscription.py
# ==============================================================================
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, Numeric, DateTime,
    ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship


class SubscriptionPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "subscription_plans"

    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    monthly_price = Column(Numeric(10, 2), nullable=False)
    annual_price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    features = Column(JSONB, nullable=True)  # ["feature1", "feature2"]
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")

    __table_args__ = (
        Index("ix_plans_active_sort", "is_active", "sort_order"),
    )


class Subscription(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False)
    status = Column(
        String(20), nullable=False, default="active"
    )  # active, canceled, past_due, expired
    billing_cycle = Column(String(10), nullable=False)  # monthly, annual
    payment_gateway = Column(String(50), nullable=False, default="stripe")
    gateway_subscription_id = Column(String(255), unique=True, nullable=True)
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    canceled_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_period_end", "current_period_end"),
        Index("ix_subscriptions_gateway", "payment_gateway", "gateway_subscription_id"),
    )


# ==============================================================================
# backend/app/models/payment.py
# ==============================================================================
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship


class Payment(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "payments"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subscription_id = Column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    status = Column(
        String(20), nullable=False, default="pending"
    )  # pending, succeeded, failed, refunded
    payment_gateway = Column(String(50), nullable=False, default="stripe")
    gateway_payment_id = Column(String(255), unique=True, nullable=True)
    gateway_invoice_id = Column(String(255), nullable=True)
    metadata = Column(JSONB, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")

    __table_args__ = (
        Index("ix_payments_user", "user_id"),
        Index("ix_payments_user_status", "user_id", "status"),
        Index("ix_payments_subscription", "subscription_id"),
        Index("ix_payments_gateway", "payment_gateway", "gateway_payment_id"),
    )
```

### 4.2 Resumen de Indices

| Tabla | Indice | Columnas | Justificacion |
|-------|--------|----------|---------------|
| users | ix_users_email (unique) | email | Login por email |
| users | ix_users_role_active | role, is_active | Filtrar usuarios por rol |
| refresh_tokens | ix_refresh_tokens_token (unique) | token | Busqueda de token en refresh |
| refresh_tokens | ix_refresh_tokens_user_revoked | user_id, is_revoked | Revocar tokens por usuario |
| refresh_tokens | ix_refresh_tokens_expires | expires_at | Limpieza de tokens expirados |
| categories | ix_categories_slug (unique) | slug | Busqueda por slug en URL |
| categories | ix_categories_active_sort | is_active, sort_order | Listado ordenado de categorias activas |
| videos | ix_videos_slug (unique) | slug | Busqueda por slug en URL |
| videos | ix_videos_category_status | category_id, status | Filtrar videos por categoria y estado |
| videos | ix_videos_status_published | status, published_at | Listado cronologico de publicados |
| videos | ix_videos_free_status | is_free, status | Filtrar contenido gratuito |
| tags | ix_tags_slug (unique) | slug | Busqueda por slug |
| video_tags | PK compuesta | video_id, tag_id | Relacion M:N |
| watch_progress | uq_watch_progress_user_video | user_id, video_id | Un registro por usuario-video |
| watch_progress | ix_watch_progress_user_completed | user_id, is_completed | Historial y progreso |
| watch_progress | ix_watch_progress_user_last_watched | user_id, last_watched_at | Ordenar por ultimo visto |
| favorites | uq_favorites_user_video | user_id, video_id | Un favorito por usuario-video |
| favorites | ix_favorites_user_created | user_id, created_at | Listado cronologico de favoritos |
| subscriptions | ix_subscriptions_user_status | user_id, status | Suscripcion activa del usuario |
| subscriptions | ix_subscriptions_period_end | current_period_end | Renovaciones y expiraciones |
| payments | ix_payments_user_status | user_id, status | Historial de pagos del usuario |
| payments | ix_payments_gateway | payment_gateway, gateway_payment_id | Reconciliacion con pasarela |

### 4.3 Busqueda Full-Text (PostgreSQL)

Para la busqueda de videos por titulo y descripcion, se usa `tsvector` nativo de PostgreSQL:

```sql
-- Migration: agregar columna de busqueda full-text
ALTER TABLE videos ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('spanish', coalesce(description, '')), 'B')
    ) STORED;

CREATE INDEX ix_videos_search ON videos USING GIN (search_vector);
```

---

## 5. Arquitectura de Capas y Estructura de Directorios

### 5.1 Flujo de una Request

```
[Cliente] -> [Next.js Frontend]
                |
                | HTTP Request
                v
[FastAPI Router] -> valida input (Pydantic schema)
        |
        v
[Service Layer] -> logica de negocio, orquestacion
        |
        v
[Repository Layer] -> acceso a datos (SQLAlchemy queries)
        |
        v
[PostgreSQL Database]
```

**Reglas de dependencia (Clean Architecture)**:
- Los routers SOLO dependen de services y schemas
- Los services SOLO dependen de repositories y schemas
- Los repositories SOLO dependen de models y la sesion de BD
- Los models NO dependen de nada (entidades puras)
- Las dependencias apuntan hacia adentro (hacia el dominio)

### 5.2 Estructura del Backend

```
backend/
|-- alembic/                          # Migraciones de BD
|   |-- versions/
|   |-- env.py
|   |-- alembic.ini
|
|-- app/
|   |-- __init__.py
|   |-- main.py                       # FastAPI app factory, middleware, CORS
|   |-- config.py                     # Settings con Pydantic BaseSettings
|   |
|   |-- api/                          # Capa de presentacion (Routers)
|   |   |-- __init__.py
|   |   |-- deps.py                   # Dependencias compartidas (get_db, get_current_user)
|   |   |-- v1/
|   |   |   |-- __init__.py
|   |   |   |-- router.py             # Router principal que incluye todos los sub-routers
|   |   |   |-- auth.py               # POST /auth/register, /auth/login, etc.
|   |   |   |-- users.py              # GET /users/me, PATCH /users/me, etc.
|   |   |   |-- videos.py             # GET /videos, GET /videos/{slug}, etc.
|   |   |   |-- categories.py         # GET /categories, etc.
|   |   |   |-- tags.py               # GET /tags, etc.
|   |   |   |-- watch_progress.py     # POST /progress, GET /progress, etc.
|   |   |   |-- favorites.py          # POST /favorites, DELETE /favorites, etc.
|   |   |   |-- subscriptions.py      # GET /plans, POST /subscriptions, etc.
|   |   |   |-- payments.py           # POST /payments/webhook, etc.
|   |   |   |-- admin/
|   |   |   |   |-- __init__.py
|   |   |   |   |-- videos.py         # CRUD admin de videos
|   |   |   |   |-- categories.py     # CRUD admin de categorias
|   |   |   |   |-- users.py          # Gestion admin de usuarios
|   |   |   |   |-- dashboard.py      # Estadisticas del panel admin
|   |
|   |-- schemas/                      # Pydantic schemas (request/response)
|   |   |-- __init__.py
|   |   |-- auth.py
|   |   |-- user.py
|   |   |-- video.py
|   |   |-- category.py
|   |   |-- tag.py
|   |   |-- watch_progress.py
|   |   |-- favorite.py
|   |   |-- subscription.py
|   |   |-- payment.py
|   |   |-- common.py                 # PaginationParams, PaginatedResponse, ErrorResponse
|   |
|   |-- services/                     # Capa de logica de negocio
|   |   |-- __init__.py
|   |   |-- auth_service.py
|   |   |-- user_service.py
|   |   |-- video_service.py
|   |   |-- category_service.py
|   |   |-- tag_service.py
|   |   |-- watch_progress_service.py
|   |   |-- favorite_service.py
|   |   |-- subscription_service.py
|   |   |-- payment_service.py
|   |   |-- storage_service.py        # Abstraccion sobre S3/object storage
|   |
|   |-- repositories/                 # Capa de acceso a datos
|   |   |-- __init__.py
|   |   |-- base.py                   # BaseRepository con CRUD generico
|   |   |-- user_repository.py
|   |   |-- video_repository.py
|   |   |-- category_repository.py
|   |   |-- tag_repository.py
|   |   |-- watch_progress_repository.py
|   |   |-- favorite_repository.py
|   |   |-- subscription_repository.py
|   |   |-- payment_repository.py
|   |   |-- refresh_token_repository.py
|   |
|   |-- models/                       # SQLAlchemy models (entidades)
|   |   |-- __init__.py
|   |   |-- base.py
|   |   |-- user.py
|   |   |-- auth.py
|   |   |-- video.py
|   |   |-- category.py
|   |   |-- tag.py
|   |   |-- watch_progress.py
|   |   |-- favorite.py
|   |   |-- subscription.py
|   |   |-- payment.py
|   |
|   |-- core/                         # Utilidades transversales
|   |   |-- __init__.py
|   |   |-- security.py               # Hash passwords, crear/validar JWT
|   |   |-- exceptions.py             # Excepciones de dominio
|   |   |-- middleware.py              # Request ID, logging, rate limiting
|   |   |-- database.py               # Engine, SessionLocal, get_db
|   |   |-- storage.py                # Cliente S3, presigned URLs
|   |
|   |-- tests/
|   |   |-- __init__.py
|   |   |-- conftest.py               # Fixtures compartidas (test DB, client, auth)
|   |   |-- unit/
|   |   |   |-- services/
|   |   |   |-- repositories/
|   |   |-- integration/
|   |   |   |-- api/
|   |   |-- factories.py              # Factory Boy factories para test data
|
|-- requirements/
|   |-- base.txt
|   |-- dev.txt
|   |-- test.txt
|
|-- Dockerfile
|-- docker-compose.yml
|-- pyproject.toml
|-- .env.example
```

### 5.3 Estructura del Frontend

```
frontend/
|-- public/
|   |-- images/
|   |-- favicon.ico
|
|-- src/
|   |-- app/                          # App Router (Next.js 14+)
|   |   |-- (auth)/                   # Grupo de rutas de autenticacion
|   |   |   |-- login/
|   |   |   |   |-- page.tsx
|   |   |   |-- register/
|   |   |   |   |-- page.tsx
|   |   |
|   |   |-- (main)/                   # Grupo de rutas principales
|   |   |   |-- layout.tsx            # Layout con navbar, sidebar
|   |   |   |-- page.tsx              # Home / catalogo
|   |   |   |-- categories/
|   |   |   |   |-- [slug]/
|   |   |   |   |   |-- page.tsx
|   |   |   |-- videos/
|   |   |   |   |-- [slug]/
|   |   |   |   |   |-- page.tsx      # Reproductor de video
|   |   |   |-- profile/
|   |   |   |   |-- page.tsx          # Perfil del usuario
|   |   |   |   |-- favorites/
|   |   |   |   |   |-- page.tsx
|   |   |   |   |-- history/
|   |   |   |   |   |-- page.tsx
|   |   |   |-- plans/
|   |   |   |   |-- page.tsx          # Pagina de planes/precios
|   |   |
|   |   |-- admin/                    # Rutas del panel admin
|   |   |   |-- layout.tsx
|   |   |   |-- page.tsx              # Dashboard
|   |   |   |-- videos/
|   |   |   |   |-- page.tsx          # Lista de videos
|   |   |   |   |-- new/
|   |   |   |   |   |-- page.tsx
|   |   |   |   |-- [id]/
|   |   |   |   |   |-- edit/
|   |   |   |   |   |   |-- page.tsx
|   |   |   |-- categories/
|   |   |   |   |-- page.tsx
|   |   |   |   |-- new/
|   |   |   |   |   |-- page.tsx
|   |   |   |   |-- [id]/
|   |   |   |   |   |-- edit/
|   |   |   |   |   |   |-- page.tsx
|   |   |   |-- users/
|   |   |   |   |-- page.tsx
|   |   |
|   |   |-- layout.tsx               # Root layout
|   |   |-- not-found.tsx
|   |   |-- error.tsx
|   |   |-- loading.tsx
|   |
|   |-- components/
|   |   |-- ui/                       # Componentes base (Button, Input, Modal, etc.)
|   |   |-- layout/                   # Navbar, Sidebar, Footer
|   |   |-- video/                    # VideoCard, VideoPlayer, VideoGrid
|   |   |-- auth/                     # LoginForm, RegisterForm
|   |   |-- admin/                    # AdminTable, AdminForm, StatsCard
|   |   |-- subscription/             # PlanCard, CheckoutForm
|   |
|   |-- lib/
|   |   |-- api/                      # Cliente HTTP (fetch wrapper)
|   |   |   |-- client.ts             # Base client con interceptors, auth headers
|   |   |   |-- auth.ts               # Funciones de API de auth
|   |   |   |-- videos.ts             # Funciones de API de videos
|   |   |   |-- categories.ts
|   |   |   |-- progress.ts
|   |   |   |-- favorites.ts
|   |   |   |-- subscriptions.ts
|   |   |   |-- admin.ts
|   |   |-- hooks/                    # Custom hooks
|   |   |   |-- useAuth.ts
|   |   |   |-- useVideos.ts
|   |   |   |-- useProgress.ts
|   |   |   |-- useFavorites.ts
|   |   |-- utils/                    # Utilidades (formatters, validators)
|   |   |-- types/                    # TypeScript interfaces/types
|   |   |   |-- auth.ts
|   |   |   |-- video.ts
|   |   |   |-- category.ts
|   |   |   |-- subscription.ts
|   |   |   |-- common.ts
|   |
|   |-- stores/                       # Estado global (Zustand)
|   |   |-- auth-store.ts
|   |   |-- player-store.ts
|   |
|   |-- middleware.ts                 # Next.js middleware (auth redirect, role check)
|
|-- tailwind.config.ts
|-- next.config.ts
|-- tsconfig.json
|-- package.json
|-- .env.local.example
```

### 5.4 Patron del Repository Base

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

### 5.5 Patron del Service con Inyeccion de Dependencias

```python
# backend/app/services/video_service.py
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.video_repository import VideoRepository
from app.repositories.category_repository import CategoryRepository
from app.schemas.video import VideoCreate, VideoUpdate, VideoListParams
from app.schemas.common import PaginatedResponse
from app.core.exceptions import NotFoundError, ForbiddenError


class VideoService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.video_repo = VideoRepository(db)
        self.category_repo = CategoryRepository(db)

    async def list_published(
        self, params: VideoListParams
    ) -> PaginatedResponse:
        videos, total = await self.video_repo.list_published(
            category_slug=params.category,
            search=params.search,
            skip=params.offset,
            limit=params.limit,
        )
        return PaginatedResponse(
            items=videos,
            total=total,
            offset=params.offset,
            limit=params.limit,
        )

    async def get_by_slug(self, slug: str) -> VideoResponse:
        video = await self.video_repo.get_by_slug(slug)
        if not video:
            raise NotFoundError("Video", slug)
        return video

    async def create(
        self, data: VideoCreate, created_by: UUID
    ) -> VideoResponse:
        if data.category_id:
            category = await self.category_repo.get_by_id(data.category_id)
            if not category:
                raise NotFoundError("Category", str(data.category_id))

        video_dict = data.model_dump()
        video_dict["created_by"] = created_by
        return await self.video_repo.create(video_dict)

    # ... mas metodos


# backend/app/api/deps.py  (inyeccion de dependencias via FastAPI)
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.video_service import VideoService


async def get_video_service(
    db: AsyncSession = Depends(get_db),
) -> VideoService:
    return VideoService(db)
```

---

## 6. API Contracts por Modulo

**Base URL**: `/api/v1`  
**Content-Type**: `application/json`  
**Autenticacion**: `Authorization: Bearer <access_token>` donde se indique

### 6.1 Autenticacion (`/api/v1/auth`)

#### POST `/auth/register` -- Registro de usuario

```
Request Body:
{
  "email": "user@example.com",          // string, required, valid email
  "password": "SecurePass123!",          // string, required, min 8 chars
  "full_name": "Juan Perez"             // string, required, min 2 chars
}

Response 201:
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Juan Perez",
  "role": "user",
  "created_at": "2026-04-02T10:00:00Z"
}

Errors:
  409 CONFLICT         - Email ya registrado
  422 VALIDATION_ERROR - Datos invalidos
```

#### POST `/auth/login` -- Inicio de sesion

```
Request Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}
+ Set-Cookie: refresh_token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800

Errors:
  401 UNAUTHORIZED - Credenciales invalidas
  403 FORBIDDEN    - Cuenta desactivada
```

#### POST `/auth/refresh` -- Renovar access token

```
Request: Cookie refresh_token (automatico)

Response 200:
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}

Errors:
  401 UNAUTHORIZED - Refresh token invalido o expirado
```

#### POST `/auth/logout` -- Cerrar sesion

```
Request: Cookie refresh_token + Authorization header

Response 204: (sin body)

Errors:
  401 UNAUTHORIZED
```

#### POST `/auth/change-password` -- Cambiar contrasena [Auth required]

```
Request Body:
{
  "current_password": "OldPass123!",
  "new_password": "NewSecure456!"
}

Response 200:
{
  "message": "Password actualizado exitosamente"
}

Errors:
  401 UNAUTHORIZED     - No autenticado
  422 VALIDATION_ERROR - Password actual incorrecto o nuevo password invalido
```

---

### 6.2 Usuarios (`/api/v1/users`)

#### GET `/users/me` -- Perfil del usuario actual [Auth required]

```
Response 200:
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Juan Perez",
  "avatar_url": "https://...",
  "role": "user",
  "is_active": true,
  "subscription": {                     // null si no tiene suscripcion activa
    "plan_name": "Premium",
    "status": "active",
    "current_period_end": "2026-05-02T00:00:00Z"
  },
  "created_at": "2026-04-02T10:00:00Z"
}
```

#### PATCH `/users/me` -- Actualizar perfil [Auth required]

```
Request Body (todos opcionales):
{
  "full_name": "Juan A. Perez",
  "avatar_url": "https://..."
}

Response 200:
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Juan A. Perez",
  "avatar_url": "https://...",
  "role": "user",
  "is_active": true,
  "created_at": "2026-04-02T10:00:00Z",
  "updated_at": "2026-04-02T12:00:00Z"
}

Errors:
  401 UNAUTHORIZED
  422 VALIDATION_ERROR
```

---

### 6.3 Catalogo de Videos (`/api/v1/videos`)

#### GET `/videos` -- Listar videos publicados

```
Query Parameters:
  ?category=desarrollo-web              // string, filtrar por slug de categoria
  &search=python                        // string, busqueda full-text
  &tag=python                           // string, filtrar por tag slug
  &is_free=true                         // boolean, solo videos gratuitos
  &sort=recent|popular|oldest           // string, default: recent
  &offset=0                             // int, default: 0
  &limit=20                             // int, default: 20, max: 100

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "title": "Introduccion a Python",
      "slug": "introduccion-a-python",
      "description": "Aprende los fundamentos...",
      "thumbnail_url": "https://...",
      "duration_seconds": 1800,
      "is_free": true,
      "category": {
        "id": "uuid",
        "name": "Desarrollo Web",
        "slug": "desarrollo-web"
      },
      "tags": [
        {"id": "uuid", "name": "Python", "slug": "python"}
      ],
      "published_at": "2026-04-01T10:00:00Z"
    }
  ],
  "total": 150,
  "offset": 0,
  "limit": 20
}
```

#### GET `/videos/{slug}` -- Detalle de un video

```
Path Parameters:
  slug: string (slug del video)

Response 200:
{
  "id": "uuid",
  "title": "Introduccion a Python",
  "slug": "introduccion-a-python",
  "description": "Aprende los fundamentos de Python...",
  "thumbnail_url": "https://...",
  "video_url": "https://presigned-url...",    // null si requiere suscripcion
  "hls_url": "https://presigned-hls-url...",  // null si requiere suscripcion
  "duration_seconds": 1800,
  "is_free": true,
  "category": {
    "id": "uuid",
    "name": "Desarrollo Web",
    "slug": "desarrollo-web"
  },
  "tags": [
    {"id": "uuid", "name": "Python", "slug": "python"}
  ],
  "published_at": "2026-04-01T10:00:00Z",
  "user_progress": {                           // null si no autenticado
    "watched_seconds": 600,
    "is_completed": false
  }
}

Errors:
  404 RESOURCE_NOT_FOUND
  402 PAYMENT_REQUIRED  - Video de pago, usuario sin suscripcion activa
```

---

### 6.4 Categorias (`/api/v1/categories`)

#### GET `/categories` -- Listar categorias activas

```
Query Parameters:
  ?include_count=true                   // boolean, incluir conteo de videos

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "Desarrollo Web",
      "slug": "desarrollo-web",
      "description": "Cursos de desarrollo web...",
      "image_url": "https://...",
      "video_count": 45                  // solo si include_count=true
    }
  ],
  "total": 8
}
```

#### GET `/categories/{slug}` -- Detalle de categoria con sus videos

```
Response 200:
{
  "id": "uuid",
  "name": "Desarrollo Web",
  "slug": "desarrollo-web",
  "description": "Cursos de desarrollo web...",
  "image_url": "https://..."
}

Errors:
  404 RESOURCE_NOT_FOUND
```

---

### 6.5 Tags (`/api/v1/tags`)

#### GET `/tags` -- Listar tags

```
Query Parameters:
  ?search=pyth                          // string, busqueda por prefijo

Response 200:
{
  "items": [
    {"id": "uuid", "name": "Python", "slug": "python"},
    {"id": "uuid", "name": "JavaScript", "slug": "javascript"}
  ],
  "total": 25
}
```

---

### 6.6 Progreso de Visualizacion (`/api/v1/progress`) [Auth required]

#### POST `/progress` -- Actualizar progreso de un video

```
Request Body:
{
  "video_id": "uuid",
  "watched_seconds": 900,
  "total_seconds": 1800
}

Response 200:
{
  "video_id": "uuid",
  "watched_seconds": 900,
  "total_seconds": 1800,
  "is_completed": false,
  "last_watched_at": "2026-04-02T14:30:00Z"
}

Notas:
  - Upsert: crea si no existe, actualiza si ya existe
  - is_completed se marca true automaticamente cuando watched_seconds >= total_seconds * 0.9
```

#### GET `/progress` -- Historial de visualizacion del usuario

```
Query Parameters:
  ?completed=false                      // boolean, filtrar por completados
  &sort=recent|oldest                   // string, default: recent
  &offset=0
  &limit=20

Response 200:
{
  "items": [
    {
      "video": {
        "id": "uuid",
        "title": "Introduccion a Python",
        "slug": "introduccion-a-python",
        "thumbnail_url": "https://...",
        "duration_seconds": 1800
      },
      "watched_seconds": 900,
      "total_seconds": 1800,
      "is_completed": false,
      "last_watched_at": "2026-04-02T14:30:00Z"
    }
  ],
  "total": 35,
  "offset": 0,
  "limit": 20
}
```

#### GET `/progress/{video_id}` -- Progreso de un video especifico

```
Response 200:
{
  "video_id": "uuid",
  "watched_seconds": 900,
  "total_seconds": 1800,
  "is_completed": false,
  "last_watched_at": "2026-04-02T14:30:00Z"
}

Errors:
  404 RESOURCE_NOT_FOUND - No hay progreso registrado
```

---

### 6.7 Favoritos (`/api/v1/favorites`) [Auth required]

#### POST `/favorites` -- Agregar video a favoritos

```
Request Body:
{
  "video_id": "uuid"
}

Response 201:
{
  "id": "uuid",
  "video_id": "uuid",
  "created_at": "2026-04-02T15:00:00Z"
}

Errors:
  404 RESOURCE_NOT_FOUND - Video no existe
  409 CONFLICT           - Ya esta en favoritos
```

#### DELETE `/favorites/{video_id}` -- Remover de favoritos

```
Response 204: (sin body)

Errors:
  404 RESOURCE_NOT_FOUND - No estaba en favoritos
```

#### GET `/favorites` -- Listar favoritos del usuario

```
Query Parameters:
  ?offset=0
  &limit=20

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "video": {
        "id": "uuid",
        "title": "Introduccion a Python",
        "slug": "introduccion-a-python",
        "thumbnail_url": "https://...",
        "duration_seconds": 1800
      },
      "created_at": "2026-04-02T15:00:00Z"
    }
  ],
  "total": 12,
  "offset": 0,
  "limit": 20
}
```

---

### 6.8 Suscripciones y Planes (`/api/v1/subscriptions`)

#### GET `/plans` -- Listar planes disponibles

```
Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "Basico",
      "slug": "basico",
      "description": "Acceso a contenido basico",
      "monthly_price": "9.99",
      "annual_price": "99.99",
      "currency": "USD",
      "features": ["Acceso a videos basicos", "Soporte por email"]
    },
    {
      "id": "uuid",
      "name": "Premium",
      "slug": "premium",
      "description": "Acceso completo",
      "monthly_price": "19.99",
      "annual_price": "199.99",
      "currency": "USD",
      "features": ["Acceso a todos los videos", "Soporte prioritario", "Descargas offline"]
    }
  ]
}
```

#### POST `/subscriptions` -- Crear suscripcion [Auth required]

```
Request Body:
{
  "plan_id": "uuid",
  "billing_cycle": "monthly"            // "monthly" | "annual"
}

Response 201:
{
  "subscription_id": "uuid",
  "client_secret": "pi_xxx_secret_xxx", // Stripe PaymentIntent client secret
  "status": "pending"
}

Notas:
  - Crea un PaymentIntent en Stripe y retorna el client_secret
  - El frontend usa Stripe.js para completar el pago
  - El webhook de Stripe confirma la activacion

Errors:
  404 RESOURCE_NOT_FOUND - Plan no existe
  409 CONFLICT           - Ya tiene una suscripcion activa
```

#### GET `/subscriptions/current` -- Suscripcion activa del usuario [Auth required]

```
Response 200:
{
  "id": "uuid",
  "plan": {
    "id": "uuid",
    "name": "Premium",
    "slug": "premium"
  },
  "status": "active",
  "billing_cycle": "monthly",
  "current_period_start": "2026-04-02T00:00:00Z",
  "current_period_end": "2026-05-02T00:00:00Z"
}

Response 200 (sin suscripcion):
null

Errors:
  401 UNAUTHORIZED
```

#### POST `/subscriptions/cancel` -- Cancelar suscripcion [Auth required]

```
Response 200:
{
  "id": "uuid",
  "status": "canceled",
  "canceled_at": "2026-04-02T16:00:00Z",
  "current_period_end": "2026-05-02T00:00:00Z"  // Acceso hasta fin del periodo
}

Errors:
  404 RESOURCE_NOT_FOUND - No tiene suscripcion activa
```

---

### 6.9 Pagos / Webhooks (`/api/v1/payments`)

#### POST `/payments/webhook` -- Webhook de Stripe

```
Request: Raw body (Stripe event JSON)
Headers: Stripe-Signature: t=...,v1=...

Response 200:
{"received": true}

Eventos manejados:
  - payment_intent.succeeded     -> Activa suscripcion
  - payment_intent.payment_failed -> Marca suscripcion como past_due
  - invoice.paid                 -> Renueva periodo de suscripcion
  - customer.subscription.deleted -> Marca suscripcion como expired

Notas:
  - Validacion de firma de Stripe obligatoria
  - Idempotente: procesar el mismo evento multiples veces produce el mismo resultado
  - Endpoint NO requiere autenticacion JWT (autenticado por firma de Stripe)
```

#### GET `/payments/history` -- Historial de pagos [Auth required]

```
Query Parameters:
  ?offset=0
  &limit=20

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "amount": "19.99",
      "currency": "USD",
      "status": "succeeded",
      "paid_at": "2026-04-02T10:00:00Z",
      "plan_name": "Premium",
      "billing_cycle": "monthly"
    }
  ],
  "total": 5,
  "offset": 0,
  "limit": 20
}
```

---

### 6.10 Panel Admin (`/api/v1/admin`) [Auth required, Role: admin]

Todos los endpoints bajo `/admin` requieren `role == "admin"`.

#### Videos Admin

```
GET    /admin/videos                    -- Listar todos los videos (incluye drafts)
  Query: ?status=draft&search=...&offset=0&limit=20
  Response 200: PaginatedResponse<AdminVideoItem>

POST   /admin/videos                    -- Crear video
  Body: {
    "title": "string",
    "description": "string",
    "category_id": "uuid|null",
    "tag_ids": ["uuid"],
    "is_free": false,
    "status": "draft"
  }
  Response 201: AdminVideoDetail

GET    /admin/videos/{id}               -- Detalle de video
  Response 200: AdminVideoDetail

PATCH  /admin/videos/{id}               -- Actualizar video
  Body: { ...campos a actualizar }
  Response 200: AdminVideoDetail

DELETE /admin/videos/{id}               -- Eliminar video (soft: archived)
  Response 204

POST   /admin/videos/{id}/upload-url    -- Generar URL de upload pre-firmada
  Body: {
    "filename": "video.mp4",
    "content_type": "video/mp4"
  }
  Response 200: {
    "upload_url": "https://s3-presigned...",
    "video_key": "videos/uuid/video.mp4"
  }

POST   /admin/videos/{id}/publish       -- Publicar video
  Response 200: AdminVideoDetail (status: "published", published_at: now)
```

#### Categorias Admin

```
GET    /admin/categories                -- Listar todas (incluye inactivas)
  Response 200: PaginatedResponse<AdminCategoryItem>

POST   /admin/categories                -- Crear categoria
  Body: { "name": "string", "description": "string" }
  Response 201: AdminCategoryDetail
  Nota: slug se genera automaticamente desde name

PATCH  /admin/categories/{id}           -- Actualizar categoria
  Body: { ...campos a actualizar }
  Response 200: AdminCategoryDetail

DELETE /admin/categories/{id}           -- Desactivar categoria (soft delete)
  Response 204
```

#### Usuarios Admin

```
GET    /admin/users                     -- Listar usuarios
  Query: ?role=user&is_active=true&search=...&offset=0&limit=20
  Response 200: PaginatedResponse<AdminUserItem>

PATCH  /admin/users/{id}                -- Actualizar usuario (activar/desactivar, cambiar rol)
  Body: { "is_active": false }  // o { "role": "admin" }
  Response 200: AdminUserDetail
```

#### Dashboard Admin

```
GET    /admin/dashboard/stats           -- Estadisticas generales
  Response 200: {
    "total_users": 1500,
    "active_subscriptions": 800,
    "total_videos": 200,
    "total_views_last_30d": 45000,
    "revenue_last_30d": "15980.00",
    "new_users_last_30d": 120,
    "top_videos": [
      {"title": "...", "views": 1200}
    ]
  }
```

---

## 7. Security Considerations

### 7.1 Autenticacion y Autorizacion

| Control | Implementacion |
|---------|---------------|
| Password hashing | bcrypt con salt (via passlib) |
| JWT signing | HS256 con secret rotable. RS256 en produccion futura |
| Access token lifetime | 15 minutos |
| Refresh token lifetime | 7 dias, almacenado en BD, revocable |
| Refresh token transport | Cookie HttpOnly, Secure, SameSite=Strict |
| Role-based access | Decorator/dependency `require_role("admin")` en endpoints admin |
| Account lockout | Rate limit en login: 5 intentos en 15 min por IP |

### 7.2 Proteccion de Endpoints

```
Publico (sin auth):
  - POST /auth/register
  - POST /auth/login
  - POST /auth/refresh
  - GET  /videos (listado)
  - GET  /videos/{slug} (detalle, sin URLs de streaming para no-suscriptores)
  - GET  /categories
  - GET  /tags
  - GET  /plans
  - POST /payments/webhook (autenticado por firma de Stripe)

Autenticado (cualquier usuario con sesion):
  - POST /auth/logout
  - POST /auth/change-password
  - GET/PATCH /users/me
  - POST/GET /progress
  - POST/DELETE/GET /favorites
  - POST/GET /subscriptions
  - GET /payments/history

Admin (role == "admin"):
  - Todo bajo /admin/*
```

### 7.3 Validacion de Input

- **Pydantic v2** para validacion de todos los request bodies y query params
- **Sanitizacion de slugs**: solo caracteres alfanumericos, guiones
- **Limites de tamano**: max 10MB para thumbnails, presigned URL para videos (bypass del backend)
- **SQL Injection**: mitigada por SQLAlchemy ORM (queries parametrizadas)
- **XSS en frontend**: React/Next.js escapa contenido por defecto, CSP headers

### 7.4 Proteccion de Datos

| Dato | Proteccion |
|------|-----------|
| Passwords | Nunca almacenados en texto plano (bcrypt) |
| Emails | No expuestos en endpoints publicos |
| Tokens de pago | Nunca almacenados (manejados por Stripe) |
| URLs de video | Presigned con expiracion de 4 horas |
| Datos sensibles en logs | Filtrados (passwords, tokens, tarjetas) |

### 7.5 Headers de Seguridad

```python
# Configurados via middleware FastAPI + Next.js headers
{
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",  # Deshabilitado en favor de CSP
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; ...",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

### 7.6 CORS

```python
# Solo origenes confiables
CORS_ORIGINS = [
    "https://platziflix.com",
    "http://localhost:3000",  # Solo en desarrollo
]
```

### 7.7 Rate Limiting

| Endpoint | Limite | Ventana |
|----------|--------|---------|
| POST /auth/login | 5 requests | 15 minutos (por IP) |
| POST /auth/register | 3 requests | 1 hora (por IP) |
| POST /progress | 60 requests | 1 minuto (por usuario) |
| GET /* (general) | 100 requests | 1 minuto (por IP) |
| POST /admin/* | 30 requests | 1 minuto (por usuario) |

Implementado con `slowapi` (basado en `limits`) para el MVP. Migrable a Redis-backed en produccion.

---

## 8. Plan de Implementacion por Fases

Cada fase es deployable y testeable de forma independiente. Las fases estan ordenadas por dependencias: cada fase construye sobre la anterior.

### Fase 0: Infraestructura Base (Semana 1)

**Objetivo**: Proyecto funcional con CI/CD, BD conectada, health check.

**Backend**:
- [ ] Inicializar proyecto FastAPI con estructura de directorios
- [ ] Configurar `pyproject.toml`, requirements, linting (ruff), formatting (black)
- [ ] Implementar `config.py` con Pydantic BaseSettings
- [ ] Implementar `core/database.py` con engine async y session factory
- [ ] Implementar `models/base.py` con mixins
- [ ] Configurar Alembic para migraciones
- [ ] Implementar `repositories/base.py` con CRUD generico
- [ ] Implementar middleware de request ID y logging
- [ ] Implementar `core/exceptions.py` y exception handlers globales
- [ ] Endpoint `GET /health` con check de BD
- [ ] Configurar Docker + docker-compose (app + postgres)
- [ ] Configurar pytest con fixtures de test DB

**Frontend**:
- [ ] Inicializar proyecto Next.js con TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar ESLint + Prettier
- [ ] Implementar `lib/api/client.ts` (fetch wrapper con interceptors)
- [ ] Implementar componentes UI base (Button, Input, Modal, Card)
- [ ] Implementar layouts base (root, main con navbar)
- [ ] Configurar variables de entorno

**Criterio de completitud**: `docker-compose up` levanta backend + postgres, `/health` responde 200, frontend renderiza layout base.

---

### Fase 1: Autenticacion (Semana 2)

**Dependencias**: Fase 0

**Objetivo**: Usuarios pueden registrarse, hacer login, y el sistema maneja JWT.

**Backend**:
- [ ] Modelo `User` + migracion
- [ ] Modelo `RefreshToken` + migracion
- [ ] `core/security.py` (hash password, crear/validar JWT)
- [ ] `UserRepository` (create, get_by_email, get_by_id)
- [ ] `RefreshTokenRepository` (create, get_by_token, revoke_all_for_user)
- [ ] `AuthService` (register, login, refresh, logout, change_password)
- [ ] `UserService` (get_profile, update_profile)
- [ ] `api/deps.py` (get_current_user, get_current_active_user, require_role)
- [ ] Schemas: `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserResponse`
- [ ] Routers: `/auth/*`, `/users/me`
- [ ] Tests unitarios: AuthService (mocking repos)
- [ ] Tests integracion: endpoints auth completos

**Frontend**:
- [ ] Paginas: `/login`, `/register`
- [ ] Componentes: `LoginForm`, `RegisterForm`
- [ ] `lib/api/auth.ts` (login, register, refresh)
- [ ] `stores/auth-store.ts` (Zustand: user state, tokens)
- [ ] `hooks/useAuth.ts` (login, logout, isAuthenticated)
- [ ] `middleware.ts` (redirect si no autenticado para rutas protegidas)
- [ ] Interceptor de refresh token automatico en `client.ts`

**Criterio de completitud**: Un usuario puede registrarse, hacer login, ver su perfil, y el token se renueva automaticamente.

---

### Fase 2: Catalogo de Videos y Categorias (Semana 3)

**Dependencias**: Fase 1 (necesita modelo User para `created_by`)

**Objetivo**: Videos y categorias visibles en el catalogo publico.

**Backend**:
- [ ] Modelo `Category` + migracion
- [ ] Modelo `Video` + migracion
- [ ] Modelo `Tag` + tabla `video_tags` + migracion
- [ ] Migracion para full-text search (`search_vector`)
- [ ] `CategoryRepository` (CRUD, get_by_slug, list_active)
- [ ] `VideoRepository` (list_published, get_by_slug, search, filter)
- [ ] `TagRepository` (CRUD, search_by_prefix)
- [ ] `CategoryService`, `VideoService`, `TagService`
- [ ] Schemas de request/response para video, category, tag
- [ ] Schema `PaginationParams` y `PaginatedResponse` en common
- [ ] Routers: `GET /videos`, `GET /videos/{slug}`, `GET /categories`, `GET /tags`
- [ ] Tests

**Frontend**:
- [ ] Pagina home (`/`) con grid de videos
- [ ] Componentes: `VideoCard`, `VideoGrid`, `CategoryFilter`, `SearchBar`
- [ ] Pagina de categoria (`/categories/[slug]`)
- [ ] Pagina de detalle de video (`/videos/[slug]`) -- sin reproductor aun
- [ ] `lib/api/videos.ts`, `lib/api/categories.ts`
- [ ] `hooks/useVideos.ts` con busqueda y filtros
- [ ] Paginacion con infinite scroll o paginacion clasica

**Criterio de completitud**: Un usuario puede navegar el catalogo, buscar videos, filtrar por categoria, y ver la pagina de detalle.

---

### Fase 3: Panel Admin - CRUD de Contenido (Semana 4)

**Dependencias**: Fase 2 (necesita modelos de video/categoria)

**Objetivo**: Admins pueden crear, editar, publicar y archivar contenido.

**Backend**:
- [ ] `core/storage.py` (cliente S3, generar presigned URLs)
- [ ] `StorageService` (generate_upload_url, generate_download_url)
- [ ] Routers admin: CRUD videos, CRUD categorias, gestion usuarios
- [ ] Endpoint de upload URL pre-firmada
- [ ] Endpoint de publicacion de video
- [ ] Endpoint de dashboard/stats
- [ ] Decorator `require_role("admin")`
- [ ] Tests de autorizacion (usuario normal no puede acceder a /admin)

**Frontend**:
- [ ] Layout admin (`/admin/layout.tsx`) con sidebar de navegacion
- [ ] Dashboard (`/admin`) con estadisticas
- [ ] Lista de videos admin con filtros por status
- [ ] Formulario de crear/editar video con upload de archivo
- [ ] Lista y formulario de categorias
- [ ] Lista de usuarios con acciones (activar/desactivar)
- [ ] Componentes: `AdminTable`, `AdminForm`, `StatsCard`, `FileUpload`

**Criterio de completitud**: Un admin puede hacer login, crear una categoria, crear un video con upload de archivo, publicarlo, y verlo aparecer en el catalogo publico.

---

### Fase 4: Reproductor y Tracking de Progreso (Semana 5)

**Dependencias**: Fase 2 (videos), Fase 1 (auth para tracking)

**Objetivo**: Usuarios pueden ver videos con streaming adaptativo y su progreso se trackea.

**Backend**:
- [ ] Modelo `WatchProgress` + migracion
- [ ] `WatchProgressRepository` (upsert, get_for_user_video, list_history)
- [ ] `WatchProgressService` (update_progress con logica de is_completed)
- [ ] Routers: `POST /progress`, `GET /progress`, `GET /progress/{video_id}`
- [ ] Logica de acceso: videos gratuitos vs. de pago (check suscripcion)
- [ ] Generar presigned URLs de streaming en detalle de video
- [ ] Tests

**Frontend**:
- [ ] Componente `VideoPlayer` con hls.js
  - Controles: play/pause, seek, volumen, fullscreen, calidad
  - Evento `timeupdate` envia progreso al backend (debounced, cada 15 seg)
  - Resume desde ultimo punto visto
- [ ] Barra de progreso en `VideoCard` (porcentaje visto)
- [ ] Pagina de historial (`/profile/history`)
- [ ] `stores/player-store.ts` (estado del reproductor)
- [ ] `hooks/useProgress.ts`

**Criterio de completitud**: Un usuario logueado puede reproducir un video con streaming HLS, pausar, salir, volver, y el video reanuda desde donde quedo. El historial muestra los videos vistos con porcentaje.

---

### Fase 5: Perfiles de Usuario y Favoritos (Semana 6)

**Dependencias**: Fase 4 (progreso), Fase 1 (auth)

**Objetivo**: Usuarios pueden gestionar su perfil, favoritos, y ver su historial completo.

**Backend**:
- [ ] Modelo `Favorite` + migracion
- [ ] `FavoriteRepository` (add, remove, list_for_user, check_exists)
- [ ] `FavoriteService`
- [ ] Routers: `POST /favorites`, `DELETE /favorites/{video_id}`, `GET /favorites`
- [ ] Extender `GET /videos/{slug}` para incluir `is_favorited` para usuario autenticado
- [ ] Tests

**Frontend**:
- [ ] Pagina de perfil (`/profile`) con resumen
- [ ] Pagina de favoritos (`/profile/favorites`)
- [ ] Boton de favorito (corazon) en `VideoCard` y pagina de detalle
- [ ] Toggle optimista de favorito (actualiza UI antes de respuesta del server)
- [ ] Edicion de perfil (nombre, avatar)
- [ ] `hooks/useFavorites.ts`

**Criterio de completitud**: Un usuario puede agregar/quitar favoritos, ver su lista de favoritos, editar su perfil, y navegar su historial completo.

---

### Fase 6: Suscripciones y Pagos (Semana 7-8)

**Dependencias**: Fase 1 (auth), Fase 4 (para restringir acceso por suscripcion)

**Objetivo**: Usuarios pueden suscribirse a planes de pago via Stripe.

**Backend**:
- [ ] Modelo `SubscriptionPlan` + migracion con datos semilla
- [ ] Modelo `Subscription` + migracion
- [ ] Modelo `Payment` + migracion
- [ ] `SubscriptionRepository`, `PaymentRepository`
- [ ] `SubscriptionService` (create_subscription, cancel, check_access)
- [ ] `PaymentService` (process_webhook, get_history)
- [ ] Integracion con Stripe SDK
  - Crear Customer en Stripe al registrar usuario
  - Crear PaymentIntent/Subscription al suscribirse
  - Manejar webhooks para estado de pago
- [ ] Routers: `GET /plans`, `POST /subscriptions`, `GET /subscriptions/current`,
       `POST /subscriptions/cancel`, `POST /payments/webhook`, `GET /payments/history`
- [ ] Middleware/dependency: `require_active_subscription` para endpoints de video protegidos
- [ ] Tests con mocks de Stripe

**Frontend**:
- [ ] Pagina de planes (`/plans`) con cards de precio
- [ ] Componente `CheckoutForm` con Stripe Elements
- [ ] Flujo completo: seleccionar plan -> pagar -> confirmacion
- [ ] Indicador de suscripcion en perfil y navbar
- [ ] Pagina de gestion de suscripcion (ver plan actual, cancelar)
- [ ] Paywall: mensaje "Suscribete para ver este video" en videos de pago
- [ ] `lib/api/subscriptions.ts`

**Criterio de completitud**: Un usuario puede ver planes, suscribirse con tarjeta (Stripe test mode), acceder a videos de pago, ver su historial de pagos, y cancelar su suscripcion.

---

## Resumen de Dependencias entre Fases

```
Fase 0 (Infra)
  |
  v
Fase 1 (Auth)
  |
  +------+------+
  |      |      |
  v      v      |
Fase 2  Fase 6  |
(Catalogo) (Pagos) |
  |      |      |
  v      |      |
Fase 3   |      |
(Admin)  |      |
  |      |      |
  v      |      |
Fase 4 <-+------+
(Reproductor + Progreso)
  |
  v
Fase 5
(Perfiles + Favoritos)
```

**Ruta critica**: 0 -> 1 -> 2 -> 3 -> 4 -> 5

**Fase 6 (Pagos)** puede desarrollarse en paralelo con Fases 2-5, integrando la verificacion de suscripcion en Fase 4.

---

## Apendice A: Schemas Pydantic Clave

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


# backend/app/schemas/video.py
from uuid import UUID
from datetime import datetime
from typing import Optional, Sequence
from pydantic import BaseModel, Field


class CategoryBrief(BaseModel):
    id: UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class TagBrief(BaseModel):
    id: UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class VideoListItem(BaseModel):
    id: UUID
    title: str
    slug: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    duration_seconds: Optional[int]
    is_free: bool
    category: Optional[CategoryBrief]
    tags: Sequence[TagBrief]
    published_at: Optional[datetime]

    model_config = {"from_attributes": True}


class UserProgress(BaseModel):
    watched_seconds: int
    is_completed: bool


class VideoDetail(VideoListItem):
    video_url: Optional[str] = None       # Presigned, null si no tiene acceso
    hls_url: Optional[str] = None         # Presigned, null si no tiene acceso
    user_progress: Optional[UserProgress] = None


class VideoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tag_ids: Sequence[UUID] = Field(default_factory=list)
    is_free: bool = False
    status: str = Field(default="draft", pattern="^(draft|published)$")


class VideoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tag_ids: Optional[Sequence[UUID]] = None
    is_free: Optional[bool] = None
    status: Optional[str] = Field(None, pattern="^(draft|processing|published|archived)$")
    sort_order: Optional[int] = None


class VideoListParams(PaginationParams):
    category: Optional[str] = None        # category slug
    search: Optional[str] = None
    tag: Optional[str] = None             # tag slug
    is_free: Optional[bool] = None
    sort: str = Field(default="recent", pattern="^(recent|popular|oldest)$")
```

---

## Apendice B: Configuracion de Entorno

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

    # Auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "platziflix-videos"
    S3_PRESIGNED_URL_EXPIRY: int = 14400  # 4 horas en segundos

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
```

---

## Apendice C: Docker Compose para Desarrollo

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
      JWT_SECRET_KEY: dev-secret-change-in-production
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

---

Este documento es la referencia tecnica completa para la implementacion de Platziflix. Cada fase esta disenada para ser auto-contenida y testeable, permitiendo demos incrementales y feedback temprano.
