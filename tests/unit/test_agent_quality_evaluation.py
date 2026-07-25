from pathlib import Path

from binnagent_evaluation import validate_agent_quality_pack


def test_agent_quality_seed_pack_matches_frozen_contract() -> None:
    repository_root = Path(__file__).resolve().parents[2]

    assert validate_agent_quality_pack(repository_root) == []
