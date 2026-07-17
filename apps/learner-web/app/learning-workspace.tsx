"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowLineUp,
  BookOpen,
  CheckCircle,
  DotsSixVertical,
  Lock,
  LockOpen,
  PlusSquare,
  Target,
  TextT,
} from "@phosphor-icons/react";

import {
  advanceRun,
  analyzeAnnotation,
  completeRun,
  completeTask,
  endTaskEarly,
  getWorkspace,
  LearnerApiError,
  pauseTask,
  recordDifficulty,
  revealGrammarChallengeHint,
  requestH1Hint,
  requestPriorityFeedback,
  reserveNextTask,
  resumeTask,
  saveAnnotation,
  saveAttempt,
  saveRevision,
  verifyGrammarChallenge,
} from "../lib/api";
import type {
  AnnotationAnalysisView,
  AnnotationKind,
  AnnotationView,
  AttemptView,
  ExpressionMaterialView,
  InterventionView,
  LearnerTaskView,
  LearnerWorkspaceView,
  ReadingMaterialView,
  RevisionView,
  TextSelection,
} from "../lib/contracts";
import {
  clearDraft,
  loadDraft,
  loadWorkspaceNote,
  saveDraft,
  saveWorkspaceNote,
} from "../lib/draft-storage";
import {
  calibrationSummaryDismissed,
  dismissCalibrationSummary,
  type LearnerPreferences,
} from "../lib/experience-storage";
import type { LearningAssetInput, LearningAssetKind } from "../lib/learning-assets-storage";
import {
  classifySelection,
  defaultAnalysisQuestion,
  recommendedAnnotationKind,
  selectionScope,
  type SelectionScale,
} from "../lib/annotation-selection";

const ANNOTATION_LABELS: Record<AnnotationKind, string> = {
  vocabulary: "生词 / 短语",
  grammar: "语法重点",
  claim: "作者观点",
  evidence: "论证证据",
  logic: "逻辑关系",
  uncertain: "看不懂 / 不确定",
  reusable_expression: "可迁移表达",
};

const SELECTION_SCALE_LABELS: Record<SelectionScale, string> = {
  word: "单词",
  phrase: "短语",
  sentence: "句子",
  paragraph: "段落",
};

const ANALYZABLE_ANNOTATION_KINDS = new Set<AnnotationKind>(["vocabulary", "grammar", "uncertain"]);

const UNCERTAINTY_REASONS = [
  ["词义", "我不确定这个词或词组在这里的意思。"],
  ["长句", "我还没理清这个长句的主干和修饰关系。"],
  ["指代", "我不确定代词或指代对象。"],
  ["逻辑", "我不确定前后句是什么逻辑关系。"],
  ["背景", "我缺少理解这句话所需的背景。"],
] as const;

const ANALYSIS_FOCUS_LABELS: Record<AnnotationAnalysisView["focus"], string> = {
  vocabulary: "词义与搭配",
  syntax: "句法结构",
  reference: "指代关系",
  logic: "上下文逻辑",
  context: "语境背景",
  mixed: "综合卡点",
};

interface SelectionAnchor {
  left: number;
  top: number;
}

interface DockPosition {
  left: number;
  top: number;
  width?: number;
}

interface TemporaryTaskItem {
  id: string;
  promptIndex: number;
  answer: string;
  completed: boolean;
}

type WorkspaceTab = "task" | "annotations" | "temporary" | "notes";

const STAGE_LABELS = {
  calibration_a: "校准 A",
  calibration_b: "校准 B",
  matched_reading: "匹配阅读",
  micro_expression: "微型表达",
  wrap_up: "本次收尾",
  completed: "已完成",
} as const;

const FIRST_EXPERIENCE_STAGE_ORDER = [
  "calibration_a",
  "calibration_b",
  "matched_reading",
  "micro_expression",
  "wrap_up",
] as const;

const PRACTICE_STAGE_ORDER = ["matched_reading", "micro_expression", "wrap_up"] as const;

interface LearningWorkspaceProps {
  workspace: LearnerWorkspaceView;
  onWorkspaceChange: (workspace: LearnerWorkspaceView) => void;
  onTaskChange: (task: LearnerTaskView) => void;
  onError: (message: string | null) => void;
  preferences: LearnerPreferences;
  onTemporaryTaskComplete: () => void;
  onLearningAssetCapture: (input: LearningAssetInput) => void;
}

function messageFor(error: unknown): string {
  return error instanceof LearnerApiError
    ? error.message
    : "当前操作没有完成。输入仍保留在本页和本地草稿中。";
}

function attemptDraft(attempt: AttemptView | undefined, isReading: boolean) {
  if (!attempt) return { choice: "", text: "" };
  if (!isReading) return { choice: "", text: attempt.text };
  const match = /^选择 ([A-Z])。\n([\s\S]*)$/u.exec(attempt.text);
  return match
    ? { choice: match[1] ?? "", text: match[2] ?? "" }
    : { choice: "", text: attempt.text };
}

function conciseQuestionPrompt(prompt: string): string {
  const instructionStart = prompt.indexOf("? Choose ");
  return instructionStart >= 0 ? prompt.slice(0, instructionStart + 1) : prompt;
}

function navigateWorkspaceTabs(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    return;
  }
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex < 0 || tabs.length === 0) return;
  event.preventDefault();
  const targetIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;
  tabs[targetIndex]?.click();
  tabs[targetIndex]?.focus();
}

export function LearningWorkspace(props: LearningWorkspaceProps) {
  const { workspace } = props;
  const [summaryAcknowledged, setSummaryAcknowledged] = useState(() =>
    calibrationSummaryDismissed(workspace.run.workflow_run_id),
  );
  if (workspace.run.stage === "wrap_up") return <WrapUpWorkspace {...props} />;
  if (!workspace.task || !workspace.material) {
    return (
      <main className="loading-shell" role="alert">
        当前运行缺少可继续的任务，请稍后重新载入。
      </main>
    );
  }
  if (["completed", "ended_early"].includes(workspace.task.state)) {
    return (
      <CompletedStageRest
        workspace={workspace}
        onWorkspaceChange={props.onWorkspaceChange}
        onError={props.onError}
      />
    );
  }
  if (
    (workspace.run.run_kind ?? "first_experience") === "first_experience" &&
    workspace.run.stage === "matched_reading" &&
    workspace.task.attempts.length === 0 &&
    !summaryAcknowledged
  ) {
    return (
      <CalibrationSummary
        workspace={workspace}
        onStart={() => {
          dismissCalibrationSummary(workspace.run.workflow_run_id);
          setSummaryAcknowledged(true);
        }}
      />
    );
  }
  return (
    <ActiveTaskWorkspace
      {...props}
      workspace={{ ...workspace, task: workspace.task, material: workspace.material }}
    />
  );
}

const STAGE_REST_COPY = {
  calibration_a: {
    title: "第一段已经保存，先把注意力放下来",
    feedback: "你完成了独立判断，系统已经保留这版思路",
    next: "下一步仍是一段短校准，不会突然提高负荷",
    action: "准备好后继续",
  },
  calibration_b: {
    title: "两段校准都完成了，现在不必立刻继续读",
    feedback: "第二段独立判断也已保存，可以先离开题目",
    next: "下一页会先给出起点反馈，再进入匹配阅读",
    action: "查看两段反馈",
  },
  matched_reading: {
    title: "阅读已经交卷，先让眼睛和判断都休息一下",
    feedback: "你的判断、解释和原文痕迹都已经保存",
    next: "下一步只做一段短表达，不会继续堆阅读材料",
    action: "准备好后继续",
  },
  micro_expression: {
    title: "主要任务到这里，先不用马上总结自己",
    feedback: "你的英文表达由自己组织，并已作为独立版本保存",
    next: "下一页只做轻量收尾，不再增加新的学习任务",
    action: "进入本次收尾",
  },
} as const;

