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
