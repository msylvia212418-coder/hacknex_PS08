"""Compile validated structured claims into deterministic proof obligations."""

from __future__ import annotations

from app.schemas.claim import (
    AggregationType,
    ClaimType,
    OperationType,
    StructuredClaim,
)
from app.schemas.proof import (
    ProofObligation,
    ProofObligationPlan,
    ProofObligationType as ObligationType,
)


class ProofObligationCompilationError(ValueError):
    """Raised when a claim does not contain enough information to compile."""


def compile_proof_obligations(claim: StructuredClaim) -> ProofObligationPlan:
    """Create an ordered, deterministic plan without computing claim values."""
    if not isinstance(claim, StructuredClaim):
        raise ProofObligationCompilationError("A StructuredClaim is required.")

    _validate_compilable_claim(claim)
    obligations: list[ProofObligation] = []

    # Preserve a stable column-check order while avoiding duplicate checks.
    columns: list[str] = []
    for column in (
        claim.group_by,
        claim.metric,
        claim.pre_aggregation.group_by if claim.pre_aggregation else None,
    ):
        if column and column not in columns:
            columns.append(column)
    obligations.extend(
        ProofObligation(type=ObligationType.COLUMN_EXISTS, column=column)
        for column in columns
    )

    if claim.metric and claim.aggregation != AggregationType.COUNT:
        obligations.append(
            ProofObligation(type=ObligationType.NUMERIC_COLUMN, column=claim.metric)
        )

    # A filter is applied before transaction-level aggregation.
    if claim.cancellation_filter:
        obligations.append(
            ProofObligation(
                type=ObligationType.FILTER,
                column=claim.pre_aggregation.group_by
                if claim.pre_aggregation
                else claim.metric,
                filter=claim.cancellation_filter,
            )
        )

    if claim.pre_aggregation:
        obligations.append(
            ProofObligation(
                type=ObligationType.PRE_AGGREGATION,
                aggregation=claim.pre_aggregation.aggregation,
                column=claim.metric,
                group_by=claim.pre_aggregation.group_by,
            )
        )

    if claim.group_by:
        obligations.append(
            ProofObligation(type=ObligationType.GROUP_BY, column=claim.group_by)
        )

    obligations.append(
        ProofObligation(
            type=ObligationType.AGGREGATE,
            aggregation=claim.aggregation,
            column=claim.metric,
            distinct=claim.distinct,
        )
    )

    if claim.claim_type == ClaimType.EXTREMUM:
        direction = (
            "MAX"
            if claim.operation == OperationType.ARGMAX
            else "MIN"
            if claim.operation == OperationType.ARGMIN
            else None
        )
        obligations.append(
            ProofObligation(type=ObligationType.EXTREMUM, direction=direction)
        )

    if claim.claim_type == ClaimType.COMPARISON:
        obligations.append(
            ProofObligation(
                type=ObligationType.COMPARISON,
                operation=claim.operation.value if claim.operation else None,
                target=claim.comparison_target,
                baseline=claim.comparison_baseline,
                direction=claim.direction.value if claim.direction else None,
            )
        )

    obligations.append(
        ProofObligation(type=ObligationType.INDEPENDENT_VERIFICATION)
    )
    return ProofObligationPlan(obligations=obligations)


def _validate_compilable_claim(claim: StructuredClaim) -> None:
    if claim.claim_type == ClaimType.UNKNOWN:
        raise ProofObligationCompilationError("UNKNOWN claims cannot be compiled.")
    if claim.aggregation is None:
        raise ProofObligationCompilationError("Claim aggregation is required.")
    if claim.claim_type not in (
        ClaimType.EXTREMUM,
        ClaimType.SIMPLE_AGGREGATION,
        ClaimType.COMPARISON,
    ):
        raise ProofObligationCompilationError(
            f"Unsupported claim type: {claim.claim_type.value}."
        )
    if claim.aggregation != AggregationType.COUNT and not claim.metric:
        raise ProofObligationCompilationError(
            f"{claim.aggregation.value} claims require a metric column."
        )
    if claim.distinct and not claim.metric:
        raise ProofObligationCompilationError(
            "Distinct aggregation requires a metric column."
        )
    if claim.claim_type == ClaimType.EXTREMUM:
        if not claim.group_by:
            raise ProofObligationCompilationError(
                "EXTREMUM claims require a group_by column."
            )
        if claim.operation not in (OperationType.ARGMAX, OperationType.ARGMIN):
            raise ProofObligationCompilationError(
                "EXTREMUM claims require ARGMAX or ARGMIN operation."
            )
    if claim.claim_type == ClaimType.COMPARISON:
        if not claim.comparison_target or not claim.comparison_baseline:
            raise ProofObligationCompilationError(
                "COMPARISON claims require target and baseline."
            )
        if claim.operation not in (
            OperationType.COMPARE_GREATER,
            OperationType.COMPARE_LESS,
            OperationType.COMPARE_EQUAL,
        ):
            raise ProofObligationCompilationError(
                "COMPARISON claims require a comparison operation."
            )
    if claim.pre_aggregation and not claim.metric:
        raise ProofObligationCompilationError(
            "Pre-aggregation requires a metric column."
        )
