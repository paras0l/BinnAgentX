import {
  PUBLIC_ERROR_MESSAGES,
  type PublicErrorCode,
} from "@binnagent/frontend-domain/public-errors";

import type {
  AnnotationAnalysisView,
  AnnotationKind,
  ExpressionReviewView,
  GrammarChallengeUpdateView,
  LearnerProfileInput,
  LearnerResumeWorkspaceView,
  LearnerRunView,
  LearnerTaskView,
  LearnerWorkspaceView,
  TextSelection,
} from "./contracts";

interface ApiErrorBody {
  code?: string;
  reason?: string;
  current_version?: number | null;
}

export class LearnerApiError extends Error {
  readonly code: PublicErrorCode | "UNKNOWN";
  readonly currentVersion: number | null;

  constructor(body: ApiErrorBody, status: number) {
    const knownCode = body.code && body.code in PUBLIC_ERROR_MESSAGES;
    const code = knownCode ? (body.code as PublicErrorCode) : "UNKNOWN";
    const message =
      code === "UNKNOWN"
        ? `操作未完成（${status}）。草稿仍保留在此电脑。`
        : PUBLIC_ERROR_MESSAGES[code];
    super(message);
    this.name = "LearnerApiError";
    this.code = code;
    this.currentVersion = body.current_version ?? null;
  }
}

