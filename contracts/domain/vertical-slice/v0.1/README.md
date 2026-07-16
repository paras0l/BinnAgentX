# 首个纵向切片领域契约 v0.1

本目录定义技术 Spike 的最小机器契约，不是数据库表设计，也不是正式公开 API。

- `vertical-slice-state.schema.json`：一次纵向切片状态快照；
- `example.valid.json`：覆盖学习者快照、材料、任务、标记、作品版本、AI 介入、修订、工作流和审计的最小合法样例。

契约目标：

- 原始证据、用户显式信息和系统推断可区分；
- 用户、AI、系统和参考内容归属可还原；
- 工作流 checkpoint 与长期学习者快照分离；
- 高影响状态只能保持 `candidate`、`shadow` 或进入人工复核；
- 内容和所有派生事实引用不可变版本。

建议校验：

```bash
npx --yes ajv-cli@5 validate \
  --spec=draft2020 \
  -s vertical-slice-state.schema.json \
  -d example.valid.json
```

任何数据库或 API 实现都必须显式映射到本契约，不得把本文件直接当作 ORM 模型复制。
