# ruff: noqa: RUF001

from binnagent_agent.agents.knowledge_extractor import AssetWriteGateOutput
from binnagent_api.asset_capture_service import (
    _guarded_projection,
    serialize_asset_capture_source,
)
from binnagent_api.asset_content_denoiser import (
    AssetWriteDecision,
    LearningAssetCapture,
    denoise_asset_content,
    project_asset_capture,
)


def test_denoiser_preserves_evidence_and_removes_reading_ui_boilerplate() -> None:
    content = (
        "> Although the plan looked safe, the evidence changed.\r\n\r\n"
        "回到自己的判断，按这个帮助层级形成一个新的亲自输出版本。\r\n"
    )

    assert denoise_asset_content(content) == (
        "> Although the plan looked safe, the evidence changed."
    )


def test_denoiser_removes_duplicate_blocks_even_with_markdown_quote_prefix() -> None:
    content = "> claim before detail\n\nclaim   before detail\n\n先定位主句。"

    assert denoise_asset_content(content) == "> claim before detail\n\n先定位主句。"


def test_denoiser_keeps_distinct_labels_and_learner_wording() -> None:
    content = (
        "语境义与用法：support 在这里表示提供帮助。\n"
        "选区翻译：工具可以帮助学习者。\n\n"
        "下一步自查：是否找到了主句？"
    )

    assert denoise_asset_content(content) == content


def test_denoiser_removes_invisible_transport_characters_and_empty_content() -> None:
    assert denoise_asset_content("\u200b \x00\n") is None


def test_denoiser_is_idempotent() -> None:
    content = "> evidence\u00a0here\n\n> evidence here\n\n我的解释。"
    cleaned = denoise_asset_content(content)

    assert denoise_asset_content(cleaned) == cleaned


def test_structured_capture_preserves_provenance_and_marks_supported_only_content() -> None:
    projection = project_asset_capture(
        LearningAssetCapture.model_validate(
            {
                "schema_version": "learning-asset-capture/v1",
                "segments": [
                    {
                        "segment_id": "hint",
                        "role": "agent_hint",
                        "content": "先比较两个可能的局部理解。",
                        "origin": "agent",
                        "hint_level": 3,
                    },
                    {
                        "segment_id": "check",
                        "role": "next_check",
                        "content": "换一段原文独立验证。",
                        "origin": "agent",
                    },
                ],
            }
        )
    )

    assert projection.decision is AssetWriteDecision.REVIEW
    assert projection.highest_hint_level == 3
    assert projection.content is not None
    assert "## 学习提示 · H3" in projection.content
    assert "agent_support_without_independent_learner_claim" in projection.reason_codes


def test_structured_capture_keeps_learner_interpretation_and_deduplicates_quote() -> None:
    projection = project_asset_capture(
        LearningAssetCapture.model_validate(
            {
                "schema_version": "learning-asset-capture/v1",
                "segments": [
                    {
                        "segment_id": "quote",
                        "role": "source_quote",
                        "content": "The main clause carries the claim.",
                        "origin": "source",
                    },
                    {
                        "segment_id": "duplicate",
                        "role": "example",
                        "content": "> The main clause carries the claim.",
                        "origin": "agent",
                    },
                    {
                        "segment_id": "learner",
                        "role": "learner_interpretation",
                        "content": "让步从句只是背景，主句才是作者判断。",
                        "origin": "learner",
                    },
                ],
            }
        )
    )

    assert projection.decision is AssetWriteDecision.KEEP
    assert projection.retained_segment_ids == ["quote", "learner"]
    assert projection.content is not None
    assert projection.content.count("The main clause carries the claim.") == 1


def test_model_gate_cannot_upgrade_agent_only_hint_to_keep() -> None:
    capture = LearningAssetCapture.model_validate(
        {
            "schema_version": "learning-asset-capture/v1",
            "segments": [
                {
                    "segment_id": "hint",
                    "role": "agent_hint",
                    "content": "先比较两个局部理解。",
                    "origin": "agent",
                    "hint_level": 4,
                }
            ],
        }
    )
    baseline = project_asset_capture(capture)
    guarded = _guarded_projection(
        capture,
        baseline,
        AssetWriteGateOutput(
            decision="KEEP",
            retained_segment_ids=["hint"],
            reason_codes=["model_selected_hint"],
            confidence=0.99,
        ),
    )

    assert guarded.decision is AssetWriteDecision.REVIEW
    assert guarded.highest_hint_level == 4


def test_model_gate_cannot_silently_discard_learner_content() -> None:
    capture = LearningAssetCapture.model_validate(
        {
            "schema_version": "learning-asset-capture/v1",
            "segments": [
                {
                    "segment_id": "learner",
                    "role": "learner_interpretation",
                    "content": "主句表达作者真正要推进的判断。",
                    "origin": "learner",
                }
            ],
        }
    )
    baseline = project_asset_capture(capture)
    guarded = _guarded_projection(
        capture,
        baseline,
        AssetWriteGateOutput(
            decision="NOOP",
            retained_segment_ids=["learner"],
            reason_codes=["model_requested_noop"],
            confidence=0.9,
        ),
    )

    assert guarded.decision is AssetWriteDecision.REVIEW
    assert "model_noop_requires_review" in guarded.reason_codes


def test_capture_source_serialization_retains_role_origin_and_hint_level() -> None:
    capture = LearningAssetCapture.model_validate(
        {
            "schema_version": "learning-asset-capture/v1",
            "segments": [
                {
                    "segment_id": "hint",
                    "role": "agent_hint",
                    "content": "比较两处证据。",
                    "origin": "agent",
                    "hint_level": 2,
                }
            ],
        }
    )

    serialized = serialize_asset_capture_source(capture)

    assert "[segment id=hint role=agent_hint origin=agent hint_level=2]" in serialized
    assert serialized.endswith("比较两处证据。")
