from binnagent_domain.public_errors import PublicErrorCode


class DomainError(Exception):
    def __init__(
        self,
        code: PublicErrorCode,
        reason: str,
        current_version: int | None = None,
    ) -> None:
        super().__init__(reason)
        self.code = code
        self.reason = reason
        self.current_version = current_version

    def __str__(self) -> str:
        return self.reason
