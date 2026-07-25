import pytest
from binnagent_domain.learning.content_quality import (
    ContentArtifact,
    DifficultyConstraints,
    ExpressionTaskArtifact,
    LearningObjectiveBundle,
    PersonalizedLearningPackage,
    QualityReport,
    QualityResult,
    QualitySeverity,
    QuestionOption,
    ReadingQuestionArtifact,
    RequiredEvidence,
    SourceSpan,
    TransferContract,
    stable_content_hash,
    validate_source_span,
)
from binnagent_domain.learning.knowledge_organization import (
    ExistingAssetMatch,
    FieldChange,
    KnowledgeChangeAction,
    KnowledgeChangeProposal,
)
from pydantic import ValidationError


def _span(source_id: str = "article_1") -> SourceSpan:
    return SourceSpan(
        source_id=source_id,
        source_version="1",
        start=0,
        end=8,
        text_quote="Although",
    )


def _artifact(artifact_id: str, artifact_type: str) -> ContentArtifact:
    digest = stable_content_hash({"artifact_id": artifact_id})
    return ContentArtifact(
        artifact_id=artifact_id,
        version=1,
        objective_bundle_id="objective_1",
        artifact_type=artifact_type,
        generation_inputs_hash=digest,
        content_hash=digest,
        source_spans=(_span(),),
        producer_version="fixture-v1",
    )


def test_source_span_requires_exact_offsets_and_quote() -> None:
    assert validate_source_span(_span(), "Although the claim follows.")
    assert not validate_source_span(_span(), "However the claim follows.")


def test_question_rejects_distractor_without_error_mechanism() -> None:
    with pytest.raises(ValidationError, match="distractor_requires_error_mechanism"):
        ReadingQuestionArtifact(
            artifact=_artifact("question_1", "question"),
            question_type="main_idea",
            stem="What is the main claim?",
            options=(
                QuestionOption(option_id="A", text="The main claim"),
                QuestionOption(option_id="B", text="A minor detail"),
            ),
            answer_option_id="A",
            answer_evidence=(_span(),),
            solver_trace_ref="solver-call-1",
        )


def test_question_rejects_hint_that_contains_answer() -> None:
    with pytest.raises(ValidationError, match="hint_leaks_answer"):
        ReadingQuestionArtifact(
            artifact=_artifact("question_1", "question"),
            question_type="main_idea",
            stem="What is the main claim?",
            options=(
                QuestionOption(option_id="A", text="The main claim"),
                QuestionOption(
                    option_id="B",
                    text="A minor detail",
                    error_mechanism="uses_supporting_detail",
                ),
            ),
            answer_option_id="A",
            answer_evidence=(_span(),),
            solver_trace_ref="solver-call-1",
            hint_texts=("Look for the main claim.",),
        )


def test_quality_failure_requires_stable_issue_code() -> None:
    with pytest.raises(ValidationError, match="requires_issue_code"):
        QualityReport(
            report_id="report_1",
            artifact_id="article_1",
            validator_id="validator",
            validator_version="v1",
            result=QualityResult.REVISE,
            severity=QualitySeverity.ERROR,
            confidence=0.9,
        )


def test_package_requires_one_objective_and_real_transfer_target() -> None:
    bundle = LearningObjectiveBundle(
        objective_bundle_id="objective_1",
        learner_id="learner_1",
        source_asset_ids=("asset_1",),
        target_discourse_moves=("concession",),
        reading_skill_targets=("main_idea",),
        difficulty_constraints=DifficultyConstraints(
            lexical_band="developing",
            syntax_band="developing",
            discourse_band="developing",
            estimated_minutes=12,
        ),
        required_evidence=(RequiredEvidence(target_id="concession", evidence_kind="discourse"),),
        version=1,
    )
    question = ReadingQuestionArtifact(
        artifact=_artifact("question_1", "question"),
        question_type="main_idea",
        stem="What is the main claim?",
        options=(
            QuestionOption(option_id="A", text="The author supports collaboration."),
            QuestionOption(
                option_id="B",
                text="The author lists office furniture.",
                error_mechanism="uses_irrelevant_detail",
            ),
        ),
        answer_option_id="A",
        answer_evidence=(_span(),),
        solver_trace_ref="solver-call-1",
        hint_texts=("Separate the concession from the main clause.",),
    )
    contract = TransferContract(
        transfer_contract_id="transfer_1",
        objective_bundle_id="objective_1",
        source_reading_artifact_id="article_1",
        required_transfer_targets=("concession",),
        reading_evidence_refs=("question_1",),
        novel_context_constraints=("Use a study-planning context.",),
        success_criteria=("Use a concession before a distinct main claim.",),
        delayed_validation_plan="Re-test in a new context after seven days.",
    )
    expression = ExpressionTaskArtifact(
        artifact=_artifact("expression_1", "expression_task"),
        transfer_contract_id="transfer_1",
        prompt="Make a claim about study planning using concession.",
        required_target_ids=("concession",),
        reading_evidence_refs=("question_1",),
    )
    package = PersonalizedLearningPackage(
        objective_bundle=bundle,
        article=_artifact("article_1", "article"),
        questions=(question,),
        transfer_contract=contract,
        expression_task=expression,
        quality_reports=(
            QualityReport(
                report_id="report_1",
                artifact_id="article_1",
                validator_id="validator",
                validator_version="v1",
                result=QualityResult.PASS,
                severity=QualitySeverity.INFO,
                confidence=1,
            ),
        ),
    )
    assert (
        package.transfer_contract.objective_bundle_id
        == package.objective_bundle.objective_bundle_id
    )


def test_merge_proposal_requires_human_review_and_expected_version() -> None:
    with pytest.raises(ValidationError, match="requires_review"):
        KnowledgeChangeProposal(
            proposal_id="proposal_1",
            candidate_id="candidate_1",
            action=KnowledgeChangeAction.MERGE,
            existing_asset_matches=(
                ExistingAssetMatch(
                    asset_id="asset_1",
                    asset_version=2,
                    canonical_key_match=True,
                    lexical_score=1,
                    evidence="The canonical key matches.",
                ),
            ),
            field_changes=(FieldChange(field_name="claim", before="old", after="new"),),
            source_spans=(_span("source_1"),),
            confidence=0.9,
            requires_human_review=False,
            destination="reading",
            idempotency_key="proposal-key-1",
        )
