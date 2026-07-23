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

## BinnAgentX 自管短期记忆

- 长期学习知识仍由 Obsidian 掌控；`agent_working_memory` 只保存 Agent 的近期选择、去重游标和运行偏好，不导出到 Vault。
- 短期记录按 `learner_id + agent_name + scope + memory_key` 隔离，带 TTL、版本号和更新时间；每个用户/Agent 最多保留 32 条，读写时自动清理过期和超限记录。
- 个性化阅读生成会记录最近使用的 Obsidian context ID、上次目标和材料 ID；下次生成优先选未使用的匹配笔记，解决连续点击得到相似材料的问题。

## 登录触发的 Inbox 整理 Agent

- 登录、注册或体验码登录成功后，在同一事务内幂等创建 `obsidian_organizer_runs`，登录响应不等待模型或 Vault I/O。
- 资产页提供“整理 Obsidian Inbox”手动入口；它只幂等排队同一种 `obsidian_organizer_runs`，已有登录或手动计划时直接复用。用户随后在 Obsidian 插件执行 Sync，继续进入同一上传、分类、白名单移动和回执链路。
- 插件下一次上传授权上下文时，后端只为 `BinnAgentX/00-Inbox/` 笔记生成移动计划；整理 Agent 结合标题、标签、路径、有限摘录和声明类型进行意图分类，目标只能映射到词汇、语法、阅读或写作白名单目录。路径名、标签和声明类型都只是可能错误或缺失的输入线索，任何一项都不能绕过 Agent 直接决定目标。
- Inbox 笔记按最多 10 条一批进入同一个整理 Agent，最多并发 3 批；每批独立执行结构 Schema、超时和输出 ID 校验。只有本次 Inbox 中每篇笔记都得到唯一、合法的 Agent 分类时才生成移动计划。任一批超时、解析失败、遗漏或返回冲突 ID 时，本轮不移动任何笔记，任务保持 `queued` 并在下次同步重试。
- 插件再次验证源目录和目标白名单后执行 `vault.rename`，不删除、不改写正文、不接受任意路径；全部动作完成后统一回执，未完成计划保留以便重试。
- 整理提示词 `obsidian.inbox_organize` 与 generator/reviewer 提示词一起纳入统一 Prompt Registry 和控制面版本管理。

### 同步响应与用户可见状态

一次插件 Sync 依次执行“拉取待导出资产 → 扫描并上传授权上下文 → 请求既有整理任务计划 → 执行白名单移动 → 回执”。`organization` 响应不再用 `null` 混淆不同结果：

| `organization` | 含义 | 插件行为 |
| --- | --- | --- |
| `null` | 本轮没有排队的整理任务 | 只报告接收和上传数量 |
| `status=noop` | 有整理任务，但 Inbox 没有待整理笔记 | 任务完成，不移动文件 |
| `status=queued` | Inbox 有笔记，但 Agent 未能完整可靠分类 | 报告 `inbox_count` 与 `classified_count`，不移动，下一次 Sync 重试 |
| `status=planned` | 全部 Inbox 笔记均已得到合法分类 | 执行全部 `actions`，按词汇、语法、阅读、写作报告目标数量，全部成功后回执 |

插件设置保存最近同步时间、最近错误和最近一次详细摘要。用户看到“同步完成”时仍应以摘要中的“整理完成：移动 N 条”作为整理成功标志；“待重试”明确表示上传成功但整理尚未完成。

## 基于 Obsidian 生成材料

- 学习首页允许输入本次巩固目标并筛选笔记类型；空筛选继续使用混合检索。
- `ObsidianLearnerMemory.recall` 负责用户隔离、类型限定和相关性排序，短期记忆负责轮换，生成器只收到最多 6 条受限摘录。
- 新材料请求写入 `personalized_training_materials`，由常驻 Worker 使用数据库所有权租约异步处理；自动失败最多尝试三次，终态失败需要用户显式重新生成。
- 选材把最新学习、到期复习、证据冲突和近期使用合并为确定性候选排序；远程模型只做有 Schema 的知识抽取与阅读生成，轨迹评估限制模型调用预算，不能改变资产身份或绕过用户隔离。
- 材料仍进入既有阅读训练运行，不创建第二套阅读器、完成状态或提示流程。完成时只更新迁移重点实际引用的来源资产证据，不把一次训练结果扩散到全部上下文。

## 治理与审计

- 控制舱把两个能力展示为 `source=agent_memory`：`obsidian.read_learning_context.v1` 与 `obsidian.write_learning_note.v1`。
- Tools 页的持久化启停策略同时约束原生 Agent 记忆和显式 Tool 调用；读能力关闭时 Agent 得不到记忆，写能力关闭时拒绝写入。
- `agent_memory_events` 只记录项目、用户、Agent、操作、调用键、记忆 ID 和查询哈希，不记录查询原文或笔记正文。
- `project_key` 固定为 `binnagentx`，不读取 BinnAgent 或其他项目的记忆配置。

## 代码边界

- 核心契约：`python/binnagent_agent/memory/contracts.py`
- Inbox 整理 Agent：`python/binnagent_agent/agents/obsidian_inbox_organizer.py`
- Obsidian Provider：`services/api/binnagent_api/agent_memory.py`
- Tool 适配器：`services/api/binnagent_api/obsidian_agent_tools.py`
- 审计迁移：`services/api/migrations/versions/0020_obsidian_agent_memory.py`
- 短期记忆与整理任务迁移：`services/api/migrations/versions/0021_agent_runtime_memory.py`

## 验收标准

1. 两个账号的记忆不能互相检索。
2. 个性化阅读使用统一记忆接口，不直接查询 Obsidian 表。
3. 阅读与表达 Agent 的模型请求会携带受限记忆；确定性回退不依赖远程模型。
4. 显式 Tool 与原生 Agent 调用共用同一读写实现和启停策略。
5. recall / remember 均留下不含正文的审计事件。
6. 写入继续复用既有资产和插件 Outbox，不创建第二套同步链路。
