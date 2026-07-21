"""Keep destructive integration fixtures away from the development database."""

from __future__ import annotations

import asyncio
import os
import re
import subprocess
import sys
from collections.abc import Iterator
from urllib.parse import urlsplit, urlunsplit

import asyncpg  # type: ignore[import-untyped]
import pytest

_DEFAULT_TEST_DATABASE_URL = (
    "postgresql+asyncpg://binnagent:binnagent_dev_only@localhost:5432/binnagent_test"
)
_TEST_DATABASE_URL = os.environ.get("BINNAGENT_TEST_DATABASE_URL", _DEFAULT_TEST_DATABASE_URL)
_DATABASE_NAME = urlsplit(
    _TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
).path[1:]

if not re.fullmatch(r"[A-Za-z0-9_]+_test", _DATABASE_NAME):
    raise RuntimeError("integration_database_name_must_end_with_test")

# Test modules import the application during collection, so select the isolated
# database before any settings or engine singleton can be constructed.
os.environ["BINNAGENT_DATABASE_URL"] = _TEST_DATABASE_URL


def _admin_dsn() -> str:
    parsed = urlsplit(_TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
    return urlunsplit((parsed.scheme, parsed.netloc, "/postgres", parsed.query, parsed.fragment))


async def _create_test_database() -> None:
    connection = await asyncpg.connect(_admin_dsn())
    try:
        exists = await connection.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", _DATABASE_NAME
        )
        if exists is None:
            await connection.execute(f'CREATE DATABASE "{_DATABASE_NAME}"')
    finally:
        await connection.close()


@pytest.fixture(scope="session", autouse=True)
def isolated_integration_database() -> Iterator[None]:
    asyncio.run(_create_test_database())
    subprocess.run(
        [
            sys.executable,
            "-m",
            "alembic",
            "-c",
            "services/api/alembic.ini",
            "upgrade",
            "head",
        ],
        check=True,
        env=os.environ.copy(),
    )
    yield
