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
