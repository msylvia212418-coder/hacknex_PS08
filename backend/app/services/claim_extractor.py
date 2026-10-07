"""Semantic claim extraction service.

Separates semantic interpretation from deterministic validation.
Extracts analytical intent, metric, grouping, aggregation, operation,
and direction without calculating answers or evaluating code.
"""

from __future__ import annotations

import re
from typing import Protocol

from app.schemas.claim import (
    AggregationType,
    ClaimType,
    DirectionType,
    OperationType,
    PreAggregation,
    StructuredClaim,
)


class ClaimExtractorProtocol(Protocol):
    """Protocol for semantic claim extractors (rule-based or LLM-backed)."""

    def extract_claim(
        self,
        question: str,
        available_columns: list[str] | None = None,
    ) -> tuple[StructuredClaim | None, str | None]:
        ...


class RuleBasedClaimExtractor:
    """Semantic pattern extractor for analytical questions.

    Extracts structured analytical intent and flags semantic ambiguity
    without performing numerical computation or inventing unsupported metrics.
    """

    AMBIGUOUS_PATTERNS = [
        re.compile(r"\b(perform(?:ed)?|doing)\s+(best|better|worst|well|poorly)\b", re.IGNORECASE),
        re.compile(r"\bwho\s+is\s+the\s+best\b", re.IGNORECASE),
        re.compile(r"\bwhich\s+(?:one|entity|country|customer|product)\s+is\s+(?:the\s+)?best\b", re.IGNORECASE),
        re.compile(r"\b(top|leading|greatest)\s+performer\b", re.IGNORECASE),
    ]

    _METRIC_NOISE = re.compile(
        r"\b(?:total|overall|combined|aggregate|average|mean|avg|"
        r"highest|lowest|most|least|greatest|largest|smallest|"
        r"maximum|minimum)\b",
        re.IGNORECASE,
    )

    COLUMN_SYNONYMS = {
        "customer": "CustomerID",
        "customers": "CustomerID",
        "client": "CustomerID",
        "clients": "CustomerID",
        "country": "Country",
        "countries": "Country",
        "nation": "Country",
        "product": "Description",
        "products": "Description",
        "item": "Description",
        "items": "Description",
        "transaction": "InvoiceNo",
        "transactions": "InvoiceNo",
        "invoice": "InvoiceNo",
        "invoices": "InvoiceNo",
        "revenue": "Revenue",
        "sales": "Revenue",
        "price": "UnitPrice",
        "unit price": "UnitPrice",
        "transaction value": "Revenue",
        "quantity": "Quantity",
        "units": "Quantity",
        "period": "SourcePeriod",
    }

    def extract_claim(
        self,
        question: str,
        available_columns: list[str] | None = None,
    ) -> tuple[StructuredClaim | None, str | None]:
        """Extract a StructuredClaim from question text.

        Returns:
            (claim, ambiguity_reason)
            If the question is semantically ambiguous, claim is None and
            ambiguity_reason explains why.
            If the question is unparseable or non-analytical, both are None.
        """
        clean_q = question.strip()

        # 1. Ambiguity detection: check if question asks for "best/worst" without a metric
        if self._is_ambiguous(clean_q):
            return None, "Performance metric is not specified."

        # Check for average transaction value cancellation ambiguity:
        # Questions asking for average transaction value must explicitly define cancellation treatment
        # (e.g. "excluding cancellations" or "including cancellations").
        if re.search(r"\baverage\s+transaction\s+value\b", clean_q, re.IGNORECASE):
            cancellation_specified = bool(
                re.search(r"\b(exclud\w+|includ\w+|without|with|no)\s+cancellation\w*", clean_q, re.IGNORECASE)
                or re.search(r"\bcancellation\w*\s+(exclud\w+|includ\w+)", clean_q, re.IGNORECASE)
            )
            if not cancellation_specified:
                return (
                    None,
                    "Ambiguous cancellation treatment: dataset contains cancellations (InvoiceNo starting with 'C'). "
                    "Specify whether cancellations should be included or excluded.",
                )

        # 2. Try analytical patterns
        # Pattern A: Comparison ("Did revenue increase in X compared with Y?")
        comparison_claim = self._try_extract_comparison(clean_q, available_columns)
        if comparison_claim is not None:
            return comparison_claim, None

        # Pattern B: Extremum / Argmax ("Which country had the highest total revenue?")
        extremum_claim = self._try_extract_extremum(clean_q, available_columns)
        if extremum_claim is not None:
            return extremum_claim, None

        # Pattern C: Simple Aggregation ("What is the total revenue?")
        aggregation_claim = self._try_extract_simple_aggregation(clean_q, available_columns)
        if aggregation_claim is not None:
            return aggregation_claim, None

        return None, None

    def _is_ambiguous(self, question: str) -> bool:
        """Detect questions that lack a specific metric (e.g. 'performed best')."""
        has_ambiguous_phrase = any(p.search(question) for p in self.AMBIGUOUS_PATTERNS)
        if not has_ambiguous_phrase:
            return False

        # If a specific concrete metric is explicitly mentioned (e.g. "performed best in revenue"),
        # then it is not ambiguous. Otherwise, it is ambiguous.
        concrete_metrics = ["revenue", "sales", "transactions", "profit", "units", "quantity", "orders"]
        has_concrete_metric = any(re.search(rf"\b{m}\b", question, re.IGNORECASE) for m in concrete_metrics)
        return not has_concrete_metric

    def _resolve_column(self, term: str, available_columns: list[str] | None) -> str:
        """Resolve a natural language term to dataset column name if available."""
        if not available_columns:
            return self.COLUMN_SYNONYMS.get(term.lower(), term)

        # 1. Direct exact or case-insensitive match against available columns
        for col in available_columns:
            if col.lower() == term.lower():
                return col

        # 2. Synonym match mapped to available columns
        synonym = self.COLUMN_SYNONYMS.get(term.lower())
        if synonym:
            for col in available_columns:
                if col.lower() == synonym.lower():
                    return col
            return synonym

        return term

    def _clean_metric_text(self, raw: str) -> str:
        """Strip aggregation/ranking qualifier words from captured metric text."""
        cleaned = self._METRIC_NOISE.sub("", raw)
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
        return cleaned if cleaned else raw

    def _try_extract_extremum(
        self,
        question: str,
        available_columns: list[str] | None,
    ) -> StructuredClaim | None:
        """Handle questions like 'Which X had the highest Y?' or 'Which X has the most Y?'"""
        # Patterns for subject / group_by: "Which <subject>", "Who generated", etc.
        which_match = re.search(r"\bwhich\s+([a-zA-Z_\s]+?)\s+(?:had|has|generated|produced|shows?|is)\b", question, re.IGNORECASE)
        who_match = re.search(r"\bwho\s+(?:had|has|generated|produced)\b", question, re.IGNORECASE)

        subject = None
        if which_match:
            raw_subj = which_match.group(1).strip()
            # Clean common filler words
            raw_subj = re.sub(r"^(?:of\s+the|the|one)\s+", "", raw_subj, flags=re.IGNORECASE).strip()
            subject = raw_subj
        elif who_match or re.search(r"\bwhich\s+customer\b", question, re.IGNORECASE):
            subject = "customer"

        if not subject:
            return None

        # Operation & Direction
        is_max = bool(re.search(r"\b(highest|most|largest|greatest|maximum|max|top)\b", question, re.IGNORECASE))
        is_min = bool(re.search(r"\b(lowest|least|smallest|minimum|min|bottom)\b", question, re.IGNORECASE))

        if not (is_max or is_min):
            return None

        operation = OperationType.ARGMAX if is_max else OperationType.ARGMIN
        direction = DirectionType.HIGHER if is_max else DirectionType.LOWER

        # Aggregation
        aggregation = AggregationType.SUM
        distinct = False
        if re.search(r"\b(average|avg|mean)\b", question, re.IGNORECASE):
            aggregation = AggregationType.AVERAGE
        elif re.search(r"\bmost\s+transactions\b", question, re.IGNORECASE) or re.search(r"\bcount\b", question, re.IGNORECASE):
            aggregation = AggregationType.COUNT
            if re.search(r"\btransactions?\b", question, re.IGNORECASE):
                distinct = True

        # Cancellation filter extraction (if explicitly stated)
        cancellation_filter = None
        if re.search(r"\b(exclud\w+|without|no)\s+cancellation\w*", question, re.IGNORECASE) or re.search(r"\bcancellation\w*\s+exclud\w*", question, re.IGNORECASE):
            cancellation_filter = "EXCLUDE_CANCELLATIONS"
        elif re.search(r"\b(includ\w+|with)\s+cancellation\w*", question, re.IGNORECASE) or re.search(r"\bcancellation\w*\s+includ\w*", question, re.IGNORECASE):
            cancellation_filter = "INCLUDE_CANCELLATIONS"

        # Check for trailing 'by <qualifier>' (e.g. 'highest revenue by transaction')
        by_qualifier_match = re.search(r"\bby\s+([a-zA-Z_\s]+?)(?:\?|$)", question, re.IGNORECASE)
        by_qualifier = None
        if by_qualifier_match:
            cand = by_qualifier_match.group(1).strip()
            cand = re.sub(r"[?!.,]", "", cand).strip()
            # If the qualifier is not the subject itself
            if cand.lower() != subject.lower():
                by_qualifier = cand

        # Metric extraction — applies to all aggregation types including COUNT.
        # For COUNT, the metric represents what is being counted.
        metric = None
        metric_match = re.search(
            r"\b(?:highest|most|largest|greatest|lowest|least|smallest|average|total)\s+(?:total\s+|average\s+)?([a-zA-Z_\s]+?)(?:\s+by\s+[a-zA-Z_\s]+)?(?:\?|$)",
            question,
            re.IGNORECASE,
        )
        if metric_match:
            candidate = metric_match.group(1).strip()
            # Strip cancellation phrases from candidate (e.g. "excluding cancellations")
            candidate = re.sub(r"\b(?:exclud\w+|includ\w+|without|with|no)\s+cancellation\w*", "", candidate, flags=re.IGNORECASE).strip()
            candidate = re.sub(r"\bcancellation\w*\s+(?:exclud\w+|includ\w+)", "", candidate, flags=re.IGNORECASE).strip()
            # Also ensure any trailing 'by <qualifier>' is stripped from candidate if present
            candidate = re.sub(r"\s+by\s+.*$", "", candidate, flags=re.IGNORECASE).strip()
            candidate = re.sub(r"[?!.,]", "", candidate).strip()
            if candidate:
                metric = self._clean_metric_text(candidate)

        pre_aggregation = None
        if aggregation == AggregationType.AVERAGE and re.search(
            r"\btransaction\s+value\b", question, re.IGNORECASE
        ):
            pre_aggregation = PreAggregation(
                aggregation=AggregationType.SUM,
                group_by=self._resolve_column("transaction", available_columns),
            )
        elif by_qualifier and re.search(r"\btransactions?\b", by_qualifier, re.IGNORECASE):
            # E.g. "highest revenue by transaction": inner sum per transaction, outer extremum per subject
            pre_aggregation = PreAggregation(
                aggregation=AggregationType.SUM,
                group_by=self._resolve_column("transaction", available_columns),
            )

        # Map group_by and metric to dataset schema
        group_col = self._resolve_column(subject, available_columns)
        metric_col = self._resolve_column(metric, available_columns) if metric else None

        claim_text = f"{group_col} with {direction.value.lower()}"
        if distinct:
            claim_text += " distinct"
        claim_text += f" {aggregation.value.lower()}"
        if metric_col:
            claim_text += f" {metric_col}"
        if pre_aggregation is not None:
            claim_text += (
                f" after {pre_aggregation.aggregation.value.lower()} per "
                f"{pre_aggregation.group_by}"
            )
        if cancellation_filter:
            claim_text += f" ({cancellation_filter.lower()})"

        return StructuredClaim(
            claim_text=claim_text,
            claim_type=ClaimType.EXTREMUM,
            subject=subject,
            metric=metric_col,
            aggregation=aggregation,
            distinct=distinct,
            cancellation_filter=cancellation_filter,
            pre_aggregation=pre_aggregation,
            operation=operation,
            group_by=group_col,
            direction=direction,
            required_evidence=["ROW", "AGGREGATION"],
        )

    def _try_extract_simple_aggregation(
        self,
        question: str,
        available_columns: list[str] | None,
    ) -> StructuredClaim | None:
        """Handle questions like 'What is the total revenue?' or 'How many transactions?'"""
        agg_match = re.search(
            r"\b(?:what\s+is\s+the|calculate\s+the|find\s+the)\s+(total|average|mean|count|sum|minimum|maximum)\s+([a-zA-Z_\s]+?)(?:\?|$)",
            question,
            re.IGNORECASE,
        )
        if not agg_match:
            # Also check 'how many <items>'
            how_many = re.search(r"\bhow\s+many\s+([a-zA-Z_\s]+?)\s+(?:are\s+there|exist|occurred)(?:\?|$)", question, re.IGNORECASE)
            if how_many:
                return StructuredClaim(
                    claim_text=f"Total count of {how_many.group(1).strip()}",
                    claim_type=ClaimType.SIMPLE_AGGREGATION,
                    aggregation=AggregationType.COUNT,
                    operation=OperationType.TOTAL,
                    required_evidence=["AGGREGATION"],
                )
            return None

        agg_word = agg_match.group(1).lower()
        metric_raw = agg_match.group(2).strip().rstrip("?!.,")

        agg_map = {
            "total": AggregationType.SUM,
            "sum": AggregationType.SUM,
            "average": AggregationType.AVERAGE,
            "mean": AggregationType.AVERAGE,
            "count": AggregationType.COUNT,
            "minimum": AggregationType.MIN,
            "maximum": AggregationType.MAX,
        }
        aggregation = agg_map.get(agg_word, AggregationType.SUM)
        metric_col = self._resolve_column(metric_raw, available_columns)

        return StructuredClaim(
            claim_text=f"{aggregation.value} of {metric_col}",
            claim_type=ClaimType.SIMPLE_AGGREGATION,
            metric=metric_col,
            aggregation=aggregation,
            operation=OperationType.TOTAL,
            required_evidence=["AGGREGATION"],
        )

    def _try_extract_comparison(
        self,
        question: str,
        available_columns: list[str] | None,
    ) -> StructuredClaim | None:
        """Handle questions like 'Did revenue increase in the second half compared with the first half?'"""
        comp_match = re.search(
            r"\bdid\s+([a-zA-Z_\s]+?)\s+(increase|decrease|grow|drop|fall|rise)\s+in\s+(?:the\s+)?([a-zA-Z0-9_\s]+?)\s+compared\s+(?:with|to)\s+(?:the\s+)?([a-zA-Z0-9_\s]+?)(?:\?|$)",
            question,
            re.IGNORECASE,
        )
        if not comp_match:
            return None

        raw_metric = comp_match.group(1).strip()
        verb = comp_match.group(2).lower()
        target = comp_match.group(3).strip()
        baseline = comp_match.group(4).strip()

        is_increase = verb in ("increase", "grow", "rise")
        direction = DirectionType.INCREASE if is_increase else DirectionType.DECREASE
        operation = OperationType.COMPARE_GREATER if is_increase else OperationType.COMPARE_LESS

        metric_col = self._resolve_column(raw_metric, available_columns)

        return StructuredClaim(
            claim_text=f"{metric_col} {direction.value.lower()} in {target} vs {baseline}",
            claim_type=ClaimType.COMPARISON,
            metric=metric_col,
            aggregation=AggregationType.SUM,
            operation=operation,
            direction=direction,
            comparison_target=target,
            comparison_baseline=baseline,
            required_evidence=["AGGREGATION", "COMPARISON"],
        )


_default_extractor = RuleBasedClaimExtractor()


def get_claim_extractor() -> ClaimExtractorProtocol:
    """Return the configured semantic claim extractor."""
    return _default_extractor
