import asyncio

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.middleware import UploadSizeLimitMiddleware
from app.main import app, create_app

client = TestClient(app)

PROJECT_ID = "a0000000-0000-4000-8000-000000000001"


# ---------------------------------------------------------------------------
# Upload validation (file-level checks run before project lookup)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Upload size-limit middleware
# ---------------------------------------------------------------------------

def test_upload_rejects_request_body_over_configured_limit() -> None:
    limited_client = TestClient(create_app(Settings(max_upload_size_bytes=128)))
    response = limited_client.post(
        "/datasets/upload",
        data={"project_id": PROJECT_ID},
        files={"file": ("table.csv", b"x" * 256, "text/csv")},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"


def test_upload_limit_counts_streamed_body_without_content_length() -> None:
    downstream_messages = []
    response_messages = []
    request_messages = [
        {"type": "http.request", "body": b"x" * 80, "more_body": True},
        {"type": "http.request", "body": b"x" * 80, "more_body": False},
    ]

    async def downstream(scope, receive, send) -> None:
        while True:
            message = await receive()
            downstream_messages.append(message)
            if not message.get("more_body", False):
                await send({"type": "http.response.start", "status": 200, "headers": []})
                await send({"type": "http.response.body", "body": b""})
                return

    async def receive():
        return request_messages.pop(0)

    async def send(message) -> None:
        response_messages.append(message)

    middleware = UploadSizeLimitMiddleware(downstream, max_size_bytes=128)
    asyncio.run(
        middleware(
            {
                "type": "http",
                "method": "POST",
                "path": "/datasets/upload",
                "headers": [],
            },
            receive,
            send,
        )
    )

    assert response_messages[0]["status"] == 413
    assert len(downstream_messages) == 1


# ---------------------------------------------------------------------------
# Analysis endpoints remain unchanged placeholders
# ---------------------------------------------------------------------------

def test_analysis_rejects_invalid_dataset_uuid() -> None:
    response = client.post("/analysis", json={"dataset_id": "not-a-uuid", "question": "Count rows"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_analysis_rejects_empty_question() -> None:
    response = client.post(
        "/analysis",
        json={"dataset_id": "11111111-1111-4111-8111-111111111111", "question": "   "},
    )
    assert response.status_code == 422


def test_analysis_pipeline_is_explicitly_unimplemented() -> None:
    response = client.post(
        "/analysis",
        json={"dataset_id": "11111111-1111-4111-8111-111111111111", "question": "Count rows"},
    )
    assert response.status_code == 501
    assert response.json()["error"]["code"] == "not_implemented"


def test_analysis_lookup_rejects_invalid_uuid() -> None:
    response = client.get("/analysis/not-a-uuid")
    assert response.status_code == 422


def test_analysis_lookup_is_explicitly_unimplemented() -> None:
    response = client.get("/analysis/11111111-1111-4111-8111-111111111111")
    assert response.status_code == 501


# ---------------------------------------------------------------------------
# OpenAPI contract (regression: existing endpoints must remain documented)
# ---------------------------------------------------------------------------

def test_openapi_documents_runtime_response_status_codes() -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths["/health"]["get"]["responses"]) >= {"200"}
    assert set(paths["/health/db"]["get"]["responses"]) >= {"200", "503"}
    assert set(paths["/datasets/upload"]["post"]["responses"]) >= {
        "201", "400", "413", "415", "422"
    }
    assert set(paths["/analysis"]["post"]["responses"]) >= {"501", "422"}
    assert set(paths["/analysis/{analysis_id}"]["get"]["responses"]) >= {"501", "422"}
