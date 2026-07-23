import { beforeEach, describe, expect, it } from "vitest";

import type { LearnerProfileInput } from "./contracts";
import {
  calibrationSummaryDismissed,
  clearLegacyLearnerPreferences,
  dismissCalibrationSummary,
  loadExperience,
  loadLearnerPreferences,
  saveExperienceProfile,
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

const completedWorkflowRunId = "workflow_run_completed_0001";

describe("learner experience storage", () => {
  beforeEach(() => localStorage.clear());

  it("keeps browser projections separated by learner account", () => {
    saveExperienceProfile(learnerId, profile);
    expect(loadExperience("learner_other_0001")).toBeNull();
  });

  it("reads and clears a legacy browser preference during server migration", () => {
    localStorage.setItem(
      `binnagent:learner-preferences:v1:${learnerId}`,
      JSON.stringify({ skin: "ragdoll" }),
    );
    expect(loadLearnerPreferences(learnerId).skin).toBe("ragdoll");
    clearLegacyLearnerPreferences(learnerId);
    expect(loadLearnerPreferences(learnerId).skin).toBe("paper");
  });

  it("remembers that the calibration summary was acknowledged", () => {
    expect(calibrationSummaryDismissed(completedWorkflowRunId)).toBe(false);
    dismissCalibrationSummary(completedWorkflowRunId);
    expect(calibrationSummaryDismissed(completedWorkflowRunId)).toBe(true);
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
