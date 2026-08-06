"""Queue and evaluate the learner's current adaptation level."""

from __future__ import annotations

import re
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import sqlalchemy as sa
from binnagent_agent.agents.level_assessor import (
    LevelAssessmentAgent,
    LevelAssessmentOutput,
    LevelEvidenceSummary,
)
from binnagent_domain.vertical_slice.errors import DomainError
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.database import get_engine
from binnagent_api.personalized_reading_content import (
    is_personalized_content,
    parent_material_id,
)
from binnagent_api.personalized_reading_content import (
    reading_question as personalized_reading_question,
)
from binnagent_api.vertical_slice import tables
from binnagent_api.vertical_slice.content_catalog import LocalContentCatalog
from binnagent_api.vertical_slice.repository import _profile_from_json

_agent = LevelAssessmentAgent()
_content_catalog = LocalContentCatalog()
_READING_CHOICE = re.compile(r"^选择 ([^。\n]+)。", re.UNICODE)


async def enqueue_level_assessment(
    connection: AsyncConnection,
    *,
    learner_id: str | None,
    workflow_run_id: str,
    trigger_kind: str,
    trigger_key: str,
    now: datetime,
) -> None:
    if learner_id is None:
        return
    await connection.execute(
        postgresql_insert(tables.learner_level_assessments)
        .values(
            assessment_id=f"level_assessment_{uuid4().hex}",
            learner_id=learner_id,
            trigger_workflow_run_id=workflow_run_id,
            trigger_kind=trigger_kind,
            trigger_key=trigger_key,
            status="queued",
            evidence_summary={},
            dimensions={},
            evidence_count=0,
            reason_codes=[],
            attempt_count=0,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(index_elements=[tables.learner_level_assessments.c.trigger_key])
    )


async def process_next_level_assessment() -> bool:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.learner_level_assessments)
                    .where(tables.learner_level_assessments.c.status == "queued")
                    .order_by(tables.learner_level_assessments.c.created_at)
                    .with_for_update(skip_locked=True)
                    .limit(1)
                )
            )
            .mappings()
            .first()
        )
        if row is None:
            return False
        assessment_id = str(row["assessment_id"])
        await connection.execute(
            tables.learner_level_assessments.update()
            .where(tables.learner_level_assessments.c.assessment_id == assessment_id)
            .values(
                status="processing",
                attempt_count=tables.learner_level_assessments.c.attempt_count + 1,
                updated_at=now,
            )
        )
    try:
        async with get_engine().connect() as connection:
            evidence = await collect_level_evidence(connection, str(row["learner_id"]))
        output = _agent.assess(evidence)
    except Exception as exc:
        async with get_engine().begin() as connection:
            await connection.execute(
                tables.learner_level_assessments.update()
                .where(tables.learner_level_assessments.c.assessment_id == assessment_id)
                .values(
                    status="failed", error_code=type(exc).__name__, updated_at=datetime.now(UTC)
                )
            )
        return True
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.learner_level_assessments.update()
            .where(tables.learner_level_assessments.c.assessment_id == assessment_id)
            .values(
                status="completed",
                evidence_summary=evidence.model_dump(),
                overall_level=output.overall_level,
                dimensions=output.dimensions.model_dump(),
                confidence_band=output.confidence_band,
                evidence_count=output.evidence_count,
                reason_codes=output.reason_codes,
                error_code=None,
                updated_at=datetime.now(UTC),
                completed_at=datetime.now(UTC),
            )
        )
    return True


