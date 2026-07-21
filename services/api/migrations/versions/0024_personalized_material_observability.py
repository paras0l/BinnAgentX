"""Add an observable timeline for personalized material generation.

Revision ID: 0024_personalized_observability
Revises: 0023_harness_reliability
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0024_personalized_observability"
down_revision: str | None = "0023_harness_reliability"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "personalized_material_events",
        sa.Column("event_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "material_id",
            sa.String(128),
            sa.ForeignKey("personalized_training_materials.material_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("stage", sa.String(64), nullable=False),
        sa.Column("attempt", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "detail",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_personalized_material_events_material_occurred",
        "personalized_material_events",
        ["material_id", "occurred_at"],
    )
    op.execute(
        """
        INSERT INTO personalized_material_events
            (material_id, event_type, stage, attempt, message, detail, occurred_at)
        SELECT
            material_id,
            CASE
                WHEN status = 'generation_failed' THEN 'generation_failed'
                ELSE 'state_imported'
            END,
            status,
            NULLIF(generation_attempt_count, 0),
            CASE
                WHEN status = 'generation_failed' THEN '历史个性化材料生成失败'
                ELSE '迁移时导入现有材料状态'
            END,
            CASE
                WHEN generation_error_code IS NULL THEN '{}'::jsonb
                ELSE jsonb_build_object('error_code', generation_error_code)
            END,
            updated_at
        FROM personalized_training_materials
        """
    )


def downgrade() -> None:
    op.drop_index(
        "ix_personalized_material_events_material_occurred",
        table_name="personalized_material_events",
    )
    op.drop_table("personalized_material_events")
