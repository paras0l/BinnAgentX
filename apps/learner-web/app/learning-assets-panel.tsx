"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  Books,
  CheckCircle,
  CloudArrowUp,
  GearSix,
  LinkSimple,
  MagnifyingGlass,
  Plus,
  Star,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import type {
  EvidenceStatus,
  LearningAsset,
  LearningAssetInput,
  LearningAssetKind,
  LearningAssetsState,
} from "../lib/learning-assets-storage";
import {
  createObsidianPluginConnection,
  type KnowledgeVaultStatus,
  type ObsidianPluginConnection,
  type ObsidianPluginSyncStatus,
} from "../lib/api";
import { Select } from "./select";

const KIND_META: Record<
  LearningAssetKind,
  { label: string; group: "knowledge" | "experience"; description: string }
> = {
  vocabulary: { label: "生词", group: "knowledge", description: "语境中的词义与搭配" },
  grammar: { label: "语法", group: "knowledge", description: "长句结构与语法判断" },
  writing_expression: { label: "写作句式", group: "knowledge", description: "可主动迁移的表达" },
  reading_skill: { label: "阅读技巧", group: "experience", description: "理解与定位的做法" },
  exam_skill: { label: "做题技巧", group: "experience", description: "判断与检查的策略" },
  writing_skill: { label: "写作技巧", group: "experience", description: "组织和修订的方法" },
};

const STATUS_COPY: Record<EvidenceStatus, string> = {
  pending_validation: "待验证",
  developing: "发展中",
  hinted_usable: "提示后可用",
  independently_usable: "独立可用",
  awaiting_delayed_validation: "待延迟验证",
  delayed_stable: "延迟稳定",
  evidence_conflict: "证据冲突",
};

const KINDS = Object.keys(KIND_META) as LearningAssetKind[];

interface LearningAssetsPanelProps {
  state: LearningAssetsState;
  onAdd: (input: LearningAssetInput) => void;
  onToggleStar: (assetId: string) => void;
  onOpen: (asset: LearningAsset) => void;
  vaultStatus: KnowledgeVaultStatus | null;
  onRefreshVaultStatus: () => void;
  onRefreshAssets: () => void;
  onOrganizeInbox: () => Promise<void>;
  pluginSyncStatus: ObsidianPluginSyncStatus | null;
  openVaultSetupInitially?: boolean;
  onVaultSetupClose?: () => void;
}

