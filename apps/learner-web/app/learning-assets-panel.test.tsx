import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import type { LearningAsset } from "../lib/learning-assets-storage";
import { LearningAssetsPanel } from "./learning-assets-panel";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it("invalidates the locally selected Vault when the plugin heartbeat is stale", () => {
  localStorage.setItem("binnagent:obsidian-vault-name", "Deleted Vault");

  render(
    <LearningAssetsPanel
      state={{ schemaVersion: 2, items: [] }}
      onAdd={vi.fn()}
      onToggleStar={vi.fn()}
      onOpen={vi.fn()}
      vaultStatus={null}
      onRefreshVaultStatus={vi.fn()}
      onRefreshAssets={vi.fn()}
      onOrganizeInbox={vi.fn().mockResolvedValue(undefined)}
      pluginSyncStatus={{
        paired: true,
        connection_state: "stale",
        synced_context_count: 4,
        last_synced_at: "2026-08-05T10:00:00Z",
      }}
    />,
  );

  expect(screen.getByText("连接已失效")).toBeVisible();
  expect(screen.getByText("重新选择")).toBeVisible();
  expect(screen.queryByText("Deleted Vault")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /当前 Vault/ }));
  expect(screen.getByText("尚未选择 Vault")).toBeVisible();
  expect(screen.getByLabelText("Vault 名称")).toHaveValue("");
});

it("shows isolated raw and denoised copies side by side", async () => {
  const asset: LearningAsset = {
    assetId: "asset_compare_1",
    kind: "reading_skill",
    title: "主句承载作者判断",
    tags: [],
    sourceType: "annotation",
    sourceTitle: "A passage",
    sourceTaskId: "task_1",
    evidenceStatus: "pending_validation",
    evidenceCount: 0,
    lastVerifiedAt: null,
    nextReviewAt: "2026-07-29T00:00:00Z",
    starred: false,
    syncStatus: "pending_export",
    syncErrorCode: null,
    documentUri: null,
    documentUpdatedAt: null,
    createdAt: "2026-07-29T00:00:00Z",
    updatedAt: "2026-07-29T00:00:00Z",
    version: 1,
  };
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      asset_id: asset.assetId,
      status: "ready",
      raw_content: "原始内容\n训练中主动记录的思考笔记。",
      denoised_content: "原始内容",
      decision: "KEEP",
      reason_codes: ["empty_or_ui_boilerplate_removed"],
      retained_segment_ids: ["learner"],
      removed_segment_ids: ["ui-note"],
      before_character_count: 20,
      after_character_count: 4,
      reduction_ratio: 0.8,
      projected_at: "2026-07-29T00:01:00Z",
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  render(
    <LearningAssetsPanel
      state={{ schemaVersion: 2, items: [asset] }}
      onAdd={vi.fn()}
      onToggleStar={vi.fn()}
      onOpen={vi.fn()}
      vaultStatus={null}
      onRefreshVaultStatus={vi.fn()}
      onRefreshAssets={vi.fn()}
      onOrganizeInbox={vi.fn().mockResolvedValue(undefined)}
      pluginSyncStatus={null}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "对照去噪" }));

  const dialog = await screen.findByRole("dialog", { name: "主句承载作者判断" });
  expect(within(dialog).getByText("去噪前 · 隔离副本")).toBeInTheDocument();
  expect(within(dialog).getByText("去噪后 · 导出投影")).toBeInTheDocument();
  expect(within(dialog).getByText(/移除 ui-note/)).toBeInTheDocument();
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learner/v1/assets/asset_compare_1/denoise-comparison",
      expect.any(Object),
    ),
  );
});
