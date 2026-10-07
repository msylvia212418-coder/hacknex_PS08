"""Streaming, deterministic execution for the proof-plan vertical slice."""

from __future__ import annotations

import csv
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.schemas.computation import (
    ComputationResult,
    ComputationStatus,
    GroupValue,
    VerificationResult,
)
from app.schemas.proof import (
    ProofObligation,
    ProofObligationPlan,
    ProofObligationType as ObligationType,
)


def execute_plan(
    csv_path: str | Path,
    plan: ProofObligationPlan,
    *,
    top_n: int = 10,
) -> ComputationResult:
    """Execute supported obligations while retaining aggregates, not CSV rows."""
    if top_n < 0:
        return _inconclusive("top_n must be zero or greater.")
    try:
        spec = _read_plan(plan)
        if spec["error"]:
            return _inconclusive(spec["error"])
        with _open_csv(csv_path) as (reader, headers):
            missing = sorted(spec["required_columns"] - set(headers))
            if missing:
                return _inconclusive(
                    "Required CSV column(s) are missing: " + ", ".join(missing)
                )
            result = _execute_rows(reader, headers, spec, top_n)
        if result.status == ComputationStatus.SUCCESS:
            result.verification = verify_independently(csv_path, plan, result)
        return result
    except (OSError, UnicodeError, csv.Error, ValueError, InvalidOperation) as exc:
        return _inconclusive(f"Could not execute proof plan: {exc}")


def verify_independently(
    csv_path: str | Path,
    plan: ProofObligationPlan,
    primary_result: ComputationResult,
) -> VerificationResult:
    """Recompute grouped SUM/ARGMAX with a separate positional CSV scan."""
    if primary_result.status != ComputationStatus.SUCCESS:
        return VerificationResult(
            verified=False,
            match=False,
            reason="Primary computation did not succeed.",
        )
    try:
        spec = _read_plan(plan)
        if spec["error"]:
            return VerificationResult(verified=False, match=False, reason=spec["error"])
        if not (
            spec["group_by"]
            and spec["metric"]
            and spec["aggregation"] == "SUM"
            and spec["direction"] in ("MAX", "MIN")
            and not spec["pre_aggregation"]
            and not spec["distinct"]
            and not spec["comparison"]
        ):
            return VerificationResult(
                verified=False,
                match=None,
                reason="Independent verification currently supports grouped SUM extrema.",
            )

        group_index = metric_index = None
        totals: dict[str, Decimal] = defaultdict(Decimal)
        with Path(csv_path).open("r", encoding="utf-8-sig", newline="") as source:
            reader = csv.reader(source)
            header = next(reader, None)
            if header is None:
                return VerificationResult(verified=False, match=False, reason="CSV has no header.")
            positions = {name: index for index, name in enumerate(header)}
            required = (spec["group_by"], spec["metric"])
            absent = [name for name in required if name not in positions]
            if absent:
                return VerificationResult(
                    verified=False,
                    match=False,
                    reason="Required CSV column(s) are missing: " + ", ".join(absent),
                )
            group_index, metric_index = (positions[required[0]], positions[required[1]])
            invoice_index = positions.get(spec["filter_column"])

            for row in reader:
                if not row or all(not cell.strip() for cell in row):
                    continue
                if max(group_index, metric_index) >= len(row):
                    return VerificationResult(
                        verified=False, match=False, reason="CSV row has fewer fields than its header."
                    )
                if _is_cancelled(row, invoice_index, spec["filter"]):
                    continue
                group = row[group_index].strip()
                raw_number = row[metric_index].strip()
                if not group or not raw_number:
                    continue
                totals[group] += _parse_number(raw_number)

        if not totals:
            return VerificationResult(verified=False, match=False, reason="No eligible groups to verify.")
        ordered = sorted(
            totals.items(),
            key=lambda pair: (
                -pair[1] if spec["direction"] == "MAX" else pair[1],
                pair[0],
            ),
        )
        independent = {"winner": ordered[0][0], "value": float(ordered[0][1])}
        primary = {"winner": primary_result.winner, "value": primary_result.value}
        match = (
            primary["winner"] == independent["winner"]
            and primary["value"] is not None
            and abs(float(primary["value"]) - float(independent["value"])) <= 1e-12
        )
        return VerificationResult(
            verified=match,
            primary_result=primary,
            independent_result=independent,
            match=match,
            reason=None if match else "Primary and independent results differ.",
        )
    except (OSError, UnicodeError, csv.Error, ValueError, InvalidOperation) as exc:
        return VerificationResult(
            verified=False,
            match=False,
            reason=f"Independent verification failed: {exc}",
        )


