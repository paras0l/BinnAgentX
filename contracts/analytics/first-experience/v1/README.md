# 首次体验事件契约 v1

本目录冻结首次体验的 32 个分析事件。

- `first-experience-event.schema.json`：单事件 JSON Schema Draft 2020-12；
- `first-experience-event-batch.schema.json`：测试样例批量校验入口；
- `examples.valid.json`：每个事件一个最小合法样例。

契约版本为 `1.0.0`。生产者必须拒绝 Schema 不合法的事件；采集入口可以进入隔离队列，但不能静默补写未知字段。消费者必须忽略它不认识的未来事件版本，不能把解析失败当成零值。

本产品只支持电脑浏览器。为保持 v1 公共信封稳定，`device_class` 保留但固定为 `desktop`；不得据此扩展手机、平板、原生客户端或终端分层。

建议校验命令：

```bash
npx --yes ajv-cli@5 validate \
  --spec=draft2020 \
  -s first-experience-event-batch.schema.json \
  -r first-experience-event.schema.json \
  -d examples.valid.json
```

责任归属与演进规则见 [`../../../../docs/18-首次体验事件契约与前后端责任矩阵.md`](../../../../docs/18-首次体验事件契约与前后端责任矩阵.md)。
