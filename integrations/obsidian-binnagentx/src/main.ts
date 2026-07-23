import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from "obsidian";

type LearningKind =
  | "vocabulary"
  | "grammar"
  | "writing_expression"
  | "reading_skill"
  | "exam_skill"
  | "writing_skill";

interface SyncSettings {
  apiBaseUrl: string;
  connectionId: string;
  syncSecret: string;
  allowedFolders: string;
  allowedTags: string;
  maxNotes: number;
  maxExcerptCharacters: number;
  autoSync: boolean;
  libraryVersion: number;
  lastSyncedAt: string;
  lastSyncError: string;
  lastSyncSummary: string;
}

interface LearningContextEntry {
  source_key: string;
  asset_id?: string;
  title: string;
  kind: LearningKind;
  tags: string[];
  excerpt: string;
  modified_at: string;
}

interface PendingAssetExport {
  asset_id: string;
  kind: LearningKind;
  title: string;
  tags: string[];
  source_type: string;
  source_task_id: string | null;
  initial_content: string | null;
}

interface OrganizationAction {
  action_id: string;
  source_key: string;
  target_folder: string;
  kind: LearningKind;
  reason: string;
}

interface OrganizationPlan {
  run_id: string;
  status: "queued" | "planned" | "noop";
  inbox_count: number;
  classified_count: number;
  actions: OrganizationAction[];
}

interface ImportResponse {
  imported: number;
  organization: OrganizationPlan | null;
}

const LIBRARY_ROOT = "BinnAgentX";
const LIBRARY_FOLDERS = [
  "00-Inbox",
  "01-Vocabulary",
  "02-Grammar",
  "03-Reading",
  "04-Writing",
  "05-Templates",
  "06-Attachments",
] as const;
const INBOX_FOLDER = `${LIBRARY_ROOT}/00-Inbox`;
const TEMPLATE_FOLDER = `${LIBRARY_ROOT}/05-Templates`;
const ATTACHMENT_FOLDER = `${LIBRARY_ROOT}/06-Attachments`;
const CURRENT_LIBRARY_VERSION = 3;
const DASHBOARD_MIGRATIONS = [
  [`${LIBRARY_ROOT}/Dashboard.md`, `${LIBRARY_ROOT}/00-Dashboard.md`],
  [`${LIBRARY_ROOT}/01-Vocabulary/Dashboard.md`, `${LIBRARY_ROOT}/01-Vocabulary/00-Dashboard.md`],
  [`${LIBRARY_ROOT}/02-Grammar/Dashboard.md`, `${LIBRARY_ROOT}/02-Grammar/00-Dashboard.md`],
] as const;

const DEFAULT_SETTINGS: SyncSettings = {
  apiBaseUrl: "http://127.0.0.1:8000/learner",
  connectionId: "",
  syncSecret: "",
  allowedFolders: "BinnAgentX",
  allowedTags: "",
  maxNotes: 80,
  maxExcerptCharacters: 900,
  autoSync: true,
  libraryVersion: 0,
  lastSyncedAt: "",
  lastSyncError: "",
  lastSyncSummary: "",
};

const LEARNING_TEMPLATES: Record<string, string> = {
  "词汇.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "vocabulary"\nmeaning: ""\nstatus: learning\ncreated: {{date}}\ntags:\n  - binnagent\n  - vocabulary\n---\n\n# {{title}}\n\n## 核心含义\n\n## 发音\n\n## 常用搭配\n\n## 原句与语境\n\n## 我的例句\n\n## 易混淆点\n\n## 关联\n- [[BinnAgentX/01-Vocabulary/00-Dashboard|词汇 Dashboard]]\n',
  "语法.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "grammar"\nstatus: learning\ncreated: {{date}}\ntags:\n  - binnagent\n  - grammar\n---\n\n# {{title}}\n\n## 一句话规则\n\n## 结构公式\n\n## 判断线索\n\n## 原句拆解\n\n## 常见误区\n\n## 新语境验证\n\n## 关联\n- [[BinnAgentX/02-Grammar/00-Dashboard|语法 Dashboard]]\n',
  "写作表达.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "writing_expression"\ncreated: {{date}}\ntags:\n  - binnagent\n  - writing-expression\n---\n\n# {{title}}\n\n## 表达功能\n\n## 句式骨架\n\n## 原始范例\n\n## 我的改写\n\n## 可替换词槽\n',
  "阅读策略.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "reading_skill"\ncreated: {{date}}\ntags:\n  - binnagent\n  - reading-skill\n---\n\n# {{title}}\n\n## 适用场景\n\n## 操作步骤\n\n## 证据定位\n\n## 失败信号\n\n## 新文章验证\n',
};