async def collect_level_evidence(
    connection: AsyncConnection, learner_id: str
) -> LevelEvidenceSummary:
    owned_tasks = (
        sa.select(tables.learning_tasks.c.task_id)
        .join(
            tables.workflow_runs,
            tables.workflow_runs.c.workflow_run_id == tables.learning_tasks.c.workflow_run_id,
        )
        .where(tables.workflow_runs.c.learner_id == learner_id)
    )
    task_rows = (
        (
            await connection.execute(
                sa.select(
                    tables.learning_tasks.c.task_id,
                    tables.learning_tasks.c.task_type,
                    tables.learning_tasks.c.state,
                    tables.learning_tasks.c.highest_hint_level,
                    tables.learning_tasks.c.learner_snapshot_id,
                ).where(tables.learning_tasks.c.task_id.in_(owned_tasks))
            )
        )
        .mappings()
        .all()
    )
    task_ids = [str(row["task_id"]) for row in task_rows]
    completed_rows = [row for row in task_rows if str(row["state"]) == "completed"]
    independent = sum(int(row["highest_hint_level"]) == 0 for row in completed_rows)
    hinted = sum(int(row["highest_hint_level"]) > 0 for row in completed_rows)
    expression_attempts = sum(str(row["task_type"]) == "micro_expression" for row in completed_rows)

    async def count(table: sa.Table, condition: Any) -> int:
        if not task_ids:
            return 0
        value = await connection.scalar(
            sa.select(sa.func.count()).select_from(table).where(condition)
        )
        return int(value or 0)

    revision_count = await count(
        tables.revision_events, tables.revision_events.c.task_id.in_(task_ids)
    )
    annotation_count = await count(
        tables.task_annotations, tables.task_annotations.c.task_id.in_(task_ids)
    )
    grammar_rows = (
        (
            await connection.execute(
                sa.select(
                    tables.learner_grammar_states.c.construction_id,
                    tables.learner_grammar_states.c.modality,
                    tables.learner_grammar_states.c.status,
                    tables.learner_grammar_states.c.evidence_count,
                ).where(tables.learner_grammar_states.c.learner_id == learner_id)
            )
        )
        .mappings()
        .all()
    )
    ratings = (
        (
            await connection.execute(
                sa.select(tables.difficulty_feedback_events.c.rating)
                .join(
                    tables.workflow_runs,
                    tables.workflow_runs.c.workflow_run_id
                    == tables.difficulty_feedback_events.c.workflow_run_id,
                )
                .where(
                    tables.workflow_runs.c.learner_id == learner_id,
                    tables.difficulty_feedback_events.c.rating.is_not(None),
                )
            )
        )
        .scalars()
        .all()
    )
    material_sentiments = (
        (
            await connection.execute(
                sa.select(tables.material_feedback_events.c.sentiment).where(
                    tables.material_feedback_events.c.learner_id == learner_id
                )
            )
        )
        .scalars()
        .all()
    )
    reading = await _collect_reading_response_evidence(
        connection,
        learner_id=learner_id,
        task_rows=task_rows,
    )
    grammar_evidence_kinds = (
        await connection.execute(
            sa.select(tables.grammar_learning_evidence.c.evidence_kind).where(
                tables.grammar_learning_evidence.c.learner_id == learner_id
            )
        )
    ).scalars().all()
    return LevelEvidenceSummary(
        completed_tasks=len(completed_rows),
        independent_tasks=independent,
        hinted_tasks=hinted,
        revision_count=revision_count,
        annotation_count=annotation_count,
        grammar_attempts=sum(int(row["evidence_count"]) for row in grammar_rows),
        grammar_resolved=len(
            {
                str(row["construction_id"])
                for row in grammar_rows
                if str(row["modality"]) == "receptive"
                and str(row["status"]) in {"awaiting_delayed_validation", "delayed_stable"}
            }
        ),
        grammar_constructs=len(
            {
                str(row["construction_id"])
                for row in grammar_rows
                if str(row["modality"]) == "receptive"
                and str(row["status"]) in {"awaiting_delayed_validation", "delayed_stable"}
            }
        ),
        grammar_stable_constructs=len(
            {
                str(row["construction_id"])
                for row in grammar_rows
                if str(row["modality"]) == "receptive" and str(row["status"]) == "delayed_stable"
            }
        ),
        grammar_productive_constructs=len(
            {
                str(row["construction_id"])
                for row in grammar_rows
                if str(row["modality"]) == "productive"
                and str(row["status"]) in {"awaiting_delayed_validation", "delayed_stable"}
            }
        ),
        expression_attempts=expression_attempts,
        difficulty_too_easy=sum(rating == "too_easy" for rating in ratings),
        difficulty_matched=sum(rating == "matched" for rating in ratings),
        difficulty_too_hard=sum(rating == "too_hard" for rating in ratings),
        material_helpful=sum(value == "good" for value in material_sentiments),
        material_unhelpful=sum(value == "bad" for value in material_sentiments),
        **reading,
        grammar_independent_correct=sum(
            value in {"independent_recognition", "independent_production", "delayed_transfer"}
            for value in grammar_evidence_kinds
        ),
        grammar_supported_correct=sum(
            value in {"supported_recognition", "supported_production"}
            for value in grammar_evidence_kinds
        ),
        grammar_incorrect=sum(value == "attempt_failed" for value in grammar_evidence_kinds),
        grammar_delayed_transfer=sum(
            value == "delayed_transfer" for value in grammar_evidence_kinds
        ),
    )


