"""Allow learner-imported articles to enter the personalized training pipeline.

Revision ID: 0038_imported_articles
Revises: 0037_vocabulary_counts
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0038_imported_articles"
down_revision: str | None = "0037_vocabulary_counts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "personalized_training_materials",
        sa.Column(
            "source_kind",
            sa.String(length=32),
            nullable=False,
            server_default="agent_generated",
        ),
    )
    op.create_check_constraint(
        "ck_personalized_training_material_source_kind",
        "personalized_training_materials",
        "source_kind IN ('agent_generated', 'imported')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_personalized_training_material_source_kind",
        "personalized_training_materials",
        type_="check",
    )
    op.drop_column("personalized_training_materials", "source_kind")
