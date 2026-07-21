# ruff: noqa: RUF001

"""BinnAgentX-only Agent tool and prompt governance control plane."""

from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256
from typing import Annotated, Any, Literal

import sqlalchemy as sa
from binnagent_agent.prompts import DEFAULT_PROMPT_REGISTRY, PromptDefinition
from binnagent_agent.tools import content_ops_registry, runtime_registry
from binnagent_agent.tools.contracts import ToolSpec
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.auth import ControlIdentity, require_control_identity
from binnagent_api.database import get_engine
from binnagent_api.vertical_slice import tables

PROJECT_KEY = "binnagentx"
agent_configuration_router = APIRouter(prefix="/v1", tags=["agent-configuration"])
_PROMPT_ID = r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$"
_PROMPT_VERSION = r"^v[1-9][0-9]*$"

_TOOL_METADATA: dict[str, dict[str, Any]] = {
    "runtime.get_context.v1": {
        "display_name": "读取训练上下文",
        "description": "读取当前运行阶段、任务类型和允许动作，不暴露作答正文。",
        "input_schema": {"type": "object", "properties": {}},
        "output_schema": {"type": "object"},
        "source": "binnagentx_runtime",
    },
    "reading.analyze_selection.v1": {
        "display_name": "分析阅读选区",
        "description": "对学习者明确选择的阅读片段提供受约束诊断。",
        "input_schema": {"type": "object", "required": ["selected_span"]},
        "output_schema": {"type": "object"},
        "source": "binnagentx_runtime",
    },
    "expression.deliver_priority_feedback.v1": {
        "display_name": "表达单项反馈",
        "description": "只返回一项最高优先级表达反馈。",
        "input_schema": {"type": "object", "required": ["attempt_version_id"]},
        "output_schema": {"type": "object"},
        "source": "binnagentx_runtime",
    },
    "expression.review_draft.v1": {
        "display_name": "表达风格复盘",
        "description": "生成逻辑镜像、学术和新闻风格的受约束对照。",
        "input_schema": {"type": "object", "required": ["draft"]},
        "output_schema": {"type": "object"},
        "source": "binnagentx_runtime",
    },
    "workflow.advance.v1": {
        "display_name": "推进训练运行",
        "description": "按领域状态机推进现有运行，要求版本和幂等键。",
        "input_schema": {"type": "object", "required": ["expected_version"]},
        "output_schema": {"type": "object"},
        "source": "binnagentx_runtime",
    },
    "obsidian.read_learning_context.v1": {
        "display_name": "检索学习者记忆（Obsidian）",
        "description": (
            "为 BinnAgentX Agent 检索当前学习者已授权的有限记忆；不读取任意 Vault 文件。"
        ),
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}},
        },
        "output_schema": {"type": "object", "required": ["entries"]},
        "source": "agent_memory",
    },
    "obsidian.write_learning_note.v1": {
        "display_name": "写入学习者记忆（Obsidian）",
        "description": "把 Agent 学习产物写入账号隔离的记忆与插件导出队列，不接受任意文件路径。",
        "input_schema": {
            "type": "object",
            "required": ["kind", "title", "content"],
        },
        "output_schema": {"type": "object", "required": ["asset_id", "sync_status"]},
        "source": "agent_memory",
    },
    "content_ops.generate_candidate.v1": {
        "display_name": "生成内容候选",
        "description": "由开发审核角色启动受约束的材料生成。",
        "input_schema": {"type": "object"},
        "output_schema": {"type": "object"},
        "source": "content_operations",
    },
    "content_ops.publish_version.v1": {
        "display_name": "发布内容版本",
        "description": "通过人工审批门禁后发布材料包。",
        "input_schema": {"type": "object", "required": ["job_id"]},
        "output_schema": {"type": "object"},
        "source": "content_operations",
    },
}

_DEFAULT_PROMPTS = tuple(
    {
        **definition.model_dump(),
        "variables": list(definition.variables),
    }
    for definition in DEFAULT_PROMPT_REGISTRY.list()
)


