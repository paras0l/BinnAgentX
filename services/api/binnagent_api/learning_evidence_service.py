"""Persist immutable learning evidence and refresh asset review projections."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import sqlalchemy as sa
from binnagent_domain.learning import (
    LearningEvidence,
    LearningEvidenceType,
    project_learning_state,
)
from binnagent_domain.vertical_slice.models import TaskType
from binnagent_domain.vertical_slice.run import VerticalSliceRun
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables


async def record_personalized_run_evidence(
    connection: AsyncConnection,
    *,
    learner_id: str,
    run: VerticalSliceRun,
) -> int:
    material = (
        (
            await connection.execute(
                sa.select(tables.personalized_training_materials).where(
                    tables.personalized_training_materials.c.active_workflow_run_id
                    == run.workflow_run_id
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if material is None:
        return 0
    requested_asset_ids = [str(item) for item in material["evidence_target_asset_ids"]]
    if not requested_asset_ids:
        return 0
    asset_ids = list(
        (
            await connection.scalars(
                sa.select(tables.learning_asset_index.c.asset_id)
                .where(
                    tables.learning_asset_index.c.learner_id == learner_id,
                    tables.learning_asset_index.c.asset_id.in_(requested_asset_ids),
                )
                .distinct()
            )
        ).all()
    )
    inserted = 0
    for task_ref in run.task_refs:
        if (
            task_ref.task_type is not TaskType.MATCHED_READING
            or task_ref.completed_at is None
            or task_ref.highest_hint_level is None
        ):
            continue
        base_evidence_type = _evidence_type(task_ref.task_type, task_ref.highest_hint_level)
        for asset_id in asset_ids:
            evidence_type = base_evidence_type
            current_last_verified = await connection.scalar(
                sa.select(tables.learning_asset_index.c.last_verified_at).where(
                    tables.learning_asset_index.c.asset_id == asset_id,
                    tables.learning_asset_index.c.learner_id == learner_id,
                )
            )
            if (
                evidence_type
                in {
                    LearningEvidenceType.INDEPENDENT_COMPREHENSION,
                    LearningEvidenceType.INDEPENDENT_OUTPUT,
                }
                and current_last_verified is not None
                and task_ref.completed_at - current_last_verified >= timedelta(days=7)
            ):
                evidence_type = LearningEvidenceType.DELAYED_TRANSFER
            result = await connection.execute(
                pg_insert(tables.learning_evidence)
                .values(
                    evidence_id=f"evidence_{uuid4().hex}",
                    learner_id=learner_id,
                    asset_id=asset_id,
                    evidence_type=evidence_type.value,
                    workflow_run_id=run.workflow_run_id,
                    task_id=task_ref.task_id,
                    source_version=task_ref.completed_task_version,
                    observed_at=task_ref.completed_at,
                    detail={
                        "task_type": task_ref.task_type.value,
                        "highest_hint_level": task_ref.highest_hint_level,
                        "content_version_id": task_ref.content_version_id,
                    },
                )
                .on_conflict_do_nothing(
                    constraint="uq_learning_evidence_source",
                )
            )
            inserted += int(result.rowcount or 0)
    for asset_id in asset_ids:
        await refresh_asset_projection(
            connection,
            learner_id=learner_id,
            asset_id=str(asset_id),
            now=run.updated_at,
        )
    return inserted


async def refresh_asset_projection(
    connection: AsyncConnection,
    *,
    learner_id: str,
    asset_id: str,
    now: datetime,
) -> None:
    rows = (
        (
            await connection.execute(
                sa.select(tables.learning_evidence)
                .where(
                    tables.learning_evidence.c.learner_id == learner_id,
                    tables.learning_evidence.c.asset_id == asset_id,
                )
                .order_by(tables.learning_evidence.c.observed_at)
            )
        )
        .mappings()
        .all()
    )
    projection = project_learning_state(
        tuple(
            LearningEvidence(
                evidence_id=str(row["evidence_id"]),
                evidence_type=LearningEvidenceType(str(row["evidence_type"])),
                observed_at=row["observed_at"],
                workflow_run_id=row["workflow_run_id"],
                task_id=row["task_id"],
                source_version=row["source_version"],
            )
            for row in rows
        ),
        now=now,
    )
    await connection.execute(
        tables.learning_asset_index.update()
        .where(
            tables.learning_asset_index.c.asset_id == asset_id,
            tables.learning_asset_index.c.learner_id == learner_id,
        )
        .values(
            evidence_status=projection.status.value,
            evidence_count=projection.evidence_count,
            last_verified_at=projection.last_verified_at,
            next_review_at=projection.next_review_at,
            updated_at=now,
            version=tables.learning_asset_index.c.version + 1,
        )
    )


def _evidence_type(task_type: TaskType, highest_hint_level: int) -> LearningEvidenceType:
    if task_type is TaskType.MICRO_EXPRESSION:
        return (
            LearningEvidenceType.INDEPENDENT_OUTPUT
            if highest_hint_level == 0
            else LearningEvidenceType.SUPPORTED_OUTPUT
        )
    return (
        LearningEvidenceType.INDEPENDENT_COMPREHENSION
        if highest_hint_level == 0
        else LearningEvidenceType.SUPPORTED_COMPREHENSION
    )
