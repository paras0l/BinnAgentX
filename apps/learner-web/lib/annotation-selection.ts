import type { AnnotationKind } from "./contracts";

export type SelectionScale = "word" | "phrase" | "sentence" | "paragraph";
export type AnalysisSelectionScope = "word_or_phrase" | "sentence_or_paragraph";

const ENGLISH_TOKEN_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/gu;
const SENTENCE_END_PATTERN = /[.!?](?:["')\]]*)/gu;

export interface NormalizedAnnotationSelection {
  start: number;
  end: number;
  textQuote: string;
}

export interface AnnotationDisplayText {
  leadingWhitespace: string;
  annotatedText: string;
  trailingWhitespace: string;
}

export function normalizeAnnotationSelection(
  textQuote: string,
  start: number,
): NormalizedAnnotationSelection {
  const leadingWhitespaceLength = textQuote.length - textQuote.trimStart().length;
  const normalizedTextQuote = textQuote.trim();
  const normalizedStart = start + leadingWhitespaceLength;
  return {
    start: normalizedStart,
    end: normalizedStart + normalizedTextQuote.length,
    textQuote: normalizedTextQuote,
  };
}

function isEnglishWordCharacter(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z'’–-]/u.test(value);
}

export function expandAnnotationSelectionToWordBoundaries(
  paragraphText: string,
  selection: NormalizedAnnotationSelection,
): NormalizedAnnotationSelection {
  let { start, end } = selection;
  const startsInsideWord =
    /[A-Za-z]/u.test(paragraphText[start] ?? "") &&
    isEnglishWordCharacter(paragraphText[start - 1]);
  const endsInsideWord =
    /[A-Za-z]/u.test(paragraphText[end - 1] ?? "") &&
    isEnglishWordCharacter(paragraphText[end]);

  if (startsInsideWord) {
    while (start > 0 && isEnglishWordCharacter(paragraphText[start - 1])) start -= 1;
  }
  if (endsInsideWord) {
    while (end < paragraphText.length && isEnglishWordCharacter(paragraphText[end])) end += 1;
  }

  if (start === selection.start && end === selection.end) return selection;
  return {
    start,
    end,
    textQuote: paragraphText.slice(start, end),
  };
}

export function splitAnnotationDisplayText(value: string): AnnotationDisplayText {
  const normalized = normalizeAnnotationSelection(value, 0);
  return {
    leadingWhitespace: value.slice(0, normalized.start),
    annotatedText: normalized.textQuote,
    trailingWhitespace: value.slice(normalized.end),
  };
}

export function classifySelection(text: string, paragraphText = ""): SelectionScale {
  const normalized = text.trim();
  const paragraph = paragraphText.trim();
  const tokens = normalized.match(ENGLISH_TOKEN_PATTERN) ?? [];
  if (tokens.length <= 1) return "word";
  if (tokens.length <= 5 && !/[.!?;:]/u.test(normalized)) return "phrase";
  const sentenceEnds = normalized.match(SENTENCE_END_PATTERN)?.length ?? 0;
  if (
    (paragraph.length > 0 && normalized === paragraph) ||
    sentenceEnds > 1 ||
    tokens.length >= 28
  ) {
    return "paragraph";
  }
  return "sentence";
}

export function selectionScope(scale: SelectionScale): AnalysisSelectionScope {
  return scale === "word" || scale === "phrase" ? "word_or_phrase" : "sentence_or_paragraph";
}

export function recommendedAnnotationKind(scale: SelectionScale): AnnotationKind {
  return selectionScope(scale) === "word_or_phrase" ? "vocabulary" : "grammar";
}

export function defaultAnalysisQuestion(scale: SelectionScale): string {
  return selectionScope(scale) === "word_or_phrase"
    ? "请优先解释这个词或短语在当前语境中的含义、词性和常见搭配。"
    : "请优先给出当前选区的完整中文翻译，并展示句子主干、从句和修饰关系。";
}
