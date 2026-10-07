from __future__ import annotations

import csv

from app.schemas.claim import AggregationType, ClaimType, OperationType, PreAggregation, StructuredClaim
from app.schemas.computation import ComputationStatus
from app.services.computation_engine import execute_plan, verify_independently
from app.services.proof_obligation_compiler import compile_proof_obligations


def _write_csv(path, headers, rows, *, bom=False):
    with path.open("w", encoding="utf-8-sig" if bom else "utf-8", newline="") as target:
        writer = csv.writer(target)
        writer.writerow(headers)
        writer.writerows(rows)
    return path


def _revenue_plan():
    return compile_proof_obligations(
        StructuredClaim(
            claim_text="Which country generated the highest total revenue?",
            claim_type=ClaimType.EXTREMUM,
            metric="Revenue",
            aggregation=AggregationType.SUM,
            operation=OperationType.ARGMAX,
            group_by="Country",
        )
    )


def test_highest_revenue_by_country_and_independent_verification(tmp_path):
    source = _write_csv(
        tmp_path / "retail.csv",
        ["Country", "Revenue"],
        [["France", "10.5"], ["United Kingdom", "20"], ["France", "5.5"], ["United Kingdom", "2"]],
        bom=True,
    )

    result = execute_plan(source, _revenue_plan(), top_n=2)

    assert result.status == ComputationStatus.SUCCESS
    assert result.operation == "ARGMAX"
    assert result.winner == "United Kingdom"
    assert result.value == 22.0
    assert result.group_count == 2
    assert result.rows_processed == 4
    assert result.grouped_results[0].group == "United Kingdom"
    verification = verify_independently(source, _revenue_plan(), result)
    assert verification.verified is True
    assert verification.match is True
    assert verification.independent_result == {"winner": "United Kingdom", "value": 22.0}


def test_count_distinct_invoice_numbers(tmp_path):
    source = _write_csv(
        tmp_path / "transactions.csv",
        ["Country", "InvoiceNo"],
        [["UK", "I1"], ["UK", "I1"], ["UK", "I2"], ["FR", "I2"]],
    )
    plan = compile_proof_obligations(
        StructuredClaim(
            claim_text="Country with most transactions",
            claim_type=ClaimType.EXTREMUM,
            metric="InvoiceNo",
            aggregation=AggregationType.COUNT,
            distinct=True,
            operation=OperationType.ARGMAX,
            group_by="Country",
        )
    )

    result = execute_plan(source, plan)

    assert result.status == ComputationStatus.SUCCESS
    assert result.winner == "UK"
    assert result.value == 2.0


def test_missing_column_returns_inconclusive(tmp_path):
    source = _write_csv(tmp_path / "missing.csv", ["Country"], [["UK"]])

    result = execute_plan(source, _revenue_plan())

    assert result.status == ComputationStatus.INCONCLUSIVE
    assert "Revenue" in result.reason


def test_repeated_execution_is_deterministic(tmp_path):
    source = _write_csv(
        tmp_path / "deterministic.csv",
        ["Country", "Revenue"],
        [["B", "2"], ["A", "2"], ["C", "1"]],
    )
    plan = _revenue_plan()

    assert execute_plan(source, plan).model_dump(mode="json") == execute_plan(
        source, plan
    ).model_dump(mode="json")
    assert execute_plan(source, plan).winner == "A"  # stable tie break


def test_average_transaction_value_filters_and_preaggregates(tmp_path):
    source = _write_csv(
        tmp_path / "average.csv",
        ["Country", "InvoiceNo", "Revenue"],
        [
            ["A", "I1", "5"],
            ["A", "I1", "5"],
            ["A", "I2", "20"],
            ["A", "C3", "100"],
            ["B", "I4", "18"],
        ],
    )
    plan = compile_proof_obligations(
        StructuredClaim(
            claim_text="Average transaction value excluding cancellations",
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
    )

    result = execute_plan(source, plan)

    assert result.status == ComputationStatus.SUCCESS
    assert result.winner == "B"
    assert result.value == 18.0
    assert result.rows_processed == 5


def test_simple_comparison_uses_group_values(tmp_path):
    source = _write_csv(
        tmp_path / "comparison.csv",
        ["Period", "Revenue"],
        [["H1", "10"], ["H2", "14"]],
    )
    plan = compile_proof_obligations(
        StructuredClaim(
            claim_text="Did revenue increase in H2 compared with H1?",
            claim_type=ClaimType.COMPARISON,
            metric="Revenue",
            aggregation=AggregationType.SUM,
            operation=OperationType.COMPARE_GREATER,
            comparison_target="H2",
            comparison_baseline="H1",
            group_by="Period",
        )
    )

    result = execute_plan(source, plan)

    assert result.status == ComputationStatus.SUCCESS
    assert result.comparison_result is True
    assert result.target_value == 14.0
    assert result.baseline_value == 10.0