class ToolView(BaseModel):
    project_key: Literal["binnagentx"]
    name: str
    display_name: str
    version: str
    description: str
    kind: str
    risk_level: str
    source: str
    enabled: bool
    allowed_actor_types: list[str]
    required_permission_scopes: list[str]
    requires_human_approval: bool
    requires_idempotency_key: bool
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    policy_version: int
    updated_at: datetime | None


class ToolPolicyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool
    expected_version: int = Field(ge=1)


class PromptView(BaseModel):
    project_key: Literal["binnagentx"]
    prompt_id: str
    prompt_version: str
    owner: str
    purpose: str
    template_text: str
    variables: list[str]
    model_policy: dict[str, Any]
    status: str
    content_hash: str
    version: int
    created_by_role: str
    activated_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PromptCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt_id: str = Field(pattern=_PROMPT_ID, max_length=160)
    prompt_version: str = Field(pattern=_PROMPT_VERSION, max_length=32)
    owner: str = Field(min_length=1, max_length=80)
    purpose: str = Field(min_length=8, max_length=500)
    template_text: str = Field(min_length=20, max_length=20000)
    variables: list[str] = Field(default_factory=list, max_length=64)
    model_policy: dict[str, Any] = Field(default_factory=dict)


class PromptUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    owner: str = Field(min_length=1, max_length=80)
    purpose: str = Field(min_length=8, max_length=500)
    template_text: str = Field(min_length=20, max_length=20000)
    variables: list[str] = Field(default_factory=list, max_length=64)
    model_policy: dict[str, Any] = Field(default_factory=dict)
    expected_version: int = Field(ge=1)


class PromptActivate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_version: int = Field(ge=1)


class PromptRenderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    variables: dict[str, Any] = Field(default_factory=dict)


class PromptRenderView(BaseModel):
    prompt_id: str
    prompt_version: str
    rendered: str
    content_hash: str


def _all_specs() -> tuple[ToolSpec, ...]:
    return runtime_registry.list() + content_ops_registry.list()


async def _seed_prompts(connection: AsyncConnection, role: str) -> None:
    now = datetime.now(UTC)
    for item in _DEFAULT_PROMPTS:
        template = str(item["template_text"])
        await connection.execute(
            pg_insert(tables.control_prompts)
            .values(
                project_key=PROJECT_KEY,
                **item,
                status="active",
                content_hash=sha256(template.encode()).hexdigest(),
                version=1,
                created_by_role=role,
                activated_at=now,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["project_key", "prompt_id", "prompt_version"])
        )


def _prompt_view(row: sa.RowMapping) -> PromptView:
    return PromptView(**dict(row))


def _validate_activatable_prompt(row: sa.RowMapping) -> None:
    variables = tuple(str(item) for item in row["variables"])
    try:
        expected = DEFAULT_PROMPT_REGISTRY.get(str(row["prompt_id"])).variables
    except KeyError:
        expected = variables
    if set(variables) != set(expected):
        raise HTTPException(status_code=422, detail="runtime_prompt_variable_contract_mismatch")
    definition = PromptDefinition(
        prompt_id=str(row["prompt_id"]),
        prompt_version=str(row["prompt_version"]),
        owner=str(row["owner"]),
        purpose=str(row["purpose"]),
        template_text=str(row["template_text"]),
        variables=variables,
        model_policy=dict(row["model_policy"]),
    )
    try:
        definition.render({name: f"<{name}>" for name in variables})
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@agent_configuration_router.get("/tools", response_model=list[ToolView])
async def list_tools(
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> list[ToolView]:
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.select(tables.control_tool_policies).where(
                        tables.control_tool_policies.c.project_key == PROJECT_KEY
                    )
                )
            )
            .mappings()
            .all()
        )
    policies = {str(row["tool_name"]): row for row in rows}
    result: list[ToolView] = []
    for spec in _all_specs():
        policy = policies.get(spec.name)
        enabled = bool(policy["enabled"]) if policy else True
        (
            runtime_registry
            if spec.name in {item.name for item in runtime_registry.list()}
            else content_ops_registry
        ).set_enabled(spec.name, enabled)
        metadata = _TOOL_METADATA[spec.name]
        result.append(
            ToolView(
                project_key=PROJECT_KEY,
                name=spec.name,
                display_name=str(metadata["display_name"]),
                version=spec.version,
                description=str(metadata["description"]),
                kind=spec.kind.value,
                risk_level=spec.risk_level.value,
                source=str(metadata["source"]),
                enabled=enabled,
                allowed_actor_types=sorted(item.value for item in spec.allowed_actor_types),
                required_permission_scopes=sorted(spec.required_permission_scopes),
                requires_human_approval=spec.requires_human_approval,
                requires_idempotency_key=spec.requires_idempotency_key,
                input_schema=dict(metadata["input_schema"]),
                output_schema=dict(metadata["output_schema"]),
                policy_version=int(policy["version"]) if policy else 1,
                updated_at=policy["updated_at"] if policy else None,
            )
        )
    return result


