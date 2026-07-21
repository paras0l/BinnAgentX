## 结论

推荐把这套能力拆成三个互不替代的层次：

> **BinnAgentX 资产页 = 元数据索引与学习证据入口**
> **Obsidian Vault = 详细知识内容的权威存储与人工管理界面**
> **OpenWiki = 面向 Agent / 开发者的派生 Wiki，不是业务数据库，也不是个人资产正文的权威来源**

技术路线建议采用 **Obsidian CLI 优先、MCP 可选、OpenWiki 单向派生**。不要让浏览器直接访问 Obsidian CLI 或把一整套 MCP 写权限直接暴露给 Agent，中间增加一个受审计的 `Knowledge Vault Bridge`。

---

# 一、当前实现与目标之间的冲突

目前的“学习资产”不是索引页，而是一个完整的浏览器端知识库：

* `LearningAsset` 直接保存 `content`、`note`、`sourceTitle` 等正文信息；
* 整个资产库保存在按学习者 ID 区分的 `localStorage` 中；
* 页面搜索同时搜索标题、正文、笔记和来源；
* 卡片直接渲染正文和笔记；
* 页面允许新增正文、点击“复习一次”、直接“标记掌握”。

训练工作区还会把以下详细内容直接复制进浏览器资产库：

* 用户选择的原文；
* 模型生成的词义、翻译、语法结构、卡点诊断；
* H1–H4 的具体提示；
* 写作反馈；
* 风格改写版本和解释。

此外，当前“掌握度”只是每复习一次增加 15%，也可以由用户直接设为 100%。 这和项目已经确立的“不能把一次模型判断或简单操作冒充能力提升证据”的原则不一致。

因此不应在现有结构上简单接一个 Obsidian 按钮，而应先重新定义数据所有权。

---

# 二、推荐的权威边界

| 组件                            | 权威负责                  | 可以做                                              | 不应该做                           |
| ----------------------------- | --------------------- | ------------------------------------------------ | ------------------------------ |
| **BinnAgentX PostgreSQL**     | 资产索引、来源证据、学习状态、同步状态   | 保存资产 ID、分类、来源任务、证据数量、最近验证时间、复习到期时间、Obsidian 文档引用 | 保存完整知识正文；把打开笔记当作掌握             |
| **BinnAgentX 资产页**            | 元数据浏览与导航              | 筛选、排序、搜索元数据、查看来源、打开 Obsidian、查看同步异常              | 显示或编辑正文；管理知识图谱；手动把掌握度设为 100    |
| **Obsidian Vault**            | 详细内容和人工知识管理           | 编写正文、管理标签、别名、文件夹、双链、附件、模板、人工整理                   | 直接修改 BinnAgentX 的学习证据或能力状态     |
| **Obsidian Bridge**           | 系统与 Vault 之间的适配       | 创建笔记、读取 frontmatter、刷新索引、计算哈希、打开文档               | 自己判断掌握；绕过业务权限；向 Agent 暴露任意文件系统 |
| **OpenWiki Code Mode**        | 项目代码与产品文档的 Agent Wiki | 生成 `openwiki/`，整理代码、架构、产品规则和来源地图                 | 管理学习者的私有笔记；作为运行时数据源            |
| **OpenWiki Personal Mode，可选** | 本地个人知识的派生 Agent Wiki  | 从用户明确授权的本地来源生成摘要、导航和概念关系                         | 回写 Obsidian 正文；作为学习证据权威来源      |

这里最重要的是：

> **详细知识内容可以在 Obsidian 中变化，但已经产生过的学习事实、作答、提示、修订和证据引用仍然必须留在 BinnAgentX。**

例如用户在 Obsidian 中把一条语法笔记改写得很完善，这属于“知识整理行为”，不能自动得出“用户已经独立掌握该语法”。

---

# 三、资产页面应该保留什么

## 1. 页面展示字段

建议每条资产只展示：

```text
标题
资产分类
标签
来源类型
来源材料标题
来源任务日期
创建时间
Obsidian 最近更新时间
学习证据数量
最近一次独立验证时间
下一次验证时间
当前证据状态
星标状态
关联笔记数量
关联资产数量
同步状态
```

