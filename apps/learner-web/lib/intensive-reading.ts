import type { AnnotationAnalysisView, TextSelection } from "./contracts";

export type SentenceComponentRole =
  | "subject"
  | "predicate"
  | "object"
  | "predicative"
  | "attributive"
  | "adverbial"
  | "complement"
  | "appositive"
  | "connector";

export type ComponentMarkStyle =
  | "single"
  | "double"
  | "wave"
  | "dotted"
  | "dashed"
  | "highlight"
  | "emphasis"
  | "box"
  | "bracket"
  | "none";

export interface IntensiveSentenceSelection extends TextSelection {
  usedParagraphFallback: boolean;
}

export interface SentenceComponentMark {
  id: string;
  role: SentenceComponentRole;
  start: number;
  end: number;
  textQuote: string;
}

export type ComponentStyleMap = Record<SentenceComponentRole, ComponentMarkStyle>;

export type IntensiveReadingPhase = "attempt" | "analyzing" | "review";

export type IntensiveFollowUpTargetKind =
  "translation_issue" | "knowledge_card" | "component_comparison" | "explanation";

export interface IntensiveFollowUpTarget {
  kind: IntensiveFollowUpTargetKind;
  label: string;
  content: string;
  suggestedQuestions: string[];
}

export interface IntensiveFollowUpThread {
  id: string;
  target: IntensiveFollowUpTarget;
  question: string;
  status: "asking" | "answered" | "failed";
  answer: string | null;
  evidenceQuotes: string[];
  nextQuestions: string[];
  error: string | null;
}

export interface IntensiveReadingSession {
  id: string;
  taskItemId: string;
  sentence: IntensiveSentenceSelection;
  paragraphNumber: number;
  phase: IntensiveReadingPhase;
  translation: string;
  marks: SentenceComponentMark[];
  styles: ComponentStyleMap;
  analysis: AnnotationAnalysisView | null;
  analysisError: string | null;
  followUps: IntensiveFollowUpThread[];
}

export type ComponentComparisonStatus =
  "matched" | "boundary_difference" | "role_difference" | "missing" | "unverified";

export interface ComponentComparisonRow {
  id: string;
  status: ComponentComparisonStatus;
  learnerMark: SentenceComponentMark | null;
  candidate: AnnotationAnalysisView["sentence_components"][number] | null;
}

export const SENTENCE_COMPONENT_LABELS: Record<SentenceComponentRole, string> = {
  subject: "主语",
  predicate: "谓语",
  object: "宾语",
  predicative: "表语",
  attributive: "定语",
  adverbial: "状语",
  complement: "补语",
  appositive: "同位语",
  connector: "从句连接词",
};

export const COMPONENT_STYLE_LABELS: Record<ComponentMarkStyle, string> = {
  single: "单下划线",
  double: "双横线",
  wave: "波浪线",
  dotted: "点线",
  dashed: "虚线",
  highlight: "浅色底纹",
  emphasis: "强调色底纹",
  box: "细框",
  bracket: "括线",
  none: "不显示线型",
};

export const DEFAULT_COMPONENT_STYLES: ComponentStyleMap = {
  subject: "single",
  predicate: "wave",
  object: "double",
  predicative: "dotted",
  attributive: "highlight",
  adverbial: "dashed",
  complement: "box",
  appositive: "bracket",
  connector: "emphasis",
};

interface SentenceRange {
  start: number;
  end: number;
}

const CLOSING_PUNCTUATION = new Set(['"', "'", "”", "’", ")", "]"]);

export function sentenceRanges(paragraph: string): SentenceRange[] {
  const ranges: SentenceRange[] = [];
  let sentenceStart = 0;
  for (let index = 0; index < paragraph.length; index += 1) {
    if (!".!?".includes(paragraph[index] ?? "")) continue;
    let sentenceEnd = index + 1;
    while (sentenceEnd < paragraph.length && CLOSING_PUNCTUATION.has(paragraph[sentenceEnd]!)) {
      sentenceEnd += 1;
    }
    const range = trimmedRange(paragraph, sentenceStart, sentenceEnd);
    if (range) ranges.push(range);
    sentenceStart = sentenceEnd;
  }
  const trailing = trimmedRange(paragraph, sentenceStart, paragraph.length);
  if (trailing) ranges.push(trailing);
  return ranges;
}

export function resolveIntensiveSentence(
  paragraphId: string,
  paragraph: string,
  selectionStart: number,
  selectionEnd: number,
): IntensiveSentenceSelection {
  const ranges = sentenceRanges(paragraph);
  const fallback = trimmedRange(paragraph, 0, paragraph.length) ?? {
    start: 0,
    end: paragraph.length,
  };
  if (ranges.length === 0) {
    return selectionFromRange(paragraphId, paragraph, fallback, true);
  }
  const center = selectionStart + (selectionEnd - selectionStart) / 2;
  let best = ranges[0]!;
  let bestOverlap = overlap(best, selectionStart, selectionEnd);
  for (const candidate of ranges.slice(1)) {
    const candidateOverlap = overlap(candidate, selectionStart, selectionEnd);
    const candidateHasCenter = candidate.start <= center && center <= candidate.end;
    const bestHasCenter = best.start <= center && center <= best.end;
    if (
      candidateOverlap > bestOverlap ||
      (candidateOverlap === bestOverlap && candidateHasCenter && !bestHasCenter)
    ) {
      best = candidate;
      bestOverlap = candidateOverlap;
    }
  }
  return selectionFromRange(paragraphId, paragraph, best, false);
}

