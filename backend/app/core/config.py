import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "BillFlow API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    DATABASE_URL: str
    DIRECT_URL: str | None = None

    # JWT Authentication Configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Supabase Storage Configuration
    SUPABASE_URL: str = "https://jtnsakufuckvhwoluntr.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "billflow-logos"

    # Frontend CORS Configuration (Render and Production)
    FRONTEND_URL: str | None = None
    CORS_ORIGINS: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
        if self.FRONTEND_URL:
            for url in self.FRONTEND_URL.split(","):
                clean = url.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        if self.CORS_ORIGINS:
            for url in self.CORS_ORIGINS.split(","):
                clean = url.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        return origins

    @property
    def sync_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        import re
        url = re.sub(r'([?&])pgbouncer=[^&]*(&?)', lambda m: m.group(1) if (m.group(1) == '?' and m.group(2)) else ('&' if m.group(2) else ''), url).rstrip('?&')
        return url

    @property
    def sync_direct_url(self) -> str:
        url = self.DIRECT_URL or self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        import re
        url = re.sub(r'([?&])pgbouncer=[^&]*(&?)', lambda m: m.group(1) if (m.group(1) == '?' and m.group(2)) else ('&' if m.group(2) else ''), url).rstrip('?&')
        return url


settings = Settings()