“当前证据状态”不要继续使用看似精确的随意百分比，建议改为：

```text
待验证
发展中
提示后可用
独立可用
待延迟验证
延迟稳定
证据冲突
```

必要时内部可以保存数值，但用户端展示有证据含义的离散状态。

## 2. 页面允许的操作

建议保留：

* 按分类、标签、来源、状态筛选；
* 元数据搜索；
* 星标；
* 查看来源任务；
* 打开 Obsidian；
* 复制 Obsidian 链接；
* 刷新索引；
* 同步失败后重试；
* 将索引项归档；
* 查看“为什么系统认为它处于当前状态”。

建议删除：

* 正文 textarea；
* 笔记正文展示；
* “复习一次就增加掌握度”；
* “标记掌握”；
* 在网页端直接编辑详细知识内容；
* 在网页端修改文件夹、双链和详细标签体系；
* 全文内容直接留在 `localStorage`。

## 3. “新增资产”如何处理

仍可保留“新增资产”，但它应变成：

```text
选择分类
填写标题
选择来源
填写少量索引标签
创建 Obsidian 笔记骨架
跳转到 Obsidian 完成详细内容
```

网页端不再要求填写详细正文。

如果 Obsidian Bridge 当前离线，则创建一条：

```text
sync_status = pending_export
```

等 Bridge 恢复后再生成 Obsidian 文件。

---

# 四、数据字段的所有权

建议明确到字段级，避免 BinnAgentX 和 Obsidian 双向覆盖。

| 字段                       | 权威所有者           | 说明                                    |
| ------------------------ | --------------- | ------------------------------------- |
| `asset_id`               | BinnAgentX      | 稳定 ID，文件改名也不变化                        |
| `learner_id`             | BinnAgentX      | 不写入公开可共享内容                            |
| `kind`                   | BinnAgentX      | 可镜像到 frontmatter                      |
| `source_task_id`         | BinnAgentX      | 来源学习任务                                |
| `source_annotation_id`   | BinnAgentX      | 来源标记                                  |
| `source_intervention_id` | BinnAgentX      | 来源提示或反馈                               |
| `evidence_status`        | BinnAgentX      | 只能根据学习证据更新                            |
| `evidence_count`         | BinnAgentX      | 不由 Obsidian 修改                        |
| `last_verified_at`       | BinnAgentX      | 必须来自实际训练                              |
| `next_review_at`         | BinnAgentX      | 学习调度                                  |
| `starred`                | BinnAgentX      | 产品内用户偏好                               |
| `title`                  | Obsidian        | 索引库保存镜像                               |
| `aliases`                | Obsidian        | 索引库保存镜像                               |
| `tags`                   | Obsidian        | 索引库保存镜像                               |
| `relative_path`          | Obsidian Bridge | 不直接给前端绝对路径                            |
| `content`                | Obsidian        | BinnAgentX 索引库不保存                     |
| `links/backlinks`        | Obsidian        | 索引库只保存计数或目标 ID                        |
| `content_hash`           | Bridge          | 用于同步和冲突检测                             |
| `sync_status`            | BinnAgentX      | pending/synced/conflict/missing/error |

---

# 五、建议的数据结构

## 1. BinnAgentX 索引表

```sql
learning_asset_index
--------------------
asset_id
learner_id
asset_kind
display_title
tag_index
source_type
source_task_id
source_content_version_id
source_annotation_id
source_intervention_id

vault_provider
vault_id
document_id
relative_path
document_uri
content_hash
document_updated_at

evidence_status
evidence_count
last_verified_at
next_review_at
starred

sync_status
sync_error_code
indexed_at
created_at
updated_at
version
```

其中：

* `document_id` 必须稳定，不能用文件路径充当主键；
* `relative_path` 可以变化；
* 绝对 Vault 路径只保留在本机 Bridge 配置中；
* 前端只能收到 `document_uri` 或受控打开命令。

## 2. Obsidian Frontmatter

尽量使用扁平字段，便于 Obsidian Properties 和 CLI 操作：