async def _collect_reading_response_evidence(
    connection: AsyncConnection,
    *,
    learner_id: str,
    task_rows: Sequence[RowMapping],
) -> dict[str, int]:
    reading_rows = [
        row
        for row in task_rows
        if str(row["task_type"]) in {"calibration_reading", "matched_reading"}
    ]
    counts = {
        "reading_responses": 0,
        "reading_correct": 0,
        "reading_foundation_responses": 0,
        "reading_standard_responses": 0,
        "reading_advanced_responses": 0,
        "reading_foundation_correct": 0,
        "reading_standard_correct": 0,
        "reading_advanced_correct": 0,
        "vocabulary_responses": 0,
        "vocabulary_correct": 0,
        "grammar_question_responses": 0,
        "grammar_question_correct": 0,
    }
    if not reading_rows:
        return counts

    reading_task_ids = [str(row["task_id"]) for row in reading_rows]
    attempts = (
        (
            await connection.execute(
                sa.select(
                    tables.attempt_versions.c.task_id,
                    tables.attempt_versions.c.text,
                    tables.attempt_versions.c.version,
                )
                .where(tables.attempt_versions.c.task_id.in_(reading_task_ids))
                .order_by(tables.attempt_versions.c.task_id, tables.attempt_versions.c.version)
            )
        )
        .mappings()
        .all()
    )
    first_attempt = {str(row["task_id"]): str(row["text"]) for row in reversed(attempts)}
    assignments = (
        (
            await connection.execute(
                sa.select(
                    tables.task_material_assignments.c.task_id,
                    tables.task_material_assignments.c.content_version_id,
                ).where(tables.task_material_assignments.c.task_id.in_(reading_task_ids))
            )
        )
        .mappings()
        .all()
    )
    content_by_task = {
        str(row["task_id"]): str(row["content_version_id"]) for row in assignments
    }
    snapshot_ids = {str(row["learner_snapshot_id"]) for row in reading_rows}
    snapshots = (
        (
            await connection.execute(
                sa.select(tables.learner_profile_snapshots).where(
                    tables.learner_profile_snapshots.c.learner_snapshot_id.in_(snapshot_ids)
                )
            )
        )
        .mappings()
        .all()
    )
    profile_by_id = {
        str(row["learner_snapshot_id"]): _profile_from_json(dict(row["snapshot"]))
        for row in snapshots
    }
    personalized_ids = {
        parent_material_id(content_id)
        for content_id in content_by_task.values()
        if is_personalized_content(content_id)
    }
    personalized_rows: Sequence[RowMapping] = ()
    if personalized_ids:
        personalized_rows = (
            (
                await connection.execute(
                    sa.select(tables.personalized_training_materials).where(
                        tables.personalized_training_materials.c.learner_id == learner_id,
                        tables.personalized_training_materials.c.material_id.in_(personalized_ids),
                    )
                )
            )
            .mappings()
            .all()
        )
    personalized_by_id = {str(row["material_id"]): row for row in personalized_rows}

    for task_row in reading_rows:
        task_id = str(task_row["task_id"])
        match = _READING_CHOICE.match(first_attempt.get(task_id, ""))
        content_id = content_by_task.get(task_id)
        profile = profile_by_id.get(str(task_row["learner_snapshot_id"]))
        if match is None or content_id is None or profile is None:
            continue
        try:
            if is_personalized_content(content_id):
                material = personalized_by_id.get(parent_material_id(content_id))
                if material is None:
                    continue
                question = personalized_reading_question(material)
            else:
                question = _content_catalog.reading_question_for(content_id, task_id, profile)
        except (DomainError, KeyError, TypeError, ValueError):
            continue
        correct_answer = str(question.get("correct_answer", "")).strip()
        if not correct_answer:
            continue
        selected = match.group(1).strip()
        correct = selected == correct_answer
        tier = str(question.get("difficulty_tier", "standard"))
        if tier not in {"foundation", "standard", "advanced"}:
            tier = "standard"
        question_type = str(question.get("question_type", "main_idea"))
        counts["reading_responses"] += 1
        counts[f"reading_{tier}_responses"] += 1
        counts["reading_correct"] += int(correct)
        counts[f"reading_{tier}_correct"] += int(correct)
        if question_type == "vocabulary_in_context":
            counts["vocabulary_responses"] += 1
            counts["vocabulary_correct"] += int(correct)
        if question_type == "grammar_cloze":
            counts["grammar_question_responses"] += 1
            counts["grammar_question_correct"] += int(correct)
    return counts


