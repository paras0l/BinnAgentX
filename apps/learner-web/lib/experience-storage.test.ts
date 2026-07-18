import { beforeEach, describe, expect, it } from "vitest";

import type { LearnerProfileInput, LearnerRunView } from "./contracts";
import {
  calibrationSummaryDismissed,
  dismissCalibrationSummary,
  loadExperience,
  loadLearnerPreferences,
  recordCompletedSession,
  saveExperienceProfile,
  saveLearnerPreferences,
} from "./experience-storage";

const profile: LearnerProfileInput = {
  exam_track: "english_1",
  target_score: 70,
  weekly_minutes: 420,
  self_reported_level: "developing",
  prior_exam_seen: false,
  session_minutes: 45,
  feedback_density: "minimal",
  timed: false,
  evidence_count: 0,
  confidence_band: "low",
};
const learnerId = "learner_test_0001";

const completedRun = {
  workflow_run_id: "workflow_run_completed_0001",
  run_kind: "first_experience",
  predecessor_run_id: null,
  lifecycle: "completed",
  stage: "completed",
  version: 10,
  current_task_id: null,
  task_refs: [
    {
      task_id: "task_matched_0001",
      role: "matched_reading",
      task_type: "matched_reading",
      content_version_id: "matched_reading_01_v1",
      completed: true,
      completed_task_version: 4,
      highest_hint_level: 1,
    },
  ],
  match_decisions: [],
  calibration_fallback_approved: false,
  difficulty_feedback_status: "submitted",
  difficulty_rating: "matched",
  next_task_placeholder_id: "next_task_placeholder_0001",
  completion_gaps: [],
  created_at: "2026-07-16T10:00:00Z",
  updated_at: "2026-07-16T10:30:00Z",
  replayed: false,
} satisfies LearnerRunView;

describe("learner experience storage", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the profile and an idempotent completed-session projection", () => {
    saveExperienceProfile(learnerId, profile);
    recordCompletedSession(learnerId, completedRun, profile);
    recordCompletedSession(learnerId, completedRun, profile);

    expect(loadExperience(learnerId)?.sessions).toHaveLength(1);
    expect(loadExperience(learnerId)?.sessions[0]).toMatchObject({
      supportedTaskCount: 1,
      matchedContentVersionId: "matched_reading_01_v1",
    });
  });

  it("keeps browser projections separated by learner account", () => {
    saveExperienceProfile(learnerId, profile);
    expect(loadExperience("learner_other_0001")).toBeNull();
  });

  it("persists account preferences before calibration creates a full experience record", () => {
    const preferences = { ...loadLearnerPreferences(learnerId), skin: "ragdoll" as const };

    expect(saveLearnerPreferences(learnerId, preferences)).toBeNull();
    expect(loadLearnerPreferences(learnerId).skin).toBe("ragdoll");
    expect(loadLearnerPreferences("learner_other_0001").skin).toBe("paper");
  });

  it("remembers that the calibration summary was acknowledged", () => {
    expect(calibrationSummaryDismissed(completedRun.workflow_run_id)).toBe(false);
    dismissCalibrationSummary(completedRun.workflow_run_id);
    expect(calibrationSummaryDismissed(completedRun.workflow_run_id)).toBe(true);
  });

  it("migrates preferences saved before account skins existed", () => {
    saveExperienceProfile(learnerId, profile);
    const key = `binnagent:learner-experience:v1:${learnerId}`;
    const stored = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      preferences?: Record<string, unknown>;
    };
    if (stored.preferences) delete stored.preferences.skin;
    localStorage.setItem(key, JSON.stringify(stored));

    expect(loadExperience(learnerId)?.preferences.skin).toBe("paper");
  });

  it("migrates the former sakura skin to the ragdoll theme", () => {
    saveExperienceProfile(learnerId, profile);
    const key = `binnagent:learner-experience:v1:${learnerId}`;
    const stored = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      preferences?: Record<string, unknown>;
    };
    if (stored.preferences) stored.preferences.skin = "sakura";
    localStorage.setItem(key, JSON.stringify(stored));

    expect(loadExperience(learnerId)?.preferences.skin).toBe("ragdoll");
  });
});
