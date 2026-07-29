# LongCat 核心 Agent 稳定性测试记录

## 1. 测试信息

- 日期：2026-07-29
- Provider：LongCat
- 模型：`LongCat-2.0`
- 接口：OpenAI-compatible Chat Completions
- 目标：在额度到期前验证核心生产适配器的成功率、结构化输出稳定性与延迟，并修复可复现问题。
- 判定：HTTP 200 不等于成功；只有最终内容可解析、通过 Pydantic 契约且未触发既有证据/质量门，才计为成功。

测试脚本：

```bash
uv run python scripts/stress_longcat_core_agents.py --rounds 2
uv run python scripts/stress_longcat_core_agents.py \
  --rounds 2 \
  --agent personalized_assessment
uv run python scripts/stress_longcat_core_agents.py \
  --rounds 0 \
  --content-rounds 1
uv run python scripts/stress_longcat_core_agents.py \
  --rounds 0 \
  --workflow-content-rounds 3 \
  --content-kind micro
```

脚本只读取现有 LongCat 配置，不输出 API Key；可用 `--output` 保存脱敏 JSON 报告。

## 2. 覆盖范围与最终结果

最终回归证据由修复后的最近轮次组成，共 14 次，14 次成功：

| Agent | 次数 | 成功率 | P50 延迟 | 最大延迟 |
|---|---:|---:|---:|---:|
| Obsidian Inbox 分类 | 2 | 100% | 5.27 s | 8.50 s |
| 表达单项反馈 | 2 | 100% | 6.02 s | 6.16 s |
| 阅读划词分析 | 2 | 100% | 9.51 s | 9.60 s |
| 表达三风格复核 | 2 | 100% | 18.37 s | 19.36 s |
| 个性化阅读生成 | 2 | 100% | 11.29 s | 11.53 s |
| 个性化出题与迁移任务 | 2 | 100% | 55.85 s | 57.36 s |
| 内容材料生成 | 1 | 100% | 59.20 s | 59.20 s |
| 内容独立审核 | 1 | 100% | 20.29 s | 20.29 s |

继续扩展后的最终并发矩阵为 36/36 成功，覆盖 18 个 Agent/场景：

| 领域 | 覆盖结果 |
|---|---:|
| Inbox 标准、25 条批量、Prompt 注入 | 6/6 |
| 表达单项反馈 Adapter 与生产 Gateway | 4/4 |
| 句级划词、词义划词与生产 Gateway | 6/6 |
| 表达三风格复核 Adapter 与生产 Gateway | 4/4 |
| 个性化阅读与个性化出题 | 4/4 |
| 知识抽取、原子知识抽取、资产写入门 | 6/6 |
| 知识 Prompt 注入、仅 Agent hint 两类拒绝场景 | 6/6 |

其他专项：

- 三个知识 Agent 修复后真实调用 9/9 成功；
- Inbox/知识 Prompt 注入专项 20/20 成功；
- 生产 Gateway 首轮压测：单项反馈 5/5，划词分析 5/5；
- 表达复核在增加专用超时和描述字段归一化后，Adapter 10/10，最终并发矩阵 Gateway 2/2；
- 微表达完整生成/审核/修订工作流 3/3 成功，43.25–46.79 秒；
- 阅读材料完整工作流修复后 1/1 成功，215.48 秒；
- 等级评估 Agent 随机边界测试 20,000/20,000 成功，四个等级均被覆盖。

五轮全量 soak：

- 共 90 次真实调用，88 次模型结果通过，模型直出成功率 97.78%；
- 16/18 个 Agent/场景为 5/5；
- 表达复核 Gateway 修复后为 5/5；
- 划词分析 Gateway 为 4/5，1 次结构偏差被安全 fallback 拒绝；
- 个性化出题 Adapter 为 4/5，1 次在两次长请求后均发生 Provider 断连；
- 个性化出题 P50 55.89 秒，断连样本耗时 286.86 秒；
- 标准划词 Adapter 有一次 142.98 秒长尾，但生产 Gateway 的 20 秒边界会安全回退。

说明：

- 内容材料生成覆盖文章、4–6 道题、语法挑战、四级提示、平行重构与可迁移表达。
- 内容独立审核覆盖事实自洽、唯一可答、逐字证据、难度、题型多样性和提示递进。
- 个性化出题仍是最慢的交互，当前应按后台材料准备链路管理，不应按轻量反馈 Agent 的延迟预期展示。

## 3. 发现的问题与修复

### P1：LongCat 思考模式耗尽 final 输出预算

初始表现：

