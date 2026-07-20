from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager, suppress
from dataclasses import dataclass
from threading import Lock
from typing import Any


@dataclass(frozen=True, slots=True)
class LangfuseConfiguration:
    enabled: bool
    public_key: str | None
    secret_key: str | None
    base_url: str
    environment: str


_configuration = LangfuseConfiguration(False, None, None, "http://localhost:3100", "development")
_client: Any = None
_lock = Lock()


def configure_langfuse(configuration: LangfuseConfiguration) -> None:
    global _client, _configuration
    with _lock:
        if configuration == _configuration:
            return
        if _client is not None:
            with suppress(Exception):
                _client.shutdown()
        _client = None
        _configuration = configuration


def langfuse_configured() -> bool:
    return bool(_configuration.enabled and _configuration.public_key and _configuration.secret_key)


def _get_client() -> Any:
    global _client
    if not langfuse_configured():
        return None
    with _lock:
        if _client is not None:
            return _client
        try:
            from langfuse import Langfuse

            _client = Langfuse(
                public_key=_configuration.public_key,
                secret_key=_configuration.secret_key,
                base_url=_configuration.base_url,
                environment=_configuration.environment,
            )
        except Exception:
            # Telemetry is fail-open: content work must continue without it.
            _client = None
        return _client


@contextmanager
def observe(
    name: str,
    *,
    as_type: str = "span",
    input: Any = None,
    metadata: dict[str, Any] | None = None,
    model: str | None = None,
    model_parameters: dict[str, Any] | None = None,
) -> Iterator[Any]:
    client = _get_client()
    if client is None:
        yield None
        return
    try:
        manager = client.start_as_current_observation(
            name=name,
            as_type=as_type,
            input=input,
            metadata=metadata,
            model=model,
            model_parameters=model_parameters,
        )
    except Exception:
        yield None
        return
    with manager as observation:
        yield observation


def observation_ids(observation: Any) -> tuple[str | None, str | None]:
    if observation is None:
        return None, None
    observation_id = _string_attr(observation, "id") or _string_attr(observation, "observation_id")
    trace_id = _string_attr(observation, "trace_id")
    trace = getattr(observation, "trace", None)
    if trace_id is None and trace is not None:
        trace_id = _string_attr(trace, "id")
    return trace_id, observation_id


def shutdown_observability() -> None:
    global _client
    with _lock:
        if _client is None:
            return
        try:
            _client.shutdown()
        finally:
            _client = None


def _string_attr(value: Any, name: str) -> str | None:
    candidate = getattr(value, name, None)
    return str(candidate) if candidate else None
