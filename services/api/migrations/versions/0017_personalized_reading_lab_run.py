"""Link generated readings to the existing reading-lab run lifecycle.

Revision ID: 0017_personalized_reading_lab
Revises: 0016_personalized_training_queue
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017_personalized_reading_lab"
down_revision: str | None = "0016_personalized_training_queue"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "personalized_training_materials",
        sa.Column("active_workflow_run_id", sa.String(length=128), nullable=True),
    )
    op.create_index(
        "ix_personalized_training_active_run",
        "personalized_training_materials",
        ["active_workflow_run_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_personalized_training_active_run",
        table_name="personalized_training_materials",
    )
    op.drop_column("personalized_training_materials", "active_workflow_run_id")
