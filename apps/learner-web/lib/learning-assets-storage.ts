export type LearningAssetKind =
  | "vocabulary"
  | "grammar"
  | "writing_expression"
  | "reading_skill"
  | "exam_skill"
  | "writing_skill";

export type EvidenceStatus =
  | "pending_validation"
  | "developing"
  | "hinted_usable"
  | "independently_usable"
  | "awaiting_delayed_validation"
  | "delayed_stable"
  | "evidence_conflict";

export type AssetSyncStatus = "pending_export" | "synced" | "conflict" | "missing" | "error";

/** Metadata returned by the BinnAgent index. Note bodies remain in Obsidian. */
export interface LearningAsset {
  assetId: string;
  kind: LearningAssetKind;
  title: string;
  tags: string[];
  sourceType: string;
  sourceTitle: string | null;
  sourceTaskId: string | null;
  evidenceStatus: EvidenceStatus;
  evidenceCount: number;
  lastVerifiedAt: string | null;
  nextReviewAt: string | null;
  starred: boolean;
  syncStatus: AssetSyncStatus;
  syncErrorCode: string | null;
  documentUri: string | null;
  documentUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface LearningAssetsState {
  schemaVersion: 2;
  items: LearningAsset[];
}

/**
 * `content` and `note` are transient compatibility inputs from existing
 * learning surfaces. They are deliberately ignored by the browser index and
 * are never persisted to localStorage. They are sent only once to the vault
 * bridge while creating a note, never stored in the metadata index.
 */
export interface LearningAssetInput {
  kind: LearningAssetKind;
  title: string;
  tags?: string[];
  sourceType?: string;
  sourceTitle?: string;
  sourceTaskId?: string;
  content?: string;
  note?: string;
}

export const EMPTY_LEARNING_ASSETS: LearningAssetsState = { schemaVersion: 2, items: [] };
