from binnagent_api.main import create_app
from fastapi.testclient import TestClient


def test_learner_meta_contains_no_control_or_model_fields() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/learner/v1/meta")

    assert response.status_code == 200
    payload = response.json()
    assert "model_adapter" not in payload
    assert "feature_gates" not in payload
    assert payload["terminal"] == "desktop_web_only"


def test_control_meta_rejects_missing_control_role() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/control/v1/meta")

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "FORBIDDEN"


def test_control_meta_accepts_developer_reviewer() -> None:
    with TestClient(create_app()) as client:
        response = client.get(
            "/control/v1/meta",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
        )

    assert response.status_code == 200
    assert response.json()["role"] == "developer_reviewer"
