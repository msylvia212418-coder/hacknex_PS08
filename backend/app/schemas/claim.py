from __future__ import annotations

from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ClaimType(str, Enum):
    EXTREMUM = "EXTREMUM"
    SIMPLE_AGGREGATION = "SIMPLE_AGGREGATION"
    COMPARISON = "COMPARISON"
    RANKING = "RANKING"
    UNKNOWN = "UNKNOWN"


class AggregationType(str, Enum):
    SUM = "SUM"
    COUNT = "COUNT"
    AVERAGE = "AVERAGE"
    MIN = "MIN"
    MAX = "MAX"


class OperationType(str, Enum):
    ARGMAX = "ARGMAX"
    ARGMIN = "ARGMIN"
    COMPARE_GREATER = "COMPARE_GREATER"
    COMPARE_LESS = "COMPARE_LESS"
    COMPARE_EQUAL = "COMPARE_EQUAL"
    TOTAL = "TOTAL"
    VALUE = "VALUE"


class DirectionType(str, Enum):
    HIGHER = "HIGHER"
    LOWER = "LOWER"
    INCREASE = "INCREASE"
    DECREASE = "DECREASE"
    EQUAL = "EQUAL"


class ClaimValidationStatus(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    AMBIGUOUS = "AMBIGUOUS"


class PreAggregation(BaseModel):
    aggregation: AggregationType
    group_by: str


class StructuredClaim(BaseModel):
    claim_text: str
    claim_type: ClaimType
    subject: str | None = None
    metric: str | None = None
    aggregation: AggregationType | None = None
    distinct: bool = False
    cancellation_filter: str | None = None
    pre_aggregation: PreAggregation | None = None
    operation: OperationType | None = None
    group_by: str | None = None
    direction: DirectionType | None = None
    comparison_target: str | None = None
    comparison_baseline: str | None = None
    required_evidence: list[str] = Field(default_factory=list)


class ClaimExtractRequest(BaseModel):
    question: str = Field(min_length=1)
    dataset_id: UUID

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Question must not be empty.")
        return normalized


class ClaimExtractResponse(BaseModel):
    question: str
    dataset_id: UUID
    claim: StructuredClaim | None = None
    status: ClaimValidationStatus
    ambiguity_reason: str | None = None
    validation_errors: list[str] = Field(default_factory=list)
    validation_warnings: list[str] = Field(default_factory=list)
