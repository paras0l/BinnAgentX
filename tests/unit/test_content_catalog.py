import json
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path

import pytest
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.models import (
    ExamTrack,
    FeedbackDensity,
    LearnerProfileSnapshot,
    SelfReportedLevel,
    TaskType,
)


def _write_reading_item(
    directory: Path,
    content_version_id: str,
    filename: str,
    title: str,
) -> tuple[dict[str, object], dict[str, object], Path]:
    paragraph_text = "This is a short calibration passage for internal tests."
    item_body = " ".join(paragraph_text.split())
    content_hash = sha256(item_body.encode("utf-8")).hexdigest()
    body = {"paragraph_id": "p1", "text": paragraph_text}
    question_bank = [
        {
            "question_id": f"{content_version_id}_{tier}",
            "question_type": question_type,
            "difficulty_tier": tier,
            "prompt": f"A {tier} question",
            "options": [{"option_id": "A", "text": "Answer"}],
            "hints": {"h1": "hint"},
        }
        for tier, question_type in (
            ("foundation", "vocabulary_in_context"),
            ("standard", "main_idea"),
            ("advanced", "inference"),
        )
    ]
    item: dict[str, object] = {
        "content_id": f"{content_version_id}_content",
        "content_version_id": content_version_id,
        "content_type": "calibration_reading",
        "title": title,
        "content_hash": content_hash,
        "rights": {"rights_status": "eligible_dev"},
        "review": {
            "status": "developer_reviewed",
            "reviewer_role": "developer_reviewer",
        },
        "difficulty_status": "calibrated",
        "difficulty": {
            "difficulty_status": "calibrated",
            "word_count": len(item_body.split()),
            "topic_familiarity": "high",
            "vocabulary_load": "medium",
            "syntax_load": "medium",
            "evidence_distance": "short",
            "exam_tracks": ["english_1"],
            "estimated_minutes": 1,
        },
        "paragraphs": [body],
        "main_question": question_bank[1],
        "question_bank": question_bank,
    }
    file_path = directory / filename
    file_path.write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest_item: dict[str, object] = {
        "content_id": item["content_id"],
        "content_version_id": content_version_id,
        "content_type": "calibration_reading",
        "file": filename,
        "content_hash": content_hash,
        "rights_status": "eligible_dev",
        "difficulty_status": "calibrated",
    }
    return item, manifest_item, file_path


def _profile(
    level: SelfReportedLevel,
    *,
    target_score: int,
    evidence_count: int = 3,
) -> LearnerProfileSnapshot:
    return LearnerProfileSnapshot(
        learner_snapshot_id="learner_snapshot_catalog_test",
        exam_track=ExamTrack.ENGLISH_1,
        target_score=target_score,
        weekly_minutes=300,
        self_reported_level=level,
        prior_exam_seen=False,
        session_minutes=30,
        feedback_density=FeedbackDensity.STANDARD,
        timed=False,
        evidence_count=evidence_count,
        confidence_band="medium",
        created_at=datetime(2026, 7, 19, tzinfo=UTC),
    )


def test_expression_feedback_selects_first_missing_versioned_surface_check() -> None:
    catalog = LocalContentCatalog()

    reason_code, feedback = catalog.approved_expression_feedback(
        "micro_expression_01_v1",
        (
            "Translation tools can help learners check unfamiliar details, but complete "
            "translations may replace the effort needed to understand sentence structure."
        ),
    )

    assert reason_code == "priority_feedback_sequence"
    assert "what the learner should try before" in feedback


def test_expression_feedback_uses_reviewed_fallback_when_surface_checks_are_present() -> None:
    catalog = LocalContentCatalog()

    reason_code, feedback = catalog.approved_expression_feedback(
        "micro_expression_01_v1",
        (
            "Translation tools can help with details, but learners should first inspect the "
            "sentence structure themselves. They can then check only what remains unclear "
            "after that attempt."
        ),
    )

    assert reason_code == "priority_feedback_fallback"
    assert "each sentence has one job" in feedback


def test_expression_feedback_refuses_text_too_short_to_support_a_claim_check() -> None:
    catalog = LocalContentCatalog()

    with pytest.raises(DomainError) as raised:
        catalog.approved_expression_feedback(
            "micro_expression_01_v1",
            "Please write it for me.",
        )

    assert raised.value.code is PublicErrorCode.SAVE_NOT_CONFIRMED
    assert raised.value.reason == "expression_v1_too_short_for_priority_feedback"


