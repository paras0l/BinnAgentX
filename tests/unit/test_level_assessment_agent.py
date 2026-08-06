from binnagent_agent.agents.level_assessor import LevelAssessmentAgent, LevelEvidenceSummary


def evidence(**updates: int) -> LevelEvidenceSummary:
    base = {
        "completed_tasks": 0,
        "independent_tasks": 0,
        "hinted_tasks": 0,
        "revision_count": 0,
        "annotation_count": 0,
        "grammar_attempts": 0,
        "grammar_resolved": 0,
        "expression_attempts": 0,
        "difficulty_too_easy": 0,
        "difficulty_matched": 0,
        "difficulty_too_hard": 0,
    }
    return LevelEvidenceSummary(**{**base, **updates})


def test_scored_responses_and_difficulty_anchor_drive_the_level() -> None:
    output = LevelAssessmentAgent().assess(
        evidence(
            completed_tasks=12,
            independent_tasks=10,
            reading_responses=12,
            reading_correct=10,
            reading_standard_responses=6,
            reading_advanced_responses=6,
            reading_standard_correct=5,
            reading_advanced_correct=5,
            grammar_attempts=6,
            grammar_independent_correct=5,
            grammar_incorrect=1,
            grammar_constructs=5,
            grammar_stable_constructs=2,
            grammar_productive_constructs=2,
            difficulty_matched=3,
        )
    )

    assert output.overall_level in {"independent", "advanced"}
    assert output.confidence_band == "high"
    assert output.dimensions.reading_comprehension in {"independent", "advanced"}
    assert output.evidence_count == 18
    assert "reading_accuracy:10/12" in output.reason_codes


def test_activity_without_scored_evidence_does_not_raise_ability() -> None:
    output = LevelAssessmentAgent().assess(
        evidence(
            completed_tasks=40,
            independent_tasks=40,
            revision_count=20,
            annotation_count=30,
            expression_attempts=20,
        )
    )

    assert output.overall_level == "developing"
    assert output.confidence_band == "low"
    assert output.evidence_count == 0
    assert output.dimensions.vocabulary == "developing"
    assert output.dimensions.written_expression == "developing"
    assert "vocabulary:not_directly_measured" in output.reason_codes
    assert "writing:not_rubric_scored" in output.reason_codes


def test_wrong_answers_do_not_become_ability_through_completion() -> None:
    output = LevelAssessmentAgent().assess(
        evidence(
            completed_tasks=12,
            independent_tasks=12,
            reading_responses=12,
            reading_correct=0,
            reading_standard_responses=12,
        )
    )

    assert output.overall_level == "foundation"
    assert output.dimensions.reading_comprehension == "foundation"


def test_harder_correct_responses_produce_a_higher_estimate() -> None:
    foundation = LevelAssessmentAgent().assess(
        evidence(
            reading_responses=6,
            reading_correct=6,
            reading_foundation_responses=6,
            reading_foundation_correct=6,
        )
    )
    advanced = LevelAssessmentAgent().assess(
        evidence(
            reading_responses=6,
            reading_correct=6,
            reading_advanced_responses=6,
            reading_advanced_correct=6,
        )
    )

    assert foundation.dimensions.reading_comprehension == "developing"
    assert advanced.dimensions.reading_comprehension == "advanced"


def test_material_feedback_does_not_change_the_level_or_evidence_count() -> None:
    base = evidence(
        completed_tasks=6,
        reading_responses=6,
        reading_correct=4,
        reading_standard_responses=6,
        reading_standard_correct=4,
    )
    helpful = LevelAssessmentAgent().assess(base.model_copy(update={"material_helpful": 2}))
    unhelpful = LevelAssessmentAgent().assess(base.model_copy(update={"material_unhelpful": 2}))

    assert helpful.evidence_count == unhelpful.evidence_count == 6
    assert helpful.overall_level == unhelpful.overall_level
    assert "material_feedback:2/0" in helpful.reason_codes
    assert "material_feedback:0/2" in unhelpful.reason_codes


def test_sparse_subjective_difficulty_remains_low_confidence() -> None:
    output = LevelAssessmentAgent().assess(evidence(difficulty_too_hard=1))

    assert output.overall_level == "foundation"
    assert output.confidence_band == "low"
