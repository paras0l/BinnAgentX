"""Isolate raw learning-asset captures from denoised projections.

Revision ID: 0036_asset_projections
Revises: 0035_grammar_knowledge
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0036_asset_projections"
down_revision: str | None = "0035_grammar_knowledge"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learning_asset_content_projections",
        sa.Column("projection_id", sa.String(length=128), primary_key=True),
        sa.Column("asset_id", sa.String(length=128), nullable=False),
        sa.Column("learner_id", sa.String(length=128), nullable=False),
        sa.Column("source_record_id", sa.String(length=128), nullable=False),
        sa.Column("schema_version", sa.String(length=64), nullable=False),
        sa.Column("decision", sa.String(length=16), nullable=False),
        sa.Column(
            "reason_codes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "retained_segment_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["learning_asset_index.asset_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["source_record_id"],
            ["knowledge_source_records.source_record_id"],
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "asset_id",
            "source_record_id",
            "schema_version",
            name="uq_asset_content_projection_source",
        ),
        sa.CheckConstraint(
            "decision IN ('KEEP', 'SPLIT', 'NOOP', 'REVIEW')",
            name="ck_asset_content_projection_decision",
        ),
    )
    op.create_index(
        "ix_asset_content_projection_learner_asset",
        "learning_asset_content_projections",
        ["learner_id", "asset_id", "created_at"],
    )
    # Earlier structured captures already have an immutable source record, but
    # temporarily carried a duplicate raw `capture` in the outbox. Backfill the
    # clean projection first, then remove that duplicate so the two layers are
    # isolated without losing audit history.
    op.execute(
        """
        INSERT INTO learning_asset_content_projections (
            projection_id,
            asset_id,
            learner_id,
            source_record_id,
            schema_version,
            decision,
            reason_codes,
            retained_segment_ids,
            content,
            content_hash,
            created_at
        )
        SELECT
            'asset_projection_backfill_' || md5(
                message.aggregate_id || ':' || source.source_record_id
            ),
            message.aggregate_id,
            asset.learner_id,
            source.source_record_id,
            COALESCE(
                message.payload ->> 'write_gate_version',
                'learning-asset-write-gate-v1'
            ),
            COALESCE(
                message.payload #>> '{write_decision,decision}',
                'REVIEW'
            ),
            COALESCE(
                message.payload #> '{write_decision,reason_codes}',
                '[]'::jsonb
            ),
            COALESCE(
                message.payload #> '{write_decision,retained_segment_ids}',
                '[]'::jsonb
            ),
            message.payload ->> 'initial_content',
            NULL,
            message.occurred_at
        FROM outbox_messages AS message
        JOIN learning_asset_index AS asset
          ON asset.asset_id = message.aggregate_id
        JOIN knowledge_source_records AS source
          ON source.learner_id = asset.learner_id
         AND source.provider = 'learning_asset_capture'
         AND source.source_key = 'asset:' || asset.asset_id
        WHERE message.topic = 'asset_export_requested'
          AND message.payload ? 'capture'
          AND message.payload -> 'capture' IS NOT NULL
        ON CONFLICT (
            asset_id,
            source_record_id,
            schema_version
        ) DO NOTHING
        """
    )
    op.execute(
        """
        UPDATE outbox_messages AS message
        SET payload = (message.payload - 'capture') || jsonb_build_object(
            'capture_source_record_id',
            source.source_record_id
        )
        FROM learning_asset_index AS asset
        JOIN knowledge_source_records AS source
          ON source.learner_id = asset.learner_id
         AND source.provider = 'learning_asset_capture'
         AND source.source_key = 'asset:' || asset.asset_id
        WHERE message.aggregate_id = asset.asset_id
          AND message.topic = 'asset_export_requested'
          AND message.payload ? 'capture'
        """
    )


def downgrade() -> None:
    op.drop_index(
        "ix_asset_content_projection_learner_asset",
        table_name="learning_asset_content_projections",
    )
    op.drop_table("learning_asset_content_projections")
