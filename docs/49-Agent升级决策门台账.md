# Agent 升级决策门台账

> 状态：决策进行中 v0.5（P2 与 P5 受控工程闭环及开发者验收已完成）  
> 日期：2026-07-25  
> 依据：`docs/48-Agent内容质量与双实验室闭环升级基线.md`  
> 目的：逐项冻结 Agent 升级前的架构、资源、评测和迁移决策，防止候选方案被直接写成已验证实现。

## 1. 状态定义

| 状态 | 含义 |
|---|---|
| `accepted` | 架构决定已经冻结，可以按约束实施 |
| `accepted-for-spike` | 方向已选定，只允许在隔离 Spike 中实施；通过验证门后才能进入正式路径 |
| `proposed` | 有推荐方向，但缺少关键对照或外部输入 |
| `blocked-for-product` | 可以做工程准备，但缺少人工、授权、合规或真人证据，不能正式发布 |
| `rejected` | 当前不采用 |

## 2. 决策总表

| Gate | 决策主题 | 当前结论 | 状态 | 权威记录 | 下一关闭条件 |
|---|---|---|---|---|---|
| G-01 | 动态 Agent 工作流运行时 | LangGraph 作为个性化内容和知识整理的首选运行时；自托管于现有 Worker；不承载普通固定任务 | `accepted-for-spike` | ADR-0006 | 新个性化材料已完成本地真实业务接线，双图、完整节点边界故障矩阵、跨进程恢复、图版本保护和本地容量基线已通过；仍需生产影子流量、目标环境 SLO 和真实长等待恢复演练 |
| G-02 | PostgreSQL、Worker、Outbox 与 checkpoint 所有权 | 业务表是唯一业务事实源；Outbox/Worker 负责投递领取；checkpoint 只负责图恢复 | `accepted-for-spike` | ADR-0009 | 业务 `runtime_kind`、checkpoint、只读对账和受确认清理已分离；仍需生产影子运行的异常演练、权限/备份/删除验证 |
| G-03 | 词典/词库 | OEWN 2025 core + `wn` 是离线义项库存第一候选；永久 sense key 入证据；消歧和中文教学释义保持独立 | `proposed` | ADR-0011 | 候选事实、样本/结果契约和评分器已完成；仍需锁定 artifact 权利核验、真实适配器、熟词僻义覆盖和同机跑分 |
| G-04 | 句法解析器 | spaCy 与 Stanza 在同一金标和硬件上对照；解析器生成结构候选，模型只做受证据约束的教学解释 | `proposed` | ADR-0011 | 长句/嵌套结构工程种子、精确偏移评分和延迟报告已完成；仍需锁定模型许可、Python 3.13 离线安装、真实跑分和专家金标 |
| G-05 | 内容质量金标准集 | 版本化金标、自动回归和人工裁决是发布前必需；模型互评不能独立放行 | `blocked-for-product` | `contracts/agent-quality/v1` | Schema、评测器和工程种子已实现；仍需教研维护人、双人复核/仲裁和正式阈值 |
| G-06 | 人工审核队列、权限和 SLA | 复用开发者控制舱与现有角色/审计；使用 LangGraph interrupt；不建第三套审核前端 | `accepted-for-spike` | ADR-0006、ADR-0009 | interrupt/resume、知识提案入口和完整个性化材料包审核入口已实现；仍需角色矩阵、正文最小暴露、超时升级和人员容量 |
| G-07 | 旧内容和旧标注迁移 | 不静默提升质量等级；旧结果保留版本和来源，按风险分为继续展示、标记未验证、批量重验或废弃 | `proposed` | 迁移 0029、0031 | 自动回填 `unverified_legacy` / `classified_legacy` 已实现；仍需真实资产盘点、兼容窗口和回滚演练 |

## 3. 已确定的架构边界

### 3.1 运行时不是业务事实源

LangGraph 可以决定下一个执行节点，但不能决定：

- 用户是否完成任务；
- 内容是否具有发布资格；
- 知识是否已掌握；
- 资产是否允许覆盖；
- 学习证据是否有效；
- 操作者是否有权限批准。

这些仍由领域命令、业务表、版本和证据规则决定。

### 3.2 不双重托管

同一动态工作流不能同时使用：

- 手写状态机主动推进；
- LangGraph 主动推进；
- DBOS durable workflow 主动推进。

