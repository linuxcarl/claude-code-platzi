import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import AppException, app_exception_handler
from app.core.middleware import RequestIDMiddleware
from app.api.v1.router import api_router

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Middleware
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(AppException, app_exception_handler)

    # Routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/")
    async def root():
        return {"message": f"Bienvenido a {settings.APP_NAME}", "version": settings.APP_VERSION}

    return app


app = create_app()