```yaml
---
binnagent_schema: "asset/v1"
binnagent_asset_id: "asset_01J..."
binnagent_kind: "grammar"
binnagent_source_type: "annotation"
binnagent_source_task_id: "task_01J..."
binnagent_source_content_version_id: "reading_01_v3"
binnagent_created_at: "2026-07-20T08:30:00Z"

title: "让步结构中的主句判断"
aliases:
  - "although 让步结构"
tags:
  - binnagent
  - grammar
  - long-sentence
---
```

正文由用户和 Obsidian 管理：

```markdown
# 让步结构中的主句判断

## 最初语境

...

## 我的理解

...

## 可迁移规则

...

## 新语境验证

...
```

不要把 `evidence_status` 或“已掌握”写成由 Obsidian 用户随意编辑的权威字段。可以镜像展示，但同步回 BinnAgentX 时忽略它。

---

# 六、推荐的集成架构

```text
学习任务完成 / 标注保存 / 反馈产生
                 │
                 ▼
        Domain Event / Outbox
                 │
                 ▼
       Knowledge Asset Service
          │              │
          │              └── 写入 learning_asset_index
          │
          ▼
      KnowledgeVaultPort
          │
          ├── ObsidianCliAdapter
          ├── ObsidianMcpAdapter
          └── FileSystemAdapter，可作为内部降级
                 │
                 ▼
           Obsidian Vault
                 │
                 ▼
        Metadata Scanner / Watcher
                 │
                 └── 更新索引、哈希和同步状态

docs/ + 代码 + 经过筛选的索引导出
                 │
                 ▼
             OpenWiki
                 │
                 ▼
       派生 Agent Wiki / 导航
```

## 为什么要异步写入

PostgreSQL 事务和本地 Obsidian 文件写入不可能形成一个真正的跨系统原子事务。因此应使用 Outbox/Saga：

1. BinnAgentX 先保存学习事实；
2. 创建 `asset_export_requested` 事件；
3. Bridge 幂等写入 Obsidian；
4. 成功后回写 `document_id`、哈希和路径；
5. 失败时资产页显示“等待同步”，而不是让学习任务失败。

幂等键建议直接使用：

```text
asset_id + export_schema_version
```

同一标注重复投递时只能更新同一笔记，不能产生多份文件。

---

# 七、Obsidian CLI 与 MCP 的选择

## 1. Obsidian CLI

Obsidian 在 2026 年正式加入官方 CLI。它支持文件创建、读取、移动、搜索、Properties、标签、链接和 backlinks 等操作；但需要 Obsidian 桌面应用运行，首次命令可以启动应用。([Obsidian][1])

### 优点

* 官方能力；
* 命令语义相对稳定；
* Properties、Tags、Links、Search 足够完成索引；
* 无需额外安装 Obsidian 社区插件；
* 适合确定性脚本和人工调试。

### 限制

* 依赖桌面 Obsidian 进程；
* 不能从浏览器直接调用；
* Docker 容器一般无法直接连接宿主机 GUI 进程；
* 多命令操作没有数据库事务；
* `create overwrite` 等命令误用时可能覆盖文件；
* CLI 还有 `eval`、插件安装、发布和开发者命令，绝不能全部暴露给 Agent。

### 推荐允许的 CLI 命令

```text
vault
files
file
read
create          仅新文件，禁止默认 overwrite
append
prepend
move
rename
open
search
search:context
properties
property:read
property:set
tags
backlinks
links
outline
```

### 默认禁止

```text
delete permanent
eval
command
plugin:install
plugin:uninstall
publish:add
publish:remove
history:restore
sync:restore
dev:*
```

---

## 2. Obsidian MCP

我检索到的常用 Obsidian MCP 实现主要是社区项目。一些实现直接读写 Vault 文件，另一些通过 Obsidian Local REST API 插件访问。以 MCPVault 为例，它提供读取、写入、精确 patch、frontmatter、标签、搜索、移动和删除等能力，也实现了路径限制及 frontmatter 校验。([GitHub][2])

### 优点

* 给 Agent 提供结构化工具，不必解析 CLI 文本；
* 适合搜索、读取多笔记、精确 patch；
* 某些实现不要求 Obsidian 应用运行；
* 可以通过标准 MCP 接入 Codex、Claude Code 等客户端。

### 风险