def _execute_rows(reader, headers: list[str], spec: dict, top_n: int) -> ComputationResult:
    positions = {name: index for index, name in enumerate(headers)}
    group_column = spec["group_by"]
    metric_column = spec["metric"]
    group_index = positions[group_column] if group_column else None
    metric_index = positions[metric_column] if metric_column else None
    pre_group_index = (
        positions[spec["pre_aggregation"]["group_by"]]
        if spec["pre_aggregation"]
        else None
    )
    filter_index = positions.get(spec["filter_column"])
    accumulators: dict[str, Decimal] = defaultdict(Decimal)
    counts: dict[str, int] = defaultdict(int)
    distinct_values: dict[str, set[str]] = defaultdict(set)
    pre_totals: dict[tuple[str, str], Decimal] = defaultdict(Decimal)
    rows_processed = 0

    for row_number, row in enumerate(reader, start=2):
        if not row or all(not cell.strip() for cell in row):
            continue
        rows_processed += 1
        if len(row) != len(headers):
            raise ValueError(f"CSV row {row_number} does not match the header width.")
        if _is_cancelled(row, filter_index, spec["filter"]):
            continue
        group = row[group_index].strip() if group_index is not None else "All"
        if not group:
            continue

        if spec["pre_aggregation"]:
            invoice = row[pre_group_index].strip()
            raw_number = row[metric_index].strip()
            if invoice and raw_number:
                pre_totals[(group, invoice)] += Decimal(raw_number)
            continue

        if spec["aggregation"] == "COUNT" and spec["distinct"]:
            distinct_value = row[metric_index].strip()
            if distinct_value:
                distinct_values[group].add(distinct_value)
        elif spec["aggregation"] == "COUNT":
            if metric_index is None or row[metric_index].strip():
                counts[group] += 1
        elif metric_index is not None:
            raw_number = row[metric_index].strip()
            if raw_number:
                number = _parse_number(raw_number)
                accumulators[group] += number
                counts[group] += 1

    if spec["pre_aggregation"]:
        for (group, _invoice), total in pre_totals.items():
            accumulators[group] += total
            counts[group] += 1

    values: dict[str, Decimal] = {}
    groups = set(accumulators) | set(counts) | set(distinct_values)
    for group in groups:
        if spec["aggregation"] == "COUNT" and spec["distinct"]:
            values[group] = Decimal(len(distinct_values[group]))
        elif spec["aggregation"] == "COUNT":
            values[group] = Decimal(counts[group])
        elif spec["aggregation"] == "AVERAGE":
            if counts[group]:
                values[group] = accumulators[group] / counts[group]
        else:
            values[group] = accumulators[group]

    if not values:
        return _inconclusive("No eligible records produced an aggregate.", rows_processed=rows_processed)

    direction = spec["direction"]
    sort_reverse = direction != "MIN"
    ordered = sorted(values.items(), key=lambda pair: ((-pair[1] if sort_reverse else pair[1]), pair[0]))
    winner, winning_value = ordered[0]
    operation = (
        "ARGMAX" if direction == "MAX" else "ARGMIN" if direction == "MIN"
        else spec["comparison_operation"] or spec["aggregation"]
    )
    result = ComputationResult(
        status=ComputationStatus.SUCCESS,
        operation=operation,
        group_by=group_column,
        metric=metric_column,
        aggregation=spec["aggregation"],
        winner=winner if direction in ("MAX", "MIN") else None,
        value=(
            float(winning_value)
            if direction in ("MAX", "MIN")
            else float(values["All"])
            if "All" in values
            else None
        ),
        group_count=len(values),
        rows_processed=rows_processed,
        grouped_results=[GroupValue(group=key, value=float(value)) for key, value in ordered[:top_n]],
    )

    if spec["comparison"]:
        target = spec["comparison"]["target"]
        baseline = spec["comparison"]["baseline"]
        if target not in values or baseline not in values:
            return _inconclusive(
                "Comparison target or baseline was not found in the grouped values.",
                rows_processed=rows_processed,
                group_count=len(values),
            )
        target_value, baseline_value = values[target], values[baseline]
        op = spec["comparison_operation"]
        comparison = {
            "COMPARE_GREATER": target_value > baseline_value,
            "COMPARE_LESS": target_value < baseline_value,
            "COMPARE_EQUAL": target_value == baseline_value,
        }[op]
        result.operation = op
        result.winner = None
        result.value = None
        result.comparison_result = comparison
        result.target_value = float(target_value)
        result.baseline_value = float(baseline_value)
    return result


