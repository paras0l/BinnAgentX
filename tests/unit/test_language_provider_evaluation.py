import json
from pathlib import Path

from binnagent_evaluation import (
    score_language_provider_results,
    validate_language_provider_pack,
)


def test_language_provider_seed_pack_has_valid_offsets_and_contracts() -> None:
    repository_root = Path(__file__).resolve().parents[2]

    assert validate_language_provider_pack(repository_root) == []


def test_language_provider_results_score_status_semantics_offsets_and_latency(
    tmp_path: Path,
) -> None:
    repository_root = Path(__file__).resolve().parents[2]
    results_file = tmp_path / "results.json"
    results_file.write_text(
        json.dumps(
            {
                "provider_id": "combined-fixture",
                "provider_version": "1",
                "cases": [
                    {
                        "case_id": "lexical_bank_river_001",
                        "latency_ms": 2,
                        "status": "resolved",
                        "selected_sense_id": "bank%1:17:01::",
                        "part_of_speech": "noun",
                    },
                    {
                        "case_id": "lexical_bank_finance_001",
                        "latency_ms": 4,
                        "status": "resolved",
                        "selected_sense_id": "bank%1:14:00::",
                        "part_of_speech": "noun",
                    },
                    {
                        "case_id": "lexical_bank_ambiguous_001",
                        "latency_ms": 6,
                        "status": "review_required",
                    },
                    {
                        "case_id": "syntax_concession_001",
                        "latency_ms": 8,
                        "status": "resolved",
                        "structures": [
                            {
                                "start": 0,
                                "end": 29,
                                "text_quote": "Although the office was small",
                                "label": "concession_clause",
                            },
                            {
                                "start": 31,
                                "end": 57,
                                "text_quote": "the team collaborated well",
                                "label": "main_clause",
                            },
                        ],
                    },
                    {
                        "case_id": "syntax_nested_long_sentence_001",
                        "latency_ms": 10,
                        "status": "resolved",
                        "structures": [
                            {
                                "start": 0,
                                "end": 77,
                                "text_quote": (
                                    "Although the proposal, which the committee had revised "
                                    "twice, appeared costly"
                                ),
                                "label": "concession_clause",
                            },
                            {
                                "start": 23,
                                "end": 60,
                                "text_quote": "which the committee had revised twice",
                                "label": "relative_clause",
                            },
                            {
                                "start": 79,
                                "end": 100,
                                "text_quote": "the board approved it",
                                "label": "main_clause",
                            },
                            {
                                "start": 101,
                                "end": 160,
                                "text_quote": (
                                    "because the expected savings outweighed the initial expense"
                                ),
                                "label": "reason_clause",
                            },
                        ],
                    },
                ],
            }
        ),
        encoding="utf-8",
    )

    report = score_language_provider_results(repository_root, results_file)

    assert report.passed_case_count == 5
    assert report.status_match_count == 5
    assert report.semantic_match_count == 5
    assert report.p50_latency_ms == 6
    assert report.p95_latency_ms == 10
    assert report.failures == ()
