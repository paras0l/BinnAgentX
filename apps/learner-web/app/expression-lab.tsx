"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsOutCardinal,
  Brain,
  CardsThree,
  LightbulbFilament,
  Plus,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";

import { reviewExpression } from "../lib/api";
import type {
  ExpressionMaterialView,
  ExpressionReviewView,
  LearnerTaskView,
} from "../lib/contracts";
import {
  buildExpressionAssistSuggestions,
  createExpressionNote,
  loadExpressionLab,
  saveExpressionLab,
  type ExpressionAssistFocus,
  type ExpressionBoardNote,
  type ExpressionLabState,
  type ExpressionNoteKind,
} from "../lib/expression-lab-storage";
import type { LearningAsset, LearningAssetInput } from "../lib/learning-assets-storage";

type LabTab = "brief" | "board" | "review";

const NOTE_KIND_COPY: Record<ExpressionNoteKind, { label: string; placeholder: string }> = {
  claim: { label: "论点", placeholder: "我真正想表达的判断是…" },
  example: { label: "例子", placeholder: "一个具体的人、场景或结果…" },
  expression: { label: "金句 / 表达", placeholder: "想迁移的结构或搭配…" },
};

const ASSIST_FOCUS_COPY: Record<ExpressionAssistFocus, string> = {
  idea: "观点卡住了",
  example: "想不到例子",
  wording: "不知道怎么说",
  structure: "思路散了",
};

