const SPACE_SEGMENT = /^\s+$/u;
const LINE_PENALTY = 10;
const FITNESS_DEMERIT = 100;
const MAX_SHRINK_RATIO = -0.55;
const DEFAULT_MAX_STRETCH_RATIO = 2.5;
const RELAXED_MAX_STRETCH_RATIO = 6;
const MAX_RENDERED_ADJUSTMENT_RATIO = 0.8;

export interface PretextParagraphMetrics {
  segments: readonly string[];
  widths: readonly number[];
}

export interface KnuthPlassLine {
  start: number;
  end: number;
  wordSpacing: number;
  adjustmentRatio: number;
  naturalWidth: number;
  isLast: boolean;
}

interface BreakCandidate {
  segmentIndex: number;
  offset: number;
  isEnd: boolean;
}

interface LineMetrics {
  naturalWidth: number;
  spaceCount: number;
}

interface LayoutState {
  demerits: number;
  previousCandidate: number;
  previousFitness: number;
  line: KnuthPlassLine;
}

function fitnessClass(ratio: number): number {
  if (ratio < -0.25) return 0;
  if (ratio <= 0.5) return 1;
  if (ratio <= 1) return 2;
  return 3;
}

function buildCandidates(text: string, segments: readonly string[]): BreakCandidate[] | null {
  if (segments.join("") !== text) return null;

  const candidates: BreakCandidate[] = [{ segmentIndex: 0, offset: 0, isEnd: false }];
  let offset = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    offset += segment.length;
    if (SPACE_SEGMENT.test(segment) && offset < text.length) {
      candidates.push({ segmentIndex: index + 1, offset, isEnd: false });
    }
  }
  candidates.push({ segmentIndex: segments.length, offset: text.length, isEnd: true });
  return candidates;
}

