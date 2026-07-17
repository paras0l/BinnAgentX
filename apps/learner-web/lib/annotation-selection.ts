import type { AnnotationKind } from "./contracts";

export type SelectionScale = "word" | "phrase" | "sentence" | "paragraph";
export type AnalysisSelectionScope = "word_or_phrase" | "sentence_or_paragraph";

const ENGLISH_TOKEN_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/gu;
const SENTENCE_END_PATTERN = /[.!?](?:["')\]]*)/gu;

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
