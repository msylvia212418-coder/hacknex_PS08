"""Deterministic claim validation service.

Validates structured claims against dataset schema and internal consistency
rules. All validation logic is deterministic — no LLM involvement.
"""

from __future__ import annotations

from app.schemas.claim import (
    AggregationType,
    ClaimType,
    ClaimValidationStatus,
    OperationType,
    StructuredClaim,
)


def validate_claim(
    claim: StructuredClaim,
    available_columns: list[str],
) -> tuple[ClaimValidationStatus, list[str], list[str]]:
    """Validate a structured claim against dataset schema and consistency rules.

    Returns:
        (status, errors, warnings)
        - status: VALID, INVALID, or AMBIGUOUS
        - errors: list of blocking validation errors
        - warnings: list of non-blocking warnings
    """
    errors: list[str] = []
    warnings: list[str] = []

    columns_lower = {c.lower(): c for c in available_columns}

    # 1. Required field checks based on claim type
    _check_required_fields(claim, errors)

    # 2. Metric column exists in dataset schema
    if claim.metric is not None:
        if claim.metric.lower() not in columns_lower:
            errors.append(
                f"Metric column '{claim.metric}' does not exist in the dataset. "
                f"Available columns: {', '.join(available_columns)}"
            )

    # 3. Group-by column exists in dataset schema
    if claim.group_by is not None:
        if claim.group_by.lower() not in columns_lower:
            errors.append(
                f"Group-by column '{claim.group_by}' does not exist in the dataset. "
                f"Available columns: {', '.join(available_columns)}"
            )

    if claim.pre_aggregation is not None:
        if claim.pre_aggregation.group_by.lower() not in columns_lower:
            errors.append(
                f"Pre-aggregation group-by column '{claim.pre_aggregation.group_by}' "
                f"does not exist in the dataset. "
                f"Available columns: {', '.join(available_columns)}"
            )

    # 4. Operation / aggregation compatibility
    _check_operation_aggregation_compatibility(claim, errors, warnings)

    # 5. Extremum requires group_by
    if claim.claim_type == ClaimType.EXTREMUM and claim.group_by is None:
        errors.append("EXTREMUM claims require a group_by column.")

    # 6. Comparison requires target and baseline
    if claim.claim_type == ClaimType.COMPARISON:
        if not claim.comparison_target:
            errors.append("COMPARISON claims require a comparison_target.")
        if not claim.comparison_baseline:
            errors.append("COMPARISON claims require a comparison_baseline.")

    # 7. Simple aggregation requires metric (unless COUNT)
    if claim.claim_type == ClaimType.SIMPLE_AGGREGATION:
        if claim.aggregation != AggregationType.COUNT and claim.metric is None:
            errors.append(
                "SIMPLE_AGGREGATION claims require a metric column "
                "(except COUNT operations)."
            )

    # 8. UNKNOWN claim type is inherently ambiguous
    if claim.claim_type == ClaimType.UNKNOWN:
        warnings.append("Claim type is UNKNOWN; extraction may be incomplete.")

    # Determine final status
    if errors:
        status = ClaimValidationStatus.INVALID
    elif any("ambiguous" in w.lower() for w in warnings):
        status = ClaimValidationStatus.AMBIGUOUS
    else:
        status = ClaimValidationStatus.VALID

    return status, errors, warnings


def _check_required_fields(claim: StructuredClaim, errors: list[str]) -> None:
    """Verify that required fields are present based on claim type."""
    if not claim.claim_text or not claim.claim_text.strip():
        errors.append("Claim text must not be empty.")

    if claim.claim_type is None:
        errors.append("Claim type is required.")


def _check_operation_aggregation_compatibility(
    claim: StructuredClaim,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate that the operation and aggregation are compatible."""
    if claim.operation is None or claim.aggregation is None:
        return

    # ARGMAX/ARGMIN should be paired with an aggregation and group_by
    if claim.operation in (OperationType.ARGMAX, OperationType.ARGMIN):
        pass  # COUNT+metric is valid — metric represents what is being counted

    # TOTAL operation should not be combined with ARGMAX/ARGMIN aggregation intent
    if claim.operation == OperationType.TOTAL:
        if claim.claim_type == ClaimType.EXTREMUM:
            errors.append(
                "TOTAL operation is incompatible with EXTREMUM claim type. "
                "Use ARGMAX or ARGMIN instead."
            )

    # COMPARE operations should be with COMPARISON claim type
    if claim.operation in (
        OperationType.COMPARE_GREATER,
        OperationType.COMPARE_LESS,
        OperationType.COMPARE_EQUAL,
    ):
        if claim.claim_type != ClaimType.COMPARISON:
            warnings.append(
                f"Operation {claim.operation.value} is typically used with "
                f"COMPARISON claim type, not {claim.claim_type.value}."
            )