interface DragState {
  noteId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

interface ExpressionLabProps {
  material: ExpressionMaterialView;
  task: LearnerTaskView;
  learningAssets: LearningAsset[];
  reducedMotion: boolean;
  materialRef: React.RefObject<HTMLElement | null>;
  onLearningAssetCapture: (input: LearningAssetInput) => void;
}

export function ExpressionLab({
  material,
  task,
  learningAssets,
  reducedMotion,
  materialRef,
  onLearningAssetCapture,
}: ExpressionLabProps) {
  const [tab, setTab] = useState<LabTab>("brief");
  const [lab, setLab] = useState<ExpressionLabState>(() =>
    loadExpressionLab(task.task_id, task.current_content_version_id),
  );
  const [assistFocus, setAssistFocus] = useState<ExpressionAssistFocus | null>(null);
  const [review, setReview] = useState<ExpressionReviewView | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewPending, setReviewPending] = useState(false);
  const [activeStyle, setActiveStyle] = useState<"logic_mirror" | "academic" | "news">("academic");
  const [split, setSplit] = useState(50);
  const [capturedStyle, setCapturedStyle] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => saveExpressionLab(lab), 350);
    return () => window.clearTimeout(timer);
  }, [lab]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      const board = boardRef.current;
      if (!drag || !board || drag.pointerId !== event.pointerId) return;
      const rect = board.getBoundingClientRect();
      const x = Math.max(
        8,
        Math.min(980, event.clientX - rect.left + board.scrollLeft - drag.offsetX),
      );
      const y = Math.max(
        8,
        Math.min(680, event.clientY - rect.top + board.scrollTop - drag.offsetY),
      );
      setLab((current) => ({
        ...current,
        notes: current.notes.map((note) => (note.id === drag.noteId ? { ...note, x, y } : note)),
      }));
    };
    const finish = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, []);

  const suggestions = useMemo(
    () => (assistFocus ? buildExpressionAssistSuggestions(assistFocus, learningAssets) : []),
    [assistFocus, learningAssets],
  );
  const savedDraft = task.attempts.at(-1)?.text ?? "";
  const activeVersion = review?.versions.find((version) => version.style === activeStyle) ?? null;

  const addNote = (kind: ExpressionNoteKind, initialText = "") => {
    setLab((current) => ({
      ...current,
      notes: [
        ...current.notes,
        { ...createExpressionNote(kind, current.notes.length), text: initialText },
      ],
    }));
    setTab("board");
  };

  const updateNote = (noteId: string, patch: Partial<ExpressionBoardNote>) => {
    setLab((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note)),
    }));
  };

  const runReview = async () => {
    if (!savedDraft || reviewPending) return;
    setReviewPending(true);
    setReviewError(null);
    setCapturedStyle(null);
    try {
      setReview(
        await reviewExpression(
          task,
          savedDraft,
          learningAssets.slice(0, 4).map(({ title, content }) => ({ title, content })),
        ),
      );
    } catch {
      setReviewError("复盘暂时没有生成。你的原文和白板都已保留，可以稍后重试。");
    } finally {
      setReviewPending(false);
    }
  };

  return (
    <article
      className="expression-lab"
      ref={materialRef}
      tabIndex={-1}
      aria-labelledby="expression-lab-title"
    >
      <header className="expression-lab-header">
        <div>
          <p className="step-label">表达实验室 · 自主输出优先</p>
          <h1 id="expression-lab-title">{material.title}</h1>
        </div>
        <nav aria-label="表达实验室工具">
          <button
            className={tab === "brief" ? "selected" : ""}
            type="button"
            onClick={() => setTab("brief")}
          >
            任务
          </button>
          <button
            className={tab === "board" ? "selected" : ""}
            type="button"
            onClick={() => setTab("board")}
          >
            白板 <span>{lab.notes.length}</span>
          </button>
          <button
            className={tab === "review" ? "selected" : ""}
            type="button"
            onClick={() => setTab("review")}
          >
            写后复盘
          </button>
        </nav>
      </header>

      {tab === "brief" ? (
        <div className="expression-brief-content">
          <div className="situation-card">
            <span>情境</span>
            <p>{material.situation}</p>
          </div>
          <dl className="brief-details">
            <div>
              <dt>写给谁</dt>
              <dd>{material.audience}</dd>
            </div>
            <div>
              <dt>表达目的</dt>
              <dd>{material.purpose}</dd>
            </div>
            <div>
              <dt>思路动作</dt>
              <dd>{material.target_argument_move}</dd>
            </div>
          </dl>
          <section className="resource-card">
            <span>可选表达资源</span>
            <p>{material.optional_active_resource}</p>
            <small>可以借用思路或结构，但不要原句照搬。</small>
          </section>
          <button className="expression-open-board" type="button" onClick={() => setTab("board")}>
            <CardsThree size={18} /> 先去白板摊开思路
          </button>
        </div>
      ) : null}

      {tab === "board" ? (
        <div className="expression-board-shell">
          <div className="expression-board-tools" aria-label="白板工具">
            {(Object.keys(NOTE_KIND_COPY) as ExpressionNoteKind[]).map((kind) => (
              <button key={kind} type="button" onClick={() => addNote(kind)}>
                <Plus size={15} /> {NOTE_KIND_COPY[kind].label}
              </button>
            ))}
          </div>
          <div className="expression-board" ref={boardRef} aria-label="写作前灵感白板">
            <div className="expression-board-canvas">
              {lab.notes.length === 0 ? (
                <div className="expression-board-empty">
                  <LightbulbFilament size={26} />
                  <strong>不要急着排成大纲</strong>
                  <p>先放下一张论点、例子或表达便签，再慢慢移动它们之间的关系。</p>
                </div>
              ) : null}
              {lab.notes.map((note) => (
                <section
                  key={note.id}
                  className={`expression-note expression-note-${note.kind}`}
                  style={{ transform: `translate(${note.x}px, ${note.y}px)` }}
                >
                  <header>
                    <button
                      type="button"
                      aria-label={`拖动${NOTE_KIND_COPY[note.kind].label}便签`}
                      onPointerDown={(event) => {
                        const rect = event.currentTarget
                          .closest("section")
                          ?.getBoundingClientRect();
                        if (!rect) return;
                        event.preventDefault();
                        dragRef.current = {
                          noteId: note.id,
                          pointerId: event.pointerId,
                          offsetX: event.clientX - rect.left,
                          offsetY: event.clientY - rect.top,
                        };
                      }}
                    >
                      <ArrowsOutCardinal size={14} /> {NOTE_KIND_COPY[note.kind].label}
                    </button>
                    <button
                      type="button"
                      aria-label={`删除${NOTE_KIND_COPY[note.kind].label}便签`}
                      onClick={() =>
                        setLab((current) => ({
                          ...current,
                          notes: current.notes.filter((item) => item.id !== note.id),
                        }))
                      }
                    >
                      <Trash size={14} />
                    </button>
                  </header>
                  <textarea
                    value={note.text}
                    aria-label={`${NOTE_KIND_COPY[note.kind].label}内容`}
                    placeholder={NOTE_KIND_COPY[note.kind].placeholder}
                    onChange={(event) => updateNote(note.id, { text: event.target.value })}
                  />
                </section>
              ))}
            </div>
          </div>
          <section className="expression-assist" aria-labelledby="expression-assist-title">
            <div>
              <Brain size={19} />
              <span>
                <strong id="expression-assist-title">卡住时再叫我</strong>
                <small>先连回近期所学，再留一条向外拓展</small>
              </span>
            </div>
            <div className="expression-assist-focus" role="group" aria-label="当前卡点">
              {(Object.keys(ASSIST_FOCUS_COPY) as ExpressionAssistFocus[]).map((focus) => (
                <button
                  key={focus}
                  className={assistFocus === focus ? "selected" : ""}
                  type="button"
                  onClick={() => setAssistFocus(focus)}
                >
                  {ASSIST_FOCUS_COPY[focus]}
                </button>
              ))}
            </div>
            {assistFocus ? (
              <div className="expression-suggestions" aria-live="polite">
                {suggestions.map((suggestion) => (
                  <article key={suggestion.id}>
                    <span>
                      {suggestion.source === "recent_asset" ? "近期学习资产" : "拓展 30%"}
                    </span>
                    <strong>{suggestion.title}</strong>
                    <p>{suggestion.detail}</p>
                    <button
                      type="button"
                      onClick={() =>
                        addNote(
                          suggestion.source === "recent_asset" ? "expression" : "claim",
                          suggestion.detail,
                        )
                      }
                    >
                      放到白板再自己改
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "review" ? (
        <section className="expression-review" aria-labelledby="expression-review-title">
          <header>
            <div>
              <p className="step-label">写后风格迁移 · 不覆盖原文</p>
              <h3 id="expression-review-title">看懂“为什么这样改”，再决定是否亲自写 V2</h3>
            </div>
            <button
              className="secondary-button"
              type="button"
              disabled={!savedDraft || reviewPending}
              onClick={runReview}
            >
              <Sparkle size={17} />
              {reviewPending ? "正在生成三种风格…" : review ? "重新复盘已保存版本" : "生成三种风格"}
            </button>
          </header>
          {!savedDraft ? (
            <p className="expression-review-empty">先在右侧完成并保存 V1，写后复盘才会开启。</p>
          ) : null}
          {reviewError ? (
            <p className="expression-review-error" role="alert">
              {reviewError}
            </p>
          ) : null}
          {review && activeVersion ? (
            <>
              <div className="expression-style-tabs" role="tablist" aria-label="风格版本">
                {review.versions.map((version) => (
                  <button
                    key={version.style}
                    type="button"
                    role="tab"
                    aria-selected={activeStyle === version.style}
                    className={activeStyle === version.style ? "selected" : ""}
                    onClick={() => {
                      setActiveStyle(version.style);
                      setCapturedStyle(null);
                    }}
                  >
                    {version.label}
                  </button>
                ))}
              </div>
              <p className="expression-thinking-difference">{review.thinking_difference}</p>
              <div
                className="expression-review-compare"
                style={{ gridTemplateColumns: `${split}fr ${100 - split}fr` }}
              >
                <article style={{ opacity: Math.max(0.45, (100 - split) / 50) }}>
                  <span>我的原文</span>
                  <p>{savedDraft}</p>
                </article>
                <article style={{ opacity: Math.max(0.45, split / 50) }}>
                  <span>{activeVersion.label}</span>
                  <p>{activeVersion.text}</p>
                  <ul>
                    {activeVersion.explanation.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
              <label className="expression-review-slider">
                <span>拖向左侧看原始逻辑</span>
                <input
                  type="range"
                  min="28"
                  max="72"
                  value={split}
                  aria-label="调整原文与风格版本的对照宽度"
                  onChange={(event) => setSplit(Number(event.target.value))}
                />
                <span>拖向右侧看地道组织</span>
              </label>
              <footer>
                <small>
                  {review.source === "model" ? "受约束模型复盘" : "本地保守复盘"} ·{" "}
                  {review.boundary_note}
                </small>
                <button
                  type="button"
                  className="quiet-button"
                  disabled={capturedStyle === activeVersion.style}
                  onClick={() => {
                    onLearningAssetCapture({
                      kind: "writing_skill",
                      title: `风格复盘：${activeVersion.label}`,
                      content: activeVersion.explanation.join("；"),
                      note: `来自自己的已保存版本。对照文本：${activeVersion.text}`,
                      sourceTitle: material.title,
                    });
                    setCapturedStyle(activeVersion.style);
                  }}
                >
                  {capturedStyle === activeVersion.style ? "已加入学习资产" : "把差异加入学习资产"}
                </button>
              </footer>
            </>
          ) : null}
          {reducedMotion ? <span className="sr-only">已减少复盘区域的动态过渡。</span> : null}
        </section>
      ) : null}
    </article>
  );
}
