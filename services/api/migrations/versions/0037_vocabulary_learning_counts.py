"""Track learner-specific dictionary explanation counts.

Revision ID: 0037_vocabulary_counts
Revises: 0036_asset_projections
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0037_vocabulary_counts"
down_revision: str | None = "0036_asset_projections"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learner_vocabulary_states",
        sa.Column("learner_id", sa.String(length=128), primary_key=True),
        sa.Column("dictionary_version", sa.String(length=64), primary_key=True),
        sa.Column("word_sequence", sa.Integer(), primary_key=True),
        sa.Column("headword", sa.String(length=80), nullable=False),
        sa.Column("learning_count", sa.Integer(), nullable=False),
        sa.Column("first_learned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_learned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "word_sequence BETWEEN 1 AND 5530",
            name="ck_vocabulary_state_word_sequence",
        ),
        sa.CheckConstraint(
            "learning_count >= 1",
            name="ck_vocabulary_state_learning_count",
        ),
    )
    op.create_index(
        "ix_learner_vocabulary_state_recent",
        "learner_vocabulary_states",
        ["learner_id", "last_learned_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_learner_vocabulary_state_recent",
        table_name="learner_vocabulary_states",
    )
    op.drop_table("learner_vocabulary_states")
