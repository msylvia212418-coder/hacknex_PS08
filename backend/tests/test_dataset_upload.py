"""Tests for dataset upload pipeline and retrieval."""

from __future__ import annotations

import hashlib
import io

from fastapi.testclient import TestClient

from app.main import app
from app.services import dataset_service

client = TestClient(app)

PROJECT_ID = "a0000000-0000-4000-8000-000000000001"
DATASET_ID = "d1000000-0000-4000-8000-000000000001"


# ---------------------------------------------------------------------------
# Profiler / service unit tests (no Supabase required)
# ---------------------------------------------------------------------------

def test_compute_content_hash_is_deterministic() -> None:
    data = b"Name,Age\nAlice,30\nBob,25\n"
    expected = hashlib.sha256(data).hexdigest()

    file_obj = io.BytesIO(data)
    result_hash, result_size = dataset_service.compute_content_hash(file_obj)

    assert result_hash == expected
    assert result_size == len(data)
    # File position should be reset
    assert file_obj.tell() == 0


def test_compute_content_hash_streaming_matches_full_read() -> None:
    """Confirm the chunked streaming hash equals a single-read hash."""
    data = b"x" * 200_000  # larger than HASH_CHUNK_SIZE
    file_obj = io.BytesIO(data)
    result_hash, _ = dataset_service.compute_content_hash(file_obj)
    assert result_hash == hashlib.sha256(data).hexdigest()


def test_validate_csv_structure_returns_headers() -> None:
    csv_bytes = b"Name,Age,Score\nAlice,30,95\n"
    file_obj = io.BytesIO(csv_bytes)
    headers = dataset_service.validate_csv_structure(file_obj)
    assert headers == ["Name", "Age", "Score"]
    assert file_obj.tell() == 0  # reset


def test_validate_csv_rejects_empty_file() -> None:
    file_obj = io.BytesIO(b"")
    try:
        dataset_service.validate_csv_structure(file_obj)
        assert False, "Should have raised ValueError"
    except ValueError as exc:
        assert "empty" in str(exc).lower()


def test_validate_csv_rejects_header_only() -> None:
    file_obj = io.BytesIO(b"A,B,C\n")
    try:
        dataset_service.validate_csv_structure(file_obj)
        assert False, "Should have raised ValueError"
    except ValueError as exc:
        assert "no data" in str(exc).lower()


def test_profile_csv_basic() -> None:
    csv_bytes = b"Name,Age,Score\nAlice,30,95.5\nBob,,88.0\nCharlie,25,\n"
    file_obj = io.BytesIO(csv_bytes)
    profile = dataset_service.profile_csv(file_obj)

    assert profile["row_count"] == 3
    assert profile["column_count"] == 3
    assert len(profile["columns"]) == 3

    name_col = profile["columns"][0]
    assert name_col["name"] == "Name"
    assert name_col["type"] == "string"
    assert name_col["non_null_count"] == 3
    assert name_col["null_count"] == 0

    age_col = profile["columns"][1]
    assert age_col["name"] == "Age"
    assert age_col["type"] == "integer"
    assert age_col["non_null_count"] == 2
    assert age_col["null_count"] == 1  # Bob's age is missing

    score_col = profile["columns"][2]
    assert score_col["name"] == "Score"
    assert score_col["type"] == "numeric"
    assert score_col["non_null_count"] == 2
    assert score_col["null_count"] == 1  # Charlie's score is missing


def test_profile_csv_numeric_stats() -> None:
    csv_bytes = b"Value\n10\n20\n30\n"
    file_obj = io.BytesIO(csv_bytes)
    profile = dataset_service.profile_csv(file_obj)

    col = profile["columns"][0]
    assert col["type"] == "integer"
    assert col["min"] == 10.0
    assert col["max"] == 30.0
    assert col["mean"] == 20.0


def test_profile_csv_missing_values_are_not_errors() -> None:
    """Missing values should be counted but NOT cause profile failure."""
    csv_bytes = b"A,B,C\n1,,x\n,2,\n3,,y\n"
    file_obj = io.BytesIO(csv_bytes)
    profile = dataset_service.profile_csv(file_obj)

    assert profile["row_count"] == 3
    a_col = profile["columns"][0]
    assert a_col["null_count"] == 1
    assert a_col["non_null_count"] == 2

    b_col = profile["columns"][1]
    assert b_col["null_count"] == 2
    assert b_col["non_null_count"] == 1


def test_profile_csv_distinct_count() -> None:
    csv_bytes = b"Color\nred\nblue\nred\ngreen\nblue\n"
    file_obj = io.BytesIO(csv_bytes)
    profile = dataset_service.profile_csv(file_obj)

    col = profile["columns"][0]
    assert col["distinct_count"] == 3  # red, blue, green


def test_profile_does_not_load_entire_file_into_memory() -> None:
    """Verify profiling streams row-by-row by profiling a large synthetic CSV."""
    # Generate a CSV with 50,000 rows — if loaded entirely, would consume
    # significant memory, but streaming processes one row at a time.
    header = b"ID,Value,Label\n"
    rows = b"".join(f"{i},{i * 1.5},item_{i}\n".encode() for i in range(50_000))
    data = header + rows
    file_obj = io.BytesIO(data)

    profile = dataset_service.profile_csv(file_obj)
    assert profile["row_count"] == 50_000
    assert profile["column_count"] == 3

    id_col = profile["columns"][0]
    assert id_col["type"] == "integer"
    assert id_col["min"] == 0.0
    assert id_col["max"] == 49_999.0


