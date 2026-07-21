# BinnAgent Agent Runtime

这里是后台 Agent 的唯一权威实现边界。Agent 负责编排学习任务、调用受约束能力、维护学习者状态，并把所有外部动作留在可审计接口之后。

## 目录职责

- `agents/`：领域 Agent 角色与决策接口；
- `workflows/`：可恢复的长流程、状态图和任务编排；
- `tools/`：Agent 可调用的显式、可审计工具；
- `memory/`：所有 Agent 共用的 provider-neutral 学习者记忆契约；当前由 API 层的 Obsidian Provider 实现 `recall` / `remember`，核心包不依赖 Vault 或数据库；
- `prompts/`：BinnAgentX 代码审核过的 Prompt 默认目录、变量契约与渲染边界；API 层只负责解析本项目数据库中的活动覆盖版本；
- `prompts/`：版本化提示资产及其组装逻辑；
- `gateways/`：模型与其他外部能力的结构化网关；
- `policies/`：预算、安全、介入等级等确定性策略。

领域不变量继续放在 `binnagent_domain`，离线评测放在 `binnagent_evaluation`，HTTP 与任务进程分别放在 `services/api` 和 `services/worker`。Agent 包不能反向依赖 Web 路由或前端实现。
