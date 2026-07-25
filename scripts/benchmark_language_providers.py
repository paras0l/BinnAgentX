"""Validate or score normalized offline lexical/syntax Provider results."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from binnagent_evaluation import (
    score_language_provider_results,
    validate_language_provider_pack,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Validate the language Provider benchmark seed, or score a normalized "
            "offline result file. This command does not download models."
        )
    )
    parser.add_argument(
        "--results",
        type=Path,
        help="JSON matching language-provider-result.schema.json",
    )
    args = parser.parse_args()

    repository_root = Path(__file__).resolve().parents[1]
    if args.results is None:
        errors = validate_language_provider_pack(repository_root)
        payload = {
            "status": "ready_for_offline_provider_runs" if not errors else "invalid",
            "gold_status": "engineering_seed_pending_expert_freeze",
            "errors": errors,
            "limitations": [
                "No Provider or model was downloaded or selected.",
                "Engineering seeds are not expert accuracy thresholds.",
                "Chinese teaching explanations and learning outcomes are out of scope.",
            ],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0 if not errors else 1

    report = score_language_provider_results(
        repository_root,
        args.results.resolve(),
    )
    print(json.dumps(report.model_dump(mode="json"), ensure_ascii=False, indent=2))
    return 0 if not report.failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
