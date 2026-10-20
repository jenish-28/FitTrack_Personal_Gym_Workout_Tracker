from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


def _normalize_pg_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://postgres@127.0.0.1:5433/fittrack"
    TEST_DATABASE_URL: str = "postgresql+psycopg://postgres@127.0.0.1:5433/fittrack_test"
    JWT_SECRET_KEY: str = "dev-fittrack-local-jwt-secret-key-9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    ENVIRONMENT: str = "development"
    ENABLE_DEMO_ACCOUNT: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        return _normalize_pg_url(self.DATABASE_URL)

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