- 表达三风格复核 0/2 成功；
- 阅读划词分析 1/2 成功；
- 返回 HTTP 200，但 `message.content` 为空；
- 单次延迟约 21–39 秒，已经超过交互链路原有 20 秒模型超时。

修复：

- 对结构化生成、划词分析、表达复核和内容审核关闭 LongCat thinking；
- 保留现有 Schema、Pydantic、证据引用和质量门；
- LongCat 官方接口明确支持 `thinking.type=disabled`，且将其定义为更节省输出 token 的模式。

回归：

- 划词分析 3/3 后续成功；
- 表达三风格复核 3/3 后续成功；
- 最近两轮均为 2/2 成功。

### P1：个性化出题输出预算不足

初始表现：

- 2600 token 预算下会截断在第三条语法候选，缺失 `transfer`；
- 也会出现每题只生成 3 条 hints，导致整个结果被拒绝；
- 扩大字段长度后仍不能解决被截断的完整对象。

修复：

- 将 `personalized_reading.assess` 的专用输出预算从 2600 提高到 5000；
- 提示明确要求每题恰好 4 条 hints；
- 对 LongCat 已观察到的 3-hint 旧形状补充一个不泄露答案的范围检查提示；
- 对重复键 `question_type_type` 做确定性兼容迁移；
- 合理扩大逐字语法证据片段和论证动作描述上限，后续逐字证据、等长替换与质量门保持不变。

回归：

- 最终专项 2/2 成功，P50 55.85 秒；
- 未再出现截断、缺少 transfer 或 hint 数量不足。

### P1：内容生成的 JSON 与语法本体不稳定

初始表现：

- 一次结果在约 8 KB 处出现 JSON 语法错误；
- 关闭 thinking 后响应从超时降到约 52–59 秒，但模型生成了不存在的
  `contrast_rather_than.v1`。

修复：

- 增加 strict-first JSON 解析：先用标准库解析，仅在语法错误时调用 `json-repair`；
- 修复后的对象仍必须通过原有 Pydantic 和内容质量门，修复器不能直接放行；
- 将现有语法本体的 canonical construction IDs 注入生成 Schema 的 enum，模型只能从既有领域本体选择；
- 未创建平行语法分类或旁路审核流程。

回归：

- 内容生成 1/1 成功，59.20 秒；
- 随后的独立审核 1/1 成功，20.29 秒。

### P2：Provider 瞬时断连

表现：

- 个性化出题曾在 166 秒时收到 `RemoteProtocolError: Server disconnected without sending a response`；
- 同配置下一轮 40 秒成功，判定为 Provider 瞬时传输故障。

修复：

- LongCat 异步生产适配器对传输错误、429 和 5xx 增加一次有界重试；
- 400/401/403 等非瞬时错误不重试；
- 增加先断连、第二次成功的自动化测试。

### P1：三个知识 Agent 在 LongCat 下不可用

初始表现：

- 知识抽取、原子知识抽取、学习资产写入门真实调用 0/3；
- 均返回 `UnexpectedModelBehavior: Exceeded maximum output retries (0)`；
- 个性化材料链路显式跳过知识抽取，另外两条链路只能回退或失败。

修复：

- 新增 LongCat 原生 prompted-output Provider 适配器；
- 继续复用 `KnowledgeExtraction`、`AtomicKnowledgeExtraction` 和
  `AssetWriteGateOutput` 既有契约；
- 输出继续进入既有 source-title 约束、逐字 evidence 校验、写入门、
  invocation ledger 和知识组织状态机；
- 未建立独立知识工作区或旁路持久化。

回归：

- 三个 Agent 真实调用 9/9 成功，P50 2.24–3.51 秒；
- 仅 Agent hint 场景 6/6 未被提升为学习者知识；
- Prompt 注入专项 20/20 未改写 source_title/context_id，也未宣称学习者已掌握。

### P1：内容生成 Agent 与审核 Agent 的契约冲突

初始表现：

- 阅读材料完整工作流连续 2/2 在三次修订后仍失败，单轮约 4.8 分钟；
- 审核 Agent 要求保留源材料的图书馆主题与事实；
- 生成 Agent 的既有契约却要求只使用题材标签、生成全新主题和事实。

修复：

- 审核 Agent 不再接收源正文，只接收难度和生成边界摘要；
- 明确禁止审核 Agent 要求候选复刻源主题、人物、事实或论证路径；
- 原创性继续由既有确定性相似度 validator 负责；
- 放宽仅用于草稿接收的语法 hint 上限，最终材料仍由工作流归一化到正式 200 字符契约。

回归：