export function componentStyleOwner(
  styles: ComponentStyleMap,
  style: ComponentMarkStyle,
  excluding: SentenceComponentRole,
): SentenceComponentRole | null {
  if (style === "none") return null;
  return (
    (Object.keys(styles) as SentenceComponentRole[]).find(
      (role) => role !== excluding && styles[role] === style,
    ) ?? null
  );
}

export function applyComponentStyle(
  styles: ComponentStyleMap,
  role: SentenceComponentRole,
  style: ComponentMarkStyle,
): ComponentStyleMap {
  const owner = componentStyleOwner(styles, style, role);
  return {
    ...styles,
    ...(owner ? { [owner]: "none" as const } : {}),
    [role]: style,
  };
}

export function addComponentMark(
  sentence: string,
  marks: SentenceComponentMark[],
  next: SentenceComponentMark,
): { marks: SentenceComponentMark[]; replaced: SentenceComponentMark[] } {
  if (
    next.start < 0 ||
    next.end <= next.start ||
    next.end > sentence.length ||
    sentence.slice(next.start, next.end) !== next.textQuote
  ) {
    throw new Error("component_mark_span_invalid");
  }
  const replaced = marks.filter((mark) => mark.start < next.end && next.start < mark.end);
  return {
    marks: [...marks.filter((mark) => !replaced.includes(mark)), next].sort(
      (left, right) => left.start - right.start || left.end - right.end,
    ),
    replaced,
  };
}

export function compareComponentMarks(
  learnerMarks: SentenceComponentMark[],
  candidates: AnnotationAnalysisView["sentence_components"],
): ComponentComparisonRow[] {
  const unusedLearnerIndexes = new Set(learnerMarks.map((_, index) => index));
  const rows: ComponentComparisonRow[] = candidates.map((candidate, candidateIndex) => {
    const available = [...unusedLearnerIndexes];
    const exactIndex = available.find((index) => {
      const mark = learnerMarks[index]!;
      return (
        mark.role === candidate.role && mark.start === candidate.start && mark.end === candidate.end
      );
    });
    const sameRoleOverlapIndex = available.find((index) => {
      const mark = learnerMarks[index]!;
      return mark.role === candidate.role && rangesOverlap(mark, candidate);
    });
    const overlapIndex = available.find((index) => rangesOverlap(learnerMarks[index]!, candidate));
    const learnerIndex = exactIndex ?? sameRoleOverlapIndex ?? overlapIndex;
    if (learnerIndex === undefined) {
      return {
        id: `candidate-${candidateIndex}`,
        status: "missing" as const,
        learnerMark: null,
        candidate,
      };
    }
    unusedLearnerIndexes.delete(learnerIndex);
    const learnerMark = learnerMarks[learnerIndex]!;
    return {
      id: `candidate-${candidateIndex}-learner-${learnerIndex}`,
      status: (exactIndex !== undefined
        ? "matched"
        : sameRoleOverlapIndex !== undefined
          ? "boundary_difference"
          : "role_difference") as ComponentComparisonStatus,
      learnerMark,
      candidate,
    };
  });
  for (const learnerIndex of unusedLearnerIndexes) {
    rows.push({
      id: `learner-${learnerIndex}`,
      status: "unverified",
      learnerMark: learnerMarks[learnerIndex]!,
      candidate: null,
    });
  }
  return rows;
}

function rangesOverlap(
  left: Pick<SentenceComponentMark, "start" | "end">,
  right: Pick<SentenceComponentMark, "start" | "end">,
): boolean {
  return left.start < right.end && right.start < left.end;
}

function trimmedRange(text: string, rawStart: number, rawEnd: number): SentenceRange | null {
  let start = rawStart;
  let end = rawEnd;
  while (start < end && /\s/u.test(text[start] ?? "")) start += 1;
  while (end > start && /\s/u.test(text[end - 1] ?? "")) end -= 1;
  return end > start ? { start, end } : null;
}

function overlap(range: SentenceRange, start: number, end: number): number {
  return Math.max(0, Math.min(range.end, end) - Math.max(range.start, start));
}

function selectionFromRange(
  paragraphId: string,
  paragraph: string,
  range: SentenceRange,
  usedParagraphFallback: boolean,
): IntensiveSentenceSelection {
  return {
    paragraphId,
    start: range.start,
    end: range.end,
    textQuote: paragraph.slice(range.start, range.end),
    usedParagraphFallback,
  };
}
