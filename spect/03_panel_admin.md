# Technical Analysis: Panel Admin - CRUD de Contenido (Fase 3)

> Platziflix - Plataforma de video streaming educativo
> Fase: 3 de 6
> Semana estimada: 4
> Dependencias: Fase 2 (Catalogo - necesita modelos de video/categoria)
>
> **Agentes asignados**:
> - `@backend` — Storage service (S3), endpoints admin CRUD, presigned URLs, dashboard stats, require_role("admin")
> - `@frontend` — Layout admin, dashboard, tablas admin, formularios CRUD, FileUpload con presigned URL, gestion usuarios

---

## Problema

Los administradores necesitan crear, editar, publicar y archivar contenido (videos y categorias), gestionar usuarios, y tener visibilidad del estado de la plataforma via un dashboard de estadisticas. El upload de videos debe ser directo a S3 via presigned URLs para no sobrecargar el backend.

## Impacto Arquitectonico

- **Backend**: Storage service con integracion S3, endpoints admin protegidos por rol, endpoint de dashboard con queries de agregacion, flujo de publicacion de videos (draft -> published)
- **Frontend**: Layout admin con sidebar, tablas con filtros y paginacion, formularios de creacion/edicion, componente de upload de archivos, dashboard con estadisticas
- **Database**: No requiere tablas nuevas, pero agrega queries de agregacion para el dashboard
- **Security**: Todos los endpoints bajo `/admin/*` requieren `role == "admin"`. Presigned URLs con expiracion para upload.
- **Performance**: Presigned URLs evitan que el backend procese bytes de video. Dashboard stats pueden cachearse.

---

## Solucion Propuesta

### Storage Service (S3)

```python
# backend/app/core/storage.py
import boto3
from app.config import settings


class S3Client:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        self.bucket = settings.S3_BUCKET_NAME

    def generate_upload_url(
        self, key: str, content_type: str, expires_in: int = 3600
    ) -> str:
        return self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )

    def generate_download_url(
        self, key: str, expires_in: int = None
    ) -> str:
        expires_in = expires_in or settings.S3_PRESIGNED_URL_EXPIRY
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )
```

```python
# backend/app/services/storage_service.py
from uuid import UUID
from app.core.storage import S3Client


class StorageService:
    def __init__(self):
        self.s3 = S3Client()

    def generate_video_upload_url(
        self, video_id: UUID, filename: str, content_type: str
    ) -> tuple[str, str]:
        """Retorna (upload_url, video_key)"""
        key = f"videos/{video_id}/{filename}"
        url = self.s3.generate_upload_url(key, content_type)
        return url, key

    def generate_video_stream_url(self, video_key: str) -> str:
        return self.s3.generate_download_url(video_key)
```

### API Contracts

Todos los endpoints bajo `/api/v1/admin` requieren `Authorization: Bearer` con `role == "admin"`.

#### Videos Admin

```
GET /admin/videos -- Listar todos los videos (incluye drafts)
  Query: ?status=draft&search=...&offset=0&limit=20
  Response 200: PaginatedResponse<AdminVideoItem>

POST /admin/videos -- Crear video
  Body: {
    "title": "string",
    "description": "string",
    "category_id": "uuid|null",
    "tag_ids": ["uuid"],
    "is_free": false,
    "status": "draft"
  }
  Response 201: AdminVideoDetail

GET /admin/videos/{id} -- Detalle de video
  Response 200: AdminVideoDetail

PATCH /admin/videos/{id} -- Actualizar video
  Body: { ...campos a actualizar }
  Response 200: AdminVideoDetail

DELETE /admin/videos/{id} -- Eliminar video (soft: status -> archived)
  Response 204

POST /admin/videos/{id}/upload-url -- Generar URL de upload pre-firmada
  Body: {
    "filename": "video.mp4",
    "content_type": "video/mp4"
  }
  Response 200: {
    "upload_url": "https://s3-presigned...",
    "video_key": "videos/uuid/video.mp4"
  }

POST /admin/videos/{id}/publish -- Publicar video
  Response 200: AdminVideoDetail (status: "published", published_at: now)
```

#### Categorias Admin

```
GET /admin/categories -- Listar todas (incluye inactivas)
  Response 200: PaginatedResponse<AdminCategoryItem>

POST /admin/categories -- Crear categoria
  Body: { "name": "string", "description": "string" }
  Response 201: AdminCategoryDetail
  Nota: slug se genera automaticamente desde name

PATCH /admin/categories/{id} -- Actualizar categoria
  Body: { ...campos a actualizar }
  Response 200: AdminCategoryDetail

DELETE /admin/categories/{id} -- Desactivar categoria (soft delete: is_active -> false)
  Response 204
```

