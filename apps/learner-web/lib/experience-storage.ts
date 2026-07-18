import type { LearnerProfileInput, LearnerRunView } from "./contracts";
import type { ThemeId } from "../theme/registry";
import { normalizeThemeId } from "../theme/registry";

const EXPERIENCE_PREFIX = "binnagent:learner-experience:v1:";
const PREFERENCES_PREFIX = "binnagent:learner-preferences:v1:";
const SUMMARY_PREFIX = "binnagent:calibration-summary:v1:";
const MAX_SESSION_RECORDS = 12;

export interface LearnerPreferences {
  assistanceMode: "ask_first" | "proactive" | "quiet";
  feedbackDetail: "concise" | "balanced" | "detailed";
  correctionTone: "gentle" | "direct";
  showDecisionTrace: boolean;
  temporaryTasksEnabled: boolean;
  readingComfort: "compact" | "comfortable" | "spacious";
  reducedMotion: boolean;
  skin: ThemeId;
}

export const DEFAULT_PREFERENCES: LearnerPreferences = {
  assistanceMode: "ask_first",
  feedbackDetail: "balanced",
  correctionTone: "gentle",
  showDecisionTrace: true,
  temporaryTasksEnabled: true,
  readingComfort: "comfortable",
  reducedMotion: false,
  skin: "paper",
};

function normalizePreferences(value: unknown): LearnerPreferences {
  const preferences =
    value && typeof value === "object" ? (value as Partial<LearnerPreferences>) : {};
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    skin: normalizeThemeId(preferences.skin),
  };
}

function loadStoredPreferences(learnerId: string): LearnerPreferences | null {
  try {
    const raw = localStorage.getItem(`${PREFERENCES_PREFIX}${learnerId}`);
    return raw ? normalizePreferences(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function persistPreferences(learnerId: string, preferences: LearnerPreferences): void {
  try {
    localStorage.setItem(`${PREFERENCES_PREFIX}${learnerId}`, JSON.stringify(preferences));
  } catch {
    // A learner can keep using the in-memory preference state when storage is blocked.
  }
}

export function loadLearnerPreferences(learnerId: string): LearnerPreferences {
  const standalone = loadStoredPreferences(learnerId);
  if (standalone) return standalone;

  try {
    const raw = localStorage.getItem(`${EXPERIENCE_PREFIX}${learnerId}`);
    if (!raw) return DEFAULT_PREFERENCES;
    const value = JSON.parse(raw) as Partial<LearnerExperienceState>;
    return normalizePreferences(value.preferences);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export interface CompletedSessionRecord {
  workflowRunId: string;
  runVersion: number;
  runKind: "first_experience" | "practice";
  completedAt: string;
  difficultyRating: string | null;
  completedTaskCount: number;
  supportedTaskCount: number;
  matchedContentVersionId: string | null;
}

export interface LearnerExperienceState {
  schemaVersion: 1;
  profile: LearnerProfileInput;
  sessions: CompletedSessionRecord[];
  preferences: LearnerPreferences;
  temporaryTasksCompleted: number;
}

function validProfile(value: unknown): value is LearnerProfileInput {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<LearnerProfileInput>;
  return (
    (profile.exam_track === "english_1" || profile.exam_track === "english_2") &&
    typeof profile.target_score === "number" &&
    typeof profile.weekly_minutes === "number" &&
    typeof profile.session_minutes === "number" &&
    typeof profile.self_reported_level === "string" &&
    typeof profile.prior_exam_seen === "boolean"
  );
}

export function loadExperience(learnerId: string): LearnerExperienceState | null {
  try {
    const raw = localStorage.getItem(`${EXPERIENCE_PREFIX}${learnerId}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LearnerExperienceState>;
    if (
      value.schemaVersion !== 1 ||
      !validProfile(value.profile) ||
      !Array.isArray(value.sessions)
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      profile: value.profile,
      sessions: value.sessions as CompletedSessionRecord[],
      preferences:
        loadStoredPreferences(learnerId) ??
        normalizePreferences((value as Partial<LearnerExperienceState>).preferences),
      temporaryTasksCompleted:
        (value as Partial<LearnerExperienceState>).temporaryTasksCompleted ?? 0,
    };
  } catch {
    return null;
  }
}

function persist(learnerId: string, state: LearnerExperienceState): void {
  try {
    localStorage.setItem(`${EXPERIENCE_PREFIX}${learnerId}`, JSON.stringify(state));
  } catch {
    // The learning API remains authoritative; this local home is a convenience projection.
  }
}

export function saveExperienceProfile(
  learnerId: string,
  profile: LearnerProfileInput,
): LearnerExperienceState {
  const current = loadExperience(learnerId);
  const state: LearnerExperienceState = {
    schemaVersion: 1,
    profile,
    sessions: current?.sessions ?? [],
    preferences: current?.preferences ?? loadLearnerPreferences(learnerId),
    temporaryTasksCompleted: current?.temporaryTasksCompleted ?? 0,
  };
  persist(learnerId, state);
  return state;
}

export function recordCompletedSession(
  learnerId: string,
  run: LearnerRunView,
  profile: LearnerProfileInput,
): LearnerExperienceState {
  const current = loadExperience(learnerId);
  const record: CompletedSessionRecord = {
    workflowRunId: run.workflow_run_id,
    runVersion: run.version,
    runKind: run.run_kind ?? "first_experience",
    completedAt: run.updated_at ?? new Date().toISOString(),
    difficultyRating: run.difficulty_rating,
    completedTaskCount: run.task_refs.filter((task) => task.completed).length,
    supportedTaskCount: run.task_refs.filter((task) => (task.highest_hint_level ?? 0) > 0).length,
    matchedContentVersionId:
      run.task_refs.find((task) => task.role === "matched_reading")?.content_version_id ?? null,
  };
  const sessions = [
    record,
    ...(current?.sessions ?? []).filter((item) => item.workflowRunId !== record.workflowRunId),
  ].slice(0, MAX_SESSION_RECORDS);
  const state: LearnerExperienceState = {
    schemaVersion: 1,
    profile,
    sessions,
    preferences: current?.preferences ?? loadLearnerPreferences(learnerId),
    temporaryTasksCompleted: current?.temporaryTasksCompleted ?? 0,
  };
  persist(learnerId, state);
  return state;
}

export function saveLearnerPreferences(
  learnerId: string,
  preferences: LearnerPreferences,
): LearnerExperienceState | null {
  persistPreferences(learnerId, preferences);
  const current = loadExperience(learnerId);
  if (!current) return null;
  const state = { ...current, preferences };
  persist(learnerId, state);
  return state;
}

export function recordTemporaryTask(learnerId: string): LearnerExperienceState | null {
  const current = loadExperience(learnerId);
  if (!current) return null;
  const state = {
    ...current,
    temporaryTasksCompleted: current.temporaryTasksCompleted + 1,
  };
  persist(learnerId, state);
  return state;
}

export function calibrationSummaryDismissed(workflowRunId: string): boolean {
  try {
    return localStorage.getItem(`${SUMMARY_PREFIX}${workflowRunId}`) === "dismissed";
  } catch {
    return false;
  }
}

export function dismissCalibrationSummary(workflowRunId: string): void {
  try {
    localStorage.setItem(`${SUMMARY_PREFIX}${workflowRunId}`, "dismissed");
  } catch {
    // Showing the summary again after reload is safe when storage is unavailable.
  }
}
