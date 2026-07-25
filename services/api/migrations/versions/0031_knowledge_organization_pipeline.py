"""Extend Inbox archiving with auditable knowledge organization stages.

Revision ID: 0031_knowledge_organization
Revises: 0030_reading_transfer_evidence
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0031_knowledge_organization"
down_revision: str | None = "0030_reading_transfer_evidence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column(
            "knowledge_status",
            sa.String(40),
            nullable=False,
            server_default="classified_legacy",
        ),
    )
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column(
            "runtime_kind",
            sa.String(32),
            nullable=False,
            server_default="explicit_state_machine",
        ),
    )
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column("graph_thread_id", sa.String(180), nullable=True),
    )
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column("graph_version", sa.String(64), nullable=True),
    )
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column(
            "source_record_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column(
            "candidate_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "obsidian_organizer_runs",
        sa.Column(
            "proposal_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.create_check_constraint(
        "ck_obsidian_organizer_knowledge_status",
        "obsidian_organizer_runs",
        "knowledge_status IN ("
        "'source_capture_required', 'extracting', 'matching', 'awaiting_review', "
        "'committing', 'validation_scheduled', 'classified_legacy', 'needs_more_context', "
        "'rejected', 'failed')",
    )
    op.create_check_constraint(
        "ck_obsidian_organizer_runtime_kind",
        "obsidian_organizer_runs",
        "runtime_kind IN ('explicit_state_machine', 'langgraph')",
    )

    op.create_table(
        "knowledge_source_records",
        sa.Column("source_record_id", sa.String(128), primary_key=True),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("provider", sa.String(80), nullable=False),
        sa.Column("connection_id", sa.String(128), nullable=False),
        sa.Column("source_key", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("source_modified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("authorized_scope", postgresql.JSONB(), nullable=False),
        sa.Column("captured_content_ref", sa.String(500), nullable=False),
        sa.Column("supersedes_source_record_id", sa.String(128), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "learner_id",
            "connection_id",
            "source_key",
            "content_hash",
            name="uq_knowledge_source_version",
        ),
    )
    op.create_index(
        "ix_knowledge_source_lookup",
        "knowledge_source_records",
        ["learner_id", "source_key", "captured_at"],
    )
    op.create_table(
        "knowledge_source_payloads",
        sa.Column("source_record_id", sa.String(128), primary_key=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "atomic_knowledge_candidates",
        sa.Column("candidate_id", sa.String(128), primary_key=True),
        sa.Column("source_record_id", sa.String(128), nullable=False),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("knowledge_kind", sa.String(48), nullable=False),
        sa.Column("canonical_key", sa.String(300), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("claim", sa.Text(), nullable=False),
        sa.Column("source_spans", postgresql.JSONB(), nullable=False),
        sa.Column("examples", postgresql.JSONB(), nullable=False),
        sa.Column("conditions", postgresql.JSONB(), nullable=False),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=False),
        sa.Column("validation_status", sa.String(32), nullable=False),
        sa.Column("extractor_version", sa.String(80), nullable=False),
        sa.Column("idempotency_key", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_atomic_candidate_canonical",
        "atomic_knowledge_candidates",
        ["learner_id", "canonical_key"],
    )
    op.create_table(
        "knowledge_change_proposals",
        sa.Column("proposal_id", sa.String(128), primary_key=True),
        sa.Column("run_id", sa.String(128), nullable=False),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("candidate_id", sa.String(128), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("existing_asset_matches", postgresql.JSONB(), nullable=False),
        sa.Column("field_changes", postgresql.JSONB(), nullable=False),
        sa.Column("source_spans", postgresql.JSONB(), nullable=False),
        sa.Column("conflicts", postgresql.JSONB(), nullable=False),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=False),
        sa.Column("requires_human_review", sa.Boolean(), nullable=False),
        sa.Column("destination", sa.String(32), nullable=False),
        sa.Column("idempotency_key", sa.String(180), nullable=False, unique=True),
        sa.Column("expected_asset_version", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("reviewer_id", sa.String(128), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("committed_asset_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_knowledge_proposal_review_queue",
        "knowledge_change_proposals",
        ["learner_id", "status", "created_at"],
    )
    op.create_table(
        "knowledge_relations",
        sa.Column("relation_id", sa.String(128), primary_key=True),
        sa.Column("learner_id", sa.String(128), nullable=False),
        sa.Column("relation_type", sa.String(48), nullable=False),
        sa.Column("from_entity_id", sa.String(128), nullable=False),
        sa.Column("from_version", sa.Integer(), nullable=False),
        sa.Column("to_entity_id", sa.String(128), nullable=False),
        sa.Column("to_version", sa.Integer(), nullable=False),
        sa.Column("source_spans", postgresql.JSONB(), nullable=False),
        sa.Column("supersedes_relation_id", sa.String(128), nullable=True),
        sa.Column("idempotency_key", sa.String(180), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("knowledge_relations")
    op.drop_index(
        "ix_knowledge_proposal_review_queue",
        table_name="knowledge_change_proposals",
    )
    op.drop_table("knowledge_change_proposals")
    op.drop_index(
        "ix_atomic_candidate_canonical",
        table_name="atomic_knowledge_candidates",
    )
    op.drop_table("atomic_knowledge_candidates")
    op.drop_table("knowledge_source_payloads")
    op.drop_index(
        "ix_knowledge_source_lookup",
        table_name="knowledge_source_records",
    )
    op.drop_table("knowledge_source_records")
    op.drop_constraint(
        "ck_obsidian_organizer_runtime_kind",
        "obsidian_organizer_runs",
        type_="check",
    )
    op.drop_constraint(
        "ck_obsidian_organizer_knowledge_status",
        "obsidian_organizer_runs",
        type_="check",
    )
    op.drop_column("obsidian_organizer_runs", "proposal_ids")
    op.drop_column("obsidian_organizer_runs", "candidate_ids")
    op.drop_column("obsidian_organizer_runs", "source_record_ids")
    op.drop_column("obsidian_organizer_runs", "graph_version")
    op.drop_column("obsidian_organizer_runs", "graph_thread_id")
    op.drop_column("obsidian_organizer_runs", "runtime_kind")
    op.drop_column("obsidian_organizer_runs", "knowledge_status")
