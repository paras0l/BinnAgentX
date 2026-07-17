from pathlib import Path
from types import SimpleNamespace

import httpx2
import pytest
from binnagent_api.main import create_app


@pytest.mark.asyncio
async def test_content_generation_api_requires_control_role() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/control/v1/content-generation/jobs")
        assert response.status_code == 403


def _build_fake_workflow_result(manifest_path: Path, errors: list[str] | None = None):
    return SimpleNamespace(
        manifest_path=manifest_path,
        pack_id="agent_generated_content_pack_test",
        pack_version="v1",
        item_count=0 if (errors or []) else 2,
        errors=errors or [],
    )


@pytest.mark.asyncio
async def test_content_generation_api_runs_and_returns_generated_pack(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text("{}", encoding="utf-8")

    class _FakeWorkflow:
        def __init__(self, **_kwargs: object) -> None:
            pass

        def run(self, **_kwargs: object) -> object:
            return _build_fake_workflow_result(manifest_path)

    monkeypatch.setattr(
        "binnagent_api.content_generation.ContentGenerationWorkflow",
        _FakeWorkflow,
    )

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        response = await client.post(
            "/control/v1/content-generation/jobs",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "generated"
        assert payload["manifest_path"] == str(manifest_path)
        assert payload["item_count"] == 2


@pytest.mark.asyncio
async def test_content_generation_api_returns_validation_failed_payload(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text("{}", encoding="utf-8")

    class _FakeWorkflow:
        def __init__(self, **_kwargs: object) -> None:
            pass

        def run(self, **_kwargs: object) -> object:
            return _build_fake_workflow_result(manifest_path, errors=["integrity_check_failed"])

    monkeypatch.setattr(
        "binnagent_api.content_generation.ContentGenerationWorkflow",
        _FakeWorkflow,
    )

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        response = await client.post(
            "/control/v1/content-generation/jobs",
            headers={"X-BinnAgent-Control-Role": "developer_reviewer"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "validation_failed"
        assert payload["validation_errors"] == ["integrity_check_failed"]
        assert payload["item_count"] == 0
