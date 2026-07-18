import type { LearningAsset } from "./learning-assets-storage";

const EXPRESSION_LAB_PREFIX = "binnagent:expression-lab:v1:";
const MAX_BOARD_NOTES = 40;

export type ExpressionNoteKind = "claim" | "example" | "expression";
export type ExpressionAssistFocus = "idea" | "example" | "wording" | "structure";

export interface ExpressionBoardNote {
  id: string;
  kind: ExpressionNoteKind;
  text: string;
  x: number;
  y: number;
  createdAt: string;
}

export interface ExpressionLabState {
  schemaVersion: 1;
  taskId: string;
  contentVersionId: string;
  notes: ExpressionBoardNote[];
  updatedAt: string;
}

export interface ExpressionAssistSuggestion {
  id: string;
  source: "recent_asset" | "expansion";
  title: string;
  detail: string;
  assetId?: string;
}

const NOTE_KINDS = new Set<ExpressionNoteKind>(["claim", "example", "expression"]);

function keyFor(taskId: string, contentVersionId: string): string {
  return `${EXPRESSION_LAB_PREFIX}${taskId}:${contentVersionId}`;
}

function isBoardNote(value: unknown): value is ExpressionBoardNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<ExpressionBoardNote>;
  return (
    typeof note.id === "string" &&
    NOTE_KINDS.has(note.kind as ExpressionNoteKind) &&
    typeof note.text === "string" &&
    typeof note.x === "number" &&
    Number.isFinite(note.x) &&
    typeof note.y === "number" &&
    Number.isFinite(note.y) &&
    typeof note.createdAt === "string"
  );
}

function emptyState(taskId: string, contentVersionId: string): ExpressionLabState {
  return {
    schemaVersion: 1,
    taskId,
    contentVersionId,
    notes: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function loadExpressionLab(taskId: string, contentVersionId: string): ExpressionLabState {
  try {
    const raw = localStorage.getItem(keyFor(taskId, contentVersionId));
    if (!raw) return emptyState(taskId, contentVersionId);
    const value = JSON.parse(raw) as Partial<ExpressionLabState>;
    if (
      value.schemaVersion !== 1 ||
      value.taskId !== taskId ||
      value.contentVersionId !== contentVersionId ||
      !Array.isArray(value.notes)
    ) {
      return emptyState(taskId, contentVersionId);
    }
    return {
      schemaVersion: 1,
      taskId,
      contentVersionId,
      notes: value.notes.filter(isBoardNote).slice(0, MAX_BOARD_NOTES),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return emptyState(taskId, contentVersionId);
  }
}

export function saveExpressionLab(state: ExpressionLabState): ExpressionLabState {
  const safeState: ExpressionLabState = {
    ...state,
    notes: state.notes.filter(isBoardNote).slice(0, MAX_BOARD_NOTES),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(keyFor(state.taskId, state.contentVersionId), JSON.stringify(safeState));
  } catch {
    // The current page keeps the board usable when browser storage is unavailable.
  }
  return safeState;
}

export function createExpressionNote(kind: ExpressionNoteKind, index: number): ExpressionBoardNote {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `note_${Date.now()}_${index}`;
  return {
    id,
    kind,
    text: "",
    x: 28 + column * 228,
    y: 28 + row * 172,
    createdAt: new Date().toISOString(),
  };
}

const FOCUS_COPY: Record<ExpressionAssistFocus, { recent: string; expansion: string }> = {
  idea: {
    recent: "它能支持或限制你现在的核心立场吗？先写一句自己的判断。",
    expansion: "试着加入一个反例或适用条件，让观点不止停在口号。",
  },
  example: {
    recent: "把它放进一个具体的人、时间和结果中，写成可验证的小场景。",
    expansion: "换一个与你熟悉场景不同的对象，检查论点是否仍然成立。",
  },
  wording: {
    recent: "先借用其中的结构或搭配，再换回你自己的观点与名词。",
    expansion: "尝试用让步、限制或因果结构升级表达，但不要整句照搬。",
  },
  structure: {
    recent: "把它放在“观点—依据—限制—建议”中的一个明确位置。",
    expansion: "试试“先承认价值，再划定边界，最后给出顺序”的推进方式。",
  },
};

export function buildExpressionAssistSuggestions(
  focus: ExpressionAssistFocus,
  assets: LearningAsset[],
): ExpressionAssistSuggestion[] {
  const recentAssets = assets
    .filter((asset) => asset.content.trim())
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 2);
  const suggestions: ExpressionAssistSuggestion[] = recentAssets.map((asset) => ({
    id: `asset_${asset.assetId}`,
    source: "recent_asset" as const,
    title: asset.title,
    detail: `${asset.content.slice(0, 96)}${asset.content.length > 96 ? "…" : ""}\n${FOCUS_COPY[focus].recent}`,
    assetId: asset.assetId,
  }));
  suggestions.push({
    id: `expansion_${focus}`,
    source: "expansion",
    title: "向外多走一步",
    detail: FOCUS_COPY[focus].expansion,
  });
  return suggestions;
}
