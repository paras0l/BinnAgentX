import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AnnotationAnalysisView } from "../lib/contracts";
import { DEFAULT_COMPONENT_STYLES, type IntensiveReadingSession } from "../lib/intensive-reading";
import { IntensiveReadingPane, IntensiveTemporaryTaskBody } from "./intensive-reading-pane";

function session(overrides: Partial<IntensiveReadingSession> = {}): IntensiveReadingSession {
  return {
    id: "intensive-reading:task:p1:0:32",
    taskItemId: "temporary-1",
    sentence: {
      paragraphId: "p1",
      start: 0,
      end: 32,
      textQuote: "Readers examine evidence carefully.",
      usedParagraphFallback: false,
    },
    paragraphNumber: 1,
    phase: "attempt",
    translation: "",
    marks: [],
    styles: { ...DEFAULT_COMPONENT_STYLES },
    analysis: null,
    analysisError: null,
    followUps: [],
    ...overrides,
  };
}

function analysis(): AnnotationAnalysisView {
  return {
    analysis_id: "analysis_1",
    analysis_status: "review_required",
    confidence: 0.8,
    provider_ref: "model:test",
    focus: "syntax",
    selection_scope: "sentence_or_paragraph",
    translation: "读者仔细审查证据。",
    vocabulary_note: null,
    learning_count: null,
    grammar_structure: [],
    sentence_components: [],
    grammar_points: [{ text_quote: "examine", explanation: "本句的谓语动词。" }],
    collocations: [],
    familiar_word_senses: [],
    diagnosis: "核对主干。",
    breakdown: ["找到谓语。"],
    next_check: "检查动作由谁发出。",
    source: "model",
    reason_code: "validated",
    boundary_note: "候选分析。",
  };
}

