from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.main import create_app
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration
CONTROL_HEADERS = {"X-BinnAgent-Control-Role": "developer_reviewer"}


@pytest_asyncio.fixture(autouse=True)
async def clean_content_generation_jobs() -> AsyncIterator[None]:
    async with get_engine().begin() as connection:
        await connection.execute(sa.delete(tables.content_generation_jobs))
    yield
    async with get_engine().begin() as connection:
        await connection.execute(sa.delete(tables.content_generation_jobs))
    await dispose_engine()


@pytest.mark.asyncio
async def test_content_generation_api_requires_control_role() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/control/v1/content-generation/jobs", json={})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_content_generation_api_queues_and_lists_persistent_job() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/control/v1/content-generation/jobs",
            headers=CONTROL_HEADERS,
            json={"seed": 20260719},
        )
        listed = await client.get(
            "/control/v1/content-generation/jobs",
            headers=CONTROL_HEADERS,
        )
        duplicate = await client.post(
            "/control/v1/content-generation/jobs",
            headers=CONTROL_HEADERS,
            json={"seed": 20260720},
        )

    assert created.status_code == 202, created.text
    assert created.json()["status"] == "queued"
    assert created.json()["seed"] == 20260719
    assert listed.status_code == 200, listed.text
    assert listed.json()[0]["job_id"] == created.json()["job_id"]
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_content_generation_api_publishes_only_reviewed_generated_job(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(UTC)
    job_id = "content_job_publish_test"
    values = {
        "job_id": job_id,
        "status": "generated",
        "seed": 42,
        "pack_id": "agent_content_test_publish",
        "pack_version": "v1",
        "output_directory": str(tmp_path),
        "manifest_path": str(tmp_path / "manifest.json"),
        "item_count": 6,
        "agent_reviewed_count": 6,
        "validation_errors": [],
        "requested_by_role": "developer_reviewer",
        "published_by_role": None,
        "created_at": now,
        "started_at": now,
        "completed_at": now,
        "published_at": None,
    }
    async with get_engine().begin() as connection:
        await connection.execute(tables.content_generation_jobs.insert().values(**values))

    class FakePublisher:
        def publish(self, source_manifest: Path, *, job_id: str) -> Path:
            assert source_manifest == tmp_path / "manifest.json"
            assert job_id == "content_job_publish_test"
            return tmp_path / "active.json"

        def active_job_id(self) -> str | None:
            return None

    monkeypatch.setattr("binnagent_api.content_generation._publisher", lambda: FakePublisher())

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/control/v1/content-generation/jobs/{job_id}/publish",
            headers=CONTROL_HEADERS,
        )

    assert response.status_code == 200, response.text
    assert response.json()["is_active"] is True
    assert response.json()["published_at"] is not None
