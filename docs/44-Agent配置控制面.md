# Agent 配置控制面

## 目标

BinnAgentX 控制舱提供独立的 Tools 与 Prompt 管理页面，用于治理 Agent 可见能力和版本化 Prompt。该控制面借鉴旧 BinnAgent 的目录、版本和渲染原则，但不共享数据库、注册表单例、API 路径或模板文件。

## 项目隔离

- 所有记录强制写入 `project_key=binnagentx`；客户端不能提交或切换项目键。
- 表 `control_tool_policies` 和 `control_prompts` 只存在于 BinnAgentX 数据库迁移链。
- Tool 目录只展示 BinnAgentX 代码中已经注册的 `ToolSpec`，控制舱不能上传或执行任意 Python 代码。
- Prompt ID、版本、变量、模型策略和模板正文均保存在本项目；不会读取 `../BinnAgent` 的 Prompt 文件或数据库。
- 学习端不暴露控制接口；所有管理 API 继续要求 `developer_reviewer` 控制角色。

## Tools 管理

控制 API：

- `GET /control/v1/tools`：列出代码注册目录与持久化启停策略。
- `PATCH /control/v1/tools/{tool_name}`：按 `expected_version` 更新启停状态。

每个 Tool 展示稳定名称、语义版本、来源、类型、风险、Actor、权限 Scope、幂等/审批要求以及输入输出 Schema。策略更新使用乐观并发控制；禁用状态会同时进入 Agent 原生记忆访问和显式 Tool 执行门禁。

Obsidian 已成为 BinnAgentX 的原生学习者记忆 Provider；控制舱把同一记忆模块的两个受约束入口展示为 `source=agent_memory`：

1. `obsidian.read_learning_context.v1`：只读取当前学习者明确授权并已由插件同步的有限摘录，不接受任意 Vault 路径。
2. `obsidian.write_learning_note.v1`：创建账号归属的学习资产，并进入现有 Obsidian 插件导出队列；要求 `obsidian:write`、幂等键和可信 `ToolContext.learner_id`。

Tool 的模型公开参数不包含 `learner_id`、数据库连接、Vault 绝对路径或插件密钥。这些信息只能由运行时可信上下文注入。

## Prompt 管理

Prompt 管理由三层组成，缺一不可：

1. `python/binnagent_agent/prompts/` 保存 BinnAgentX 代码审核过的默认目录、变量契约、版本和确定性渲染器。
2. `control_prompts` 保存控制舱创建的项目内版本；一个 Prompt ID 同时只能有一个活动版本。
3. `DatabasePromptRuntime` 在每次远程模型调用前解析活动版本；没有数据库版本或数据库暂不可用时回退到代码注册表。

因此控制舱激活的模板正文、`temperature`、`max_tokens` 和 Prompt 版本会真正进入个性化阅读、阅读选区诊断、表达单项反馈与表达风格复盘。不可删除的代码安全前缀仍负责把学习者输入和记忆标记为不可信材料，管理模板不能关闭这条边界。已知运行时 Prompt 在激活前必须通过代码注册表的变量契约校验，避免激活缺少变量的版本导致线上 Agent 失败。

控制 API：

- `GET /control/v1/prompts`：列出本项目全部 Prompt 版本，并初始化代码审核过的默认版本。
- `POST /control/v1/prompts`：创建不可覆盖的新草稿版本。
- `PUT /control/v1/prompts/{prompt_id}/{version}`：仅编辑草稿，使用记录版本做并发校验。
- `POST /control/v1/prompts/{prompt_id}/{version}/activate`：激活目标版本并归档同 Prompt 的旧活动版本。
- `POST /control/v1/prompts/{prompt_id}/{version}/render`：校验变量完整性后生成预览和内容哈希。

默认目录覆盖个性化阅读、阅读选区诊断和表达单项反馈。模板采用显式 `{{variable}}` 变量；激活版本不可直接编辑，必须基于它创建下一版本，避免线上 Prompt 静默漂移。

## 数据迁移与审计边界

Alembic `0019_agent_configuration` 创建两张控制面表，`0020_obsidian_agent_memory` 增加不含正文的 Agent 记忆访问审计。工具策略记录操作者角色、策略版本和更新时间；Prompt 记录创建角色、内容哈希、激活时间和记录版本。模型输入输出、费用与延迟仍由现有 Langfuse 和模型调用账本负责，不在 Prompt 表重复保存。

## 验证

- `tests/integration/test_agent_configuration_api.py` 覆盖控制权限、项目键、Obsidian Tool 注册、启停并发、默认 Prompt、草稿、渲染变量校验和版本激活归档。
- `apps/control-cockpit/app/page.test.tsx` 覆盖 Tools 页面、Obsidian 权限展示、启停交互和 Prompt 项目边界。
- 全量 `pnpm check` 与集成测试必须在发布前通过。
