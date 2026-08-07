"""Persist learner model billing in CNY at the event-time exchange rate.

Revision ID: 0045_learner_usage_cny
Revises: 0044_learner_model_usage
Create Date: 2026-08-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0045_learner_usage_cny"
down_revision: str | None = "0044_learner_model_usage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_INITIAL_USD_TO_CNY_RATE = "6.7928"


def upgrade() -> None:
    op.add_column(
        "learner_model_usage_events",
        sa.Column("usd_to_cny_rate", sa.Numeric(precision=10, scale=6), nullable=True),
    )
    op.add_column(
        "learner_model_usage_events",
        sa.Column("cost_cny", sa.Numeric(precision=12, scale=6), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE learner_model_usage_events "
            "SET usd_to_cny_rate = CAST(:rate AS NUMERIC), "
            "cost_cny = cost_usd * CAST(:rate AS NUMERIC)"
        ).bindparams(rate=_INITIAL_USD_TO_CNY_RATE)
    )
    op.alter_column("learner_model_usage_events", "usd_to_cny_rate", nullable=False)
    op.alter_column("learner_model_usage_events", "cost_cny", nullable=False)
    op.create_check_constraint(
        "ck_learner_model_usage_positive_exchange_rate",
        "learner_model_usage_events",
        "usd_to_cny_rate > 0",
    )
    op.create_check_constraint(
        "ck_learner_model_usage_non_negative_cny_cost",
        "learner_model_usage_events",
        "cost_cny >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_learner_model_usage_non_negative_cny_cost",
        "learner_model_usage_events",
        type_="check",
    )
    op.drop_constraint(
        "ck_learner_model_usage_positive_exchange_rate",
        "learner_model_usage_events",
        type_="check",
    )
    op.drop_column("learner_model_usage_events", "cost_cny")
    op.drop_column("learner_model_usage_events", "usd_to_cny_rate")
