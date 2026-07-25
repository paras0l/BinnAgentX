# ADR-0011：词义与句法 Provider 候选及离线基准

> 状态：proposed  
> 日期：2026-07-25  
> 决策所有者：架构负责人、语言教研负责人、内容权利负责人  
> 适用范围：标注辅助、词义消歧、句法分析、翻译对齐和内容质量验证

## 背景

现有 `LexicalProvider`、`SyntaxProvider`、版本化缓存、字符偏移回验和低置信度
拒答只冻结了工程边界，尚未选择真实词典或句法解析器。模型直接生成流畅解释
无法证明义项、主从句、修饰范围或翻译跨度正确。

候选研究还必须区分：

1. **词义库存**：提供 lemma、词性、稳定义项 ID、英文释义和关系；
2. **上下文消歧**：从候选义项中选择、排序或拒答；
3. **教学解释**：将已经验证的结构或义项转成中文教学说明；
4. **句法候选**：提供 token、依存/成分结构和字符跨度；
5. **质量裁决**：由金标、确定性规则和必要的人工复核决定是否可发布。

把上述职责交给一个模型调用会重新形成不可验证的单点。

## 候选事实

### Open English WordNet + `wn`

- Open English WordNet（OEWN）提供版本化下载、WN-LMF/JSON/WNDB 等格式，
  2025 版于 2025-12-31 发布；
- OEWN 基于 Princeton WordNet，并以 CC BY 4.0 继续开发，使用时必须保留
  Princeton WordNet 与 OEWN 的归属要求；
- `wn` 提供 WN-LMF、SQLite 本地后端以及 Word/Sense/Synset 查询；
- OEWN/PWN 的永久 sense key 可用于跨版本映射，synset offset 不能被当作
  永久业务 ID。

这些事实使 OEWN 适合作为离线义项库存候选，但不代表它已经覆盖考研熟词僻义、
搭配、语域、中文释义或上下文消歧。

### spaCy

- spaCy 代码及 `en_core_web_sm` 当前公开模型卡标注为 MIT；
- spaCy 3.8.7 的官方发布记录包含 Python 3.13 支持；
- 本地 pipeline 可提供 token、词性和依存候选。

这些事实只支持进入兼容性 Spike。小模型的长难句结构质量、字符回映、模型版本
升级和所有实际分发物的归属仍需按锁定版本验证。

### Stanza

- Stanza 是 Stanford NLP Group 的官方 Python NLP 库，提供 tokenization、
  POS、dependency parsing 等能力；
- 官方文档支持预下载后离线部署，也可用 `download_method=None` 禁止运行时
  自动下载；
- 官方文档明确逐句循环较慢，批处理方式必须纳入性能对照。

Stanza 作为第二解析器候选，不因学术来源或模型规模自动获得正式采用资格。
Python 3.13、CPU/内存、模型数据许可和再分发要求必须对锁定 artifact 单独核验。

## 提议

### G-03 词义 Provider Spike

1. 第一候选使用 **OEWN 2025 core + `wn` 本地索引**，不默认使用包含扩展专名的
   2025+；
2. 业务持久化引用永久 sense key、词典版本和 Provider 版本，不只保存 synset
   offset 或自然语言释义；
3. OEWN 只负责候选义项召回。上下文消歧器必须独立输出置信度和备选义项；
4. 中文教学释义不得直接冒充 OEWN 原始释义。若由模型转换，必须标记为派生解释，
   保留英文义项证据，并受单独质量门约束；
5. 无可靠候选、候选差距不足或 POS 冲突时返回 `review_required/abstained`；
6. 在内容权利负责人确认归属展示、缓存、备份、分发和删除要求前，只允许隔离
   离线 Spike。

### G-04 句法 Provider Spike

1. 使用同一版本化样本同时对照：
   - spaCy + 锁定的 English pipeline artifact；
   - Stanza + 锁定的 English model package；
2. 两个候选都必须完全本地运行、禁止运行时下载，并记录包版本、模型版本、
   artifact checksum、CPU/内存、单条和批量 p50/p95；
3. Provider 输出先转换成共同的半开字符跨度和稳定教学标签，再进入
   `SyntaxAnalysisResult`；
4. token/字符回映失败、关键结构缺失、候选冲突或低置信度时不得由模型补写为
   “已验证分析”；
