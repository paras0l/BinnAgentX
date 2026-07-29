"""Durable personalized-content graph with component review and targeted repair."""

from __future__ import annotations

import inspect
from collections.abc import Awaitable, Callable, Hashable
from typing import Any, TypedDict

from binnagent_domain.learning.content_quality import (
    ContentArtifact,
    ExpressionTaskArtifact,
    GrammarAnalysisArtifact,
    LearningObjectiveBundle,
    QualityReport,
    QualityResult,
    ReadingQuestionArtifact,
    TransferContract,
    stable_content_hash,
)
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from binnagent_agent.workflows.langgraph_runtime import (
    GRAPH_VERSION,
    require_graph_version,
)

type MaybeAwaitable[T] = T | Awaitable[T]

ArticleGenerator = Callable[[LearningObjectiveBundle, str], MaybeAwaitable[dict[str, Any]]]
QuestionGenerator = Callable[
    [LearningObjectiveBundle, dict[str, Any], str],
    MaybeAwaitable[ReadingQuestionArtifact | tuple[ReadingQuestionArtifact, ...]],
]
QualityValidator = Callable[
    [LearningObjectiveBundle, dict[str, Any], tuple[ReadingQuestionArtifact, ...]],
    MaybeAwaitable[tuple[QualityReport, ...]],
]
LanguageGenerator = Callable[
    [LearningObjectiveBundle, dict[str, Any], str],
    MaybeAwaitable[tuple[GrammarAnalysisArtifact, ...]],
]
TransferGenerator = Callable[
    [
        LearningObjectiveBundle,
        dict[str, Any],
        tuple[ReadingQuestionArtifact, ...],
        str,
    ],
    MaybeAwaitable[tuple[TransferContract, ExpressionTaskArtifact]],
]
PackageQualityValidator = Callable[
    ["PersonalizedContentState"],
    MaybeAwaitable[tuple[QualityReport, ...]],
]
ReviewDecider = Callable[
    ["PersonalizedContentState", tuple[QualityReport, ...]],
    MaybeAwaitable[dict[str, Any]],
]
ContentPublisher = Callable[["PersonalizedContentState", str], MaybeAwaitable[str]]
FaultInjector = Callable[[str, str], None]


class PersonalizedContentState(TypedDict, total=False):
    objective_bundle: dict[str, Any]
    article: dict[str, Any]
    questions: list[dict[str, Any]]
    grammar_annotations: list[dict[str, Any]]
    transfer_contract: dict[str, Any]
    expression_task: dict[str, Any]
    quality_reports: list[dict[str, Any]]
    review_decision: dict[str, Any]
    repair_attempts: int
    workflow_status: str
    published_content_id: str
    graph_version: str


