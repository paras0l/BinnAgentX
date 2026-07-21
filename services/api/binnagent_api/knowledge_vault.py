"""A deliberately narrow adapter for the BinnAgent-managed Obsidian directory."""

from __future__ import annotations

import asyncio
import json
import re
import shutil
from dataclasses import dataclass
from hashlib import sha256
from pathlib import PurePosixPath
from typing import Protocol, cast
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from binnagent_api.settings import Settings

_UNSAFE_PATH = re.compile(r"(^|/)(?:\.|\.\.)(?:/|$)")
_SAFE_FILE_CHARS = re.compile(r"[^A-Za-z0-9 _\-\u4e00-\u9fff]")


class KnowledgeVaultError(RuntimeError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True, slots=True)
class CreatedNote:
    document_id: str
    relative_path: str
    document_uri: str
    content_hash: str


@dataclass(frozen=True, slots=True)
class KnowledgeVaultStatus:
    adapter: str
    connected: bool
    detail: str


class KnowledgeVaultPort(Protocol):
    async def create_note_skeleton(
        self,
        *,
        asset_id: str,
        kind: str,
        title: str,
        tags: tuple[str, ...],
        source_type: str,
        source_task_id: str | None,
        initial_content: str | None = None,
    ) -> CreatedNote: ...

    async def open_note(self, relative_path: str) -> None: ...

    async def status(self) -> KnowledgeVaultStatus: ...


class DisabledKnowledgeVault:
    async def create_note_skeleton(self, **_: object) -> CreatedNote:
        raise KnowledgeVaultError("knowledge_vault_unavailable")

    async def open_note(self, _: str) -> None:
        raise KnowledgeVaultError("knowledge_vault_unavailable")

    async def status(self) -> KnowledgeVaultStatus:
        return KnowledgeVaultStatus(
            adapter="disabled",
            connected=False,
            detail="Obsidian Bridge 尚未配置",
        )


class ObsidianCliKnowledgeVault:
    """Only emits vetted Obsidian CLI calls; it never accepts an arbitrary command."""

    def __init__(self, settings: Settings) -> None:
        if not settings.obsidian_vault_name:
            raise ValueError("obsidian_vault_name_required")
        self._command = settings.obsidian_cli_command
        self._vault = settings.obsidian_vault_name
        self._directory = self._safe_directory(settings.obsidian_managed_directory)
        self._timeout_seconds = settings.obsidian_cli_timeout_seconds

    async def create_note_skeleton(
        self,
        *,
        asset_id: str,
        kind: str,
        title: str,
        tags: tuple[str, ...],
        source_type: str,
        source_task_id: str | None,
        initial_content: str | None = None,
    ) -> CreatedNote:
        filename = self._filename(title, asset_id)
        relative_path = f"{self._directory}/{filename}.md"
        content = self._skeleton(
            asset_id=asset_id,
            kind=kind,
            title=title,
            tags=tags,
            source_type=source_type,
            source_task_id=source_task_id,
            initial_content=initial_content,
        )
        encoded_content = content.replace("\\", "\\\\").replace("\n", "\\n")
        await self._run("create", f"path={relative_path}", f"content={encoded_content}")
        return CreatedNote(
            document_id=asset_id,
            relative_path=relative_path,
            document_uri=f"obsidian://open?vault={quote(self._vault)}&file={quote(relative_path)}",
            content_hash=sha256(content.encode("utf-8")).hexdigest(),
        )

    async def open_note(self, relative_path: str) -> None:
        await self._run("open", f"path={self._safe_relative_path(relative_path)}")

    async def status(self) -> KnowledgeVaultStatus:
        if shutil.which(self._command) is None:
            return KnowledgeVaultStatus(
                adapter="obsidian_cli",
                connected=False,
                detail="未找到 Obsidian CLI",
            )
        return KnowledgeVaultStatus(
            adapter="obsidian_cli",
            connected=True,
            detail=f"已配置 Vault: {self._vault}",
        )

    async def _run(self, command: str, *arguments: str) -> str:
        try:
            process = await asyncio.create_subprocess_exec(
                self._command,
                f"vault={self._vault}",
                command,
                *arguments,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            raise KnowledgeVaultError("knowledge_vault_cli_not_found") from exc
        try:
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=self._timeout_seconds)
        except TimeoutError as exc:
            process.kill()
            await process.communicate()
            raise KnowledgeVaultError("knowledge_vault_timeout") from exc
        if process.returncode != 0:
            raise KnowledgeVaultError("knowledge_vault_command_failed")
        return stdout.decode("utf-8", errors="replace")

    @staticmethod
    def _safe_directory(value: str) -> str:
        normalized = value.strip().strip("/")
        if not normalized or "\\" in normalized or _UNSAFE_PATH.search(normalized):
            raise ValueError("invalid_obsidian_managed_directory")
        return normalized

    def _safe_relative_path(self, value: str) -> str:
        path = PurePosixPath(value)
        normalized = str(path)
        if _UNSAFE_PATH.search(normalized) or not normalized.startswith(f"{self._directory}/"):
            raise KnowledgeVaultError("knowledge_vault_path_denied")
        return normalized

    @staticmethod
    def _filename(title: str, asset_id: str) -> str:
        compact = _SAFE_FILE_CHARS.sub("-", title).strip(" .-")[:80] or "asset"
        return f"{compact}-{asset_id[-10:]}"

    @staticmethod
    def _skeleton(
        *,
        asset_id: str,
        kind: str,
        title: str,
        tags: tuple[str, ...],
        source_type: str,
        source_task_id: str | None,
        initial_content: str | None,
    ) -> str:
        tag_lines = "\n".join(f"  - {tag}" for tag in ("binnagent", kind, *tags))
        task_line = f'\nbinnagent_source_task_id: "{source_task_id}"' if source_task_id else ""
        captured_content = initial_content.strip() if initial_content else ""
        capture_section = (
            f"## BinnAgent 自动提取\n\n{captured_content}\n\n" if captured_content else ""
        )
        return (
            "---\n"
            'binnagent_schema: "asset/v1"\n'
            f'binnagent_asset_id: "{asset_id}"\n'
            f'binnagent_kind: "{kind}"\n'
            f'binnagent_source_type: "{source_type}"{task_line}\n'
            f'title: "{title.replace(chr(34), chr(39))}"\n'
            "tags:\n"
            f"{tag_lines}\n"
            "---\n\n"
            f"# {title}\n\n"
            f"{capture_section}"
            "## 最初语境\n\n\n"
            "## 我的理解\n\n\n"
            "## 可迁移规则\n\n\n"
            "## 新语境验证\n\n"
        )


