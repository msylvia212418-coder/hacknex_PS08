from __future__ import annotations

import csv
import shutil
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

import app.api.verification as verification_api
from app.main import create_app


OWNER_ID = "00000000-0000-4000-8000-ffffffffffff"
OTHER_ID = "99999999-9999-4999-8999-999999999999"
DATASET_ID = "d1000000-0000-4000-8000-000000000001"
OWNER_TOKEN = "valid.owner.token"
OTHER_TOKEN = "valid.other.token"


@pytest.fixture
def verification_environment(mock_supabase, monkeypatch, tmp_path):
    users = {OWNER_TOKEN: OWNER_ID, OTHER_TOKEN: OTHER_ID}

    def get_user(token):
        user_id = users.get(token)
        if user_id is None:
            raise ValueError("Invalid or expired access token")
        return SimpleNamespace(user=SimpleNamespace(id=user_id))

    # The shared demo row in conftest is mutated by the not-ready test.
    mock_supabase._tables["datasets"][0]["status"] = "READY"
    mock_supabase.auth = SimpleNamespace(get_user=get_user)
    mock_supabase._tables["dataset_profiles"] = [
        {
            "dataset_id": DATASET_ID,
            "profile": {
                "row_count": 4,
                "column_count": 2,
                "columns": [
                    {"name": "Country", "type": "string"},
                    {"name": "Revenue", "type": "number"},
                ],
            },
        }
    ]

    csv_path = tmp_path / "retail.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(["Country", "Revenue"])
        writer.writerows(
            [
                ["France", "10"],
                ["United Kingdom", "20"],
                ["France", "5"],
                ["United Kingdom", "2"],
            ]
        )

    downloads = []

    def download_fixture(_storage_path, destination):
        downloads.append(True)
        shutil.copyfile(csv_path, destination)
        return csv_path.stat().st_size

    monkeypatch.setattr(verification_api, "download_dataset_file", download_fixture)
    return mock_supabase, downloads


async def _post_verify(question, *, authorization=OWNER_TOKEN, dataset_id=DATASET_ID):
    headers = {"Authorization": f"Bearer {authorization}"} if authorization else None
    async with AsyncClient(
        transport=ASGITransport(app=create_app()),
        base_url="http://test",
    ) as client:
        return await client.post(
            "/verify",
            headers=headers,
            json={"dataset_id": dataset_id, "question": question},
        )


@pytest.mark.anyio
async def test_verify_runs_complete_pipeline_to_provable(verification_environment):
    response = await _post_verify("Which country generated the highest total revenue?")

    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "PROVABLE"
    assert body["claim"]["claim_type"] == "EXTREMUM"
    assert body["proof_obligations"]
    assert body["computation"]["status"] == "SUCCESS"
    assert body["computation"]["winner"] == "United Kingdom"
    assert body["verification"]["verified"] is True
    assert body["verification"]["match"] is True
    assert body["release"]["verdict"] == "PROVABLE"


@pytest.mark.anyio
async def test_ambiguous_question_stops_before_csv_download(verification_environment):
    _mock, downloads = verification_environment

    response = await _post_verify("Which country performed best?")

    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "AMBIGUOUS"
    assert body["release"]["reason"]
    assert body["computation"] is None
    assert downloads == []


@pytest.mark.anyio
async def test_missing_metric_evidence_returns_inconclusive(verification_environment):
    response = await _post_verify("Which country has the highest customer satisfaction?")

    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "INCONCLUSIVE"
    assert "customer satisfaction" in body["release"]["reason"].lower()
    assert body["computation"]["status"] == "INCONCLUSIVE"


@pytest.mark.anyio
async def test_verify_requires_authentication(verification_environment):
    response = await _post_verify(
        "Which country generated the highest total revenue?",
        authorization=None,
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_verify_rejects_invalid_jwt(verification_environment):
    response = await _post_verify(
        "Which country generated the highest total revenue?",
        authorization="invalid.jwt.token",
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_verify_rejects_non_owner_without_leaking_data(verification_environment):
    response = await _post_verify(
        "Which country generated the highest total revenue?",
        authorization=OTHER_TOKEN,
    )
    assert response.status_code == 403
    assert response.json()["error"]["message"] == "Access forbidden."
    assert DATASET_ID not in response.text
    assert OWNER_ID not in response.text
    assert "Revenue" not in response.text


@pytest.mark.anyio
async def test_verify_missing_dataset_returns_404(verification_environment):
    response = await _post_verify(
        "Which country generated the highest total revenue?",
        dataset_id="00000000-0000-4000-8000-000000000099",
    )
    assert response.status_code == 404
    assert "Dataset not found" in response.json()["error"]["message"]


@pytest.mark.anyio
async def test_verify_dataset_not_ready_returns_controlled_error(verification_environment):
    mock_supabase, _downloads = verification_environment
    mock_supabase._tables["datasets"][0]["status"] = "UPLOADING"

    response = await _post_verify("Which country generated the highest total revenue?")

    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Dataset is not ready for verification."


@pytest.mark.anyio
async def test_verify_repeated_request_is_deterministic(verification_environment):
    question = "Which country generated the highest total revenue?"
    first = await _post_verify(question)
    second = await _post_verify(question)

    assert first.status_code == second.status_code == 200, (first.text, second.text)
    first_body, second_body = first.json(), second.json()
    assert first_body["claim"] == second_body["claim"]
    assert first_body["proof_obligations"] == second_body["proof_obligations"]
    assert first_body["computation"]["winner"] == second_body["computation"]["winner"]
    assert first_body["computation"]["value"] == second_body["computation"]["value"]
    assert first_body["verification"] == second_body["verification"]
    assert first_body["verdict"] == second_body["verdict"]
