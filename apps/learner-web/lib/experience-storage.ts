import type { LearnerProfileInput } from "./contracts";
import type { ThemeId } from "../theme/registry";
import { normalizeThemeId } from "../theme/registry";

const EXPERIENCE_PREFIX = "binnagent:learner-experience:v1:";
const LEGACY_PREFERENCES_PREFIX = "binnagent:learner-preferences:v1:";
const SUMMARY_PREFIX = "binnagent:calibration-summary:v1:";

export interface LearnerPreferences {
  assistanceMode: "ask_first" | "proactive" | "quiet";
  feedbackDetail: "concise" | "balanced" | "detailed";
  correctionTone: "gentle" | "direct";
  showDecisionTrace: boolean;
  temporaryTasksEnabled: boolean;
  readingComfort: "compact" | "comfortable" | "spacious";
  reducedMotion: boolean;
  skin: ThemeId;
  navigationCollapsed: boolean;
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
  navigationCollapsed: false,
};

export function normalizeLearnerPreferences(value: unknown): LearnerPreferences {
  const preferences =
    value && typeof value === "object" ? (value as Partial<LearnerPreferences>) : {};
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    skin: normalizeThemeId(preferences.skin),
  };
}

export function loadLegacyLearnerPreferences(learnerId: string): LearnerPreferences | null {
  try {
    const raw = localStorage.getItem(`${LEGACY_PREFERENCES_PREFIX}${learnerId}`);
    return raw ? normalizeLearnerPreferences(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearLegacyLearnerPreferences(learnerId: string): void {
  try {
    localStorage.removeItem(`${LEGACY_PREFERENCES_PREFIX}${learnerId}`);
  } catch {
    // A stale browser projection is harmless once the account record exists.
  }
}

export function loadLearnerPreferences(learnerId: string): LearnerPreferences {
  const standalone = loadLegacyLearnerPreferences(learnerId);
  if (standalone) return standalone;

  try {
    const raw = localStorage.getItem(`${EXPERIENCE_PREFIX}${learnerId}`);
    if (!raw) return DEFAULT_PREFERENCES;
    const value = JSON.parse(raw) as Partial<LearnerExperienceState>;
    return normalizeLearnerPreferences(value.preferences);
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
      // Completed runs are account-owned server facts. Ignore legacy browser projections.
      sessions: [],
      preferences:
        loadLegacyLearnerPreferences(learnerId) ??
        normalizeLearnerPreferences((value as Partial<LearnerExperienceState>).preferences),
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
    sessions: [],
    preferences: current?.preferences ?? loadLearnerPreferences(learnerId),
    temporaryTasksCompleted: current?.temporaryTasksCompleted ?? 0,
  };
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
