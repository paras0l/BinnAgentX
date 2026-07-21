## 核心判断

这个项目不需要给 LLM 配一组通用的“搜索、数据库、HTTP、代码执行”工具，而应该建立一层**面向教学业务、类型明确、权限受限、能够回放的应用级 tools**。

关键点：单一职责、明确 schema、可观测、可失败

仓库已经把 `binnagent_agent/tools` 定义成“Agent 可调用的显式、可审计工具”边界，但目前目录里还只有说明，没有实际实现。 Agent runtime 的边界也已经写得很清楚：工作流负责长流程，tools 负责外部动作，gateways 隔离模型提供方，policies 负责预算与安全，且 Agent 包不能反向依赖 Web 路由。

因此建议采用：

```text
Workflow / Orchestrator
        │
        ▼
Tool Registry：根据阶段、角色、任务类型提供允许调用的工具
        │
        ▼
Tool Executor：权限、版本、幂等、预算、超时、审计、脱敏
        │
        ▼
Application Tool：完成一个完整业务能力
        │
        ├── Domain：状态机、领域命令、不变量
        ├── Gateway：模型、测量、第三方服务
        └── Port：数据库、内容库、复核队列、调度器
                     │
                     ▼
                  Adapter
```

关键原则是：

> **Tool 不是底层函数，也不是模型供应商调用；Tool 是一个完整、可审计的业务用例。**

例如 `ExpressionReviewGateway` 只是模型网关；真正给 Agent 调用的工具应该是 `expression.review_draft`，它内部完成任务读取、权限判断、预算判断、模型调用、Schema 校验、证据校验、成本登记和审计记录。

---

# 一、当前纵向切片最应该实现的 P0 tools

目前领域层已经有比较完整的任务状态、材料权利、作答版本、提示介入、修订链和匹配决定。  匹配策略也会保存候选集、选中版本、策略版本和理由码，适合直接成为确定性 decision tool。

建议第一版实现下面这些工具。

| Tool                                      | 类型                   | 职责                                    | 关键约束                                |
| ----------------------------------------- | -------------------- | ------------------------------------- | ----------------------------------- |
| `runtime.get_context.v1`                  | Query                | 读取 run、当前 task、学习者快照、预算、当前允许动作        | 按 learner/run 隔离；默认不返回完整作文          |
| `evidence.get_window.v1`                  | Query                | 获取最近任务的作答、提示依赖、标注、修订和难度反馈摘要           | 返回 evidence ref；原文只在具体模型工具内部读取      |
| `content.search_candidates.v1`            | Query                | 按任务类型、英一/英二、时长、难度、权利、是否见过筛选材料         | 必须先过 rights 和 difficulty gate       |
| `matching.select_material.v1`             | Decision             | 调用现有保守匹配器或表达迁移匹配器，产生 `MatchDecision`  | 确定性、带策略版本和理由码；不直接写数据库               |
| `content.get_surface.v1`                  | Query                | 获取当前分配材料的学习者可见版本、题目和任务要求              | 重查权利状态；剔除答案、审核信息和控制字段               |
| `reading.deliver_hint.v1`                 | Command              | 获取经过审核的 H1–H4，并原子记录 `AiIntervention`  | 必须已有用户作答；不能只读取提示而不留下介入事实            |
| `reading.analyze_selection.v1`            | Model                | 分析用户选中的词、短语、句子或段落                     | 精确 span 校验；只分析选区；不得回答阅读题            |
| `expression.deliver_priority_feedback.v1` | Model + Command      | 对表达 V1 给出最重要的一项反馈，并记录 intervention    | 反馈必须引用用户原文；不能提供成品答案                 |
| `expression.review_draft.v1`              | Model                | 生成逻辑镜像、学术表达、新闻简洁等对照版本                 | 只允许处理已经保存的 attempt；不能覆盖用户原文         |
| `revision.evaluate_and_record.v1`         | Rule/Model + Command | 对比 V1/V2，判断是否改善并写入 `RevisionEvent`    | 必须引用两个 attempt；低置信度进入人工复核           |
| `workflow.advance.v1`                     | Command              | 验证当前任务完成，确定下一阶段，匹配材料，创建下一任务并原子落库      | run 更新、task 创建、事件、Outbox、审计、幂等必须同事务 |
| `workflow.replace_material.v1`            | Command              | 处理“材料见过”或“内容撤回”，选择并分配替代材料             | 只接受规定 reason code；旧分配不能覆盖删除         |
| `workflow.reserve_next_task.v1`           | Command              | 收尾阶段根据当前缺口和到期任务创建下一任务占位               | 必须给出可解释 reason code                 |
| `workflow.complete.v1`                    | Command              | 检查 difficulty feedback、占位任务和阶段事实后完成运行 | 不允许跳过 `completion_gaps`             |
| `workflow.pause_for_review.v1`            | Command              | 遇到低置信度、评分冲突、权利问题时创建复核单并暂停             | 不允许 Agent 自行猜测后继续                   |
| `review.resolve_case.v1`                  | Control Command      | 控制端批准、修正、拒绝复核结果并恢复流程                  | 仅 reviewer/control 权限；必须记录理由和版本     |

