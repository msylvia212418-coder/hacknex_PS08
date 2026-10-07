from __future__ import annotations

import pytest

from app.schemas.claim import (
    AggregationType,
    ClaimType,
    DirectionType,
    OperationType,
    PreAggregation,
    StructuredClaim,
)
from app.schemas.proof import ProofObligationType as ObligationType
from app.services.proof_obligation_compiler import (
    ProofObligationCompilationError,
    compile_proof_obligations,
)


def _obligation(plan, obligation_type: ObligationType):
    return next(item for item in plan.obligations if item.type == obligation_type)


def test_highest_revenue_by_country_compiles_required_obligations():
    claim = StructuredClaim(
        claim_text="Which country generated the highest total revenue?",
        claim_type=ClaimType.EXTREMUM,
        metric="Revenue",
        aggregation=AggregationType.SUM,
        operation=OperationType.ARGMAX,
        group_by="Country",
        direction=DirectionType.HIGHER,
    )

    plan = compile_proof_obligations(claim)

    assert [(item.type, item.column) for item in plan.obligations[:4]] == [
        (ObligationType.COLUMN_EXISTS, "Country"),
        (ObligationType.COLUMN_EXISTS, "Revenue"),
        (ObligationType.NUMERIC_COLUMN, "Revenue"),
        (ObligationType.GROUP_BY, "Country"),
    ]
    aggregate = _obligation(plan, ObligationType.AGGREGATE)
    assert aggregate.aggregation == AggregationType.SUM
    assert aggregate.column == "Revenue"
    assert _obligation(plan, ObligationType.EXTREMUM).direction == "MAX"
    assert plan.obligations[-1].type == ObligationType.INDEPENDENT_VERIFICATION


def test_most_transactions_preserves_distinct_invoice_count():
    claim = StructuredClaim(
        claim_text="Country with most distinct count InvoiceNo",
        claim_type=ClaimType.EXTREMUM,
        metric="InvoiceNo",
        aggregation=AggregationType.COUNT,
        distinct=True,
        operation=OperationType.ARGMAX,
        group_by="Country",
    )

    plan = compile_proof_obligations(claim)
    aggregate = _obligation(plan, ObligationType.AGGREGATE)

    assert aggregate.aggregation == AggregationType.COUNT
    assert aggregate.column == "InvoiceNo"
    assert aggregate.distinct is True
    assert not any(item.type == ObligationType.NUMERIC_COLUMN for item in plan.obligations)


def test_average_transaction_value_preserves_preaggregation_and_filter():
    claim = StructuredClaim(
        claim_text="Average transaction value by country excluding cancellations",
        claim_type=ClaimType.EXTREMUM,
        metric="Revenue",
        aggregation=AggregationType.AVERAGE,
        operation=OperationType.ARGMAX,
        group_by="Country",
        cancellation_filter="EXCLUDE_CANCELLATIONS",
        pre_aggregation=PreAggregation(
            aggregation=AggregationType.SUM,
            group_by="InvoiceNo",
        ),
    )

    plan = compile_proof_obligations(claim)
    pre_aggregation = _obligation(plan, ObligationType.PRE_AGGREGATION)
    aggregate = _obligation(plan, ObligationType.AGGREGATE)
    filter_obligation = _obligation(plan, ObligationType.FILTER)

    assert pre_aggregation.aggregation == AggregationType.SUM
    assert pre_aggregation.column == "Revenue"
    assert pre_aggregation.group_by == "InvoiceNo"
    assert aggregate.aggregation == AggregationType.AVERAGE
    assert aggregate.column == "Revenue"
    assert filter_obligation.filter == "EXCLUDE_CANCELLATIONS"
    assert filter_obligation.column == "InvoiceNo"


def test_incomplete_claim_fails_with_controlled_error():
    claim = StructuredClaim(
        claim_text="Which country generated the highest revenue?",
        claim_type=ClaimType.EXTREMUM,
        aggregation=AggregationType.SUM,
        operation=OperationType.ARGMAX,
    )

    with pytest.raises(ProofObligationCompilationError, match="metric column"):
        compile_proof_obligations(claim)


def test_compilation_is_deterministic():
    claim = StructuredClaim(
        claim_text="Which country generated the highest total revenue?",
        claim_type=ClaimType.EXTREMUM,
        metric="Revenue",
        aggregation=AggregationType.SUM,
        operation=OperationType.ARGMAX,
        group_by="Country",
        direction=DirectionType.HIGHER,
    )

    first = compile_proof_obligations(claim).model_dump(mode="json")
    second = compile_proof_obligations(claim).model_dump(mode="json")

    assert first == second
