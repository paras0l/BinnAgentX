from datetime import UTC, datetime
from typing import Any

import pytest
from binnagent_agent.workflows import (
    GRAPH_VERSION,
    build_knowledge_organization_graph,
    build_personalized_content_graph,
    stable_thread_id,
)
from binnagent_agent.workflows.langgraph_runtime import psycopg_connection_string
from binnagent_agent.workflows.personalized_content_graph import (
    PersonalizedContentState,
)
from binnagent_domain.learning.content_quality import (
    ContentArtifact,
    DifficultyConstraints,
    LearningObjectiveBundle,
    QualityIssueCode,
    QualityReport,
    QualityResult,
    QualitySeverity,
    QuestionOption,
    ReadingQuestionArtifact,
    RequiredEvidence,
    SourceSpan,
    stable_content_hash,
)
from binnagent_domain.learning.knowledge_organization import (
    AtomicKnowledgeCandidate,
    CandidateValidationStatus,
    KnowledgeChangeAction,
    KnowledgeChangeProposal,
    KnowledgeKind,
    KnowledgeSourceRecord,
)
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command


def _bundle() -> LearningObjectiveBundle:
    return LearningObjectiveBundle(
        objective_bundle_id="objective_graph_1",
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


def _content_artifact(artifact_id: str, artifact_type: str) -> ContentArtifact:
    digest = stable_content_hash({"artifact_id": artifact_id})
    return ContentArtifact(
        artifact_id=artifact_id,
        version=1,
        objective_bundle_id="objective_graph_1",
        artifact_type=artifact_type,
        generation_inputs_hash=digest,
        content_hash=digest,
        producer_version="fixture-v1",
    )


@pytest.mark.asyncio
async def test_personalized_graph_interrupts_and_resumes_same_thread() -> None:
    published: dict[str, str] = {}

    def article_generator(_objective: LearningObjectiveBundle, _key: str) -> dict[str, Any]:
        return {
            "artifact": _content_artifact("article_graph_1", "article").model_dump(mode="json"),
            "title": "A real article",
            "paragraphs": ["Although the office was small, the team worked well."],
        }

    def question_generator(
        _objective: LearningObjectiveBundle,
        _article: dict[str, Any],
        _key: str,
    ) -> ReadingQuestionArtifact:
        span = SourceSpan(
            source_id="article_graph_1",
            source_version="1",
            start=0,
            end=8,
            text_quote="Although",
        )
        return ReadingQuestionArtifact(
            artifact=_content_artifact("question_graph_1", "question"),
            question_type="main_idea",
            stem="What does the author claim?",
            options=(
                QuestionOption(option_id="A", text="The team worked well."),
                QuestionOption(
                    option_id="B",
                    text="The office was large.",
                    error_mechanism="reverses_the_concession_detail",
                ),
            ),
            answer_option_id="A",
            answer_evidence=(span,),
            solver_trace_ref="solver-ledger-1",
            hint_texts=("Read the main clause after the concession.",),
        )

    def quality_validator(
        _objective: LearningObjectiveBundle,
        _article: dict[str, Any],
        _questions: tuple[ReadingQuestionArtifact, ...],
    ) -> tuple[QualityReport, ...]:
        return (
            QualityReport(
                report_id="report_graph_1",
                artifact_id="question_graph_1",
                validator_id="independent-solver",
                validator_version="fixture-v1",
                result=QualityResult.REVIEW_REQUIRED,
                issue_code=QualityIssueCode.SEMANTIC_REVIEW_NOT_RUN,
                severity=QualitySeverity.BLOCKER,
                confidence=1,
            ),
        )

    def publisher(_state: PersonalizedContentState, key: str) -> str:
        return published.setdefault(key, "material_graph_1")

    graph = build_personalized_content_graph(
        article_generator=article_generator,
        question_generator=question_generator,
        quality_validator=quality_validator,
        publisher=publisher,
        checkpointer=InMemorySaver(),
    )
    thread_id = stable_thread_id("personalized-content", "material_graph_1")
    config = {"configurable": {"thread_id": thread_id}}
    interrupted = await graph.ainvoke(
        {
            "objective_bundle": _bundle().model_dump(mode="json"),
            "graph_version": GRAPH_VERSION,
        },
        config,
    )

    assert interrupted["workflow_status"] == "quality_evaluated"
    assert interrupted["__interrupt__"][0].value["kind"] == "personalized_content_quality_review"
    assert published == {}

    completed = await graph.ainvoke(
        Command(resume={"action": "approve", "reviewer_id": "reviewer_1"}),
        config,
    )

    assert completed["workflow_status"] == "completed"
    assert completed["published_content_id"] == "material_graph_1"
    assert len(published) == 1


@pytest.mark.asyncio
async def test_personalized_graph_reacts_with_scoped_question_repair() -> None:
    article_calls: list[str] = []
    question_calls: list[str] = []

    def article_generator(_objective: LearningObjectiveBundle, key: str) -> dict[str, Any]:
        article_calls.append(key)
        return {
            "artifact": _content_artifact("article_graph_repair", "article").model_dump(
                mode="json"
            ),
            "title": "Repairable article",
            "paragraphs": ["Although the plan was familiar, the team checked new evidence."],
        }

    def question_generator(
        _objective: LearningObjectiveBundle,
        _article: dict[str, Any],
        key: str,
    ) -> ReadingQuestionArtifact:
        question_calls.append(key)
        revision = len(question_calls) - 1
        return ReadingQuestionArtifact(
            artifact=_content_artifact(f"question_graph_repair_{revision}", "question"),
            question_type="evidence_reasoning",
            stem="Which action is supported by the sentence?",
            options=(
                QuestionOption(option_id="A", text="The team checked new evidence."),
                QuestionOption(
                    option_id="B",
                    text="The team ignored the new evidence.",
                    error_mechanism="reverses_the_main_clause",
                ),
            ),
            answer_option_id="A",
            answer_evidence=(
                SourceSpan(
                    source_id="article_graph_repair",
                    source_version="1",
                    start=32,
                    end=61,
                    text_quote="the team checked new evidence",
                ),
            ),
            solver_trace_ref=f"review_required_{revision}",
        )

    report = QualityReport(
        report_id="report_graph_repair",
        artifact_id="article_graph_repair",
        validator_id="repair-gate",
        validator_version="v1",
        result=QualityResult.REVIEW_REQUIRED,
        issue_code=QualityIssueCode.SEMANTIC_REVIEW_NOT_RUN,
        severity=QualitySeverity.BLOCKER,
        repair_scope=("question_bank",),
        confidence=1,
    )
    graph = build_personalized_content_graph(
        article_generator=article_generator,
        question_generator=question_generator,
        quality_validator=lambda _objective, _article, _questions: (report,),
        publisher=lambda _state, _key: "material_graph_repair",
        checkpointer=InMemorySaver(),
    )
    config = {
        "configurable": {
            "thread_id": stable_thread_id(
                "personalized-content",
                "material_graph_repair",
            )
        }
    }
    interrupted = await graph.ainvoke(
        {
            "objective_bundle": _bundle().model_dump(mode="json"),
            "graph_version": GRAPH_VERSION,
        },
        config,
    )
    assert interrupted["__interrupt__"]

    revised = await graph.ainvoke(
        Command(
            resume={
                "action": "revise",
                "reviewer_id": "reviewer_1",
                "repair_scope": "question_bank",
            }
        ),
        config,
    )
    assert revised["__interrupt__"]
    assert revised["repair_attempts"] == 1
    assert len(article_calls) == 1
    assert len(question_calls) == 2
    assert question_calls[0].endswith(":r0")
    assert question_calls[1].endswith(":r1")

    completed = await graph.ainvoke(
        Command(resume={"action": "approve", "reviewer_id": "reviewer_1"}),
        config,
    )
    assert completed["workflow_status"] == "completed"


@pytest.mark.asyncio
async def test_knowledge_graph_requires_review_before_idempotent_commit() -> None:
    source_text = "Although introduces a concession."
    digest = stable_content_hash(source_text)
    source = KnowledgeSourceRecord(
        source_record_id="source_record_1",
        learner_id="learner_1",
        provider="obsidian",
        connection_id="connection_1",
        source_key="Inbox/concession.md",
        content_hash=digest,
        source_modified_at=datetime.now(UTC),
        authorized_scope=("Inbox/",),
        captured_content_ref="captured://source_record_1",
        captured_at=datetime.now(UTC),
    )
    span = SourceSpan(
        source_id="source_record_1",
        source_version=digest,
        start=0,
        end=8,
        text_quote="Although",
    )
    candidate = AtomicKnowledgeCandidate(
        candidate_id="candidate_1",
        source_record_id="source_record_1",
        knowledge_kind=KnowledgeKind.GRAMMAR,
        canonical_key="grammar:concession:although",
        title="Although concession",
        claim="Although introduces a concession clause.",
        source_spans=(span,),
        confidence=0.95,
        validation_status=CandidateValidationStatus.NEEDS_REVIEW,
        extractor_version="fixture-v1",
    )
    proposal = KnowledgeChangeProposal(
        proposal_id="proposal_1",
        candidate_id="candidate_1",
        action=KnowledgeChangeAction.CREATE,
        source_spans=(span,),
        confidence=0.95,
        requires_human_review=True,
        destination="reading",
        idempotency_key="proposal_1",
    )
    commits: dict[str, tuple[str, ...]] = {}

    graph = build_knowledge_organization_graph(
        extractor=lambda _source, _key: (candidate,),
        matcher=lambda _source, _candidates, _key: (proposal,),
        committer=lambda _state, key: commits.setdefault(key, ("asset_1",)),
        checkpointer=InMemorySaver(),
    )
    config = {
        "configurable": {"thread_id": stable_thread_id("knowledge-organization", "organizer_run_1")}
    }
    interrupted = await graph.ainvoke(
        {
            "source_records": [source.model_dump(mode="json")],
            "graph_version": GRAPH_VERSION,
        },
        config,
    )

    assert interrupted["__interrupt__"][0].value["kind"] == "knowledge_change_review"
    assert commits == {}

    completed = await graph.ainvoke(
        Command(
            resume={
                "reviewer_id": "reviewer_1",
                "decisions": {"proposal_1": "approve"},
            }
        ),
        config,
    )

    assert completed["committed_asset_ids"] == ["asset_1"]
    assert len(commits) == 1


def test_langgraph_runtime_uses_business_run_ids_and_psycopg_url() -> None:
    assert stable_thread_id("personalized-content", "material_1") == (
        "personalized-content:material_1"
    )
    assert (
        psycopg_connection_string("postgresql+asyncpg://user:secret@db:5432/binnagent")
        == "postgresql://user:secret@db:5432/binnagent"
    )
    with pytest.raises(ValueError, match="invalid_graph_run_id"):
        stable_thread_id("content", "learner/shared thread")


@pytest.mark.asyncio
async def test_personalized_graph_recovers_after_failure_without_duplicate_charge() -> None:
    provider_ledger: dict[str, dict[str, Any]] = {}
    article_invocations = 0
    failed_once = False

    def article_generator(_objective: LearningObjectiveBundle, key: str) -> dict[str, Any]:
        nonlocal article_invocations
        article_invocations += 1
        return provider_ledger.setdefault(
            key,
            {
                "artifact": _content_artifact("article_recovery_1", "article").model_dump(
                    mode="json"
                ),
                "title": "Recoverable article",
                "paragraphs": ["Although it was difficult, the team continued."],
            },
        )

    def question_generator(
        _objective: LearningObjectiveBundle,
        _article: dict[str, Any],
        _key: str,
    ) -> ReadingQuestionArtifact:
        return ReadingQuestionArtifact(
            artifact=_content_artifact("question_recovery_1", "question"),
            question_type="detail_comprehension",
            stem="What did the team do?",
            options=(
                QuestionOption(option_id="A", text="It continued."),
                QuestionOption(
                    option_id="B",
                    text="It stopped.",
                    error_mechanism="reverses_the_stated_action",
                ),
            ),
            answer_option_id="A",
            answer_evidence=(
                SourceSpan(
                    source_id="article_recovery_1",
                    source_version="1",
                    start=27,
                    end=45,
                    text_quote="the team continued",
                ),
            ),
            solver_trace_ref="solver-recovery-1",
        )

    def quality_validator(
        _objective: LearningObjectiveBundle,
        _article: dict[str, Any],
        _questions: tuple[ReadingQuestionArtifact, ...],
    ) -> tuple[QualityReport, ...]:
        return (
            QualityReport(
                report_id="report_recovery_1",
                artifact_id="question_recovery_1",
                validator_id="fixture",
                validator_version="v1",
                result=QualityResult.PASS,
                severity=QualitySeverity.INFO,
                confidence=1,
            ),
        )

    def fail_after_article(node: str, phase: str) -> None:
        nonlocal failed_once
        if node == "article" and phase == "after" and not failed_once:
            failed_once = True
            raise RuntimeError("injected_after_article")

    graph = build_personalized_content_graph(
        article_generator=article_generator,
        question_generator=question_generator,
        quality_validator=quality_validator,
        publisher=lambda _state, _key: "material_recovery_1",
        checkpointer=InMemorySaver(),
        fault_injector=fail_after_article,
    )
    config = {
        "configurable": {
            "thread_id": stable_thread_id("personalized-content", "material_recovery_1")
        }
    }
    with pytest.raises(RuntimeError, match="injected_after_article"):
        await graph.ainvoke(
            {
                "objective_bundle": _bundle().model_dump(mode="json"),
                "graph_version": GRAPH_VERSION,
            },
            config,
        )

    completed = await graph.ainvoke(None, config)

    assert completed["workflow_status"] == "completed"
    assert article_invocations == 2
    assert len(provider_ledger) == 1