const LIBRARY_NOTES: Record<string, string> = {
  [`${LIBRARY_ROOT}/00-Dashboard.md`]: `# BinnAgentX 学习地图

第一次使用请先读 [[使用指南]] 和 [[Spaced Repetition 使用指南]]。之后从 [[00-Inbox/收集箱使用说明|收集箱]] 开始，把碎片定期整理到下面的领域目录。

## 内容地图（MOC）

- [[01-Vocabulary/00-Dashboard|词汇 Dashboard]]
- [[02-Grammar/00-Dashboard|语法 Dashboard]]
- [[03-Reading/阅读笔记示例|阅读]]
- [[04-Writing/写作练习示例|写作]]
- [[05-Templates/词汇|笔记模板]]
- [[01-Vocabulary/Spaced Repetition 闪卡示例|可复习的闪卡示例]]

## 最近更新（Dataview）

\`\`\`dataview
TABLE WITHOUT ID file.link AS "笔记", binnagent_kind AS "类型", file.mtime AS "更新时间"
FROM "BinnAgentX"
WHERE file.name != "00-Dashboard" AND file.name != "Dashboard" AND !contains(file.path, "/05-Templates/")
SORT file.mtime DESC
LIMIT 12
\`\`\`

> 未安装 Dataview 时，上面的查询会显示为代码块；MOC 链接仍可正常使用。
`,
  [`${LIBRARY_ROOT}/使用指南.md`]: `---
binnagent_sync: false
tags:
  - binnagent
  - guide
---

# BinnAgentX 学习库使用指南

这套目录把“快速记录”和“长期整理”分开。最简单的用法只有三步：**先收集、再整理、常回顾**。

## 目录说明

| 文件夹 | 用途 | 什么时候放进去 |
| --- | --- | --- |
| \`00-Inbox/\` | 收集箱 | BinnAgentX 同步来的标注、随手记下的句子、还不知道如何分类的碎片 |
| \`01-Vocabulary/\` | 词汇 | 已经补充了含义、搭配、语境或例句的单词和短语 |
| \`02-Grammar/\` | 语法 | 能说清规则、结构、误区和验证例句的语法点 |
| \`03-Reading/\` | 阅读 | 文章原文、书籍摘记、摘要、证据和阅读策略 |
| \`04-Writing/\` | 写作 | 英文写作练习、V1/V2 修改过程和可迁移表达 |
| \`05-Templates/\` | 模板 | Obsidian Templates 核心插件使用的笔记模板 |
| \`06-Attachments/\` | 附件 | 图片、PDF、音频等非 Markdown 文件 |

## 推荐工作流

1. **随时收集**：先把内容放进 \`00-Inbox/\`，不要因为分类而打断学习。
2. **每周整理**：为有价值的碎片补上自己的解释和例句，再移动到词汇、语法、阅读或写作目录。
3. **建立连接**：用 \`[[笔记名]]\` 把相关词汇、语法和阅读笔记互相链接。
4. **回到地图**：从 [[00-Dashboard|总 Dashboard]]、[[01-Vocabulary/00-Dashboard|词汇 Dashboard]] 或 [[02-Grammar/00-Dashboard|语法 Dashboard]] 浏览和复习。

## 模板怎么用

插件会把 Obsidian 的模板文件夹设为 \`BinnAgentX/05-Templates\`。启用 Obsidian 的 **Templates（模板）核心插件** 后，新建笔记并执行“插入模板”，再选择词汇、语法、阅读策略或写作表达模板。

## 间隔重复怎么用

BinnAgentX Learning Sync 使用社区插件 **Spaced Repetition** 提供闪卡复习。第一次使用请按 [[Spaced Repetition 使用指南]] 完成安装，再打开 [[01-Vocabulary/Spaced Repetition 闪卡示例]] 做一次练习。

## Dashboard 和 Dataview

Dashboard 本身是内容地图（MOC），里面的普通链接不依赖任何插件。安装并启用社区插件 **Dataview** 后，词汇、语法和最近更新列表会自动生成；未安装时只会看到查询代码块，不影响其他笔记。

## 附件

插件会把 Obsidian 的默认附件位置设为 \`BinnAgentX/06-Attachments\`。之后粘贴图片或加入 PDF 时，附件会集中存放，正文仍可用 Obsidian 链接引用。

## 不会发生什么

- 初始化可以重复执行，但不会覆盖同名文件或你已经修改的模板。
- 插件不会自动替你移动、删除或“整理完成”收集箱里的内容。
- 指南、Dashboard 和初始化示例带有 \`binnagent_sync: false\`，不会作为你的个人学习上下文上传。
`,
  [`${LIBRARY_ROOT}/Spaced Repetition 使用指南.md`]: `---
binnagent_sync: false
tags:
  - binnagent
  - guide
  - spaced-repetition
---

# Spaced Repetition 使用指南

BinnAgentX Learning Sync 负责把学习材料整理到这个 Vault；社区插件 **Spaced Repetition** 负责判断哪些闪卡今天需要复习。BinnAgentX 不会替你安装社区插件，下面的设置只需完成一次。

## 1. 安装并启用插件

1. 打开 Obsidian 的 **设置 → 第三方插件（Community plugins）**。
2. 如果仍处于受限模式，按 Obsidian 提示关闭受限模式。
3. 点击“浏览”，搜索 **Spaced Repetition**，安装并启用它。
4. 初次使用不需要修改算法或分隔符设置，保留默认值即可。

## 2. 用样例完成第一次复习

1. 打开 [[01-Vocabulary/Spaced Repetition 闪卡示例]]。
2. 打开命令面板：macOS 按 \`⌘ P\`，Windows / Linux 按 \`Ctrl P\`。
3. 搜索并执行 \`Review flashcards in this note\`。
4. 先在心里回答，再显示答案，并按真实回忆情况选择评分。插件会据此安排下次复习。

如果只想立刻重做全部样例、不考虑复习日期，请执行 \`Cram flashcards in this note\`。

## 3. 创建自己的闪卡

先在包含卡片的笔记中加入卡组标签。默认卡组标签是：

\`\`\`markdown
#flashcards
\`\`\`

也可以用层级标签分组，例如：

\`\`\`markdown
#flashcards/binnagentx/vocabulary
\`\`\`

然后选择一种卡片格式：

\`\`\`markdown
resilient 是什么意思？::有韧性的；能从困难中迅速恢复的。

有韧性的；能迅速恢复的:::resilient

although 和 despite 后面分别接什么？
?
although 后接完整从句；despite 后接名词、代词或动名词。
\`\`\`

- \`::\` 创建单向卡：左边是问题，右边是答案。
- \`:::\` 创建双向卡：两个方向都会被提问。
- 单独一行的 \`?\` 适合较长的多行答案。

## 4. 每天怎么复习

打开命令面板并执行 \`Review Flashcards from all notes\`，选择卡组后开始复习。建议先回忆再看答案；评分反映“这次想起来有多难”，不必追求全部选 Easy。

复习后，Spaced Repetition 会在卡片附近写入类似 \`<!--SR:...-->\` 的调度注释。这是复习记录，不是错误；不要手动修改或删除。

## 常见问题

- **找不到卡组**：确认 Spaced Repetition 已启用，并且笔记正文含有 \`#flashcards\` 或其层级标签。
- **卡片没有被识别**：先使用默认分隔符，并确认 \`::\`、\`:::\` 或 \`?\` 不在代码块中。
- **今天没有到期卡片**：执行 \`Cram flashcards in this note\` 可随时练习，不会受到期日限制。
- **想复习整篇笔记**：这是另一种工作流，可给笔记加 \`#review\`；入门阶段只使用闪卡即可。
`,
  [`${INBOX_FOLDER}/收集箱使用说明.md`]: `---
binnagent_sync: false
inbox_status: reference
tags:
  - binnagent
  - inbox
---

# 收集箱使用说明

标注、灵感、不会归类的表达先放在这里，不需要一开始就写得完整。

## 每周整理

1. 能复用的单词或短语，整理到 [[../01-Vocabulary/00-Dashboard|词汇]]。
2. 句子背后的规则，整理到 [[../02-Grammar/00-Dashboard|语法]]。
3. 原文与阅读记录，整理到 [[../03-Reading/阅读笔记示例|阅读]]。
4. 自己写的段落，整理到 [[../04-Writing/写作练习示例|写作]]。
5. 已处理的碎片可归档、移动或删除；插件不会替你覆盖这些内容。
`,
  [`${LIBRARY_ROOT}/01-Vocabulary/00-Dashboard.md`]: `# 词汇 Dashboard

这是词汇库的内容地图。新建笔记时使用 [[../05-Templates/词汇|词汇模板]]。

## 全部词汇（Dataview）

\`\`\`dataview
TABLE WITHOUT ID file.link AS "词汇", meaning AS "核心含义", status AS "状态", file.mtime AS "更新"
FROM "BinnAgentX/01-Vocabulary"
WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"
SORT file.mtime DESC
\`\`\`

## 建议的 MOC

- 按主题：学习、工作、旅行、情绪
- 按关系：同义词、反义词、易混词、固定搭配
- 示例：[[resilient]]
`,
  [`${LIBRARY_ROOT}/01-Vocabulary/resilient.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
meaning: "有韧性的；能迅速恢复的"
status: learning
tags:
  - binnagent
  - vocabulary
  - character
---

# resilient

## 核心含义

Able to recover quickly after difficulty or change.

## 发音

/rɪˈzɪliənt/

## 常用搭配

- resilient people
- a resilient economy
- remain resilient

## 原句与语境

The team remained resilient after an early setback.

## 我的例句

I want to become more resilient when a plan changes unexpectedly.

## 易混淆点

**resilient** 强调受挫后的恢复能力；**persistent** 强调持续坚持。

## 关联

- [[00-Dashboard]]
`,
  [`${LIBRARY_ROOT}/01-Vocabulary/Spaced Repetition 闪卡示例.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
status: example
tags:
  - binnagent
  - vocabulary
  - spaced-repetition
---

# Spaced Repetition 闪卡示例

这是一组可以立即复习的入门卡片。请保留下一行卡组标签，然后打开命令面板，执行 \`Review flashcards in this note\`。

#flashcards/binnagentx/vocabulary

## 单向卡

resilient 的核心含义是什么？::有韧性的；能在困难或变化后迅速恢复的。

## 双向卡

有韧性的；能迅速恢复的:::resilient

## 多行卡

resilient 和 persistent 的侧重点有什么不同？
?
**resilient** 强调受挫后的恢复能力；**persistent** 强调不放弃、持续坚持。

---

复习完成后，Spaced Repetition 会自动在卡片附近加入调度注释。接下来可以参考 [[../Spaced Repetition 使用指南|使用指南]]，把自己的学习内容改写成卡片。
`,
  [`${LIBRARY_ROOT}/02-Grammar/00-Dashboard.md`]: `# 语法 Dashboard

这是语法库的内容地图。新建笔记时使用 [[../05-Templates/语法|语法模板]]。

## 全部语法点（Dataview）

\`\`\`dataview
TABLE WITHOUT ID file.link AS "语法点", status AS "状态", file.mtime AS "更新"
FROM "BinnAgentX/02-Grammar"
WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"
SORT file.mtime DESC
\`\`\`

## 建议的 MOC

- 时态与语态
- 从句
- 非谓语动词
- 连接与衔接
- 示例：[[although 与 despite]]
`,
  [`${LIBRARY_ROOT}/02-Grammar/although 与 despite.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "grammar"
status: learning
tags:
  - binnagent
  - grammar
  - concession
---

# although 与 despite

## 一句话规则

**although** 后接完整从句；**despite** 后接名词、代词或动名词。

## 结构公式

- Although + 主语 + 谓语, 主句。
- Despite + 名词 / doing, 主句。

## 原句拆解

Although it was raining, we kept walking.

Despite the rain, we kept walking.

## 常见误区

不要写成 “despite it was raining”。可改为 “despite the rain” 或 “despite the fact that it was raining”。

## 新语境验证

Although the task was difficult, she finished it on time.

## 关联

- [[00-Dashboard]]
`,
  [`${LIBRARY_ROOT}/03-Reading/阅读笔记示例.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "reading_skill"
status: example
tags:
  - binnagent
  - reading
---

# 阅读笔记示例

## 来源

在这里记录文章标题、作者和链接。

## 一句话摘要

先用自己的话写一句，再补细节。

## 关键段落与证据

摘录少量关键句，并说明它为什么重要。

## 新词与语法

- 词汇可整理到 [[../01-Vocabulary/00-Dashboard|词汇 Dashboard]]。
- 语法可整理到 [[../02-Grammar/00-Dashboard|语法 Dashboard]]。

## 我的观点

写下赞同、质疑或可以迁移到其他文章的想法。
`,
  [`${LIBRARY_ROOT}/04-Writing/写作练习示例.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "writing_skill"
status: draft
tags:
  - binnagent
  - writing
---

# 写作练习示例

## 题目

Describe a habit that has improved your learning.

## V1 草稿

先写完，不在第一遍追求完美。

## 修改记录

- 内容：观点是否清楚？
- 结构：段落是否有主题句和证据？
- 语言：是否能用更准确的词汇或句式？

## V2 定稿

根据修改记录重写，并保留 V1 方便比较。
`,
};

export default class BinnAgentXLearningSyncPlugin extends Plugin {
  settings: SyncSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new BinnAgentXSettingTab(this.app, this));
    this.addCommand({
      id: "preview-learning-context",
      name: "Preview learning context",
      callback: () => this.preview(),
    });
    this.addCommand({
      id: "sync-learning-context",
      name: "Sync approved learning context",
      callback: () => this.sync(),
    });
    this.addCommand({
      id: "install-learning-templates",
      name: "Initialize BinnAgentX learning library",
      callback: () => this.initializeLearningLibrary(),
    });
    this.app.workspace.onLayoutReady(() => {
      void this.handleLayoutReady();
    });
    this.registerInterval(
      window.setInterval(() => {
        if (this.settings.autoSync) void this.sync(false);
      }, 60_000),
    );
  }

  async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async handleLayoutReady(): Promise<void> {
    if (this.settings.libraryVersion < CURRENT_LIBRARY_VERSION) {
      try {
        await this.initializeLearningLibrary(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        new Notice(`BinnAgentX 学习库初始化失败：${message}`);
      }
    }
    if (this.settings.autoSync) await this.sync(false);
  }

  private async collectEntriesAsync(): Promise<LearningContextEntry[]> {
    const folders = splitScope(this.settings.allowedFolders);
    const tags = splitScope(this.settings.allowedTags).map((tag) => tag.replace(/^#/, ""));
    if (!folders.length && !tags.length) throw new Error("请选择至少一个允许同步的文件夹或标签");
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => isAllowed(file, folders, tags, this.app));
    if (files.length > this.settings.maxNotes)
      throw new Error(
        `匹配到 ${files.length} 篇笔记，请缩小范围（上限 ${this.settings.maxNotes}）`,
      );
    return Promise.all(
      files.map(async (file) => {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter ?? {};
        const tags = uniqueStrings([
          ...arrayStrings(frontmatter.tags),
          ...(cache?.tags ?? []).map((tag) => tag.tag.replace(/^#/, "")),
        ]);
        return {
          source_key: file.path,
          asset_id:
            typeof frontmatter.binnagent_asset_id === "string"
              ? frontmatter.binnagent_asset_id
              : undefined,
          title: String(frontmatter.title ?? file.basename),
          kind: inferKind(frontmatter.binnagent_kind, tags),
          tags,
          excerpt: summarize(await this.app.vault.read(file), this.settings.maxExcerptCharacters),
          modified_at: new Date(file.stat.mtime).toISOString(),
        };
      }),
    );
  }

  private async preview(): Promise<void> {
    try {
      const entries = await this.collectEntriesAsync();
      new Notice(
        `将同步 ${entries.length} 条学习上下文：${
          entries
            .slice(0, 4)
            .map((entry) => entry.title)
            .join("、") || "无"
        }`,
      );
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "无法预览同步范围");
    }
  }

  async initializeLearningLibrary(showNotice = true): Promise<void> {
    let installed = 0;
    if (!this.app.vault.getAbstractFileByPath(LIBRARY_ROOT)) {
      await this.app.vault.createFolder(LIBRARY_ROOT);
      installed += 1;
    }
    for (const name of LIBRARY_FOLDERS) {
      const folder = `${LIBRARY_ROOT}/${name}`;
      if (!this.app.vault.getAbstractFileByPath(folder)) {
        await this.app.vault.createFolder(folder);
        installed += 1;
      }
    }
    installed += await this.migrateManagedDashboards();
    await this.rewriteManagedDashboardLinks();
    for (const [name, content] of Object.entries(LEARNING_TEMPLATES)) {
      if (!this.app.vault.getAbstractFileByPath(`${TEMPLATE_FOLDER}/${name}`)) {
        await this.app.vault.create(`${TEMPLATE_FOLDER}/${name}`, content);
        installed += 1;
      }
    }
    for (const [path, content] of Object.entries(LIBRARY_NOTES)) {
      if (!this.app.vault.getAbstractFileByPath(path)) {
        await this.app.vault.create(path, content);
        installed += 1;
      }
    }
    await this.configureObsidianFolders();
    this.settings.libraryVersion = CURRENT_LIBRARY_VERSION;
    await this.saveSettings();
    if (showNotice) {
      new Notice(
        installed
          ? `BinnAgentX 学习库已初始化（新增 ${installed} 项）`
          : "BinnAgentX 学习库已就绪，未覆盖你的修改",
      );
    }
  }

  private async migrateManagedDashboards(): Promise<number> {
    let migrated = 0;
    for (const [legacyPath, targetPath] of DASHBOARD_MIGRATIONS) {
      const legacy = this.app.vault.getAbstractFileByPath(legacyPath);
      if (!(legacy instanceof TFile) || this.app.vault.getAbstractFileByPath(targetPath)) continue;
      await this.app.vault.rename(legacy, targetPath);
      migrated += 1;
    }
    return migrated;
  }

  private async rewriteManagedDashboardLinks(): Promise<void> {
    const files = this.app.vault
      .getMarkdownFiles()
      .filter(
        (file) => file.path === `${LIBRARY_ROOT}.md` || file.path.startsWith(`${LIBRARY_ROOT}/`),
      );
    for (const file of files) {
      const content = await this.app.vault.read(file);
      const updated = updateManagedDashboardLinks(content, file.path);
      if (updated !== content) await this.app.vault.modify(file, updated);
    }
  }

  private async configureObsidianFolders(): Promise<void> {
    const configurableVault = this.app.vault as typeof this.app.vault & {
      setConfig?: (key: string, value: unknown) => void;
    };
    if (typeof configurableVault.setConfig === "function") {
      configurableVault.setConfig("attachmentFolderPath", ATTACHMENT_FOLDER);
    } else {
      await this.mergeConfigFile(`${this.app.vault.configDir}/app.json`, {
        attachmentFolderPath: ATTACHMENT_FOLDER,
      });
    }
    await this.mergeConfigFile(`${this.app.vault.configDir}/templates.json`, {
      folder: TEMPLATE_FOLDER,
    });
  }

  private async mergeConfigFile(path: string, patch: Record<string, unknown>): Promise<void> {
    const adapter = this.app.vault.adapter;
    let current: Record<string, unknown> = {};
    if (await adapter.exists(path)) {
      const raw = await adapter.read(path);
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          current = parsed as Record<string, unknown>;
        }
      } catch {
        throw new Error(`无法更新 Obsidian 配置：${path} 不是有效的 JSON`);
      }
    }
    const updated = { ...current, ...patch };
    if (JSON.stringify(updated) !== JSON.stringify(current)) {
      await adapter.write(path, `${JSON.stringify(updated, null, 2)}\n`);
    }
  }

  private async sync(showNotice = true): Promise<void> {
    if (!this.settings.connectionId || !this.settings.syncSecret) {
      if (showNotice) new Notice("请先在插件设置中填写 BinnAgentX 连接凭据");
      return;
    }
    try {
      const exported = await this.pullPendingAssets();
      const entries = await this.collectEntriesAsync();
      const response = await requestUrl({
        url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/import`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.syncSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema_version: "learning-context/v1",
          vault_name: this.app.vault.getName(),
          entries,
        }),
        throw: false,
      });
      if (response.status < 200 || response.status >= 300)
        throw new Error(`BinnAgentX 拒绝同步（${response.status}）`);
      const result = response.json as ImportResponse;
      const organized = await this.applyOrganizationPlan(result.organization);
      const organizationSummary = summarizeOrganization(result.organization, organized);
      const syncSummary =
        `接收 ${exported} 条资产，上传 ${entries.length} 条学习上下文；` + organizationSummary;
      this.settings.lastSyncedAt = new Date().toISOString();
      this.settings.lastSyncError = "";
      this.settings.lastSyncSummary = syncSummary;
      await this.saveSettings();
      if (showNotice) new Notice(`双向同步完成：${syncSummary}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步失败";
      this.settings.lastSyncError = message;
      await this.saveSettings();
      if (showNotice) new Notice(message);
    }
  }

  private async applyOrganizationPlan(plan: OrganizationPlan | null): Promise<number> {
    if (plan?.status !== "planned" || !plan.actions.length) return 0;
    const allowedTargets = new Set([
      `${LIBRARY_ROOT}/01-Vocabulary`,
      `${LIBRARY_ROOT}/02-Grammar`,
      `${LIBRARY_ROOT}/03-Reading`,
      `${LIBRARY_ROOT}/04-Writing`,
    ]);
    const completed: string[] = [];
    for (const action of plan.actions) {
      if (!action.source_key.startsWith(`${INBOX_FOLDER}/`)) continue;
      if (!allowedTargets.has(action.target_folder)) continue;
      const fileName = action.source_key.slice(action.source_key.lastIndexOf("/") + 1);
      const extensionIndex = fileName.lastIndexOf(".");
      const baseName = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
      const extension = extensionIndex > 0 ? fileName.slice(extensionIndex + 1) : "md";
      const basePath = `${action.target_folder}/${fileName}`;
      const retryPath = `${action.target_folder}/${baseName}-${action.action_id.slice(0, 6)}.${extension}`;
      const source = this.app.vault.getAbstractFileByPath(action.source_key);
      if (!(source instanceof TFile)) {
        if (
          this.app.vault.getAbstractFileByPath(basePath) instanceof TFile ||
          this.app.vault.getAbstractFileByPath(retryPath) instanceof TFile
        ) {
          completed.push(action.action_id);
        }
        continue;
      }
      const targetPath = this.app.vault.getAbstractFileByPath(basePath) ? retryPath : basePath;
      if (this.app.vault.getAbstractFileByPath(targetPath)) continue;
      await this.app.vault.rename(source, targetPath);
      completed.push(action.action_id);
    }
    if (completed.length !== plan.actions.length) {
      throw new Error("Inbox 整理未全部完成；未移动的笔记会保留在原处，下次同步重试");
    }
    const response = await requestUrl({
      url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/organizer-runs/${encodeURIComponent(plan.run_id)}/ack`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.settings.syncSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completed_action_ids: completed }),
      throw: false,
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`Inbox 整理回执失败（${response.status}）`);
    return completed.length;
  }

  private async pullPendingAssets(): Promise<number> {
    const base = this.settings.apiBaseUrl.replace(/\/$/, "");
    const headers = { Authorization: `Bearer ${this.settings.syncSecret}` };
    const response = await requestUrl({
      url: `${base}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports`,
      method: "GET",
      headers,
      throw: false,
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`无法读取待同步资产（${response.status}）`);
    const exports = response.json as PendingAssetExport[];
    let completed = 0;
    for (const item of exports) {
      const file = await this.createAssetNote(item);
      const content = await this.app.vault.read(file);
      const digest = await sha256(content);
      const ack = await requestUrl({
        url: `${base}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports/${encodeURIComponent(item.asset_id)}/ack`,
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          source_key: file.path,
          content_hash: digest,
          modified_at: new Date(file.stat.mtime).toISOString(),
          vault_name: this.app.vault.getName(),
        }),
        throw: false,
      });
      if (ack.status < 200 || ack.status >= 300)
        throw new Error(`资产同步回执失败（${ack.status}）`);
      completed += 1;
    }
    return completed;
  }

  private async createAssetNote(item: PendingAssetExport): Promise<TFile> {
    if (!this.app.vault.getAbstractFileByPath(LIBRARY_ROOT)) {
      await this.app.vault.createFolder(LIBRARY_ROOT);
    }
    if (!this.app.vault.getAbstractFileByPath(INBOX_FOLDER)) {
      await this.app.vault.createFolder(INBOX_FOLDER);
    }
    const folder = INBOX_FOLDER;
    const filename = `${safeFilename(item.title)}-${item.asset_id.slice(-10)}.md`;
    const path = `${folder}/${filename}`;
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) return existing;
    const tags = uniqueStrings(["binnagent", item.kind, ...item.tags]);
    const frontmatter = [
      "---",
      'binnagent_schema: "asset/v1"',
      `binnagent_asset_id: "${yamlString(item.asset_id)}"`,
      `binnagent_kind: "${yamlString(item.kind)}"`,
      `binnagent_source_type: "${yamlString(item.source_type)}"`,
      "inbox_status: unprocessed",
      `title: "${yamlString(item.title)}"`,
      ...(item.source_task_id
        ? [`binnagent_source_task_id: "${yamlString(item.source_task_id)}"`]
        : []),
      "tags:",
      ...tags.map((tag) => `  - ${tag}`),
      "---",
      "",
      `# ${item.title}`,
      "",
    ];
    const body = item.initial_content?.trim()
      ? ["## 学习现场", "", item.initial_content.trim(), "", "## 我的理解", ""]
      : ["## 最初语境", "", "## 我的理解", "", "## 可迁移规则", "", "## 新语境验证", ""];
    return await this.app.vault.create(path, [...frontmatter, ...body].join("\n"));
  }
}

class BinnAgentXSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: BinnAgentXLearningSyncPlugin,
  ) {
    super(app, plugin);
  }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "BinnAgentX 学习资产同步" });
    containerEl.createEl("p", {
      text: "仅同步你明确允许的范围。登录触发的整理只会把 00-Inbox 笔记移动到 BinnAgentX 的词汇、语法、阅读或写作目录；不会删除、改写或移出托管目录。",
    });
    new Setting(containerEl)
      .setName("初始化学习库")
      .setDesc(
        "创建 00–06 目录、MOC / Dataview Dashboard、模板、Spaced Repetition 指南与入门示例；不会覆盖已有文件。",
      )
      .addButton((button) =>
        button.setButtonText("检查并补齐").onClick(async () => {
          await this.plugin.initializeLearningLibrary();
        }),
      );
    new Setting(containerEl)
      .setName("自动双向同步")
      .setDesc("Obsidian 启动后及每 60 秒同步一次已授权范围；可随时关闭并改用手动命令。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl)
      .setName("最近同步")
      .setDesc(
        this.plugin.settings.lastSyncError
          ? `失败：${this.plugin.settings.lastSyncError}`
          : this.plugin.settings.lastSyncedAt
            ? `${this.plugin.settings.lastSyncedAt}；${this.plugin.settings.lastSyncSummary || "同步完成"}`
            : "尚未完成同步",
      );
    new Setting(containerEl)
      .setName("允许的文件夹")
      .setDesc("逗号分隔，例如 BinnAgentX, 英语/语法")
      .addText((text) =>
        text.setValue(this.plugin.settings.allowedFolders).onChange(async (value) => {
          this.plugin.settings.allowedFolders = value;
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl)
      .setName("允许的标签")
      .setDesc("可选，逗号分隔，例如 binnagent-vocabulary, grammar")
      .addText((text) =>
        text.setValue(this.plugin.settings.allowedTags).onChange(async (value) => {
          this.plugin.settings.allowedTags = value;
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl)
      .setName("BinnAgentX 地址")
      .setDesc("本机默认：http://127.0.0.1:8000/learner")
      .addText((text) =>
        text.setValue(this.plugin.settings.apiBaseUrl).onChange(async (value) => {
          this.plugin.settings.apiBaseUrl = value;
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl).setName("连接 ID").addText((text) =>
      text.setValue(this.plugin.settings.connectionId).onChange(async (value) => {
        this.plugin.settings.connectionId = value;
        await this.plugin.saveSettings();
      }),
    );
    new Setting(containerEl)
      .setName("同步密钥")
      .setDesc("由 BinnAgentX 的连接向导生成；仅保存在本机 Obsidian 插件设置中。")
      .addText((text) =>
        text.setValue(this.plugin.settings.syncSecret).onChange(async (value) => {
          this.plugin.settings.syncSecret = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}

function summarizeOrganization(plan: OrganizationPlan | null, organized: number): string {
  if (!plan) return "本轮没有排队的 Inbox 整理任务。";
  if (plan.status === "noop") return "Inbox 中没有待整理笔记。";
  if (plan.status === "queued") {
    return (
      `Inbox 有 ${plan.inbox_count} 条待整理笔记，可靠分类 ${plan.classified_count} 条；` +
      "本轮未移动，任务会在下次同步重试。"
    );
  }
  const folderLabels: Record<string, string> = {
    [`${LIBRARY_ROOT}/01-Vocabulary`]: "词汇",
    [`${LIBRARY_ROOT}/02-Grammar`]: "语法",
    [`${LIBRARY_ROOT}/03-Reading`]: "阅读",
    [`${LIBRARY_ROOT}/04-Writing`]: "写作",
  };
  const counts = new Map<string, number>();
  for (const action of plan.actions) {
    const label = folderLabels[action.target_folder] ?? action.target_folder;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const destinations = [...counts.entries()]
    .map(([label, count]) => `${label} ${count} 条`)
    .join("、");
  return `整理完成：移动 ${organized} 条 Inbox 笔记（${destinations}）。`;
}

function splitScope(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}
function arrayStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? [value]
      : [];
}
function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/^#/, "").trim()).filter(Boolean))];
}
function isAllowed(file: TFile, folders: string[], tags: string[], app: App): boolean {
  const cache = app.metadataCache.getFileCache(file);
  if (
    file.path.startsWith(`${TEMPLATE_FOLDER}/`) ||
    file.path.startsWith("BinnAgentX/Templates/") ||
    file.basename === "Dashboard" ||
    file.basename === "00-Dashboard" ||
    Object.prototype.hasOwnProperty.call(LIBRARY_NOTES, file.path) ||
    cache?.frontmatter?.binnagent_sync === false
  )
    return false;
  const pathAllowed = folders.some(
    (folder) => file.path === folder || file.path.startsWith(`${folder}/`),
  );
  const fileTags = uniqueStrings([
    ...(cache?.tags ?? []).map((tag) => tag.tag),
    ...arrayStrings(cache?.frontmatter?.tags),
  ]);
  return pathAllowed || tags.some((tag) => fileTags.includes(tag));
}
function inferKind(value: unknown, tags: string[]): LearningKind {
  const candidate =
    typeof value === "string"
      ? value
      : tags.find((tag) =>
          [
            "vocabulary",
            "grammar",
            "writing_expression",
            "reading_skill",
            "exam_skill",
            "writing_skill",
          ].includes(tag),
        );
  return (
    [
      "vocabulary",
      "grammar",
      "writing_expression",
      "reading_skill",
      "exam_skill",
      "writing_skill",
    ] as string[]
  ).includes(candidate ?? "")
    ? (candidate as LearningKind)
    : "reading_skill";
}
function updateManagedDashboardLinks(markdown: string, sourcePath: string): string {
  let updated = markdown
    .replaceAll("BinnAgentX/01-Vocabulary/Dashboard", "BinnAgentX/01-Vocabulary/00-Dashboard")
    .replaceAll("BinnAgentX/02-Grammar/Dashboard", "BinnAgentX/02-Grammar/00-Dashboard")
    .replaceAll("../01-Vocabulary/Dashboard", "../01-Vocabulary/00-Dashboard")
    .replaceAll("../02-Grammar/Dashboard", "../02-Grammar/00-Dashboard")
    .replaceAll("[[01-Vocabulary/Dashboard", "[[01-Vocabulary/00-Dashboard")
    .replaceAll("[[02-Grammar/Dashboard", "[[02-Grammar/00-Dashboard")
    .replaceAll("[[Dashboard|总 Dashboard", "[[00-Dashboard|总 Dashboard")
    .replaceAll(
      'WHERE file.name != "Dashboard" AND !contains(file.path, "/05-Templates/")',
      'WHERE file.name != "00-Dashboard" AND file.name != "Dashboard" AND !contains(file.path, "/05-Templates/")',
    );
  if (
    sourcePath.startsWith(`${LIBRARY_ROOT}/01-Vocabulary/`) ||
    sourcePath.startsWith(`${LIBRARY_ROOT}/02-Grammar/`)
  ) {
    updated = updated.replaceAll("[[Dashboard]]", "[[00-Dashboard]]");
  }
  if (sourcePath.endsWith("/Dashboard.md") || sourcePath.endsWith("/00-Dashboard.md")) {
    updated = updated.replaceAll(
      'WHERE file.name != "Dashboard"',
      'WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"',
    );
  }
  return updated;
}
function summarize(markdown: string, limit: number): string {
  return markdown
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/```[\s\S]*?```/gu, "")
    .replace(/!?(\[([^\]]*)\]\([^)]*\))/gu, "$2")
    .replace(/[#>*_`]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, limit);
}
function safeFilename(value: string): string {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 80) || "asset"
  );
}
function yamlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
