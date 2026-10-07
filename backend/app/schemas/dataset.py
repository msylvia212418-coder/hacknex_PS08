from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel


class ColumnProfileData(BaseModel):
    name: str
    type: str
    non_null_count: int
    null_count: int
    distinct_count: int | None = None
    distinct_overflow: bool = False
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    min_length: int | None = None
    max_length: int | None = None


class DatasetProfileData(BaseModel):
    row_count: int
    column_count: int
    columns: list[ColumnProfileData]


class DatasetUploadResponse(BaseModel):
    """Returned after a successful dataset upload and profiling."""

    id: UUID
    project_id: UUID
    name: str
    original_filename: str
    storage_path: str
    content_hash: str
    file_size: int
    status: str
    created_at: datetime
    updated_at: datetime
    profile: DatasetProfileData


class DatasetDetailResponse(BaseModel):
    """Returned by GET /datasets/{dataset_id}."""

    id: UUID
    project_id: UUID
    name: str
    original_filename: str
    storage_path: str
    content_hash: str
    file_size: int
    status: str
    created_at: datetime
    updated_at: datetime
    profile: DatasetProfileData | None = None
