from datetime import UTC, datetime
from typing import Any

import pytest
from binnagent_agent.workflows import (
    GRAPH_VERSION,
    GraphVersionMismatchError,
    build_knowledge_organization_graph,
    build_personalized_content_graph,
    stable_thread_id,
)
from binnagent_domain.learning.content_quality import (
    ContentArtifact,
    DifficultyConstraints,
    ExpressionTaskArtifact,
    GrammarAnalysisArtifact,
    LearningObjectiveBundle,
    QualityIssueCode,
    QualityReport,
    QualityResult,
    QualitySeverity,
    QuestionOption,
    ReadingQuestionArtifact,
    RequiredEvidence,
    SourceSpan,
    TransferContract,
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

FaultPoint = tuple[str, str]


def _artifact(artifact_id: str, artifact_type: str) -> ContentArtifact:
    digest = stable_content_hash(artifact_id)
    return ContentArtifact(
        artifact_id=artifact_id,
        version=1,
        objective_bundle_id="objective_fault_matrix",
        artifact_type=artifact_type,
        generation_inputs_hash=digest,
        content_hash=digest,
        producer_version="fault-matrix-v1",
    )


def _objective() -> LearningObjectiveBundle:
    return LearningObjectiveBundle(
        objective_bundle_id="objective_fault_matrix",
        learner_id="learner_fault_matrix",
        source_asset_ids=("asset_source",),
        target_discourse_moves=("concession",),
        reading_skill_targets=("main_idea",),
        difficulty_constraints=DifficultyConstraints(
            lexical_band="developing",
            syntax_band="developing",
            discourse_band="developing",
            estimated_minutes=10,
        ),
        required_evidence=(RequiredEvidence(target_id="concession", evidence_kind="discourse"),),
        version=1,
    )


def _question() -> ReadingQuestionArtifact:
    return ReadingQuestionArtifact(
        artifact=_artifact("question_fault_matrix", "question"),
        question_type="main_idea",
        stem="What is the main claim?",
        options=(
            QuestionOption(option_id="A", text="The team continued."),
            QuestionOption(
                option_id="B",
                text="The team stopped.",
                error_mechanism="reverses_the_main_claim",
            ),
        ),
        answer_option_id="A",
        answer_evidence=(
            SourceSpan(
                source_id="article_fault_matrix",
                source_version="1",
                start=31,
                end=49,
                text_quote="the team continued",
            ),
        ),
        solver_trace_ref="solver_fault_matrix",
        hint_texts=("Locate the main clause.",),
    )


def _quality_report() -> QualityReport:
    return QualityReport(
        report_id="report_fault_matrix",
        artifact_id="question_fault_matrix",
        validator_id="fault-matrix-reviewer",
        validator_version="v1",
        result=QualityResult.REVIEW_REQUIRED,
        issue_code=QualityIssueCode.SEMANTIC_REVIEW_NOT_RUN,
        severity=QualitySeverity.BLOCKER,
        confidence=1,
    )


def _grammar() -> GrammarAnalysisArtifact:
    span = SourceSpan(
        source_id="personalized_p_01",
        source_version="1",
        start=0,
        end=8,
        text_quote="Although",
    )
    return GrammarAnalysisArtifact(
        artifact=_artifact("grammar_fault_matrix", "grammar_annotation"),
        structure_key="concession_clause",
        span=span,
        explanation="Although introduces a concession before the main claim.",
        parser_id="fixture",
        parser_version="v1",
        confidence=0.95,
        status="review_required",
    )


def _transfer() -> tuple[TransferContract, ExpressionTaskArtifact]:
    contract = TransferContract(
        transfer_contract_id="transfer_fault_matrix",
        objective_bundle_id="objective_fault_matrix",
        source_reading_artifact_id="article_fault_matrix",
        required_transfer_targets=("concession",),
        reading_evidence_refs=("question_fault_matrix",),
        novel_context_constraints=("Use a different study-planning context.",),
        success_criteria=("Use concession before a distinct recommendation.",),
        delayed_validation_plan="Retest after seven days.",
    )
    expression = ExpressionTaskArtifact(
        artifact=_artifact("expression_fault_matrix", "expression_task"),
        transfer_contract_id=contract.transfer_contract_id,
        prompt="Qualify a study recommendation in a new context.",
        required_target_ids=("concession",),
        reading_evidence_refs=("question_fault_matrix",),
    )
    return contract, expression


def _knowledge_contracts() -> tuple[
    KnowledgeSourceRecord,
    AtomicKnowledgeCandidate,
    KnowledgeChangeProposal,
]:
    source_text = "Although introduces a concession."
    digest = stable_content_hash(source_text)
    source = KnowledgeSourceRecord(
        source_record_id="source_fault_matrix",
        learner_id="learner_fault_matrix",
        provider="obsidian",
        connection_id="connection_fault_matrix",
        source_key="Inbox/fault-matrix.md",
        content_hash=digest,
        source_modified_at=datetime.now(UTC),
        authorized_scope=("Inbox/",),
        captured_content_ref="captured://source_fault_matrix",
        captured_at=datetime.now(UTC),
    )
    span = SourceSpan(
        source_id=source.source_record_id,
        source_version=digest,
        start=0,
        end=8,
        text_quote="Although",
    )
    candidate = AtomicKnowledgeCandidate(
        candidate_id="candidate_fault_matrix",
        source_record_id=source.source_record_id,
        knowledge_kind=KnowledgeKind.GRAMMAR,
        canonical_key="grammar:concession:although",
        title="Although concession",
        claim="Although introduces a concession.",
        source_spans=(span,),
        confidence=0.95,
        validation_status=CandidateValidationStatus.NEEDS_REVIEW,
        extractor_version="fault-matrix-v1",
    )
    proposal = KnowledgeChangeProposal(
        proposal_id="proposal_fault_matrix",
        candidate_id=candidate.candidate_id,
        action=KnowledgeChangeAction.CREATE,
        source_spans=(span,),
        confidence=0.95,
        requires_human_review=True,
        destination="reading",
        idempotency_key="proposal_fault_matrix",
    )
    return source, candidate, proposal


class _FailOnce:
    def __init__(self, target: FaultPoint) -> None:
        self.target = target
        self.triggered = False

    def __call__(self, node: str, phase: str) -> None:
        if (node, phase) == self.target and not self.triggered:
            self.triggered = True
            raise RuntimeError(f"injected:{node}:{phase}")


async def _drive_to_completion(
    graph: Any,
    config: dict[str, Any],
    initial_state: dict[str, Any],
) -> dict[str, Any]:
    graph_input: object = initial_state
    for _ in range(12):
        try:
            result = await graph.ainvoke(graph_input, config)
        except RuntimeError as exc:
            if not str(exc).startswith("injected:"):
                raise
            graph_input = None
            continue
        if result.get("__interrupt__"):
            interrupt_value = result["__interrupt__"][0].value
            if interrupt_value.get("kind") == "knowledge_change_review":
                graph_input = Command(
                    resume={
                        "reviewer_id": "fault-matrix-reviewer",
                        "decisions": {
                            item["proposal_id"]: "approve" for item in interrupt_value["proposals"]
                        },
                    }
                )
            else:
                graph_input = Command(
                    resume={
                        "action": "approve",
                        "reviewer_id": "fault-matrix-reviewer",
                    }
                )
            continue
        return dict(result)
    raise AssertionError("fault_matrix_did_not_complete")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("node", "phase"),
    [
        (node, phase)
        for node in (
            "article",
            "question",
            "language",
            "transfer",
            "quality",
            "review",
            "publish",
        )
        for phase in ("before", "after")
    ],
)
async def test_personalized_graph_recovers_at_every_node_boundary(
    node: str,
    phase: str,
) -> None:
    failure = _FailOnce((node, phase))
    provider_ledger: dict[str, dict[str, Any]] = {}
    question_ledger: dict[str, ReadingQuestionArtifact] = {}
    language_ledger: dict[str, tuple[GrammarAnalysisArtifact, ...]] = {}
    transfer_ledger: dict[
        str,
        tuple[TransferContract, ExpressionTaskArtifact],
    ] = {}
    publish_ledger: dict[str, str] = {}

    graph = build_personalized_content_graph(
        article_generator=lambda _objective, key: provider_ledger.setdefault(
            key,
            {
                "artifact": _artifact("article_fault_matrix", "article").model_dump(mode="json"),
                "title": "Fault matrix article",
                "paragraphs": ["Although it was difficult, the team continued."],
            },
        ),
        question_generator=lambda _objective, _article, key: question_ledger.setdefault(
            key, _question()
        ),
        language_generator=lambda _objective, _article, key: language_ledger.setdefault(
            key,
            (_grammar(),),
        ),
        transfer_generator=lambda _objective, _article, _questions, key: transfer_ledger.setdefault(
            key, _transfer()
        ),
        quality_validator=lambda _objective, _article, _questions: (_quality_report(),),
        publisher=lambda _state, key: publish_ledger.setdefault(key, "material_fault_matrix"),
        checkpointer=InMemorySaver(),
        fault_injector=failure,
    )
    config = {
        "configurable": {
            "thread_id": stable_thread_id(
                "personalized-content",
                f"fault_{node}_{phase}",
            )
        }
    }
    completed = await _drive_to_completion(
        graph,
        config,
        {
            "objective_bundle": _objective().model_dump(mode="json"),
            "graph_version": GRAPH_VERSION,
        },
    )

    assert failure.triggered is True
    assert completed["workflow_status"] == "completed"
    assert completed["graph_version"] == GRAPH_VERSION
    assert len(provider_ledger) == 1
    assert len(question_ledger) == 1
    assert len(language_ledger) == 1
    assert len(transfer_ledger) == 1
    assert len(publish_ledger) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("node", "phase"),
    [
        (node, phase)
        for node in ("extract", "proposal", "review", "commit")
        for phase in ("before", "after")
    ],
)
async def test_knowledge_graph_recovers_at_every_node_boundary(
    node: str,
    phase: str,
) -> None:
    source, candidate, proposal = _knowledge_contracts()
    failure = _FailOnce((node, phase))
    extraction_ledger: dict[str, tuple[AtomicKnowledgeCandidate, ...]] = {}
    proposal_ledger: dict[str, tuple[KnowledgeChangeProposal, ...]] = {}
    commit_ledger: dict[str, tuple[str, ...]] = {}
    graph = build_knowledge_organization_graph(
        extractor=lambda _source, key: extraction_ledger.setdefault(key, (candidate,)),
        matcher=lambda _source, _candidates, key: proposal_ledger.setdefault(key, (proposal,)),
        committer=lambda _state, key: commit_ledger.setdefault(key, ("asset_fault_matrix",)),
        checkpointer=InMemorySaver(),
        fault_injector=failure,
    )
    config = {
        "configurable": {
            "thread_id": stable_thread_id(
                "knowledge-organization",
                f"fault_{node}_{phase}",
            )
        }
    }
    completed = await _drive_to_completion(
        graph,
        config,
        {
            "source_records": [source.model_dump(mode="json")],
            "graph_version": GRAPH_VERSION,
        },
    )

    assert failure.triggered is True
    assert completed["workflow_status"] == "completed"
    assert completed["graph_version"] == GRAPH_VERSION
    assert len(extraction_ledger) == 1
    assert len(proposal_ledger) == 1
    assert len(commit_ledger) == 1