* 社区实现的权限、维护质量和数据语义不同；
* 很多服务同时开放读取、覆盖、移动和删除；
* HTTP MCP 服务配置不当可能把整个 Vault 暴露到局域网；
* Agent 可能把笔记中的提示注入文本误当成系统指令；
* 使用 `@latest` 会让能力和安全边界在未审查时改变；
* MCP 不提供 BinnAgentX 的业务权限和学习证据不变量。

### 推荐用法

不要让 BinnAgent Agent 直接看到原始的：

```text
read_note
write_note
delete_note
move_note
manage_tags
```

而是在 BinnAgentX 中封装为业务工具：

```text
knowledge_index.search_metadata
knowledge_note.create_from_learning_event
knowledge_note.read_scoped
knowledge_note.append_user_confirmed_section
knowledge_note.update_frontmatter
knowledge_note.open_external
knowledge_note.refresh_index
```

每个工具再调用 MCP 或 CLI。

写操作默认只允许：

* 创建 BinnAgentX 专用目录中的文件；
* 修改 `binnagent_*` frontmatter；
* 追加到明确的受管区块；
* 使用旧哈希进行乐观并发检查。

删除、移动和全文覆盖必须由用户确认。

---

## 3. 我的选择建议

### 第一阶段：CLI-first

使用官方 CLI 完成：

* 创建笔记骨架；
* Properties 写入；
* 元数据扫描；
* 标签和链接索引；
* 打开 Obsidian；
* 定期重新索引。

这是风险最小、调试成本最低的方案。

### 第二阶段：MCP-read-first

增加 MCP，但先只开放：

```text
搜索
读取指定资产
获取 frontmatter
获取 backlinks
获取 Vault 统计
```

确认稳定后再开放精确 patch。删除和任意覆盖长期保持人工确认。

### 第三阶段：多适配器

所有业务代码只依赖：

```python
class KnowledgeVaultPort(Protocol):
    async def create_note(...)
    async def get_metadata(...)
    async def search_metadata(...)
    async def read_scoped(...)
    async def patch_managed_section(...)
    async def open_note(...)
    async def scan_changes(...)
```

这样以后可以在 CLI、MCP、直接文件系统或其他知识库之间切换。

---

# 八、OpenWiki 的正确功能边界

当前仓库已经将 OpenWiki 初始化为 Code 模式，输出到 `openwiki/`；生成页面原则上不直接编辑，而是修改 `docs/`、代码或 `openwiki/INSTRUCTIONS.md` 后重新生成。

OpenWiki 上游现在同时支持：

* Code Mode：当前仓库的 Agent 文档；
* Personal Mode：本地个人 Wiki；
* 生成 Open Knowledge Format v0.1 兼容的 Markdown bundle。([github.com][3])

## 推荐边界

### `openwiki/`：只放项目知识

内容包括：

* 项目架构；
* Agent tools；
* 数据模型；
* 产品规则；
* 开发和部署；
* Obsidian 集成设计；
* 资产索引契约；
* 隐私和同步边界。

它可以被提交到 Git。

### `~/.openwiki/wiki/`：可选的个人派生知识

只有用户明确开启时，才可以从 Obsidian Vault 的授权范围生成个人 Agent Wiki。

它不能：

* 提交到 BinnAgentX 仓库；
* 回写 BinnAgentX 学习证据；
* 覆盖 Obsidian 原文；
* 成为资产页数据源的唯一权威；
* 自动读取整个 Vault。

## 不推荐的方案

```text
BinnAgentX 资产页
      ↓
直接读取 openwiki/*.md
      ↓
把 OpenWiki 当知识数据库
```

原因是 OpenWiki 本质上是生成和维护 Wiki 的 Agent 工具，不是低延迟、事务化、多用户、权限隔离的内容服务。它的页面可能在更新时被整体重构，且生成结果受模型和指令影响。

## 当前仓库需要先修正的地方

`openwiki/INSTRUCTIONS.md` 仍然写着“尚未进入业务代码实现”，但仓库已经有真实 API、Agent 网关、内容生成、审核和前端纵向流程。

在下一次更新 OpenWiki 前，应把它改成类似：

```text
当前仓库已经进入可连续体验的纵向实现阶段。
docs/ 是产品与教学规则来源；
代码、测试、数据库迁移和运行配置是已实现状态的权威来源；
OpenWiki 必须区分当前实现、实验功能、影子功能和未来规划。
学习者私有资产正文不属于 Code Wiki 的采集范围。
```