def test_profile_csv_with_bom() -> None:
    """UTF-8 BOM should not corrupt the first column name."""
    csv_bytes = b"\xef\xbb\xbfName,Age\nAlice,30\n"
    file_obj = io.BytesIO(csv_bytes)
    profile = dataset_service.profile_csv(file_obj)
    assert profile["columns"][0]["name"] == "Name"  # not "\ufeffName"


# ---------------------------------------------------------------------------
# API endpoint tests (mocked Supabase)
# ---------------------------------------------------------------------------

def test_upload_valid_csv(mock_supabase) -> None:
    csv_data = b"Name,Age\nAlice,30\nBob,25\n"
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("people.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "READY"
    assert body["original_filename"] == "people.csv"
    assert "profile" in body
    assert body["profile"]["row_count"] == 2
    assert body["profile"]["column_count"] == 2


def test_upload_csv_with_custom_name(mock_supabase) -> None:
    csv_data = b"X\n1\n"
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID, "name": "Custom Name"},
        files={"file": ("data.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Custom Name"


def test_upload_rejects_non_csv(mock_supabase) -> None:
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("notes.txt", b"not csv", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_media_type"


def test_upload_requires_file(mock_supabase) -> None:
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
    )
    assert response.status_code == 400


def test_upload_rejects_empty_filename(mock_supabase) -> None:
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("", b"", "text/csv")},
    )
    assert response.status_code == 400


def test_upload_rejects_empty_csv(mock_supabase) -> None:
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400


def test_upload_rejects_header_only_csv(mock_supabase) -> None:
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("headers.csv", b"A,B,C\n", "text/csv")},
    )
    assert response.status_code == 400


def test_upload_rejects_missing_project_id() -> None:
    response = client.post(
        "/datasets/upload",
        files={"file": ("data.csv", b"A\n1\n", "text/csv")},
    )
    assert response.status_code == 422


def test_upload_rejects_invalid_project_uuid() -> None:
    response = client.post(
        "/datasets/upload",
        data={"project_id": "not-a-uuid"},
        files={"file": ("data.csv", b"A\n1\n", "text/csv")},
    )
    assert response.status_code == 422


def test_upload_rejects_nonexistent_project(monkeypatch) -> None:
    """When project_id is valid UUID but project does not exist, return 404."""
    from tests.conftest import MockSupabaseClient

    # Empty projects table → project not found
    empty_client = MockSupabaseClient(tables={"projects": []})
    import app.services.supabase_client as sc_mod
    monkeypatch.setattr(sc_mod, "get_supabase_client", lambda: empty_client)

    response = client.post(
        "/datasets/upload",
        data={"project_id": "99999999-9999-4999-8999-999999999999"},
        files={"file": ("data.csv", b"A\n1\n", "text/csv")},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"].lower()


def test_upload_content_hash_is_correct(mock_supabase) -> None:
    csv_data = b"Col\nval\n"
    expected_hash = hashlib.sha256(csv_data).hexdigest()
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("hash.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 201
    assert response.json()["content_hash"] == expected_hash


def test_upload_profile_includes_column_types(mock_supabase) -> None:
    csv_data = b"IntCol,FloatCol,StrCol\n42,3.14,hello\n7,2.71,world\n"
    response = client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("types.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 201
    columns = response.json()["profile"]["columns"]
    assert columns[0]["type"] == "integer"
    assert columns[1]["type"] == "numeric"
    assert columns[2]["type"] == "string"


# ---------------------------------------------------------------------------
# GET /datasets/{dataset_id}
# ---------------------------------------------------------------------------

def test_get_dataset_success(monkeypatch) -> None:
    from tests.conftest import MockSupabaseClient, DEMO_DATASET_ROW

    dataset_with_profile = {
        **DEMO_DATASET_ROW,
        "dataset_profiles": [{"profile": {"row_count": 10, "column_count": 2, "columns": []}}],
    }
    mock_client = MockSupabaseClient(tables={"datasets": [dataset_with_profile]})
    import app.services.supabase_client as sc_mod
    monkeypatch.setattr(sc_mod, "get_supabase_client", lambda: mock_client)

    response = client.get(f"/datasets/{DATASET_ID}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == DATASET_ID
    assert body["status"] == "READY"
    assert body["profile"]["row_count"] == 10


def test_get_dataset_not_found(monkeypatch) -> None:
    from tests.conftest import MockSupabaseClient

    empty_client = MockSupabaseClient(tables={"datasets": []})
    import app.services.supabase_client as sc_mod
    monkeypatch.setattr(sc_mod, "get_supabase_client", lambda: empty_client)

    response = client.get("/datasets/99999999-9999-4999-8999-999999999999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_get_dataset_invalid_uuid() -> None:
    response = client.get("/datasets/not-a-uuid")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# OpenAPI contract
# ---------------------------------------------------------------------------

def test_openapi_documents_dataset_endpoints() -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert "/datasets/upload" in paths
    assert "post" in paths["/datasets/upload"]
    assert set(paths["/datasets/upload"]["post"]["responses"]) >= {
        "201", "400", "404", "413", "415", "422"
    }
    assert "/datasets/{dataset_id}" in paths
    assert "get" in paths["/datasets/{dataset_id}"]
    assert set(paths["/datasets/{dataset_id}"]["get"]["responses"]) >= {"200", "404", "422"}
