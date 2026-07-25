"""Adapt learner-owned generated readings to the existing reading-lab contract."""

from __future__ import annotations

import json
from collections.abc import Mapping
from hashlib import sha256
from typing import Any

import sqlalchemy as sa
from binnagent_domain.public_errors import PublicErrorCode
from binnagent_domain.vertical_slice.aggregate import LearningTask
from binnagent_domain.vertical_slice.errors import DomainError
from binnagent_domain.vertical_slice.grammar_challenge import GrammarChallenge
from binnagent_domain.vertical_slice.models import (
    DifficultyStatus,
    MaterialRef,
    RightsStatus,
    TextSpan,
)
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.vertical_slice import tables

_CONTENT_PREFIX = "training_material_"
_EXPRESSION_MARKER = "__expression_v1"
_ALLOWED_ANNOTATIONS = [
    "vocabulary",
    "grammar",
    "claim",
    "evidence",
    "logic",
    "uncertain",
    "reusable_expression",
]


def is_personalized_content(content_version_id: str) -> bool:
    return content_version_id.startswith(_CONTENT_PREFIX)


def is_personalized_expression(content_version_id: str) -> bool:
    return _EXPRESSION_MARKER in content_version_id


def parent_material_id(content_version_id: str) -> str:
    if is_personalized_expression(content_version_id):
        return content_version_id.split(_EXPRESSION_MARKER, maxsplit=1)[0]
    return content_version_id


def expression_snapshot_id(content_version_id: str) -> str | None:
    marker = f"{_EXPRESSION_MARKER}__"
    if marker not in content_version_id:
        return None
    snapshot_id = content_version_id.split(marker, maxsplit=1)[1]
    return snapshot_id or None


async def owned_material_row(
    connection: AsyncConnection, learner_id: str, material_id: str
) -> RowMapping | None:
    return (
        (
            await connection.execute(
                sa.select(tables.personalized_training_materials).where(
                    tables.personalized_training_materials.c.material_id == material_id,
                    tables.personalized_training_materials.c.learner_id == learner_id,
                )
            )
        )
        .mappings()
        .one_or_none()
    )


async def material_row_for_task(
    connection: AsyncConnection, task: LearningTask
) -> RowMapping | None:
    content_version_id = task.current_material.content_version_id
    if not is_personalized_content(content_version_id):
        return None
    material_id = parent_material_id(content_version_id)
    row = (
        (
            await connection.execute(
                sa.select(tables.personalized_training_materials)
                .join(
                    tables.workflow_runs,
                    tables.workflow_runs.c.learner_id
                    == tables.personalized_training_materials.c.learner_id,
                )
                .where(
                    tables.personalized_training_materials.c.material_id == material_id,
                    tables.workflow_runs.c.workflow_run_id == task.workflow_run_id,
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None:
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_not_owned_by_task_learner",
        )
    return row


def material_ref(row: RowMapping | Mapping[str, Any]) -> MaterialRef:
    payload = _hash_payload(row)
    return MaterialRef(
        content_id=str(row["material_id"]),
        content_version_id=str(row["material_id"]),
        content_hash=sha256(payload.encode("utf-8")).hexdigest(),
        rights_status=RightsStatus.ELIGIBLE_RELEASE,
        difficulty_status=DifficultyStatus.UNCALIBRATED,
    )


def expression_material_ref(
    row: RowMapping | Mapping[str, Any],
    *,
    snapshot_id: str | None = None,
    expression: Mapping[str, Any] | None = None,
) -> MaterialRef:
    resolved_expression = expression if expression is not None else row["expression_task"]
    if not isinstance(resolved_expression, Mapping):
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_expression_task_missing",
        )
    material_id = str(row["material_id"])
    content_version_id = (
        f"{material_id}{_EXPRESSION_MARKER}__{snapshot_id}"
        if snapshot_id is not None
        else f"{material_id}{_EXPRESSION_MARKER}"
    )
    payload = json.dumps(
        dict(resolved_expression),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return MaterialRef(
        content_id=content_version_id,
        content_version_id=content_version_id,
        content_hash=sha256(payload.encode("utf-8")).hexdigest(),
        rights_status=RightsStatus.ELIGIBLE_RELEASE,
        difficulty_status=DifficultyStatus.UNCALIBRATED,
    )


async def expression_item_for_task(
    connection: AsyncConnection,
    task: LearningTask,
    row: RowMapping | Mapping[str, Any],
) -> dict[str, Any]:
    snapshot_id = expression_snapshot_id(task.current_material.content_version_id)
    if snapshot_id is not None:
        payload = await connection.scalar(
            sa.select(tables.reading_evidence_snapshots.c.payload).where(
                tables.reading_evidence_snapshots.c.snapshot_id == snapshot_id,
                tables.reading_evidence_snapshots.c.workflow_run_id == task.workflow_run_id,
            )
        )
        if isinstance(payload, dict) and isinstance(payload.get("expression_task"), dict):
            return dict(payload["expression_task"])
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_expression_snapshot_missing",
        )
    expression = row["expression_task"]
    if not isinstance(expression, dict):
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_expression_task_missing",
        )
    return dict(expression)


def learner_item(
    row: RowMapping | Mapping[str, Any],
    *,
    content_version_id: str | None = None,
) -> dict[str, Any]:
    if content_version_id is not None and is_personalized_expression(content_version_id):
        expression = row["expression_task"]
        if not isinstance(expression, dict):
            raise DomainError(
                PublicErrorCode.CONTENT_NOT_ELIGIBLE,
                "personalized_expression_task_missing",
            )
        return dict(expression)
    if row["quality_status"] != "semantic_reviewed":
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_semantic_review_required",
        )
    question_bank = row["question_bank"]
    grammar_annotations = row["grammar_annotations"]
    if not isinstance(question_bank, list) or not question_bank:
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_question_bank_missing",
        )
    if not isinstance(grammar_annotations, list) or not grammar_annotations:
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_grammar_annotation_missing",
        )
    material_id = str(row["material_id"])
    paragraphs = [
        {"paragraph_id": f"personalized_p_{index:02d}", "text": str(text)}
        for index, text in enumerate(row["paragraphs"], start=1)
    ]
    return {
        "content_type": "matched_reading",
        "content_version_id": material_id,
        "title": str(row["title"]),
        "paragraphs": paragraphs,
        "allowed_annotations": list(_ALLOWED_ANNOTATIONS),
        "question_bank": question_bank,
        "grammar_challenges": grammar_annotations,
    }


