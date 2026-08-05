import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrainingTaskQueue } from "./training-task-queue";

describe("TrainingTaskQueue article import", () => {
  it("queues pasted article text through the import callback", async () => {
    const onImport = vi.fn();
    render(
      <TrainingTaskQueue
        materials={[]}
        syncedContextCount={0}
        obsidianConfigurationChecked
        obsidianConfigured={false}
        isGenerating={false}
        systemTask={{
          title: "首次独立校准",
          description: "建立基线",
          actionLabel: "开始校准",
          statusLabel: "系统推荐",
        }}
        onGenerate={vi.fn()}
        onImport={onImport}
        onConfigureObsidian={vi.fn()}
        onOpenSystemTask={vi.fn()}
        onOpenMaterial={vi.fn()}
        onRetryMaterial={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("导入已有文章"));
    fireEvent.change(screen.getByLabelText("文章标题"), {
      target: { value: "An Imported Reading" },
    });
    fireEvent.change(screen.getByLabelText("文章正文"), {
      target: { value: "First paragraph.\n\nSecond paragraph.\n\nThird paragraph." },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入并加入训练队列" }));

    await waitFor(() =>
      expect(onImport).toHaveBeenCalledWith({
        title: "An Imported Reading",
        content: "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
        goal: "理解文章并完成读写迁移",
      }),
    );
  });

  it("shows a rejected import's review reason and retry action", () => {
    const onRetryMaterial = vi.fn();
    const material = {
      material_id: "training_material_rejected",
      title: "Keep Going, Keep Growing",
      paragraphs: ["First.", "Second.", "Third."],
      focus_points: [],
      source_context_count: 0,
      source_kind: "imported" as const,
      training_eligible: false,
      start_block_reason: "material_not_ready" as const,
      quality_status: "rejected" as const,
      failure_reason: "题型与题干重复，未达到质量门要求。",
      status: "rejected" as const,
      started_at: null,
      completed_at: "2026-08-05T08:06:57Z",
      created_at: "2026-08-05T08:02:41Z",
      updated_at: "2026-08-05T08:06:57Z",
    };
    render(
      <TrainingTaskQueue
        materials={[material]}
        syncedContextCount={0}
        obsidianConfigurationChecked
        obsidianConfigured={false}
        isGenerating={false}
        systemTask={{
          title: "首次独立校准",
          description: "建立基线",
          actionLabel: "开始校准",
          statusLabel: "系统推荐",
        }}
        onGenerate={vi.fn()}
        onImport={vi.fn()}
        onConfigureObsidian={vi.fn()}
        onOpenSystemTask={vi.fn()}
        onOpenMaterial={vi.fn()}
        onRetryMaterial={onRetryMaterial}
      />,
    );

    expect(screen.getByText("题型与题干重复，未达到质量门要求。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新处理" }));
    expect(onRetryMaterial).toHaveBeenCalledWith(material);
  });
});
