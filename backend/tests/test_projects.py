"""Tests for the project API endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_OWNER_ID = "00000000-0000-4000-8000-ffffffffffff"


# ---------------------------------------------------------------------------
# POST /projects
# ---------------------------------------------------------------------------

def test_create_project_success(mock_supabase) -> None:
    response = client.post(
        "/projects",
        json={"name": "My Research Project", "owner_id": VALID_OWNER_ID},
    )
    # The mock returns the pre-configured project row
    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert body["name"] == "My Research Project"
    assert body["status"] == "ACTIVE"


def test_create_project_with_description(mock_supabase) -> None:
    response = client.post(
        "/projects",
        json={
            "name": "Described Project",
            "description": "A project with a description.",
            "owner_id": VALID_OWNER_ID,
        },
    )
    assert response.status_code == 201


def test_create_project_rejects_empty_name() -> None:
    response = client.post(
        "/projects",
        json={"name": "   ", "owner_id": VALID_OWNER_ID},
    )
    assert response.status_code == 422


def test_create_project_rejects_missing_name() -> None:
    response = client.post(
        "/projects",
        json={"owner_id": VALID_OWNER_ID},
    )
    assert response.status_code == 422


def test_create_project_rejects_missing_owner_id() -> None:
    response = client.post(
        "/projects",
        json={"name": "No Owner"},
    )
    assert response.status_code == 422


def test_create_project_rejects_invalid_owner_uuid() -> None:
    response = client.post(
        "/projects",
        json={"name": "Bad UUID", "owner_id": "not-a-uuid"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /projects
# ---------------------------------------------------------------------------

def test_list_projects(mock_supabase) -> None:
    response = client.get("/projects")
    assert response.status_code == 200
    body = response.json()
    assert "projects" in body
    assert isinstance(body["projects"], list)
    assert len(body["projects"]) >= 1
    assert body["projects"][0]["name"] == "Test Project"


def test_list_projects_empty(monkeypatch) -> None:
    from tests.conftest import MockSupabaseClient
    empty_client = MockSupabaseClient(tables={"projects": []})

    import app.services.supabase_client as sc_mod
    monkeypatch.setattr(sc_mod, "get_supabase_client", lambda: empty_client)

    response = client.get("/projects")
    assert response.status_code == 200
    assert response.json() == {"projects": []}


# ---------------------------------------------------------------------------
# OpenAPI presence
# ---------------------------------------------------------------------------

def test_openapi_includes_project_endpoints() -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert "/projects" in paths
    assert "post" in paths["/projects"]
    assert "get" in paths["/projects"]