现有纵向切片要求下一任务只能由当前任务完成事实和运行阶段共同触发，并要求任务创建、run 更新、事实、审计、Outbox 和幂等记录原子提交。  因此 `workflow.advance` 应当是一个高层 command tool，不能把 `create_task`、`save_run`、`append_event` 分别暴露给模型。

## 不应当变成 Agent tool 的用户行为

下面这些仍应是学习者本人触发的 API command，而不是 Agent tool：

* `save_attempt`
* `add_annotation`
* `submit_difficulty_feedback`
* `end_task_early`
* 用户显式修改学习目标或偏好

Agent 可以读取这些事实，但不能代替用户创建这些事实，否则会污染“独立作答”和“学习证据”。

---

# 二、P1：连续训练需要补充的 tools

产品文档要求后续 Agent 处理局部知识状态、反复错误假设、到期复习、外部词汇记录、迁移和阶段准备度。 学习者模型还必须区分原始证据、用户输入和系统推断，并保存证据数量、新鲜度、独立程度与不确定性。

这些工具建议采用“候选更新 → 确定性验证 → 提交”的三段式，而不是让模型直接改学习者状态。

## 1. 学习者状态

| Tool                              | 职责                          |
| --------------------------------- | --------------------------- |
| `learner_state.get_snapshot.v1`   | 获取某个时间点的可重算学习者状态快照          |
| `evidence.assess_strength.v1`     | 根据未见、独立、提示等级、延迟、限时等计算证据强度   |
| `learner_state.propose_patch.v1`  | 根据 evidence refs 生成候选状态变更   |
| `learner_state.validate_patch.v1` | 验证是否有足够证据、是否跨越过多状态、是否引用有效材料 |
| `learner_state.commit_patch.v1`   | 只提交通过验证的字段，并保留前后差异与证据引用     |

必须禁止类似：

```text
learner_state.set_mastered(word="...")
learner_state.set_level(level="advanced")
```

模型只能提出候选变更，不能直接写“已掌握”“能力提升”。

## 2. 错误假设

| Tool                            | 职责                     |
| ------------------------------- | ---------------------- |
| `hypothesis.list_active.v1`     | 获取当前待验证、确认、改善中的错误假设    |
| `hypothesis.propose.v1`         | 从重复错误中提出待验证假设          |
| `hypothesis.attach_evidence.v1` | 添加支持或反对证据              |
| `hypothesis.plan_validation.v1` | 生成验证任务约束，而不是直接生成答案     |
| `hypothesis.transition.v1`      | 在证据达到门槛后变更为确认、改善、推翻或复查 |

例如“无原文证据过度推断”应当先进入 `pending_validation`，在不同未见材料中重复出现后才能提高置信度。

## 3. 复习与训练计划

| Tool                                | 职责                          |
| ----------------------------------- | --------------------------- |
| `schedule.list_due_items.v1`        | 查询到期的词汇、语法、迁移和延迟复写          |
| `schedule.plan_delayed_transfer.v1` | 为当前证据安排新材料、延迟、少提示验证         |
| `planner.rank_targets.v1`           | 根据阶段、影响、证据不足和到期压力排序 1–3 个目标 |
| `planner.build_cycle.v1`            | 生成周训练周期和任务路径                |
| `planner.rebalance_cycle.v1`        | 用户时间变化或完成量变化后重新安排，但保持主线     |
| `progress.build_stage_report.v1`    | 生成带证据、不确定性和限制说明的阶段报告        |
| `stage.assess_readiness.v1`         | 根据规则和测量状态判断阶段准备度            |
| `stage.apply_transition.v1`         | 高风险阶段切换；证据不足时要求人工批准         |

## 4. 外部词汇工具

| Tool                                      | 职责                           |
| ----------------------------------------- | ---------------------------- |
| `vocabulary.import_recent_records.v1`     | 接收用户授权的第三方记录，保存原始来源和证据等级     |
| `vocabulary.get_transfer_queue.v1`        | 按新近程度、考研价值、错误频率和材料自然度选择待验证词义 |
| `vocabulary.record_context_validation.v1` | 记录阅读、翻译或表达中的真实验证证据           |
| `vocabulary.export_review_list.v1`        | 输出给外部背词工具的复习清单               |
| `vocabulary.reconcile_duplicates.v1`      | 合并词形变体、目标词义和重复来源             |

