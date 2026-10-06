from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Return the reusable backend client, configured only from environment settings."""

    url, service_role_key = get_settings().require_supabase_credentials()
    return create_client(url, service_role_key)