class ObsidianBridgeKnowledgeVault:
    """A restricted client for the desktop-only Obsidian bridge.

    The bridge is deliberately separate from Docker: it is the only process
    allowed to invoke the user's GUI application's CLI.
    """

    def __init__(self, settings: Settings) -> None:
        if not settings.obsidian_bridge_token:
            raise ValueError("obsidian_bridge_token_required")
        self._base_url = settings.obsidian_bridge_url.rstrip("/")
        self._token = settings.obsidian_bridge_token.get_secret_value()
        self._timeout_seconds = settings.obsidian_cli_timeout_seconds

    async def create_note_skeleton(
        self,
        *,
        asset_id: str,
        kind: str,
        title: str,
        tags: tuple[str, ...],
        source_type: str,
        source_task_id: str | None,
        initial_content: str | None = None,
    ) -> CreatedNote:
        data = await self._request(
            "POST",
            "/v1/notes",
            {
                "asset_id": asset_id,
                "kind": kind,
                "title": title,
                "tags": list(tags),
                "source_type": source_type,
                "source_task_id": source_task_id,
                # This is request-only: it is never written to the product index
                # or Outbox payload before it reaches the user's vault.
                "initial_content": initial_content,
            },
        )
        return CreatedNote(
            document_id=str(data["document_id"]),
            relative_path=str(data["relative_path"]),
            document_uri=str(data["document_uri"]),
            content_hash=str(data["content_hash"]),
        )

    async def open_note(self, relative_path: str) -> None:
        await self._request("POST", "/v1/notes/open", {"relative_path": relative_path})

    async def status(self) -> KnowledgeVaultStatus:
        try:
            data = await self._request("GET", "/v1/status", None)
        except KnowledgeVaultError as exc:
            return KnowledgeVaultStatus(adapter="obsidian_bridge", connected=False, detail=exc.code)
        return KnowledgeVaultStatus(
            adapter="obsidian_bridge",
            connected=bool(data.get("connected")),
            detail=str(data.get("detail", "Bridge 已连接")),
        )

    async def _request(
        self, method: str, path: str, body: dict[str, object] | None
    ) -> dict[str, object]:
        def execute() -> dict[str, object]:
            encoded = json.dumps(body).encode("utf-8") if body is not None else None
            request = Request(
                f"{self._base_url}{path}",
                data=encoded,
                method=method,
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {self._token}",
                    **({"Content-Type": "application/json"} if encoded else {}),
                },
            )
            try:
                with urlopen(request, timeout=self._timeout_seconds) as response:
                    decoded = json.loads(response.read().decode("utf-8"))
                    if not isinstance(decoded, dict):
                        raise KnowledgeVaultError("knowledge_vault_response_invalid")
                    return cast(dict[str, object], decoded)
            except HTTPError as exc:
                if exc.code in {401, 403}:
                    raise KnowledgeVaultError("knowledge_vault_unauthorized") from exc
                raise KnowledgeVaultError("knowledge_vault_command_failed") from exc
            except URLError as exc:
                raise KnowledgeVaultError("knowledge_vault_bridge_unreachable") from exc

        return await asyncio.to_thread(execute)


def knowledge_vault_from_settings(settings: Settings) -> KnowledgeVaultPort:
    if settings.knowledge_vault_adapter == "disabled":
        return DisabledKnowledgeVault()
    if settings.knowledge_vault_adapter == "obsidian_bridge":
        return ObsidianBridgeKnowledgeVault(settings)
    return ObsidianCliKnowledgeVault(settings)
