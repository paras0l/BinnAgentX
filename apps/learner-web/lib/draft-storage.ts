import type { LearnerWorkspaceView } from "./contracts";

const RESUME_KEY = "binnagent:learner-resume:v1";
const DRAFT_PREFIX = "binnagent:learner-draft:v1:";

export interface LocalDraft {
  schemaVersion: 1;
  taskId: string;
  contentVersionId: string;
  choice: string;
  text: string;
  updatedAt: string;
}

export function loadResumeRunId(): string | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { schemaVersion?: number; workflowRunId?: unknown };
    return value.schemaVersion === 1 && typeof value.workflowRunId === "string"
      ? value.workflowRunId
      : null;
  } catch {
    return null;
  }
}

export function saveResumeRunId(workflowRunId: string): void {
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify({ schemaVersion: 1, workflowRunId }));
  } catch {
    // Local recovery is best effort; server facts remain authoritative.
  }
}

export function clearResumeRunId(): void {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {
    // Storage may be disabled.
  }
}

export function loadDraft(workspace: LearnerWorkspaceView): LocalDraft | null {
  const task = workspace.task;
  if (!task) return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${task.task_id}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LocalDraft>;
    if (
      value.schemaVersion !== 1 ||
      value.taskId !== task.task_id ||
      value.contentVersionId !== task.current_content_version_id ||
      typeof value.choice !== "string" ||
      typeof value.text !== "string" ||
      typeof value.updatedAt !== "string"
    ) {
      return null;
    }
    return value as LocalDraft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: LocalDraft): boolean {
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${draft.taskId}`, JSON.stringify(draft));
    return true;
  } catch {
    // The UI keeps the in-memory draft and does not claim it was persisted.
    return false;
  }
}

export function clearDraft(taskId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${taskId}`);
  } catch {
    // Storage may be disabled.
  }
}
