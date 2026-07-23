from binnagent_agent.agents.level_assessor import LevelAssessmentAgent, LevelEvidenceSummary


def test_level_agent_combines_behavior_and_subjective_difficulty() -> None:
    output = LevelAssessmentAgent().assess(
        LevelEvidenceSummary(
            completed_tasks=12,
            independent_tasks=10,
            hinted_tasks=2,
            revision_count=4,
            annotation_count=5,
            grammar_attempts=6,
            grammar_resolved=5,
            expression_attempts=4,
            difficulty_too_easy=2,
            difficulty_matched=2,
            difficulty_too_hard=0,
        )
    )

    assert output.overall_level in {"independent", "advanced"}
    assert output.confidence_band == "high"
    assert output.dimensions.grammar in {"independent", "advanced"}
    assert any(reason.startswith("subjective_load:") for reason in output.reason_codes)


def test_level_agent_is_conservative_when_evidence_is_sparse() -> None:
    output = LevelAssessmentAgent().assess(
        LevelEvidenceSummary(
            completed_tasks=1,
            independent_tasks=0,
            hinted_tasks=1,
            revision_count=0,
            annotation_count=0,
            grammar_attempts=0,
            grammar_resolved=0,
            expression_attempts=0,
            difficulty_too_easy=0,
            difficulty_matched=0,
            difficulty_too_hard=1,
        )
    )

    assert output.overall_level == "foundation"
    assert output.confidence_band == "low"


def test_material_feedback_is_a_bounded_level_signal() -> None:
    evidence = LevelEvidenceSummary(
        completed_tasks=6,
        independent_tasks=4,
        hinted_tasks=2,
        revision_count=2,
        annotation_count=3,
        grammar_attempts=3,
        grammar_resolved=2,
        expression_attempts=2,
        difficulty_too_easy=0,
        difficulty_matched=1,
        difficulty_too_hard=0,
    )
    helpful = LevelAssessmentAgent().assess(evidence.model_copy(update={"material_helpful": 2}))
    unhelpful = LevelAssessmentAgent().assess(evidence.model_copy(update={"material_unhelpful": 2}))

    assert helpful.evidence_count == unhelpful.evidence_count == 10
    assert helpful.overall_level == unhelpful.overall_level
    assert "material_feedback:2/0" in helpful.reason_codes
    assert "material_feedback:0/2" in unhelpful.reason_codes
