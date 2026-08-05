import { beforeEach, describe, expect, it } from "vitest";

import type { LearnerWorkspaceView } from "./contracts";
import {
  clearDraft,
  clearResumeRunId,
  loadDraft,
  loadResumeRunId,
  loadTemporaryTaskWorkspace,
  loadWorkspaceNote,
  saveDraft,
  saveResumeRunId,
  saveTemporaryTaskWorkspace,
  saveWorkspaceNote,
} from "./draft-storage";
import { DEFAULT_COMPONENT_STYLES } from "./intensive-reading";

const workspace = {
  task: {
    task_id: "task_frontend_0001",
    current_content_version_id: "calibration_reading_a_v1",
  },
} as LearnerWorkspaceView;

describe("versioned local recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

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

  it("restores temporary tasks across navigation within the same task version", () => {
    expect(
      saveTemporaryTaskWorkspace({
        schemaVersion: 1,
        taskId: "task_frontend_0001",
        contentVersionId: "calibration_reading_a_v1",
        tasks: [
          {
            id: "temporary-1",
            promptIndex: 0,
            answer: "我的翻译",
            completed: false,
            taskType: "intensive_reading",
            sourceKey: "intensive-reading:task_frontend_0001:p1:0:12",
            intensiveSessionId: "session-1",
          },
        ],
        expandedTaskId: "temporary-1",
        intensiveSessions: {
          "session-1": {
            id: "session-1",
            taskItemId: "temporary-1",
            sentence: {
              paragraphId: "p1",
              start: 0,
              end: 12,
              textQuote: "Useful effort",
              usedParagraphFallback: false,
            },
            paragraphNumber: 1,
            phase: "attempt",
            translation: "有效的努力",
            marks: [],
            styles: { ...DEFAULT_COMPONENT_STYLES },
            analysis: null,
            analysisError: null,
            followUps: [],
          },
        },
        activeIntensiveSessionId: "session-1",
        taskCounter: 1,
        updatedAt: "2026-08-04T00:00:00Z",
      }),
    ).toBe(true);

    const restored = loadTemporaryTaskWorkspace("task_frontend_0001", "calibration_reading_a_v1");
    expect(restored?.tasks).toHaveLength(1);
    expect(restored?.tasks[0]?.taskType).toBe("intensive_reading");
    expect(restored?.intensiveSessions["session-1"]?.translation).toBe("有效的努力");
    expect(loadTemporaryTaskWorkspace("task_frontend_0001", "calibration_reading_b_v1")).toBeNull();
  });
});
