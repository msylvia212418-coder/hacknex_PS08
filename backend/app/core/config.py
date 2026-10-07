from __future__ import annotations

from functools import lru_cache

from pydantic import AnyHttpUrl, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings; secrets are never serialized."""

    supabase_url: AnyHttpUrl | None = None
    supabase_service_role_key: SecretStr | None = None
    supabase_anon_key: SecretStr | None = None
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    max_upload_size_bytes: int = Field(default=500 * 1024 * 1024, gt=0)

    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=None,
        extra="ignore",
    )

    def require_supabase_credentials(self) -> tuple[str, str]:
        required = {
            "SUPABASE_URL": self.supabase_url,
            "SUPABASE_SERVICE_ROLE_KEY": self.supabase_service_role_key,
            "SUPABASE_ANON_KEY": self.supabase_anon_key,
        }
        missing = [name for name, value in required.items() if value is None or not str(value).strip()]
        if missing:
            raise RuntimeError("Missing required configuration: " + ", ".join(missing))

        assert self.supabase_url is not None
        assert self.supabase_service_role_key is not None
        return str(self.supabase_url), self.supabase_service_role_key.get_secret_value()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