function CompletedStageRest({
  workspace,
  onWorkspaceChange,
  onError,
}: Pick<LearningWorkspaceProps, "workspace" | "onWorkspaceChange" | "onError">) {
  const [isPending, startTransition] = useTransition();
  const task = workspace.task;
  const endedEarly = task?.state === "ended_early";
  const copy =
    STAGE_REST_COPY[workspace.run.stage as keyof typeof STAGE_REST_COPY] ??
    STAGE_REST_COPY.matched_reading;
  const continueToNextStage = () => {
    onError(null);
    startTransition(async () => {
      try {
        await advanceRun(workspace.run);
        onWorkspaceChange(await getWorkspace(workspace.run.workflow_run_id));
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  return (
    <main className="stage-rest-shell">
      <section className="stage-rest-card" aria-labelledby="stage-rest-title">
        <p className="eyebrow">
          {endedEarly ? "本步已提前结束 · 记录已保留" : "本步已保存 · 可以休息"}
        </p>
        <h1 id="stage-rest-title">
          {endedEarly ? "这一步先停在这里，不把未完成包装成完成" : copy.title}
        </h1>
        <p className="stage-rest-lead">
          {endedEarly
            ? "现有草稿、标注和思考笔记都还在；本步不会计为完整作答。这里没有倒计时，你可以先离开屏幕。"
            : "这里没有倒计时。你可以停留、离开屏幕，甚至直接关闭页面；回来后仍会从这个位置继续。"}
        </p>
        <div className="stage-rest-feedback" aria-label="本步即时反馈与下一步">
          <article>
            <p className="step-label">刚刚反馈</p>
            <h2>{endedEarly ? "系统记录了主动结束，没有补写缺失证据" : copy.feedback}</h2>
            <p>
              本步留下 {task?.attempts.length ?? 0} 个答案版本、{task?.annotation_count ?? 0}
              条标注，最高 H{task?.highest_hint_level ?? 0}。
              {endedEarly
                ? "这些痕迹可以回看，但不会增加完整训练证据。"
                : "这说明学习动作已经发生，不等于答案一定正确。"}
            </p>
          </article>
          <article>
            <p className="step-label">接下来</p>
            <h2>{copy.next}</h2>
            <p>继续的节奏由你决定；系统不会自动把你推入下一题。</p>
          </article>
        </div>
        <footer className="stage-rest-actions">
          <p>现在停下来也是训练的一部分。</p>
          <button
            className="primary-button strong-action"
            type="button"
            onClick={continueToNextStage}
            disabled={isPending}
          >
            {isPending ? "正在准备下一步…" : copy.action}
          </button>
        </footer>
      </section>
    </main>
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
  preferences,
  onTemporaryTaskComplete,
  onLearningAssetCapture,
}: ActiveTaskWorkspaceProps) {
  const { material, task } = workspace;
  const isReading = material.content_type !== "micro_expression";
  const restoredAttempt = attemptDraft(task.attempts.at(-1), isReading);
  const [stored] = useState(() => loadDraft(workspace));
  const initialLatestAttempt = task.attempts.at(-1);
  const initialLatestIntervention = task.interventions.at(-1);
  const canRestoreLocalDraft =
    !initialLatestAttempt ||
    initialLatestAttempt.attempt_version_id === initialLatestIntervention?.input_attempt_version_id;
  const [choice, setChoice] = useState(
    canRestoreLocalDraft ? (stored?.choice ?? restoredAttempt.choice) : restoredAttempt.choice,
  );
  const [text, setText] = useState(
    canRestoreLocalDraft ? (stored?.text ?? restoredAttempt.text) : restoredAttempt.text,
  );
  const [saveState, setSaveState] = useState<"clean" | "pending" | "local" | "memory">(
    stored ? "local" : "clean",
  );
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionAnchor | null>(null);
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [annotationKind, setAnnotationKind] = useState<AnnotationKind>("vocabulary");
  const [annotationExplanation, setAnnotationExplanation] = useState("");
  const [annotationAnalysis, setAnnotationAnalysis] = useState<AnnotationAnalysisView | null>(null);
  const [annotationAnalysisError, setAnnotationAnalysisError] = useState<string | null>(null);
  const [isAnnotationAnalysisPending, setIsAnnotationAnalysisPending] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("task");
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showThinkingGuide, setShowThinkingGuide] = useState(false);
  const [showSavedAnnotations, setShowSavedAnnotations] = useState(true);
  const [inlineAssistanceFocus, setInlineAssistanceFocus] = useState<
    "meaning" | "structure" | "logic" | "evidence" | null
  >(null);
  const [temporaryTasks, setTemporaryTasks] = useState<TemporaryTaskItem[]>([]);
  const [expandedTemporaryTaskId, setExpandedTemporaryTaskId] = useState<string | null>(null);
  const [storedWorkspaceNote] = useState(() =>
    loadWorkspaceNote(task.task_id, task.current_content_version_id),
  );
  const [workspaceNote, setWorkspaceNote] = useState(storedWorkspaceNote?.text ?? "");
  const [noteSaveState, setNoteSaveState] = useState<"clean" | "pending" | "local" | "memory">(
    storedWorkspaceNote ? "local" : "clean",
  );
  const [noteCaptured, setNoteCaptured] = useState(false);
  const [showEarlyEndConfirm, setShowEarlyEndConfirm] = useState(false);
  const [showRevisionEditor, setShowRevisionEditor] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [grammarCorrection, setGrammarCorrection] = useState("");
  const [grammarFeedback, setGrammarFeedback] = useState<string | null>(null);
  const [isGrammarPending, setIsGrammarPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const materialRef = useRef<HTMLElement>(null);
  const responsePaneRef = useRef<HTMLElement>(null);
  const responseRef = useRef<HTMLTextAreaElement>(null);
  const annotationExplanationRef = useRef<HTMLTextAreaElement>(null);
  const earlyEndTriggerRef = useRef<HTMLButtonElement>(null);
  const earlyEndConfirmRef = useRef<HTMLElement>(null);
  const temporaryTaskCounterRef = useRef(0);

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

  useEffect(() => {
    if (noteSaveState !== "pending") return;
    const timer = window.setTimeout(() => {
      const saved = saveWorkspaceNote({
        schemaVersion: 1,
        taskId: task.task_id,
        contentVersionId: task.current_content_version_id,
        text: workspaceNote,
        updatedAt: new Date().toISOString(),
      });
      setNoteSaveState(saved ? "local" : "memory");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [noteSaveState, task.current_content_version_id, task.task_id, workspaceNote]);

  useEffect(() => {
    if (!showEarlyEndConfirm) return;
    const frame = window.requestAnimationFrame(() => {
      earlyEndConfirmRef.current?.scrollIntoView({
        block: "nearest",
        behavior: preferences.reducedMotion ? "auto" : "smooth",
      });
      earlyEndConfirmRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [preferences.reducedMotion, showEarlyEndConfirm]);

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

  const persistWorkspaceNoteNow = () => {
    if (!workspaceNote.trim()) return;
    const saved = saveWorkspaceNote({
      schemaVersion: 1,
      taskId: task.task_id,
      contentVersionId: task.current_content_version_id,
      text: workspaceNote,
      updatedAt: new Date().toISOString(),
    });
    setNoteSaveState(saved ? "local" : "memory");
  };

  const stageOrder =
    (workspace.run.run_kind ?? "first_experience") === "practice"
      ? PRACTICE_STAGE_ORDER
      : FIRST_EXPERIENCE_STAGE_ORDER;
  const stageIndex = stageOrder.findIndex((stage) => stage === workspace.run.stage);
  const hasAttempt = task.attempts.length > 0;
  const latestAttempt = task.attempts.at(-1);
  const latestIntervention = task.interventions.at(-1);
  const hasUnansweredIntervention = Boolean(
    latestAttempt &&
    latestIntervention &&
    latestAttempt.attempt_version_id === latestIntervention.input_attempt_version_id,
  );
  const linkedRevision = latestIntervention
    ? task.revisions.find(
        (revision) => revision.intervention_id === latestIntervention.intervention_id,
      )
    : undefined;
  const needsRevisionLink = Boolean(
    latestAttempt &&
    latestIntervention &&
    latestAttempt.attempt_version_id !== latestIntervention.input_attempt_version_id &&
    !linkedRevision,
  );
  const wordCount = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const interventionLabel = isReading ? "H1" : "单项反馈";

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
    const selectionRect = range.getBoundingClientRect();
    const scale = classifySelection(textQuote, startParagraph.textContent ?? "");
    const recommendedKind = recommendedAnnotationKind(scale);
    setSelection({
      paragraphId: startParagraph.dataset.paragraphId ?? "",
      start,
      end: start + textQuote.length,
      textQuote,
    });
    setAnnotationAnalysis(null);
    setAnnotationAnalysisError(null);
    if (allowedAnnotations.includes(recommendedKind)) setAnnotationKind(recommendedKind);
    setSelectionAnchor({
      left: Math.min(Math.max(16, selectionRect.left), Math.max(16, window.innerWidth - 520)),
      top: Math.min(Math.max(16, selectionRect.bottom + 10), Math.max(16, window.innerHeight - 72)),
    });
    setShowSelectionToolbar(true);
    setProgressMessage(
      selectionScope(scale) === "word_or_phrase"
        ? "识别为单词或短语：已优先推荐生词解释与语境义。"
        : "识别为句子或段落：已优先推荐整句翻译与语法结构。",
    );
    if (preferences.assistanceMode === "proactive") {
      setInlineAssistanceFocus(
        selectionScope(scale) === "word_or_phrase" ? "meaning" : "structure",
      );
    }
    window.requestAnimationFrame(() => {
      responsePaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const chooseAnnotationKind = (kind: AnnotationKind) => {
    setAnnotationKind(kind);
    setAnnotationAnalysis(null);
    setAnnotationAnalysisError(null);
    setShowSelectionToolbar(false);
    responsePaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => annotationExplanationRef.current?.focus());
  };

  const promptUncertainSelection = () => {
    setAnnotationKind("uncertain");
    setProgressMessage("先在左侧选中看不懂的原文，再点选区旁的“仍没看懂”。");
    materialRef.current?.focus();
  };

  const switchWorkspaceTab = (tab: WorkspaceTab) => {
    setActiveWorkspaceTab(tab);
    window.requestAnimationFrame(() => responsePaneRef.current?.scrollTo({ top: 0 }));
  };

  const addTemporaryTask = () => {
    temporaryTaskCounterRef.current += 1;
    const taskNumber = temporaryTaskCounterRef.current;
    const item: TemporaryTaskItem = {
      id: `${task.task_id}-temporary-${taskNumber}`,
      promptIndex: taskNumber - 1,
      answer: "",
      completed: false,
    };
    setTemporaryTasks((current) => [...current, item]);
    setExpandedTemporaryTaskId(item.id);
    setProgressMessage(`已新增临时任务 ${taskNumber}。主任务与当前草稿不受影响。`);
    switchWorkspaceTab("temporary");
  };

  const updateTemporaryTaskAnswer = (taskId: string, answer: string) => {
    setTemporaryTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, answer } : item)),
    );
  };

  const completeTemporaryTaskItem = (taskId: string) => {
    const item = temporaryTasks.find((candidate) => candidate.id === taskId);
    if (!item?.answer.trim() || item.completed) return;
    setTemporaryTasks((current) =>
      current.map((candidate) =>
        candidate.id === taskId ? { ...candidate, completed: true } : candidate,
      ),
    );
    onTemporaryTaskComplete();
    const taskNumber = temporaryTasks.findIndex((candidate) => candidate.id === taskId) + 1;
    setProgressMessage(
      `临时任务 ${taskNumber} 已记录。它不会改变主训练进度，你可以继续新增或返回本步。`,
    );
  };

  const requestAnnotationAnalysis = async () => {
    if (!selection || !ANALYZABLE_ANNOTATION_KINDS.has(annotationKind)) return;
    const paragraphText = isReading
      ? ((material as ReadingMaterialView).paragraphs.find(
          (paragraph) => paragraph.paragraph_id === selection.paragraphId,
        )?.text ?? "")
      : "";
    const scale = classifySelection(selection.textQuote, paragraphText);
    const learnerQuestion = annotationExplanation.trim() || defaultAnalysisQuestion(scale);
    setAnnotationAnalysisError(null);
    setIsAnnotationAnalysisPending(true);
    try {
      const result = await analyzeAnnotation(task, selection, learnerQuestion);
      setAnnotationAnalysis(result);
      if (!annotationExplanation.trim()) setAnnotationExplanation(learnerQuestion);
      setProgressMessage(
        result.selection_scope === "word_or_phrase"
          ? "已优先整理语境义、词性与搭配。请放回原句验证后再保存。"
          : "已优先整理整句翻译与语法结构。请沿主干和修饰层级核对后再保存。",
      );
    } catch (error) {
      setAnnotationAnalysis(null);
      setAnnotationAnalysisError(messageFor(error));
    } finally {
      setIsAnnotationAnalysisPending(false);
    }
  };

  const submitAnnotation = () => {
    if (!selection || (!annotationExplanation.trim() && !annotationAnalysis)) {
      setProgressMessage("先选择原文并写下你的解释，标记才有学习意义。");
      return;
    }
    const paragraphText = isReading
      ? ((material as ReadingMaterialView).paragraphs.find(
          (paragraph) => paragraph.paragraph_id === selection.paragraphId,
        )?.text ?? "")
      : "";
    const scale = classifySelection(selection.textQuote, paragraphText);
    const explanation = annotationExplanation.trim() || defaultAnalysisQuestion(scale);
    onError(null);
    startTransition(async () => {
      try {
        const updated = await saveAnnotation(task, annotationKind, selection, explanation);
        onTaskChange(updated);
        const assetKind: LearningAssetKind =
          annotationKind === "vocabulary"
            ? "vocabulary"
            : annotationKind === "grammar"
              ? "grammar"
              : annotationKind === "reusable_expression"
                ? "writing_expression"
                : annotationKind === "uncertain"
                  ? /词|词组|搭配/u.test(annotationExplanation)
                    ? "vocabulary"
                    : "grammar"
                  : "reading_skill";
        onLearningAssetCapture({
          kind: assetKind,
          title:
            annotationKind === "uncertain"
              ? `待巩固：${selection.textQuote.slice(0, 42)}`
              : `${ANNOTATION_LABELS[annotationKind]}：${selection.textQuote.slice(0, 42)}`,
          content: selection.textQuote,
          note: annotationAnalysis
            ? [
                explanation,
                annotationAnalysis.vocabulary_note
                  ? `语境义与用法：${annotationAnalysis.vocabulary_note}`
                  : null,
                annotationAnalysis.translation
                  ? `选区翻译：${annotationAnalysis.translation}`
                  : null,
                annotationAnalysis.grammar_structure.length > 0
                  ? `语法结构：${annotationAnalysis.grammar_structure.join("；")}`
                  : null,
                `卡点诊断：${annotationAnalysis.diagnosis}`,
                `拆解：${annotationAnalysis.breakdown.join("；")}`,
                `下一步自查：${annotationAnalysis.next_check}`,
              ]
                .filter((item): item is string => Boolean(item))
                .join("\n")
            : explanation,
          sourceTitle: material.title,
        });
        setShowSavedAnnotations(true);
        switchWorkspaceTab("annotations");
        setSelection(null);
        setSelectionAnchor(null);
        setShowSelectionToolbar(false);
        setAnnotationExplanation("");
        setAnnotationAnalysis(null);
        setAnnotationAnalysisError(null);
        window.getSelection()?.removeAllRanges();
        setProgressMessage("本次已做到：你把自己的判断绑定到了精确原文，而不是只做高亮。");
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  const outputIsValid = () => {
    if (isReading && (material as ReadingMaterialView).grammar_challenge.status !== "resolved") {
      setProgressMessage("先找出文章中的 1 处语法错误并修改正确，再保存本步判断。");
      return false;
    }
    if (isReading && (!choice || !text.trim())) {
      setProgressMessage("先选择一个判断，并用自己的话解释原文怎样支持它。");
      responseRef.current?.focus();
      return false;
    }
    if (!isReading) {
      const requirement =
        material.content_type === "micro_expression" ? material.output_requirement : null;
      if (!requirement || wordCount < requirement.word_min || wordCount > requirement.word_max) {
        setProgressMessage(
          `请先完成 ${requirement?.word_min ?? 35}–${requirement?.word_max ?? 90} 个英文词。当前约 ${wordCount} 词。`,
        );
        responseRef.current?.focus();
        return false;
      }
    }
    if (task.task_type === "matched_reading" && task.annotation_count === 0) {
      setProgressMessage("匹配阅读至少需要一个带解释的语义标记，再提交完整判断。");
      materialRef.current?.focus();
      return false;
    }
    return true;
  };

  const applyGrammarChallengeUpdate = (
    update: Awaited<ReturnType<typeof verifyGrammarChallenge>>,
  ) => {
    const readingMaterial = material as ReadingMaterialView;
    onWorkspaceChange({
      ...workspace,
      material: {
        ...readingMaterial,
        paragraphs: update.paragraphs,
        grammar_challenge: update.grammar_challenge,
      },
    });
  };

  const revealGrammarHint = async () => {
    if (!isReading || isGrammarPending) return;
    onError(null);
    setIsGrammarPending(true);
    try {
      const update = await revealGrammarChallengeHint(task.task_id);
      applyGrammarChallengeUpdate(update);
    } catch (error) {
      onError(messageFor(error));
    } finally {
      setIsGrammarPending(false);
    }
  };

  const submitGrammarCorrection = async () => {
    if (!isReading || !grammarCorrection.trim() || isGrammarPending) {
      if (!grammarCorrection.trim()) setGrammarFeedback("先输入你认为正确的英文写法。");
      return;
    }
    onError(null);
    setGrammarFeedback(null);
    setIsGrammarPending(true);
    try {
      const update = await verifyGrammarChallenge(task.task_id, grammarCorrection.trim());
      applyGrammarChallengeUpdate(update);
      setGrammarFeedback(update.feedback);
      if (update.verification_correct) {
        setGrammarCorrection("");
        setProgressMessage("语法找茬已通过，文章中的错误已改回正确原文。");
      }
    } catch (error) {
      onError(messageFor(error));
    } finally {
      setIsGrammarPending(false);
    }
  };

  const submitTask = () => {
    if (!outputIsValid()) return;
    const attemptText = isReading ? `选择 ${choice}。\n${text.trim()}` : text.trim();
    if (hasUnansweredIntervention && latestAttempt?.text === attemptText) {
      setProgressMessage(`${interventionLabel}已经指出新的检查方向。请亲自修改后，再保存 V2。`);
      responseRef.current?.focus();
      return;
    }
    onError(null);
    startTransition(async () => {
      let currentTask = task;
      try {
        if (currentTask.attempts.length === 0) {
          currentTask = await saveAttempt(currentTask, attemptText);
          onTaskChange(currentTask);
          persistNow();
          setSaveState("clean");
          setProgressMessage(
            isReading
              ? "V1 已保存。你可以保持独立直接完成，也可以领取一次 H1 后亲自写 V2。"
              : "V1 已保存。你可以保持独立直接完成，也可以查看一次单项反馈后亲自写 V2。",
          );
          return;
        }
        if (hasUnansweredIntervention && latestIntervention) {
          currentTask = await saveAttempt(currentTask, attemptText);
          onTaskChange(currentTask);
          const v2 = currentTask.attempts.at(-1);
          if (!v2) throw new Error("V2 save was not confirmed");
          currentTask = await saveRevision(
            currentTask,
            latestIntervention.input_attempt_version_id,
            v2.attempt_version_id,
            latestIntervention.intervention_id,
          );
          onTaskChange(currentTask);
          clearDraft(task.task_id);
          setSaveState("clean");
          setProgressMessage(
            `V2 与${interventionLabel}的引用已保存。请先查看前后版本，再确认完成本步。`,
          );
          return;
        }
        if (needsRevisionLink && latestIntervention && latestAttempt) {
          currentTask = await saveRevision(
            currentTask,
            latestIntervention.input_attempt_version_id,
            latestAttempt.attempt_version_id,
            latestIntervention.intervention_id,
          );
          onTaskChange(currentTask);
          clearDraft(task.task_id);
          setProgressMessage(`V1、${interventionLabel}和 V2 的引用已经补齐，请确认后完成本步。`);
          return;
        }
        currentTask = await completeTask(currentTask);
        onTaskChange(currentTask);
        clearDraft(task.task_id);
        setProgressMessage("本步已经完整保存。先停一下，准备好后再进入下一步。");
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  const requestMinimalHint = () => {
    if (!latestAttempt || latestIntervention) return;
    onError(null);
    startTransition(async () => {
      try {
        const updated = await requestH1Hint(task);
        const v1 = attemptDraft(latestAttempt, isReading);
        setChoice(v1.choice);
        setText(v1.text);
        saveDraft({
          schemaVersion: 1,
          taskId: task.task_id,
          contentVersionId: task.current_content_version_id,
          choice: v1.choice,
          text: v1.text,
          updatedAt: new Date().toISOString(),
        });
        onTaskChange(updated);
        const intervention = updated.interventions.at(-1);
        if (intervention) {
          onLearningAssetCapture({
            kind: "reading_skill",
            title: "本次 H1 纠偏",
            content: intervention.delivered_content,
            note: "回到自己的判断，按这个检查方向形成 V2。",
            sourceTitle: material.title,
          });
        }
        setProgressMessage("H1 只指出一个检查方向。现在请回到自己的判断，亲自形成 V2。");
        window.requestAnimationFrame(() => responseRef.current?.focus());
      } catch (error) {
        onError(messageFor(error));
      }
    });
  };

  const requestExpressionFeedback = () => {
    if (isReading || !latestAttempt || latestIntervention) return;
    onError(null);
    startTransition(async () => {
      try {
        const updated = await requestPriorityFeedback(task);
        setText(latestAttempt.text);
        saveDraft({
          schemaVersion: 1,
          taskId: task.task_id,
          contentVersionId: task.current_content_version_id,
          choice: "",
          text: latestAttempt.text,
          updatedAt: new Date().toISOString(),
        });
        onTaskChange(updated);
        const intervention = updated.interventions.at(-1);
        if (intervention) {
          onLearningAssetCapture({
            kind: "writing_skill",
            title: "本次写作纠偏",
            content: intervention.delivered_content,
            note: "保留自己的立场和措辞，依据反馈形成 V2。",
            sourceTitle: material.title,
          });
        }
        setProgressMessage("单项反馈只指出一个优先检查方向。请保留自己的立场和措辞，亲自形成 V2。");
        window.requestAnimationFrame(() => responseRef.current?.focus());
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

  const confirmEarlyEnd = () => {
    persistNow();
    persistWorkspaceNoteNow();
    onError(null);
    startTransition(async () => {
      try {
        const updated = await endTaskEarly(task);
        onTaskChange(updated);
        setShowEarlyEndConfirm(false);
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
      chooseAnnotationKind("uncertain");
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

  const requiredSteps = isReading
    ? [
        {
          label: "找出并改正文章中的 1 处语法错误",
          complete: (material as ReadingMaterialView).grammar_challenge.status === "resolved",
        },
        { label: "选择一个判断", complete: Boolean(choice) || hasAttempt },
        {
          label: "用自己的话解释证据关系",
          complete: Boolean(text.trim()) || hasAttempt,
        },
        ...(task.task_type === "matched_reading"
          ? [{ label: "保存至少 1 条带解释的原文标记", complete: task.annotation_count > 0 }]
          : []),
        { label: "保存第一次判断 V1", complete: hasAttempt },
        ...(latestIntervention
          ? [
              {
                label: "根据 H1 亲自形成 V2",
                complete: Boolean(
                  latestAttempt &&
                  latestAttempt.attempt_version_id !== latestIntervention.input_attempt_version_id,
                ),
              },
              { label: "保存 V1 → H1 → V2 引用", complete: Boolean(linkedRevision) },
            ]
          : []),
      ]
    : [
        {
          label: `亲自写出 ${material.content_type === "micro_expression" ? `${material.output_requirement.word_min}–${material.output_requirement.word_max}` : "要求范围内的"} 个英文词`,
          complete:
            hasAttempt ||
            (material.content_type === "micro_expression" &&
              wordCount >= material.output_requirement.word_min &&
              wordCount <= material.output_requirement.word_max),
        },
        { label: "保存第一次作品 V1", complete: hasAttempt },
        ...(latestIntervention
          ? [
              {
                label: "根据单项反馈亲自形成 V2",
                complete: Boolean(
                  latestAttempt &&
                  latestAttempt.attempt_version_id !== latestIntervention.input_attempt_version_id,
                ),
              },
              { label: "保存 V1 → 反馈 → V2 引用", complete: Boolean(linkedRevision) },
            ]
          : []),
      ];

  const allowedAnnotations = isReading ? (material as ReadingMaterialView).allowed_annotations : [];
  const selectedParagraphText =
    selection && isReading
      ? ((material as ReadingMaterialView).paragraphs.find(
          (paragraph) => paragraph.paragraph_id === selection.paragraphId,
        )?.text ?? "")
      : "";
  const selectedScale = selection
    ? classifySelection(selection.textQuote, selectedParagraphText)
    : null;
  const selectedScope = selectedScale ? selectionScope(selectedScale) : null;
  const canAnalyzeAnnotation = ANALYZABLE_ANNOTATION_KINDS.has(annotationKind);
  const annotationAnalysisButtonLabel =
    selectedScope === "word_or_phrase" ? "AI 查语境义与搭配" : "整句翻译 + 语法结构";
  const savedAnnotations = task.annotations ?? [];
  const selectedOption = isReading
    ? (material as ReadingMaterialView).question.options.find(
        (option) => option.option_id === choice,
      )
    : undefined;
  const revisionEditorCollapsed = isReading && hasUnansweredIntervention && !showRevisionEditor;
  const showSubmittedAnswer =
    isReading && hasAttempt && (!hasUnansweredIntervention || revisionEditorCollapsed);

  const reviewAnnotation = (annotationId: string) => {
    setShowSavedAnnotations(true);
    switchWorkspaceTab("annotations");
    window.requestAnimationFrame(() => {
      const record = document.getElementById(`saved-annotation-${annotationId}`);
      record?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      record?.focus({ preventScroll: true });
    });
  };

  return (
    <main
      className={`workspace-shell comfort-${preferences.readingComfort}${preferences.reducedMotion ? " reduced-motion" : ""}`}
      onKeyDown={onWorkspaceKeyDown}
    >
      <header className="workspace-header">
        <div className="stage-heading">
          <p className="eyebrow">{STAGE_LABELS[workspace.run.stage]}</p>
          <h1>{isReading ? "先留下你的判断，再请求帮助" : "把读到的思路变成自己的表达"}</h1>
        </div>
        <div className="workspace-status" aria-live="polite">
          <span>{saveLabel}</span>
          <span>
            第 {Math.max(stageIndex + 1, 1)} / {stageOrder.length} 步
          </span>
          {preferences.temporaryTasksEnabled ? (
            <button
              type="button"
              className="quiet-button temporary-task-trigger"
              onClick={addTemporaryTask}
            >
              + 新增临时任务
            </button>
          ) : null}
          <button type="button" className="quiet-button" onClick={togglePause} disabled={isPending}>
            {task.state === "paused" ? "继续训练" : "休息一下"}
          </button>
        </div>
      </header>

      <div className="stage-progress" aria-label="训练阶段进度">
        {stageOrder.map((stage, index) => (
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
          <p className="step-label">安静暂停</p>
          <h2 id="paused-title">先停在这里，不需要把这一段一口气做完</h2>
          <p>
            当前草稿和训练位置都已经保留。离开屏幕、活动一下，准备好后再回来，不会丢失刚才的思路。
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={togglePause}
            disabled={isPending}
          >
            {isPending ? "正在恢复…" : "准备好后继续"}
          </button>
        </section>
      ) : (
        <div className={`task-grid ${isReading ? "reading-grid" : "expression-grid"}`}>
          {material.content_type === "micro_expression" ? (
            <ExpressionBrief material={material} materialRef={materialRef} />
          ) : (
            <ReadingPane
              material={material}
              materialRef={materialRef}
              annotations={savedAnnotations}
              onSelectText={selectText}
              onPromptUncertain={promptUncertainSelection}
              onOpenTemporaryTask={addTemporaryTask}
              onReviewAnnotation={reviewAnnotation}
            />
          )}

          <section className="response-pane" ref={responsePaneRef} aria-label="任务与学习记录">
            <div
              className="workspace-tabs"
              role="tablist"
              aria-label="右侧任务区"
              onKeyDown={navigateWorkspaceTabs}
            >
              <button
                id="workspace-tab-task"
                type="button"
                role="tab"
                aria-selected={activeWorkspaceTab === "task"}
                aria-controls="workspace-panel-task"
                tabIndex={activeWorkspaceTab === "task" ? 0 : -1}
                onClick={() => switchWorkspaceTab("task")}
              >
                本步任务
              </button>
              {isReading ? (
                <button
                  id="workspace-tab-annotations"
                  type="button"
                  role="tab"
                  aria-selected={activeWorkspaceTab === "annotations"}
                  aria-controls="workspace-panel-annotations"
                  tabIndex={activeWorkspaceTab === "annotations" ? 0 : -1}
                  onClick={() => switchWorkspaceTab("annotations")}
                >
                  标注列表
                  <span>{savedAnnotations.length}</span>
                </button>
              ) : null}
              {preferences.temporaryTasksEnabled ? (
                <button
                  id="workspace-tab-temporary"
                  type="button"
                  role="tab"
                  aria-selected={activeWorkspaceTab === "temporary"}
                  aria-controls="workspace-panel-temporary"
                  tabIndex={activeWorkspaceTab === "temporary" ? 0 : -1}
                  onClick={() => switchWorkspaceTab("temporary")}
                >
                  临时任务
                  <span
                    aria-label={`已完成 ${temporaryTasks.filter((item) => item.completed).length} 个，共 ${temporaryTasks.length} 个`}
                  >
                    {temporaryTasks.filter((item) => item.completed).length}/{temporaryTasks.length}
                  </span>
                </button>
              ) : null}
              <button
                id="workspace-tab-notes"
                type="button"
                role="tab"
                aria-selected={activeWorkspaceTab === "notes"}
                aria-controls="workspace-panel-notes"
                tabIndex={activeWorkspaceTab === "notes" ? 0 : -1}
                onClick={() => switchWorkspaceTab("notes")}
              >
                随时记
                {workspaceNote.trim() ? <span aria-label="已有笔记">•</span> : null}
              </button>
            </div>

            {activeWorkspaceTab === "task" ? (
              <div
                id="workspace-panel-task"
                className="workspace-tab-panel task-tab-panel"
                role="tabpanel"
                aria-labelledby="workspace-tab-task"
              >
                {selection && isReading ? (
                  <section className="annotation-composer" aria-labelledby="annotation-title">
                    <div className="annotation-composer-heading">
                      <div>
                        <p className="step-label">正在标记选中的原文</p>
                        <h3 id="annotation-title">“{selection.textQuote}”</h3>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="取消本次标记"
                        onClick={() => {
                          setSelection(null);
                          setSelectionAnchor(null);
                          setShowSelectionToolbar(false);
                          setAnnotationAnalysis(null);
                          setAnnotationAnalysisError(null);
                          window.getSelection()?.removeAllRanges();
                        }}
                      >
                        ×
                      </button>
                    </div>
                    {selectedScale && selectedScope ? (
                      <div className={`selection-recommendation selection-scope-${selectedScope}`}>
                        <span>{SELECTION_SCALE_LABELS[selectedScale]}</span>
                        <p>
                          {selectedScope === "word_or_phrase"
                            ? "优先查生词：看当前语境义、词性和搭配。"
                            : "优先拆长句：先看完整译文，再看主干、从句和修饰层级。"}
                        </p>
                      </div>
                    ) : null}
                    <div className="annotation-color-legend" aria-label="高亮颜色语义">
                      <span className="annotation-kind-vocabulary">暖黄 · 生词</span>
                      <span className="annotation-kind-reusable_expression">雾蓝 · 好表达</span>
                      <span className="annotation-kind-grammar">珊瑚 · 语法重点</span>
                    </div>
                    <div className="annotation-types" role="group" aria-label="标记类型">
                      {allowedAnnotations.map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          className={`annotation-kind-${kind}${annotationKind === kind ? " selected" : ""}`}
                          onClick={() => chooseAnnotationKind(kind)}
                        >
                          {ANNOTATION_LABELS[kind]}
                        </button>
                      ))}
                    </div>
                    {preferences.assistanceMode !== "quiet" ? (
                      <InlineAssistancePanel
                        selection={selection}
                        material={material as ReadingMaterialView}
                        focus={inlineAssistanceFocus}
                        onFocus={setInlineAssistanceFocus}
                      />
                    ) : null}
                    {annotationKind === "uncertain" ? (
                      <div className="uncertainty-reasons" role="group" aria-label="看不懂的原因">
                        <span>卡在哪里？</span>
                        {UNCERTAINTY_REASONS.map(([label, explanation]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              if (!annotationExplanation.trim()) {
                                setAnnotationExplanation(explanation);
                                setAnnotationAnalysis(null);
                                setAnnotationAnalysisError(null);
                              }
                              window.requestAnimationFrame(() =>
                                annotationExplanationRef.current?.focus(),
                              );
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <label>
                      <span>{canAnalyzeAnnotation ? "你想重点解决什么？" : "为什么这样标？"}</span>
                      <textarea
                        ref={annotationExplanationRef}
                        value={annotationExplanation}
                        onChange={(event) => {
                          setAnnotationExplanation(event.target.value);
                          setAnnotationAnalysis(null);
                          setAnnotationAnalysisError(null);
                        }}
                        placeholder={
                          annotationKind === "vocabulary"
                            ? "可选：写下你猜的语境义，或直接点击下方查词。"
                            : annotationKind === "grammar"
                              ? "可选：写下没理清的主干、从句或修饰关系。"
                              : annotationKind === "uncertain"
                                ? "选一个卡点作为开头，再补充具体词、结构或关系。"
                                : "写下你的判断。标记数量不算进步，解释才让思考可见。"
                        }
                      />
                    </label>
                    {canAnalyzeAnnotation ? (
                      <div className="annotation-analysis-flow">
                        <div className="annotation-analysis-action">
                          <button
                            className="analysis-button"
                            type="button"
                            onClick={requestAnnotationAnalysis}
                            disabled={isAnnotationAnalysisPending || isPending}
                          >
                            {isAnnotationAnalysisPending
                              ? "正在分析当前选区…"
                              : annotationAnalysisButtonLabel}
                          </button>
                          <small>
                            {selectedScope === "word_or_phrase"
                              ? "默认优先语境义，不把短语误当整句"
                              : "只翻译当前选区，不回答题目、不代读全文"}
                          </small>
                        </div>
                        {annotationAnalysisError ? (
                          <p className="annotation-analysis-error" role="alert">
                            {annotationAnalysisError} 你的文字仍保留，可稍后重试。
                          </p>
                        ) : null}
                        {annotationAnalysis ? (
                          <article className="annotation-analysis-result" aria-live="polite">
                            <header>
                              <span>{ANALYSIS_FOCUS_LABELS[annotationAnalysis.focus]}</span>
                              <small>
                                {annotationAnalysis.source === "model"
                                  ? "AI 模型分析"
                                  : "本地保守分析 · 模型暂不可用"}
                              </small>
                            </header>
                            {annotationAnalysis.vocabulary_note ? (
                              <div className="annotation-primary-help vocabulary-help">
                                <strong>语境义、词性与搭配</strong>
                                <p>{annotationAnalysis.vocabulary_note}</p>
                              </div>
                            ) : null}
                            {annotationAnalysis.translation ? (
                              <div className="annotation-primary-help translation-help">
                                <strong>当前选区完整翻译</strong>
                                <p>{annotationAnalysis.translation}</p>
                              </div>
                            ) : annotationAnalysis.selection_scope === "sentence_or_paragraph" ? (
                              <div className="annotation-primary-help translation-unavailable">
                                <strong>完整翻译暂不可用</strong>
                                <p>当前为本地保守分析；启用受约束模型后才会生成选区译文。</p>
                              </div>
                            ) : null}
                            {annotationAnalysis.grammar_structure.length > 0 ? (
                              <div className="annotation-grammar-structure">
                                <strong>语法结构</strong>
                                <ol>
                                  {annotationAnalysis.grammar_structure.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ol>
                              </div>
                            ) : null}
                            <p>{annotationAnalysis.diagnosis}</p>
                            <ol>
                              {annotationAnalysis.breakdown.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                            <div className="annotation-next-check">
                              <strong>下一步自查</strong>
                              <p>{annotationAnalysis.next_check}</p>
                            </div>
                            <small className="annotation-analysis-boundary">
                              {annotationAnalysis.boundary_note}
                            </small>
                          </article>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="annotation-save-row">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={submitAnnotation}
                        disabled={isPending || isAnnotationAnalysisPending}
                      >
                        {annotationAnalysis ? "保存标注与分析" : "保存这条判断"}
                      </button>
                    </div>
                  </section>
                ) : null}

                {isReading ? (
                  <section
                    className={
                      "grammar-challenge-card grammar-challenge-" +
                      (material as ReadingMaterialView).grammar_challenge.status
                    }
                    aria-labelledby="grammar-challenge-title"
                  >
                    <div className="grammar-challenge-heading">
                      <div>
                        <p className="step-label">语法找茬 · 随机 1 处</p>
                        <h2 id="grammar-challenge-title">
                          {(material as ReadingMaterialView).grammar_challenge.status === "resolved"
                            ? "已找出并改正，原文已恢复"
                            : "文章中藏着 1 处语法错误"}
                        </h2>
                      </div>
                      {(material as ReadingMaterialView).grammar_challenge.status === "resolved" ? (
                        <CheckCircle size={24} weight="fill" aria-hidden="true" />
                      ) : (
                        <span className="grammar-challenge-count" aria-label="一处错误">
                          1
                        </span>
                      )}
                    </div>
                    {(material as ReadingMaterialView).grammar_challenge.status === "resolved" ? (
                      <p className="grammar-challenge-success" role="status">
                        验证通过后，文章中的错误片段已经替换为正确写法；刷新页面也会保留正确原文。
                      </p>
                    ) : (
                      <>
                        <p>
                          通读左侧文章，找出错误后，只输入需要替换的正确英文片段。系统不会提前标出位置。
                        </p>
                        <form
                          className="grammar-correction-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void submitGrammarCorrection();
                          }}
                        >
                          <label>
                            <span>正确写法</span>
                            <input
                              type="text"
                              value={grammarCorrection}
                              onChange={(event) => {
                                setGrammarCorrection(event.target.value);
                                setGrammarFeedback(null);
                              }}
                              placeholder="例如：may show"
                              autoComplete="off"
                              spellCheck={false}
                              disabled={isGrammarPending}
                            />
                          </label>
                          <button
                            type="submit"
                            className="secondary-button"
                            disabled={isGrammarPending || !grammarCorrection.trim()}
                          >
                            {isGrammarPending ? "正在验证…" : "验证修改"}
                          </button>
                        </form>
                        <div className="grammar-hint-row">
                          {(material as ReadingMaterialView).grammar_challenge.hint_revealed ? (
                            <div className="grammar-hint" role="status">
                              <strong>
                                错误类型：
                                {(material as ReadingMaterialView).grammar_challenge.error_type}
                              </strong>
                              <span>
                                {(material as ReadingMaterialView).grammar_challenge.hint}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="quiet-button"
                              onClick={() => void revealGrammarHint()}
                              disabled={isGrammarPending}
                            >
                              查看提示（错误类型）
                            </button>
                          )}
                          {(material as ReadingMaterialView).grammar_challenge.attempt_count > 0 ? (
                            <small>
                              已验证{" "}
                              {(material as ReadingMaterialView).grammar_challenge.attempt_count} 次
                            </small>
                          ) : null}
                        </div>
                        {grammarFeedback ? (
                          <p className="grammar-feedback" role="status">
                            {grammarFeedback}
                          </p>
                        ) : null}
                      </>
                    )}
                  </section>
                ) : null}

                <section className="task-checklist" aria-labelledby="task-checklist-title">
                  <div>
                    <p className="step-label">完成本步还需要</p>
                    <h2 id="task-checklist-title">
                      {requiredSteps.filter((step) => !step.complete).length > 0
                        ? `${requiredSteps.filter((step) => !step.complete).length} 项必做动作`
                        : "必做动作已完成"}
                    </h2>
                  </div>
                  <ul>
                    {requiredSteps.map((step) => (
                      <li key={step.label} className={step.complete ? "complete" : "pending"}>
                        <span aria-hidden="true">{step.complete ? "✓" : "○"}</span>
                        {step.label}
                      </li>
                    ))}
                  </ul>
                </section>

                {hasAttempt ? (
                  <ImmediateFeedback
                    task={task}
                    isReading={isReading}
                    linkedRevision={linkedRevision}
                    hasUnansweredIntervention={hasUnansweredIntervention}
                  />
                ) : null}

                {hasAttempt ? (
                  <AttemptTimeline
                    attempts={task.attempts}
                    interventions={task.interventions}
                    revisions={task.revisions}
                    preferences={preferences}
                  />
                ) : null}

                {!hasAttempt ? (
                  <section className="thinking-scaffold" aria-labelledby="thinking-scaffold-title">
                    <button
                      type="button"
                      className="thinking-toggle"
                      aria-expanded={showThinkingGuide}
                      aria-controls="thinking-guide"
                      onClick={() => setShowThinkingGuide((current) => !current)}
                    >
                      <span aria-hidden="true">↗</span>
                      <span>
                        <strong id="thinking-scaffold-title">不知道怎么想？打开思考起点</strong>
                        <small>只给起步动作，不给当前题答案</small>
                      </span>
                      <span aria-hidden="true">{showThinkingGuide ? "收起" : "展开"}</span>
                    </button>
                    {showThinkingGuide ? <ThinkingGuide isReading={isReading} /> : null}
                  </section>
                ) : null}

                {material.content_type === "micro_expression" ? (
                  <ExpressionResponseHeader
                    material={material}
                    wordCount={wordCount}
                    isRevision={hasUnansweredIntervention || task.attempts.length > 1}
                  />
                ) : (
                  <>
                    <p className="step-label">本步任务</p>
                    <h2 id="response-title" className="question-prompt">
                      {conciseQuestionPrompt(material.question.prompt)}
                    </h2>
                    {showSubmittedAnswer && selectedOption ? (
                      <section className="submitted-answer" aria-label="已保存的当前答案">
                        <CheckCircle size={19} weight="fill" aria-hidden="true" />
                        <strong>{selectedOption.option_id}</strong>
                        <p>{selectedOption.text}</p>
                        <button
                          type="button"
                          onClick={() =>
                            latestIntervention ? setShowRevisionEditor(true) : requestMinimalHint()
                          }
                          disabled={isPending}
                        >
                          {latestIntervention ? "开始修改" : "领取反馈后修改"}
                        </button>
                      </section>
                    ) : (
                      <fieldset className="option-list" disabled={isPending}>
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
                    )}
                  </>
                )}

                <label
                  className={`response-editor${hasAttempt && (!hasUnansweredIntervention || revisionEditorCollapsed) ? " saved-response" : ""}`}
                >
                  <span>
                    {isReading
                      ? hasUnansweredIntervention || task.attempts.length > 1
                        ? "我的解释 · V2"
                        : "我的解释 · V1"
                      : hasUnansweredIntervention || task.attempts.length > 1
                        ? "我的作品 · V2"
                        : "我的作品 · V1"}
                    <small>
                      {isReading ? "先说清判断与证据的关系" : `当前约 ${wordCount} 个英文词`}
                    </small>
                  </span>
                  <textarea
                    ref={responseRef}
                    value={text}
                    readOnly={hasAttempt && !hasUnansweredIntervention}
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

                {isReading && hasAttempt && !latestIntervention ? (
                  <section className="intervention-offer" aria-labelledby="h1-offer-title">
                    <div>
                      <p className="step-label">反馈与纠偏 · 可选最小帮助</p>
                      <h3 id="h1-offer-title">基于 V1 只指出一个偏差方向，然后由你写 V2</h3>
                      <p>H1 不标答案句、不提供翻译，也不会替你改写。使用后本步必须再次输出。</p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={requestMinimalHint}
                      disabled={isPending}
                    >
                      领取 H1
                    </button>
                  </section>
                ) : null}

                {!isReading && hasAttempt && !latestIntervention ? (
                  <section
                    className="intervention-offer expression-feedback-offer"
                    aria-labelledby="expression-feedback-title"
                  >
                    <div>
                      <p className="step-label">反馈与纠偏 · 模型单项检查</p>
                      <h3 id="expression-feedback-title">引用 V1，只指出一项最值得先改的问题</h3>
                      <p>
                        这是版本化规则检查，不是作文评分，也不会生成替代句。使用后必须由你亲自写
                        V2。
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={requestExpressionFeedback}
                      disabled={isPending}
                    >
                      查看单项反馈
                    </button>
                  </section>
                ) : null}

                {revisionEditorCollapsed ? null : (
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
                      {isPending
                        ? "正在确认保存…"
                        : !hasAttempt
                          ? "保存 V1（不结束本步）"
                          : hasUnansweredIntervention
                            ? "保存 V2 并建立引用"
                            : needsRevisionLink
                              ? "补齐 V2 引用"
                              : latestIntervention
                                ? "确认 V1 / V2 后完成"
                                : "不看提示，直接完成本步"}
                    </button>
                  </div>
                )}

                <div className="early-end-row">
                  <button
                    ref={earlyEndTriggerRef}
                    className="early-end-trigger"
                    type="button"
                    onClick={() => setShowEarlyEndConfirm(true)}
                    disabled={isPending || showEarlyEndConfirm}
                  >
                    提前结束本步
                  </button>
                </div>

                {showEarlyEndConfirm ? (
                  <section
                    ref={earlyEndConfirmRef}
                    className="early-end-confirmation"
                    role="alertdialog"
                    tabIndex={-1}
                    aria-labelledby="early-end-title"
                    aria-describedby="early-end-description"
                  >
                    <p className="step-label">结束前确认</p>
                    <h3 id="early-end-title">确定提前结束这一步吗？</h3>
                    <p id="early-end-description">
                      当前草稿、标注和随手记会保留，但缺少的作答与修订证据不会被补记为完成。之后仍可进入下一步。
                    </p>
                    <div>
                      <button
                        type="button"
                        className="quiet-button"
                        onClick={() => {
                          setShowEarlyEndConfirm(false);
                          window.requestAnimationFrame(() => earlyEndTriggerRef.current?.focus());
                        }}
                        disabled={isPending}
                      >
                        继续本步
                      </button>
                      <button
                        type="button"
                        className="secondary-button early-end-confirm-button"
                        onClick={confirmEarlyEnd}
                        disabled={isPending}
                      >
                        {isPending ? "正在保留记录…" : "确认提前结束"}
                      </button>
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            {isReading && activeWorkspaceTab === "annotations" ? (
              <div
                id="workspace-panel-annotations"
                className="workspace-tab-panel"
                role="tabpanel"
                aria-labelledby="workspace-tab-annotations"
              >
                <div className="workspace-panel-intro">
                  <p className="step-label">原文思考痕迹</p>
                  <h2>标注列表</h2>
                  <p>这里展示本步保存的判断、卡点和可迁移表达；点击原文标记也会回到这里。</p>
                </div>
                <SavedAnnotations
                  annotations={savedAnnotations}
                  expanded={showSavedAnnotations}
                  onToggle={() => setShowSavedAnnotations((current) => !current)}
                />
                <button
                  type="button"
                  className="quiet-button workspace-panel-return"
                  onClick={() => switchWorkspaceTab("task")}
                >
                  返回本步任务
                </button>
              </div>
            ) : null}

            {activeWorkspaceTab === "temporary" && preferences.temporaryTasksEnabled ? (
              <div
                id="workspace-panel-temporary"
                className="workspace-tab-panel"
                role="tabpanel"
                aria-labelledby="workspace-tab-temporary"
              >
                <TemporaryTaskList
                  isReading={isReading}
                  material={material}
                  tasks={temporaryTasks}
                  expandedTaskId={expandedTemporaryTaskId}
                  onToggle={(taskId) =>
                    setExpandedTemporaryTaskId((current) => (current === taskId ? null : taskId))
                  }
                  onAnswer={updateTemporaryTaskAnswer}
                  onComplete={completeTemporaryTaskItem}
                  onAdd={addTemporaryTask}
                  onClose={() => switchWorkspaceTab("task")}
                />
              </div>
            ) : null}

            {activeWorkspaceTab === "notes" ? (
              <div
                id="workspace-panel-notes"
                className="workspace-tab-panel"
                role="tabpanel"
                aria-labelledby="workspace-tab-notes"
              >
                <section className="anytime-notes" aria-labelledby="anytime-notes-title">
                  <div className="workspace-panel-intro">
                    <p className="step-label">不必完整，也不计入进度</p>
                    <h2 id="anytime-notes-title">随时记一点正在发生的思考</h2>
                    <p>记下一个疑问、一次转折或刚发现的规律。它不会提交为答案，也不会打断本步。</p>
                  </div>
                  <div className="note-starters" aria-label="笔记开头建议">
                    {["我刚发现…", "这里让我疑惑的是…", "下次遇到类似句子，我会…"].map(
                      (starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => {
                            setWorkspaceNote((current) =>
                              current.trim() ? `${current.trimEnd()}\n${starter}` : starter,
                            );
                            setNoteSaveState("pending");
                            setNoteCaptured(false);
                          }}
                        >
                          {starter}
                        </button>
                      ),
                    )}
                  </div>
                  <label>
                    <span>我的思考笔记</span>
                    <textarea
                      value={workspaceNote}
                      onChange={(event) => {
                        setWorkspaceNote(event.target.value);
                        setNoteSaveState("pending");
                        setNoteCaptured(false);
                      }}
                      placeholder="哪怕只记一个词、一条关系或一个没想通的问题，也可以。"
                    />
                  </label>
                  <div className="anytime-note-footer">
                    <span aria-live="polite">
                      {noteSaveState === "pending"
                        ? "正在保留…"
                        : noteSaveState === "local"
                          ? "已保存在此电脑"
                          : noteSaveState === "memory"
                            ? "暂存在当前页面"
                            : "尚未记录"}
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!workspaceNote.trim() || noteCaptured}
                      onClick={() => {
                        onLearningAssetCapture({
                          kind: isReading ? "reading_skill" : "writing_expression",
                          title: `随时记：${material.title}`,
                          content: workspaceNote.trim(),
                          note: "训练中主动记录的思考笔记。",
                          sourceTitle: material.title,
                        });
                        setNoteCaptured(true);
                      }}
                    >
                      {noteCaptured ? "已加入学习资产" : "加入学习资产"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      )}

      {selection && selectionAnchor && showSelectionToolbar && isReading ? (
        <div
          className="selection-toolbar"
          role="toolbar"
          aria-label="选区语义工具"
          style={{ left: selectionAnchor.left, top: selectionAnchor.top }}
        >
          {(
            [
              ["vocabulary", "生词 / 短语"],
              ["grammar", "语法重点"],
              ["reusable_expression", "好表达"],
              ["uncertain", "仍没看懂"],
            ] as const
          ).map(([kind, label]) =>
            allowedAnnotations.includes(kind) ? (
              <button
                key={kind}
                type="button"
                className={`annotation-kind-${kind}${kind === "uncertain" ? " uncertain-action" : ""}`}
                onClick={() => chooseAnnotationKind(kind)}
              >
                {label}
              </button>
            ) : null,
          )}
        </div>
      ) : null}

      <footer className="workspace-footer">
        <span>当前标记：{task.annotation_count} 条</span>
        <span>最高帮助：H{task.highest_hint_level}</span>
        <button
          type="button"
          aria-label="快捷键帮助"
          onClick={() => setShowShortcuts((current) => !current)}
        >
          帮助
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

interface AttemptTimelineProps {
  attempts: AttemptView[];
  interventions: InterventionView[];
  revisions: RevisionView[];
  preferences: LearnerPreferences;
}

function ImmediateFeedback({
  task,
  isReading,
  linkedRevision,
  hasUnansweredIntervention,
}: {
  task: LearnerTaskView;
  isReading: boolean;
  linkedRevision: RevisionView | undefined;
  hasUnansweredIntervention: boolean;
}) {
  const attempts = task.attempts.length;
  const latestIntervention = task.interventions.at(-1);
  let title = "独立版本已保存";
  let detail = isReading
    ? "你已经留下判断，并用自己的话解释了证据关系。系统先确认这次独立输出，不会把它夸大成能力结论。"
    : "你已经亲自组织并保存了第一版英文表达。系统先确认作品属于你，不会用一条分数替代具体反馈。";

  if (linkedRevision) {
    title = "第二版已经接住刚才的反馈";
    detail =
      "V1、最小反馈和 V2 的关系已经保留。你改过哪里现在可回看，但是否真正改善仍需要后续验证。";
  } else if (hasUnansweredIntervention) {
    title = "最小反馈已经送达，只看这一处就够了";
    detail = isReading
      ? "反馈只指出一个检查方向。保留自己的判断，完成这一处检查后再写 V2。"
      : "反馈只指出一个优先问题。保留自己的立场和措辞，只修改这一处后再写 V2。";
  } else if (attempts > 1) {
    title = "第二版已保存，正在确认修改关系";
    detail = "两个版本都没有被覆盖。补齐引用后，你会看到这次修改留下的完整轨迹。";
  }

  return (
    <section className="immediate-feedback" role="status" aria-live="polite">
      <div>
        <p className="step-label">刚刚反馈</p>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      <dl>
        <div>
          <dt>已保存</dt>
          <dd>V{attempts}</dd>
        </div>
        <div>
          <dt>帮助等级</dt>
          <dd>H{latestIntervention?.hint_level ?? 0}</dd>
        </div>
      </dl>
    </section>
  );
}

function AttemptTimeline({
  attempts,
  interventions,
  revisions,
  preferences,
}: AttemptTimelineProps) {
  const latestIntervention = interventions.at(-1);
  const isPriorityFeedback = latestIntervention?.intervention_type === "priority_feedback";
  const linkedRevision = latestIntervention
    ? revisions.find((revision) => revision.intervention_id === latestIntervention.intervention_id)
    : undefined;
  return (
    <section className="attempt-timeline" aria-labelledby="attempt-timeline-title">
      <div className="attempt-timeline-heading">
        <div>
          <p className="step-label">版本与帮助证据</p>
          <h3 id="attempt-timeline-title">
            {attempts.length > 1 ? "V1 与 V2 都已保留" : "V1 已保存，尚未结束本步"}
          </h3>
        </div>
        <span>最高 H{latestIntervention?.hint_level ?? 0}</span>
      </div>
      <div className="attempt-versions">
        {attempts.map((attempt, index) => (
          <article key={attempt.attempt_version_id}>
            <strong>V{index + 1}</strong>
            <span>{attempt.independence === "independent" ? "独立输出" : "提示后输出"}</span>
            <p tabIndex={0} aria-label={`V${index + 1} 作品正文，可滚动查看`}>
              {attempt.text}
            </p>
          </article>
        ))}
      </div>
      {latestIntervention ? (
        <aside
          className="delivered-hint"
          aria-label={
            isPriorityFeedback ? "已收到单项反馈" : `已领取 H${latestIntervention.hint_level}`
          }
        >
          <div>
            <strong>
              {isPriorityFeedback
                ? "单项反馈 · 只改一个优先问题"
                : `H${latestIntervention.hint_level} · 只检查一个方向`}
            </strong>
            <span>
              {isPriorityFeedback ? "已引用 V1，不提供替代段落" : "已引用 V1，不提供当前答案"}
            </span>
          </div>
          <p>{latestIntervention.delivered_content}</p>
        </aside>
      ) : (
        <p className="no-hint-evidence">当前仍是 H0；不领取帮助可以直接完成本步。</p>
      )}
      {latestIntervention && preferences.showDecisionTrace ? (
        <details className="decision-trace" open={preferences.feedbackDetail !== "concise"}>
          <summary>查看这条反馈为什么出现</summary>
          <dl>
            <div>
              <dt>观察输入</dt>
              <dd>仅使用 V1 与当前材料版本，不读取其他账号或站外数据。</dd>
            </div>
            <div>
              <dt>触发依据</dt>
              <dd>{reasonLabel(latestIntervention.reason_code)}</dd>
            </div>
            <div>
              <dt>系统动作</dt>
              <dd>只选择一个优先检查方向，并绑定到 V1；不生成替代答案。</dd>
            </div>
            <div>
              <dt>仍不确定</dt>
              <dd>系统不能仅凭本次修改确认能力提升，需要新材料或延迟任务再次验证。</dd>
            </div>
          </dl>
          <p className="trace-boundary">这是可核对的决策摘要，不展示模型隐藏思维链。</p>
        </details>
      ) : null}
      {linkedRevision ? (
        <p className="revision-link-confirmed">
          V1 → {isPriorityFeedback ? "反馈" : "H1"} → V2 引用已保存；是否改善仍待验证。
        </p>
      ) : latestIntervention && attempts.length > 1 ? (
        <p className="revision-link-pending">V2 已保存，正在等待引用确认。</p>
      ) : null}
    </section>
  );
}

function reasonLabel(reasonCode: string): string {
  if (reasonCode.includes("logic")) return "V1 的逻辑连接是当前最值得先检查的单点。";
  if (reasonCode.includes("claim")) return "V1 的核心主张表达是当前最值得先检查的单点。";
  if (reasonCode.includes("expression")) return "V1 的表达清晰度是当前最值得先检查的单点。";
  if (reasonCode.includes("requested_h1")) return "你在保存独立版本后主动请求了 H1。";
  if (reasonCode.includes("fallback")) return "模型输出未满足约束，系统改用已审核的保底反馈。";
  return `系统按规则 ${reasonCode} 生成了这次最小介入。`;
}

function InlineAssistancePanel({
  selection,
  material,
  focus,
  onFocus,
}: {
  selection: TextSelection;
  material: ReadingMaterialView;
  focus: "meaning" | "structure" | "logic" | "evidence" | null;
  onFocus: (focus: "meaning" | "structure" | "logic" | "evidence" | null) => void;
}) {
  const paragraph = material.paragraphs.find(
    (item) => item.paragraph_id === selection.paragraphId,
  )?.text;
  const scale = classifySelection(selection.textQuote, paragraph ?? "");
  const scope = selectionScope(scale);
  const labels = {
    meaning: scope === "word_or_phrase" ? "查语境义" : "关键词义",
    structure: scope === "word_or_phrase" ? "看词组结构" : "翻译 + 拆结构",
    logic: "看逻辑",
    evidence: "证据作用",
  } as const;
  const result = focus ? inlineAssistanceResult(focus, selection.textQuote, paragraph ?? "") : null;
  return (
    <section className="inline-assistance" aria-labelledby="inline-assistance-title">
      <div className="inline-assistance-heading">
        <div>
          <p className="step-label">Inline Assistance · 绑定当前选区</p>
          <h4 id="inline-assistance-title">
            {scope === "word_or_phrase" ? "先把这个词或短语放回语境" : "先理解整句，再看结构层级"}
          </h4>
        </div>
        {focus ? (
          <button type="button" onClick={() => onFocus(null)}>
            收起
          </button>
        ) : null}
      </div>
      <div className="inline-assistance-actions" role="group" aria-label="行内辅助类型">
        {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
          <button
            key={key}
            type="button"
            className={focus === key ? "selected" : ""}
            onClick={() => onFocus(key)}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      {result ? (
        <div className="inline-assistance-result" role="status">
          <span>即时分析</span>
          <strong>{result.title}</strong>
          <p>{result.explanation}</p>
          <small>依据：当前选区 + 所在段落。这里只拆理解动作，不判断选项对错。</small>
        </div>
      ) : null}
    </section>
  );
}

function inlineAssistanceResult(
  focus: "meaning" | "structure" | "logic" | "evidence",
  quote: string,
  paragraph: string,
) {
  const normalized = quote.trim();
  if (focus === "meaning") {
    return {
      title: "先用上下文限定它在这里的意思",
      explanation: `不要先找孤立中文义。把“${normalized}”替换成一个能同时接住前后句的短语，再检查整段意思是否仍连贯。`,
    };
  }
  if (focus === "structure") {
    const connector = /\b(but|while|although|because|which|that|when|if|yet)\b/iu.exec(
      normalized,
    )?.[0];
    return {
      title: connector ? `先以 ${connector} 为边界拆成两层` : "先找谓语，再把修饰成分暂时括起来",
      explanation: connector
        ? `先读连接词前后的两个动作，再判断后半部分是在转折、补充还是说明原因。暂时不要逐词翻译。`
        : "先圈出谁做了什么，再把介词短语、从句或插入成分放到第二遍处理。",
    };
  }
  if (focus === "logic") {
    const nearby = paragraph.indexOf(normalized);
    return {
      title: "把这句放回段落的变化链",
      explanation:
        nearby >= 0
          ? "检查它是在描述旧问题、引入改变，还是报告改变后的结果。题目通常考的是三者之间的关系，不是单句翻译。"
          : "检查前一句提出了什么，这一句是支持、转折还是结果，再用箭头写成最短关系。",
    };
  }
  return {
    title: "先判断它能证明什么，不能证明什么",
    explanation: `用一句话补全：“这段原文说明了……，因此支持……；但它没有说明……。”这样可以避免把“${normalized}”的范围扩大。`,
  };
}

function temporaryTaskCopy(
  isReading: boolean,
  material: NonNullable<LearnerWorkspaceView["material"]>,
  promptIndex: number,
) {
  const readingPrompts = [
    {
      title: "提炼变化链",
      prompt: "不回看选项，用一句中文写出这篇材料最核心的“变化 → 结果”关系。",
      selfCheck: "你的句子里是否同时出现了“发生了什么变化”和“带来什么结果”？",
    },
    {
      title: "补上成立边界",
      prompt: "从文中找一个容易被忽略的限制条件，用“只有当……才……”重新说明它。",
      selfCheck: "你写的是原文能支持的边界，还是自己补入了材料没有说过的条件？",
    },
    {
      title: "识别可能误读",
      prompt: "写出一种作者可能会反对的误读，再用一句话说明原文实际强调什么。",
      selfCheck: "误读与原意之间是否有清楚、可由原文验证的差别？",
    },
  ];
  const argumentMove = (material as ExpressionMaterialView).target_argument_move;
  const expressionPrompts = [
    {
      title: "更换表达对象",
      prompt: `换一个听众，用一句英文保留“${argumentMove}”这个思路动作。`,
      selfCheck: "你是否更换了措辞，同时保留了原来的论证动作？",
    },
    {
      title: "压缩论证动作",
      prompt: `把“${argumentMove}”压缩为一句英文，并明确写出让步与边界。`,
      selfCheck: "句子是否既承认了另一面，又没有削弱你真正要表达的判断？",
    },
    {
      title: "落到具体行动",
      prompt: `用一句英文把“${argumentMove}”改写成可执行的下一步。`,
      selfCheck: "读者能否从句子里看出谁、在什么条件下、应该做什么？",
    },
  ];
  const prompts = isReading ? readingPrompts : expressionPrompts;
  return prompts[promptIndex % prompts.length] ?? prompts[0]!;
}

function TemporaryTaskList({
  isReading,
  material,
  tasks,
  expandedTaskId,
  onToggle,
  onAnswer,
  onComplete,
  onAdd,
  onClose,
}: {
  isReading: boolean;
  material: NonNullable<LearnerWorkspaceView["material"]>;
  tasks: TemporaryTaskItem[];
  expandedTaskId: string | null;
  onToggle: (taskId: string) => void;
  onAnswer: (taskId: string, value: string) => void;
  onComplete: (taskId: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <section className="temporary-task-panel" aria-labelledby="temporary-task-list-title">
      <header>
        <div>
          <p className="eyebrow">临时任务清单 · 每项约 2 分钟</p>
          <h2 id="temporary-task-list-title">把突然出现的练习先接住</h2>
        </div>
        <button type="button" className="icon-button" aria-label="返回本步任务" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="temporary-task-summary" role="status">
        <strong>
          {completedCount} / {tasks.length}
        </strong>
        <span>已完成</span>
        <p>这些任务独立记录，不结束主任务，也不改变主训练进度。</p>
      </div>
      {tasks.length === 0 ? (
        <div className="temporary-task-empty">
          <strong>清单还是空的</strong>
          <p>遇到值得多练一步的地方，就在这里新建一项；每次新增都会保留为独立任务。</p>
        </div>
      ) : null}
      <ol className="temporary-task-list" aria-label="临时任务列表">
        {tasks.map((task, index) => {
          const copy = temporaryTaskCopy(isReading, material, task.promptIndex);
          const expanded = expandedTaskId === task.id;
          const answerId = `temporary-answer-${task.id}`;
          return (
            <li
              key={task.id}
              className={`temporary-task-item${task.completed ? " completed" : ""}`}
            >
              <button
                type="button"
                className="temporary-task-item-heading"
                aria-expanded={expanded}
                aria-controls={`temporary-task-body-${task.id}`}
                onClick={() => onToggle(task.id)}
              >
                <span className="temporary-task-number">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{copy.title}</strong>
                  <small>
                    {task.completed
                      ? "已完成 · 点击查看"
                      : expanded
                        ? "正在填写"
                        : "待完成 · 点击展开"}
                  </small>
                </span>
                <span className="temporary-task-status" aria-hidden="true">
                  {task.completed ? "✓" : expanded ? "−" : "+"}
                </span>
              </button>
              {expanded ? (
                <div className="temporary-task-item-body" id={`temporary-task-body-${task.id}`}>
                  <div className="temporary-task-prompt">
                    <span>任务</span>
                    <p>{copy.prompt}</p>
                  </div>
                  <label htmlFor={answerId}>
                    <span>临时任务 {index + 1} 的回答</span>
                    <textarea
                      id={answerId}
                      value={task.answer}
                      onChange={(event) => onAnswer(task.id, event.target.value)}
                      disabled={task.completed}
                      placeholder="写一个短答案即可，不追求完整。"
                    />
                  </label>
                  {task.completed ? (
                    <div className="temporary-task-feedback" role="status">
                      <strong>迁移尝试已记录</strong>
                      <p>现在自查：{copy.selfCheck}</p>
                      <small>这是结构自检，不自动判定正误。</small>
                    </div>
                  ) : (
                    <div className="temporary-task-item-actions">
                      <button
                        type="button"
                        className="primary-button strong-action"
                        onClick={() => onComplete(task.id)}
                        disabled={!task.answer.trim()}
                      >
                        完成并查看自检
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <footer>
        <button type="button" className="quiet-button" onClick={onClose}>
          返回主任务
        </button>
        <button type="button" className="primary-button strong-action" onClick={onAdd}>
          + 新增一个临时任务
        </button>
      </footer>
    </section>
  );
}

interface ReadingPaneProps {
  material: ReadingMaterialView;
  materialRef: React.RefObject<HTMLElement | null>;
  annotations: AnnotationView[];
  onSelectText: () => void;
  onPromptUncertain: () => void;
  onOpenTemporaryTask: () => void;
  onReviewAnnotation: (annotationId: string) => void;
}

function ReadingPane({
  material,
  materialRef,
  annotations,
  onSelectText,
  onPromptUncertain,
  onOpenTemporaryTask,
  onReviewAnnotation,
}: ReadingPaneProps) {
  const [readingProgress, setReadingProgress] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [textScale, setTextScale] = useState<"compact" | "default" | "large">("default");
  const [dockLocked, setDockLocked] = useState(true);
  const [dockPosition, setDockPosition] = useState<DockPosition | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const dockDragRef = useRef<
    | (DockPosition & {
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
        pointerId: number;
      })
    | null
  >(null);
  const textScaleLabel = textScale === "compact" ? "较小" : textScale === "large" ? "较大" : "标准";

  useEffect(() => {
    const moveDock = (event: PointerEvent) => {
      const drag = dockDragRef.current;
      const dock = dockRef.current;
      if (!drag || !dock || drag.pointerId !== event.pointerId) return;
      const maxLeft = Math.max(12, window.innerWidth - drag.width - 12);
      const maxTop = Math.max(76, window.innerHeight - drag.height - 42);
      const left = Math.min(Math.max(12, event.clientX - drag.offsetX), maxLeft);
      const top = Math.min(Math.max(76, event.clientY - drag.offsetY), maxTop);
      drag.left = left;
      drag.top = top;
      dock.style.left = `${left}px`;
      dock.style.top = `${top}px`;
    };

    const finishDockDrag = (event: PointerEvent) => {
      const drag = dockDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      setDockPosition({ left: drag.left, top: drag.top, width: drag.width });
      dockDragRef.current = null;
      dockRef.current?.classList.remove("dragging");
    };

    window.addEventListener("pointermove", moveDock);
    window.addEventListener("pointerup", finishDockDrag);
    window.addEventListener("pointercancel", finishDockDrag);
    return () => {
      window.removeEventListener("pointermove", moveDock);
      window.removeEventListener("pointerup", finishDockDrag);
      window.removeEventListener("pointercancel", finishDockDrag);
    };
  }, []);

  const startDockDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dockLocked || !dockRef.current) return;
    event.preventDefault();
    const rect = dockRef.current.getBoundingClientRect();
    dockDragRef.current = {
      left: rect.left,
      top: rect.top,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      pointerId: event.pointerId,
    };
    dockRef.current.classList.add("floating", "dragging");
    dockRef.current.style.left = `${rect.left}px`;
    dockRef.current.style.top = `${rect.top}px`;
    dockRef.current.style.width = `${rect.width}px`;
  };

  return (
    <article
      className={`material-pane${focusMode ? " focus-reading" : ""}`}
      ref={materialRef}
      tabIndex={-1}
      aria-labelledby="material-title"
      onMouseUp={onSelectText}
      onKeyUp={onSelectText}
      onScroll={(event) => {
        const element = event.currentTarget;
        const available = element.scrollHeight - element.clientHeight;
        const rawProgress = available > 0 ? (element.scrollTop / available) * 100 : 100;
        setReadingProgress(Math.round(rawProgress / 5) * 5);
      }}
    >
      <div
        className="reading-position"
        role="progressbar"
        aria-label="当前阅读位置"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readingProgress}
      >
        <span>阅读位置</span>
        <i aria-hidden="true">
          <b style={{ transform: `scaleX(${readingProgress / 100})` }} />
        </i>
        <small>{readingProgress}%</small>
      </div>
      <div className="reading-viewbar" role="toolbar" aria-label="阅读视图设置">
        <button
          type="button"
          aria-label="回到文章开头"
          data-tooltip="回到文章开头"
          onClick={(event) => event.currentTarget.closest("article")?.scrollTo({ top: 0 })}
        >
          <ArrowLineUp size={18} />
        </button>
        <button
          type="button"
          className={focusMode ? "active" : ""}
          aria-label={focusMode ? "退出专注阅读" : "进入专注阅读"}
          data-tooltip={focusMode ? "退出专注阅读" : "进入专注阅读"}
          aria-pressed={focusMode}
          onClick={() => setFocusMode((current) => !current)}
        >
          <Target size={18} />
        </button>
        <button
          type="button"
          aria-label={`切换正文字号，当前${textScaleLabel}`}
          data-tooltip={`正文字号：${textScaleLabel}`}
          onClick={() =>
            setTextScale((current) =>
              current === "compact" ? "default" : current === "default" ? "large" : "compact",
            )
          }
        >
          <TextT size={19} />
        </button>
      </div>
      <div className="material-heading">
        <p className="step-label">项目自写开发材料 · 难度待校准</p>
        <h2 id="material-title">{material.title}</h2>
        <div className="reading-instruction">
          <p>选中原文后，标记工具会直接出现在选区旁边。</p>
          <button type="button" onClick={onPromptUncertain}>
            看不懂时，选中原文并标出卡点
          </button>
        </div>
      </div>
      <div className={`reading-copy reading-scale-${textScale}`}>
        {material.paragraphs.map((paragraph, index) => (
          <div className="reading-paragraph-group" key={paragraph.paragraph_id}>
            <p data-paragraph-id={paragraph.paragraph_id}>
              <AnnotatedParagraph
                paragraphId={paragraph.paragraph_id}
                text={paragraph.text}
                annotations={annotations}
                onReviewAnnotation={onReviewAnnotation}
              />
            </p>
            {index === 1 && material.paragraphs.length > 2 ? (
              <div className="reading-breathing-marker" role="note">
                <span aria-hidden="true" />
                <small>阅读呼吸点 · 抬眼看远处两秒，再继续</small>
                <span aria-hidden="true" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div
        ref={dockRef}
        className={`reading-command-dock${dockPosition ? " floating" : ""}${dockLocked ? " locked" : " unlocked"}`}
        aria-label="阅读快捷操作"
        style={dockPosition ?? undefined}
      >
        <button
          type="button"
          className="dock-drag-handle"
          aria-label={dockLocked ? "阅读快捷栏已锁定" : "拖动阅读快捷栏"}
          aria-disabled={dockLocked}
          data-tooltip={dockLocked ? "先解锁，再拖动位置" : "按住拖动快捷栏"}
          onPointerDown={startDockDrag}
        >
          <DotsSixVertical size={17} />
        </button>
        <button type="button" onClick={onSelectText}>
          <Target size={17} />
          标记选区
        </button>
        <button type="button" onClick={onPromptUncertain}>
          <BookOpen size={17} />
          指出卡点
        </button>
        <button type="button" onClick={onOpenTemporaryTask}>
          <PlusSquare size={17} />
          加入临时任务
        </button>
        <button
          type="button"
          className="dock-lock-toggle"
          aria-label={dockLocked ? "解锁阅读快捷栏" : "锁定阅读快捷栏位置"}
          aria-pressed={dockLocked}
          data-tooltip={dockLocked ? "解锁后可拖动" : "锁定当前位置"}
          onClick={() => setDockLocked((current) => !current)}
        >
          {dockLocked ? <Lock size={17} /> : <LockOpen size={17} />}
        </button>
      </div>
    </article>
  );
}

interface ParagraphSegment {
  start: number;
  end: number;
  annotations: AnnotationView[];
}

function paragraphSegments(
  paragraphId: string,
  text: string,
  annotations: AnnotationView[],
): ParagraphSegment[] {
  const paragraphAnnotations = annotations.filter(
    (annotation) =>
      annotation.span.paragraph_id === paragraphId &&
      annotation.span.start >= 0 &&
      annotation.span.end <= text.length &&
      annotation.span.start < annotation.span.end,
  );
  if (paragraphAnnotations.length === 0) {
    return [{ start: 0, end: text.length, annotations: [] }];
  }

  const boundaries = Array.from(
    new Set([
      0,
      text.length,
      ...paragraphAnnotations.flatMap((annotation) => [annotation.span.start, annotation.span.end]),
    ]),
  ).sort((left, right) => left - right);

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1] ?? text.length;
    return {
      start,
      end,
      annotations: paragraphAnnotations.filter(
        (annotation) => annotation.span.start <= start && annotation.span.end >= end,
      ),
    };
  });
}

interface AnnotatedParagraphProps {
  paragraphId: string;
  text: string;
  annotations: AnnotationView[];
  onReviewAnnotation: (annotationId: string) => void;
}

function AnnotatedParagraph({
  paragraphId,
  text,
  annotations,
  onReviewAnnotation,
}: AnnotatedParagraphProps) {
  return paragraphSegments(paragraphId, text, annotations).map((segment) => {
    const value = text.slice(segment.start, segment.end);
    const [primary] = segment.annotations;
    if (!primary) {
      return <span key={`${segment.start}-${segment.end}`}>{value}</span>;
    }
    const labels = segment.annotations.map((annotation) => ANNOTATION_LABELS[annotation.kind]);
    return (
      <button
        key={`${segment.start}-${segment.end}`}
        type="button"
        className={`inline-annotation annotation-kind-${primary.kind}`}
        aria-label={`${labels.join("、")}标记：${value}`}
        title={`${labels.join("、")} · 点击查看你的解释`}
        onClick={() => onReviewAnnotation(primary.annotation_id)}
      >
        {value}
      </button>
    );
  });
}

interface SavedAnnotationsProps {
  annotations: AnnotationView[];
  expanded: boolean;
  onToggle: () => void;
}

function SavedAnnotations({ annotations, expanded, onToggle }: SavedAnnotationsProps) {
  return (
    <section className="saved-annotations" aria-labelledby="saved-annotations-title">
      <button
        type="button"
        className="saved-annotations-toggle"
        aria-expanded={expanded}
        aria-controls="saved-annotations-list"
        onClick={onToggle}
      >
        <span>
          <strong id="saved-annotations-title">已保存标记</strong>
          <small>
            {annotations.length > 0
              ? `${annotations.length} 条 · 原文中的痕迹也已保留`
              : "保存后会在原文和这里保留记录"}
          </small>
        </span>
        <span aria-hidden="true">{expanded ? "收起" : "查看"}</span>
      </button>
      {expanded ? (
        <div id="saved-annotations-list" className="saved-annotations-list">
          {annotations.length > 0 ? (
            annotations.map((annotation) => (
              <article
                key={annotation.annotation_id}
                id={`saved-annotation-${annotation.annotation_id}`}
                className={`saved-annotation-card annotation-kind-${annotation.kind}`}
                tabIndex={-1}
              >
                <div>
                  <span>{ANNOTATION_LABELS[annotation.kind]}</span>
                  <small>第 {annotation.span.paragraph_id.split("_p").at(-1)} 段</small>
                </div>
                <blockquote>“{annotation.span.text_quote}”</blockquote>
                <p>{annotation.user_explanation}</p>
              </article>
            ))
          ) : (
            <p className="empty-annotations">还没有记录。选中原文，写下它的作用或你的卡点。</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ThinkingGuide({ isReading }: { isReading: boolean }) {
  return (
    <div id="thinking-guide" className="thinking-guide">
      <p className="guide-boundary">方法示例，不对应当前题目；不会给出当前答案。</p>
      {isReading ? (
        <>
          <ol>
            <li>先问：题目问的是原因、结果、态度，还是两者关系？</li>
            <li>回原文找发生变化后的结果句，再用自己的话缩写。</li>
            <li>逐项排除：是否偷换对象、扩大范围，或加入原文没有的信息？</li>
          </ol>
          <p className="method-example">
            <strong>无关题目的方法示例：</strong>
            如果短文说“调整排队规则后，等待时间下降”，问题问规则的效果，就先抓“等待时间下降”，不要把“调整规则”本身当成效果。
          </p>
        </>
      ) : (
        <>
          <ol>
            <li>先写一个你真正认同的好处，不追求漂亮句。</li>
            <li>再补一个限制：这个帮助在什么情况下会替代目标技能？</li>
            <li>最后给出顺序：先亲自尝试，再在卡住后使用工具。</li>
          </ol>
          <p className="method-example">
            <strong>无关题目的方法示例：</strong>
            写计算器时，可以按“提高核对效率 → 不能替代基本运算 →
            先估算再验证”的顺序搭出骨架，再换成自己的英文。
          </p>
        </>
      )}
    </div>
  );
}

interface ExpressionBriefProps {
  material: ExpressionMaterialView;
  materialRef: React.RefObject<HTMLElement | null>;
}

function ExpressionBrief({ material, materialRef }: ExpressionBriefProps) {
  return (
    <article className="expression-brief" ref={materialRef} tabIndex={0}>
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
  isRevision: boolean;
}

function ExpressionResponseHeader({
  material,
  wordCount,
  isRevision,
}: ExpressionResponseHeaderProps) {
  const withinRange =
    wordCount >= material.output_requirement.word_min &&
    wordCount <= material.output_requirement.word_max;
  return (
    <>
      <p className="step-label">我的作品 · {isRevision ? "V2" : "V1"}</p>
      <h2 id="response-title">
        {isRevision ? "只处理一个优先问题，保留自己的表达" : "先把立场、条件和建议写出来"}
      </h2>
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

function CalibrationSummary({
  workspace,
  onStart,
}: {
  workspace: LearnerWorkspaceView;
  onStart: () => void;
}) {
  const calibrationTasks = workspace.run.task_refs.filter((task) =>
    task.role.startsWith("calibration_"),
  );
  const supportedCount = calibrationTasks.filter(
    (task) => (task.highest_hint_level ?? 0) > 0,
  ).length;
  const decision = workspace.run.match_decisions.at(-1);
  return (
    <main className="summary-shell">
      <header className="summary-intro">
        <p className="eyebrow">起点建议已就绪</p>
        <h1>不急着贴等级，先把两段表现变成下一步</h1>
        <p>
          当前证据仍然很少。这份摘要只说明本次从哪里开始，不是能力分数，也不会覆盖你之后在新材料中的表现。
        </p>
      </header>

      <section className="summary-findings" aria-label="校准摘要">
        <article>
          <span className="finding-index">01</span>
          <p className="step-label">本次较稳的部分</p>
          <h2>
            {supportedCount === 0
              ? "你在两段短材料中都独立留下了判断"
              : "你在最小帮助后仍亲自完成了判断"}
          </h2>
          <p>这只是即时完成证据；换一篇材料后是否仍能做到，还需要继续确认。</p>
        </article>
        <article>
          <span className="finding-index">02</span>
          <p className="step-label">接下来优先观察</p>
          <h2>
            {supportedCount > 0
              ? "在请求帮助前，能否先定位最小关键证据"
              : "能否把跨句证据与作者观点说清楚"}
          </h2>
          <p>正式阅读会要求精确标出原文，并用自己的话解释关系。</p>
        </article>
        <article>
          <span className="finding-index">03</span>
          <p className="step-label">为什么选下一篇</p>
          <h2>先保持主体可理解，只增加一个主要挑战</h2>
          <p>
            {decision?.conservative
              ? "当前采用保守匹配；证据增加后再逐步调整负荷。"
              : "当前表现允许保留适中负荷，但仍不会据此推断精确水平。"}
          </p>
        </article>
      </section>

      <section className="summary-next" aria-labelledby="summary-next-title">
        <div>
          <p className="step-label">下一步 · 语境实验室</p>
          <h2 id="summary-next-title">开始第一篇匹配阅读</h2>
          <p>完成独立判断、至少一条带解释的语义标记，再把思路迁移到 2–4 句英文表达。</p>
        </div>
        <button className="primary-button strong-action" type="button" onClick={onStart}>
          进入匹配阅读
        </button>
      </section>
    </main>
  );
}

function WrapUpWorkspace({
  workspace,
  onWorkspaceChange,
  onError,
  onLearningAssetCapture,
}: LearningWorkspaceProps) {
  const [rating, setRating] = useState<"too_easy" | "matched" | "too_hard">("matched");
  const [reflection, setReflection] = useState("");
  const [isPending, startTransition] = useTransition();
  const completedTasks = workspace.run.task_refs.filter((task) => task.completed);
  const supportedTasks = completedTasks.filter((task) => (task.highest_hint_level ?? 0) > 0);
  const independentTasks = completedTasks.length - supportedTasks.length;
  const completedExpression = completedTasks.some((task) => task.role === "micro_expression");

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
        if (reflection.trim()) {
          const sourceDate = new Intl.DateTimeFormat("zh-CN", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(run.created_at));
          onLearningAssetCapture({
            kind: "exam_skill",
            title: "本次训练收获",
            content: reflection,
            note: "由我在训练收尾时总结，供下一次开始前复习。",
            sourceTitle: `训练收尾 · ${sourceDate}`,
          });
        }
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
      <section className="session-gains" aria-labelledby="session-gains-title">
        <p className="step-label">本次收获总结</p>
        <h2 id="session-gains-title">把完成记录变成下一次可复用的提醒</h2>
        <div className="session-gain-grid">
          <article>
            <span>完成</span>
            <strong>{completedTasks.length} 个学习任务</strong>
            <small>
              {completedExpression ? "包含一次亲自组织的英文表达" : "当前完成记录已保存"}
            </small>
          </article>
          <article>
            <span>独立性</span>
            <strong>{independentTasks} 个任务保持 H0</strong>
            <small>
              {supportedTasks.length
                ? `${supportedTasks.length} 个任务使用过最小帮助`
                : "本次没有领取提示"}
            </small>
          </article>
        </div>
        <label className="session-reflection">
          <span>我下次要继续复用的做法（可选）</span>
          <textarea
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="例如：先定位转折后的结果句，再回到选项判断。"
            disabled={isPending}
          />
          <small>填写后会保存到“学习资产 → 做题技巧”。</small>
        </label>
        <p className="session-gain-boundary">
          这是即时完成证据；稳定进步仍需要在新材料和延迟任务中再次确认。
        </p>
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
          className="primary-button strong-action"
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
