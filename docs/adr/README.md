# Architecture Decision Records

ADR 记录不可由代码本身表达、且会影响多个模块的架构决策。编号一经分配不得复用；新结论通过新增 ADR 替代旧结论，不静默改写历史。

## 状态

- `accepted-for-spike`：仅对技术 Spike 生效，可被实验推翻；
- `accepted`：已冻结为当前产品架构；
- `superseded`：由另一 ADR 替代；
- `proposed`：尚未获得所需证据。

## 模板

```markdown
# ADR-NNNN：标题

> 状态：proposed
> 日期：YYYY-MM-DD
> 决策所有者：角色
> 适用范围：范围

## 背景

## 决策

## 替代方案

## 后果

## 验证证据

## 回滚方式
```

ADR 中的“通过”只表示相应技术命题得到证据，不得替代真人需求、教学效度、内容难度或合规结论。

## 索引

| ADR | 状态 | 主题 |
|---|---|---|
| [ADR-0001](ADR-0001-技术Spike证据边界.md) | `accepted-for-spike` | 技术 Spike 证据边界 |
| [ADR-0002](ADR-0002-桌面唯一终端与浏览器矩阵.md) | `accepted` | 桌面唯一终端与浏览器矩阵 |
| [ADR-0003](ADR-0003-双前端与权限隔离.md) | `accepted` | 双前端与权限隔离 |
| [ADR-0004](ADR-0004-单一事实源与不可变证据.md) | `accepted-for-spike` | PostgreSQL 单一事实源、不可变证据与 Outbox |
| [ADR-0006](ADR-0006-动态Agent工作流运行时.md) | `accepted-for-spike` | 动态 Agent 工作流采用 LangGraph 的受控引入 |
| [ADR-0009](ADR-0009-后台执行所有权与重试语义.md) | `accepted-for-spike` | 后台执行所有权、检查点与重试语义 |
| [ADR-0011](ADR-0011-词义与句法Provider候选及离线基准.md) | `proposed` | 词义与句法 Provider 候选及离线基准 |
