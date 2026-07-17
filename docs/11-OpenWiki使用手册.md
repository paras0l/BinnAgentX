# OpenWiki 使用手册

> 适用项目：BinnAgent 考研英语读写训练  
> 安装日期：2026-07-15  
> OpenWiki：0.1.2  
> 当前模式：Code  
> 已验证模型：`gpt-5.3-codex-spark`（ChatGPT 登录 / Codex 后端）

## 0. 操作权限规则

OpenWiki 由项目所有者本人手动操作。Agent 必须遵守：

- 只有当用户在当前请求中明确要求时，才可以运行 OpenWiki、更新生成页、切换模型、修改配置或处理 OpenWiki 工作流；
- “更新项目文档”“同步文档”“整理今天内容”等一般请求只授权修改源文档，不包含 OpenWiki；
- 每次授权只对当次指定操作有效，不能自动延续到后续任务；
- 未获明确授权时，Agent 应停在源文档更新完成处，并提醒用户自行决定是否手动运行 OpenWiki；
- 不得以修复导航、保持一致性、验证模型或生成页过期为由自行运行。

## 1. 当前安装状态

OpenWiki 已按官方推荐方式全局安装：

```bash
npm install -g openwiki@0.1.2
```

当前命令位置：

```text
/opt/homebrew/bin/openwiki
```

本机 Node.js 为 25.8.1，满足 OpenWiki 要求的 Node.js 20 以上版本。

当前仓库已经完成 Code 模式初始化。Code 模式针对当前 Git 仓库生成文档，写入仓库根目录下的 `openwiki/`；它不同于写入 `~/.openwiki/wiki/` 的 Personal 模式。

## 2. 已生成内容

| 路径 | 作用 | 是否手工维护 |
|---|---|---|
| `openwiki/quickstart.md` | Wiki 总入口与推荐阅读路径 | 否，由 OpenWiki 生成 |
| `openwiki/product-model.md` | 产品边界、三阶段和英一/英二模型 | 否 |
| `openwiki/training-system.md` | 学习者模型、训练编排和词汇迁移 | 否 |
| `openwiki/evidence-and-compliance.md` | 效果证据、隐私、版权和合规 | 否 |
| `openwiki/delivery-roadmap.md` | 产品发现、技术立项和交付门槛 | 否 |
| `openwiki/source-map.md` | 原始文档职责和追溯入口 | 否 |
| `openwiki/.last-update.json` | 最近一次生成命令、时间和模型 | 否 |
| `openwiki/INSTRUCTIONS.md` | 本仓库 Wiki 范围、优先级和写作规则 | 是 |
| `AGENTS.md` | 提醒编码 Agent 先读取 OpenWiki | OpenWiki 只维护标记区块 |
| `CLAUDE.md` | 提醒 Claude 类编码 Agent 先读取 OpenWiki | OpenWiki 只维护标记区块 |
| `.github/workflows/openwiki-update.yml` | 每日或手动生成 Wiki 更新 PR 的 GitHub Actions 模板 | 是，启用前需审查模型、Secret 和频率 |

生成页面原则上不要直接修改。需要纠正内容时，应先修改 `README.md`、`docs/`、代码或 `openwiki/INSTRUCTIONS.md`，再让 OpenWiki 更新。

## 3. 最常用操作

所有命令都应先进入项目根目录：

```bash
cd "/Users/binge/Documents/BinnAgent-Grad-ReadWrite"
```

### 3.1 打开交互式 Code 模式

```bash
openwiki code
```

也可以省略 `code`，因为裸命令默认就是 Code 模式：

```bash
openwiki
```

建议显式写 `code`，避免与 Personal 模式混淆。

### 3.2 更新全部 Wiki

日常推荐显式指定已经验证的 ChatGPT 登录和项目模型：

```bash
OPENWIKI_PROVIDER=openai-chatgpt \
  openwiki code --update --print --modelId gpt-5.3-codex-spark
```

`--print` 表示单次运行，完成后退出。去掉它会进入可连续提问的交互界面。

### 3.3 带明确要求更新