def _read_plan(plan: ProofObligationPlan) -> dict:
    if not isinstance(plan, ProofObligationPlan):
        raise ValueError("A ProofObligationPlan is required.")
    columns = {o.column for o in plan.obligations if o.type == ObligationType.COLUMN_EXISTS and o.column}
    group_obligations = [o for o in plan.obligations if o.type == ObligationType.GROUP_BY]
    aggregates = [o for o in plan.obligations if o.type == ObligationType.AGGREGATE]
    pre_aggregates = [o for o in plan.obligations if o.type == ObligationType.PRE_AGGREGATION]
    extrema = [o for o in plan.obligations if o.type == ObligationType.EXTREMUM]
    comparisons = [o for o in plan.obligations if o.type == ObligationType.COMPARISON]
    filters = [o for o in plan.obligations if o.type == ObligationType.FILTER]
    if len(aggregates) != 1:
        return {"error": "Proof plan must contain exactly one AGGREGATE obligation."}
    if len(group_obligations) > 1 or len(pre_aggregates) > 1 or len(extrema) > 1 or len(comparisons) > 1 or len(filters) > 1:
        return {"error": "Proof plan contains unsupported duplicate obligations."}
    aggregate = aggregates[0]
    if aggregate.aggregation is None:
        return {"error": "AGGREGATE obligation is missing its aggregation."}
    group_by = group_obligations[0].column if group_obligations else None
    pre = pre_aggregates[0] if pre_aggregates else None
    if pre and (pre.aggregation is None or not pre.group_by or not aggregate.column):
        return {"error": "PRE_AGGREGATION obligation is incomplete."}
    if extrema:
        direction = extrema[0].direction
        if direction not in ("MAX", "MIN"):
            return {"error": "EXTREMUM direction must be MAX or MIN."}
    else:
        direction = None
    comparison = None
    comparison_operation = None
    if comparisons:
        comparison = comparisons[0]
        comparison_operation = comparison.operation
        if not comparison.target or not comparison.baseline or comparison_operation not in (
            "COMPARE_GREATER", "COMPARE_LESS", "COMPARE_EQUAL"
        ):
            return {"error": "COMPARISON obligation is incomplete or unsupported."}
        if not group_by:
            return {"error": "COMPARISON requires GROUP_BY to locate target and baseline values."}
    aggregation = aggregate.aggregation.value
    if aggregation not in ("SUM", "COUNT", "AVERAGE", "MIN", "MAX"):
        return {"error": f"Unsupported aggregation: {aggregation}."}
    if aggregation != "COUNT" and not aggregate.column:
        return {"error": f"{aggregation} requires a metric column."}
    distinct = aggregate.distinct
    if distinct and aggregation != "COUNT":
        return {"error": "DISTINCT is supported only with COUNT."}
    filter_value = filters[0].filter if filters else None
    if filter_value not in (None, "EXCLUDE_CANCELLATIONS", "INCLUDE_CANCELLATIONS"):
        return {"error": f"Unsupported filter: {filter_value}."}
    filter_column = filters[0].column if filters else None
    required_columns = set(columns)
    for column in (group_by, aggregate.column, pre.group_by if pre else None, filter_column):
        if column:
            required_columns.add(column)
    if group_by and group_by not in columns:
        return {"error": f"GROUP_BY column '{group_by}' has no COLUMN_EXISTS obligation."}
    if aggregate.column and aggregate.column not in columns:
        return {"error": f"Metric '{aggregate.column}' has no COLUMN_EXISTS obligation."}
    if pre and pre.group_by not in columns:
        return {"error": f"Pre-aggregation column '{pre.group_by}' has no COLUMN_EXISTS obligation."}
    if filter_column and filter_column not in columns:
        return {"error": f"Filter column '{filter_column}' has no COLUMN_EXISTS obligation."}
    if aggregation != "COUNT" and not any(
        o.type == ObligationType.NUMERIC_COLUMN and o.column == aggregate.column
        for o in plan.obligations
    ):
        return {"error": f"Metric '{aggregate.column}' has no NUMERIC_COLUMN obligation."}
    return {
        "error": None,
        "required_columns": required_columns,
        "group_by": group_by,
        "metric": aggregate.column,
        "aggregation": aggregation,
        "distinct": distinct,
        "pre_aggregation": (
            {"aggregation": pre.aggregation.value, "group_by": pre.group_by}
            if pre else None
        ),
        "filter": filter_value,
        "filter_column": filter_column or (pre.group_by if pre else None),
        "direction": direction,
        "comparison": (
            {"target": comparison.target, "baseline": comparison.baseline}
            if comparison else None
        ),
        "comparison_operation": comparison_operation,
    }


def _open_csv(csv_path: str | Path):
    source = Path(csv_path).open("r", encoding="utf-8-sig", newline="")
    reader = csv.reader(source)
    headers = next(reader, None)
    if headers is None:
        source.close()
        raise ValueError("CSV has no header row.")
    if len(headers) != len(set(headers)):
        source.close()
        raise ValueError("CSV contains duplicate column names.")
    return _ReaderContext(source, reader, headers)


class _ReaderContext:
    def __init__(self, source, reader, headers):
        self.source = source
        self.reader = reader
        self.headers = headers

    def __enter__(self):
        return self.reader, self.headers

    def __exit__(self, *_exc):
        self.source.close()


def _is_cancelled(row: list[str], invoice_index: int | None, filter_value: str | None) -> bool:
    if filter_value != "EXCLUDE_CANCELLATIONS":
        return False
    if invoice_index is None or invoice_index >= len(row):
        raise ValueError("Cancellation filtering requires the invoice column.")
    return row[invoice_index].strip().upper().startswith("C")


def _parse_number(raw_number: str) -> Decimal:
    number = Decimal(raw_number)
    if not number.is_finite():
        raise ValueError("Numeric values must be finite.")
    return number


def _inconclusive(
    reason: str,
    *,
    rows_processed: int = 0,
    group_count: int = 0,
) -> ComputationResult:
    return ComputationResult(
        status=ComputationStatus.INCONCLUSIVE,
        rows_processed=rows_processed,
        group_count=group_count,
        reason=reason,
    )
