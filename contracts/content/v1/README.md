# 内容契约 v1

本目录定义技术 Spike 使用的开发内容契约。它只证明内容结构、权利门、证据引用和版本字段可被机器验证，不证明材料是真题、已校准难度或具有学习效果。

## 文件

- `content-item.schema.json`：单个阅读或微型表达内容单元；
- `manifest.schema.json`：内容包清单与不可变版本引用；
- `fixtures/content/v1/`：通过本契约的项目自写样例。

## 哈希口径

- 阅读 `content_hash`：按段落顺序以两个换行符连接 `text` 后，对 UTF-8 字节计算 SHA-256；
- 微型表达 `content_hash`：对 `situation` 的 UTF-8 字节计算 SHA-256；
- `text_hash`：对 `text_quote` 的 UTF-8 字节计算 SHA-256；
- Manifest 只复制内容单元中已经验证的 `content_hash`，不得重新解释。

## 进入技术 Spike 的最低条件

1. `rights.rights_status` 至少为 `eligible_dev`；
2. `difficulty.difficulty_status` 必须为 `uncalibrated`；
3. 阅读证据的段落、字符偏移、原文片段和片段哈希一致；
4. Manifest 中的 ID、类型、文件和哈希与内容文件一致；
5. 不得把开发样例展示成真题、外刊原文或教师金标。
