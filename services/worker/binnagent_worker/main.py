import asyncio
import logging

from binnagent_api.settings import get_settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def check_database_connection() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url.get_secret_value(), pool_pre_ping=True)
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    finally:
        await engine.dispose()


def run() -> None:
    logging.basicConfig(level=get_settings().log_level, format="%(levelname)s %(message)s")
    asyncio.run(check_database_connection())
    logging.getLogger("binnagent.worker").info("worker readiness check completed")
