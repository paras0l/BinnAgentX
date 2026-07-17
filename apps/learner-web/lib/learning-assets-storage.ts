const LEARNING_ASSETS_PREFIX = "binnagent:learning-assets:v1:";

export type LearningAssetKind =
  | "vocabulary"
  | "grammar"
  | "writing_expression"
  | "reading_skill"
  | "exam_skill"
  | "writing_skill";

export interface LearningAsset {
  assetId: string;
  kind: LearningAssetKind;
  title: string;
  content: string;
  note: string;
  sourceTitle: string;
  createdAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
  mastery: number;
  starred: boolean;
}

export interface LearningAssetsState {
  schemaVersion: 1;
  items: LearningAsset[];
}

export interface LearningAssetInput {
  kind: LearningAssetKind;
  title: string;
  content: string;
  note?: string;
  sourceTitle?: string;
}

const EMPTY_STATE: LearningAssetsState = { schemaVersion: 1, items: [] };
const KINDS = new Set<LearningAssetKind>([
  "vocabulary",
  "grammar",
  "writing_expression",
  "reading_skill",
  "exam_skill",
  "writing_skill",
]);

function keyFor(learnerId: string): string {
  return `${LEARNING_ASSETS_PREFIX}${learnerId}`;
}

function isAsset(value: unknown): value is LearningAsset {
  if (!value || typeof value !== "object") return false;
  const asset = value as Partial<LearningAsset>;
  return (
    typeof asset.assetId === "string" &&
    KINDS.has(asset.kind as LearningAssetKind) &&
    typeof asset.title === "string" &&
    typeof asset.content === "string" &&
    typeof asset.note === "string" &&
    typeof asset.sourceTitle === "string" &&
    typeof asset.createdAt === "string" &&
    (asset.lastReviewedAt === null || typeof asset.lastReviewedAt === "string") &&
    typeof asset.reviewCount === "number" &&
    typeof asset.mastery === "number" &&
    typeof asset.starred === "boolean"
  );
}

function persist(learnerId: string, state: LearningAssetsState): LearningAssetsState {
  try {
    localStorage.setItem(keyFor(learnerId), JSON.stringify(state));
  } catch {
    // The page keeps working in memory when browser storage is unavailable.
  }
  return state;
}

function createAssetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `asset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function loadLearningAssets(learnerId: string): LearningAssetsState {
  try {
    const raw = localStorage.getItem(keyFor(learnerId));
    if (!raw) return EMPTY_STATE;
    const value = JSON.parse(raw) as Partial<LearningAssetsState>;
    if (value.schemaVersion !== 1 || !Array.isArray(value.items)) return EMPTY_STATE;
    return { schemaVersion: 1, items: value.items.filter(isAsset) };
  } catch {
    return EMPTY_STATE;
  }
}

export function addLearningAsset(
  learnerId: string,
  current: LearningAssetsState,
  input: LearningAssetInput,
): LearningAssetsState {
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) return current;
  const sourceTitle = input.sourceTitle?.trim() ?? "";
  const duplicateIndex = current.items.findIndex(
    (item) =>
      item.kind === input.kind &&
      item.title.toLocaleLowerCase() === title.toLocaleLowerCase() &&
      item.sourceTitle.toLocaleLowerCase() === sourceTitle.toLocaleLowerCase(),
  );
  if (duplicateIndex >= 0) {
    const items = current.items.map((item, index) =>
      index === duplicateIndex
        ? {
            ...item,
            content,
            note: input.note?.trim() || item.note,
            mastery: Math.min(100, item.mastery + 5),
          }
        : item,
    );
    return persist(learnerId, { schemaVersion: 1, items });
  }
  const now = new Date().toISOString();
  const asset: LearningAsset = {
    assetId: createAssetId(),
    kind: input.kind,
    title,
    content,
    note: input.note?.trim() ?? "",
    sourceTitle,
    createdAt: now,
    lastReviewedAt: null,
    reviewCount: 0,
    mastery: 10,
    starred: false,
  };
  return persist(learnerId, { schemaVersion: 1, items: [asset, ...current.items] });
}

export function reviewLearningAsset(
  learnerId: string,
  current: LearningAssetsState,
  assetId: string,
): LearningAssetsState {
  const items = current.items.map((item) =>
    item.assetId === assetId
      ? {
          ...item,
          reviewCount: item.reviewCount + 1,
          lastReviewedAt: new Date().toISOString(),
          mastery: Math.min(100, item.mastery + 15),
        }
      : item,
  );
  return persist(learnerId, { schemaVersion: 1, items });
}

export function toggleLearningAssetStar(
  learnerId: string,
  current: LearningAssetsState,
  assetId: string,
): LearningAssetsState {
  const items = current.items.map((item) =>
    item.assetId === assetId ? { ...item, starred: !item.starred } : item,
  );
  return persist(learnerId, { schemaVersion: 1, items });
}

export function setLearningAssetMastery(
  learnerId: string,
  current: LearningAssetsState,
  assetId: string,
  mastery: number,
): LearningAssetsState {
  const safeMastery = Math.max(0, Math.min(100, Math.round(mastery)));
  const items = current.items.map((item) =>
    item.assetId === assetId ? { ...item, mastery: safeMastery } : item,
  );
  return persist(learnerId, { schemaVersion: 1, items });
}