迁移期间可以保留两个执行器做对照，但每个具体运行必须在创建时冻结唯一 `runtime_kind`，不能中途由两个执行器争抢。

### 3.3 不新建平行用户旅程

框架升级只扩展现有：

- 内容生成运行；
- Obsidian/学习资产整理运行；
- `matched_reading → micro_expression → wrap_up`；
- 开发者控制舱审核和运行观测。

不得创建“LangGraph 内容中心”“智能整理库”或第三个学习实验室。

## 4. G-01：LangGraph 转正式接受的判定

### 已选择

- Python LangGraph Graph API；
- `AsyncPostgresSaver`；
- 带运行类型前缀且持久化的业务运行 ID 作为 `thread_id`；
- Pydantic 契约作为图状态边界；
- PydanticAI 仅用于节点内部；
- 现有模型网关/调用账本保留；
- 自托管于现有 Worker。

### 明确不选

- 生产使用 `InMemorySaver`；
- LangGraph Store 替代学习者长期记忆；
- LangSmith Deployment 成为首版强依赖；
- 用 learner ID 作为共享 thread；
- 多 Agent 自由讨论后直接发布；
- DBOS 和 LangGraph共同恢复同一运行。

### Spike 交付物

1. `LearningObjectiveBundle → article → question → quality route → interrupt → resume → publish` 最小图；
2. `KnowledgeSourceRecord → extract → match → proposal → interrupt → commit` 最小图；
3. 与纯 Python 基线共享领域契约；
4. 每个节点前后故障注入；
5. checkpoint 数据检查和清理策略；
6. 图版本升级演练；
7. 延迟、数据库写入量和模型调用去重报告。

## 5. G-02：所有权和故障窗口

首批实现必须覆盖以下状态组合：

| 业务状态 | 图状态 | 允许动作 |
|---|---|---|
| `queued` | 无 checkpoint | Worker 可开始 |
| `running` | 有可继续 checkpoint | 当前租约所有者继续 |
| `running` | checkpoint 缺失/损坏 | 停止并进入技术审核，不从模型输出猜状态 |
| `awaiting_review` | 有 interrupt | 只允许审核、取消或超时升级 |
| `awaiting_review` | 无 interrupt | 对账异常，禁止直接批准 |
| `cancelled` | 任意 | 不允许新业务提交；可归档 checkpoint |
| `completed` | 任意未完成节点 | 业务完成门优先，禁止图继续写入 |
| `failed` | 可恢复 checkpoint | 只有受审计重试命令可恢复 |

任何自动修复都必须保留原状态、发现时间、修复命令和操作者。

## 6. 尚未冻结 Gate 的研究任务

### G-03 词典/词库

ADR-0011 已将 OEWN 2025 core + `wn` 冻结为第一离线 Spike 候选。OEWN 提供
版本化义项库存和永久 sense key，但不负责上下文消歧、中文教学释义或考研覆盖。
因此 G-03 仍为 `proposed`，不能把候选研究误写成产品选型。

候选对照必须回答：

- 是否允许商业产品和派生释义；
- 是否允许缓存、离线索引和展示例句；
- 是否有稳定 lemma/POS/sense ID；
- 是否覆盖考研常见熟词僻义、搭配和语域；
- 版本升级能否回放旧解释；
- 用户数据是否需要发送给第三方；
- 成本、限流、地区和下架要求。

在 Provider 冻结前，只实现 `LexicalProvider` 端口、测试 fixture、版本化引用契约
和隔离离线适配器。

### G-04 句法解析器

ADR-0011 已确定用 spaCy 与 Stanza 做同样本对照，且禁止运行时自动下载模型。
当前仓库只完成共同结果契约和评分器，没有安装模型或选择胜者。

候选对照至少评测：

- Python 3.13 和当前部署环境兼容性；
- 许可证和模型再分发；
- 长难句的主谓、从句、连接词和修饰跨度；
- token/字符偏移回映正确性；
- CPU 延迟、内存和批处理吞吐；
- 对解析歧义的置信度或替代结构支持；
- 模型升级后的回归可控性。

### G-05 金标准集

工程可以先建 Schema 和评测器，但正式阈值需要有权进行语言学/教研裁决的人员确认。首批金标至少包括：