#### Usuarios Admin

```
GET /admin/users -- Listar usuarios
  Query: ?role=user&is_active=true&search=...&offset=0&limit=20
  Response 200: PaginatedResponse<AdminUserItem>

PATCH /admin/users/{id} -- Actualizar usuario (activar/desactivar, cambiar rol)
  Body: { "is_active": false }  // o { "role": "admin" }
  Response 200: AdminUserDetail
```

#### Dashboard Admin

```
GET /admin/dashboard/stats -- Estadisticas generales
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

### Service Layer

```python
# Los VideoService y CategoryService de Fase 2 se extienden con metodos admin

# backend/app/services/video_service.py (metodos admin adicionales)
class VideoService:
    # ... metodos publicos de Fase 2 ...

    async def admin_list(self, params: AdminVideoListParams) -> PaginatedResponse
    async def admin_create(self, data: VideoCreate, created_by: UUID) -> Video
    async def admin_update(self, video_id: UUID, data: VideoUpdate) -> Video
    async def admin_delete(self, video_id: UUID) -> None  # soft delete -> archived
    async def admin_publish(self, video_id: UUID) -> Video
    async def generate_upload_url(self, video_id: UUID, filename: str, content_type: str) -> dict

# backend/app/services/dashboard_service.py
class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stats(self) -> DashboardStats
```

### Flujo de Upload de Video

```
1. Admin crea video (POST /admin/videos) -> status: "draft"
2. Admin solicita URL de upload (POST /admin/videos/{id}/upload-url)
3. Frontend sube video directo a S3 usando la presigned URL (PUT)
4. Frontend notifica al backend que el upload termino (PATCH /admin/videos/{id} con video_url)
5. Admin publica el video (POST /admin/videos/{id}/publish) -> status: "published"
6. Video aparece en catalogo publico
```

---

## Checklist de Implementacion

### Backend
- [ ] `core/storage.py` (cliente S3, generar presigned URLs de upload y download)
- [ ] `StorageService` (generate_video_upload_url, generate_video_stream_url)
- [ ] Routers admin: `api/v1/admin/videos.py`
- [ ] Routers admin: `api/v1/admin/categories.py`
- [ ] Routers admin: `api/v1/admin/users.py`
- [ ] Routers admin: `api/v1/admin/dashboard.py`
- [ ] Endpoint de upload URL pre-firmada (`POST /admin/videos/{id}/upload-url`)
- [ ] Endpoint de publicacion de video (`POST /admin/videos/{id}/publish`)
- [ ] `DashboardService` con queries de agregacion
- [ ] Schemas admin: AdminVideoItem, AdminCategoryItem, AdminUserItem, DashboardStats
- [ ] Verificacion `require_role("admin")` en todos los endpoints admin
- [ ] Generacion automatica de slug desde name (para categorias)
- [ ] Tests de autorizacion: usuario normal no puede acceder a /admin
- [ ] Tests integracion: CRUD completo de videos y categorias via admin

### Frontend
- [ ] Layout admin (`/admin/layout.tsx`) con sidebar de navegacion
- [ ] Dashboard (`/admin/page.tsx`) con tarjetas de estadisticas y top videos
- [ ] Pagina lista de videos admin (`/admin/videos/page.tsx`) con tabla, filtros por status
- [ ] Pagina crear video (`/admin/videos/new/page.tsx`)
- [ ] Pagina editar video (`/admin/videos/[id]/edit/page.tsx`)
- [ ] Pagina lista categorias admin (`/admin/categories/page.tsx`)
- [ ] Pagina crear/editar categoria
- [ ] Pagina lista usuarios admin (`/admin/users/page.tsx`)
- [ ] Componente `AdminTable` (tabla con paginacion, sort, filtros)
- [ ] Componente `AdminForm` (formulario generico con validacion)
- [ ] Componente `StatsCard` (tarjeta de metrica del dashboard)
- [ ] Componente `FileUpload` (upload a S3 via presigned URL con progress bar)
- [ ] `lib/api/admin.ts` (funciones de API para admin)

---

## Criterio de Completitud

Un admin puede hacer login, ver el dashboard con estadisticas, crear una categoria, crear un video con upload de archivo a S3, publicarlo, y verificar que aparece en el catalogo publico.
