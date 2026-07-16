from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from binnagent_api.settings import get_settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    database_url = get_settings().database_url.get_secret_value()
    return create_async_engine(database_url, pool_pre_ping=True, pool_recycle=300)


async def dispose_engine() -> None:
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
        get_engine.cache_clear()