第三方的“已学习”“已复习”只能触发验证任务，不能直接覆盖本系统知识状态。

---

# 三、P2：测量与 IRT/CAT tools

IRT/CAT 应继续作为独立测量服务，不应混入普通训练匹配。项目技术路线也明确要求 Agent 不能用语言模型判断直接修改 IRT 能力值。

建议将来只提供下面这些窄接口：

```text
measurement.start_session.v1
measurement.select_next_item.v1
measurement.record_scored_response.v1
measurement.get_snapshot.v1
measurement.should_stop.v1
measurement.close_session.v1
```

约束：

* 只接受已标定题目；
* 只接受合格评分器产生的结果；
* 每个结果绑定量表版本、题目参数版本和施测条件；
* 普通练习、见过的材料、模型自由评分不能进入 θ 更新；
* 在真人标定和效度条件完成前，仅运行 shadow mode；
* 永远不提供 `measurement.set_theta` 之类的直接写工具。

---

# 四、内容生产应使用独立的 Control-plane Tool Registry

当前内容生成已经形成“生成 → 独立审核 → 确定性校验 → 重试/发布门”的结构，审核结果也有结构化评分和阻断条件。 这套能力不要与学习者运行时 tools 混在一个 registry 中。

建议单独建立：

```text
content_ops.generate_candidate.v1
content_ops.review_candidate.v1
content_ops.validate_candidate.v1
content_ops.create_revision.v1
content_ops.publish_version.v1
content_ops.withdraw_version.v1
content_ops.open_rights_case.v1
```

权限边界：

* `generate_candidate` 只能创建候选内容；
* `review_candidate` 不能是同一次生成调用；
* `validate_candidate` 执行 Schema、答案唯一性、证据跨度、提示泄露和内容完整性检查；
* `publish_version` 只能发布已通过审核和确定性校验的不可变版本；
* 学习者 runtime registry 永远不能拿到 `publish`、`withdraw` 或 rights override 权限。

当前 `agents/content_generator.py` 和 `content_reviewer.py` 中与供应商、HTTP、Prompt 拼装相关的部分，长期更适合下沉到 `gateways/`；Agent/workflow 只依赖上述内容能力工具。

---

# 五、统一 Tool Contract

建议所有工具使用同一种上下文和返回信封。

```python
from datetime import datetime
from decimal import Decimal
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ToolContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trace_id: str
    workflow_run_id: str
    learner_id: str
    actor_type: Literal[
        "orchestrator",
        "learner",
        "system",
        "developer_reviewer",
    ]
    permission_scopes: frozenset[str]

    expected_run_version: int | None = None
    expected_task_version: int | None = None
    idempotency_key: str | None = None
    invocation_key: str
    deadline_at: datetime


class EvidenceRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_type: str
    entity_id: str
    version: int | None = None
    content_hash: str | None = None


class ToolResult(BaseModel, Generic[T]):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0.0"] = "1.0.0"
    status: Literal[
        "succeeded",
        "rejected",
        "review_required",
        "retryable_error",
        "terminal_error",
    ]

    data: T | None = None
    reason_codes: list[str] = Field(default_factory=list)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)

    version_before: int | None = None
    version_after: int | None = None
    side_effect_ids: list[str] = Field(default_factory=list)

    used_fallback: bool = False
    estimated_cost_usd: Decimal = Decimal("0")
    actual_cost_usd: Decimal = Decimal("0")
    latency_ms: int = 0

    audit_event_id: str | None = None
    retryable: bool = False
```

每个 `ToolSpec` 还应声明：

```text
name
version
query / decision / command / model
risk_level
allowed_actor_types
allowed_run_stages
allowed_task_types
required_permission_scopes
requires_expected_version
requires_idempotency_key
requires_human_approval
timeout_seconds
max_calls_per_run
fallback_policy
input_schema
output_schema
```

不要让工具通过自然语言描述自己的权限；权限必须是代码中的确定性元数据。

---

# 六、Tool Executor 应统一处理的事情

调用顺序建议固定为：

```text
1. 解析并验证 Pydantic 输入
2. 校验 actor、learner scope 和 permission scope
3. 校验当前 run stage、task type 和允许动作
4. 校验 expected_version
5. 获取幂等锁或 model invocation reservation
6. 检查调用次数、费用、超时和内容权利
7. 执行 tool
8. 校验输出 Schema、引用跨度和领域不变量
9. 原子提交业务事实、审计和 Outbox
10. 生成脱敏 trace
11. 返回 ToolResult
```

现有模型预算策略已经支持调用次数、费用上限和确定性降级，可以直接成为 executor middleware。

还应增加一个 `model_invocation_key`：