另外，仓库手册固定使用 OpenWiki 0.1.2，但自动化模板写的是 npm 最新版。  OpenWiki 上游目前变化很快，因此 CI 应固定版本，升级通过单独 PR 完成，不能直接长期使用 `latest`。

若 OpenWiki 接触私人知识，建议明确设置：

```bash
OPENWIKI_TELEMETRY_DISABLED=1
```

上游文档说明其匿名聚合遥测默认开启，虽然声明不会采集文件内容、仓库名称、路径、Prompt 或模型输出，但私有知识场景仍适合采用更保守的关闭策略。([github.com][3])

---

# 九、不同部署方式的可行性

| 部署方式                        |           可行性 | 主要条件                                     |
| --------------------------- | ------------: | ---------------------------------------- |
| 本机单用户、API 和 Obsidian 在同一台电脑 |  **高，8.5/10** | 使用宿主机 Bridge 调用 CLI                      |
| 本机 Docker，Obsidian 在宿主机     |   **中高，7/10** | Bridge 必须运行在宿主机，容器不能直接依赖 GUI CLI         |
| 远程自托管，Vault 也在服务器           | **中高，7.5/10** | 使用文件适配器或受控 MCP；不一定适合桌面 CLI               |
| Obsidian Sync + 远程服务器       |  **中，6.5/10** | 可用 Obsidian Headless 同步到服务器，再由 Bridge 索引 |
| 公有 SaaS，用户 Vault 在各自电脑      | **中低，4.5/10** | 必须开发本地 Companion；服务器不能直接读取用户本机 Vault     |
| 浏览器直接连接本机 MCP/CLI           |    **低，2/10** | 跨平台、安全、认证、CORS 和生命周期问题明显                 |
| OpenWiki 作为派生 Agent Wiki    |    **高，8/10** | 单向生成、版本固定、人工或 PR 审核                      |
| OpenWiki 作为资产正文数据库          |    **低，3/10** | 缺乏事务、多用户隔离和稳定 CRUD 语义                    |

Obsidian CLI 控制桌面应用，而 Obsidian Headless 是独立的无界面客户端，当前处于开放测试阶段，主要面向 Obsidian Sync/Publish 等服务；它可以用于把共享 Vault 同步到服务器，但不是完整的 Obsidian 内容管理 API。([Obsidian][4])

---

# 十、建议的迁移顺序

## 阶段 1：把资产页降级为索引页

修改：

```text
LearningAsset
LearningAssetsState
LearningAssetsPanel
learning-assets-storage.ts
```

删除：

```text
content
note
mastery
reviewCount
lastReviewedAt
```

新增：

```text
documentRef
tags
sourceRefs
evidenceStatus
evidenceCount
lastVerifiedAt
nextReviewAt
syncStatus
documentUpdatedAt
```

同时移除资产页正文表单、正文展示、“复习一次”和“标记掌握”。

## 阶段 2：建立服务端索引

增加：

```text
learning_asset_index 表
GET /v1/assets
GET /v1/assets/{asset_id}
POST /v1/assets
POST /v1/assets/{asset_id}/open
POST /v1/assets/{asset_id}/sync
POST /v1/assets/reindex
```

所有接口都只返回元数据。

## 阶段 3：实现 Obsidian CLI Bridge

实现：

```text
vault health check
create note skeleton
set frontmatter
scan metadata
open note
refresh one note
full reindex
conflict detection
```

Bridge 不可用时只影响同步，不影响训练事实保存。

## 阶段 4：迁移现有 localStorage

迁移器流程：

1. 读取旧 `binnagent:learning-assets:v1:<learnerId>`；
2. 为每条旧资产生成稳定 `asset_id`；
3. 将 `content` 和 `note` 写入 Obsidian；
4. 将元数据写入 PostgreSQL；
5. 对比数量和哈希；
6. 标记迁移完成；
7. 确认后删除浏览器中的正文；
8. 保留只含迁移版本和状态的轻量标记。

在 Obsidian 离线时不要删除旧数据。

## 阶段 5：增加 MCP