@agent_configuration_router.patch("/tools/{tool_name}", response_model=ToolView)
async def update_tool_policy(
    tool_name: str,
    body: ToolPolicyUpdate,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> ToolView:
    specs = {spec.name: spec for spec in _all_specs()}
    if tool_name not in specs:
        raise HTTPException(status_code=404, detail="tool_not_found")
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        existing = (
            (
                await connection.execute(
                    sa.select(tables.control_tool_policies).where(
                        tables.control_tool_policies.c.project_key == PROJECT_KEY,
                        tables.control_tool_policies.c.tool_name == tool_name,
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        current_version = int(existing["version"]) if existing else 1
        if body.expected_version != current_version:
            raise HTTPException(status_code=409, detail="tool_policy_version_conflict")
        next_version = current_version + 1
        await connection.execute(
            pg_insert(tables.control_tool_policies)
            .values(
                project_key=PROJECT_KEY,
                tool_name=tool_name,
                enabled=body.enabled,
                version=next_version,
                updated_by_role=identity.role,
                created_at=existing["created_at"] if existing else now,
                updated_at=now,
            )
            .on_conflict_do_update(
                index_elements=["project_key", "tool_name"],
                set_={
                    "enabled": body.enabled,
                    "version": next_version,
                    "updated_by_role": identity.role,
                    "updated_at": now,
                },
            )
        )
    registry = (
        runtime_registry
        if tool_name in {item.name for item in runtime_registry.list()}
        else content_ops_registry
    )
    registry.set_enabled(tool_name, body.enabled)
    return next(item for item in await list_tools(identity) if item.name == tool_name)


@agent_configuration_router.get("/prompts", response_model=list[PromptView])
async def list_prompts(
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> list[PromptView]:
    async with get_engine().begin() as connection:
        await _seed_prompts(connection, identity.role)
        rows = (
            (
                await connection.execute(
                    sa.select(tables.control_prompts)
                    .where(tables.control_prompts.c.project_key == PROJECT_KEY)
                    .order_by(
                        tables.control_prompts.c.prompt_id,
                        tables.control_prompts.c.prompt_version.desc(),
                    )
                )
            )
            .mappings()
            .all()
        )
    return [_prompt_view(row) for row in rows]


@agent_configuration_router.post(
    "/prompts", response_model=PromptView, status_code=status.HTTP_201_CREATED
)
async def create_prompt(
    body: PromptCreate,
    identity: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> PromptView:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        await _seed_prompts(connection, identity.role)
        values = {
            "project_key": PROJECT_KEY,
            **body.model_dump(),
            "status": "draft",
            "content_hash": sha256(body.template_text.encode()).hexdigest(),
            "version": 1,
            "created_by_role": identity.role,
            "activated_at": None,
            "created_at": now,
            "updated_at": now,
        }
        inserted = await connection.execute(
            pg_insert(tables.control_prompts)
            .values(**values)
            .on_conflict_do_nothing(index_elements=["project_key", "prompt_id", "prompt_version"])
            .returning(*tables.control_prompts.c)
        )
        row = inserted.mappings().one_or_none()
        if row is None:
            raise HTTPException(status_code=409, detail="prompt_version_exists")
    return _prompt_view(row)


async def _owned_prompt(
    connection: AsyncConnection, prompt_id: str, prompt_version: str
) -> sa.RowMapping:
    row = (
        (
            await connection.execute(
                sa.select(tables.control_prompts).where(
                    tables.control_prompts.c.project_key == PROJECT_KEY,
                    tables.control_prompts.c.prompt_id == prompt_id,
                    tables.control_prompts.c.prompt_version == prompt_version,
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="prompt_not_found")
    return row


@agent_configuration_router.put("/prompts/{prompt_id}/{prompt_version}", response_model=PromptView)
async def update_prompt(
    prompt_id: str,
    prompt_version: str,
    body: PromptUpdate,
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> PromptView:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = await _owned_prompt(connection, prompt_id, prompt_version)
        if row["status"] != "draft":
            raise HTTPException(status_code=409, detail="only_draft_prompt_is_editable")
        if int(row["version"]) != body.expected_version:
            raise HTTPException(status_code=409, detail="prompt_version_conflict")
        await connection.execute(
            tables.control_prompts.update()
            .where(
                tables.control_prompts.c.project_key == PROJECT_KEY,
                tables.control_prompts.c.prompt_id == prompt_id,
                tables.control_prompts.c.prompt_version == prompt_version,
            )
            .values(
                **body.model_dump(exclude={"expected_version"}),
                content_hash=sha256(body.template_text.encode()).hexdigest(),
                version=int(row["version"]) + 1,
                updated_at=now,
            )
        )
        updated = await _owned_prompt(connection, prompt_id, prompt_version)
    return _prompt_view(updated)


@agent_configuration_router.post(
    "/prompts/{prompt_id}/{prompt_version}/activate", response_model=PromptView
)
async def activate_prompt(
    prompt_id: str,
    prompt_version: str,
    body: PromptActivate,
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> PromptView:
    now = datetime.now(UTC)
    async with get_engine().begin() as connection:
        row = await _owned_prompt(connection, prompt_id, prompt_version)
        if int(row["version"]) != body.expected_version:
            raise HTTPException(status_code=409, detail="prompt_version_conflict")
        _validate_activatable_prompt(row)
        await connection.execute(
            tables.control_prompts.update()
            .where(
                tables.control_prompts.c.project_key == PROJECT_KEY,
                tables.control_prompts.c.prompt_id == prompt_id,
                tables.control_prompts.c.status == "active",
            )
            .values(status="archived", updated_at=now)
        )
        await connection.execute(
            tables.control_prompts.update()
            .where(
                tables.control_prompts.c.project_key == PROJECT_KEY,
                tables.control_prompts.c.prompt_id == prompt_id,
                tables.control_prompts.c.prompt_version == prompt_version,
            )
            .values(
                status="active",
                activated_at=now,
                version=int(row["version"]) + 1,
                updated_at=now,
            )
        )
        updated = await _owned_prompt(connection, prompt_id, prompt_version)
    return _prompt_view(updated)


@agent_configuration_router.post(
    "/prompts/{prompt_id}/{prompt_version}/render", response_model=PromptRenderView
)
async def render_prompt(
    prompt_id: str,
    prompt_version: str,
    body: PromptRenderRequest,
    _: Annotated[ControlIdentity, Depends(require_control_identity)],
) -> PromptRenderView:
    async with get_engine().connect() as connection:
        row = await _owned_prompt(connection, prompt_id, prompt_version)
    definition = PromptDefinition(
        prompt_id=prompt_id,
        prompt_version=prompt_version,
        owner=str(row["owner"]),
        purpose=str(row["purpose"]),
        template_text=str(row["template_text"]),
        variables=tuple(str(item) for item in row["variables"]),
        model_policy=dict(row["model_policy"]),
    )
    try:
        rendered = definition.render(body.variables).text.strip()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return PromptRenderView(
        prompt_id=prompt_id,
        prompt_version=prompt_version,
        rendered=rendered,
        content_hash=sha256(rendered.encode()).hexdigest(),
    )
