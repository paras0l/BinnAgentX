# Obsidian 作为 BinnAgentX Agent 记忆模块

## 定位

Obsidian 是 BinnAgentX 当前的学习者长期记忆 Provider，不再只是资产页面的同步集成或两个孤立 Tool。Agent 核心只依赖 `LearnerMemoryPort`，通过统一的 `recall` / `remember` 语义使用记忆；Vault、插件同步和数据库索引都留在 API 基础设施层。

```text
个性化阅读 / 选区诊断 / 单项反馈 / 风格复盘
                    │
                    ▼
        LearnerMemoryPort（Agent 核心契约）
                    │
                    ▼
      ObsidianLearnerMemory（BinnAgentX 适配器）
          ├─ recall：授权有限摘录
          └─ remember：学习资产 + 插件导出队列
                    │
                    ▼
              用户自己的 Obsidian Vault
```

## 记忆读取

- 只读取插件主动同步到 `obsidian_learning_context` 的授权摘录，不读取笔记全文。
- `learner_id` 来自服务端认证或可信 ToolContext，模型和客户端不能替换。
- 检索先限定用户和可选资产类型，再在最近 40 条授权记忆内做轻量相关性排序；无关键词命中时回退到最近记忆。
- 每个 Agent 最多取得 4–6 条、每条最多 900 字符，并在 Prompt 中标记为不可信学习材料，禁止执行笔记里的指令和整句复制。
- 当前接入点包括个性化阅读生成、阅读选区分析、表达单项反馈和表达风格复盘。

## 记忆写入

- `remember` 创建元数据资产并进入现有 `asset_export_requested` Outbox；插件负责把正文写到用户 Vault。
- 只允许受控学习资产类型，不接受绝对路径、相对路径或任意 Vault 文件操作。
- `(learner_id, invocation_key)` 形成账号内幂等边界，同一 Agent 调用不会生成重复记忆。
- 阅读标注、纠偏、表达复盘和训练总结仍由既有学习流程在用户确认后加入资产；Agent 也可以通过受治理的写入 Tool 调用同一个记忆模块。

## 治理与审计

- 控制舱把两个能力展示为 `source=agent_memory`：`obsidian.read_learning_context.v1` 与 `obsidian.write_learning_note.v1`。
- Tools 页的持久化启停策略同时约束原生 Agent 记忆和显式 Tool 调用；读能力关闭时 Agent 得不到记忆，写能力关闭时拒绝写入。
- `agent_memory_events` 只记录项目、用户、Agent、操作、调用键、记忆 ID 和查询哈希，不记录查询原文或笔记正文。
- `project_key` 固定为 `binnagentx`，不读取 BinnAgent 或其他项目的记忆配置。

## 代码边界

- 核心契约：`python/binnagent_agent/memory/contracts.py`
- Obsidian Provider：`services/api/binnagent_api/agent_memory.py`
- Tool 适配器：`services/api/binnagent_api/obsidian_agent_tools.py`
- 审计迁移：`services/api/migrations/versions/0020_obsidian_agent_memory.py`

## 验收标准

1. 两个账号的记忆不能互相检索。
2. 个性化阅读使用统一记忆接口，不直接查询 Obsidian 表。
3. 阅读与表达 Agent 的模型请求会携带受限记忆；确定性回退不依赖远程模型。
4. 显式 Tool 与原生 Agent 调用共用同一读写实现和启停策略。
5. recall / remember 均留下不含正文的审计事件。
6. 写入继续复用既有资产和插件 Outbox，不创建第二套同步链路。