function dateLabel(value: string | null, empty: string): string {
  if (!value) return empty;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? empty
    : new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

const OBSIDIAN_VAULT_STORAGE_KEY = "binnagent:obsidian-vault-name";
const OBSIDIAN_CREATED_ASSETS_STORAGE_KEY = "binnagent:obsidian-created-assets";

function loadObsidianVaultName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(OBSIDIAN_VAULT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function obsidianAssetPath(asset: LearningAsset): string {
  const filename = `${asset.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80) || "asset"}-${asset.assetId.slice(-10)}.md`;
  return `BinnAgentX/${filename}`;
}

function obsidianCreateUri(asset: LearningAsset, vaultName: string): string {
  const tags = ["binnagent", asset.kind, ...asset.tags].map((tag) => `  - ${tag}`).join("\n");
  const content = [
    "---",
    'binnagent_schema: "asset/v1"',
    `binnagent_asset_id: "${asset.assetId}"`,
    `binnagent_kind: "${asset.kind}"`,
    "tags:",
    tags,
    "---",
    "",
    `# ${asset.title}`,
    "",
    "## 最初语境",
    "",
    "",
    "## 我的理解",
    "",
    "",
    "## 可迁移规则",
    "",
    "",
    "## 新语境验证",
    "",
  ].join("\n");
  return `obsidian://new?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(obsidianAssetPath(asset))}&content=${encodeURIComponent(content)}`;
}

function openOrCreateObsidianAsset(asset: LearningAsset, vaultName: string): void {
  const key = `${vaultName}:${asset.assetId}`;
  let created: Record<string, string> = {};
  try {
    created = JSON.parse(
      localStorage.getItem(OBSIDIAN_CREATED_ASSETS_STORAGE_KEY) ?? "{}",
    ) as Record<string, string>;
  } catch {
    // The deterministic Obsidian file path remains idempotent even without local storage.
  }
  const path = created[key] ?? obsidianAssetPath(asset);
  if (created[key]) {
    window.location.assign(
      `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(path)}`,
    );
    return;
  }
  created[key] = path;
  try {
    localStorage.setItem(OBSIDIAN_CREATED_ASSETS_STORAGE_KEY, JSON.stringify(created));
  } catch {
    // The user can safely re-run the deterministic create URI if storage is unavailable.
  }
  window.location.assign(obsidianCreateUri(asset, vaultName));
}

function recreateObsidianAsset(asset: LearningAsset, vaultName: string): void {
  const key = `${vaultName}:${asset.assetId}`;
  try {
    const created = JSON.parse(
      localStorage.getItem(OBSIDIAN_CREATED_ASSETS_STORAGE_KEY) ?? "{}",
    ) as Record<string, string>;
    delete created[key];
    localStorage.setItem(OBSIDIAN_CREATED_ASSETS_STORAGE_KEY, JSON.stringify(created));
  } catch {
    // The deterministic path still makes the following create request safe.
  }
  window.location.assign(obsidianCreateUri(asset, vaultName));
}

function ObsidianSetupDialog({
  status,
  vaultName,
  onClose,
  onSaveVault,
  onRefresh,
}: {
  status: KnowledgeVaultStatus | null;
  vaultName: string;
  onClose: () => void;
  onSaveVault: (vaultName: string) => void;
  onRefresh: () => void;
}) {
  const [draftVaultName, setDraftVaultName] = useState(vaultName);
  const [pluginConnection, setPluginConnection] = useState<ObsidianPluginConnection | null>(null);
  const hasVault = Boolean(draftVaultName.trim());

  const saveAndOpenVault = () => {
    const normalized = draftVaultName.trim();
    if (!normalized) return;
    onSaveVault(normalized);
    window.location.assign(`obsidian://open?vault=${encodeURIComponent(normalized)}`);
  };

  const createPluginConnection = () => {
    void createObsidianPluginConnection().then(setPluginConnection);
  };

  return (
    <div className="vault-setup-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="vault-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-setup-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="step-label">本机 Obsidian</p>
            <h2 id="vault-setup-title">连接你的知识库</h2>
          </div>
          <button type="button" aria-label="关闭 Obsidian 配置" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className={hasVault ? "vault-connection connected" : "vault-connection"}>
          <CheckCircle size={19} weight={hasVault ? "fill" : "regular"} />
          <span>
            <strong>{hasVault ? `已选择「${draftVaultName.trim()}」` : "尚未选择 Vault"}</strong>
            <small>
              {hasVault
                ? "浏览器会通过 Obsidian 桌面协议打开或创建笔记"
                : "先填写本机 Obsidian 中显示的 Vault 名称"}
            </small>
          </span>
          {status?.connected ? (
            <button type="button" onClick={onRefresh}>
              检查增强同步
            </button>
          ) : null}
        </div>

        <ol className="vault-setup-steps">
          <li>
            <span>1</span>
            <div>
              <strong>打开 Obsidian 桌面端</strong>
              <p>
                确认你想使用的 Vault 已经打开。浏览器会调用 Obsidian
                的本机链接协议，不会读取你的文件或要求终端权限。
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>选择 Vault</strong>
              <p>
                输入 Obsidian 侧边栏或 Vault
                切换器中显示的名称。该选择只保存在当前浏览器，用于生成打开笔记的本机链接。
              </p>
              <div className="vault-setup-fields">
                <label>
                  Vault 名称
                  <input
                    value={draftVaultName}
                    onChange={(event) => setDraftVaultName(event.target.value)}
                    placeholder="例如：我的英语知识库"
                  />
                </label>
                <button
                  type="button"
                  className="quiet-button"
                  disabled={!hasVault}
                  onClick={saveAndOpenVault}
                >
                  测试打开
                </button>
              </div>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>确认并开始积累</strong>
              <p>
                Obsidian 打开正确 Vault 后，回到这里关闭弹窗。每条资产的“在 Obsidian 中创建”会在该
                Vault 的 <code>BinnAgentX/</code> 文件夹建立笔记骨架；正文随后完全由你在 Obsidian
                中管理。
              </p>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <strong>安装并连接同步插件（可选）</strong>
              <p>
                下载 ZIP 后解压到 <code>你的 Vault/.obsidian/plugins/</code>，在 Obsidian 的
                Community plugins 启用 BinnAgentX Learning
                Sync。然后生成一对仅用于该插件的连接凭据，粘贴到插件设置页。
              </p>
              <a
                className="quiet-button"
                href="/downloads/BinnAgentX-Learning-Sync-v0.1.6.zip"
                download
              >
                下载 Obsidian 插件
              </a>
              <button type="button" className="quiet-button" onClick={createPluginConnection}>
                生成插件连接凭据
              </button>
              {pluginConnection ? (
                <pre>
                  <code>{`连接 ID: ${pluginConnection.connection_id}\n同步密钥: ${pluginConnection.sync_secret}`}</code>
                </pre>
              ) : null}
            </div>
          </li>
        </ol>

        <footer>
          <CheckCircle size={17} />
          <span>不需要复制配置、不需要 token，也不需要在终端运行命令。</span>
        </footer>
      </section>
    </div>
  );
}

export function LearningAssetsPanel({
  state,
  onAdd,
  onToggleStar,
  onOpen,
  vaultStatus,
  onRefreshVaultStatus,
  onRefreshAssets,
  onOrganizeInbox,
  pluginSyncStatus,
  openVaultSetupInitially = false,
  onVaultSetupClose,
}: LearningAssetsPanelProps) {
  const [group, setGroup] = useState<"all" | "knowledge" | "experience">("all");
  const [kind, setKind] = useState<LearningAssetKind | "all">("all");
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVaultSetup, setShowVaultSetup] = useState(openVaultSetupInitially);
  const [isOrganizingInbox, setIsOrganizingInbox] = useState(false);
  const [organizerNotice, setOrganizerNotice] = useState<string | null>(null);
  const [organizerQueued, setOrganizerQueued] = useState(false);
  const [obsidianVaultName, setObsidianVaultName] = useState(loadObsidianVaultName);
  const [draft, setDraft] = useState<LearningAssetInput>({
    kind: "vocabulary",
    title: "",
    tags: [],
    sourceTitle: "",
  });
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());

  const filteredItems = useMemo(
    () =>
      state.items.filter((item) => {
        const meta = KIND_META[item.kind];
        if (group !== "all" && meta.group !== group) return false;
        if (kind !== "all" && item.kind !== kind) return false;
        if (starredOnly && !item.starred) return false;
        if (!deferredQuery) return true;
        return [item.title, item.tags.join(" "), item.sourceTitle ?? "", meta.label]
          .join(" ")
          .toLocaleLowerCase()
          .includes(deferredQuery);
      }),
    [deferredQuery, group, kind, starredOnly, state.items],
  );
  const independentCount = state.items.filter(
    (item) =>
      item.evidenceStatus === "independently_usable" || item.evidenceStatus === "delayed_stable",
  ).length;
  const syncAttentionCount = state.items.filter((item) => item.syncStatus !== "synced").length;

  const saveObsidianVaultName = (value: string) => {
    setObsidianVaultName(value);
    try {
      localStorage.setItem(OBSIDIAN_VAULT_STORAGE_KEY, value);
    } catch {
      // The current tab can still use the selected Vault when storage is unavailable.
    }
  };

  const organizeInbox = async () => {
    if (!pluginSyncStatus?.paired) {
      setOrganizerQueued(false);
      setOrganizerNotice("请先完成 Obsidian 插件配对。");
      setShowVaultSetup(true);
      return;
    }
    setIsOrganizingInbox(true);
    setOrganizerQueued(false);
    setOrganizerNotice(null);
    try {
      await onOrganizeInbox();
      setOrganizerQueued(true);
    } catch {
      // The parent surface displays the shared public API error.
    } finally {
      setIsOrganizingInbox(false);
    }
  };

  return (
    <main className="assets-shell">
      <header className="assets-heading" data-ui-anchor="workspace-header">
        <div>
          <p className="eyebrow">学习资产 · 元数据索引</p>
          <h1>把读过的痕迹，连到你的 Obsidian 笔记</h1>
          <p>这里仅展示来源、证据和同步状态；详细知识内容由 Obsidian 管理。</p>
        </div>
        <div className="assets-heading-actions">
          <button
            type="button"
            className="quiet-button"
            disabled={isOrganizingInbox || pluginSyncStatus === null}
            onClick={() => void organizeInbox()}
          >
            <ArrowsClockwise size={16} />
            {isOrganizingInbox ? "正在提交…" : "整理 Obsidian 收件箱"}
          </button>
          <button type="button" className="quiet-button" onClick={onRefreshAssets}>
            <CloudArrowUp size={16} /> 刷新同步状态
          </button>
          <button type="button" className="quiet-button" onClick={() => setShowVaultSetup(true)}>
            <GearSix size={16} /> 配置 Obsidian
          </button>
          <button type="button" className="primary-button" onClick={() => setShowAddForm(true)}>
            <Plus size={16} weight="bold" /> 新增资产
          </button>
        </div>
      </header>
      {organizerQueued ? (
        <aside className="asset-organizer-guide" aria-live="polite">
          <div>
            <CheckCircle size={22} weight="fill" aria-hidden="true" />
            <div>
              <strong>整理任务已提交</strong>
              <p>保持 Obsidian 打开，插件通常会在 60 秒内自动整理。</p>
            </div>
          </div>
          <p>想立即完成：</p>
          <ol>
            <li>
              在 Obsidian 中按 <kbd>⌘ P</kbd>（Windows/Linux 按 <kbd>Ctrl P</kbd>）。
            </li>
            <li>
              搜索并运行 <code>Sync approved learning context</code>。
            </li>
          </ol>
          <small>看到“整理 N 条 Inbox 笔记”即表示完成。</small>
        </aside>
      ) : organizerNotice ? (
        <p className="asset-organizer-notice" role="status">
          {organizerNotice}
        </p>
      ) : null}

      <section className="assets-summary" aria-label="学习资产总览" data-ui-anchor="summary">
        <div
          className="assets-summary-group assets-summary-metrics"
          role="group"
          aria-label="资产统计"
        >
          <article>
            <Books size={20} />
            <span>累计资产</span>
            <strong>{state.items.length}</strong>
            <small>只索引元数据</small>
            <i
              className="asset-summary-theme-decor"
              data-theme-slot="card-corner-decor"
              aria-hidden="true"
            />
          </article>
          <article>
            <CheckCircle size={20} />
            <span>独立可用</span>
            <strong>{independentCount}</strong>
            <small>来自真实训练证据</small>
            <i
              className="asset-summary-theme-decor"
              data-theme-slot="card-corner-decor"
              aria-hidden="true"
            />
          </article>
          <article>
            <WarningCircle size={20} />
            <span>待同步</span>
            <strong>{syncAttentionCount}</strong>
            <small>不会阻断训练记录</small>
            <i
              className="asset-summary-theme-decor"
              data-theme-slot="card-corner-decor"
              aria-hidden="true"
            />
          </article>
        </div>
        <div className="asset-sync-overview" role="group" aria-label="同步连接">
          <header className="asset-sync-heading">
            <span>
              <ArrowsClockwise size={18} />
              <span>
                <strong>Obsidian 同步</strong>
                <small>本机知识库连接</small>
              </span>
            </span>
            <em data-state={pluginSyncStatus?.last_synced_at ? "ready" : "attention"}>
              {pluginSyncStatus?.last_synced_at
                ? "连接正常"
                : pluginSyncStatus?.paired
                  ? "等待同步"
                  : "尚未配对"}
            </em>
          </header>
          <div className="asset-sync-items">
            <button
              type="button"
              className="asset-vault-status"
              onClick={() => setShowVaultSetup(true)}
            >
              <LinkSimple size={16} />
              <span>
                <small>当前 Vault</small>
                <strong>{obsidianVaultName || "点击选择"}</strong>
              </span>
            </button>
            <article>
              <CloudArrowUp size={16} />
              <span>
                <small>插件状态</small>
                <strong>
                  {pluginSyncStatus?.last_synced_at
                    ? "已同步"
                    : pluginSyncStatus?.paired
                      ? "待同步"
                      : "未配对"}
                </strong>
              </span>
              <small>
                {pluginSyncStatus?.last_synced_at
                  ? `${pluginSyncStatus.synced_context_count} 条 · ${dateLabel(pluginSyncStatus.last_synced_at, "刚刚")}`
                  : "请在插件中执行 Sync"}
              </small>
            </article>
          </div>
          <i
            className="asset-summary-theme-decor"
            data-theme-slot="card-corner-decor"
            aria-hidden="true"
          />
        </div>
      </section>

      <div className="assets-layout">
        <aside className="asset-categories" aria-label="资产分类" data-ui-anchor="context-panel">
          <div className="asset-group-tabs">
            {(["all", "knowledge", "experience"] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={group === value ? "selected" : ""}
                onClick={() => {
                  setGroup(value);
                  setKind("all");
                }}
              >
                {value === "all" ? "全部" : value === "knowledge" ? "知识资产" : "经验资产"}
              </button>
            ))}
          </div>
          <div className="asset-kind-list">
            {KINDS.filter((value) => group === "all" || KIND_META[value].group === group).map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={kind === value ? "selected" : ""}
                  onClick={() => setKind(kind === value ? "all" : value)}
                >
                  <span>
                    <strong>{KIND_META[value].label}</strong>
                    <small>{KIND_META[value].description}</small>
                  </span>
                  <em>{state.items.filter((item) => item.kind === value).length}</em>
                </button>
              ),
            )}
          </div>
        </aside>

        <section className="asset-library" aria-labelledby="asset-library-title">
          <div className="asset-toolbar" data-ui-anchor="toolbar">
            <div>
              <p className="step-label">当前视图</p>
              <h2 id="asset-library-title">
                {kind === "all" ? "全部积累" : KIND_META[kind].label}
              </h2>
            </div>
            <label className="asset-search">
              <MagnifyingGlass size={16} />
              <span className="sr-only">搜索学习资产</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、标签或来源"
              />
            </label>
            <button
              type="button"
              className={starredOnly ? "asset-star-filter selected" : "asset-star-filter"}
              aria-pressed={starredOnly}
              onClick={() => setStarredOnly((current) => !current)}
            >
              <Star size={16} weight={starredOnly ? "fill" : "regular"} /> 只看重点
            </button>
          </div>

          {showAddForm ? (
            <form
              className="asset-add-form"
              data-ui-anchor="composer"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.title.trim()) return;
                onAdd(draft);
                setDraft({ kind: draft.kind, title: "", tags: [], sourceTitle: "" });
                setShowAddForm(false);
              }}
            >
              <header>
                <div>
                  <p className="step-label">创建笔记骨架</p>
                  <h3>先建立索引，再到 Obsidian 完成正文</h3>
                </div>
                <button
                  type="button"
                  aria-label="关闭新增资产"
                  onClick={() => setShowAddForm(false)}
                >
                  <X size={17} />
                </button>
              </header>
              <div className="asset-form-grid">
                <div className="asset-form-field">
                  <span>分类</span>
                  <Select
                    aria-label="资产分类"
                    value={draft.kind}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        kind: event.target.value as LearningAssetKind,
                      }))
                    }
                  >
                    {KINDS.map((value) => (
                      <option value={value} key={value}>
                        {KIND_META[value].label}
                      </option>
                    ))}
                  </Select>
                </div>
                <label>
                  <span>标题</span>
                  <input
                    required
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="例如：转折后优先找作者判断"
                  />
                </label>
                <label>
                  <span>索引标签</span>
                  <input
                    value={(draft.tags ?? []).join(", ")}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tags: event.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="可选，用逗号分隔"
                  />
                </label>
                <label>
                  <span>来源</span>
                  <input
                    value={draft.sourceTitle ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, sourceTitle: event.target.value }))
                    }
                    placeholder="可选：文章或训练名称"
                  />
                </label>
              </div>
              <footer>
                <span>不会在浏览器保存正文；同步后会创建受管 Obsidian 笔记骨架。</span>
                <button type="submit" className="primary-button">
                  创建索引
                </button>
              </footer>
            </form>
          ) : null}

          {filteredItems.length ? (
            <div className="asset-list">
              {filteredItems.map((item) => (
                <article className="asset-card" key={item.assetId} data-ui-anchor="card">
                  <header>
                    <span>{KIND_META[item.kind].label}</span>
                    <button
                      type="button"
                      aria-label={
                        item.starred ? `取消重点：${item.title}` : `标记重点：${item.title}`
                      }
                      onClick={() => onToggleStar(item.assetId)}
                    >
                      <Star size={18} weight={item.starred ? "fill" : "regular"} />
                    </button>
                  </header>
                  <h3>{item.title}</h3>
                  <p>
                    {item.tags.length
                      ? item.tags.map((tag) => `#${tag}`).join(" · ")
                      : "尚未添加索引标签"}
                  </p>
                  <div className="asset-mastery">
                    <span>证据状态：{STATUS_COPY[item.evidenceStatus]}</span>
                    <small>
                      {item.sourceTitle ? `来自《${item.sourceTitle}》 · ` : ""}证据{" "}
                      {item.evidenceCount} 条 · 最近验证 {dateLabel(item.lastVerifiedAt, "暂无")}
                    </small>
                  </div>
                  <footer>
                    {item.syncStatus === "synced" ? (
                      <button type="button" onClick={() => onOpen(item)}>
                        <LinkSimple size={15} /> 在 Obsidian 中打开
                      </button>
                    ) : obsidianVaultName ? (
                      <button
                        type="button"
                        onClick={() => openOrCreateObsidianAsset(item, obsidianVaultName)}
                      >
                        <LinkSimple size={15} /> 在 Obsidian 中创建
                      </button>
                    ) : (
                      <button type="button" onClick={() => setShowVaultSetup(true)}>
                        <GearSix size={15} /> 选择 Obsidian Vault
                      </button>
                    )}
                    {obsidianVaultName ? (
                      <button
                        type="button"
                        className="asset-recreate-button"
                        onClick={() => recreateObsidianAsset(item, obsidianVaultName)}
                      >
                        笔记已删除？重新创建
                      </button>
                    ) : null}
                    {item.syncStatus !== "synced" ? (
                      <span>
                        <WarningCircle size={15} />{" "}
                        {obsidianVaultName ? "等待你在本机创建" : "请先选择 Vault"}
                      </span>
                    ) : null}
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="asset-empty" data-ui-anchor="empty-state">
              <Books size={34} />
              <h3>
                {state.items.length ? "这个筛选下还没有内容" : "第一条资产，从真实学习动作开始"}
              </h3>
              <p>创建索引后，详细笔记将由 Obsidian 管理；学习证据仍保留在 BinnAgentX。</p>
              <button type="button" className="quiet-button" onClick={() => setShowAddForm(true)}>
                创建第一条索引
              </button>
            </div>
          )}
        </section>
      </div>
      {showVaultSetup ? (
        <ObsidianSetupDialog
          status={vaultStatus}
          vaultName={obsidianVaultName}
          onClose={() => {
            setShowVaultSetup(false);
            onVaultSetupClose?.();
          }}
          onSaveVault={saveObsidianVaultName}
          onRefresh={onRefreshVaultStatus}
        />
      ) : null}
    </main>
  );
}
