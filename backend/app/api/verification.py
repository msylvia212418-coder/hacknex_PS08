"""End-to-end claim verification API."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
import httpx

from app.api.claims import _extract_and_validate_claim, _get_authenticated_caller
from app.schemas.claim import ClaimValidationStatus
from app.schemas.computation import ComputationResult, ComputationStatus
from app.schemas.errors import APIErrorResponse
from app.schemas.proof import ProofObligationPlan
from app.schemas.verification import VerificationRequest, VerificationResponse
from app.services import supabase_client
from app.services.computation_engine import execute_plan
from app.services.proof_obligation_compiler import (
    ProofObligationCompilationError,
    compile_proof_obligations,
)
from app.services.release_gate import evaluate_release
from app.services.storage_service import download_dataset_file

logger = logging.getLogger(__name__)
router = APIRouter(tags=["verification"])


@router.post(
    "/verify",
    response_model=VerificationResponse,
    responses={
        400: {"model": APIErrorResponse, "description": "Dataset is not ready."},
        401: {"model": APIErrorResponse, "description": "Missing or invalid access token."},
        403: {"model": APIErrorResponse, "description": "Forbidden."},
        404: {"model": APIErrorResponse, "description": "Dataset or profile not found."},
        503: {"model": APIErrorResponse, "description": "Dataset storage is unavailable."},
    },
)
async def verify(
    request: VerificationRequest,
    authorization: str | None = Header(default=None),
) -> VerificationResponse:
    """Run claim extraction, obligations, computation, verification, and release gate."""
    caller_id = await _get_authenticated_caller(authorization)
    storage_path, available_columns = await _get_owned_dataset_context(
        request.dataset_id,
        caller_id,
    )

    claim = _extract_and_validate_claim(
        request.question,
        request.dataset_id,
        available_columns,
    )
    if claim.status == ClaimValidationStatus.AMBIGUOUS:
        return _build_response(request, claim, None, None)

    if claim.claim is None:
        return _build_response(request, claim, None, None)

    plan: ProofObligationPlan | None = None
    try:
        plan = compile_proof_obligations(claim.claim)
    except ProofObligationCompilationError as exc:
        logger.info("Proof plan compilation was inconclusive: %s", exc)
        return _build_response(request, claim, None, None)

    with tempfile.TemporaryDirectory(prefix="veriproof-") as temporary_directory:
        local_csv = Path(temporary_directory) / "dataset.csv"
        try:
            await run_in_threadpool(download_dataset_file, storage_path, local_csv)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Dataset file not found.")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Dataset file not found.")
            logger.warning("Dataset storage returned an error while preparing verification.")
            raise HTTPException(status_code=503, detail="Dataset storage is unavailable.")
        except (httpx.HTTPError, OSError):
            logger.warning("Dataset storage could not provide the requested file.")
            raise HTTPException(status_code=503, detail="Dataset storage is unavailable.")
        except Exception:
            logger.exception("Unexpected dataset storage failure during verification.")
            raise HTTPException(status_code=503, detail="Dataset storage is unavailable.")

        try:
            computation = await run_in_threadpool(execute_plan, local_csv, plan)
        except Exception:
            logger.exception("Unexpected computation failure for verification request.")
            computation = ComputationResult(
                status=ComputationStatus.INCONCLUSIVE,
                reason="Deterministic computation could not establish the claim.",
            )

    return _build_response(request, claim, plan, computation)


async def _get_owned_dataset_context(
    dataset_id: UUID,
    caller_id: UUID,
) -> tuple[str, list[str]]:
    """Resolve the ready dataset and profile only after authenticating ownership."""

    def _fetch() -> tuple[str, list[str]]:
        client = supabase_client.get_supabase_client()
        dataset_response = (
            client.table("datasets")
            .select("id, project_id, status, storage_path")
            .eq("id", str(dataset_id))
            .execute()
        )
        if not dataset_response.data:
            raise HTTPException(status_code=404, detail="Dataset not found.")
        dataset = dataset_response.data[0]

        project_response = (
            client.table("projects")
            .select("id, owner_id")
            .eq("id", str(dataset.get("project_id")))
            .execute()
        )
        if not project_response.data:
            raise HTTPException(status_code=404, detail="Dataset not found.")
        if str(project_response.data[0].get("owner_id")) != str(caller_id):
            raise HTTPException(status_code=403, detail="Access forbidden.")

        if dataset.get("status") != "READY":
            raise HTTPException(status_code=400, detail="Dataset is not ready for verification.")
        storage_path = dataset.get("storage_path")
        if not isinstance(storage_path, str) or not storage_path.strip():
            raise HTTPException(status_code=404, detail="Dataset file not found.")

        profile_response = (
            client.table("dataset_profiles")
            .select("profile")
            .eq("dataset_id", str(dataset_id))
            .execute()
        )
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Dataset profile not found.")
        profile = profile_response.data[0].get("profile")
        profile_columns = profile.get("columns") if isinstance(profile, dict) else None
        if not isinstance(profile_columns, list) or not profile_columns:
            raise HTTPException(status_code=404, detail="Dataset profile is unavailable.")
        available_columns = [
            column["name"]
            for column in profile_columns
            if isinstance(column, dict) and isinstance(column.get("name"), str)
        ]
        if not available_columns:
            raise HTTPException(status_code=404, detail="Dataset profile is unavailable.")
        return storage_path, available_columns

    return await run_in_threadpool(_fetch)


def _build_response(
    request: VerificationRequest,
    claim: ClaimExtractResponse,
    plan: ProofObligationPlan | None,
    computation: ComputationResult | None,
) -> VerificationResponse:
    release = evaluate_release(claim, plan, computation)
    return VerificationResponse(
        verdict=release.verdict,
        dataset_id=request.dataset_id,
        question=request.question,
        claim_status=claim.status,
        claim=claim.claim,
        proof_obligations=plan.obligations if plan else [],
        computation=computation,
        verification=computation.verification if computation else None,
        release=release,
    )
