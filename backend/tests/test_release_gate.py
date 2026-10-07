from __future__ import annotations

from uuid import UUID

from app.schemas.claim import (
    AggregationType,
    ClaimExtractResponse,
    ClaimType,
    ClaimValidationStatus,
    DirectionType,
    OperationType,
    StructuredClaim,
)
from app.schemas.computation import (
    ComputationResult,
    ComputationStatus,
    VerificationResult,
)
from app.schemas.proof import ProofObligationPlan, ProofObligationType
from app.schemas.verdict import ReleaseVerdict
from app.services.proof_obligation_compiler import compile_proof_obligations
from app.services.release_gate import evaluate_release


def _claim_result(
    *, status=ClaimValidationStatus.VALID, validation_errors=None, ambiguity_reason=None
):
    claim = None if status == ClaimValidationStatus.AMBIGUOUS else StructuredClaim(
        claim_text="Country with highest total revenue",
        claim_type=ClaimType.EXTREMUM,
        metric="Revenue",
        aggregation=AggregationType.SUM,
        operation=OperationType.ARGMAX,
        group_by="Country",
        direction=DirectionType.HIGHER,
        required_evidence=["ROW", "AGGREGATION"],
    )
    return ClaimExtractResponse(
        question="Which country generated the highest total revenue?",
        dataset_id=UUID("d1000000-0000-4000-8000-000000000001"),
        claim=claim,
        status=status,
        ambiguity_reason=ambiguity_reason,
        validation_errors=validation_errors or [],
    )


def _proof_plan():
    return compile_proof_obligations(_claim_result().claim)


def _computation_result(
    *,
    status=ComputationStatus.SUCCESS,
    verification=None,
    reason=None,
):
    if verification is None and status == ComputationStatus.SUCCESS:
        verification = VerificationResult(
            verified=True,
            primary_result={"winner": "United Kingdom", "value": 100.0},
            independent_result={"winner": "United Kingdom", "value": 100.0},
            match=True,
        )
    return ComputationResult(
        status=status,
        operation="ARGMAX",
        group_by="Country",
        metric="Revenue",
        aggregation="SUM",
        winner="United Kingdom",
        value=100.0,
        group_count=2,
        rows_processed=3,
        verification=verification,
        reason=reason,
    )


def test_valid_highest_revenue_claim_is_provable():
    decision = evaluate_release(_claim_result(), _proof_plan(), _computation_result())

    assert decision.verdict == ReleaseVerdict.PROVABLE
    assert [check.passed for check in decision.checks] == [True] * 6
    assert decision.claim == "Country with highest total revenue"


def test_missing_required_evidence_is_inconclusive():
    plan = _proof_plan()
    plan.obligations = [
        obligation
        for obligation in plan.obligations
        if not (
            obligation.type == ProofObligationType.COLUMN_EXISTS
            and obligation.column == "Revenue"
        )
    ]

    decision = evaluate_release(_claim_result(), plan, _computation_result())

    assert decision.verdict == ReleaseVerdict.INCONCLUSIVE
    evidence_check = next(check for check in decision.checks if check.name == "required_evidence")
    assert evidence_check.passed is False
    assert "Revenue" in evidence_check.reason


def test_computation_failure_is_inconclusive():
    result = _computation_result(
        status=ComputationStatus.INCONCLUSIVE,
        reason="Required CSV column Revenue is missing.",
    )

    decision = evaluate_release(_claim_result(), _proof_plan(), result)

    assert decision.verdict == ReleaseVerdict.INCONCLUSIVE
    assert "computation" in decision.reason
    assert "Revenue" in decision.reason


def test_verification_failure_is_inconclusive():
    result = _computation_result(
        verification=VerificationResult(
            verified=False,
            match=False,
            reason="Independent scan failed.",
        )
    )

    decision = evaluate_release(_claim_result(), _proof_plan(), result)

    assert decision.verdict == ReleaseVerdict.INCONCLUSIVE
    assert "independent_verification" in decision.reason
    assert "Independent scan failed" in decision.reason


def test_primary_independent_mismatch_is_inconclusive():
    result = _computation_result(
        verification=VerificationResult(
            verified=False,
            primary_result={"winner": "United Kingdom", "value": 100.0},
            independent_result={"winner": "France", "value": 100.0},
            match=False,
        )
    )

    decision = evaluate_release(_claim_result(), _proof_plan(), result)

    assert decision.verdict == ReleaseVerdict.INCONCLUSIVE
    assert "result_match" in decision.reason


def test_ambiguous_claim_preserves_task_three_reason():
    reason = "Performance metric is not specified."
    decision = evaluate_release(
        _claim_result(
            status=ClaimValidationStatus.AMBIGUOUS,
            ambiguity_reason=reason,
        ),
        None,
        None,
    )

    assert decision.verdict == ReleaseVerdict.AMBIGUOUS
    assert decision.reason == reason


def test_release_evaluation_is_deterministic():
    args = (_claim_result(), _proof_plan(), _computation_result())

    first = evaluate_release(*args).model_dump(mode="json")
    second = evaluate_release(*args).model_dump(mode="json")

    assert first == second
