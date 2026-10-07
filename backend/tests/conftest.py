"""Shared fixtures for backend tests."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest

from app.core.config import Settings
from app.main import create_app


# ---------------------------------------------------------------------------
# Small CSV fixtures (no large files needed for unit tests)
# ---------------------------------------------------------------------------

VALID_CSV_BYTES = b"Name,Age,Score\nAlice,30,95.5\nBob,,88.0\nCharlie,25,\n"
VALID_CSV_COLUMNS = ["Name", "Age", "Score"]
VALID_CSV_ROW_COUNT = 3

HEADER_ONLY_CSV = b"Col1,Col2,Col3\n"
EMPTY_CSV = b""
MALFORMED_CSV = b'\x00\x01\x02binary garbage not csv'
SINGLE_COL_CSV = b"Value\n42\n99\n"
LARGE_HEADER_CSV = b"A,B,C,D,E\n1,2,3,4,5\n6,7,8,9,10\n"


# ---------------------------------------------------------------------------
# Mock Supabase client
# ---------------------------------------------------------------------------

class _ChainableQuery:
    """Supports the fluent query-builder pattern used by supabase-py."""

    def __init__(self, data: list[dict] | None = None, table_store: list[dict] | None = None) -> None:
        self._data = [dict(d) for d in data] if data is not None else []
        self._table_store = table_store

    def select(self, *_args: Any, **_kwargs: Any) -> _ChainableQuery:
        return self

    def insert(self, payload: Any) -> _ChainableQuery:
        items = payload if isinstance(payload, list) else [payload]
        inserted = []
        for item in items:
            row = {
                "id": str(item.get("id") or "d1000000-0000-4000-8000-000000000001"),
                "status": "ACTIVE",
                "created_at": "2026-01-01T00:00:00+00:00",
                "updated_at": "2026-01-01T00:00:00+00:00",
                **item,
            }
            inserted.append(row)
            if self._table_store is not None:
                self._table_store.append(row)
        self._data = inserted
        return self

    def update(self, payload: Any) -> _ChainableQuery:
        if isinstance(payload, dict):
            for row in self._data:
                row.update(payload)
            if self._table_store is not None:
                for row in self._table_store:
                    row.update(payload)
        return self

    def eq(self, col: str, val: Any) -> _ChainableQuery:
        matched = [r for r in self._data if str(r.get(col)) == str(val)]
        self._data = matched
        return self

    def order(self, _col: str, **_kwargs: Any) -> _ChainableQuery:
        return self

    def limit(self, n: int) -> _ChainableQuery:
        self._data = self._data[:n]
        return self

    def execute(self) -> MagicMock:
        resp = MagicMock()
        resp.data = self._data
        return resp


class MockSupabaseStorage:
    """Mocks Supabase storage bucket operations."""

    def __init__(self) -> None:
        self.uploaded: list[tuple[str, int]] = []  # (path, size)
        self.removed: list[str] = []

    def from_(self, _bucket: str) -> MockSupabaseStorage:
        return self

    def upload(self, *, path: str, file: Any, file_options: dict | None = None) -> None:
        if isinstance(file, bytes):
            size = len(file)
        elif hasattr(file, "seek") and hasattr(file, "read"):
            curr = file.tell()
            content = file.read()
            size = len(content) if isinstance(content, (bytes, bytearray)) else 0
            file.seek(curr)
        else:
            size = 0
        self.uploaded.append((path, size))

    def remove(self, paths: list[str]) -> None:
        self.removed.extend(paths)


class MockSupabaseClient:
    """Minimal mock that supports table(), storage, and the query-builder chain."""

    def __init__(self, tables: dict[str, list[dict]] | None = None) -> None:
        self._tables = tables or {}
        self.storage = MockSupabaseStorage()

    def table(self, name: str) -> _ChainableQuery:
        store = self._tables.setdefault(name, [])
        return _ChainableQuery(data=store, table_store=store)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

DEMO_PROJECT_ROW = {
    "id": "a0000000-0000-4000-8000-000000000001",
    "owner_id": "00000000-0000-4000-8000-ffffffffffff",
    "name": "Test Project",
    "description": None,
    "status": "ACTIVE",
    "created_at": "2026-01-01T00:00:00+00:00",
    "updated_at": "2026-01-01T00:00:00+00:00",
}

DEMO_DATASET_ROW = {
    "id": "d1000000-0000-4000-8000-000000000001",
    "project_id": "a0000000-0000-4000-8000-000000000001",
    "name": "test",
    "original_filename": "test.csv",
    "storage_path": "00000000-0000-4000-8000-ffffffffffff/a0000000-0000-4000-8000-000000000001/d1000000-0000-4000-8000-000000000001/test.csv",
    "content_hash": "abc123",
    "file_size": 100,
    "status": "READY",
    "created_at": "2026-01-01T00:00:00+00:00",
    "updated_at": "2026-01-01T00:00:00+00:00",
}


@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    """Ensure environment variables are present so get_settings() does not fail on credentials."""
    monkeypatch.setenv("SUPABASE_URL", "https://mock-test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key-for-unit-tests")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "mock-anon-key-for-unit-tests")


@pytest.fixture()
def mock_supabase(monkeypatch):
    """Provides a MockSupabaseClient and patches get_supabase_client everywhere."""
    client = MockSupabaseClient(
        tables={
            "projects": [DEMO_PROJECT_ROW],
            "datasets": [DEMO_DATASET_ROW],
            "dataset_profiles": [],
        }
    )

    def _get_client():
        return client

    import app.services.supabase_client as sc_mod
    import app.services.storage_service as storage_mod
    import app.api.health as health_mod
    import app.api.projects as projects_mod
    import app.api.datasets as datasets_mod
    import app.api.claims as claims_mod

    monkeypatch.setattr(sc_mod, "get_supabase_client", _get_client)
    monkeypatch.setattr(storage_mod, "get_supabase_client", _get_client, raising=False)
    monkeypatch.setattr(health_mod, "get_supabase_client", _get_client, raising=False)
    monkeypatch.setattr(projects_mod, "get_supabase_client", _get_client, raising=False)
    monkeypatch.setattr(datasets_mod, "get_supabase_client", _get_client, raising=False)
    monkeypatch.setattr(claims_mod, "get_supabase_client", _get_client, raising=False)
    return client
