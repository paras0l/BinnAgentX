"""Add continuous practice run lineage.

Revision ID: 0006_continuous_practice_run
Revises: 0005_model_invocation_audit
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_continuous_practice_run"
down_revision: str | None = "0005_model_invocation_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workflow_runs",
        sa.Column(
            "run_kind",
            sa.String(length=32),
            nullable=False,
            server_default="first_experience",
        ),
    )
    op.add_column(
        "workflow_runs",
        sa.Column("predecessor_run_id", sa.String(length=128), nullable=True),
    )
    op.create_foreign_key(
        "fk_workflow_run_predecessor",
        "workflow_runs",
        "workflow_runs",
        ["predecessor_run_id"],
        ["workflow_run_id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_workflow_run_predecessor",
        "workflow_runs",
        ["predecessor_run_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_workflow_run_predecessor", "workflow_runs", type_="unique")
    op.drop_constraint("fk_workflow_run_predecessor", "workflow_runs", type_="foreignkey")
    op.drop_column("workflow_runs", "predecessor_run_id")
    op.drop_column("workflow_runs", "run_kind")
