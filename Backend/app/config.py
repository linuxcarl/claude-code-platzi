import json
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Platziflix API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://platziflix:password@db:5432/platziflix"

    JWT_SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "platziflix-videos"
    S3_PRESIGNED_URL_EXPIRY: int = 14400

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
