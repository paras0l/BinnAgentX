# ruff: noqa: RUF001

"""Adapt learner-owned generated readings to the existing reading-lab contract."""

from __future__ import annotations

import json
import re
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
                    tables.personalized_training_materials.c.material_id == content_version_id,
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


def material_ref(row: RowMapping) -> MaterialRef:
    payload = _hash_payload(row)
    return MaterialRef(
        content_id=str(row["material_id"]),
        content_version_id=str(row["material_id"]),
        content_hash=sha256(payload.encode("utf-8")).hexdigest(),
        rights_status=RightsStatus.ELIGIBLE_RELEASE,
        difficulty_status=DifficultyStatus.UNCALIBRATED,
    )


def learner_item(row: RowMapping) -> dict[str, Any]:
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
        "question_bank": [reading_question(row)],
        "grammar_challenges": [grammar_challenge(row).__dict__],
    }


def reading_question(row: RowMapping) -> dict[str, Any]:
    title = str(row["title"])
    focus_points = [str(value) for value in row["focus_points"]]
    focus = "、".join(focus_points[:2]) if focus_points else "文章的核心论证"
    return {
        "question_id": f"{row['material_id']}_main_idea",
        "question_type": "main_idea",
        "difficulty_tier": "standard",
        "prompt": "Which statement best captures the central purpose of the passage?",
        "options": [
            {
                "option_id": "option_a",
                "text": (
                    f'It develops the central idea of "{title}" by applying familiar knowledge '
                    "in a new context."
                ),
            },
            {
                "option_id": "option_b",
                "text": "It mainly lists unrelated facts without drawing a broader conclusion.",
            },
            {
                "option_id": "option_c",
                "text": "It argues that remembering isolated rules is always enough for transfer.",
            },
            {
                "option_id": "option_d",
                "text": "It focuses only on the writer's personal schedule and study environment.",
            },
        ],
        "answer_option_id": "option_a",
        "hints": {
            "h1": "先用一句话概括每段作用，再判断哪一项能覆盖全文而不是局部细节。",
            "h2": f"重点比较标题与这些迁移线索：{focus}。",
            "h3": "排除把文章说成事实罗列、孤立记忆或个人日程的选项。",
            "h4": "正确方向应同时包含文章主题和‘把已有知识放入新语境检验’这一动作。",
        },
    }


def grammar_challenge(row: RowMapping) -> GrammarChallenge:
    paragraphs = [str(value) for value in row["paragraphs"]]
    paragraph_id = "personalized_p_01"
    correct_text = ""
    for paragraph_index, paragraph in enumerate(paragraphs, start=1):
        words = re.findall(r"[A-Za-z]{4,16}", paragraph)
        candidate = next((word for word in words if paragraph.count(word) == 1), None)
        if candidate is not None:
            paragraph_id = f"personalized_p_{paragraph_index:02d}"
            correct_text = candidate
            break
    if not correct_text:
        raise DomainError(
            PublicErrorCode.CONTENT_NOT_ELIGIBLE,
            "personalized_reading_grammar_candidate_missing",
        )
    incorrect_text = correct_text[1] + correct_text[0] + correct_text[2:]
    if incorrect_text == correct_text:
        incorrect_text = correct_text[:-2] + correct_text[-1] + correct_text[-2]
    return GrammarChallenge(
        challenge_id=f"{row['material_id']}_grammar",
        paragraph_id=paragraph_id,
        correct_text=correct_text,
        incorrect_text=incorrect_text,
        error_type="词形与拼写辨认",
        hint="结合上下文与词形结构，恢复被调换字母的原词。",
    )


def validate_span(row: RowMapping, span: TextSpan) -> None:
    paragraph = paragraph_text(row, span.paragraph_id)
    if paragraph[span.start : span.end] != span.text_quote:
        raise DomainError(
            PublicErrorCode.SAVE_NOT_CONFIRMED,
            "annotation_span_not_in_assigned_content",
        )


def paragraph_text(row: RowMapping, paragraph_id: str) -> str:
    for part in learner_item(row)["paragraphs"]:
        if part["paragraph_id"] == paragraph_id:
            return str(part["text"])
    raise DomainError(
        PublicErrorCode.CONTENT_NOT_ELIGIBLE,
        "annotation_paragraph_unavailable",
    )


def approved_hint(row: RowMapping, hint_level: int) -> str:
    hint = reading_question(row)["hints"].get(f"h{hint_level}")
    if not isinstance(hint, str):
        raise DomainError(PublicErrorCode.CONTENT_NOT_ELIGIBLE, "approved_hint_unavailable")
    return hint


def _hash_payload(row: RowMapping) -> str:
    return json.dumps(
        {
            "material_id": str(row["material_id"]),
            "title": str(row["title"]),
            "paragraphs": list(row["paragraphs"]),
            "focus_points": list(row["focus_points"]),
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