先只读，再逐步增加精确 patch。MCP 服务必须：

* 使用固定版本；
* 限制到指定 Vault；
* 排除 `.obsidian`、`.git` 和隐藏目录；
* 禁止符号链接逃逸；
* 默认关闭删除；
* 不监听公共网卡；
* 不把正文写入日志；
* 将笔记内容视为不可信数据，而不是 Agent 指令。

## 阶段 6：调整 OpenWiki

* 更新 `openwiki/INSTRUCTIONS.md`；
* 在 `docs/` 增加知识资产边界文档；
* Code Wiki 只读取项目资料；
* Personal Wiki 如启用，使用独立目录和独立授权；
* 固定 OpenWiki 版本；
* 更新通过 PR 审核；
* 私人知识场景关闭遥测。

---

# 十一、最终推荐架构

```text
BinnAgentX
├── 学习事实：PostgreSQL，权威
├── 资产元数据索引：PostgreSQL，权威
├── 资产详细正文：Obsidian，权威
├── Obsidian 同步：Knowledge Vault Bridge
│   ├── P0 官方 CLI
│   └── P1 受限 MCP
├── 项目 Agent Wiki：OpenWiki Code Mode
└── 个人 Agent Wiki：OpenWiki Personal Mode，可选且完全隔离
```

最稳妥的产品原则是：

> **BinnAgentX 决定“这条知识从哪里来、有哪些学习证据、何时需要再验证”；Obsidian 决定“这条知识如何写、如何组织、和哪些知识相连”；OpenWiki 决定“Agent 如何快速理解这些已经存在的资料”。**

这三个系统各自只有一个权威职责，就不会出现正文冲突、掌握度失真、个人内容进入代码仓库或 OpenWiki 生成结果反向污染学习证据的问题。

---

# 十二、2026-07-21 双向学习闭环实现与验收

## 已实现路径