describe("intensive reading teaching gates", () => {
  it("lets translation and marking progress independently while gating recognition on both", () => {
    const { rerender } = render(
      <IntensiveTemporaryTaskBody
        session={session({ translation: "读者仔细审查证据。" })}
        onTranslationChange={vi.fn()}
        onAnalyze={vi.fn()}
        onFollowUp={vi.fn()}
      />,
    );

    expect(screen.queryByText("相关语法")).toBeNull();
    expect(screen.getByRole("button", { name: "查看识别内容" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "回到左侧整句精读" })).toBeNull();

    rerender(
      <IntensiveTemporaryTaskBody
        session={session({
          translation: "读者仔细审查证据。",
          marks: [{ id: "m1", role: "subject", start: 0, end: 7, textQuote: "Readers" }],
        })}
        onTranslationChange={vi.fn()}
        onAnalyze={vi.fn()}
        onFollowUp={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "查看识别内容" })).toBeEnabled();
  });

  it("renders only non-empty relevant recognition categories in review", () => {
    render(
      <IntensiveReadingPane
        session={session({
          phase: "review",
          translation: "读者仔细审查证据。",
          analysis: analysis(),
        })}
        reducedMotion={false}
        onExit={vi.fn()}
        onMarksChange={vi.fn()}
        onStylesChange={vi.fn()}
        onFollowUp={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "相关语法" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "固定 / 常用搭配" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "熟词生义" })).toBeNull();
  });

  it("explains the public degradation reason when no anchored item is reliable", () => {
    render(
      <IntensiveReadingPane
        session={session({
          phase: "review",
          translation: "读者仔细审查证据。",
          analysis: { ...analysis(), grammar_points: [], source: "local_fallback" },
        })}
        reducedMotion={false}
        onExit={vi.fn()}
        onMarksChange={vi.fn()}
        onStylesChange={vi.fn()}
        onFollowUp={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("查看降级原因"));
    expect(screen.getByText("本地保守降级")).toBeVisible();
    expect(screen.getByText("validated")).toBeVisible();
    expect(screen.getByText("候选分析。")).toBeVisible();
  });

  it("lets a stored fallback result call the intensive Agent again", () => {
    const onAnalyze = vi.fn();
    render(
      <IntensiveTemporaryTaskBody
        session={session({
          phase: "review",
          translation: "读者仔细审查证据。",
          marks: [{ id: "m1", role: "subject", start: 0, end: 7, textQuote: "Readers" }],
          analysis: { ...analysis(), source: "local_fallback" },
        })}
        onTranslationChange={vi.fn()}
        onAnalyze={onAnalyze}
        onFollowUp={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "重新调用精读 Agent" }));
    expect(onAnalyze).toHaveBeenCalledOnce();
  });

  it("shows translation review, knowledge cards and component comparison as follow-up entries", () => {
    const onFollowUp = vi.fn();
    const enrichedSession = session({
      phase: "review",
      translation: "读者仔细审查证据。",
      marks: [{ id: "m1", role: "subject", start: 0, end: 7, textQuote: "Readers" }],
      analysis: {
        ...analysis(),
        translation_review: {
          summary: "主干基本准确，但要保留 carefully 的方式含义。",
          strengths: ["已经找到了动作发出者。"],
          issues: [
            {
              kind: "omission",
              source_quote: "carefully",
              learner_excerpt: null,
              explanation: "译文遗漏了动作方式。",
              suggestion: "补出“仔细地”。",
            },
          ],
        },
        knowledge_cards: [
          {
            category: "grammar",
            title: "方式状语",
            source_quote: "carefully",
            rule: "副词可以修饰动作发生的方式。",
            explanation: "carefully 修饰 examine。",
            check_question: "carefully 回答了动作的哪个问题？",
          },
        ],
        sentence_components: [
          {
            role: "subject",
            start: 0,
            end: 7,
            text_quote: "Readers",
            explanation: "动作发出者。",
          },
        ],
      },
    });
    const { getByTestId } = render(
      <>
        <div data-testid="left-intensive-pane">
          <IntensiveReadingPane
            session={enrichedSession}
            reducedMotion={false}
            onExit={vi.fn()}
            onMarksChange={vi.fn()}
            onStylesChange={vi.fn()}
            onFollowUp={onFollowUp}
          />
        </div>
        <div data-testid="right-temporary-task">
          <IntensiveTemporaryTaskBody
            session={enrichedSession}
            onTranslationChange={vi.fn()}
            onAnalyze={vi.fn()}
            onFollowUp={onFollowUp}
          />
        </div>
      </>,
    );

    const left = within(getByTestId("left-intensive-pane"));
    const right = within(getByTestId("right-temporary-task"));
    expect(right.getByRole("heading", { name: "翻译诊断" })).toBeVisible();
    expect(right.queryByText("你的翻译")).toBeNull();
    expect(right.getByText("候选译法")).toBeVisible();
    expect(right.queryByRole("heading", { name: "知识卡片" })).toBeNull();
    expect(right.queryByRole("group", { name: "句子成分参考划分" })).toBeNull();
    expect(left.getByRole("heading", { name: "知识卡片" })).toBeVisible();
    const componentReference = left.getByRole("group", {
      name: "句子成分参考划分",
    });
    expect(componentReference).toBeVisible();
    expect(componentReference.closest(".intensive-sentence-stage")).not.toBeNull();
    expect(left.queryByText("我的标记")).toBeNull();
    fireEvent.click(left.getByRole("button", { name: /主语：Readers，点击追问/ }));
    expect(onFollowUp).not.toHaveBeenCalled();
    expect(left.getByLabelText("围绕这处继续问")).toBeVisible();
    fireEvent.click(left.getByRole("button", { name: /方式状语/ }));
    fireEvent.change(left.getByLabelText("围绕这处继续问"), {
      target: { value: "它为什么修饰 examine？" },
    });
    fireEvent.click(left.getByRole("button", { name: "发送追问" }));
    expect(onFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "knowledge_card", label: "方式状语" }),
      "它为什么修饰 examine？",
    );
  });
});

describe("intensive reading component display configuration", () => {
  it("asks before reassigning an occupied visual style", () => {
    const onStylesChange = vi.fn();
    const { container } = render(
      <IntensiveReadingPane
        session={session({ phase: "attempt", translation: "读者仔细审查证据。" })}
        reducedMotion={false}
        onExit={vi.fn()}
        onMarksChange={vi.fn()}
        onStylesChange={onStylesChange}
        onFollowUp={vi.fn()}
      />,
    );

    const pane = within(container);
    const settingsButton = pane.getByRole("button", { name: "标记显示设置" });
    expect(settingsButton.closest("header")).toBeInTheDocument();
    fireEvent.click(settingsButton);
    expect(screen.getByRole("dialog", { name: "标记显示设置" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "主语标记样式" }));
    fireEvent.click(screen.getByRole("option", { name: "双横线" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("双横线当前用于宾语");
    fireEvent.click(screen.getByRole("button", { name: "确认替换" }));
    expect(onStylesChange).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "double", object: "none" }),
    );
  });
});
