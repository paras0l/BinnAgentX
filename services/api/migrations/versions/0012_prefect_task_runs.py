"""Link content jobs to Prefect task runs.

Revision ID: 0012_prefect_task_runs
Revises: 0011_content_orchestration
Create Date: 2026-07-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012_prefect_task_runs"
down_revision: str | None = "0011_content_orchestration"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "content_generation_jobs",
        sa.Column("prefect_task_run_id", sa.String(length=36), nullable=True),
    )
    op.create_unique_constraint(
        "uq_content_generation_jobs_prefect_task_run",
        "content_generation_jobs",
        ["prefect_task_run_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_content_generation_jobs_prefect_task_run",
        "content_generation_jobs",
        type_="unique",
    )
    op.drop_column("content_generation_jobs", "prefect_task_run_id")
