"""Per-learner model usage projection built from successful provider responses."""

from __future__ import annotations

import json
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar, Token
from datetime import UTC, datetime
from decimal import Decimal
from math import ceil
from uuid import uuid4

import sqlalchemy as sa
from binnagent_domain.model_errors import LearnerBalanceInsufficientError
from pydantic import BaseModel

from binnagent_api.database import get_engine
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

_learner_id_context: ContextVar[str | None] = ContextVar("binnagent_learner_usage_id", default=None)


class LearnerUsageView(BaseModel):
    learner_id: str
    token_limit: int
    input_tokens: int
    output_tokens: int
    used_tokens: int
    remaining_tokens: int
    remaining_percent: float
    cost_cny: Decimal
    reset_at: datetime | None


def set_learner_usage_context(learner_id: str) -> Token[str | None]:
    return _learner_id_context.set(learner_id)


def reset_learner_usage_context(token: Token[str | None]) -> None:
    _learner_id_context.reset(token)


@contextmanager
def learner_usage_scope(learner_id: str) -> Iterator[None]:
    token = set_learner_usage_context(learner_id)
    try:
        yield
    finally:
        reset_learner_usage_context(token)


def _estimated_tokens(value: object) -> int:
    serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return max(1, ceil(len(serialized.encode("utf-8")) / 4))


def provider_token_usage(
    response_payload: object, *, request_payload: object, output: str
) -> tuple[int, int, str]:
    if isinstance(response_payload, dict):
        usage = response_payload.get("usage")
        if isinstance(usage, dict):
            input_tokens = usage.get("prompt_tokens", usage.get("input_tokens"))
            output_tokens = usage.get("completion_tokens", usage.get("output_tokens"))
            if isinstance(input_tokens, int) and isinstance(output_tokens, int):
                return max(0, input_tokens), max(0, output_tokens), "provider"
        input_tokens = response_payload.get("prompt_eval_count")
        output_tokens = response_payload.get("eval_count")
        if isinstance(input_tokens, int) and isinstance(output_tokens, int):
            return max(0, input_tokens), max(0, output_tokens), "provider"
    return (
        _estimated_tokens(request_payload),
        _estimated_tokens(output),
        "estimated",
    )


async def record_model_usage(
    *,
    provider: str,
    model: str,
    operation: str,
    input_tokens: int,
    output_tokens: int,
    cost_usd: Decimal,
    counting_method: str,
) -> None:
    learner_id = _learner_id_context.get()
    if learner_id is None:
        return
    now = datetime.now(UTC)
    usd_to_cny_rate = get_settings().learner_usage_usd_to_cny_rate
    normalized_cost_usd = max(Decimal("0"), cost_usd)
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.learner_model_usage_events.insert().values(
                event_id=f"usage_{uuid4().hex}",
                learner_id=learner_id,
                provider=provider,
                model=model,
                operation=operation,
                input_tokens=max(0, input_tokens),
                output_tokens=max(0, output_tokens),
                total_tokens=max(0, input_tokens) + max(0, output_tokens),
                cost_usd=normalized_cost_usd,
                usd_to_cny_rate=usd_to_cny_rate,
                cost_cny=normalized_cost_usd * usd_to_cny_rate,
                counting_method=counting_method,
                occurred_at=now,
            )
        )


async def ensure_model_usage_available() -> None:
    """Reject a learner's next provider call once the current allowance is exhausted."""

    learner_id = _learner_id_context.get()
    if learner_id is None:
        return
    usage = await learner_usage(learner_id)
    if usage.used_tokens >= usage.token_limit:
        raise LearnerBalanceInsufficientError(
            learner_id=learner_id,
            token_limit=usage.token_limit,
            used_tokens=usage.used_tokens,
        )


async def learner_usage(learner_id: str) -> LearnerUsageView:
    async with get_engine().connect() as connection:
        reset_at = await connection.scalar(
            sa.select(sa.func.max(tables.learner_usage_resets.c.reset_at)).where(
                tables.learner_usage_resets.c.learner_id == learner_id
            )
        )
        filters = [tables.learner_model_usage_events.c.learner_id == learner_id]
        if reset_at is not None:
            filters.append(tables.learner_model_usage_events.c.occurred_at >= reset_at)
        row = (
            (
                await connection.execute(
                    sa.select(
                        sa.func.coalesce(
                            sa.func.sum(tables.learner_model_usage_events.c.input_tokens), 0
                        ).label("input_tokens"),
                        sa.func.coalesce(
                            sa.func.sum(tables.learner_model_usage_events.c.output_tokens), 0
                        ).label("output_tokens"),
                        sa.func.coalesce(
                            sa.func.sum(tables.learner_model_usage_events.c.total_tokens), 0
                        ).label("used_tokens"),
                        sa.func.coalesce(
                            sa.func.sum(tables.learner_model_usage_events.c.cost_cny), 0
                        ).label("cost_cny"),
                    ).where(*filters)
                )
            )
            .mappings()
            .one()
        )
    token_limit = get_settings().learner_usage_token_limit
    used_tokens = int(row["used_tokens"])
    remaining_tokens = max(0, token_limit - used_tokens)
    return LearnerUsageView(
        learner_id=learner_id,
        token_limit=token_limit,
        input_tokens=int(row["input_tokens"]),
        output_tokens=int(row["output_tokens"]),
        used_tokens=used_tokens,
        remaining_tokens=remaining_tokens,
        remaining_percent=round(remaining_tokens / token_limit * 100, 1),
        cost_cny=Decimal(str(row["cost_cny"])),
        reset_at=reset_at,
    )


def usage_summary_subquery() -> sa.Subquery:
    latest_reset = (
        sa.select(
            tables.learner_usage_resets.c.learner_id.label("reset_learner_id"),
            sa.func.max(tables.learner_usage_resets.c.reset_at).label("reset_at"),
        )
        .group_by(tables.learner_usage_resets.c.learner_id)
        .subquery()
    )
    return (
        sa.select(
            tables.learners.c.learner_id.label("usage_learner_id"),
            latest_reset.c.reset_at,
            sa.func.coalesce(
                sa.func.sum(tables.learner_model_usage_events.c.total_tokens), 0
            ).label("used_tokens"),
            sa.func.coalesce(sa.func.sum(tables.learner_model_usage_events.c.cost_cny), 0).label(
                "usage_cost_cny"
            ),
        )
        .select_from(
            tables.learners.outerjoin(
                latest_reset,
                latest_reset.c.reset_learner_id == tables.learners.c.learner_id,
            ).outerjoin(
                tables.learner_model_usage_events,
                sa.and_(
                    tables.learner_model_usage_events.c.learner_id == tables.learners.c.learner_id,
                    sa.or_(
                        latest_reset.c.reset_at.is_(None),
                        tables.learner_model_usage_events.c.occurred_at >= latest_reset.c.reset_at,
                    ),
                ),
            )
        )
        .group_by(tables.learners.c.learner_id, latest_reset.c.reset_at)
        .subquery()
    )


async def reset_usage_periods(*, learner_ids: list[str], role: str) -> datetime:
    reset_at = datetime.now(UTC)
    async with get_engine().begin() as connection:
        if learner_ids:
            await connection.execute(
                tables.learner_usage_resets.insert(),
                [
                    {
                        "reset_id": f"usage_reset_{uuid4().hex}",
                        "learner_id": learner_id,
                        "reset_by_role": role,
                        "reset_at": reset_at,
                    }
                    for learner_id in learner_ids
                ],
            )
    return reset_at