1. 学习端资产页通过 PostgreSQL `learning_asset_index` 展示标题、分类、标签、来源、证据和同步状态，不返回 Obsidian 正文或同步摘录。
2. 学习端新增资产、训练标注和个性化阅读标注都写入 `asset_export_requested` outbox；正文仅作为投递中的一次性载荷，插件回执后即替换为不含正文的交付回执。
3. Obsidian 插件 v0.1.5 使用独立 Connection ID 和 Sync Secret 拉取待导出资产，在 `BinnAgentX/00-Inbox/` 创建带稳定 `binnagent_asset_id` 与 `inbox_status: unprocessed` 的笔记，并向服务端回执文件引用和内容哈希；它仍进入原有导出、回执和同步链路，没有新增旁路状态机。
4. 插件首次加载初始化 `00-Inbox` 至 `06-Attachments`、使用指南、MOC / Dataview Dashboard、模板与入门示例，并把 Obsidian 模板和附件目录配置为 `05-Templates/`、`06-Attachments/`。总、词汇、语法地图固定为 `00-Dashboard.md`，升级时通过 Obsidian 文件管理器迁移旧 `Dashboard.md` 并自动更新链接。插件只扫描用户明确允许的文件夹或标签，排除模板、Dashboard 及带 `binnagent_sync: false` 的指南/示例；模板复制出的普通笔记没有资产 ID 时，服务端生成稳定资产 ID，并只把标题、标签、路径引用和同步状态写入资产索引。
5. 有限摘录保存在 `obsidian_learning_context`，只用于个性化内容生成；`POST /v1/training-materials/personalized` 只创建异步请求。常驻 Worker 按学习目标、最新学习、到期复习、证据冲突和近期使用记录选取上下文；兼容的模型提供方可先调用 PydanticAI Prompted JSON 结构化抽取，再生成 3–6 段的新英文阅读及迁移重点。LongCat 当前不完成该抽取协议，因此明确跳过可选抽取并直接生成阅读；其他抽取失败也会记录降级原因并继续使用原始授权上下文，不阻断阅读生成。轨迹预算限制模型调用次数，生成失败最多自动尝试三次并指数退避，终态失败只接受用户显式重新生成；控制舱可查看每个阶段和失败点。
6. 学习首页通过 `GET /v1/training-materials` 展示统一训练任务队列。系统任务与个性化材料同时可选，个性化材料生成阶段使用 `requested`、`generating`、`validating`、`ready` 或 `generation_failed`，进入既有训练后再使用 `in_progress`、`completed`；资产页不提供材料生成入口，也不展示阅读正文。模型通过 `source_titles` 逐字声明实际使用的输入笔记，服务端只把训练结果归因到可验证且归属当前学习者的来源资产；模型没有返回可靠映射时材料仍可进入训练，但本次不更新来源证据。微型表达结果不会批量污染所有输入笔记。
7. 用户从队列选择材料后，`POST /v1/runs/personalized/{material_id}` 把它适配为标准 `practice / matched_reading` 运行并进入既有阅读实验室。选项作答、语义标注、语法挑战、V1/V2、H1–H4、表达迁移、难度反馈、暂停恢复和完成记录全部复用原链路；队列本身不渲染正文、不保存标注，也不能手工改成完成。`GET /v1/training-materials` 同时返回可启动性与阻塞原因：没有完成校准时提示先校准，已有其他标准训练运行时提示“先继续当前训练”，只有绑定当前运行的个性化材料仍可继续，避免前端先发起一个必然冲突的请求。阅读实验室保存的标注继续生成带 `source_task_id` 的 `annotation` 资产，再由同一插件队列同步到 Obsidian。
8. 插件在 Obsidian 启动后和每 60 秒自动双向同步，也保留命令面板手动重试；设置页记录最近同步时间或错误，便于排障。
9. 连接配置按学习账号保存在 PostgreSQL，Sync Secret 只在创建时返回并由 Vault 插件设置持久化。刷新页面、退出后重新登录及容器重建都会复用原连接；只有连接未完成首次同步、被撤销或状态失效时才引导用户重新配置。
10. 学习首页的队列入口根据连接健康状态切换：配置有效且至少同步过一次时显示“从 Obsidian 笔记生成新材料”，否则显示“去配置 Obsidian”并直接打开资产页配置流程。配置有效但暂无授权笔记时保留生成入口并提示先同步模板笔记。
11. 部署前已经打开的旧学习端可能仍调用废弃的材料状态接口；兼容路由不再返回无语义的 404，也绝不恢复手工改状态能力，而是返回 `SESSION_CONFLICT` 提示重新载入。刷新后的客户端只使用标准运行接口。
12. 登录所有权中间件只对带真实 `workflow_run_id` 的运行资源做预检；`/v1/runs/personalized/{material_id}` 是静态启动命令，由处理器校验材料归属，不能把路径段 `personalized` 误判为运行 ID。认证集成测试必须覆盖该命令已穿过中间件，而不只测试未挂载的领域路由。
13. 插件同步资产已经带有账号对应 Vault 和文件路径的 `obsidian://` 深链，资产页点击“在 Obsidian 中打开”时只调用该本机协议。只有缺少深链的受管 Bridge 资产才请求服务端 `/v1/assets/{asset_id}/open`；两条路径不得同时执行，否则普通插件模式会在成功唤起 Obsidian 后被 Bridge 的 503 误报覆盖。

## 本机真实验收记录

以下是 v0.1.2 在旧 `Assets/` 目录上的历史验收记录；v0.1.3 已将新导出入口迁移为 `00-Inbox/`，不移动或覆盖用户已有旧文件。使用学习端 `http://127.0.0.1:3000`、API `http://127.0.0.1:8000`、Obsidian 1.12.7 和 Vault `bin01` 完成：

* 体验账号登录成功；
* 学习端创建“让步结构中的主句判断”，插件生成 `BinnAgentX/Assets/让步结构中的主句判断-*.md`，资产状态从 `pending_export` 变为 `synced`；
* 按语法模板创建“让步结构的主句位置”，自动同步后资产页新增对应元数据卡片，卡片不展示正文；
* LongCat 根据 3 条已授权 Obsidian 上下文生成阅读 `Rethinking Shared Spaces in Modern Cities`，内容自然复现 although 让步结构、主句判断与 `make + 宾语 + 形容词`；
* 在生成阅读中保存段落标注后，资产总数从 3 增至 4、待同步从 0 增至 1；Obsidian 重启触发自动同步并创建 `BinnAgentX/Assets/个性化阅读标注-*.md`，最终学习端显示 4 条资产、4 条插件上下文、待同步 0；
* 自动化集成测试 `tests/integration/test_obsidian_learning_loop.py` 覆盖导出、回执、模板笔记导入、元数据脱敏、个性化阅读与标注再导出。