- 阅读材料完整工作流 1/1 成功；
- 生成、独立审核、按反馈修订、内容契约和原创性门均实际执行。

### P1：表达三风格复核的生产超时过短

初始表现：

- Adapter 在关闭 thinking 后通常需要 15–25 秒；
- 生产 Gateway 仍使用全局 20 秒超时，首轮只有 2/5 模型结果通过；
- 另外观察到 `thinking_difference` 偶发超过 800 字符。

修复：

- 增加表达复核专用 30 秒超时与 2000 token 上限；
- Gateway、ToolContext 和 Adapter 共用同一专用配置；
- 仅对原文摘录、差异说明、标签、说明数组等描述字段做有界归一化；
- 三种风格必须齐全、原文摘录必须来自学习者草稿等核心门保持不变。

回归：

- Adapter 连续 10/10 通过，最大 25.00 秒；
- 最终全量并发矩阵中的生产 Gateway 2/2 通过。

### P2：微表达生成的草稿约束与正式契约不一致

表现：

- `signal_terms` 草稿上限为 8，正式内容 Schema 上限为 12；
- `optional_active_resource` 和部分描述字段在进入现有归一化前被过早拒绝；
- 单次 Adapter 仍可能漏掉 `parallel_transfer`。

修复：

- 草稿 `signal_terms` 上限与正式契约统一为 12；
- 允许长描述先进入既有 `_normalize_text`，最终正式契约上限不变；
- 缺少必填业务字段时不伪造内容，继续交给现有三次生成/审核/修订链路重试。

回归：

- 微表达完整工作流连续 3/3 成功。

### P1：个性化出题的双重 Provider 断连

表现：

- 五轮 soak 中 1/5 在原请求和一次有界重试中均遇到 `RemoteProtocolError`；
- Adapter 最终失败耗时 286.86 秒；
- 原应用服务只对契约/确定性质量错误启用题包 fallback，传输异常会让材料任务失败。

修复：

- `_cached_personalized_assessment` 现在也对传输错误、HTTP 错误和 Timeout 使用既有
  `deterministic_assessment`；
- fallback 仍基于同一篇已生成文章和同一个冻结目标包；
- 继续记录 `assessment_deterministic_fallback` 事件和具体 reason code；
- 新增 Provider 断连后进入既有 fallback、完成 invocation 的自动化测试。

回归：

- Adapter soak 仍保留 4/5 的真实 Provider 结果，未掩盖上游不稳定；
- 应用层双断连会返回可验证题包，不再使整个个性化材料任务失败。

## 4. 自动化验证

相关自动化测试：

- `tests/unit/test_model_adapters.py`
- `tests/unit/test_content_agents.py`
- `tests/unit/test_structured_output.py`
- `tests/unit/test_personalized_package.py`

执行：

```bash
uv run ruff check \
  python/binnagent_agent/agents/structured_output.py \
  python/binnagent_agent/agents/content_generator.py \
  python/binnagent_agent/agents/content_reviewer.py \
  services/api/binnagent_api/model_adapters.py \
  tests/unit/test_content_agents.py \
  tests/unit/test_model_adapters.py \
  tests/unit/test_structured_output.py \
  scripts/stress_longcat_core_agents.py

uv run pytest -q \
  tests/unit/test_structured_output.py \
  tests/unit/test_content_agents.py \
  tests/unit/test_model_adapters.py \
  tests/unit/test_personalized_package.py

uv run pytest -q tests/unit
```

结果：Ruff 通过；相关专项测试通过；完整单元测试 182/182 通过；
知识组织与内容生成相关集成测试 16/16 通过。

## 5. 剩余风险

- 36/36 短回归、90 次 soak 和各专项结果是工程稳定性证据，不代表长期 SLA，
  也不替代教师金标质量评测。
- LongCat 在高并发时有明显尾延迟；个性化出题和内容生成应继续走现有后台材料准备/任务状态链路。
- 一次有界重试只能吸收瞬时断连；持续 429、5xx 或超时仍应由现有失败/重试/人工审核链路处理。
- JSON repair 只处理传输后的语法损坏，任何缺字段、错误证据、未知本体 ID 或质量不达标结果仍会被拒绝。
- 表达复核曾出现一次安全 fallback；最终矩阵已通过，但仍应持续观察长期模型直出成功率，
  不应把 fallback 计成高质量模型结果。
- 五轮 soak 证明 LongCat 存在分钟级尾延迟和极少量双断连；生产稳定性必须按
  “模型直出率 + 安全 fallback 后任务完成率”分别观测。
- 本次没有运行或刷新 OpenWiki；如需同步生成页，由维护人手动执行。