def reading_question(row: RowMapping | Mapping[str, Any]) -> dict[str, Any]:
    question_bank = row["question_bank"]
    if not isinstance(question_bank, list) or not question_bank:
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_question_bank_missing",
        )
    question = question_bank[0]
    if not isinstance(question, dict):
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_question_invalid",
        )
    return dict(question)


def grammar_challenge(row: RowMapping | Mapping[str, Any]) -> GrammarChallenge:
    annotations = row["grammar_annotations"]
    if not isinstance(annotations, list) or not annotations:
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_grammar_annotation_missing",
        )
    annotation = annotations[0]
    if not isinstance(annotation, dict):
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_grammar_annotation_invalid",
        )
    try:
        return GrammarChallenge(
            challenge_id=str(annotation["challenge_id"]),
            paragraph_id=str(annotation["paragraph_id"]),
            correct_text=str(annotation["correct_text"]),
            incorrect_text=str(annotation["incorrect_text"]),
            error_type=str(annotation["error_type"]),
            hint=str(annotation["hint"]),
        )
    except (KeyError, ValueError) as exc:
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_grammar_annotation_invalid",
        ) from exc


def validate_span(row: RowMapping | Mapping[str, Any], span: TextSpan) -> None:
    paragraph = paragraph_text(row, span.paragraph_id)
    if paragraph[span.start : span.end] != span.text_quote:
        raise DomainError(
            PublicErrorCode.SAVE_NOT_CONFIRMED,
            "annotation_span_not_in_assigned_content",
        )


def paragraph_text(row: RowMapping | Mapping[str, Any], paragraph_id: str) -> str:
    for part in learner_item(row)["paragraphs"]:
        if part["paragraph_id"] == paragraph_id:
            return str(part["text"])
    raise DomainError(
        PublicErrorCode.CONTENT_NOT_ELIGIBLE,
        "annotation_paragraph_unavailable",
    )


def approved_hint(row: RowMapping | Mapping[str, Any], hint_level: int) -> str:
    hint = reading_question(row)["hints"].get(f"h{hint_level}")
    if not isinstance(hint, str):
        raise DomainError(PublicErrorCode.CONTENT_NOT_ELIGIBLE, "approved_hint_unavailable")
    return hint


def _hash_payload(row: RowMapping | Mapping[str, Any]) -> str:
    return json.dumps(
        {
            "material_id": str(row["material_id"]),
            "title": str(row["title"]),
            "paragraphs": list(row["paragraphs"]),
            "focus_points": list(row["focus_points"]),
            "objective_bundle": row["objective_bundle"],
            "question_bank": row["question_bank"],
            "grammar_annotations": row["grammar_annotations"],
            "transfer_contract": row["transfer_contract"],
            "expression_task": row["expression_task"],
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
