# ADR-0006：动态 Agent 工作流采用 LangGraph 的受控引入

> 状态：accepted-for-spike  
> 日期：2026-07-25  
> 决策所有者：项目负责人  
> 适用范围：个性化内容生产、质量定向返工、知识整理、人工复核和阅读—表达迁移编排

## 背景

现有 BinnAgentX 已经使用显式 Python 领域状态机、PostgreSQL 业务运行表、模型调用账本、Outbox、Worker 租约和审计记录，能够完成固定顺序的运行与基础故障恢复。但文章—题目—标注—表达内容包、知识整理和质量驱动返工包含：

- 根据质量缺陷进入不同修复节点；
- 只重做失败组件；
- 在低置信度、冲突和高风险操作前暂停人工审核；
- 跨进程重启、数小时或数天后恢复；
- 查看节点历史并对失败版本进行开发回放；
- 使用同一业务运行 ID 维持执行连续性。

继续只用手写状态机可以实现这些能力，但会重复建设 checkpoint、动态分支、暂停恢复和节点历史。DBOS 更适合固定步骤的耐久函数；Temporal 的独立基础设施和运维成本暂时超过当前模块化单体所需。

仓库当前没有 LangGraph 依赖，也没有完成同契约故障注入对照，因此不能直接将其标记为正式生产依赖。

## 决策

### 1. 目标运行时

LangGraph 被选为动态 Agent 工作流的首选运行时，进入受控技术 Spike。通过本文验证门后，可逐工作流转为 `accepted`，不要求一次迁移全部任务。

首批 Spike 只覆盖：

1. 个性化内容包的“目标—文章—题目—标注—表达—质量返工”；
2. 知识整理的“来源—抽取—检索—变更提案—人工确认—提交”。

普通同步、导入、导出、固定报表和无动态分支的后台任务不迁入 LangGraph。

### 2. 业务状态机先于图

领域包继续定义：

- 允许的状态和转换；
- 命令、事件和不变量；
- 权限、预期版本和幂等键；
- 质量缺陷代码和允许的修复范围；
- 发布、完成和学习证据门槛。

LangGraph 只编排这些领域能力，不得在图节点中复制第二套业务规则。图结构变化不能自动改变业务状态含义。

### 3. 持久化方式

生产候选使用 `AsyncPostgresSaver`，不使用 `InMemorySaver`。检查点表与业务表位于同一 PostgreSQL 集群的独立 Schema，并使用受限数据库角色：

- checkpointer 只能管理运行时检查点；
- 领域服务只能通过现有仓储写业务事实；
- LangGraph Store 不作为长期学习者记忆；
- 长期学习资产、学习证据和用户画像继续保存于现有业务表。

`thread_id` 使用带运行类型前缀的稳定业务运行 ID，并在创建业务运行时一并保存：

| 工作流 | `thread_id` |
|---|---|
| 完整内容包生产 | `content_pack:{job_id}` |
| 个性化内容生产 | `personalized-content:{material_id}` |
| 知识整理 | `knowledge-organization:{run_id}` |
| 阅读—表达迁移 | `learning_run:{workflow_run_id}` |

图名、图版本和用途必须进入 checkpoint namespace 或运行元数据。禁止用 `learner_id` 直接作为 `thread_id`，禁止重新创建运行时临时生成 thread ID，避免不同任务共享状态或恢复时找不到原线程。

### 4. 节点实现

- 节点输入输出使用版本化 Pydantic 契约；
- PydanticAI 可用于节点内部的模型调用和工具参数校验；
- 所有模型调用仍经过统一模型政策、预算、超时、审计和调用账本；
- 规则校验、词典、句法解析、独立求解器和领域命令作为明确工具；
- 节点只保存结构化动作、证据和结果，不保存模型隐藏思维链；
- 不采用多个自由 Agent 互相协商后直接提交业务结果。

### 5. 人工介入

人工复核使用 `interrupt()` 和同一 `thread_id` 的 `Command(resume=...)`。由于恢复时节点会从头执行：

