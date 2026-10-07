"""Structured output from deterministic proof-plan execution."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class ComputationStatus(str, Enum):
    SUCCESS = "SUCCESS"
    INCONCLUSIVE = "INCONCLUSIVE"


class GroupValue(BaseModel):
    group: str
    value: float


class VerificationResult(BaseModel):
    verified: bool
    primary_result: dict[str, str | float | None] | None = None
    independent_result: dict[str, str | float | None] | None = None
    match: bool | None = None
    reason: str | None = None


class ComputationResult(BaseModel):
    status: ComputationStatus
    operation: str | None = None
    group_by: str | None = None
    metric: str | None = None
    aggregation: str | None = None
    winner: str | None = None
    value: float | None = None
    group_count: int = 0
    rows_processed: int = 0
    grouped_results: list[GroupValue] = Field(default_factory=list)
    comparison_result: bool | None = None
    target_value: float | None = None
    baseline_value: float | None = None
    verification: VerificationResult | None = None
    reason: str | None = None
