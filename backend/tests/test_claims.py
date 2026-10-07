"""Tests for claim extraction and validation (Task 3).

Covers:
- Rule-based extraction for all 6 analytical patterns
- Deterministic validation against dataset schema
- API endpoint integration tests
- Ambiguity detection
- Invalid column references
- Unparseable questions
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.schemas.claim import (
    AggregationType,
    ClaimType,
    ClaimValidationStatus,
    DirectionType,
    OperationType,
    StructuredClaim,
)
from app.services.claim_extractor import RuleBasedClaimExtractor
from app.services.claim_validator import validate_claim

# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

RETAIL_COLUMNS = [
    "RowID", "InvoiceNo", "StockCode", "Description", "Quantity",
    "InvoiceDate", "UnitPrice", "CustomerID", "Country", "Revenue",
    "SourceDataset", "SourcePeriod", "DuplicateFlag",
]

DEMO_DATASET_ID = "d1000000-0000-4000-8000-000000000001"

DEMO_PROFILE = {
    "row_count": 100,
    "column_count": 13,
    "columns": [{"name": c, "type": "string"} for c in RETAIL_COLUMNS],
}


# ---------------------------------------------------------------------------
# Unit tests: RuleBasedClaimExtractor
# ---------------------------------------------------------------------------


class TestExtractorExtrema:
    """Pattern: Which <subject> had the highest/lowest <aggregation> <metric>?"""

    extractor = RuleBasedClaimExtractor()

    def test_highest_total_revenue_by_country(self):
        """SUM + ARGMAX: 'Which country had the highest total revenue?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "Which country had the highest total revenue?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.EXTREMUM
        assert claim.aggregation == AggregationType.SUM
        assert claim.operation == OperationType.ARGMAX
        assert claim.direction == DirectionType.HIGHER
        assert claim.group_by == "Country"
        assert claim.metric == "Revenue"

    def test_most_transactions_by_country(self):
        """COUNT DISTINCT: 'Which country has the most transactions?' must be COUNT DISTINCT InvoiceNo."""
        claim, ambiguity = self.extractor.extract_claim(
            "Which country has the most transactions?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.EXTREMUM
        assert claim.aggregation == AggregationType.COUNT
        assert claim.distinct is True
        assert claim.operation == OperationType.ARGMAX
        assert claim.direction == DirectionType.HIGHER
        assert claim.group_by == "Country"
        assert claim.subject == "country"
        assert claim.metric == "InvoiceNo"
        assert claim.group_by != "InvoiceNo"
        assert claim.group_by != "CustomerID"

        # Validate that the resulting claim passes deterministic validation
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.VALID
        assert errors == []

    def test_highest_average_transaction_value_unspecified_cancellations_is_ambiguous(self):
        """AVERAGE transaction value without specifying cancellation treatment is AMBIGUOUS."""
        claim, ambiguity = self.extractor.extract_claim(
            "Which country has the highest average transaction value?",
            available_columns=RETAIL_COLUMNS,
        )
        assert claim is None
        assert ambiguity is not None
        assert "cancellation" in ambiguity.lower()

    def test_highest_average_transaction_value_with_explicit_cancellations(self):
        """AVERAGE transaction value with explicit cancellation handling produces valid claim."""
        claim, ambiguity = self.extractor.extract_claim(
            "Which country has the highest average transaction value excluding cancellations?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.EXTREMUM
        assert claim.aggregation == AggregationType.AVERAGE
        assert claim.operation == OperationType.ARGMAX
        assert claim.direction == DirectionType.HIGHER
        assert claim.metric == "Revenue"
        assert claim.cancellation_filter == "EXCLUDE_CANCELLATIONS"
        assert claim.pre_aggregation is not None
        assert claim.pre_aggregation.aggregation == AggregationType.SUM
        assert claim.pre_aggregation.group_by == "InvoiceNo"
        status, errors, _ = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.VALID
        assert errors == []
        assert claim.group_by == "Country"

    def test_highest_revenue_by_transaction_trailing_qualifier(self):
        """'Which country had the highest revenue by transaction?' -> metric=Revenue, not 'revenue by transaction'."""
        claim, ambiguity = self.extractor.extract_claim(
            "Which country had the highest revenue by transaction?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.metric == "Revenue"
        assert "by" not in claim.metric.lower()
        assert "transaction" not in claim.metric.lower()
        assert claim.group_by == "Country"
        assert claim.pre_aggregation is not None
        assert claim.pre_aggregation.group_by == "InvoiceNo"

    def test_customer_highest_revenue(self):
        """ARGMAX by customer: 'Which customer generated the highest revenue?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "Which customer generated the highest revenue?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.EXTREMUM
        assert claim.operation == OperationType.ARGMAX
        assert claim.metric == "Revenue"

    def test_lowest_revenue_by_country(self):
        """ARGMIN: 'Which country had the lowest total revenue?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "Which country had the lowest total revenue?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.operation == OperationType.ARGMIN
        assert claim.direction == DirectionType.LOWER



class TestExtractorSimpleAggregation:
    """Pattern: What is the total/average/count of <metric>?"""

    extractor = RuleBasedClaimExtractor()

    def test_total_revenue(self):
        """'What is the total revenue?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "What is the total revenue?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.SIMPLE_AGGREGATION
        assert claim.aggregation == AggregationType.SUM
        assert claim.operation == OperationType.TOTAL
        assert claim.metric == "Revenue"

    def test_average_unit_price(self):
        """'What is the average unit price?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "What is the average unit price?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.SIMPLE_AGGREGATION
        assert claim.aggregation == AggregationType.AVERAGE
        assert claim.metric == "UnitPrice"

    def test_how_many_transactions(self):
        """'How many transactions are there?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "How many transactions are there?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.SIMPLE_AGGREGATION
        assert claim.aggregation == AggregationType.COUNT


class TestExtractorComparison:
    """Pattern: Did <metric> increase/decrease in <target> compared with <baseline>?"""

    extractor = RuleBasedClaimExtractor()

    def test_revenue_increase_comparison(self):
        """'Did revenue increase in the second half compared with the first half?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "Did revenue increase in the second half compared with the first half?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.COMPARISON
        assert claim.metric == "Revenue"
        assert claim.direction == DirectionType.INCREASE
        assert claim.operation == OperationType.COMPARE_GREATER
        assert claim.comparison_target is not None
        assert claim.comparison_baseline is not None

    def test_revenue_decrease_comparison(self):
        """'Did revenue decrease in Q4 compared to Q3?'"""
        claim, ambiguity = self.extractor.extract_claim(
            "Did revenue decrease in Q4 compared to Q3?",
            available_columns=RETAIL_COLUMNS,
        )
        assert ambiguity is None
        assert claim is not None
        assert claim.claim_type == ClaimType.COMPARISON
        assert claim.direction == DirectionType.DECREASE
        assert claim.operation == OperationType.COMPARE_LESS


class TestExtractorAmbiguity:
    """Ambiguous questions must be detected, not guessed at."""

    extractor = RuleBasedClaimExtractor()

    def test_ambiguous_performed_best(self):
        """'Which country performed best?' — no metric specified."""
        claim, ambiguity = self.extractor.extract_claim(
            "Which country performed best?",
            available_columns=RETAIL_COLUMNS,
        )
        assert claim is None
        assert ambiguity is not None
        assert "metric" in ambiguity.lower() or "specified" in ambiguity.lower()

    def test_ambiguous_top_performer(self):
        """'Who is the top performer?' — no metric specified."""
        claim, ambiguity = self.extractor.extract_claim(
            "Who is the top performer?",
            available_columns=RETAIL_COLUMNS,
        )
        assert claim is None
        assert ambiguity is not None


class TestExtractorUnparseable:
    """Non-analytical questions return (None, None)."""

    extractor = RuleBasedClaimExtractor()

    def test_unparseable_greeting(self):
        claim, ambiguity = self.extractor.extract_claim(
            "Hello, how are you?",
            available_columns=RETAIL_COLUMNS,
        )
        assert claim is None
        assert ambiguity is None

    def test_unparseable_statement(self):
        claim, ambiguity = self.extractor.extract_claim(
            "The weather is nice today.",
            available_columns=RETAIL_COLUMNS,
        )
        assert claim is None
        assert ambiguity is None


# ---------------------------------------------------------------------------
# Unit tests: Deterministic Validator
# ---------------------------------------------------------------------------


class TestValidator:

    def test_valid_extremum_claim(self):
        claim = StructuredClaim(
            claim_text="Country with higher sum Revenue",
            claim_type=ClaimType.EXTREMUM,
            metric="Revenue",
            aggregation=AggregationType.SUM,
            operation=OperationType.ARGMAX,
            group_by="Country",
            direction=DirectionType.HIGHER,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.VALID
        assert errors == []

    def test_invalid_metric_column(self):
        """Metric 'Profit' does not exist in the schema."""
        claim = StructuredClaim(
            claim_text="Country with higher sum Profit",
            claim_type=ClaimType.EXTREMUM,
            metric="Profit",
            aggregation=AggregationType.SUM,
            operation=OperationType.ARGMAX,
            group_by="Country",
            direction=DirectionType.HIGHER,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.INVALID
        assert any("Profit" in e for e in errors)

    def test_invalid_group_by_column(self):
        """Group-by 'Region' does not exist in the schema."""
        claim = StructuredClaim(
            claim_text="Region with higher sum Revenue",
            claim_type=ClaimType.EXTREMUM,
            metric="Revenue",
            aggregation=AggregationType.SUM,
            operation=OperationType.ARGMAX,
            group_by="Region",
            direction=DirectionType.HIGHER,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.INVALID
        assert any("Region" in e for e in errors)

    def test_extremum_without_group_by(self):
        """EXTREMUM claims require a group_by."""
        claim = StructuredClaim(
            claim_text="higher sum Revenue",
            claim_type=ClaimType.EXTREMUM,
            metric="Revenue",
            aggregation=AggregationType.SUM,
            operation=OperationType.ARGMAX,
            direction=DirectionType.HIGHER,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.INVALID
        assert any("group_by" in e for e in errors)

    def test_comparison_missing_target(self):
        """COMPARISON claims require comparison_target and comparison_baseline."""
        claim = StructuredClaim(
            claim_text="Revenue increase",
            claim_type=ClaimType.COMPARISON,
            metric="Revenue",
            aggregation=AggregationType.SUM,
            operation=OperationType.COMPARE_GREATER,
            direction=DirectionType.INCREASE,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.INVALID
        assert any("comparison_target" in e for e in errors)
        assert any("comparison_baseline" in e for e in errors)

    def test_simple_agg_missing_metric(self):
        """SIMPLE_AGGREGATION (non-COUNT) requires a metric."""
        claim = StructuredClaim(
            claim_text="SUM of unknown",
            claim_type=ClaimType.SIMPLE_AGGREGATION,
            aggregation=AggregationType.SUM,
            operation=OperationType.TOTAL,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.INVALID
        assert any("metric" in e.lower() for e in errors)

    def test_simple_agg_count_no_metric_is_valid(self):
        """COUNT aggregation does not require a metric column."""
        claim = StructuredClaim(
            claim_text="Total count of transactions",
            claim_type=ClaimType.SIMPLE_AGGREGATION,
            aggregation=AggregationType.COUNT,
            operation=OperationType.TOTAL,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.VALID
        assert errors == []

    def test_case_insensitive_column_matching(self):
        """Column matching should be case-insensitive."""
        claim = StructuredClaim(
            claim_text="Country with higher sum revenue",
            claim_type=ClaimType.EXTREMUM,
            metric="revenue",  # lowercase
            aggregation=AggregationType.SUM,
            operation=OperationType.ARGMAX,
            group_by="country",  # lowercase
            direction=DirectionType.HIGHER,
        )
        status, errors, warnings = validate_claim(claim, RETAIL_COLUMNS)
        assert status == ClaimValidationStatus.VALID


# ---------------------------------------------------------------------------
# API integration tests
# ---------------------------------------------------------------------------


OWNER_USER_ID = "00000000-0000-4000-8000-ffffffffffff"
OWNER_ACCESS_TOKEN = "owner.header.signature"
AUTH_HEADERS = {"Authorization": f"Bearer {OWNER_ACCESS_TOKEN}"}
OTHER_USER_ID = "99999999-9999-4999-8999-999999999999"
OTHER_USER_ACCESS_TOKEN = "other.header.signature"
OTHER_USER_AUTH_HEADERS = {"Authorization": f"Bearer {OTHER_USER_ACCESS_TOKEN}"}


@pytest.fixture()
def mock_supabase_with_profile(mock_supabase):
    """Extend the base mock_supabase with a dataset profile containing retail columns."""
    authenticated_users = {
        OWNER_ACCESS_TOKEN: OWNER_USER_ID,
        OTHER_USER_ACCESS_TOKEN: OTHER_USER_ID,
    }

    def get_user(access_token):
        user_id = authenticated_users.get(access_token)
        if user_id is None:
            raise ValueError("Invalid JWT")
        return SimpleNamespace(user=SimpleNamespace(id=user_id))

    mock_supabase.auth = SimpleNamespace(get_user=get_user)
    mock_supabase._tables["dataset_profiles"] = [
        {
            "dataset_id": DEMO_DATASET_ID,
            "profile": DEMO_PROFILE,
        }
    ]
    return mock_supabase


@pytest.mark.anyio
async def test_extract_valid_extremum(mock_supabase_with_profile):
    """POST /claims/extract — valid EXTREMUM question returns VALID claim."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "Which country had the highest total revenue?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "VALID"
    assert body["claim"] is not None
    assert body["claim"]["claim_type"] == "EXTREMUM"
    assert body["claim"]["metric"] == "Revenue"
    assert body["claim"]["group_by"] == "Country"
    assert body["validation_errors"] == []



@pytest.mark.anyio
async def test_extract_simple_aggregation(mock_supabase_with_profile):
    """POST /claims/extract — simple aggregation returns VALID."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "What is the total revenue?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "VALID"
    assert body["claim"]["claim_type"] == "SIMPLE_AGGREGATION"


@pytest.mark.anyio
async def test_extract_comparison(mock_supabase_with_profile):
    """POST /claims/extract — comparison question returns VALID."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "Did revenue increase in the second half compared with the first half?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "VALID"
    assert body["claim"]["claim_type"] == "COMPARISON"
    assert body["claim"]["direction"] == "INCREASE"


@pytest.mark.anyio
async def test_extract_ambiguous_question(mock_supabase_with_profile):
    """POST /claims/extract — ambiguous question returns AMBIGUOUS status."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "Which country performed best?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "AMBIGUOUS"
    assert body["claim"] is None
    assert body["ambiguity_reason"] is not None


@pytest.mark.anyio
async def test_extract_unparseable_question(mock_supabase_with_profile):
    """POST /claims/extract — non-analytical question returns INVALID."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "Hello, how are you?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "INVALID"
    assert body["claim"] is None
    assert len(body["validation_errors"]) > 0


@pytest.mark.anyio
async def test_extract_invalid_metric_column(mock_supabase_with_profile):
    """POST /claims/extract — question referencing non-existent column → INVALID."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "What is the total profit?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "INVALID"
    assert body["claim"] is not None
    assert body["claim"]["metric"] == "profit"
    assert len(body["validation_errors"]) > 0
    assert any("profit" in err.lower() and "does not exist" in err.lower() for err in body["validation_errors"])


@pytest.mark.anyio
async def test_extract_dataset_not_found(mock_supabase_with_profile):
    """POST /claims/extract — non-existent dataset_id returns 404."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "What is the total revenue?",
                "dataset_id": "00000000-0000-4000-8000-000000000099",
            },
        )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_extract_empty_question(mock_supabase_with_profile):
    """POST /claims/extract — empty question returns 422."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "   ",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_extract_missing_dataset_id(mock_supabase_with_profile):
    """POST /claims/extract — missing dataset_id returns 422."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={"question": "What is the total revenue?"},
        )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_openapi_includes_claims_extract():
    """The OpenAPI schema should document the /claims/extract endpoint."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    paths = resp.json()["paths"]
    assert "/claims/extract" in paths
    assert "post" in paths["/claims/extract"]


@pytest.mark.anyio
async def test_extract_dataset_not_ready_returns_400(mock_supabase_with_profile):
    """POST /claims/extract — dataset in UPLOADING or non-ready status returns 400."""
    uploading_ds_id = "d2000000-0000-4000-8000-000000000002"
    mock_supabase_with_profile._tables["datasets"].append({
        "id": uploading_ds_id,
        "project_id": "a0000000-0000-4000-8000-000000000001",
        "name": "uploading_dataset",
        "status": "UPLOADING",
    })
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "What is the total revenue?",
                "dataset_id": uploading_ds_id,
            },
        )
    assert resp.status_code == 400
    body = resp.json()
    assert "not ready" in body["error"]["message"].lower()
    assert "UPLOADING" in body["error"]["message"]


@pytest.mark.anyio
async def test_extract_dataset_with_null_profile_returns_404(mock_supabase_with_profile):
    """POST /claims/extract — dataset exists and is READY, but profile row is None/empty."""
    null_profile_ds_id = "d3000000-0000-4000-8000-000000000003"
    mock_supabase_with_profile._tables["datasets"].append({
        "id": null_profile_ds_id,
        "project_id": "a0000000-0000-4000-8000-000000000001",
        "name": "null_profile_dataset",
        "status": "READY",
    })
    # Add a dataset_profiles entry where profile is None
    mock_supabase_with_profile._tables["dataset_profiles"].append({
        "dataset_id": null_profile_ds_id,
        "profile": None,
    })
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=AUTH_HEADERS,
            json={
                "question": "What is the total revenue?",
                "dataset_id": null_profile_ds_id,
            },
        )
    assert resp.status_code == 404
    body = resp.json()
    assert "empty or unavailable" in body["error"]["message"].lower()


@pytest.mark.anyio
async def test_extract_unauthenticated_request_rejected_401(mock_supabase_with_profile):
    """POST /claims/extract — unauthenticated caller is rejected with 401."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            # No Authorization header
            json={
                "question": "What is the total revenue?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 401
    body = resp.json()
    assert "authentication" in body["error"]["message"].lower() or "credentials" in body["error"]["message"].lower()


@pytest.mark.anyio
async def test_extract_malformed_authorization_rejected_401(mock_supabase_with_profile):
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers={"Authorization": "Basic not-a-bearer-token"},
            json={"question": "What is the total revenue?", "dataset_id": DEMO_DATASET_ID},
        )
    assert resp.status_code == 401
    assert "Revenue" not in resp.text


@pytest.mark.anyio
async def test_extract_uuid_bearer_token_rejected_401(mock_supabase_with_profile):
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers={"Authorization": f"Bearer {OWNER_USER_ID}"},
            json={"question": "What is the total revenue?", "dataset_id": DEMO_DATASET_ID},
        )
    assert resp.status_code == 401
    assert "Revenue" not in resp.text


@pytest.mark.anyio
async def test_extract_invalid_jwt_rejected_401(mock_supabase_with_profile):
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers={"Authorization": "Bearer invalid.jwt.token"},
            json={"question": "What is the total revenue?", "dataset_id": DEMO_DATASET_ID},
        )
    assert resp.status_code == 401
    assert "Revenue" not in resp.text


@pytest.mark.anyio
async def test_extract_expired_jwt_rejected_401(mock_supabase_with_profile):
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers={"Authorization": "Bearer expired.header.signature"},
            json={"question": "What is the total revenue?", "dataset_id": DEMO_DATASET_ID},
        )
    assert resp.status_code == 401
    assert "Revenue" not in resp.text


@pytest.mark.anyio
async def test_extract_other_user_dataset_rejected_403(mock_supabase_with_profile):
    """POST /claims/extract — caller attempting to extract claims on another user's dataset is rejected with 403."""
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/claims/extract",
            headers=OTHER_USER_AUTH_HEADERS,  # Not the owner of project DEMO_PROJECT_ROW
            json={
                "question": "What is the total revenue?",
                "dataset_id": DEMO_DATASET_ID,
            },
        )
    assert resp.status_code == 403
    body = resp.json()
    assert body["error"]["message"] == "Access forbidden."
    # Confirm schema is NOT leaked in the error
    assert "columns" not in body["error"]["message"]
    assert "Revenue" not in body["error"]["message"]
    assert DEMO_DATASET_ID not in resp.text
    assert OWNER_USER_ID not in resp.text



class TestExtractorMetricQualifiers:
    """Regression tests for Finding 3: Metric extraction strips surrounding qualifiers."""

    extractor = RuleBasedClaimExtractor()

    def test_highest_total_revenue_strips_total_from_metric(self):
        """'Which country had the highest total revenue?' -> metric is Revenue."""
        claim, _ = self.extractor.extract_claim(
            "Which country had the highest total revenue?",
            available_columns=RETAIL_COLUMNS,
        )
        assert claim is not None
        assert claim.metric == "Revenue"
        assert claim.aggregation == AggregationType.SUM
        assert claim.operation == OperationType.ARGMAX

    def test_highest_average_transaction_value_resolves_transaction_totals(self):
        """The average transaction value uses invoice totals when cancellations are specified."""
        claim, _ = self.extractor.extract_claim(
            "Which country has the highest average transaction value excluding cancellations?",
            available_columns=RETAIL_COLUMNS,
        )
        assert claim is not None
        assert claim.metric == "Revenue"
        assert claim.aggregation == AggregationType.AVERAGE
        assert claim.cancellation_filter == "EXCLUDE_CANCELLATIONS"
        assert claim.pre_aggregation is not None
        assert claim.pre_aggregation.aggregation == AggregationType.SUM
        assert claim.pre_aggregation.group_by == "InvoiceNo"

    def test_clean_metric_text_removes_noise_words(self):
        assert self.extractor._clean_metric_text("total revenue") == "revenue"
        assert self.extractor._clean_metric_text("average unit price") == "unit price"
        assert self.extractor._clean_metric_text("highest revenue") == "revenue"
