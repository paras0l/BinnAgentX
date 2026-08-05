"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { ArrowLeft, Check, SlidersHorizontal } from "@phosphor-icons/react";

import type { AnnotationAnalysisView } from "../lib/contracts";
import {
  addComponentMark,
  applyComponentStyle,
  COMPONENT_STYLE_LABELS,
  componentStyleOwner,
  type ComponentMarkStyle,
  type ComponentStyleMap,
  type IntensiveFollowUpThread,
  type IntensiveFollowUpTarget,
  type IntensiveReadingSession,
  type SentenceComponentMark,
  type SentenceComponentRole,
  SENTENCE_COMPONENT_LABELS,
} from "../lib/intensive-reading";
import { Select } from "./select";

export type { IntensiveReadingSession } from "../lib/intensive-reading";

interface MarkDraft {
  start: number;
  end: number;
  textQuote: string;
}

interface PendingStyleChange {
  role: SentenceComponentRole;
  style: ComponentMarkStyle;
  owner: SentenceComponentRole;
}

interface PendingMarkReplacement {
  next: SentenceComponentMark;
  replaced: SentenceComponentMark[];
}

export function IntensiveReadingPane({
  session,
  reducedMotion,
  onExit,
  onMarksChange,
  onStylesChange,
  onFollowUp,
}: {
  session: IntensiveReadingSession;
  reducedMotion: boolean;
  onExit: () => void;
  onMarksChange: (marks: SentenceComponentMark[]) => void;
  onStylesChange: (styles: ComponentStyleMap) => void;
  onFollowUp: (target: IntensiveFollowUpTarget, question: string) => void;
}) {
  const sentenceRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [markDraft, setMarkDraft] = useState<MarkDraft | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<PendingMarkReplacement | null>(null);
  const [pendingStyle, setPendingStyle] = useState<PendingStyleChange | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [insightFollowUpTarget, setInsightFollowUpTarget] =
    useState<IntensiveFollowUpTarget | null>(null);
  const [insightFollowUpDraft, setInsightFollowUpDraft] = useState("");
  const insightFollowUpInputRef = useRef<HTMLTextAreaElement>(null);
  const markingEnabled = session.phase !== "analyzing";

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [session.id]);

  const captureSelection = () => {
    if (!markingEnabled || !sentenceRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!sentenceRef.current.contains(range.commonAncestorContainer)) return;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(sentenceRef.current);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    const textQuote = range.toString();
    if (!textQuote.trim()) return;
    setMarkDraft({ start, end: start + textQuote.length, textQuote });
  };

  const chooseRole = (role: SentenceComponentRole) => {
    if (!markDraft) return;
    const next: SentenceComponentMark = {
      id: `${session.id}-mark-${role}-${markDraft.start}-${markDraft.end}`,
      role,
      ...markDraft,
    };
    const result = addComponentMark(session.sentence.textQuote, session.marks, next);
    if (result.replaced.length > 0) {
      setPendingReplacement({ next, replaced: result.replaced });
      return;
    }
    onMarksChange(result.marks);
    setMarkDraft(null);
    window.getSelection()?.removeAllRanges();
  };

  const requestStyleChange = (role: SentenceComponentRole, style: ComponentMarkStyle) => {
    const owner = componentStyleOwner(session.styles, style, role);
    if (owner) {
      setPendingStyle({ role, style, owner });
      return;
    }
    onStylesChange(applyComponentStyle(session.styles, role, style));
  };
  const openInsightFollowUp = (target: IntensiveFollowUpTarget) => {
    setInsightFollowUpTarget(target);
    setInsightFollowUpDraft(target.suggestedQuestions[0] ?? "");
    window.requestAnimationFrame(() => insightFollowUpInputRef.current?.focus());
  };

  return (
    <article
      className={`intensive-reading-pane${reducedMotion ? " reduced-motion" : ""}`}
      aria-labelledby="intensive-reading-title"
    >
      <header>
        <button type="button" className="quiet-button" onClick={onExit}>
          <ArrowLeft size={17} /> 返回全文
        </button>
        <div>
          <p className="step-label">语境实验室 · 整句精读</p>
          <h2 ref={titleRef} id="intensive-reading-title" tabIndex={-1}>
            第 {session.paragraphNumber} 段 · 先自己拆，再核对
          </h2>
        </div>
        <button
          type="button"
          className="quiet-button component-display-settings-trigger"
          onClick={() => setSettingsOpen(true)}
        >
          <SlidersHorizontal size={17} /> 标记显示设置
        </button>
      </header>

      <div className="intensive-sentence-stage">
        <p
          ref={sentenceRef}
          className="intensive-sentence"
          data-intensive-sentence
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
          tabIndex={0}
          aria-label="当前精读完整句"
        >
          <MarkedSentence
            sentence={session.sentence.textQuote}
            marks={session.marks}
            styles={session.styles}
          />
        </p>
        {session.sentence.usedParagraphFallback ? (
          <small role="status">未识别到可靠句界，本次使用完整段落。</small>
        ) : null}
        {markingEnabled ? (
          <p className="intensive-stage-hint">
            选中句中范围，再选择成分；你可以同时在右侧写翻译，二者互不影响。
          </p>
        ) : null}
        {session.phase === "review" && session.analysis ? (
          <ComponentAnswerSentence
            sentence={session.sentence.textQuote}
            candidates={session.analysis.sentence_components}
            styles={session.styles}
            onFollowUp={openInsightFollowUp}
          />
        ) : null}
      </div>

      {markDraft ? (
        <div className="component-role-picker" role="toolbar" aria-label="选择句子成分">
          <strong>“{markDraft.textQuote}”是：</strong>
          {(Object.keys(SENTENCE_COMPONENT_LABELS) as SentenceComponentRole[]).map((role) => (
            <button key={role} type="button" onClick={() => chooseRole(role)}>
              {SENTENCE_COMPONENT_LABELS[role]}
            </button>
          ))}
          <button type="button" onClick={() => setMarkDraft(null)}>
            取消
          </button>
        </div>
      ) : null}

      {pendingReplacement ? (
        <div className="component-conflict-dialog" role="alertdialog" aria-modal="false">
          <strong>这个范围与已有标记重叠</strong>
          <p>
            确认后将用{SENTENCE_COMPONENT_LABELS[pendingReplacement.next.role]}替换
            {pendingReplacement.replaced
              .map((mark) => SENTENCE_COMPONENT_LABELS[mark.role])
              .join("、")}
            。
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                const result = addComponentMark(
                  session.sentence.textQuote,
                  session.marks,
                  pendingReplacement.next,
                );
                onMarksChange(result.marks);
                setPendingReplacement(null);
                setMarkDraft(null);
                window.getSelection()?.removeAllRanges();
              }}
            >
              确认替换
            </button>
            <button type="button" onClick={() => setPendingReplacement(null)}>
              保留原标记
            </button>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          className="component-settings-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <section
            className="component-display-settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="component-display-settings-title"
          >
            <header>
              <div>
                <p className="step-label">整句精读</p>
                <h3 id="component-display-settings-title">标记显示设置</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="关闭标记显示设置"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </header>
            <p>每种非空样式只归属一个成分；占用冲突会在确认后替换。</p>
            <div className="component-style-grid">
              {(Object.keys(SENTENCE_COMPONENT_LABELS) as SentenceComponentRole[]).map((role) => (
                <div className="component-style-field" key={role}>
                  <span>{SENTENCE_COMPONENT_LABELS[role]}</span>
                  <Select
                    aria-label={`${SENTENCE_COMPONENT_LABELS[role]}标记样式`}
                    value={session.styles[role]}
                    onChange={(event) =>
                      requestStyleChange(role, event.target.value as ComponentMarkStyle)
                    }
                  >
                    {(Object.keys(COMPONENT_STYLE_LABELS) as ComponentMarkStyle[]).map((style) => (
                      <option key={style} value={style}>
                        {COMPONENT_STYLE_LABELS[style]}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {pendingStyle ? (
        <div className="component-conflict-dialog" role="alertdialog" aria-modal="false">
          <strong>{COMPONENT_STYLE_LABELS[pendingStyle.style]}已被占用</strong>
          <p>
            {COMPONENT_STYLE_LABELS[pendingStyle.style]}当前用于
            {SENTENCE_COMPONENT_LABELS[pendingStyle.owner]}。替换后，
            {SENTENCE_COMPONENT_LABELS[pendingStyle.owner]}将改为“不显示线型”。
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                onStylesChange(
                  applyComponentStyle(session.styles, pendingStyle.role, pendingStyle.style),
                );
                setPendingStyle(null);
              }}
            >
              <Check size={16} /> 确认替换
            </button>
            <button type="button" onClick={() => setPendingStyle(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      {session.marks.length > 0 ? (
        <div className="component-legend" aria-label="我的句子成分标记">
          {session.marks.map((mark) => (
            <span key={mark.id}>
              {SENTENCE_COMPONENT_LABELS[mark.role]} · {mark.textQuote}
            </span>
          ))}
        </div>
      ) : null}

      {session.phase === "review" && session.analysis ? (
        <IntensiveReadingInsights
          session={session}
          followUpTarget={insightFollowUpTarget}
          followUpDraft={insightFollowUpDraft}
          followUpInputRef={insightFollowUpInputRef}
          onOpenFollowUp={openInsightFollowUp}
          onDraftChange={setInsightFollowUpDraft}
          onCloseFollowUp={() => setInsightFollowUpTarget(null)}
          onSubmitFollowUp={() => {
            if (!insightFollowUpTarget || !insightFollowUpDraft.trim()) return;
            onFollowUp(insightFollowUpTarget, insightFollowUpDraft.trim());
            setInsightFollowUpDraft("");
          }}
        />
      ) : null}
    </article>
  );
}

function IntensiveReadingInsights({
  session,
  followUpTarget,
  followUpDraft,
  followUpInputRef,
  onOpenFollowUp,
  onDraftChange,
  onCloseFollowUp,
  onSubmitFollowUp,
}: {
  session: IntensiveReadingSession;
  followUpTarget: IntensiveFollowUpTarget | null;
  followUpDraft: string;
  followUpInputRef: RefObject<HTMLTextAreaElement | null>;
  onOpenFollowUp: (target: IntensiveFollowUpTarget) => void;
  onDraftChange: (value: string) => void;
  onCloseFollowUp: () => void;
  onSubmitFollowUp: () => void;
}) {
  const analysis = session.analysis!;
  const knowledgeCards = analysis.knowledge_cards ?? [];
  const relevantCount =
    analysis.grammar_points.length +
    analysis.collocations.length +
    analysis.familiar_word_senses.length +
    analysis.sentence_components.length +
    knowledgeCards.length;
  const insightThreads = session.followUps.filter(
    (thread) => thread.target.kind !== "translation_issue",
  );
  return (
    <div className="intensive-left-analysis" aria-label="精读 Agent 句子分析">
      <KnowledgeCards cards={knowledgeCards} onFollowUp={onOpenFollowUp} />
      {knowledgeCards.length === 0 ? (
        <>
          <RelevantItems
            title="相关语法"
            items={analysis.grammar_points}
            onFollowUp={onOpenFollowUp}
          />
          <RelevantItems
            title="固定 / 常用搭配"
            items={analysis.collocations}
            onFollowUp={onOpenFollowUp}
          />
          <RelevantItems
            title="熟词生义"
            items={analysis.familiar_word_senses}
            onFollowUp={onOpenFollowUp}
          />
        </>
      ) : null}
      {relevantCount === 0 ? <AnalysisDegradation analysis={analysis} /> : null}
      {followUpTarget ? (
        <FollowUpComposer
          target={followUpTarget}
          draft={followUpDraft}
          inputRef={followUpInputRef}
          onDraftChange={onDraftChange}
          onClose={onCloseFollowUp}
          onSubmit={onSubmitFollowUp}
        />
      ) : null}
      <FollowUpHistory
        threads={insightThreads}
        onContinue={(target, question) => {
          onOpenFollowUp({
            ...target,
            suggestedQuestions: [question, ...target.suggestedQuestions],
          });
          onDraftChange(question);
        }}
      />
    </div>
  );
}

export function IntensiveTemporaryTaskBody({
  session,
  onTranslationChange,
  onAnalyze,
  onFollowUp,
}: {
  session: IntensiveReadingSession;
  onTranslationChange: (value: string) => void;
  onAnalyze: () => void;
  onFollowUp: (target: IntensiveFollowUpTarget, question: string) => void;
}) {
  const analysis = session.analysis;
  const [followUpTarget, setFollowUpTarget] = useState<IntensiveFollowUpTarget | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const followUpInputRef = useRef<HTMLTextAreaElement>(null);
  const openFollowUp = (target: IntensiveFollowUpTarget) => {
    setFollowUpTarget(target);
    setFollowUpDraft(target.suggestedQuestions[0] ?? "");
    window.requestAnimationFrame(() => followUpInputRef.current?.focus());
  };
  return (
    <div className="intensive-task-body">
      <label>
        <span>我的整句翻译</span>
        <textarea
          value={session.translation}
          disabled={session.phase === "analyzing"}
          onChange={(event) => onTranslationChange(event.target.value)}
          placeholder="按自己的理解翻译；可以随时切到左侧标句子成分。"
        />
      </label>
      {session.phase === "attempt" ? (
        <div className="intensive-mark-gate">
          <p>
            翻译{session.translation.trim() ? "已写" : "未写"} · 已标 {session.marks.length} 处
          </p>
          <button
            type="button"
            className="primary-button strong-action"
            disabled={!session.translation.trim() || session.marks.length === 0}
            onClick={onAnalyze}
          >
            查看识别内容
          </button>
        </div>
      ) : null}
      {session.phase === "analyzing" ? (
        <div className="annotation-streaming-placeholder" role="status">
          <span />
          <span />
          <span />
          <small>正在核对你的翻译和标记，只保留与本句相关的内容。</small>
        </div>
      ) : null}
      {session.analysisError ? (
        <div className="annotation-analysis-error" role="alert">
          <p>{session.analysisError} 你的翻译和标记仍保留。</p>
          <button type="button" onClick={onAnalyze}>
            重试识别
          </button>
        </div>
      ) : null}
      {session.phase === "review" && analysis ? (
        <div className="intensive-analysis-review">
          {analysis.source === "local_fallback" ? (
            <div className="intensive-agent-retry" role="status">
              <span>当前展示的是保守结果，原翻译和标记均已保留。</span>
              <button type="button" className="quiet-button" onClick={onAnalyze}>
                重新调用精读 Agent
              </button>
            </div>
          ) : null}
          {analysis.translation || analysis.translation_review ? (
            <TranslationReview analysis={analysis} onFollowUp={openFollowUp} />
          ) : null}
          {followUpTarget ? (
            <FollowUpComposer
              target={followUpTarget}
              draft={followUpDraft}
              inputRef={followUpInputRef}
              onDraftChange={setFollowUpDraft}
              onClose={() => setFollowUpTarget(null)}
              onSubmit={() => {
                if (!followUpDraft.trim()) return;
                onFollowUp(followUpTarget, followUpDraft.trim());
                setFollowUpDraft("");
              }}
            />
          ) : null}
          <FollowUpHistory
            threads={session.followUps.filter(
              (thread) => thread.target.kind === "translation_issue",
            )}
            onContinue={(target, question) => {
              setFollowUpTarget(target);
              setFollowUpDraft(question);
              window.requestAnimationFrame(() => followUpInputRef.current?.focus());
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function TranslationReview({
  analysis,
  onFollowUp,
}: {
  analysis: AnnotationAnalysisView;
  onFollowUp: (target: IntensiveFollowUpTarget) => void;
}) {
  const review = analysis.translation_review;
  return (
    <section className="intensive-translation-review" aria-labelledby="translation-review-title">
      <h4 id="translation-review-title">翻译诊断</h4>
      {analysis.translation ? (
        <div className="intensive-candidate-translation">
          <span>候选译法</span>
          <p>{analysis.translation}</p>
        </div>
      ) : null}
      {review ? (
        <>
          <button
            type="button"
            className="intensive-follow-up-card translation-summary"
            onClick={() =>
              onFollowUp({
                kind: "translation_issue",
                label: "翻译诊断总评",
                content: review.summary,
                suggestedQuestions: ["我的翻译最需要先改哪一处？", "这个判断依据原句哪里？"],
              })
            }
          >
            <strong>总体判断</strong>
            <span>{review.summary}</span>
            <small>点击继续追问</small>
          </button>
          {review.strengths.length > 0 ? (
            <ul className="translation-strengths">
              {review.strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          ) : null}
          <div className="translation-issue-list">
            {review.issues.map((issue, index) => (
              <button
                type="button"
                className="intensive-follow-up-card translation-issue"
                key={`${issue.kind}:${issue.source_quote}:${index}`}
                onClick={() =>
                  onFollowUp({
                    kind: "translation_issue",
                    label: translationIssueLabel(issue.kind),
                    content: `${issue.source_quote}｜${issue.explanation}｜${issue.suggestion}`,
                    suggestedQuestions: [
                      "为什么这里不能按我的方式翻译？",
                      "如何判断这里的范围或逻辑？",
                    ],
                  })
                }
              >
                <span>{translationIssueLabel(issue.kind)}</span>
                <strong>“{issue.source_quote}”</strong>
                {issue.learner_excerpt ? <small>你的表达：{issue.learner_excerpt}</small> : null}
                <p>{issue.explanation}</p>
                <small>建议：{issue.suggestion} · 点击追问</small>
              </button>
            ))}
          </div>
        </>
      ) : analysis.translation ? (
        <button
          type="button"
          className="intensive-follow-up-card translation-summary"
          onClick={() =>
            onFollowUp({
              kind: "translation_issue",
              label: "候选译法",
              content: analysis.translation!,
              suggestedQuestions: ["候选译法和我的翻译差异在哪里？", "这句应先抓哪层结构？"],
            })
          }
        >
          <span>点击候选译法继续追问</span>
        </button>
      ) : null}
    </section>
  );
}

function KnowledgeCards({
  cards,
  onFollowUp,
}: {
  cards: NonNullable<AnnotationAnalysisView["knowledge_cards"]>;
  onFollowUp: (target: IntensiveFollowUpTarget) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <section className="intensive-knowledge-section">
      <h4>知识卡片</h4>
      <div className="intensive-knowledge-grid">
        {cards.map((card, index) => (
          <button
            type="button"
            className="intensive-follow-up-card knowledge-card"
            key={`${card.category}:${card.title}:${index}`}
            onClick={() =>
              onFollowUp({
                kind: "knowledge_card",
                label: card.title,
                content: `${card.source_quote}｜${card.rule}｜${card.explanation}`,
                suggestedQuestions: [
                  card.check_question,
                  "这个知识点在本句是怎样成立的？",
                  "能换一个简单例句说明吗？",
                ],
              })
            }
          >
            <span>{knowledgeCategoryLabel(card.category)}</span>
            <strong>{card.title}</strong>
            <q>{card.source_quote}</q>
            <p>{card.rule}</p>
            <small>{card.explanation} · 点击追问</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function ComponentAnswerSentence({
  sentence,
  candidates,
  styles,
  onFollowUp,
}: {
  sentence: string;
  candidates: AnnotationAnalysisView["sentence_components"];
  styles: ComponentStyleMap;
  onFollowUp: (target: IntensiveFollowUpTarget) => void;
}) {
  const marks = componentAnswerMarks(sentence, candidates);
  if (marks.length === 0) return null;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor) nodes.push(sentence.slice(cursor, mark.start));
    const label = SENTENCE_COMPONENT_LABELS[mark.role];
    nodes.push(
      <button
        type="button"
        className={`component-mark component-answer-mark component-style-${styles[mark.role]}`}
        key={mark.id}
        aria-label={`${label}：${mark.textQuote}，点击追问`}
        onClick={() =>
          onFollowUp({
            kind: "component_comparison",
            label,
            content: `${label}：${mark.textQuote}｜${mark.explanation}`,
            suggestedQuestions: ["这个成分判断依据是什么？", "如何先找谓语再判断其他成分？"],
          })
        }
      >
        <span>{sentence.slice(mark.start, mark.end)}</span>
        <small aria-hidden="true">{label} · 追问</small>
      </button>,
    );
    cursor = mark.end;
  }
  if (cursor < sentence.length) nodes.push(sentence.slice(cursor));

  return (
    <div className="component-answer-section" role="group" aria-label="句子成分参考划分">
      <span className="step-label">参考划分</span>
      <p className="component-answer-sentence" aria-label="Agent 标准句子成分划分">
        {nodes}
      </p>
      <small className="component-answer-hint">悬停或聚焦标注可继续追问</small>
    </div>
  );
}

function componentAnswerMarks(
  sentence: string,
  candidates: AnnotationAnalysisView["sentence_components"],
) {
  const marks = candidates
    .filter(
      (candidate) =>
        candidate.start >= 0 &&
        candidate.end > candidate.start &&
        candidate.end <= sentence.length &&
        sentence.slice(candidate.start, candidate.end) === candidate.text_quote,
    )
    .sort((left, right) => left.start - right.start || right.end - left.end);

  let cursor = 0;
  return marks.flatMap((candidate, index) => {
    if (candidate.start < cursor) return [];
    cursor = candidate.end;
    return [
      {
        id: `answer-${index}-${candidate.role}-${candidate.start}-${candidate.end}`,
        role: candidate.role,
        start: candidate.start,
        end: candidate.end,
        textQuote: candidate.text_quote,
        explanation: candidate.explanation,
      },
    ];
  });
}

function AnalysisDegradation({ analysis }: { analysis: AnnotationAnalysisView }) {
  return (
    <div className="intensive-no-relevant-items">
      <p>本句暂未识别出足够可靠的补充项；你的翻译和标记仍然保留。</p>
      <details className="intensive-degradation-reason">
        <summary>查看降级原因</summary>
        <dl>
          <div>
            <dt>结果来源</dt>
            <dd>{analysisSourceLabel(analysis.source)}</dd>
          </div>
          <div>
            <dt>校验边界</dt>
            <dd>{analysis.boundary_note}</dd>
          </div>
          <div>
            <dt>未展示候选项</dt>
            <dd>没有返回可锚定本句的可靠项目，或候选项未通过原文范围校验。</dd>
          </div>
          <div>
            <dt>原因码</dt>
            <dd>
              <code>{analysis.reason_code}</code>
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );
}

function FollowUpComposer({
  target,
  draft,
  inputRef,
  onDraftChange,
  onClose,
  onSubmit,
}: {
  target: IntensiveFollowUpTarget;
  draft: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="intensive-follow-up-composer" aria-label="继续追问">
      <header>
        <div>
          <span>正在追问</span>
          <strong>{target.label}</strong>
        </div>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </header>
      <div className="intensive-quick-questions">
        {target.suggestedQuestions.slice(0, 3).map((question) => (
          <button type="button" key={question} onClick={() => onDraftChange(question)}>
            {question}
          </button>
        ))}
      </div>
      <label>
        <span>围绕这处继续问</span>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="例如：为什么边界到这里结束？"
        />
      </label>
      <button type="button" className="primary-button" disabled={!draft.trim()} onClick={onSubmit}>
        发送追问
      </button>
    </section>
  );
}

function FollowUpHistory({
  threads,
  onContinue,
}: {
  threads: IntensiveFollowUpThread[];
  onContinue: (target: IntensiveFollowUpTarget, question: string) => void;
}) {
  if (threads.length === 0) return null;
  return (
    <section className="intensive-follow-up-history" aria-label="精读追问记录">
      <h4>继续追问</h4>
      {threads.map((thread) => (
        <article key={thread.id}>
          <span>{thread.target.label}</span>
          <strong>{thread.question}</strong>
          {thread.status === "asking" ? <p role="status">精读 Agent 正在核对原句依据…</p> : null}
          {thread.status === "failed" ? (
            <p role="alert">{thread.error ?? "追问暂时未完成，请稍后重试。"}</p>
          ) : null}
          {thread.status === "answered" ? (
            <div role="status">
              <p>{thread.answer}</p>
              {thread.evidenceQuotes.length > 0 ? (
                <p className="follow-up-evidence">
                  原句依据：{thread.evidenceQuotes.map((quote) => `“${quote}”`).join("、")}
                </p>
              ) : null}
              <div className="intensive-quick-questions">
                {thread.nextQuestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => onContinue(thread.target, question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function translationIssueLabel(
  kind: NonNullable<AnnotationAnalysisView["translation_review"]>["issues"][number]["kind"],
): string {
  return {
    word_meaning: "词义",
    scope: "修饰范围",
    logic: "逻辑关系",
    omission: "信息遗漏",
    tone: "语气",
    structure: "句子结构",
  }[kind];
}

function knowledgeCategoryLabel(
  category: NonNullable<AnnotationAnalysisView["knowledge_cards"]>[number]["category"],
): string {
  return {
    grammar: "语法",
    collocation: "搭配",
    vocabulary: "词义",
    translation: "翻译",
  }[category];
}

function analysisSourceLabel(source: AnnotationAnalysisView["source"]): string {
  if (source === "local_dictionary") return "本地冻结词典";
  if (source === "local_fallback") return "本地保守降级";
  return "模型候选分析";
}

function MarkedSentence({
  sentence,
  marks,
  styles,
}: {
  sentence: string;
  marks: SentenceComponentMark[];
  styles: ComponentStyleMap;
}) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor) nodes.push(sentence.slice(cursor, mark.start));
    nodes.push(
      <span
        key={mark.id}
        className={`component-mark component-style-${styles[mark.role]}`}
        aria-label={`${SENTENCE_COMPONENT_LABELS[mark.role]}：${mark.textQuote}`}
        data-component-role={mark.role}
      >
        {sentence.slice(mark.start, mark.end)}
      </span>,
    );
    cursor = mark.end;
  }
  if (cursor < sentence.length) nodes.push(sentence.slice(cursor));
  return nodes;
}

function RelevantItems({
  title,
  items,
  onFollowUp,
}: {
  title: string;
  items: Array<{ text_quote: string; explanation: string }>;
  onFollowUp: (target: IntensiveFollowUpTarget) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h4>{title}</h4>
      <div className="intensive-compatible-insights">
        {items.map((item) => (
          <button
            type="button"
            className="intensive-follow-up-card"
            key={`${item.text_quote}:${item.explanation}`}
            onClick={() =>
              onFollowUp({
                kind: "explanation",
                label: title,
                content: `${item.text_quote}｜${item.explanation}`,
                suggestedQuestions: ["这条解释在本句怎样成立？", "判断它的原文线索是什么？"],
              })
            }
          >
            <strong>“{item.text_quote}”</strong>
            <p>{item.explanation}</p>
            <small>点击继续追问</small>
          </button>
        ))}
      </div>
    </section>
  );
}