5. 解析器只生成结构候选，模型只能基于已验证跨度生成教学解释。

### 离线基准

仓库已提供：

- `contracts/agent-quality/v1/language-provider-case.schema.json`；
- `contracts/agent-quality/v1/language-provider-result.schema.json`；
- `fixtures/evaluation/language-providers/v1`；
- `scripts/benchmark_language_providers.py`。

候选适配器必须输出共同结果契约。评分器比较状态、永久义项 ID、词性、结构标签、
精确字符跨度及 p50/p95，不允许各候选使用不同样本或私自放宽标签。

当前样本是 `engineering_seed`，只证明基准管线可运行，不用于宣称准确率。

## 正式冻结门槛

本文转为 `accepted` 前必须同时完成：

1. 内容权利负责人对锁定词库、代码包和模型 artifact 出具可缓存、可展示、
   可再分发和归属要求；
2. Python 3.13 与目标容器离线安装验证；
3. 有权语言教研人员冻结包含熟词僻义、搭配、歧义拒答、长难句、嵌套从句、
   非连续结构和偏移陷阱的样本；
4. 对两个句法候选和至少一个词义消歧基线运行同机对照；
5. 冻结准确率、拒答率、偏移完整性、延迟、内存和回归阈值；
6. 验证旧 Provider 版本可回放，新版本不会静默覆盖历史解释；
7. 确认中文教学释义的来源、派生标识和人工抽检规则。

## 替代方案

### 直接使用大模型生成词义和语法

拒绝作为验证来源。模型可以生成教学表达，但不能替代义项库存、结构候选、
字符跨度和拒答。

### 只选择一个句法解析器

当前拒绝。没有同样本对照就无法区分模型缺陷、标签映射缺陷和工程偏差。

### 在线商业词典 API

保留为后续候选。只有明确商业授权、缓存/展示/离线降级、地区、限流、成本和
下架 SLA 后才能与本地候选对照。

### 抓取公开词典网页

拒绝。网页可访问不等于获得商业缓存、派生和展示权利。

## 后果

正面影响：

- 词义库存、消歧、教学解释和质量裁决职责分离；
- 解析器可以替换，业务契约、缓存和历史证据保持稳定；
- 低置信度路径成为正常结果，而不是随机重试；
- 候选比较获得同样本、同契约和可重放指标。

代价与风险：

- 需要维护 Provider 适配器和标签映射；
- OEWN 不直接提供完整中文教学资源；
- 本地解析器增加镜像体积、启动时间和内存；
- 工程种子很小，未经专家扩充前不能代表真实长难句质量；
- 开源代码许可不能自动覆盖所有模型数据和下游展示方式。

## 验证证据

已完成：

- Provider 中立端口、版本化缓存、字符偏移回验和拒答；
- 离线样本/结果 Schema；
- 样本完整性校验、归一化评分和延迟报告；
- river/finance 义项、歧义拒答、让步从句和嵌套长句工程种子。

尚未完成：

- 真实 OEWN、spaCy、Stanza 适配器和同机跑分；
- 锁定 artifact 的权利核验；
- 专家金标、阈值和中文释义政策。

## 回滚方式

- 保持 `LexicalProvider` / `SyntaxProvider` 接口不绑定候选包；
- Provider 版本进入缓存键和持久化证据；
- 下线候选时停止新请求，历史结果继续按原版本只读回放；
- 无可用 Provider 时降级为明确拒答或“待验证建议”，不得回退为伪验证。

## 参考

- [Open English WordNet 仓库、版本与许可](https://github.com/globalwordnet/english-wordnet)
- [Open English WordNet 2025 下载](https://en-word.net/downloads)
- [`wn` 文档](https://wn.readthedocs.io/en/latest/)
- [永久 sense key 跨版本映射论文](https://aclanthology.org/2023.gwc-1.8/)
- [spaCy 发布记录](https://github.com/explosion/spaCy/releases)
- [`en_core_web_sm` 模型许可](https://huggingface.co/spacy/en_core_web_sm/blob/main/LICENSE)
- [Stanza 官方仓库](https://github.com/stanfordnlp/stanza)
- [Stanza 离线模型文档](https://stanfordnlp.github.io/stanza/download_models.html)