```text
hash(
  tool_name,
  tool_version,
  workflow_run_id,
  task_id,
  task_version,
  input_content_hash,
  prompt_version
)
```

这样用户重试、Worker 重启或网络超时不会重复产生远程费用。当前模型分析和表达复盘相关逻辑仍散落在路由中；抽入统一 executor 后，才能一致处理预算、重复调用、成本和审计。

---

# 七、建议的目录结构

```text
python/binnagent_agent/tools/
  __init__.py
  contracts.py             # ToolContext、ToolResult、ToolSpec
  registry.py              # 按角色/阶段生成 allowlist
  executor.py              # 权限、幂等、预算、审计中间件
  errors.py
  ports.py                 # RunStore、TaskStore、ContentCatalog 等协议

  runtime_context.py
  evidence.py
  content.py
  matching.py
  reading.py
  expression.py
  revision.py
  workflow.py
  review_queue.py

  learner_state.py
  hypotheses.py
  scheduling.py
  vocabulary.py
  progress.py
  measurement.py

  content_ops/
    generation.py
    review.py
    publication.py

  testing/
    fakes.py
    fixtures.py
    assertions.py
```

实现适配器可以保留在服务层：

```text
services/api/binnagent_api/adapters/
  sqlalchemy_task_store.py
  sqlalchemy_run_store.py
  local_content_catalog.py
  model_invocation_ledger.py
  review_queue.py
```

依赖方向是：

```text
binnagent_agent/tools 依赖 Protocol + binnagent_domain
services/api 提供 Protocol 的 SQLAlchemy/本地文件实现
API route 只负责认证、HTTP 映射和 presenter
```

现有代码可以这样映射：

| 当前实现                          | 新位置/角色                                       |
| ----------------------------- | -------------------------------------------- |
| `LocalContentCatalog`         | `ContentCatalogPort` 的 adapter               |
| `ConservativeMaterialMatcher` | `matching.select_material` 的确定性实现            |
| `VerticalSliceRepository`     | `TaskStorePort` adapter                      |
| `VerticalSliceRunRepository`  | `RunStorePort` adapter                       |
| `AnnotationAnalysisGateway`   | `reading.analyze_selection` 的内部依赖            |
| `PriorityFeedbackGateway`     | `expression.deliver_priority_feedback` 的内部依赖 |
| `ExpressionReviewGateway`     | `expression.review_draft` 的内部依赖              |
| `run_routes.py` 中的推进逻辑        | `workflow.advance`                           |
| `routes.py` 中预算、模型、审计逻辑       | Tool Executor middleware                     |

当前公共 Agent API 主要还是三个模型网关和预算策略，这也说明应用级 tools 尚未真正建立。

---

# 八、不要提供这些通用工具

生产环境 Agent registry 中不应出现：

```text
sql.query
database.execute
http.request
filesystem.write
python.execute
shell.run
model.chat
learner_state.set
measurement.set_theta
content.publish_unchecked
task.create_arbitrary
```

原因是这些工具会绕开领域状态机、权限、权利门、版本控制和审计。

尤其不能把以下动作交给模型自由决定：

* 直接写数据库；
* 直接修改学习者等级；
* 把 AI 输出记为用户证据；
* 跳过用户首次作答；
* 直接选择 H4 或显示答案；
* 因一次表现写入“稳定掌握”；
* 直接更新 IRT 能力值；
* 发布未经独立审核的新内容；
* 在普通日志中记录完整作文、Prompt 或模型推理。

项目现有工程规范已经要求 AI 不能直接成为能力证据、稳定掌握必须引用独立或延迟证据、重试不能重复远程扣费、日志不能记录完整正文和模型思维过程。

---

# 九、最合理的落地顺序

第一批先建立：

```text
contracts.py
ports.py
registry.py
executor.py
runtime.get_context
reading.analyze_selection
expression.deliver_priority_feedback
expression.review_draft
```

第二批把路由中的编排逻辑抽出：

```text
content.search_candidates
matching.select_material
reading.deliver_hint
revision.evaluate_and_record
workflow.advance
workflow.replace_material
workflow.reserve_next_task
workflow.complete
```

第三批补齐：

```text
model invocation 幂等账本
pause_for_review / resolve_case
独立的 learner-runtime 与 content-ops registry
故障注入和轨迹测试
```

最后再进入：

```text
learner_state
error_hypothesis
review_schedule
external_vocabulary
stage_readiness
shadow measurement
```

其中最优先的架构改动不是增加更多模型 Prompt，而是把当前路由中分散的“读取状态—校验—调用模型—记账—写审计—推进流程”收敛为统一 Tool Executor 和少量高层业务工具。这样 Agent 才能在不绕开领域规则的前提下真正参与编排。
