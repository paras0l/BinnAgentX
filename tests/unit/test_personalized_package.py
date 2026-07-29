from typing import Any

import pytest
from binnagent_api.model_adapters import (
    PersonalizedAssessmentOutput,
    PersonalizedReadingOutput,
)
from binnagent_api.personalized_package import (
    build_article,
    build_grammar_artifacts,
    build_objective_bundle,
    build_question_artifacts,
    build_transfer_artifacts,
    deterministic_assessment,
    persisted_expression,
    persisted_grammar,
    persisted_question,
    structural_quality_reports,
)
from binnagent_domain.learning.content_quality import (
    LearningObjectiveBundle,
    QualityResult,
    validate_source_span,
)


def _package() -> tuple[
    dict[str, Any],
    LearningObjectiveBundle,
    PersonalizedAssessmentOutput,
]:
    objective = build_objective_bundle(
        material_id="material_package_unit",
        learner_id="learner_package_unit",
        source_asset_ids=["asset_grammar"],
        goal="复核让步关系并迁移到新语境",
        adaptation_profile={"overall_level": "developing"},
    )
    article = build_article(
        material_id="material_package_unit",
        objective=objective,
        output=PersonalizedReadingOutput(
            title="Transfer a Familiar Rule",
            paragraphs=[
                (
                    "A learner may meet the same idea in very different settings. "
                    "A familiar rule should be tested in a new context."
                ),
                (
                    "Although the first explanation seems natural, one member checks the "
                    "evidence and separates the main claim from its support."
                ),
                (
                    "The team does not discard its earlier knowledge. It transfers that "
                    "knowledge carefully and checks which condition has changed."
                ),
            ],
            focus_points=["concession", "evidence boundary"],
            source_titles=["Although note"],
        ),
    )
    assessment = deterministic_assessment(article=article, objective=objective)
    return article, objective, assessment


def test_personalized_package_has_exact_evidence_and_connected_transfer() -> None:
    article, objective, assessment = _package()
    questions = build_question_artifacts(
        material_id="material_package_unit",
        objective=objective,
        article=article,
        assessment=assessment,
    )
    grammar = build_grammar_artifacts(
        material_id="material_package_unit",
        objective=objective,
        article=article,
        assessment=assessment,
    )
    transfer, expression = build_transfer_artifacts(
        material_id="material_package_unit",
        objective=objective,
        article=article,
        questions=questions,
        assessment=assessment,
    )
    state = {
        "article": article,
        "questions": [item.model_dump(mode="json") for item in questions],
        "grammar_annotations": [item.model_dump(mode="json") for item in grammar],
        "transfer_contract": transfer.model_dump(mode="json"),
        "expression_task": expression.model_dump(mode="json"),
    }

    assert [item.answer_option_id for item in questions] == ["B", "C", "A"]
    assert len({item.answer_option_id for item in questions}) == 3
    paragraphs = article["paragraphs"]
    assert isinstance(paragraphs, list)
    for question, draft in zip(questions, assessment.questions, strict=True):
        span = question.answer_evidence[0]
        paragraph_index = int(span.source_id.removeprefix("personalized_p_")) - 1
        assert validate_source_span(span, str(paragraphs[paragraph_index]))
        persisted = persisted_question(question, draft=draft)
        assert all(
            option.get("error_mechanism")
            for option in persisted["options"]
            if option["option_id"] != persisted["correct_answer"]
        )
        assert persisted["difficulty_tier"] == draft.difficulty_tier
        assert persisted["public_explanation"] == draft.public_explanation

    assert grammar[0].status == "review_required"
    assert grammar[0].parser_id == "model_candidate_unverified"
    assert grammar[0].construction_id == "clause.adverbial.concession.although.v1"
    assert {role.role for role in grammar[0].role_spans} == {
        "concessive_clause",
        "main_clause",
    }
    assert len(assessment.grammar_annotations[0].correct_text) == len(
        assessment.grammar_annotations[0].incorrect_text
    )
    persisted_annotation = persisted_grammar(
        grammar[0],
        assessment.grammar_annotations[0],
    )
    assert persisted_annotation["analysis"]["confidence"] == 0.5
    assert transfer.objective_bundle_id == objective.objective_bundle_id
    assert grammar[0].construction_id in transfer.required_transfer_targets
    assert set(transfer.reading_evidence_refs) == {item.artifact.artifact_id for item in questions}
    persisted_task = persisted_expression(
        objective=objective,
        transfer=transfer,
        expression=expression,
        draft=assessment.transfer,
    )
    assert persisted_task["target_argument_move"] == "concession"
    assert grammar[0].construction_id in persisted_task["required_target_ids"]
    assert persisted_task["situation"] not in paragraphs
    reports = structural_quality_reports(state)
    assert [report.result for report in reports] == [
        QualityResult.PASS,
        QualityResult.REVIEW_REQUIRED,
    ]


def test_personalized_package_blocks_unsafe_grammar_replacement() -> None:
    article, objective, assessment = _package()
    grammar = assessment.grammar_annotations[0]
    invalid = assessment.model_copy(
        update={
            "grammar_annotations": [
                grammar.model_copy(update={"incorrect_text": "Because the text is shorter."})
            ]
        }
    )

    with pytest.raises(ValueError, match="grammar_replacement_length_mismatch"):
        build_grammar_artifacts(
            material_id="material_package_unit",
            objective=objective,
            article=article,
            assessment=invalid,
        )


def test_personalized_package_blocks_unrelated_transfer_target() -> None:
    article, objective, assessment = _package()
    unrelated = assessment.model_copy(
        update={
            "transfer": assessment.transfer.model_copy(
                update={"target_argument_move": "unrelated_narration"}
            )
        }
    )
    questions = build_question_artifacts(
        material_id="material_package_unit",
        objective=objective,
        article=article,
        assessment=assessment,
    )

    with pytest.raises(ValueError, match="transfer_task_target_mismatch"):
        build_transfer_artifacts(
            material_id="material_package_unit",
            objective=objective,
            article=article,
            questions=questions,
            assessment=unrelated,
        )
