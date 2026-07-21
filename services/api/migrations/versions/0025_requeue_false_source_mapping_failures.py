"""Requeue materials rejected only by the obsolete title-matching gate.

Revision ID: 0025_requeue_false_failures
Revises: 0024_personalized_observability
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0025_requeue_false_failures"
down_revision: str | None = "0024_personalized_observability"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO personalized_material_events
            (material_id, event_type, stage, attempt, message, detail, occurred_at)
        SELECT
            material_id,
            'obsolete_failure_requeued',
            'requested',
            NULL,
            '旧版来源标题匹配误判已修复, 任务自动重新排队',
            jsonb_build_object('previous_error_code', generation_error_code),
            now()
        FROM personalized_training_materials
        WHERE status = 'generation_failed'
          AND generation_error_code LIKE '%personalized_evidence_targets_missing%'
        """
    )
    op.execute(
        """
        UPDATE personalized_training_materials
        SET status = 'requested',
            generation_attempt_count = 0,
            generation_error_code = NULL,
            next_generation_attempt_at = now(),
            claimed_by = NULL,
            lease_expires_at = NULL,
            updated_at = now()
        WHERE status = 'generation_failed'
          AND generation_error_code LIKE '%personalized_evidence_targets_missing%'
        """
    )


def downgrade() -> None:
    # This is an idempotent data repair. A repaired job may already have generated
    # successfully, so restoring the obsolete failure would corrupt valid state.
    pass
