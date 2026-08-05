import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AnnotationView } from "../lib/contracts";
import { SavedAnnotations } from "./learning-workspace";

describe("SavedAnnotations", () => {
  it("expands one saved annotation to show the Agent explanation", () => {
    const annotation: AnnotationView = {
      annotation_id: "annotation_saved_0001",
      kind: "vocabulary",
      span: {
        paragraph_id: "personalized_p_1",
        start: 0,
        end: 8,
        text_quote: "Everyone",
      },
      user_explanation: "我不确定这里是不是泛指。",
      analysis: {
        analysis_id: "annotation_analysis_saved_0001",
        analysis_status: "review_required",
        confidence: null,
        provider_ref: "model:deepseek:v2",
        focus: "vocabulary",
        selection_scope: "word_or_phrase",
        translation: null,
        vocabulary_note: "Everyone 在这里泛指所有处于类似情境的人。",
        learning_count: null,
        grammar_structure: [],
        sentence_components: [],
        grammar_points: [],
        collocations: [],
        familiar_word_senses: [],
        translation_review: null,
        knowledge_cards: [],
        follow_up_answer: null,
        diagnosis: "这里需要结合上下文判断 Everyone 的指代范围。",
        breakdown: ["先确认代词范围。", "再放回前一句验证。"],
        next_check: "它是否指向前文提到的同类学习者？",
        source: "model",
        reason_code: "annotation_analysis_model_validated",
        boundary_note: "该解释仍需结合原句复核。",
      },
      created_at: "2026-08-05T12:00:00Z",
    };

    render(<SavedAnnotations annotations={[annotation]} expanded onToggle={vi.fn()} />);

    expect(screen.queryByLabelText("Agent 具体解释")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /生词.*Everyone/ }));
    expect(screen.getByLabelText("Agent 具体解释")).toBeVisible();
    expect(screen.getByText("Everyone 在这里泛指所有处于类似情境的人。")).toBeVisible();
    expect(screen.getByText(/这里需要结合上下文判断/)).toBeVisible();
  });
});
