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
  lastSyncedAt: string;
  lastSyncError: string;
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

const DEFAULT_SETTINGS: SyncSettings = {
  apiBaseUrl: "http://127.0.0.1:8000/learner",
  connectionId: "",
  syncSecret: "",
  allowedFolders: "BinnAgentX",
  allowedTags: "",
  maxNotes: 80,
  maxExcerptCharacters: 900,
  autoSync: true,
  lastSyncedAt: "",
  lastSyncError: "",
};

const LEARNING_TEMPLATES: Record<string, string> = {
  "词汇.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "vocabulary"\ntags:\n  - binnagent\n  - vocabulary\n---\n\n# 词汇或短语\n\n## 核心含义\n\n## 常用搭配\n\n## 原句与语境\n\n## 我的例句\n\n## 易混淆点\n',
  "语法.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "grammar"\ntags:\n  - binnagent\n  - grammar\n---\n\n# 语法结构\n\n## 结构公式\n\n## 判断线索\n\n## 原句拆解\n\n## 常见误区\n\n## 新语境验证\n',
  "写作表达.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "writing_expression"\ntags:\n  - binnagent\n  - writing-expression\n---\n\n# 可迁移表达\n\n## 表达功能\n\n## 句式骨架\n\n## 原始范例\n\n## 我的改写\n\n## 可替换词槽\n',
  "阅读策略.md":
    '---\nbinnagent_schema: "learning-context/v1"\nbinnagent_kind: "reading_skill"\ntags:\n  - binnagent\n  - reading-skill\n---\n\n# 阅读策略\n\n## 适用场景\n\n## 操作步骤\n\n## 证据定位\n\n## 失败信号\n\n## 新文章验证\n',
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
      name: "Install BinnAgentX learning templates",
      callback: () => this.installTemplates(),
    });
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoSync) void this.sync(false);
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

  private async installTemplates(): Promise<void> {
    const folder = "BinnAgentX/Templates";
    if (!this.app.vault.getAbstractFileByPath("BinnAgentX"))
      await this.app.vault.createFolder("BinnAgentX");
    if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
    let installed = 0;
    for (const [name, content] of Object.entries(LEARNING_TEMPLATES)) {
      if (!this.app.vault.getAbstractFileByPath(`${folder}/${name}`)) {
        await this.app.vault.create(`${folder}/${name}`, content);
        installed += 1;
      }
    }
    new Notice(installed ? `已安装 ${installed} 个 BinnAgentX 模板` : "模板已存在，未覆盖你的修改");
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
      this.settings.lastSyncedAt = new Date().toISOString();
      this.settings.lastSyncError = "";
      await this.saveSettings();
      if (showNotice)
        new Notice(`双向同步完成：接收 ${exported} 条资产，上传 ${entries.length} 条学习上下文。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步失败";
      this.settings.lastSyncError = message;
      await this.saveSettings();
      if (showNotice) new Notice(message);
    }
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
    const root = "BinnAgentX";
    const folder = `${root}/Assets`;
    if (!this.app.vault.getAbstractFileByPath(root)) await this.app.vault.createFolder(root);
    if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
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
      text: "仅同步你在下方明确允许的文件夹或标签。笔记不会被删除、改写或移动。",
    });
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
          : this.plugin.settings.lastSyncedAt || "尚未完成同步",
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
  if (file.path.startsWith("BinnAgentX/Templates/")) return false;
  const pathAllowed = folders.some(
    (folder) => file.path === folder || file.path.startsWith(`${folder}/`),
  );
  const fileTags = uniqueStrings([
    ...(app.metadataCache.getFileCache(file)?.tags ?? []).map((tag) => tag.tag),
    ...arrayStrings(app.metadataCache.getFileCache(file)?.frontmatter?.tags),
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