- 文章目标覆盖和连贯性；
- 单选题唯一答案和干扰项机制；
- H1/H2 答案泄漏；
- 词义义项与搭配；
- 主句、从句、谓语和修饰范围；
- 阅读到表达的目标迁移；
- 整理 Agent 的原子知识边界、合并和冲突。

### G-06 人工审核

技术 Spike 使用现有 `developer_reviewer`，但正式产品必须另行确认：

- 谁可查看完整用户正文；
- 谁可批准内容发布、知识覆盖和冲突裁决；
- 是否需要语言教研角色与运维角色分离；
- 等待多久升级或终止；
- 审核人缺席时用户体验如何降级；
- 批量操作的二次确认和抽样复核；
- 审核成本和每日容量。

### G-07 旧数据迁移

旧资产先盘点并分层：

| 类型 | 默认处理 |
|---|---|
| 原始用户作答、笔记和不可变来源 | 保留，不重写 |
| 有准确来源跨度的标注 | 保留旧版本，标记验证器版本 |
| 只有模型解释、无可靠验证 | 标记 `unverified_legacy`，不得作为掌握证据 |
| 固定模板题或伪语法挑战 | 从正式训练资格中移除 |
| 已进入历史运行的内容 | 保留回放，不用于新运行 |
| 已人工确认的资产 | 保留确认事实，按新契约补齐来源关系 |

迁移不得静默改写历史结果，也不得因为新规则删除用户原文。

## 7. 决策推进顺序

1. G-01/G-02 最小 Spike、工程故障矩阵和本地运维基线：**已完成**；
2. G-03/G-04 候选研究和离线基准准备：**已完成**；真实 Provider 适配和同机
   跑分是下一工程阶段；
3. P2 受控个性化内容图接线：**已完成**。新材料只有在完整材料包通过确定性门并
   经人工审核后才进入既有训练链路；真实 Provider、专家金标和正式审核责任未冻结
   前，该结果只构成工程闭环，不构成正式发布质量声明；
4. G-05 金标 Schema 和工程种子：**已完成**；有权人员确认样本与阈值
   **待外部输入**；
5. G-06 技术审核入口：**已完成**；正式角色、正文政策、SLA 和人员容量
   **待外部输入**；
6. G-07 开发库盘点：**已完成**；真实环境盘点、兼容窗口和回滚演练
   **待目标环境**；
7. 只有 G-01 至 G-07 的正式发布阻断项全部关闭，才允许把新 Agent 流程标记为正式质量路径。

## 8. 本轮结论

最初的 v0.1 只完成架构决定，v0.2 完成领域工程基线，v0.3 完成运行时
故障矩阵、运维工具和 Provider 基准准备，v0.4 已把新个性化材料接入受控
LangGraph 工程路径并跑通人工审核和双实验室闭环，v0.5 完成知识整理真实业务
接线、人工审核、幂等提交和版本化 Obsidian 补丁，但尚未批准生产正式发布：

1. LangGraph 是动态 Agent 工作流的首选受控 Spike 运行时；
2. 引入 LangGraph 不改变 PostgreSQL 业务事实、现有领域状态机、Worker/Outbox 和模型调用账本的权威边界。

词典/解析器最终选型、金标人员、正式审核 SLA 和真实环境旧数据迁移仍保持显式
未关闭状态，不允许由实现者自行默认。

## 9. v0.3 实施证据与剩余边界

### 9.1 已完成

1. P0 训练门禁：
   - 新个性化材料生成后进入 `awaiting_review/semantic_review_required`，人工批准
     前不能启动训练；
   - 固定 A 模板题、字母交换“语法题”和缺少迁移契约的材料不能进入新训练；
   - 旧材料迁移后为 `unverified_legacy`；
   - 学习端明确显示“质量审核中”。
2. P1 契约和评测骨架：
   - 已定义目标包、版本化产物、质量报告、阅读证据、迁移契约；
   - 已定义来源记录、原子候选、变更提案和知识关系；
   - 工程种子已覆盖提示泄漏、语法跨度、词义拒答和双实验室断链。
