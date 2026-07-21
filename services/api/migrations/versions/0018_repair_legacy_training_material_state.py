"""Repair queue states created before readings used standard workflow runs.

Revision ID: 0018_repair_legacy_materials
Revises: 0017_personalized_reading_lab
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018_repair_legacy_materials"
down_revision: str | None = "0017_personalized_reading_lab"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE personalized_training_materials
            SET status = 'ready',
                started_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'in_progress'
              AND active_workflow_run_id IS NULL
            """
        )
    )


def downgrade() -> None:
    # The old state did not identify a real workflow run, so restoring it would
    # recreate misleading queue data.
    pass