function solveLayout(
  text: string,
  metrics: PretextParagraphMetrics,
  maxWidth: number,
  candidates: readonly BreakCandidate[],
  maxStretchRatio: number,
  allowEmergencyLines: boolean,
): KnuthPlassLine[] | null {
  const { segments, widths } = metrics;
  const prefixWidths = new Array<number>(segments.length + 1).fill(0);
  const prefixSpaces = new Array<number>(segments.length + 1).fill(0);
  let totalSpaceWidth = 0;
  let totalSpaces = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const width = widths[index] ?? 0;
    const isSpace = SPACE_SEGMENT.test(segments[index] ?? "");
    prefixWidths[index + 1] = (prefixWidths[index] ?? 0) + width;
    prefixSpaces[index + 1] = (prefixSpaces[index] ?? 0) + (isSpace ? 1 : 0);
    if (isSpace) {
      totalSpaceWidth += width;
      totalSpaces += 1;
    }
  }

  const normalSpaceWidth = totalSpaces > 0 ? totalSpaceWidth / totalSpaces : 0;
  const states = Array.from({ length: candidates.length }, () =>
    new Array<LayoutState | null>(4).fill(null),
  );
  states[0]![1] = {
    demerits: 0,
    previousCandidate: -1,
    previousFitness: -1,
    line: {
      start: 0,
      end: 0,
      wordSpacing: 0,
      adjustmentRatio: 0,
      naturalWidth: 0,
      isLast: false,
    },
  };

  const measureLine = (fromCandidate: number, toCandidate: number): LineMetrics => {
    const from = candidates[fromCandidate]!.segmentIndex;
    const to = candidates[toCandidate]!.segmentIndex;
    const effectiveEnd =
      to > from && SPACE_SEGMENT.test(segments[to - 1] ?? "") ? to - 1 : to;
    return {
      naturalWidth:
        (prefixWidths[effectiveEnd] ?? 0) - (prefixWidths[from] ?? 0),
      spaceCount:
        (prefixSpaces[effectiveEnd] ?? 0) - (prefixSpaces[from] ?? 0),
    };
  };

  for (let toCandidate = 1; toCandidate < candidates.length; toCandidate += 1) {
    const isLast = candidates[toCandidate]!.isEnd;

    for (let fromCandidate = 0; fromCandidate < toCandidate; fromCandidate += 1) {
      if (states[fromCandidate]!.every((state) => state === null)) continue;

      const lineMetrics = measureLine(fromCandidate, toCandidate);
      if (lineMetrics.naturalWidth > maxWidth + 0.5) continue;

      const adjustment = maxWidth - lineMetrics.naturalWidth;
      let ratio = 0;
      let badness = 0;
      let wordSpacing = 0;

      if (isLast) {
        const raggedRatio = maxWidth > 0 ? adjustment / maxWidth : 0;
        badness = Math.min(30, raggedRatio * raggedRatio * 30);
      } else if (lineMetrics.spaceCount > 0 && normalSpaceWidth > 0) {
        ratio = adjustment / (lineMetrics.spaceCount * normalSpaceWidth);
        if (ratio < MAX_SHRINK_RATIO || ratio > maxStretchRatio) continue;
        badness = Math.min(10_000, 100 * Math.abs(ratio) ** 3);
        // Keep loose emergency lines ragged instead of stretching them into
        // distracting typographic rivers. They remain valid DP candidates.
        wordSpacing =
          ratio <= MAX_RENDERED_ADJUSTMENT_RATIO
            ? adjustment / lineMetrics.spaceCount
            : 0;
      } else {
        if (!allowEmergencyLines) continue;
        // A non-final line without glue cannot be justified. Keep it as an
        // emergency candidate for long words, but make normal alternatives win.
        badness = 10_000;
      }

      const nextFitness = isLast ? 1 : fitnessClass(ratio);
      const lineDemerits = (LINE_PENALTY + badness) ** 2;

      for (let previousFitness = 0; previousFitness < 4; previousFitness += 1) {
        const previousState = states[fromCandidate]![previousFitness];
        if (!previousState) continue;
        const fitnessDemerits =
          Math.abs(previousFitness - nextFitness) > 1 ? FITNESS_DEMERIT : 0;
        const demerits = previousState.demerits + lineDemerits + fitnessDemerits;
        const current = states[toCandidate]![nextFitness];
        if (current && current.demerits <= demerits) continue;

        states[toCandidate]![nextFitness] = {
          demerits,
          previousCandidate: fromCandidate,
          previousFitness,
          line: {
            start: candidates[fromCandidate]!.offset,
            end: candidates[toCandidate]!.offset,
            wordSpacing,
            adjustmentRatio: ratio,
            naturalWidth: lineMetrics.naturalWidth,
            isLast,
          },
        };
      }
    }
  }

  const lastCandidate = candidates.length - 1;
  let bestFitness = -1;
  let bestState: LayoutState | null = null;
  for (let fitness = 0; fitness < 4; fitness += 1) {
    const state = states[lastCandidate]![fitness];
    if (state && (!bestState || state.demerits < bestState.demerits)) {
      bestState = state;
      bestFitness = fitness;
    }
  }
  if (!bestState) return null;

  const lines: KnuthPlassLine[] = [];
  let candidateIndex = lastCandidate;
  let fitness = bestFitness;
  while (candidateIndex > 0) {
    const state = states[candidateIndex]![fitness];
    if (!state) return null;
    lines.push(state.line);
    candidateIndex = state.previousCandidate;
    fitness = state.previousFitness;
  }
  lines.reverse();

  if (
    lines.length === 0 ||
    lines[0]!.start !== 0 ||
    lines[lines.length - 1]!.end !== text.length
  ) {
    return null;
  }
  return lines;
}

export function layoutKnuthPlassParagraph(
  text: string,
  metrics: PretextParagraphMetrics,
  maxWidth: number,
): KnuthPlassLine[] | null {
  if (
    text.length === 0 ||
    metrics.segments.length === 0 ||
    metrics.segments.length !== metrics.widths.length ||
    !Number.isFinite(maxWidth) ||
    maxWidth <= 0
  ) {
    return null;
  }

  const candidates = buildCandidates(text, metrics.segments);
  if (!candidates) return null;

  return (
    solveLayout(text, metrics, maxWidth, candidates, DEFAULT_MAX_STRETCH_RATIO, false) ??
    solveLayout(text, metrics, maxWidth, candidates, RELAXED_MAX_STRETCH_RATIO, true)
  );
}
