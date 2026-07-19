from pathlib import Path
from types import SimpleNamespace

import pytest
from binnagent_worker.main import _run_job


def _job(tmp_path: Path) -> dict[str, object]:
    return {
        "job_id": "content_job_worker_unit",
        "seed": 42,
        "pack_id": "agent_content_worker_unit",
        "pack_version": "v1",
        "output_directory": str(tmp_path),
    }


@pytest.mark.asyncio
async def test_worker_marks_only_fully_reviewed_pack_generated(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest_path = tmp_path / "manifest.json"

    class FakeWorkflow:
        def run(self, *, seed: int | None) -> object:
            assert seed == 42
            return SimpleNamespace(
                manifest_path=manifest_path,
                item_count=6,
                agent_reviewed_count=6,
                errors=[],
            )

    monkeypatch.setattr(
        "binnagent_worker.main.build_content_generation_workflow",
        lambda *_args, **_kwargs: FakeWorkflow(),
    )

    result = await _run_job(_job(tmp_path))

    assert result["status"] == "generated"
    assert result["manifest_path"] == str(manifest_path)
    assert result["agent_reviewed_count"] == 6


@pytest.mark.asyncio
async def test_worker_refuses_partially_reviewed_pack(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeWorkflow:
        def run(self, *, seed: int | None) -> object:
            return SimpleNamespace(
                manifest_path=tmp_path / "manifest.json",
                item_count=6,
                agent_reviewed_count=5,
                errors=[],
            )

    monkeypatch.setattr(
        "binnagent_worker.main.build_content_generation_workflow",
        lambda *_args, **_kwargs: FakeWorkflow(),
    )

    result = await _run_job(_job(tmp_path))

    assert result["status"] == "validation_failed"
    assert result["validation_errors"] == ["generated_pack_not_fully_agent_reviewed"]
