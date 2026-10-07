"""Claim extraction API endpoint.

POST /claims/extract — accepts a natural-language question and dataset_id,
extracts structured analytical intent, validates it against the dataset schema,
and returns the result. Does NOT compute answers.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.schemas.claim import (
    ClaimExtractRequest,
    ClaimExtractResponse,
    ClaimValidationStatus,
)
from app.schemas.errors import APIErrorResponse
from app.services.claim_extractor import get_claim_extractor
from app.services.claim_validator import validate_claim
from app.services import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/claims", tags=["claims"])


# ---------------------------------------------------------------------------
# POST /claims/extract
# ---------------------------------------------------------------------------


@router.post(
    "/extract",
    response_model=ClaimExtractResponse,
    responses={
        400: {"model": APIErrorResponse, "description": "Dataset not ready."},
        401: {"model": APIErrorResponse, "description": "Missing or invalid authorization."},
        403: {"model": APIErrorResponse, "description": "Forbidden: not the dataset owner."},
        404: {"model": APIErrorResponse, "description": "Dataset not found or has no profile."},
        422: {"model": APIErrorResponse, "description": "Request validation error."},
    },
)
async def extract_claim(
    request: ClaimExtractRequest,
    authorization: str | None = Header(default=None),
) -> ClaimExtractResponse:
    """Extract a structured, validated analytical claim from a question."""

    # 1. Require authenticated caller
    caller_id = await _get_authenticated_caller(authorization)

    # 2. Fetch dataset schema (column names) from dataset profile after verifying ownership
    available_columns = await _get_dataset_columns(request.dataset_id, caller_id)

    return _extract_and_validate_claim(
        request.question,
        request.dataset_id,
        available_columns,
    )


def _extract_and_validate_claim(
    question: str,
    dataset_id: UUID,
    available_columns: list[str],
) -> ClaimExtractResponse:
    """Share Task 3 extraction and schema validation across claim APIs."""
    extracted, ambiguity_reason = get_claim_extractor().extract_claim(
        question,
        available_columns=available_columns,
    )
    if extracted is None and ambiguity_reason:
        return ClaimExtractResponse(
            question=question,
            dataset_id=dataset_id,
            claim=None,
            status=ClaimValidationStatus.AMBIGUOUS,
            ambiguity_reason=ambiguity_reason,
        )
    if extracted is None:
        return ClaimExtractResponse(
            question=question,
            dataset_id=dataset_id,
            claim=None,
            status=ClaimValidationStatus.INVALID,
            validation_errors=["Could not extract an analytical claim from the question."],
        )

    status, errors, warnings = validate_claim(extracted, available_columns)
    return ClaimExtractResponse(
        question=question,
        dataset_id=dataset_id,
        claim=extracted,
        status=status,
        validation_errors=errors,
        validation_warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _extract_bearer_token(authorization: str | None) -> str:
    """Return a syntactically valid JWT bearer token; never infer identity from it."""
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials were not provided.",
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization scheme. Use 'Bearer <token>'.",
        )

    token = parts[1]
    jwt_parts = token.split(".")
    if len(jwt_parts) != 3 or any(not part for part in jwt_parts):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials.",
        )
    return token


async def _get_authenticated_caller(authorization: str | None) -> UUID:
    """Validate the access token with Supabase Auth and return its verified user ID."""
    access_token = _extract_bearer_token(authorization)
    try:
        client = supabase_client.get_supabase_client()
        response = await run_in_threadpool(client.auth.get_user, access_token)
        user = getattr(response, "user", None)
        user_id = UUID(str(user.id)) if user is not None else None
    except Exception:
        # Do not expose Auth server details or distinguish fake/expired tokens.
        user_id = None

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials.",
        )
    return user_id


async def _get_dataset_columns(dataset_id: UUID, caller_id: UUID) -> list[str]:
    """Fetch column names from the dataset's profile after verifying ownership.

    Raises:
        HTTPException 404: Dataset not found.
        HTTPException 403: Caller does not own the project/dataset.
        HTTPException 400: Dataset is not in READY state.
        HTTPException 404: Dataset profile missing or empty.
    """

    def _fetch() -> list[str]:
        client = supabase_client.get_supabase_client()

        # 1. Fetch dataset
        ds_result = (
            client.table("datasets")
            .select("id, project_id, status")
            .eq("id", str(dataset_id))
            .execute()
        )
        if not ds_result.data:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        dataset = ds_result.data[0]
        project_id = dataset.get("project_id")

        # 2. Verify project ownership
        proj_result = (
            client.table("projects")
            .select("id, owner_id")
            .eq("id", str(project_id))
            .execute()
        )
        if not proj_result.data:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        project = proj_result.data[0]
        if str(project.get("owner_id")) != str(caller_id):
            raise HTTPException(
                status_code=403,
                detail="Access forbidden.",
            )

        # 3. Verify dataset status is READY
        if dataset.get("status") != "READY":
            raise HTTPException(
                status_code=400,
                detail=f"Dataset is not ready for analysis (status: {dataset.get('status')}).",
            )

        # 4. Fetch profile
        profile_result = (
            client.table("dataset_profiles")
            .select("profile")
            .eq("dataset_id", str(dataset_id))
            .execute()
        )
        if not profile_result.data:
            raise HTTPException(
                status_code=404,
                detail="Dataset profile not found. The dataset may still be processing.",
            )

        profile = profile_result.data[0].get("profile")
        if not profile or not isinstance(profile, dict):
            raise HTTPException(
                status_code=404,
                detail="Dataset profile data is empty or unavailable.",
            )
        columns = profile.get("columns", [])
        return [col["name"] for col in columns if isinstance(col, dict) and "name" in col]

    return await run_in_threadpool(_fetch)