def build_personalized_content_graph(
    *,
    article_generator: ArticleGenerator,
    question_generator: QuestionGenerator,
    quality_validator: QualityValidator,
    publisher: ContentPublisher,
    checkpointer: Any,
    language_generator: LanguageGenerator | None = None,
    transfer_generator: TransferGenerator | None = None,
    package_quality_validator: PackageQualityValidator | None = None,
    review_decider: ReviewDecider | None = None,
    fault_injector: FaultInjector | None = None,
    graph_version: str = GRAPH_VERSION,
    compatible_graph_versions: frozenset[str] = frozenset(),
) -> Any:
    """Compile the personalized-content workflow against a supplied checkpointer."""

    def fault(node: str, phase: str) -> None:
        if fault_injector is not None:
            fault_injector(node, phase)

    def validate_version(state: PersonalizedContentState) -> None:
        require_graph_version(
            state,
            graph_version=graph_version,
            compatible_graph_versions=compatible_graph_versions,
        )

    available_repair_scopes = {
        "article",
        "question_bank",
        *({"grammar_annotations"} if language_generator is not None else set()),
        *({"transfer_contract"} if transfer_generator is not None else set()),
    }

    async def article_node(state: PersonalizedContentState) -> dict[str, Any]:
        validate_version(state)
        fault("article", "before")
        objective = LearningObjectiveBundle.model_validate(state["objective_bundle"])
        repair_attempt = int(state.get("repair_attempts", 0))
        key = f"article:{objective.objective_bundle_id}:{objective.version}:r{repair_attempt}"
        article = await _resolve(article_generator(objective, key))
        ContentArtifact.model_validate(article["artifact"])
        fault("article", "after")
        return {
            "article": article,
            "workflow_status": "article_generated",
            "graph_version": graph_version,
        }

    async def question_node(state: PersonalizedContentState) -> dict[str, Any]:
        validate_version(state)
        fault("question", "before")
        objective = LearningObjectiveBundle.model_validate(state["objective_bundle"])
        article = dict(state["article"])
        article_id = ContentArtifact.model_validate(article["artifact"]).artifact_id
        repair_attempt = int(state.get("repair_attempts", 0))
        key = f"question:{objective.objective_bundle_id}:{article_id}:r{repair_attempt}"
        generated = await _resolve(question_generator(objective, article, key))
        questions = generated if isinstance(generated, tuple) else (generated,)
        if not questions:
            raise ValueError("question_generator_must_return_questions")
        fault("question", "after")
        return {
            "questions": [question.model_dump(mode="json") for question in questions],
            "workflow_status": "question_generated",
            "graph_version": graph_version,
        }

    async def language_node(state: PersonalizedContentState) -> dict[str, Any]:
        validate_version(state)
        fault("language", "before")
        objective = LearningObjectiveBundle.model_validate(state["objective_bundle"])
        article = dict(state["article"])
        article_id = ContentArtifact.model_validate(article["artifact"]).artifact_id
        repair_attempt = int(state.get("repair_attempts", 0))
        key = f"language:{objective.objective_bundle_id}:{article_id}:r{repair_attempt}"
        assert language_generator is not None
        annotations = await _resolve(language_generator(objective, article, key))
        fault("language", "after")
        return {
            "grammar_annotations": [
                annotation.model_dump(mode="json") for annotation in annotations
            ],
            "workflow_status": "language_generated",
            "graph_version": graph_version,
        }

    async def transfer_node(state: PersonalizedContentState) -> dict[str, Any]:
        validate_version(state)
        fault("transfer", "before")
        objective = LearningObjectiveBundle.model_validate(state["objective_bundle"])
        article = dict(state["article"])
        questions = tuple(
            ReadingQuestionArtifact.model_validate(item) for item in state["questions"]
        )
        article_id = ContentArtifact.model_validate(article["artifact"]).artifact_id
        repair_attempt = int(state.get("repair_attempts", 0))
        key = f"transfer:{objective.objective_bundle_id}:{article_id}:r{repair_attempt}"
        assert transfer_generator is not None
        transfer_contract, expression_task = await _resolve(
            transfer_generator(objective, article, questions, key)
        )
        fault("transfer", "after")
        return {
            "transfer_contract": transfer_contract.model_dump(mode="json"),
            "expression_task": expression_task.model_dump(mode="json"),
            "workflow_status": "transfer_generated",
            "graph_version": graph_version,
        }

    async def quality_node(state: PersonalizedContentState) -> dict[str, Any]:
        validate_version(state)
        fault("quality", "before")
        objective = LearningObjectiveBundle.model_validate(state["objective_bundle"])
        questions = tuple(
            ReadingQuestionArtifact.model_validate(item) for item in state["questions"]
        )
        if package_quality_validator is None:
            reports = await _resolve(
                quality_validator(objective, dict(state["article"]), questions)
            )
        else:
            reports = await _resolve(package_quality_validator(state))
        if not reports:
            raise ValueError("quality_validator_must_return_reports")
        fault("quality", "after")
        return {
            "quality_reports": [report.model_dump(mode="json") for report in reports],
            "workflow_status": "quality_evaluated",
            "graph_version": graph_version,
        }

    def quality_route(state: PersonalizedContentState) -> str:
        reports = tuple(QualityReport.model_validate(item) for item in state["quality_reports"])
        return (
            "publish"
            if all(report.result is QualityResult.PASS for report in reports)
            else "review"
        )

    async def review_node(state: PersonalizedContentState) -> dict[str, Any]:
        validate_version(state)
        fault("review", "before")
        reports = tuple(QualityReport.model_validate(item) for item in state["quality_reports"])
        decision = (
            await _resolve(review_decider(state, reports))
            if review_decider is not None
            else interrupt(
                {
                    "kind": "personalized_content_quality_review",
                    "objective_bundle_id": state["objective_bundle"]["objective_bundle_id"],
                    "quality_reports": [report.model_dump(mode="json") for report in reports],
                    "allowed_actions": ["approve", "reject", "revise"],
                    "allowed_repair_scopes": sorted(available_repair_scopes),
                    "repair_attempts": int(state.get("repair_attempts", 0)),
                }
            )
        )
        if not isinstance(decision, dict):
            raise ValueError("review_resume_payload_must_be_object")
        action = decision.get("action")
        reviewer_id = decision.get("reviewer_id")
        repair_scope = decision.get("repair_scope")
        if (
            action not in {"approve", "reject", "revise"}
            or not isinstance(reviewer_id, str)
            or (action == "revise" and repair_scope not in available_repair_scopes)
        ):
            raise ValueError("review_resume_payload_invalid")
        repair_attempts = int(state.get("repair_attempts", 0))
        if action == "revise":
            repair_attempts += 1
            if repair_attempts > 2:
                raise ValueError("personalized_content_repair_budget_exhausted")
        fault("review", "after")
        return {
            "review_decision": dict(decision),
            "repair_attempts": repair_attempts,
            "workflow_status": (
                "review_approved"
                if action == "approve"
                else "repair_requested"
                if action == "revise"
                else "rejected"
            ),
            "graph_version": graph_version,
        }

    def review_route(state: PersonalizedContentState) -> str:
        action = state["review_decision"]["action"]
        if action == "approve":
            return "publish"
        if action == "reject":
            return "end"
        scope = state["review_decision"]["repair_scope"]
        return {
            "article": "article",
            "question_bank": "question",
            "grammar_annotations": "language",
            "transfer_contract": "transfer",
        }[scope]

    async def publish_node(state: PersonalizedContentState) -> dict[str, Any]:
        validate_version(state)
        fault("publish", "before")
        objective_id = state["objective_bundle"]["objective_bundle_id"]
        content_hash = stable_content_hash(
            {
                "article": state["article"],
                "questions": state["questions"],
                "grammar_annotations": state.get("grammar_annotations", []),
                "transfer_contract": state.get("transfer_contract"),
                "expression_task": state.get("expression_task"),
                "quality_reports": state["quality_reports"],
            }
        )
        published_id = await _resolve(publisher(state, f"publish:{objective_id}:{content_hash}"))
        fault("publish", "after")
        return {
            "published_content_id": published_id,
            "workflow_status": "completed",
            "graph_version": graph_version,
        }

    graph = StateGraph(PersonalizedContentState)
    graph.add_node("article", article_node)
    graph.add_node("question", question_node)
    if language_generator is not None:
        graph.add_node("language", language_node)
    if transfer_generator is not None:
        graph.add_node("transfer", transfer_node)
    graph.add_node("quality", quality_node)
    graph.add_node("review", review_node)
    graph.add_node("publish", publish_node)
    graph.add_edge(START, "article")
    graph.add_edge("article", "question")
    after_question = (
        "language"
        if language_generator is not None
        else ("transfer" if transfer_generator is not None else "quality")
    )
    graph.add_edge("question", after_question)
    if language_generator is not None:
        graph.add_edge("language", "transfer" if transfer_generator is not None else "quality")
    if transfer_generator is not None:
        graph.add_edge("transfer", "quality")
    graph.add_conditional_edges(
        "quality",
        quality_route,
        {"publish": "publish", "review": "review"},
    )
    review_routes: dict[Hashable, str] = {
        "publish": "publish",
        "end": END,
        "article": "article",
        "question": "question",
    }
    if language_generator is not None:
        review_routes["language"] = "language"
    if transfer_generator is not None:
        review_routes["transfer"] = "transfer"
    graph.add_conditional_edges(
        "review",
        review_route,
        review_routes,
    )
    graph.add_edge("publish", END)
    return graph.compile(
        checkpointer=checkpointer,
        name=f"personalized-content-{graph_version}",
    )


async def _resolve[T](value: MaybeAwaitable[T]) -> T:
    if inspect.isawaitable(value):
        return await value
    return value
