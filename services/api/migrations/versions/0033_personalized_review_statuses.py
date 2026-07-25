"""Allow durable personalized-content review states.

Revision ID: 0033_personal_review_status
Revises: 0032_knowledge_lease
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0033_personal_review_status"
down_revision: str | None = "0032_knowledge_lease"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_personalized_material_generation_status",
        "personalized_training_materials",
        type_="check",
    )
    op.create_check_constraint(
        "ck_personalized_material_generation_status",
        "personalized_training_materials",
        "status IN ('requested', 'generating', 'validating', 'awaiting_review', "
        "'ready', 'in_progress', 'completed', 'generation_failed', 'rejected')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_personalized_material_generation_status",
        "personalized_training_materials",
        type_="check",
    )
    op.execute(
        """
        UPDATE personalized_training_materials
        SET status = CASE
            WHEN status = 'rejected' THEN 'generation_failed'
            ELSE 'ready'
        END
        WHERE status IN ('awaiting_review', 'rejected')
        """
    )
    op.create_check_constraint(
        "ck_personalized_material_generation_status",
        "personalized_training_materials",
        "status IN ('requested', 'generating', 'validating', 'ready', "
        "'in_progress', 'completed', 'generation_failed')",
    )