@pytest.mark.asyncio
async def test_graph_upgrade_requires_explicit_checkpoint_compatibility() -> None:
    saver = InMemorySaver()
    published: dict[str, str] = {}

    def build(version: str, compatible: frozenset[str] = frozenset()) -> Any:
        return build_personalized_content_graph(
            article_generator=lambda _objective, _key: {
                "artifact": _artifact("article_fault_matrix", "article").model_dump(mode="json"),
                "title": "Versioned article",
                "paragraphs": ["Although it was difficult, the team continued."],
            },
            question_generator=lambda _objective, _article, _key: _question(),
            quality_validator=lambda _objective, _article, _questions: (_quality_report(),),
            publisher=lambda _state, key: published.setdefault(key, "material_versioned"),
            checkpointer=saver,
            graph_version=version,
            compatible_graph_versions=compatible,
        )

    config = {
        "configurable": {
            "thread_id": stable_thread_id(
                "personalized-content",
                "version_upgrade",
            )
        }
    }
    v1 = build(GRAPH_VERSION)
    interrupted = await v1.ainvoke(
        {
            "objective_bundle": _objective().model_dump(mode="json"),
            "graph_version": GRAPH_VERSION,
        },
        config,
    )
    assert interrupted["__interrupt__"]

    v2_version = "agent-workflows-v2-rehearsal"
    with pytest.raises(GraphVersionMismatchError, match="graph_version_mismatch"):
        await build(v2_version).ainvoke(
            Command(resume={"action": "approve", "reviewer_id": "reviewer"}),
            config,
        )

    completed = await build(
        v2_version,
        frozenset({GRAPH_VERSION}),
    ).ainvoke(
        Command(resume={"action": "approve", "reviewer_id": "reviewer"}),
        config,
    )
    assert completed["workflow_status"] == "completed"
    assert completed["graph_version"] == v2_version
    assert len(published) == 1
