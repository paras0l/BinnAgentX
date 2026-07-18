import type { AnnotationView, ReadingMaterialView } from "./contracts";

export interface ContextMatch {
  paragraphId: string;
  reason: string;
  score: number;
}

const CONCEPT_PATTERNS: Array<{ triggers: RegExp; text: RegExp; label: string }> = [
  {
    triggers: /定语从句|relative clause|修饰关系/iu,
    text: /\b(?:which|that|who|whom|whose|where)\b/iu,
    label: "可能包含定语从句或关系词",
  },
  {
    triggers: /转折|让步|contrast|concession/iu,
    text: /\b(?:but|however|although|though|while|yet|nevertheless)\b/iu,
    label: "包含转折或让步信号",
  },
  {
    triggers: /因果|原因|结果|cause|effect|result/iu,
    text: /\b(?:because|since|therefore|thus|consequently|result|lead|cause)\b/iu,
    label: "包含因果或结果信号",
  },
  {
    triggers: /观点|主张|claim|态度/iu,
    text: /\b(?:argue|suggest|believe|claim|view|should|must)\b/iu,
    label: "可能包含观点或态度表达",
  },
];

const QUERY_WORD = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;

export function locateContextMatches(
  query: string,
  material: ReadingMaterialView,
  annotations: AnnotationView[],
): ContextMatch[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];
  const tokens = (normalized.match(QUERY_WORD) ?? []).filter((token) => token.length > 1);
  const conceptPatterns = CONCEPT_PATTERNS.filter((pattern) => pattern.triggers.test(normalized));

  const matches = material.paragraphs.flatMap((paragraph) => {
    const text = paragraph.text.toLocaleLowerCase();
    let score = 0;
    const reasons: string[] = [];
    if (text.includes(normalized)) {
      score += 10;
      reasons.push("包含完整查询");
    }
    const tokenHits = tokens.filter((token) => text.includes(token));
    if (tokenHits.length > 0) {
      score += tokenHits.length * 2;
      reasons.push(`命中关键词：${tokenHits.slice(0, 3).join("、")}`);
    }
    for (const pattern of conceptPatterns) {
      if (pattern.text.test(paragraph.text)) {
        score += 4;
        reasons.push(pattern.label);
      }
    }
    const annotationHits = annotations.filter(
      (annotation) =>
        annotation.span.paragraph_id === paragraph.paragraph_id &&
        (annotation.user_explanation.toLocaleLowerCase().includes(normalized) ||
          tokens.some((token) => annotation.user_explanation.toLocaleLowerCase().includes(token))),
    );
    if (annotationHits.length > 0) {
      score += annotationHits.length * 3;
      reasons.push("与你保存过的标注解释相关");
    }
    return score > 0
      ? [{ paragraphId: paragraph.paragraph_id, reason: reasons.join("；"), score }]
      : [];
  });
  return matches.sort((left, right) => right.score - left.score);
}