def test_catalog_prefers_generated_manifest_for_new_assignments_but_keeps_base_versions_readable(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    gen_dir = tmp_path / "generated"
    base_dir = tmp_path / "base"
    gen_dir.mkdir()
    base_dir.mkdir()

    gen_item, gen_manifest_item, gen_path = _write_reading_item(
        gen_dir, "generated_calibration_v1", "generated_reading.json", "generated"
    )
    gen_item["review"] = {
        "status": "agent_reviewed",
        "reviewer_role": "review_agent",
    }
    gen_path.write_text(json.dumps(gen_item, ensure_ascii=False, indent=2), encoding="utf-8")
    _, base_manifest_item, _ = _write_reading_item(
        base_dir, "base_calibration_v1", "base_reading.json", "base"
    )
    (gen_dir / "manifest.json").write_text(
        json.dumps({"items": [gen_manifest_item]}, ensure_ascii=False), encoding="utf-8"
    )
    (base_dir / "manifest.json").write_text(
        json.dumps({"items": [base_manifest_item]}, ensure_ascii=False), encoding="utf-8"
    )

    monkeypatch.setenv("BINNAGENT_CONTENT_GENERATION_MANIFEST", str(gen_dir / "manifest.json"))
    monkeypatch.setenv("BINNAGENT_CONTENT_MANIFEST", str(base_dir / "manifest.json"))
    get_settings.cache_clear()
    catalog = LocalContentCatalog()
    try:
        assert catalog.learner_item("generated_calibration_v1")["title"] == "generated"
        assert catalog.learner_item("base_calibration_v1")["title"] == "base"
        assert catalog.first_for(TaskType.CALIBRATION_READING).content_version_id == (
            "generated_calibration_v1"
        )
    finally:
        get_settings.cache_clear()


def test_catalog_selects_reading_question_tier_from_learner_evidence(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    _, entry, _ = _write_reading_item(
        content_dir, "adaptive_reading_v1", "adaptive.json", "adaptive"
    )
    (content_dir / "manifest.json").write_text(
        json.dumps({"items": [entry]}, ensure_ascii=False), encoding="utf-8"
    )
    monkeypatch.setenv("BINNAGENT_CONTENT_GENERATION_MANIFEST", str(content_dir / "missing.json"))
    monkeypatch.setenv("BINNAGENT_CONTENT_MANIFEST", str(content_dir / "manifest.json"))
    get_settings.cache_clear()
    catalog = LocalContentCatalog()
    try:
        foundation = catalog.reading_question_for(
            "adaptive_reading_v1",
            "task_adaptive_foundation",
            _profile(SelfReportedLevel.WEAK, target_score=60),
        )
        advanced = catalog.reading_question_for(
            "adaptive_reading_v1",
            "task_adaptive_advanced",
            _profile(SelfReportedLevel.STEADY, target_score=85),
        )
        assert foundation["question_type"] == "vocabulary_in_context"
        assert advanced["question_type"] == "inference"
    finally:
        get_settings.cache_clear()


def test_catalog_falls_back_to_static_manifest_when_generated_manifest_invalid(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    gen_dir = tmp_path / "generated"
    base_dir = tmp_path / "base"
    gen_dir.mkdir()
    base_dir.mkdir()

    invalid_gen_manifest_item: dict[str, object] = {
        "content_id": "invalid_missing_file",
        "content_version_id": "generated_missing_v1",
        "content_type": "calibration_reading",
        "file": "missing_file.json",
        "content_hash": "deadbeef",
        "rights_status": "eligible_dev",
        "difficulty_status": "calibrated",
    }
    (gen_dir / "manifest.json").write_text(
        json.dumps({"items": [invalid_gen_manifest_item]}, ensure_ascii=False), encoding="utf-8"
    )
    _, base_manifest_item, _ = _write_reading_item(
        base_dir, "base_calibration_v1", "base_reading.json", "base"
    )
    (base_dir / "manifest.json").write_text(
        json.dumps({"items": [base_manifest_item]}, ensure_ascii=False), encoding="utf-8"
    )

    monkeypatch.setenv("BINNAGENT_CONTENT_GENERATION_MANIFEST", str(gen_dir / "manifest.json"))
    monkeypatch.setenv("BINNAGENT_CONTENT_MANIFEST", str(base_dir / "manifest.json"))
    get_settings.cache_clear()
    catalog = LocalContentCatalog()
    try:
        assert catalog.learner_item("base_calibration_v1")["title"] == "base"
    finally:
        get_settings.cache_clear()


def test_catalog_does_not_activate_an_unreviewed_generated_manifest(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    gen_dir = tmp_path / "generated"
    base_dir = tmp_path / "base"
    gen_dir.mkdir()
    base_dir.mkdir()

    generated_item, generated_entry, generated_path = _write_reading_item(
        gen_dir, "generated_unreviewed_v1", "generated.json", "generated"
    )
    generated_item["review"] = {
        "status": "agent_generated_unreviewed",
        "reviewer_role": "agent_generator",
    }
    generated_path.write_text(
        json.dumps(generated_item, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    _, base_entry, _ = _write_reading_item(base_dir, "base_reviewed_v1", "base.json", "base")
    (gen_dir / "manifest.json").write_text(
        json.dumps({"items": [generated_entry]}, ensure_ascii=False), encoding="utf-8"
    )
    (base_dir / "manifest.json").write_text(
        json.dumps({"items": [base_entry]}, ensure_ascii=False), encoding="utf-8"
    )

    monkeypatch.setenv("BINNAGENT_CONTENT_GENERATION_MANIFEST", str(gen_dir / "manifest.json"))
    monkeypatch.setenv("BINNAGENT_CONTENT_MANIFEST", str(base_dir / "manifest.json"))
    get_settings.cache_clear()
    catalog = LocalContentCatalog()
    try:
        assert catalog.learner_item("base_reviewed_v1")["title"] == "base"
    finally:
        get_settings.cache_clear()