3. G-01/G-02 Spike：
   - 已实现内容图和知识整理图；
   - 已使用 `interrupt()` / `Command(resume=...)`；
   - 已验证真实 `AsyncPostgresSaver` checkpoint 和同一 `thread_id` 恢复；
   - 已覆盖完整内容图 7 个节点、知识图 4 个节点的 before/after 故障矩阵，共
     22 个节点边界，并验证恢复时模型/提交幂等键不重复；
   - 已在关闭首个 saver 后用新 saver/新连接恢复同一 thread，证明进程内对象
     不是恢复前提；
   - 已验证未声明的 v1→v2 恢复会拒绝，只有显式兼容列表才允许旧 checkpoint
     进入新图；
   - 模型/发布回调使用幂等键，故障重放测试证明不会重复计费键；
   - checkpoint 建表是显式部署操作，不在应用启动时执行。
   - 已提供只读业务/checkpoint 对账、默认 dry-run 且需操作者与确认短语的清理
     命令，以及会自动删除基准线程的容量脚本。
4. P2 受控工程闭环：
   - 新建个性化材料冻结为 `runtime_kind=langgraph`，使用稳定业务
     `graph_thread_id` 和真实 `AsyncPostgresSaver`；
   - 已拆分目标包、文章、三道分层题、语法候选、迁移契约、表达任务、质量门、
     人工审核和发布节点；
   - 模型调用复用现有 `model_invocation_ledger`，恢复时按材料、组件和修订号去重；
   - 题目答案位置为 B/C/A，每题保存精确证据跨度和错误选项机制；语法替换增加
     等长硬门，避免进入既有高亮替换器后崩溃；
   - 每题保留生成并审核后的真实难度与公开解释；表达目标与目标包不一致时直接
     阻断，不允许只靠关联 ID 冒充教学迁移；
   - 人工批准前业务状态为 `awaiting_review/semantic_review_required`，训练启动被
     阻断；批准通过同一 thread 恢复，语法候选升级为带审核人和时间的
     `human_semantic_review/resolved`；
   - 审核恢复复用业务租约做原子领取，异常时释放，避免多个审核人并发恢复同一
     checkpoint；
   - 已通过真实控制 API 完成“生成候选—人工逐项审核—恢复发布—matched reading
     作答/标注/提示—阅读证据快照—micro expression—完成与复习证据回写”；
   - `revise` 支持文章、题库、语法标注和迁移契约范围，局部修订号进入幂等键，
     单元测试证明题库返工不会重做文章。
5. P3 工程边界：
   - 已实现词义和句法 Provider 端口、版本化缓存键、字符偏移回验、翻译对齐和低置信度拒答；
   - Provider 未冻结前，现有模型结果只显示“待验证建议”，本地兜底显示“已拒答/分析指引”。
   - ADR-0011 已记录 OEWN + `wn`、spaCy、Stanza 的候选边界；
   - 已提供 5 个工程种子、输入/结果 Schema 和统一离线评分器，能比较状态、
     sense key、词性、精确结构跨度和 p50/p95。
6. P4 双实验室：
   - 个性化阅读继续使用现有 `matched_reading → micro_expression`；
   - 推进时保存阅读证据快照；
   - 表达任务必须共享目标包和迁移契约，并绑定本轮标注、作答和提示证据。
7. P5 整理 Agent：
   - 现有移动/归档流程保留为 Inbox 归档职责；
   - 插件采用两阶段上传，只对服务端明确请求的来源发送范围受限全文和内容哈希；
   - 新运行使用真实 PostgreSQL LangGraph checkpoint、稳定业务 `thread_id` 和批量
     `interrupt/resume`，提交副作用只发生在人工决定之后；
   - Worker 故障使用同一 checkpoint 重试，三次后才进入终态失败；无可支持主张
     明确进入 `needs_more_context`，不会把空抽取伪装成成功；
   - 模型抽取使用 `model_invocation_ledger` 去重；确定性适配器仅用于离线工程验收，
     并同样执行逐字证据跨度校验；
   - 已实现不可变来源版本、多原子候选、字段级提案、人工审核、关系、Outbox，
     以及 `CREATE / MERGE / LINK / SUPERSEDE / MARK_CONFLICT / DISCARD / DEFER`
     七种显式动作；
   - `CREATE` 审核后进入既有学习资产和插件导出链路；写操作资产 ID、关系和
     Outbox ID 均可幂等重放；
   - `MERGE / SUPERSEDE / MARK_CONFLICT` 使用 `expected_asset_version` 和
     `APPEND_PATCH` 协议；插件先校验正文哈希，再按提案标记幂等追加，冲突时拒绝
     覆盖并保留 `pending_export`；
   - Inbox 移动只在知识审核提交后开放；回执同时保存实际目标路径，已移动来源
     不会在下一次整理中被重复处理。

