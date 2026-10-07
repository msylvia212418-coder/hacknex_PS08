"""API request and response schemas for end-to-end verification."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.claim import ClaimValidationStatus, StructuredClaim
from app.schemas.computation import ComputationResult, VerificationResult
from app.schemas.proof import ProofObligation
from app.schemas.verdict import ReleaseDecision, ReleaseVerdict


class VerificationRequest(BaseModel):
    dataset_id: UUID
    question: str = Field(min_length=1)

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Question must not be empty.")
        return normalized


class VerificationResponse(BaseModel):
    verdict: ReleaseVerdict
    dataset_id: UUID
    question: str
    claim_status: ClaimValidationStatus
    claim: StructuredClaim | None = None
    proof_obligations: list[ProofObligation] = Field(default_factory=list)
    computation: ComputationResult | None = None
    verification: VerificationResult | None = None
    release: ReleaseDecision