function idempotencyKey(command: string): string {
  return `${command}:${crypto.randomUUID()}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/learner${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // The public fallback message intentionally excludes an upstream response body.
    }
    throw new LearnerApiError(body, response.status);
  }
  return (await response.json()) as T;
}

function command<T>(path: string, name: string, body: object): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey(name) },
    body: JSON.stringify(body),
  });
}

export function createRun(learnerProfile: LearnerProfileInput): Promise<LearnerRunView> {
  return command("/v1/runs", "create_run", { learner_profile: learnerProfile });
}

export function continueRun(
  workflowRunId: string,
  expectedVersion: number,
): Promise<LearnerRunView> {
  return command(`/v1/runs/${workflowRunId}/continue`, "continue_run", {
    expected_version: expectedVersion,
  });
}

export function getWorkspace(workflowRunId: string): Promise<LearnerWorkspaceView> {
  return request(`/v1/runs/${workflowRunId}/workspace`);
}

export function getResumeWorkspace(workflowRunId: string): Promise<LearnerResumeWorkspaceView> {
  return request(`/v1/runs/${workflowRunId}/resume-workspace`);
}

export function revealGrammarChallengeHint(taskId: string): Promise<GrammarChallengeUpdateView> {
  return command(`/v1/tasks/${taskId}/grammar-challenge/hint`, "grammar_challenge_hint", {});
}

export function revealGrammarChallengeAnswer(taskId: string): Promise<GrammarChallengeUpdateView> {
  return command(`/v1/tasks/${taskId}/grammar-challenge/answer`, "grammar_challenge_answer", {});
}

export function verifyGrammarChallenge(
  taskId: string,
  correction: string,
): Promise<GrammarChallengeUpdateView> {
  return command(`/v1/tasks/${taskId}/grammar-challenge/verify`, "grammar_challenge_verify", {
    correction,
  });
}

export async function sha256Text(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function saveAnnotation(
  task: LearnerTaskView,
  kind: AnnotationKind,
  selection: TextSelection,
  explanation: string,
): Promise<LearnerTaskView> {
  return command(`/v1/tasks/${task.task_id}/annotations`, "save_annotation", {
    expected_version: task.version,
    kind,
    span: {
      paragraph_id: selection.paragraphId,
      start: selection.start,
      end: selection.end,
      text_quote: selection.textQuote,
      text_hash: await sha256Text(selection.textQuote),
    },
    user_explanation: explanation,
  });
}

export async function analyzeAnnotation(
  task: LearnerTaskView,
  selection: TextSelection,
  learnerQuestion: string,
): Promise<AnnotationAnalysisView> {
  return request(`/v1/tasks/${task.task_id}/annotations/analyze`, {
    method: "POST",
    body: JSON.stringify({
      expected_version: task.version,
      span: {
        paragraph_id: selection.paragraphId,
        start: selection.start,
        end: selection.end,
        text_quote: selection.textQuote,
        text_hash: await sha256Text(selection.textQuote),
      },
      learner_question: learnerQuestion,
    }),
  });
}

export function reviewExpression(
  task: LearnerTaskView,
  draft: string,
  recentAssets: Array<{ title: string; content: string }>,
): Promise<ExpressionReviewView> {
  return request(`/v1/tasks/${task.task_id}/expression-lab/review`, {
    method: "POST",
    body: JSON.stringify({
      expected_version: task.version,
      draft,
      recent_assets: recentAssets.slice(0, 4),
    }),
  });
}

export function saveAttempt(task: LearnerTaskView, text: string): Promise<LearnerTaskView> {
  const independence =
    task.highest_hint_level >= 3
      ? "hinted_high"
      : task.highest_hint_level > 0
        ? "hinted_low"
        : "independent";
  return command(`/v1/tasks/${task.task_id}/attempts`, "save_attempt", {
    expected_version: task.version,
    text,
    independence,
  });
}

export function requestH1Hint(task: LearnerTaskView): Promise<LearnerTaskView> {
  const latestAttempt = task.attempts.at(-1);
  if (!latestAttempt) return Promise.reject(new Error("V1 is required before H1"));
  return command(`/v1/tasks/${task.task_id}/hints/h1`, "request_h1", {
    expected_version: task.version,
    input_attempt_version_id: latestAttempt.attempt_version_id,
  });
}

export function requestPriorityFeedback(task: LearnerTaskView): Promise<LearnerTaskView> {
  const latestAttempt = task.attempts.at(-1);
  if (!latestAttempt) return Promise.reject(new Error("V1 is required before priority feedback"));
  return command(`/v1/tasks/${task.task_id}/feedback/priority`, "request_priority_feedback", {
    expected_version: task.version,
    input_attempt_version_id: latestAttempt.attempt_version_id,
  });
}

export function saveRevision(
  task: LearnerTaskView,
  fromAttemptVersionId: string,
  toAttemptVersionId: string,
  interventionId: string,
): Promise<LearnerTaskView> {
  return command(`/v1/tasks/${task.task_id}/revisions`, "save_revision", {
    expected_version: task.version,
    from_attempt_version_id: fromAttemptVersionId,
    to_attempt_version_id: toAttemptVersionId,
    intervention_id: interventionId,
    result_status: "needs_review",
  });
}

export function completeTask(task: LearnerTaskView): Promise<LearnerTaskView> {
  return command(`/v1/tasks/${task.task_id}/complete`, "complete_task", {
    expected_version: task.version,
  });
}

export function endTaskEarly(task: LearnerTaskView): Promise<LearnerTaskView> {
  return command(`/v1/tasks/${task.task_id}/end-early`, "end_task_early", {
    expected_version: task.version,
  });
}

export function pauseTask(task: LearnerTaskView): Promise<LearnerTaskView> {
  return command(`/v1/tasks/${task.task_id}/pause`, "pause_task", {
    expected_version: task.version,
  });
}

export function resumeTask(task: LearnerTaskView): Promise<LearnerTaskView> {
  return command(`/v1/tasks/${task.task_id}/resume`, "resume_task", {
    expected_version: task.version,
  });
}

export function advanceRun(run: LearnerRunView): Promise<LearnerRunView> {
  return command(`/v1/runs/${run.workflow_run_id}/advance`, "advance_run", {
    expected_version: run.version,
  });
}

export function recordDifficulty(
  run: LearnerRunView,
  rating: "too_easy" | "matched" | "too_hard" | null,
): Promise<LearnerRunView> {
  return command(`/v1/runs/${run.workflow_run_id}/difficulty-feedback`, "difficulty_feedback", {
    expected_version: run.version,
    rating,
    skipped: rating === null,
  });
}

export function reserveNextTask(run: LearnerRunView): Promise<LearnerRunView> {
  return command(`/v1/runs/${run.workflow_run_id}/next-task-placeholder`, "reserve_next_task", {
    expected_version: run.version,
    planned_task_type: "matched_reading",
    reason_code: "continue_matched_practice",
  });
}

export function completeRun(run: LearnerRunView): Promise<LearnerRunView> {
  return command(`/v1/runs/${run.workflow_run_id}/complete`, "complete_run", {
    expected_version: run.version,
  });
}