### 9.2 仍然阻断正式发布

1. P2 的受控工程接线已经完成，但正式质量发布仍被阻断：当前确定性 fixture 和
   开发者人工审核只能证明工作流、证据门和恢复语义正确，不能替代 G-03/G-04
   真实 Provider、G-05 专家金标与 G-06 正式审核责任。未人工批准的材料继续不能
   进入训练。
2. G-01/G-02 工程故障矩阵已经完成，但尚缺生产影子流量接线、目标环境 SLO、
   真实长等待人工恢复、checkpoint 敏感数据/权限/备份/删除演练，因此状态仍为
   `accepted-for-spike`。
3. G-03/G-04 已形成候选 ADR 和离线评分管线，但尚未安装锁定的真实词典/句法
   artifact、完成权利核验和专家金标对照；不得把模型建议改名为已验证解释。
4. G-05 缺有权教研人员冻结样本与阈值，工程种子不能用于宣称准确率。
5. G-06 缺正式角色分离、正文暴露政策、SLA 和审核容量。
6. G-07 已完成当前开发库盘点，但缺真实环境数据盘点、兼容窗口和回滚演练。
7. P5 工程协议已经关闭原有 `MERGE` defer，但正式产品质量仍需真实 Obsidian
   Vault 的长时间断线/人工编辑冲突演练、真实模型影子流量、知识检索召回评测和
   有权审核人的冲突裁决样本；工程通过不得解释为知识内容已经教研认证。

### 9.3 本地运行证据

2026-07-25 在当前开发数据库执行，结果只用于工程容量基线：

- checkpoint 对账：业务图运行 0、checkpoint thread 0、异常 0；基准前分配存储
  73,728 bytes，完成基准、集成测试和逻辑清理后为 253,952 bytes；
- 25 次 interrupt/resume：每次 4 个 checkpoint；初始执行 p50 4.57 ms、
  p95 8.56 ms；恢复 p50 2.68 ms、p95 4.82 ms；分配存储增量
  376,832 bytes；模型调用 0；
- 基准完成后所有基准 thread 已清理；
- 旧数据盘点：`unverified_legacy` 个性化材料 6 个，`classified_legacy`
  整理运行 3 个，缺少新质量组件的旧材料 6 个；新契约实体当前均为 0。
- v0.5 验收：155 个单元测试、37 个集成测试和 7 个契约测试全部通过；learner
  Web 54 个测试、control cockpit 5 个测试通过，两个前端的类型检查和 lint
  均通过；Obsidian 插件 TypeScript 检查和生产构建通过；
- 整理 Agent 真实 PostgreSQL 验收覆盖：授权原文、多原子候选、人工审核、
  `CREATE` 导出、同规范键 `MERGE`、版本补丁、模型账本去重和审核幂等重放；
  四节点 before/after 故障矩阵覆盖 8 个恢复边界；
- 真实 PostgreSQL 闭环测试使用控制 API 完成人工审核，并继续跑完
  `matched_reading → micro_expression → wrap_up`；验收后 checkpoint 对账为业务
  图运行 0、checkpoint thread 0、异常 0。

`adelete_thread` 删除了可恢复记录，但 PostgreSQL 关系已分配空间不会因此自动缩小；
容量策略必须分别监控逻辑行数和物理关系大小。这些数字不能外推生产容量，也不
关闭真人、授权或正式迁移决策门。

### 9.4 验证命令

```bash
uv run pytest tests/unit -q
uv run pytest tests/integration -q
uv run mypy python services tests
uv run python scripts/benchmark_language_providers.py
uv run python scripts/audit_langgraph_checkpoints.py
uv run python scripts/cleanup_langgraph_checkpoints.py --operator local-audit
uv run python scripts/benchmark_langgraph_checkpoints.py --runs 25
uv run python scripts/inventory_agent_legacy_data.py
pnpm --filter @binnagent/learner-web typecheck
pnpm --filter @binnagent/learner-web test
```

上述验证不包含 OpenWiki 刷新；OpenWiki 继续由用户按仓库规则手动维护。