async def latest_level_assessment(
    connection: AsyncConnection, learner_id: str
) -> LevelAssessmentOutput | None:
    row = (
        (
            await connection.execute(
                sa.select(tables.learner_level_assessments)
                .where(
                    tables.learner_level_assessments.c.learner_id == learner_id,
                    tables.learner_level_assessments.c.status == "completed",
                )
                .order_by(tables.learner_level_assessments.c.completed_at.desc())
                .limit(1)
            )
        )
        .mappings()
        .first()
    )
    if row is None:
        return None
    return LevelAssessmentOutput.model_validate(
        {
            "overall_level": row["overall_level"],
            "dimensions": row["dimensions"],
            "confidence_band": row["confidence_band"],
            "evidence_count": row["evidence_count"],
            "reason_codes": row["reason_codes"],
        }
    )


async def recent_material_feedback_context(
    connection: AsyncConnection, learner_id: str
) -> dict[str, Any]:
    recent = (
        sa.select(tables.material_feedback_events.c.sentiment)
        .where(tables.material_feedback_events.c.learner_id == learner_id)
        .order_by(tables.material_feedback_events.c.created_at.desc())
        .limit(20)
        .subquery()
    )
    rows = (await connection.execute(sa.select(recent.c.sentiment))).scalars().all()
    helpful = sum(value == "good" for value in rows)
    unhelpful = sum(value == "bad" for value in rows)
    return {
        "helpful": helpful,
        "unhelpful": unhelpful,
        "instruction": (
            "即时反馈只表示材料是否有帮助, 不代表能力高低。"
            "没帮助反馈较多时优先改善目标相关性、语境自然度和可理解性, 不得据此降低能力档位。"
        ),
    }


def generation_level_context(output: LevelAssessmentOutput | None) -> dict[str, Any]:
    if output is None:
        return {
            "overall_level": "developing",
            "dimensions": {},
            "confidence_band": "low",
            "instruction": "证据不足, 使用保守负荷并避免突然增加多个挑战维度。",
        }
    return {
        "overall_level": output.overall_level,
        "dimensions": output.dimensions.model_dump(),
        "confidence_band": output.confidence_band,
        "instruction": (
            "以当前适配水平控制词汇、句法、篇章关系和任务支架; 低置信度时只调整一个挑战维度。"
        ),
    }


def postgresql_insert(table: sa.Table):  # type: ignore[no-untyped-def]
    from sqlalchemy.dialects.postgresql import insert

    return insert(table)
