"""Schemas for deterministic proof obligation plans."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel

from app.schemas.claim import AggregationType


class ProofObligationType(str, Enum):
    COLUMN_EXISTS = "COLUMN_EXISTS"
    NUMERIC_COLUMN = "NUMERIC_COLUMN"
    GROUP_BY = "GROUP_BY"
    AGGREGATE = "AGGREGATE"
    PRE_AGGREGATION = "PRE_AGGREGATION"
    FILTER = "FILTER"
    EXTREMUM = "EXTREMUM"
    COMPARISON = "COMPARISON"
    INDEPENDENT_VERIFICATION = "INDEPENDENT_VERIFICATION"


class ProofObligation(BaseModel):
    type: ProofObligationType
    column: str | None = None
    aggregation: AggregationType | None = None
    distinct: bool = False
    group_by: str | None = None
    direction: str | None = None
    operation: str | None = None
    target: str | None = None
    baseline: str | None = None
    filter: str | None = None


class ProofObligationPlan(BaseModel):
    obligations: list[ProofObligation]