## 训练任务队列调整验收

根据 2026-07-21 产品复核，个性化阅读不再放在资产页生成。真实学习端完成以下复验：

* 学习首页新增“训练任务队列”，同时显示系统推荐任务和可选择的个性化材料；资产页已移除生成器及阅读正文；
* LongCat 根据 4 条已授权 Obsidian 上下文生成 `Rethinking Urban Space in the Age of Shared Mobility`，材料以“待训练”进入队列；
* 用户点击“选择并开始”后材料状态变为“进行中”，并直接进入原有阅读实验室，不存在第二套个性化阅读工作区；
* 若已有别的标准训练进行中，其他个性化材料入口禁用并显示“先继续当前训练”；当前运行所绑定的材料保留“继续训练”，不会并行创建第二条运行；
* 用户按原流程完成阅读、表达迁移、难度反馈和收尾后，材料状态才持久化为“已完成”，刷新或重新登录仍可从队列再次训练；
* 队列训练标注新增第 5 条资产，插件自动写入 Obsidian，最终数据库为 5 条资产、5 条授权上下文、0 条待导出；
* Alembic `0016_personalized_training_queue` 提供队列表，`0017_personalized_reading_lab` 关联标准训练运行，`0018_repair_legacy_materials` 将旧前端留下的“进行中但没有运行”状态恢复为待训练；集成测试验证个性化材料可使用原有标注、H1、表达迁移、难度反馈和统一完成状态，且生成材料不会混入资产索引，只有用户标注才进入资产闭环。
* 已补充入口状态回归测试：有效连接展示生成按钮；无效或未完成同步的连接只展示配置按钮，点击后直接打开“连接你的知识库”。

## 账号与配置持久化复核

本次排查确认学习会话 cookie 的有效期为 30 天，账号、会话和 Obsidian 连接都存放在 PostgreSQL 持久卷，正常刷新、重新登录和容器重建不会删除。此前账号反复消失并非产品登录逻辑所致，而是集成测试直接连接开发数据库并在清理阶段删除了全表学习者数据；历史上不同 Compose 项目名也留下了彼此隔离的旧数据卷。

修复后 `tests/integration/conftest.py` 在导入应用前强制切换到名称以 `_test` 结尾的独立数据库，自动建库并执行迁移；不符合命名约束时立即拒绝运行。完整集成测试执行后，开发库的用户、Obsidian 连接、资产和训练材料计数保持不变。Compose 项目名固定为 `binnagentx`，避免后续启动时无意切换到另一套数据卷。

## 安装与排障

* 发布包：`releases/BinnAgentX-Learning-Sync-v0.1.5.zip`；学习端下载副本位于 `apps/learner-web/public/downloads/`。
* 插件最终目录必须是 `<Vault>/.obsidian/plugins/binnagentx-learning-sync/`。同一插件 ID 的重复目录会导致 Obsidian 不加载插件；本次验收已将旧的重复目录移到 `<Vault>/.obsidian/plugin-backups/`，可恢复但不再参与插件扫描。
* 服务端连接显示“已配对”但没有最近同步时间时，先检查插件目录是否唯一，再查看插件设置页的“最近同步”。
* 本次没有运行或重建 OpenWiki；本文和 README 是权威源文档，OpenWiki 仍由用户按既有流程手动维护。

[1]: https://obsidian.md/help/cli "Obsidian CLI - Obsidian Help"
[2]: https://github.com/bitbonsai/mcpvault "GitHub - bitbonsai/mcpvault: A lightweight Model Context Protocol (MCP) server for safe Obsidian vault access · GitHub"
[3]: https://github.com/langchain-ai/openwiki "GitHub - langchain-ai/openwiki: OpenWiki is a CLI that writes and maintains agent documentation for your codebase. · GitHub"
[4]: https://obsidian.md/es/help/headless?utm_source=chatgpt.com "Obsidian Headless - Ayuda de Obsidian"
