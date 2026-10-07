"""Deterministic release decision from the existing verification pipeline outputs."""

from __future__ import annotations

from app.schemas.claim import (
    ClaimExtractResponse,
    ClaimType,
    ClaimValidationStatus,
    OperationType,
    StructuredClaim,
)
from app.schemas.computation import ComputationResult, ComputationStatus
from app.schemas.proof import ProofObligationPlan, ProofObligationType
from app.schemas.verdict import ReleaseCheck, ReleaseDecision, ReleaseVerdict


def evaluate_release(
    claim: ClaimExtractResponse,
    proof_plan: ProofObligationPlan | None,
    computation_result: ComputationResult | None,
) -> ReleaseDecision:
    """Decide whether the Task 3–5 result may be released."""
    structured_claim = claim.claim
    claim_text = structured_claim.claim_text if structured_claim else claim.question

    if claim.status == ClaimValidationStatus.AMBIGUOUS:
        ambiguity = claim.ambiguity_reason or "Task 3 marked the claim as ambiguous."
        return ReleaseDecision(
            verdict=ReleaseVerdict.AMBIGUOUS,
            claim=claim_text,
            reason=ambiguity,
            checks=[
                ReleaseCheck(name="claim_valid", passed=False, reason=ambiguity)
            ],
        )

    claim_valid = (
        claim.status == ClaimValidationStatus.VALID
        and structured_claim is not None
        and not claim.validation_errors
    )
    checks: list[ReleaseCheck] = [
        ReleaseCheck(
            name="claim_valid",
            passed=claim_valid,
            reason=None if claim_valid else _claim_failure_reason(claim),
        )
    ]

    plan_complete, plan_reason = _check_proof_plan(structured_claim, proof_plan)
    checks.append(
        ReleaseCheck(name="proof_obligations", passed=plan_complete, reason=plan_reason)
    )

    computation_succeeded = (
        computation_result is not None
        and computation_result.status == ComputationStatus.SUCCESS
    )
    evidence_available, evidence_reason = _check_required_evidence(
        claim, proof_plan, computation_result, computation_succeeded
    )
    checks.append(
        ReleaseCheck(
            name="required_evidence",
            passed=evidence_available,
            reason=evidence_reason,
        )
    )

    checks.append(
        ReleaseCheck(
            name="computation",
            passed=computation_succeeded,
            reason=(
                None
                if computation_succeeded
                else computation_result.reason
                if computation_result and computation_result.reason
                else "Computation is missing or did not return SUCCESS."
            ),
        )
    )

    verification = computation_result.verification if computation_result else None
    verification_passed = verification is not None and verification.verified is True
    checks.append(
        ReleaseCheck(
            name="independent_verification",
            passed=verification_passed,
            reason=(
                None
                if verification_passed
                else verification.reason
                if verification and verification.reason
                else "Successful independent verification is missing."
            ),
        )
    )

    results_match = _results_match(computation_result)
    checks.append(
        ReleaseCheck(
            name="result_match",
            passed=results_match,
            reason=None if results_match else "Primary and independent results do not match.",
        )
    )

    failed = [check for check in checks if not check.passed]
    if failed:
        reasons = [f"{check.name}: {check.reason or 'check failed'}" for check in failed]
        return ReleaseDecision(
            verdict=ReleaseVerdict.INCONCLUSIVE,
            claim=claim_text,
            reason="Release checks did not pass: " + "; ".join(reasons),
            checks=checks,
        )

    return ReleaseDecision(
        verdict=ReleaseVerdict.PROVABLE,
        claim=claim_text,
        reason=(
            "All required evidence, computation, and independent verification checks passed."
        ),
        checks=checks,
    )


def _claim_failure_reason(claim: ClaimExtractResponse) -> str:
    if claim.validation_errors:
        return "; ".join(claim.validation_errors)
    if claim.claim is None:
        return "Task 3 did not produce a structured claim."
    return f"Task 3 claim status is {claim.status.value}."