- 非幂等副作用必须放在独立提交节点；
- `interrupt()` 前只能执行纯计算、读取或幂等 upsert；
- 审核请求必须使用稳定 ID；
- 恢复输入必须是 JSON 可序列化、带审核人、决定、理由和预期版本的结构；
- 拒绝、编辑、批准和请求更多信息必须进入领域命令与审计；
- 暂停期间不长期占用 Worker 租约或数据库连接。

### 6. 部署边界

首版自托管在现有 Python Worker 进程中，不要求 LangSmith Deployment，也不把 LangSmith 作为业务依赖。Langfuse/OpenTelemetry 继续承担现有模型和运行观测；若使用 LangGraph Studio，只限本地开发和受控调试。

### 7. 与 DBOS 的边界

同一动态业务工作流不能同时由 LangGraph 和 DBOS 托管。未来若引入 DBOS，只用于固定、耐久、边界明确的后台任务，并通过命令、事件和 Outbox 与 LangGraph 工作流协作。

## 替代方案

### 继续扩展手写 Python 状态机

优点是依赖少、语义完全可控；缺点是需要自行实现 checkpoint、暂停恢复、历史回放和动态图调试。保留为 Spike 对照和紧急回滚实现。

### DBOS + PydanticAI 承载全部 Agent

DBOS 对固定步骤、函数级 durable execution 和数据库事务很强，也能包装 PydanticAI Agent；但本项目的核心升级需要显式质量路由、局部返工、可视图状态和复杂人工审核。DBOS 保留在固定工作流候选，不承载同一动态图。

### Temporal

Temporal 的长周期耐久执行和运维能力成熟，但需要新的服务、部署和团队知识。只有 LangGraph Spike 在恢复正确性、规模或运维上不满足门槛时再做 PoC。

### 多 Agent 协商框架

不采用。它会弱化领域不变量、证据边界和质量返工的确定性。

## 后果

正面影响：

- 动态质量循环和人工复核获得明确运行时；
- 检查点与长期学习者状态保持分离；
- 可逐节点故障注入、恢复和回放；
- 领域状态机和模型供应商继续可替换；
- 不需要新增独立编排服务。

代价与风险：

- 新增 LangGraph 及 PostgreSQL checkpointer 依赖；
- checkpoint 存储需要清理、加密、访问控制和容量监控；
- 图版本升级必须处理仍在运行或暂停的旧线程；
- `interrupt()` 恢复会重跑节点，副作用设计不当会重复；
- PydanticAI、现有模型账本与 LangGraph retry 的重试层级可能叠加；
- 当前 LongCat 与 PydanticAI prompted output 已存在协议兼容问题，不能默认所有供应商均可作为节点模型。

## 验证证据

转为 `accepted` 前必须在同一领域契约下完成：

1. 纯 Python/PostgreSQL 基线与 LangGraph Spike 的正常轨迹一致；
2. 在每个模型节点前后杀死 Worker，恢复后不丢状态、不重复发布；
3. 重复投递同一 `thread_id` 不产生重复模型收费记录或业务副作用；
4. 人工暂停后释放 Worker 租约，隔日能用同一 `thread_id` 恢复；
5. 审核节点恢复时不会重复创建审核请求、资产或 Outbox；
6. 图版本升级对旧线程执行继续、迁移、终止或人工处理的明确策略；
7. checkpoint 不包含不应持久化的完整秘密、令牌或未脱敏正文；
8. 并行子图不存在 checkpoint namespace 冲突；
9. 模型超时、验证失败、人工拒绝、取消和预算耗尽均有确定终态；
10. p50/p95 延迟、checkpoint 增长、额外数据库写入和运维复杂度在预算内。

通过技术 Spike只能证明运行时适合，不能证明题目、语法、词义或学习效果有效。

## 回滚方式

- 图节点只调用框架无关的领域命令和工具；
- 业务运行表保存可继续执行的当前投影，不依赖 checkpoint 才能解释；
- 每个迁移工作流保留显式状态机执行器作为一个发布周期的回退路径；
- 回滚时停止新图运行，允许旧图线程排空、人工终止或导出结构化状态；
- checkpoint 表可归档，但不得删除其引用的未完成业务运行和审计记录。

## 参考

- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [PydanticAI 与 DBOS 集成](https://docs.dbos.dev/integrations/pydantic-ai)
- `docs/48-Agent内容质量与双实验室闭环升级基线.md`
