"""Add persistent task grammar challenges.

Revision ID: 0009_grammar_challenge
Revises: 0008_experience_codes
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_grammar_challenge"
down_revision: str | None = "0008_experience_codes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task_grammar_challenges",
        sa.Column("task_id", sa.String(length=128), primary_key=True),
        sa.Column("content_version_id", sa.String(length=128), nullable=False),
        sa.Column("challenge_id", sa.String(length=128), nullable=False),
        sa.Column("hint_revealed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_submission_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["learning_tasks.task_id"],
            name="fk_task_grammar_challenges_task",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "attempt_count >= 0",
            name="ck_task_grammar_challenges_attempt_count",
        ),
    )


def downgrade() -> None:
    op.drop_table("task_grammar_challenges")