def _check_proof_plan(
    claim: StructuredClaim | None,
    plan: ProofObligationPlan | None,
) -> tuple[bool, str | None]:
    if claim is None:
        return False, "A structured claim is required to check proof obligations."
    if plan is None or not plan.obligations:
        return False, "Proof obligation plan is missing or empty."

    obligation_types = {obligation.type for obligation in plan.obligations}
    if ProofObligationType.AGGREGATE not in obligation_types:
        return False, "AGGREGATE obligation is missing."
    aggregate_matches = any(
        obligation.type == ProofObligationType.AGGREGATE
        and obligation.aggregation == claim.aggregation
        and obligation.column == claim.metric
        and obligation.distinct == claim.distinct
        for obligation in plan.obligations
    )
    if not aggregate_matches:
        return False, "AGGREGATE obligation does not match the validated claim."
    if ProofObligationType.INDEPENDENT_VERIFICATION not in obligation_types:
        return False, "INDEPENDENT_VERIFICATION obligation is missing."
    if claim.group_by and not any(
        obligation.type == ProofObligationType.GROUP_BY
        and obligation.column == claim.group_by
        for obligation in plan.obligations
    ):
        return False, f"GROUP_BY obligation is missing for {claim.group_by}."
    if claim.metric and claim.aggregation and claim.aggregation.value != "COUNT" and not any(
        obligation.type == ProofObligationType.NUMERIC_COLUMN
        and obligation.column == claim.metric
        for obligation in plan.obligations
    ):
        return False, f"NUMERIC_COLUMN obligation is missing for {claim.metric}."
    if claim.pre_aggregation and not any(
        obligation.type == ProofObligationType.PRE_AGGREGATION
        and obligation.aggregation == claim.pre_aggregation.aggregation
        and obligation.group_by == claim.pre_aggregation.group_by
        for obligation in plan.obligations
    ):
        return False, "PRE_AGGREGATION obligation does not match the claim."
    if claim.claim_type == ClaimType.EXTREMUM and not any(
        obligation.type == ProofObligationType.EXTREMUM
        and obligation.direction
        == (
            "MAX"
            if claim.operation == OperationType.ARGMAX
            else "MIN"
            if claim.operation == OperationType.ARGMIN
            else None
        )
        for obligation in plan.obligations
    ):
        return False, "EXTREMUM obligation does not match the claim."
    if claim.claim_type == ClaimType.COMPARISON and not any(
        obligation.type == ProofObligationType.COMPARISON
        and obligation.operation == (claim.operation.value if claim.operation else None)
        and obligation.target == claim.comparison_target
        and obligation.baseline == claim.comparison_baseline
        for obligation in plan.obligations
    ):
        return False, "COMPARISON obligation does not match the claim."
    return True, None


def _check_required_evidence(
    claim: ClaimExtractResponse,
    plan: ProofObligationPlan | None,
    result: ComputationResult | None,
    computation_succeeded: bool,
) -> tuple[bool, str | None]:
    structured_claim = claim.claim
    if structured_claim is None:
        return False, "Structured claim and its required evidence are unavailable."
    if claim.validation_errors:
        return False, "; ".join(claim.validation_errors)
    if plan is None:
        return False, "Proof plan does not identify required evidence columns."

    declared_columns = {
        obligation.column
        for obligation in plan.obligations
        if obligation.type == ProofObligationType.COLUMN_EXISTS and obligation.column
    }
    required_columns = {
        column
        for column in (
            structured_claim.metric,
            structured_claim.group_by,
            structured_claim.pre_aggregation.group_by
            if structured_claim.pre_aggregation
            else None,
        )
        if column
    }
    missing = sorted(required_columns - declared_columns)
    if missing:
        return False, "Required COLUMN_EXISTS evidence is missing for: " + ", ".join(missing)
    if not computation_succeeded:
        reason = result.reason if result and result.reason else "Required data was not established by computation."
        return False, reason
    if result.rows_processed <= 0:
        return False, "Required row evidence is unavailable; no rows were processed."
    if result.group_count <= 0:
        return False, "Required aggregation evidence is unavailable; no groups were produced."
    unsupported_evidence = sorted(
        set(structured_claim.required_evidence) - {"ROW", "AGGREGATION"}
    )
    if unsupported_evidence:
        return False, "Unsupported required evidence: " + ", ".join(unsupported_evidence)
    return True, None


def _results_match(result: ComputationResult | None) -> bool:
    if result is None or result.status != ComputationStatus.SUCCESS:
        return False
    verification = result.verification
    if (
        verification is None
        or verification.verified is not True
        or verification.match is not True
        or verification.primary_result is None
        or verification.independent_result is None
        or not verification.primary_result
    ):
        return False
    if verification.primary_result != verification.independent_result:
        return False

    # Verify that the verifier's primary value corresponds to the result being released.
    if result.operation in ("ARGMAX", "ARGMIN") and not {
        "winner",
        "value",
    }.issubset(verification.primary_result):
        return False
    if "winner" in verification.primary_result:
        if verification.primary_result["winner"] != result.winner:
            return False
    if "value" in verification.primary_result:
        if verification.primary_result["value"] != result.value:
            return False
    return True