```bash
OPENWIKI_PROVIDER=openai-chatgpt \
  openwiki code --update --print --modelId gpt-5.3-codex-spark \
  "根据最近的产品文档变更更新训练系统和来源地图，不要把规划写成已经实现"
```

给出范围清晰的要求，通常比无条件重写更稳定。

### 3.4 只咨询，不要求改文档

```bash
openwiki code --print --modelId gpt-5.3-codex-spark \
  "总结当前仓库进入技术立项前还缺少什么"
```

如果问题可能引起文件修改，应在要求中明确写“只回答，不修改文件”。

### 3.5 查看帮助

```bash
openwiki code --help
```

0.1.2 版本不支持 `openwiki --version`。查看已安装版本可以使用：

```bash
npm list -g openwiki --depth=0
```

## 4. 什么时候更新 Wiki

建议在以下情况运行一次 `--update`：

- 产品定位、PRD 或训练规范发生实质变化；
- 新增、删除或重命名重要文档；
- 开始编写业务代码；
- 调整目录、模块边界、数据模型或外部接口；
- 新增测试、运行配置、部署方式或故障处理流程；
- 准备让新的开发者或编码 Agent 接手项目。

小范围措辞修改不必每次立即更新，可以集中处理。

## 5. 如何修改 Wiki 的关注范围

手工编辑：

```text
openwiki/INSTRUCTIONS.md
```

这个文件当前要求 OpenWiki：

- 使用简体中文；
- 以 `docs/` 作为现阶段产品规则权威来源；
- 优先覆盖三阶段、学习者模型、词汇迁移、任务编排、英一/英二、评估和合规；
- 区分当前已有、产品要求和计划实现；
- 不读取或输出凭据。

修改后运行：

```bash
openwiki code --update --print --modelId gpt-5.3-codex-spark
```

## 6. 模型和登录

本项目已使用 ChatGPT 登录完成授权，并已在 OpenWiki 配置中把默认供应商与模型切换为 **OpenAI（ChatGPT login）/ `gpt-5.3-codex-spark`**。已经用显式模型参数和裸 `openwiki code --print` 各完成一次真实调用。

