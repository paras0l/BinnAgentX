"""Add resettable per-learner model token usage.

Revision ID: 0044_learner_model_usage
Revises: 0043_model_invocation_key
Create Date: 2026-08-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0044_learner_model_usage"
down_revision: str | None = "0043_model_invocation_key"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learner_model_usage_events",
        sa.Column("event_id", sa.String(length=128), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=160), nullable=False),
        sa.Column("operation", sa.String(length=160), nullable=False),
        sa.Column("input_tokens", sa.BigInteger(), nullable=False),
        sa.Column("output_tokens", sa.BigInteger(), nullable=False),
        sa.Column("total_tokens", sa.BigInteger(), nullable=False),
        sa.Column("cost_usd", sa.Numeric(precision=12, scale=6), nullable=False),
        sa.Column("counting_method", sa.String(length=32), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "input_tokens >= 0 AND output_tokens >= 0 AND total_tokens >= 0",
            name="ck_learner_model_usage_non_negative_tokens",
        ),
        sa.CheckConstraint(
            "cost_usd >= 0",
            name="ck_learner_model_usage_non_negative_cost",
        ),
    )
    op.create_index(
        "ix_learner_model_usage_learner_occurred",
        "learner_model_usage_events",
        ["learner_id", "occurred_at"],
    )
    op.create_table(
        "learner_usage_resets",
        sa.Column("reset_id", sa.String(length=128), primary_key=True),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("reset_by_role", sa.String(length=64), nullable=False),
        sa.Column("reset_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_learner_usage_resets_learner_reset_at",
        "learner_usage_resets",
        ["learner_id", "reset_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_learner_usage_resets_learner_reset_at",
        table_name="learner_usage_resets",
    )
    op.drop_table("learner_usage_resets")
    op.drop_index(
        "ix_learner_model_usage_learner_occurred",
        table_name="learner_model_usage_events",
    )
    op.drop_table("learner_model_usage_events")
