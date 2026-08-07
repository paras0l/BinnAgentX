"""Link Tool audit records to their invocation key.

Revision ID: 0042_audit_invocation_key
Revises: 0041_tool_usage_ledger
Create Date: 2026-08-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0042_audit_invocation_key"
down_revision: str | None = "0041_tool_usage_ledger"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "audit_events",
        sa.Column("invocation_key", sa.String(length=128), nullable=True),
    )
    op.create_index(
        "ix_audit_events_invocation_key",
        "audit_events",
        ["invocation_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_events_invocation_key", table_name="audit_events")
    op.drop_column("audit_events", "invocation_key")
