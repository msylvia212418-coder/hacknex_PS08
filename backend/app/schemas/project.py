from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ProjectCreateRequest(BaseModel):
    """Create a project. owner_id is temporary until JWT auth replaces it."""

    name: str = Field(min_length=1)
    description: str | None = None
    owner_id: UUID  # Temporary: will be replaced by auth.uid() from JWT

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Project name must not be empty.")
        return normalized


class ProjectResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
