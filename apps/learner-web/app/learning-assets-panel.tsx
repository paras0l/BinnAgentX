"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Books,
  CheckCircle,
  MagnifyingGlass,
  Plus,
  Star,
  TrendUp,
  X,
} from "@phosphor-icons/react";

import type {
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
  writing_expression: {
    label: "写作句式",
    group: "knowledge",
    description: "可以主动迁移的表达",
  },
  reading_skill: { label: "阅读技巧", group: "experience", description: "理解与定位的做法" },
  exam_skill: { label: "做题技巧", group: "experience", description: "判断与检查的策略" },
  writing_skill: { label: "写作技巧", group: "experience", description: "组织和修订的方法" },
};

const KINDS = Object.keys(KIND_META) as LearningAssetKind[];

interface LearningAssetsPanelProps {
  state: LearningAssetsState;
  onAdd: (input: LearningAssetInput) => void;
  onReview: (assetId: string) => void;
  onToggleStar: (assetId: string) => void;
  onMaster: (assetId: string, mastery: number) => void;
}

function relativeDate(value: string | null): string {
  if (!value) return "尚未复习";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "已复习"
    : new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

export function LearningAssetsPanel({
  state,
  onAdd,
  onReview,
  onToggleStar,
  onMaster,
}: LearningAssetsPanelProps) {
  const [group, setGroup] = useState<"all" | "knowledge" | "experience">("all");
  const [kind, setKind] = useState<LearningAssetKind | "all">("all");
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  const [draft, setDraft] = useState<LearningAssetInput>({
    kind: "vocabulary",
    title: "",
    content: "",
    note: "",
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
        return [item.title, item.content, item.note, item.sourceTitle, meta.label]
          .join(" ")
          .toLocaleLowerCase()
          .includes(deferredQuery);
      }),
    [deferredQuery, group, kind, starredOnly, state.items],
  );
  const masteredCount = state.items.filter((item) => item.mastery >= 80).length;
  const averageMastery = state.items.length
    ? Math.round(state.items.reduce((sum, item) => sum + item.mastery, 0) / state.items.length)
    : 0;
  const sevenDaysAgo = renderedAt - 7 * 24 * 60 * 60 * 1000;
  const recentlyReviewed = state.items.filter(
    (item) => item.lastReviewedAt && new Date(item.lastReviewedAt).getTime() >= sevenDaysAgo,
  ).length;

  const selectGroup = (nextGroup: "all" | "knowledge" | "experience") => {
    setGroup(nextGroup);
    setKind("all");
  };

  return (
    <main className="assets-shell">
      <header className="assets-heading">
        <div>
          <p className="eyebrow">学习资产 · 由真实学习动作积累</p>
          <h1>把读过的痕迹，变成下一次能复用的能力</h1>
          <p>原文标记、H1 纠偏和写作反馈会自动沉淀在这里；你也可以手动补充并安排复习。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setShowAddForm(true)}>
          <Plus size={16} weight="bold" />
          新增资产
        </button>
      </header>

      <section className="assets-summary" aria-label="学习资产总览">
        <article>
          <Books size={20} />
          <span>累计资产</span>
          <strong>{state.items.length}</strong>
          <small>每一条都来自你的记录</small>
        </article>
        <article>
          <CheckCircle size={20} />
          <span>已掌握</span>
          <strong>{masteredCount}</strong>
          <small>掌握度达到 80%</small>
        </article>
        <article>
          <ArrowClockwise size={20} />
          <span>近 7 天复习</span>
          <strong>{recentlyReviewed}</strong>
          <small>按真实复习动作计算</small>
        </article>
        <article>
          <TrendUp size={20} />
          <span>平均掌握度</span>
          <strong>{averageMastery}%</strong>
          <small>复习一次会逐步增长</small>
        </article>
      </section>

      <div className="assets-layout">
        <aside className="asset-categories" aria-label="资产分类">
          <div className="asset-group-tabs">
            {(["all", "knowledge", "experience"] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={group === value ? "selected" : ""}
                onClick={() => selectGroup(value)}
              >
                {value === "all" ? "全部" : value === "knowledge" ? "知识资产" : "经验资产"}
              </button>
            ))}
          </div>
          <div className="asset-kind-list">
            {KINDS.filter((value) => group === "all" || KIND_META[value].group === group).map(
              (value) => {
                const items = state.items.filter((item) => item.kind === value);
                const mastery = items.length
                  ? Math.round(items.reduce((sum, item) => sum + item.mastery, 0) / items.length)
                  : 0;
                return (
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
                    <em>{items.length}</em>
                    <i aria-hidden="true">
                      <b style={{ width: `${mastery}%` }} />
                    </i>
                  </button>
                );
              },
            )}
          </div>
        </aside>

        <section className="asset-library" aria-labelledby="asset-library-title">
          <div className="asset-toolbar">
            <div>
              <p className="step-label">当前视图</p>
              <h2 id="asset-library-title">
                {kind === "all"
                  ? group === "knowledge"
                    ? "知识资产"
                    : group === "experience"
                      ? "经验资产"
                      : "全部积累"
                  : KIND_META[kind].label}
              </h2>
            </div>
            <label className="asset-search">
              <MagnifyingGlass size={16} />
              <span className="sr-only">搜索学习资产</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索内容、来源或笔记"
              />
            </label>
            <button
              type="button"
              className={starredOnly ? "asset-star-filter selected" : "asset-star-filter"}
              aria-pressed={starredOnly}
              onClick={() => setStarredOnly((current) => !current)}
            >
              <Star size={16} weight={starredOnly ? "fill" : "regular"} />
              只看重点
            </button>
          </div>

          {showAddForm ? (
            <form
              className="asset-add-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.title.trim() || !draft.content.trim()) return;
                onAdd(draft);
                setDraft({
                  kind: draft.kind,
                  title: "",
                  content: "",
                  note: "",
                  sourceTitle: "",
                });
                setShowAddForm(false);
              }}
            >
              <header>
                <div>
                  <p className="step-label">手动沉淀</p>
                  <h3>记录一条刚刚学会的东西</h3>
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
                <label>
                  <span>分类</span>
                  <select
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
                  </select>
                </label>
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
                <label className="asset-form-wide">
                  <span>内容</span>
                  <textarea
                    required
                    value={draft.content}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, content: event.target.value }))
                    }
                    placeholder="写下它是什么、怎么使用"
                  />
                </label>
                <label>
                  <span>我的备注</span>
                  <input
                    value={draft.note}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, note: event.target.value }))
                    }
                    placeholder="可选"
                  />
                </label>
                <label>
                  <span>来源</span>
                  <input
                    value={draft.sourceTitle}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, sourceTitle: event.target.value }))
                    }
                    placeholder="可选：文章或训练名称"
                  />
                </label>
              </div>
              <footer>
                <span>保存后从 10% 掌握度开始，复习会留下真实进度。</span>
                <button type="submit" className="primary-button">
                  保存到资产库
                </button>
              </footer>
            </form>
          ) : null}

          {filteredItems.length ? (
            <div className="asset-list">
              {filteredItems.map((item) => (
                <article className="asset-card" key={item.assetId}>
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
                  <p>{item.content}</p>
                  {item.note ? <blockquote>{item.note}</blockquote> : null}
                  <div className="asset-mastery">
                    <span>
                      <i aria-hidden="true">
                        <b style={{ width: `${item.mastery}%` }} />
                      </i>
                      掌握度 {item.mastery}%
                    </span>
                    <small>
                      {item.sourceTitle ? `来自《${item.sourceTitle}》 · ` : ""}
                      复习 {item.reviewCount} 次 · {relativeDate(item.lastReviewedAt)}
                    </small>
                  </div>
                  <footer>
                    <button type="button" onClick={() => onReview(item.assetId)}>
                      <ArrowClockwise size={15} />
                      复习一次
                    </button>
                    {item.mastery < 100 ? (
                      <button type="button" onClick={() => onMaster(item.assetId, 100)}>
                        <CheckCircle size={15} />
                        标记掌握
                      </button>
                    ) : (
                      <span>
                        <CheckCircle size={15} weight="fill" /> 已掌握
                      </span>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="asset-empty">
              <Books size={34} />
              <h3>
                {state.items.length ? "这个筛选下还没有内容" : "第一条资产，应该来自真实学习动作"}
              </h3>
              <p>
                {state.items.length
                  ? "换一个分类或搜索词，继续查看自己的积累。"
                  : "在阅读中标记生词、句式和逻辑，或领取一次纠偏反馈，它们都会自动来到这里。"}
              </p>
              <button type="button" className="quiet-button" onClick={() => setShowAddForm(true)}>
                现在手动记一条
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
