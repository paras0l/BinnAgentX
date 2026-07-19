import json
import shutil
from pathlib import Path

import pytest
from binnagent_api.content_generation_service import (
    ContentPackPublisher,
    ContentPackPublishError,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_CONTENT = REPO_ROOT / "fixtures/content/v1"


def _copy_pack(target: Path, *, agent_reviewed: bool) -> Path:
    target.mkdir(parents=True)
    manifest = json.loads((SOURCE_CONTENT / "manifest.json").read_text(encoding="utf-8"))
    (target / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    for entry in manifest["items"]:
        source = SOURCE_CONTENT / entry["file"]
        destination = target / entry["file"]
        shutil.copy2(source, destination)
        if agent_reviewed:
            item = json.loads(destination.read_text(encoding="utf-8"))
            item["review"] = {
                "status": "agent_reviewed",
                "reviewer_role": "review_agent",
                "reviewed_at": "2026-07-19T00:00:00Z",
                "limitations": ["Synthetic review fixture for publication contract tests."],
                "judge_report": {
                    "verdict": "approve",
                    "model_adapter": "test_reviewer",
                    "prompt_version": "prompt_content_judge_v1",
                    "scores": {
                        "factual_coherence": 5,
                        "answerability": 5,
                        "evidence_grounding": 5,
                        "difficulty_alignment": 5,
                        "question_diversity": 5,
                        "hint_progression": 5,
                        "language_quality": 5,
                    },
                    "issues": [],
                    "summary": "The synthetic test reviewer approves this complete fixture pack.",
                },
            }
            destination.write_text(
                json.dumps(item, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    return target / "manifest.json"


def test_publisher_atomically_activates_fully_agent_reviewed_pack(tmp_path: Path) -> None:
    generated_root = tmp_path / "generated"
    job_id = "content_job_publish_unit"
    source_manifest = _copy_pack(
        generated_root / "packs" / job_id,
        agent_reviewed=True,
    )
    publisher = ContentPackPublisher(
        repository_root=REPO_ROOT,
        generated_root=generated_root,
    )

    active_path = publisher.publish(source_manifest, job_id=job_id)

    active = json.loads(active_path.read_text(encoding="utf-8"))
    assert active["source_job_id"] == job_id
    assert publisher.active_job_id() == job_id
    assert all(entry["file"].startswith(f"packs/{job_id}/") for entry in active["items"])


def test_publisher_rejects_pack_without_agent_review_gate(tmp_path: Path) -> None:
    generated_root = tmp_path / "generated"
    job_id = "content_job_unreviewed_unit"
    source_manifest = _copy_pack(
        generated_root / "packs" / job_id,
        agent_reviewed=False,
    )
    publisher = ContentPackPublisher(
        repository_root=REPO_ROOT,
        generated_root=generated_root,
    )

    with pytest.raises(ContentPackPublishError, match="not_fully_agent_reviewed"):
        publisher.publish(source_manifest, job_id=job_id)

    assert not publisher.active_manifest_path.exists()
