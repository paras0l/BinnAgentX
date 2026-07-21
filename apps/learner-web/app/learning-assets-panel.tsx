"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Books,
  CloudArrowUp,
  LinkSimple,
  MagnifyingGlass,
  Plus,
  Star,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import type {
  EvidenceStatus,
  LearningAssetInput,
  LearningAssetKind,
  LearningAssetsState,
} from "../lib/learning-assets-storage";

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
  onOpen: (assetId: string, documentUri: string | null) => void;
  onSync: (assetId: string) => void;
}

function dateLabel(value: string | null, empty: string): string {
  if (!value) return empty;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? empty
    : new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

export function LearningAssetsPanel({
  state,
  onAdd,
  onToggleStar,
  onOpen,
  onSync,
}: LearningAssetsPanelProps) {
  const [group, setGroup] = useState<"all" | "knowledge" | "experience">("all");
  const [kind, setKind] = useState<LearningAssetKind | "all">("all");
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
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
    (item) => item.evidenceStatus === "independently_usable" || item.evidenceStatus === "delayed_stable",
  ).length;
  const syncAttentionCount = state.items.filter((item) => item.syncStatus !== "synced").length;

  return (
    <main className="assets-shell">
      <header className="assets-heading" data-ui-anchor="workspace-header">
        <div>
          <p className="eyebrow">学习资产 · 元数据索引</p>
          <h1>把读过的痕迹，连到你的 Obsidian 笔记</h1>
          <p>这里仅展示来源、证据和同步状态；详细知识内容由 Obsidian 管理。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setShowAddForm(true)}>
          <Plus size={16} weight="bold" /> 新增资产
        </button>
      </header>

      <section className="assets-summary" aria-label="学习资产总览" data-ui-anchor="summary">
        <article><Books size={20} /><span>累计资产</span><strong>{state.items.length}</strong><small>只索引元数据</small></article>
        <article><LinkSimple size={20} /><span>独立可用</span><strong>{independentCount}</strong><small>来自真实训练证据</small></article>
        <article><CloudArrowUp size={20} /><span>待同步</span><strong>{syncAttentionCount}</strong><small>不会阻断训练记录</small></article>
      </section>

      <div className="assets-layout">
        <aside className="asset-categories" aria-label="资产分类" data-ui-anchor="context-panel">
          <div className="asset-group-tabs">
            {(["all", "knowledge", "experience"] as const).map((value) => (
              <button type="button" key={value} className={group === value ? "selected" : ""}
                onClick={() => { setGroup(value); setKind("all"); }}>
                {value === "all" ? "全部" : value === "knowledge" ? "知识资产" : "经验资产"}
              </button>
            ))}
          </div>
          <div className="asset-kind-list">
            {KINDS.filter((value) => group === "all" || KIND_META[value].group === group).map((value) => (
              <button type="button" key={value} className={kind === value ? "selected" : ""}
                onClick={() => setKind(kind === value ? "all" : value)}>
                <span><strong>{KIND_META[value].label}</strong><small>{KIND_META[value].description}</small></span>
                <em>{state.items.filter((item) => item.kind === value).length}</em>
              </button>
            ))}
          </div>
        </aside>

        <section className="asset-library" aria-labelledby="asset-library-title">
          <div className="asset-toolbar" data-ui-anchor="toolbar">
            <div><p className="step-label">当前视图</p><h2 id="asset-library-title">{kind === "all" ? "全部积累" : KIND_META[kind].label}</h2></div>
            <label className="asset-search"><MagnifyingGlass size={16} /><span className="sr-only">搜索学习资产</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、标签或来源" />
            </label>
            <button type="button" className={starredOnly ? "asset-star-filter selected" : "asset-star-filter"}
              aria-pressed={starredOnly} onClick={() => setStarredOnly((current) => !current)}>
              <Star size={16} weight={starredOnly ? "fill" : "regular"} /> 只看重点
            </button>
          </div>

          {showAddForm ? (
            <form className="asset-add-form" data-ui-anchor="composer" onSubmit={(event) => {
              event.preventDefault();
              if (!draft.title.trim()) return;
              onAdd(draft);
              setDraft({ kind: draft.kind, title: "", tags: [], sourceTitle: "" });
              setShowAddForm(false);
            }}>
              <header><div><p className="step-label">创建笔记骨架</p><h3>先建立索引，再到 Obsidian 完成正文</h3></div>
                <button type="button" aria-label="关闭新增资产" onClick={() => setShowAddForm(false)}><X size={17} /></button>
              </header>
              <div className="asset-form-grid">
                <label><span>分类</span><select value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as LearningAssetKind }))}>
                  {KINDS.map((value) => <option value={value} key={value}>{KIND_META[value].label}</option>)}
                </select></label>
                <label><span>标题</span><input required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="例如：转折后优先找作者判断" /></label>
                <label><span>索引标签</span><input value={(draft.tags ?? []).join(", ")} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} placeholder="可选，用逗号分隔" /></label>
                <label><span>来源</span><input value={draft.sourceTitle ?? ""} onChange={(event) => setDraft((current) => ({ ...current, sourceTitle: event.target.value }))} placeholder="可选：文章或训练名称" /></label>
              </div>
              <footer><span>不会在浏览器保存正文；同步后会创建受管 Obsidian 笔记骨架。</span><button type="submit" className="primary-button">创建索引</button></footer>
            </form>
          ) : null}

          {filteredItems.length ? <div className="asset-list">{filteredItems.map((item) => (
            <article className="asset-card" key={item.assetId} data-ui-anchor="card">
              <header><span>{KIND_META[item.kind].label}</span><button type="button" aria-label={item.starred ? `取消重点：${item.title}` : `标记重点：${item.title}`} onClick={() => onToggleStar(item.assetId)}><Star size={18} weight={item.starred ? "fill" : "regular"} /></button></header>
              <h3>{item.title}</h3>
              <p>{item.tags.length ? item.tags.map((tag) => `#${tag}`).join(" · ") : "尚未添加索引标签"}</p>
              <div className="asset-mastery"><span>证据状态：{STATUS_COPY[item.evidenceStatus]}</span><small>{item.sourceTitle ? `来自《${item.sourceTitle}》 · ` : ""}证据 {item.evidenceCount} 条 · 最近验证 {dateLabel(item.lastVerifiedAt, "暂无")}</small></div>
              <footer>
                {item.syncStatus === "synced" ? <button type="button" onClick={() => onOpen(item.assetId, item.documentUri)}><LinkSimple size={15} /> 在 Obsidian 中打开</button> : <button type="button" onClick={() => onSync(item.assetId)}><ArrowClockwise size={15} /> 重试同步</button>}
                {item.syncStatus !== "synced" ? <span><WarningCircle size={15} /> {item.syncErrorCode ? "同步暂不可用" : "等待同步"}</span> : null}
              </footer>
            </article>
          ))}</div> : <div className="asset-empty" data-ui-anchor="empty-state"><Books size={34} /><h3>{state.items.length ? "这个筛选下还没有内容" : "第一条资产，从真实学习动作开始"}</h3><p>创建索引后，详细笔记将由 Obsidian 管理；学习证据仍保留在 BinnAgentX。</p><button type="button" className="quiet-button" onClick={() => setShowAddForm(true)}>创建第一条索引</button></div>}
        </section>
      </div>
    </main>
  );
}
