"""Link model invocation details to their Tool invocation key.

Revision ID: 0043_model_invocation_key
Revises: 0042_audit_invocation_key
Create Date: 2026-08-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0043_model_invocation_key"
down_revision: str | None = "0042_audit_invocation_key"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "model_invocations",
        sa.Column("invocation_key", sa.String(length=128), nullable=True),
    )
    op.create_index(
        "ix_model_invocations_invocation_key",
        "model_invocations",
        ["invocation_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_model_invocations_invocation_key", table_name="model_invocations")
    op.drop_column("model_invocations", "invocation_key")
