"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  advanceRun,
  completeRun,
  completeTask,
  getWorkspace,
  LearnerApiError,
  pauseTask,
  recordDifficulty,
  reserveNextTask,
  resumeTask,
  saveAnnotation,
  saveAttempt,
} from "../lib/api";
import type {
  AnnotationKind,
  ExpressionMaterialView,
  LearnerTaskView,
  LearnerWorkspaceView,
  ReadingMaterialView,
  TextSelection,
} from "../lib/contracts";
import { clearDraft, loadDraft, saveDraft } from "../lib/draft-storage";

const ANNOTATION_LABELS: Record<AnnotationKind, string> = {
  claim: "作者观点",
  evidence: "论证证据",
  logic: "逻辑关系",
  uncertain: "我不确定",
  reusable_expression: "可迁移表达",
};

const STAGE_LABELS = {
  calibration_a: "校准 A",
  calibration_b: "校准 B",
  matched_reading: "匹配阅读",
  micro_expression: "微型表达",
  wrap_up: "本次收尾",
  completed: "已完成",
} as const;

const STAGE_ORDER = [
  "calibration_a",
  "calibration_b",
  "matched_reading",
  "micro_expression",
  "wrap_up",
] as const;

interface LearningWorkspaceProps {
  workspace: LearnerWorkspaceView;
  onWorkspaceChange: (workspace: LearnerWorkspaceView) => void;
  onTaskChange: (task: LearnerTaskView) => void;
  onError: (message: string | null) => void;
}

function messageFor(error: unknown): string {
  return error instanceof LearnerApiError
    ? error.message
    : "当前操作没有完成。输入仍保留在本页和本地草稿中。";
}

export function LearningWorkspace(props: LearningWorkspaceProps) {
  const { workspace } = props;
  if (workspace.run.stage === "wrap_up") return <WrapUpWorkspace {...props} />;
  if (!workspace.task || !workspace.material) {
    return (
      <main className="loading-shell" role="alert">
        当前运行缺少可继续的任务，请稍后重新载入。
      </main>
    );
  }
  return (
    <ActiveTaskWorkspace
      {...props}
      workspace={{ ...workspace, task: workspace.task, material: workspace.material }}
    />
  );
}

type ActiveWorkspace = Omit<LearnerWorkspaceView, "task" | "material"> & {
  task: LearnerTaskView;
  material: NonNullable<LearnerWorkspaceView["material"]>;
};

interface ActiveTaskWorkspaceProps extends Omit<LearningWorkspaceProps, "workspace"> {
  workspace: ActiveWorkspace;
}

