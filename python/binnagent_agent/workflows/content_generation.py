from __future__ import annotations

import argparse
import json
import random
import shutil
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any

from binnagent_evaluation.content_integrity import validate_content_pack


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class GenerationOutput:
    manifest_path: Path
    pack_id: str
    pack_version: str
    item_count: int
    errors: list[str]


class ContentGeneratorError(RuntimeError):
    pass


class ContentGenerationWorkflow:
    def __init__(
        self,
        *,
        repository_root: Path | None = None,
        source_manifest: Path | None = None,
        output_directory: Path | None = None,
        pack_version: str = "v1",
        pack_id: str | None = None,
    ) -> None:
        root = repository_root or _project_root()
        self.source_manifest = (
            source_manifest
            if source_manifest is not None
            else root / "fixtures/content/v1/manifest.json"
        )
        self.output_directory = (
            output_directory if output_directory is not None else root / "fixtures/content/v1/generated"
        )
        self.pack_version = pack_version
        self.pack_id = pack_id or f"agent_generated_content_pack_{datetime.now(UTC).strftime('%Y%m%d')}"
        self._root = root

    def run(
        self,
        *,
        seed: int | None = None,
        dry_run: bool = False,
        preserve_existing: bool = False,
    ) -> GenerationOutput:
        random_seed = seed if seed is not None else int(datetime.now(UTC).strftime("%Y%m%d"))
        randomizer = random.Random(random_seed)

        source_manifest = self._read_json(self.source_manifest)
        raw_items = source_manifest.get("items")
        if not isinstance(raw_items, list):
            raise ContentGeneratorError("source manifest missing items")

        grouped_items: dict[str, list[dict[str, Any]]] = {
            "calibration_reading": [],
            "matched_reading": [],
            "micro_expression": [],
        }
        for candidate in raw_items:
            if not isinstance(candidate, dict):
                continue
            content_type = str(candidate.get("content_type", ""))
            if content_type in grouped_items:
                grouped_items[content_type].append(candidate)

        for content_type, items in grouped_items.items():
            if len(items) < 2:
                raise ContentGeneratorError(f"source lacks 2 entries for {content_type}")

        generated_dir = self.output_directory
        generated_dir.mkdir(parents=True, exist_ok=True)
        staging_parent = generated_dir.parent
        staging = Path(tempfile.mkdtemp(prefix="binnagent_content_gen_", dir=staging_parent))

        try:
            generated_manifest_items: list[dict[str, Any]] = []
            generated_item_files: list[tuple[str, dict[str, Any]]] = []
            created_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

            for content_type in ["calibration_reading", "matched_reading", "micro_expression"]:
                source_items = grouped_items[content_type][:2]
                for index, source in enumerate(source_items, start=1):
                    source_entry = source
                    source_path = (
                        self.source_manifest.parent / str(source_entry.get("file", ""))
                    )
                    if not source_path.is_file():
                        raise ContentGeneratorError(
                            f"source item file missing: {source_entry.get('file')}"
                        )
                    item = self._read_json(source_path)

                    variant_item = self._relabel_item(item, content_type, index, randomizer)
                    filename = f"{variant_item['content_version_id']}.json"
                    generated_item_files.append((filename, variant_item))

                    generated_manifest_items.append(
                        {
                            "content_version_id": variant_item["content_version_id"],
                            "content_type": variant_item["content_type"],
                            "file": filename,
                            "content_hash": variant_item["content_hash"],
                            "rights_status": variant_item["rights"]["rights_status"],
                            "difficulty_status": variant_item["difficulty"]["difficulty_status"],
                        }
                    )

            generated_manifest = {
                "schema_version": "1.0.0",
                "pack_id": self.pack_id,
                "pack_version": self.pack_version,
                "purpose": "technical_spike_only",
                "created_at": created_at,
                "items": generated_manifest_items,
            }

            staging_manifest = staging / "manifest.json"
            staging_manifest.write_text(
                json.dumps(generated_manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            for filename, item in generated_item_files:
                (staging / filename).write_text(
                    json.dumps(item, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
                )

            errors = validate_content_pack(self._root, content_directory=staging)
            if errors:
                return GenerationOutput(
                    manifest_path=staging_manifest,
                    pack_id=self.pack_id,
                    pack_version=self.pack_version,
                    item_count=0,
                    errors=errors,
                )

            if not dry_run:
                if not preserve_existing:
                    self._clear_output_directory(generated_dir)
                for path in staging.iterdir():
                    shutil.copy2(path, generated_dir / path.name)
                return GenerationOutput(
                    manifest_path=generated_dir / "manifest.json",
                    pack_id=self.pack_id,
                    pack_version=self.pack_version,
                    item_count=len(generated_item_files),
                    errors=[],
                )
            return GenerationOutput(
                manifest_path=staging_manifest,
                pack_id=self.pack_id,
                pack_version=self.pack_version,
                item_count=len(generated_item_files),
                errors=[],
            )
        finally:
            shutil.rmtree(staging)

    def _clear_output_directory(self, directory: Path) -> None:
        for entry in directory.iterdir():
            if entry.is_dir():
                continue
            entry.unlink()

    def _relabel_item(
        self,
        source_item: dict[str, Any],
        content_type: str,
        ordinal: int,
        randomizer: random.Random,
    ) -> dict[str, Any]:
        item = json.loads(json.dumps(source_item))

        old_version = str(item.get("content_version_id", "generated_unknown_v1"))
        variant_tag = f"gen_{content_type[:3]}_{ordinal:02d}_{randomizer.randint(100, 999)}"
        new_version = f"{old_version}_{variant_tag}"

        item["content_id"] = str(item.get("content_id", old_version)).replace("_", "_")
        item["content_id"] = f"{item['content_id']}_{variant_tag}"
        item["content_version_id"] = new_version
        item["title"] = f"AI-Generated: {item.get('title', new_version)}"

        if content_type in {"calibration_reading", "matched_reading"}:
            item["main_question"] = self._mutate_main_question(
                item.get("main_question", {}),
                randomizer,
            )
            self._normalize_reading_difficulty(item, randomizer)

            raw_challenges = item.get("grammar_challenges")
            if isinstance(raw_challenges, list):
                for idx, raw in enumerate(raw_challenges, start=1):
                    if isinstance(raw, dict):
                        raw["challenge_id"] = f"{new_version}_grammar_{idx:02d}"

            parallel_reconstruction = item.get("parallel_reconstruction")
            if isinstance(parallel_reconstruction, dict):
                parallel_reconstruction["task_id"] = f"{new_version}_parallel"

        if isinstance(item.get("review"), dict):
            item["review"]["reviewed_at"] = datetime.now(UTC).replace(
                microsecond=0
            ).isoformat().replace("+00:00", "Z")

        item_body = self._content_body(item)
        item["content_hash"] = sha256(item_body.encode("utf-8")).hexdigest()
        item["difficulty"]["word_count"] = self._word_count(item_body)
        return item

    def _normalize_reading_difficulty(self, item: dict[str, Any], randomizer: random.Random) -> None:
        difficulty = item.get("difficulty")
        if not isinstance(difficulty, dict):
            return
        difficulty["estimate_source"] = (
            "agent workflow generated: deterministic remix with random seed\n"
        )
        paragraphs = item.get("paragraphs")
        if isinstance(paragraphs, list):
            difficulty["paragraph_count"] = len(paragraphs)

    def _mutate_main_question(
        self,
        question: dict[str, Any],
        randomizer: random.Random,
    ) -> dict[str, Any]:
        prompt_variants = [
            "Which option best captures the central message of this passage?",
            "Choose the most accurate interpretation of the author’s viewpoint.",
            "Which statement best reflects the paragraph argument above?",
        ]
        options = question.get("options", [])
        if not isinstance(options, list) or len(options) < 2:
            return question

        correct_option = question.get("correct_answer")
        normalized_options = [dict(option) for option in options if isinstance(option, dict)]
        correct_text = next(
            (
                option.get("text", "")
                for option in normalized_options
                if option.get("option_id") == correct_option
            ),
            "",
        )
        if not correct_text:
            return question

        randomizer.shuffle(normalized_options)
        for option_id, option in zip(("A", "B", "C", "D", "E"), normalized_options):
            option["option_id"] = option_id
            if option.get("text") == correct_text:
                correct_option = option_id

        mutated = dict(question)
        mutated["prompt"] = randomizer.choice(prompt_variants)
        mutated["options"] = normalized_options
        mutated["correct_answer"] = correct_option
        return mutated

    def _content_body(self, item: dict[str, Any]) -> str:
        paragraphs = item.get("paragraphs")
        if isinstance(paragraphs, list):
            return "\n\n".join(
                str(part["text"])
                for part in paragraphs
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            )
        situation = item.get("situation")
        return situation if isinstance(situation, str) else ""

    @staticmethod
    def _word_count(text: str) -> int:
        return len([token for token in text.split() if token])

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        return json.loads(path.read_text(encoding="utf-8"))


def run_cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate Agent-backed content pack")
    parser.add_argument("--seed", type=int, help="Deterministic seed", default=None)
    parser.add_argument(
        "--pack-id",
        type=str,
        default=None,
        help="Generated pack identifier (optional)",
    )
    parser.add_argument(
        "--pack-version",
        type=str,
        default="v1",
        help="Pack version suffix",
    )
    parser.add_argument(
        "--output-directory",
        type=Path,
        default=None,
        help="Output directory for generated content pack",
    )
    parser.add_argument(
        "--source-manifest",
        type=Path,
        default=None,
        help="Source content manifest path",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run generation and validation without writing output files",
    )
    args = parser.parse_args(argv)

    workflow = ContentGenerationWorkflow(
        source_manifest=args.source_manifest,
        output_directory=args.output_directory,
        pack_version=args.pack_version,
        pack_id=args.pack_id,
    )
    result = workflow.run(seed=args.seed, dry_run=args.dry_run)
    if result.errors:
        print("validation_errors:")
        for error in result.errors:
            print(f" - {error}")
        return 1
    print(f"manifest: {result.manifest_path}")
    print(f"items: {result.item_count}")
    print(f"pack: {result.pack_id}@{result.pack_version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_cli())
