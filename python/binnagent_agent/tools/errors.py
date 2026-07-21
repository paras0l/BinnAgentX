from __future__ import annotations


class ToolExecutionError(RuntimeError):
    """An expected, non-sensitive tool failure suitable for a reason code."""

    def __init__(self, reason_code: str, *, retryable: bool = False) -> None:
        super().__init__(reason_code)
        self.reason_code = reason_code
        self.retryable = retryable
