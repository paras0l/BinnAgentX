from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path


def run(command: list[str], repository_root: Path) -> None:
    subprocess.run(command, cwd=repository_root, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Delete and recreate only the local synthetic development database."
    )
    parser.add_argument(
        "--confirm-delete-synthetic-data",
        action="store_true",
        help="Required acknowledgement that the local Docker volume will be deleted.",
    )
    args = parser.parse_args()
    if not args.confirm_delete_synthetic_data:
        parser.error("pass --confirm-delete-synthetic-data to continue")
    if os.environ.get("BINNAGENT_ENV", "development") == "production":
        raise SystemExit("refusing to reset data when BINNAGENT_ENV=production")

    repository_root = Path(__file__).resolve().parents[1]
    run(["docker", "compose", "down", "--volumes", "--remove-orphans"], repository_root)
    run(["docker", "compose", "up", "-d", "postgres"], repository_root)
    run(
        [
            "uv",
            "run",
            "alembic",
            "-c",
            "services/api/alembic.ini",
            "upgrade",
            "head",
        ],
        repository_root,
    )


if __name__ == "__main__":
    main()