GPT-5.3-Codex-Spark 截至 2026-07-15 仍是 Codex 研究预览模型，主要面向符合资格的 ChatGPT Pro 用户，可能有独立限额、排队或临时不可用；API 仅向少量合作方开放，见 [OpenAI 发布说明](https://openai.com/index/introducing-gpt-5-3-codex-spark/)。它适合快速、定向的文档修改，但复杂的全仓长任务仍应拆成小批并逐页复核。命令中保留显式供应商和模型参数，可以避免用户目录默认值将来变化后悄悄换模。

OpenWiki 将配置与凭据保存在用户目录：

```text
~/.openwiki/.env
~/.openwiki/onboarding.json
```

注意：

- 不要把 `~/.openwiki/.env` 复制到本项目或提交 Git；
- 不要在命令、Wiki 指令或问题中粘贴访问令牌；
- ChatGPT 刷新令牌应按密码处理；
- 当前裸命令显示的默认供应商/模型为 OpenAI（ChatGPT login）/ `gpt-5.3-codex-spark`；
- 本项目仍推荐在可复现命令中显式写出 `OPENWIKI_PROVIDER=openai-chatgpt` 与 `--modelId gpt-5.3-codex-spark`；
- 如果研究预览资格、限额或模型可用性变化，调用可能失败；不得静默换成其他模型后仍声称由 Spark 生成。

如果登录失效，重新启动官方登录初始化：

```bash
OPENWIKI_PROVIDER=openai-chatgpt openwiki code --init
```

完成浏览器授权后，确认仓库路径为：

```text
/Users/binge/Documents/BinnAgent-Grad-ReadWrite
```

不要在终端历史或项目文件中手工填写 OAuth 令牌。

## 7. Code 模式与 Personal 模式

| 需求 | 命令 | 写入位置 |
|---|---|---|
| 当前仓库代码与文档 Wiki | `openwiki code` | 当前仓库 `openwiki/` |
| 个人跨来源知识库 | `openwiki personal` | `~/.openwiki/wiki/` |

本项目后续操作应使用 Code 模式。除非明确要建立个人知识库，否则不要运行 `openwiki personal --init`。

## 8. 与 Git 的关系

建议提交以下内容：

- `openwiki/*.md`；
- `openwiki/.last-update.json`；
- `AGENTS.md`；
- `CLAUDE.md`；
- `.github/workflows/openwiki-update.yml`，如决定保留自动更新。

不要提交：

- `~/.openwiki/.env`；
- ChatGPT、模型供应商或 LangSmith 的 Key/Token；
- 用户目录下的 OpenWiki 本地缓存或连接器原始数据。

当前仓库已有 `main` 分支、提交记录和 GitHub 远端；重新运行 `--update` 后，`.last-update.json` 应记录有效的 Git 版本。

## 9. 可选的自动更新

OpenWiki 已在本项目生成 `.github/workflows/openwiki-update.yml`，但它目前只是**手动触发的待配置模板**，没有启用定时执行。原因是 Spark 的 ChatGPT 订阅访问不能直接复用到 GitHub Actions，而其 API 在研究预览阶段仅向有限合作方开放。

模板当前行为：

- 只支持手动触发；
- 使用 Node.js 22 和 npm 最新版 OpenWiki；
- CI 预设 OpenAI API 与 `gpt-5.3-codex-spark`，但只有账号已经获得该模型 API 权限时才可运行；
- 需要 GitHub Secret：`OPENAI_API_KEY`；
- 模板还引用可选的 `LANGSMITH_API_KEY`；不使用 LangSmith 时应在启用前移除对应环境变量和追踪配置；
- 更新完成后创建 `openwiki/update` 分支和文档 PR，不直接合并默认分支。

决定启用前需要确认：

- GitHub 仓库与默认分支；
- CI 使用的模型供应商；
- Secret 名称和最小权限；
- 自动开 PR 还是直接合并；
- 运行频率与模型成本；
- Wiki 变更由谁审查。

未完成这些决策前，不要依赖该工作流，继续使用本地 `openwiki code --update` 即可。若不准备使用 GitHub Actions，也可以删除模板文件；删除属于项目策略决定，不影响本地 Code 模式。

## 10. 常见问题

### 初始化或更新长时间没有输出

OpenWiki 可能正在按页面逐步写入。先在另一个终端检查：

```bash
find openwiki -maxdepth 1 -type f -print
```

如果默认模型长时间没有产生新文件，可以终止后用显式参数重试：

```bash
OPENWIKI_PROVIDER=openai-chatgpt \
  openwiki code --update --print --modelId gpt-5.3-codex-spark
```

### 在错误目录运行

Code 模式以当前目录为目标。运行前检查：

```bash
git rev-parse --show-toplevel
```

结果应为：

```text
/Users/binge/Documents/BinnAgent-Grad-ReadWrite
```

### Wiki 把计划写成已经实现

1. 检查对应 `docs/` 是否表述含混；
2. 修改权威产品文档；
3. 在更新要求中明确区分“当前已有”和“计划实现”；
4. 重新运行 `--update`。

### 某个生成页面内容错误

不要只在生成页面中修补。先更正源文档或 `openwiki/INSTRUCTIONS.md`，再运行更新，防止下次被覆盖。

### 升级 OpenWiki

查看 npm 最新版本：

```bash
npm view openwiki version
```

升级：

```bash
npm install -g openwiki@latest
```

升级后先查看帮助，再更新 Wiki：

```bash
openwiki code --help
openwiki code --update --print --modelId gpt-5.3-codex-spark
```

## 11. 推荐的日常流程

```text
修改产品文档或代码
→ 自己检查事实与链接
→ 运行 openwiki code --update
→ 阅读 openwiki/quickstart.md
→ 检查是否把计划误写成实现
→ 检查来源链接和敏感信息
→ 再提交 Git
```

OpenWiki 是仓库知识导航，不替代权威产品文档、代码、测试、法律审查或人工技术决策。
