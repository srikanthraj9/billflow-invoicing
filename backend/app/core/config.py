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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def sync_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        import re
        url = re.sub(r'([?&])pgbouncer=[^&]*(&?)', lambda m: m.group(1) if (m.group(1) == '?' and m.group(2)) else ('&' if m.group(2) else ''), url).rstrip('?&')
        return url

    @property
    def sync_direct_url(self) -> str:
        url = self.DIRECT_URL or self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        import re
        url = re.sub(r'([?&])pgbouncer=[^&]*(&?)', lambda m: m.group(1) if (m.group(1) == '?' and m.group(2)) else ('&' if m.group(2) else ''), url).rstrip('?&')
        return url


settings = Settings()
