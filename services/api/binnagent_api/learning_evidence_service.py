"""Persist immutable learning evidence and refresh asset review projections."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import sqlalchemy as sa
from binnagent_domain.learning import (
    GrammarEvidence,
    GrammarEvidenceKind,
    GrammarFacet,
    GrammarModality,
    LearningEvidence,
    LearningEvidenceType,
    project_grammar_state,
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
    inserted += await _record_grammar_run_evidence(
        connection,
        learner_id=learner_id,
        run=run,
        objective_bundle=material["objective_bundle"],
    )
    return inserted


async def _record_grammar_run_evidence(
    connection: AsyncConnection,
    *,
    learner_id: str,
    run: VerticalSliceRun,
    objective_bundle: object,
) -> int:
    task_refs = {item.task_id: item for item in run.task_refs if item.completed_at is not None}
    task_ids = list(task_refs)
    inserted = 0
    if task_ids:
        challenge_rows = (
            (
                await connection.execute(
                    sa.select(tables.task_grammar_challenges).where(
                        tables.task_grammar_challenges.c.task_id.in_(task_ids)
                    )
                )
            )
            .mappings()
            .all()
        )
        for row in challenge_rows:
            construction_id = row["construction_id"]
            version = row["construction_version"]
            facet = row["tested_facet"]
            task_ref = task_refs[str(row["task_id"])]
            completed_at = task_ref.completed_at
            if construction_id is None or version is None or facet is None or completed_at is None:
                continue
            kind = await _recognition_evidence_kind(
                connection,
                learner_id=learner_id,
                construction_id=str(construction_id),
                construction_version=int(version),
                facet=GrammarFacet(str(facet)),
                context_key=str(row["content_version_id"]),
                observed_at=completed_at,
                resolution_kind=(
                    str(row["resolution_kind"]) if row["resolution_kind"] is not None else None
                ),
                attempt_count=int(row["attempt_count"]),
            )
            if kind is None:
                continue
            inserted += await _insert_grammar_evidence(
                connection,
                evidence=GrammarEvidence(
                    evidence_id=f"grammar_evidence_{uuid4().hex}",
                    learner_id=learner_id,
                    construction_id=str(construction_id),
                    construction_version=int(version),
                    facet=GrammarFacet(str(facet)),
                    modality=GrammarModality.RECEPTIVE,
                    evidence_kind=kind,
                    observed_at=completed_at,
                    context_key=str(row["content_version_id"]),
                    workflow_run_id=run.workflow_run_id,
                    task_id=str(row["task_id"]),
                ),
                detail={
                    "challenge_id": str(row["challenge_id"]),
                    "attempt_count": int(row["attempt_count"]),
                    "hint_revealed": bool(row["hint_revealed"]),
                    "resolution_kind": row["resolution_kind"],
                },
            )

    grammar_targets = _grammar_targets(objective_bundle)
    expression_task_ids = [
        task_ref.task_id
        for task_ref in run.task_refs
        if task_ref.task_type is TaskType.MICRO_EXPRESSION and task_ref.completed_at is not None
    ]
    attempted_expression_task_ids = (
        set(
            await connection.scalars(
                sa.select(tables.attempt_versions.c.task_id)
                .where(tables.attempt_versions.c.task_id.in_(expression_task_ids))
                .distinct()
            )
        )
        if expression_task_ids
        else set()
    )
    for task_ref in run.task_refs:
        if (
            task_ref.task_type is not TaskType.MICRO_EXPRESSION
            or task_ref.completed_at is None
            or task_ref.task_id not in attempted_expression_task_ids
        ):
            continue
        for construction_id, version in grammar_targets:
            inserted += await _insert_grammar_evidence(
                connection,
                evidence=GrammarEvidence(
                    evidence_id=f"grammar_evidence_{uuid4().hex}",
                    learner_id=learner_id,
                    construction_id=construction_id,
                    construction_version=version,
                    facet=GrammarFacet.USE,
                    modality=GrammarModality.PRODUCTIVE,
                    evidence_kind=GrammarEvidenceKind.PRODUCTION_ATTEMPT_UNVERIFIED,
                    observed_at=task_ref.completed_at,
                    context_key=task_ref.content_version_id,
                    workflow_run_id=run.workflow_run_id,
                    task_id=task_ref.task_id,
                ),
                detail={
                    "task_type": task_ref.task_type.value,
                    "highest_hint_level": task_ref.highest_hint_level,
                    "validation_status": "target_use_not_verified",
                },
            )
    return inserted


async def _recognition_evidence_kind(
    connection: AsyncConnection,
    *,
    learner_id: str,
    construction_id: str,
    construction_version: int,
    facet: GrammarFacet,
    context_key: str,
    observed_at: datetime,
    resolution_kind: str | None,
    attempt_count: int,
) -> GrammarEvidenceKind | None:
    if resolution_kind in {"answer_revealed", "legacy_unverified"}:
        return GrammarEvidenceKind.EXPOSURE
    if resolution_kind == "supported_correction":
        return GrammarEvidenceKind.SUPPORTED_RECOGNITION
    if resolution_kind != "independent_correction":
        return GrammarEvidenceKind.ATTEMPT_FAILED if attempt_count else None
    previous = (
        (
            await connection.execute(
                sa.select(
                    tables.grammar_learning_evidence.c.context_key,
                    tables.grammar_learning_evidence.c.observed_at,
                ).where(
                    tables.grammar_learning_evidence.c.learner_id == learner_id,
                    tables.grammar_learning_evidence.c.construction_id == construction_id,
                    tables.grammar_learning_evidence.c.construction_version == construction_version,
                    tables.grammar_learning_evidence.c.facet == facet.value,
                    tables.grammar_learning_evidence.c.modality == GrammarModality.RECEPTIVE.value,
                    tables.grammar_learning_evidence.c.evidence_kind.in_(
                        [
                            GrammarEvidenceKind.INDEPENDENT_RECOGNITION.value,
                            GrammarEvidenceKind.DELAYED_TRANSFER.value,
                        ]
                    ),
                )
            )
        )
        .mappings()
        .all()
    )
    if any(
        str(item["context_key"]) != context_key
        and observed_at - item["observed_at"] >= timedelta(days=7)
        for item in previous
    ):
        return GrammarEvidenceKind.DELAYED_TRANSFER
    return GrammarEvidenceKind.INDEPENDENT_RECOGNITION


async def _insert_grammar_evidence(
    connection: AsyncConnection,
    *,
    evidence: GrammarEvidence,
    detail: dict[str, object],
) -> int:
    result = await connection.execute(
        pg_insert(tables.grammar_learning_evidence)
        .values(
            evidence_id=evidence.evidence_id,
            learner_id=evidence.learner_id,
            construction_id=evidence.construction_id,
            construction_version=evidence.construction_version,
            facet=evidence.facet.value,
            modality=evidence.modality.value,
            evidence_kind=evidence.evidence_kind.value,
            context_key=evidence.context_key,
            workflow_run_id=evidence.workflow_run_id,
            task_id=evidence.task_id,
            observed_at=evidence.observed_at,
            detail=detail,
        )
        .on_conflict_do_nothing(constraint="uq_grammar_evidence_source")
    )
    inserted = int(result.rowcount or 0)
    await refresh_grammar_projection(
        connection,
        learner_id=evidence.learner_id,
        construction_id=evidence.construction_id,
        construction_version=evidence.construction_version,
        facet=evidence.facet,
        modality=evidence.modality,
        now=evidence.observed_at,
    )
    return inserted


async def refresh_grammar_projection(
    connection: AsyncConnection,
    *,
    learner_id: str,
    construction_id: str,
    construction_version: int,
    facet: GrammarFacet,
    modality: GrammarModality,
    now: datetime,
) -> None:
    rows = (
        (
            await connection.execute(
                sa.select(tables.grammar_learning_evidence)
                .where(
                    tables.grammar_learning_evidence.c.learner_id == learner_id,
                    tables.grammar_learning_evidence.c.construction_id == construction_id,
                    tables.grammar_learning_evidence.c.construction_version == construction_version,
                    tables.grammar_learning_evidence.c.facet == facet.value,
                    tables.grammar_learning_evidence.c.modality == modality.value,
                )
                .order_by(
                    tables.grammar_learning_evidence.c.observed_at,
                    tables.grammar_learning_evidence.c.evidence_id,
                )
            )
        )
        .mappings()
        .all()
    )
    if not rows:
        return
    projection = project_grammar_state(
        tuple(
            GrammarEvidence(
                evidence_id=str(row["evidence_id"]),
                learner_id=str(row["learner_id"]),
                construction_id=str(row["construction_id"]),
                construction_version=int(row["construction_version"]),
                facet=GrammarFacet(str(row["facet"])),
                modality=GrammarModality(str(row["modality"])),
                evidence_kind=GrammarEvidenceKind(str(row["evidence_kind"])),
                observed_at=row["observed_at"],
                context_key=str(row["context_key"]),
                workflow_run_id=row["workflow_run_id"],
                task_id=row["task_id"],
            )
            for row in rows
        ),
        now=now,
    )
    await connection.execute(
        pg_insert(tables.learner_grammar_states)
        .values(
            learner_id=projection.learner_id,
            construction_id=projection.construction_id,
            construction_version=projection.construction_version,
            facet=projection.facet.value,
            modality=projection.modality.value,
            status=projection.status.value,
            evidence_count=projection.evidence_count,
            independent_context_count=projection.independent_context_count,
            last_verified_at=projection.last_verified_at,
            next_review_at=projection.next_review_at,
            updated_at=now,
        )
        .on_conflict_do_update(
            index_elements=[
                tables.learner_grammar_states.c.learner_id,
                tables.learner_grammar_states.c.construction_id,
                tables.learner_grammar_states.c.construction_version,
                tables.learner_grammar_states.c.facet,
                tables.learner_grammar_states.c.modality,
            ],
            set_={
                "status": projection.status.value,
                "evidence_count": projection.evidence_count,
                "independent_context_count": projection.independent_context_count,
                "last_verified_at": projection.last_verified_at,
                "next_review_at": projection.next_review_at,
                "updated_at": now,
            },
        )
    )


def _grammar_targets(value: object) -> tuple[tuple[str, int], ...]:
    if not isinstance(value, dict):
        return ()
    raw_targets = value.get("target_grammar_structures")
    if not isinstance(raw_targets, list):
        return ()
    targets: list[tuple[str, int]] = []
    for raw in raw_targets:
        if not isinstance(raw, dict):
            continue
        construction_id = raw.get("construction_id")
        version = raw.get("construction_version")
        if isinstance(construction_id, str) and isinstance(version, int):
            targets.append((construction_id, version))
    return tuple(dict.fromkeys(targets))


async def refresh_asset_projection(
    connection: AsyncConnection,
    *,
    learner_id: str,
    asset_id: str,
    now: datetime,
    increment_version: bool = True,
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
    values: dict[str, object] = {
        "evidence_status": projection.status.value,
        "evidence_count": projection.evidence_count,
        "last_verified_at": projection.last_verified_at,
        "next_review_at": projection.next_review_at,
        "updated_at": now,
    }
    if increment_version:
        values["version"] = tables.learning_asset_index.c.version + 1
    await connection.execute(
        tables.learning_asset_index.update()
        .where(
            tables.learning_asset_index.c.asset_id == asset_id,
            tables.learning_asset_index.c.learner_id == learner_id,
        )
        .values(**values)
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
