from fastapi.testclient import TestClient

from app.api import health
from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_database_health_uses_lightweight_check(monkeypatch) -> None:
    calls = []
    monkeypatch.setattr(health, "check_database_connection", lambda: calls.append("checked"))

    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}
    assert calls == ["checked"]


def test_database_health_returns_safe_503(monkeypatch) -> None:
    def fail() -> None:
        raise RuntimeError("private-key-must-not-leak")

    monkeypatch.setattr(health, "check_database_connection", fail)
    response = client.get("/health/db")

    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"
    assert "private-key-must-not-leak" not in response.text