function ActiveTaskWorkspace({
  workspace,
  onWorkspaceChange,
  onTaskChange,
  onError,
}: ActiveTaskWorkspaceProps) {
  const { material, task } = workspace;
  const [stored] = useState(() => loadDraft(workspace));
  const [choice, setChoice] = useState(stored?.choice ?? "");
  const [text, setText] = useState(stored?.text ?? task.attempts.at(-1)?.text ?? "");
  const [saveState, setSaveState] = useState<"clean" | "pending" | "local" | "memory">(
    stored ? "local" : "clean",
  );
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [annotationKind, setAnnotationKind] = useState<AnnotationKind>("evidence");
  const [annotationExplanation, setAnnotationExplanation] = useState("");
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const materialRef = useRef<HTMLElement>(null);
  const responseRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (saveState !== "pending") return;
    const timer = window.setTimeout(() => {
      const saved = saveDraft({
        schemaVersion: 1,
        taskId: task.task_id,
        contentVersionId: task.current_content_version_id,
        choice,
        text,
        updatedAt: new Date().toISOString(),
      });
      setSaveState(saved ? "local" : "memory");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [choice, saveState, task.current_content_version_id, task.task_id, text]);

  const persistNow = () => {
    const saved = saveDraft({
      schemaVersion: 1,
      taskId: task.task_id,
      contentVersionId: task.current_content_version_id,
      choice,
      text,
      updatedAt: new Date().toISOString(),
    });
    setSaveState(saved ? "local" : "memory");
  };

  const stageIndex = STAGE_ORDER.indexOf(workspace.run.stage as (typeof STAGE_ORDER)[number]);
  const isReading = material.content_type !== "micro_expression";
  const hasAttempt = task.attempts.length > 0;
  const wordCount = text.trim() ? text.trim().split(/\s+/u).length : 0;

  const selectText = () => {
    if (!isReading) return;
    const browserSelection = window.getSelection();
    if (!browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
      return;
    }
    const range = browserSelection.getRangeAt(0);
    const startElement =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement;
    const endElement =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? (range.endContainer as Element)
        : range.endContainer.parentElement;
    const startParagraph = startElement?.closest<HTMLElement>("[data-paragraph-id]");
    const endParagraph = endElement?.closest<HTMLElement>("[data-paragraph-id]");
    if (!startParagraph || startParagraph !== endParagraph) {
      setProgressMessage("首版标记需要限制在同一段落内，请缩小选区。");
      return;
    }
    const textQuote = range.toString();
    if (!textQuote.trim() || textQuote.length > 1000) return;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(startParagraph);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    setSelection({
      paragraphId: startParagraph.dataset.paragraphId ?? "",
      start,
      end: start + textQuote.length,
      textQuote,
    });
    setProgressMessage("已选中文本。请选择它在你思考中的作用，并写下自己的判断。");
  };

  const submitAnnotation = () => {
    if (!selection || !annotationExplanation.trim()) {
      setProgressMessage("先选择原文并写下你的解释，标记才有学习意义。");
      return;
    }
    onError(null);
    startTransition(async () => {
      try {
        const updated = await saveAnnotation(
          task,
          annotationKind,
          selection,
          annotationExplanation,
        );
        onTaskChange(updated);
        setSelection(null);
        setAnnotationExplanation("");
        window.getSelection()?.removeAllRanges();
        setProgressMessage("本次已做到：你把自己的判断绑定到了精确原文，而不是只做高亮。");
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  const submitTask = () => {
    if (!hasAttempt && isReading && (!choice || !text.trim())) {
      setProgressMessage("先选择一个判断，并用自己的话解释原文怎样支持它。");
      responseRef.current?.focus();
      return;
    }
    if (!hasAttempt && !isReading) {
      const requirement =
        material.content_type === "micro_expression" ? material.output_requirement : null;
      if (!requirement || wordCount < requirement.word_min || wordCount > requirement.word_max) {
        setProgressMessage(
          `请先完成 ${requirement?.word_min ?? 35}–${requirement?.word_max ?? 90} 个英文词。当前约 ${wordCount} 词。`,
        );
        responseRef.current?.focus();
        return;
      }
    }
    if (!hasAttempt && task.task_type === "matched_reading" && task.annotation_count === 0) {
      setProgressMessage("匹配阅读至少需要一个带解释的语义标记，再提交完整判断。");
      materialRef.current?.focus();
      return;
    }
    onError(null);
    startTransition(async () => {
      let currentTask = task;
      try {
        if (currentTask.attempts.length === 0) {
          const attemptText = isReading ? `选择 ${choice}。\n${text.trim()}` : text.trim();
          currentTask = await saveAttempt(currentTask, attemptText);
          onTaskChange(currentTask);
          setSaveState("clean");
        }
        if (currentTask.state !== "completed") {
          currentTask = await completeTask(currentTask);
          onTaskChange(currentTask);
        }
        await advanceRun(workspace.run);
        clearDraft(task.task_id);
        onWorkspaceChange(await getWorkspace(workspace.run.workflow_run_id));
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  const togglePause = () => {
    persistNow();
    onError(null);
    startTransition(async () => {
      try {
        onTaskChange(task.state === "paused" ? await resumeTask(task) : await pauseTask(task));
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  const onWorkspaceKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing || isComposing) return;
    const target = event.target;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      persistNow();
      return;
    }
    if (event.altKey && event.key === "1") {
      event.preventDefault();
      materialRef.current?.focus();
    } else if (event.altKey && event.key === "2") {
      event.preventDefault();
      responseRef.current?.focus();
    } else if (event.altKey && event.key.toLowerCase() === "m" && !isTyping) {
      event.preventDefault();
      selectText();
    } else if (event.altKey && event.key.toLowerCase() === "u" && !isTyping) {
      event.preventDefault();
      selectText();
      setAnnotationKind("uncertain");
    } else if (event.key === "?" && !isTyping) {
      setShowShortcuts((current) => !current);
    }
  };

  const saveLabel = {
    clean: hasAttempt ? "已同步到服务端" : "尚未产生本地草稿",
    pending: "正在保存到此电脑…",
    local: "草稿已保存在此电脑",
    memory: "浏览器禁止本地保存，草稿仅保留在当前页面",
  }[saveState];

  return (
    <main className="workspace-shell" onKeyDown={onWorkspaceKeyDown}>
      <header className="workspace-header">
        <div className="stage-heading">
          <p className="eyebrow">{STAGE_LABELS[workspace.run.stage]}</p>
          <h1>{isReading ? "先留下你的判断，再请求帮助" : "把读到的思路变成自己的表达"}</h1>
        </div>
        <div className="workspace-status" aria-live="polite">
          <span>{saveLabel}</span>
          <span>
            第 {Math.max(stageIndex + 1, 1)} / {STAGE_ORDER.length} 步
          </span>
          <button type="button" className="quiet-button" onClick={togglePause} disabled={isPending}>
            {task.state === "paused" ? "继续训练" : "暂停并保存"}
          </button>
        </div>
      </header>

      <div className="stage-progress" aria-label="训练阶段进度">
        {STAGE_ORDER.map((stage, index) => (
          <span
            key={stage}
            className={index < stageIndex ? "done" : index === stageIndex ? "current" : ""}
          >
            {STAGE_LABELS[stage]}
          </span>
        ))}
      </div>

      {task.state === "paused" ? (
        <section className="paused-panel" aria-labelledby="paused-title">
          <p className="step-label">已暂停</p>
          <h2 id="paused-title">服务端状态已经确认，未提交文字仍留在此电脑</h2>
          <button
            className="primary-button"
            type="button"
            onClick={togglePause}
            disabled={isPending}
          >
            {isPending ? "正在恢复…" : "从这里继续"}
          </button>
        </section>
      ) : (
        <div className={`task-grid ${isReading ? "reading-grid" : "expression-grid"}`}>
          {material.content_type === "micro_expression" ? (
            <ExpressionBrief material={material} materialRef={materialRef} />
          ) : (
            <ReadingPane material={material} materialRef={materialRef} onSelectText={selectText} />
          )}

          <section className="response-pane" aria-labelledby="response-title">
            {material.content_type === "micro_expression" ? (
              <ExpressionResponseHeader material={material} wordCount={wordCount} />
            ) : (
              <>
                <p className="step-label">本步任务</p>
                <h2 id="response-title">{material.question.prompt}</h2>
                <fieldset className="option-list" disabled={hasAttempt || isPending}>
                  <legend className="sr-only">选择一个答案</legend>
                  {material.question.options.map((option) => (
                    <label key={option.option_id}>
                      <input
                        type="radio"
                        name="reading-answer"
                        checked={choice === option.option_id}
                        onChange={() => {
                          setChoice(option.option_id);
                          setSaveState("pending");
                        }}
                      />
                      <strong>{option.option_id}</strong>
                      <span>{option.text}</span>
                    </label>
                  ))}
                </fieldset>
              </>
            )}

            <label className="response-editor">
              <span>
                {isReading ? "我的解释" : "我的作品"}
                <small>
                  {isReading ? "先说清判断与证据的关系" : `当前约 ${wordCount} 个英文词`}
                </small>
              </span>
              <textarea
                ref={responseRef}
                value={text}
                readOnly={hasAttempt}
                disabled={isPending}
                placeholder={
                  isReading
                    ? "不要抄整句。用自己的话说明：这段原文为什么支持你的选择？"
                    : "可以从关键词或不完整句开始，但最终请亲自组织成 2–4 句英文。"
                }
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onChange={(event) => {
                  setText(event.target.value);
                  setSaveState("pending");
                }}
              />
            </label>

            {selection && isReading ? (
              <section className="annotation-composer" aria-labelledby="annotation-title">
                <p className="step-label">精确语义标记</p>
                <h3 id="annotation-title">“{selection.textQuote}”</h3>
                <div className="annotation-types" role="group" aria-label="标记类型">
                  {(material as ReadingMaterialView).allowed_annotations.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className={annotationKind === kind ? "selected" : ""}
                      onClick={() => setAnnotationKind(kind)}
                    >
                      {ANNOTATION_LABELS[kind]}
                    </button>
                  ))}
                </div>
                <label>
                  <span>为什么这样标？</span>
                  <textarea
                    value={annotationExplanation}
                    onChange={(event) => setAnnotationExplanation(event.target.value)}
                    placeholder="写下你的判断。标记数量不算进步，解释才让思考可见。"
                  />
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={submitAnnotation}
                  disabled={isPending}
                >
                  保存这条判断
                </button>
              </section>
            ) : null}

            <div className="action-footer">
              <p className="progress-message" aria-live="polite">
                {progressMessage ??
                  (isReading
                    ? "提示不会预先展示。先选择、标记并解释你认为关键的原文。"
                    : "系统不会生成成品段落；这一步保留你的措辞和组织责任。")}
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={submitTask}
                disabled={isPending}
              >
                {isPending ? "正在确认保存…" : "提交本步并继续"}
              </button>
            </div>
          </section>
        </div>
      )}

      <footer className="workspace-footer">
        <span>当前标记：{task.annotation_count} 条</span>
        <span>最高帮助：H{task.highest_hint_level}</span>
        <button type="button" onClick={() => setShowShortcuts((current) => !current)}>
          快捷键帮助
        </button>
        <span className="sr-only" aria-live="polite">
          {progressMessage}
        </span>
      </footer>

      {showShortcuts ? (
        <aside className="shortcut-panel" aria-label="快捷键帮助">
          <strong>快捷键</strong>
          <span>Ctrl/Cmd + S：保存本地草稿</span>
          <span>Alt/Option + 1：聚焦材料</span>
          <span>Alt/Option + 2：聚焦输出</span>
          <span>Alt/Option + M：标记当前选区</span>
          <span>Alt/Option + U：标记为不确定</span>
          <span>?：关闭帮助</span>
        </aside>
      ) : null}
    </main>
  );
}

interface ReadingPaneProps {
  material: ReadingMaterialView;
  materialRef: React.RefObject<HTMLElement | null>;
  onSelectText: () => void;
}

function ReadingPane({ material, materialRef, onSelectText }: ReadingPaneProps) {
  return (
    <article
      className="material-pane"
      ref={materialRef}
      tabIndex={-1}
      aria-labelledby="material-title"
      onMouseUp={onSelectText}
      onKeyUp={onSelectText}
    >
      <div className="material-heading">
        <p className="step-label">项目自写开发材料 · 难度待校准</p>
        <h2 id="material-title">{material.title}</h2>
        <p>鼠标选择一段原文后，右侧会出现语义标记入口。</p>
      </div>
      <div className="reading-copy">
        {material.paragraphs.map((paragraph) => (
          <p key={paragraph.paragraph_id} data-paragraph-id={paragraph.paragraph_id}>
            {paragraph.text}
          </p>
        ))}
      </div>
    </article>
  );
}

interface ExpressionBriefProps {
  material: ExpressionMaterialView;
  materialRef: React.RefObject<HTMLElement | null>;
}

function ExpressionBrief({ material, materialRef }: ExpressionBriefProps) {
  return (
    <article className="expression-brief" ref={materialRef} tabIndex={-1}>
      <p className="step-label">表达实验室 · 2–4 句</p>
      <h2>{material.title}</h2>
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
    </article>
  );
}

interface ExpressionResponseHeaderProps {
  material: ExpressionMaterialView;
  wordCount: number;
}

function ExpressionResponseHeader({ material, wordCount }: ExpressionResponseHeaderProps) {
  const withinRange =
    wordCount >= material.output_requirement.word_min &&
    wordCount <= material.output_requirement.word_max;
  return (
    <>
      <p className="step-label">我的作品 · V1</p>
      <h2 id="response-title">先把立场、条件和建议写出来</h2>
      <ul className="minimum-list">
        {material.v1_minimum.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className={withinRange ? "word-count valid" : "word-count"}>
        要求 {material.output_requirement.word_min}–{material.output_requirement.word_max} 词 ·
        当前约 {wordCount} 词
      </p>
    </>
  );
}

function WrapUpWorkspace({ workspace, onWorkspaceChange, onError }: LearningWorkspaceProps) {
  const [rating, setRating] = useState<"too_easy" | "matched" | "too_hard">("matched");
  const [isPending, startTransition] = useTransition();

  const finish = (skip: boolean) => {
    onError(null);
    startTransition(async () => {
      let run = workspace.run;
      try {
        if (run.difficulty_feedback_status === "pending") {
          run = await recordDifficulty(run, skip ? null : rating);
        }
        if (!run.next_task_placeholder_id) run = await reserveNextTask(run);
        if (run.lifecycle !== "completed") run = await completeRun(run);
        onWorkspaceChange(await getWorkspace(run.workflow_run_id));
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  return (
    <main className="wrapup-shell">
      <header>
        <p className="eyebrow">本次收尾</p>
        <h1>刚才的匹配阅读，对你来说有多难？</h1>
        <p>这是你对材料负荷的反馈，不是能力分数。系统会把它作为下一次匹配的一条证据。</p>
      </header>
      <fieldset className="difficulty-options" disabled={isPending}>
        <legend className="sr-only">选择材料难度</legend>
        {(
          [
            ["too_easy", "偏简单", "几乎不需要停下来判断"],
            ["matched", "刚刚好", "需要思考，但能形成自己的判断"],
            ["too_hard", "偏困难", "大量信息阻断了主要任务"],
          ] as const
        ).map(([value, label, description]) => (
          <label key={value}>
            <input
              type="radio"
              name="difficulty"
              checked={rating === value}
              onChange={() => setRating(value)}
            />
            <strong>{label}</strong>
            <span>{description}</span>
          </label>
        ))}
      </fieldset>
      <section className="instant-evidence" aria-labelledby="instant-evidence-title">
        <p className="step-label">本次已做到</p>
        <h2 id="instant-evidence-title">你完成了独立判断、原文标记和自己的英文表达</h2>
        <p>这是一条即时完成证据。新材料与延迟无提示表现，才会逐步支持更稳定的进步判断。</p>
      </section>
      <div className="wrapup-actions">
        <button
          className="quiet-button"
          type="button"
          onClick={() => finish(true)}
          disabled={isPending}
        >
          暂不评价难度
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => finish(false)}
          disabled={isPending}
        >
          {isPending ? "正在确认本次完成…" : "确认并建立下一任务"}
        </button>
      </div>
    </main>
  );
}
