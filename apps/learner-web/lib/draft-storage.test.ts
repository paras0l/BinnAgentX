import { beforeEach, describe, expect, it } from "vitest";

import type { LearnerWorkspaceView } from "./contracts";
import {
  clearDraft,
  clearResumeRunId,
  loadDraft,
  loadResumeRunId,
  loadWorkspaceNote,
  saveDraft,
  saveResumeRunId,
  saveWorkspaceNote,
} from "./draft-storage";

const workspace = {
  task: {
    task_id: "task_frontend_0001",
    current_content_version_id: "calibration_reading_a_v1",
  },
} as LearnerWorkspaceView;

describe("versioned local recovery", () => {
  beforeEach(() => localStorage.clear());

  it("stores only the run pointer needed for resume", () => {
    saveResumeRunId("learner_test_0001", "workflow_run_frontend_0001");
    expect(loadResumeRunId("learner_test_0001")).toBe("workflow_run_frontend_0001");
    expect(localStorage.getItem("binnagent:learner-resume:v1:learner_test_0001")).toBe(
      '{"schemaVersion":1,"workflowRunId":"workflow_run_frontend_0001"}',
    );
    clearResumeRunId("learner_test_0001");
    expect(loadResumeRunId("learner_test_0001")).toBeNull();
  });

  it("rejects a draft after the assigned content version changes", () => {
    expect(
      saveDraft({
        schemaVersion: 1,
        taskId: "task_frontend_0001",
        contentVersionId: "calibration_reading_a_v1",
        choice: "B",
        text: "My own explanation.",
        updatedAt: "2026-07-16T00:00:00Z",
      }),
    ).toBe(true);
    expect(loadDraft(workspace)?.choice).toBe("B");
    expect(
      loadDraft({
        ...workspace,
        task: {
          ...workspace.task!,
          current_content_version_id: "calibration_reading_b_v1",
        },
      }),
    ).toBeNull();
    clearDraft("task_frontend_0001");
    expect(loadDraft(workspace)).toBeNull();
  });

  it("keeps an optional thinking note scoped to the assigned material", () => {
    expect(
      saveWorkspaceNote({
        schemaVersion: 1,
        taskId: "task_frontend_0001",
        contentVersionId: "calibration_reading_a_v1",
        text: "作者先描述资源浪费，再用规则变化说明共享效率。",
        updatedAt: "2026-07-16T00:00:00Z",
      }),
    ).toBe(true);
    expect(loadWorkspaceNote("task_frontend_0001", "calibration_reading_a_v1")?.text).toContain(
      "规则变化",
    );
    expect(loadWorkspaceNote("task_frontend_0001", "calibration_reading_b_v1")).toBeNull();
  });
});
