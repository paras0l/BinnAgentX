"""Read-only G-07 inventory for legacy Agent content and organizer runs."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import binnagent_api.vertical_slice.tables as tables
import sqlalchemy as sa
from binnagent_api.database import dispose_engine, get_engine


async def inventory() -> dict[str, Any]:
    async with get_engine().connect() as connection:
        material_quality = {
            str(status): int(count)
            for status, count in (
                await connection.execute(
                    sa.select(
                        tables.personalized_training_materials.c.quality_status,
                        sa.func.count(),
                    ).group_by(tables.personalized_training_materials.c.quality_status)
                )
            ).all()
        }
        incomplete_packages = int(
            await connection.scalar(
                sa.select(sa.func.count())
                .select_from(tables.personalized_training_materials)
                .where(
                    sa.or_(
                        tables.personalized_training_materials.c.question_bank
                        == sa.cast([], tables.personalized_training_materials.c.question_bank.type),
                        tables.personalized_training_materials.c.grammar_annotations
                        == sa.cast(
                            [],
                            tables.personalized_training_materials.c.grammar_annotations.type,
                        ),
                        tables.personalized_training_materials.c.transfer_contract.is_(None),
                        tables.personalized_training_materials.c.expression_task.is_(None),
                    )
                )
            )
            or 0
        )
        organizer_status = {
            str(status): int(count)
            for status, count in (
                await connection.execute(
                    sa.select(
                        tables.obsidian_organizer_runs.c.knowledge_status,
                        sa.func.count(),
                    ).group_by(tables.obsidian_organizer_runs.c.knowledge_status)
                )
            ).all()
        }
        entity_counts = {}
        for name, table in (
            ("knowledge_source_records", tables.knowledge_source_records),
            ("atomic_knowledge_candidates", tables.atomic_knowledge_candidates),
            ("knowledge_change_proposals", tables.knowledge_change_proposals),
            ("knowledge_relations", tables.knowledge_relations),
            ("reading_evidence_snapshots", tables.reading_evidence_snapshots),
        ):
            entity_counts[name] = int(
                await connection.scalar(sa.select(sa.func.count()).select_from(table)) or 0
            )
    return {
        "material_quality_status": material_quality,
        "personalized_packages_missing_required_components": incomplete_packages,
        "organizer_knowledge_status": organizer_status,
        "new_contract_entity_counts": entity_counts,
        "policy": {
            "unverified_legacy": "retain_for_replay_block_for_new_training",
            "classified_legacy": "retain_archive_history_require_atomic_reprocessing",
        },
    }


async def _main() -> None:
    try:
        print(json.dumps(await inventory(), ensure_ascii=False, indent=2, sort_keys=True))
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(_main())
