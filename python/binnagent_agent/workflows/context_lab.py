# ruff: noqa: RUF001
"""Pure planning boundary for one context-lab annotation analysis."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True, slots=True)
class AnnotationAnalysisPlan:
    selection_scope: Literal["word_or_phrase", "sentence_or_paragraph"]
    fallback_focus: str
    fallback_diagnosis: str
    fallback_breakdown: tuple[str, ...]
    fallback_next_check: str
    fallback_translation: str | None
    fallback_vocabulary_note: str | None
    fallback_grammar_structure: tuple[str, ...]


class ContextLabWorkflow:
    def plan_annotation_analysis(
        self,
        *,
        learner_question: str,
        selected_text: str,
        paragraph_context: str,
    ) -> AnnotationAnalysisPlan:
        scope = _selection_scope(selected_text, paragraph_context)
        fallback = _fallback(learner_question, selected_text, scope)
        return AnnotationAnalysisPlan(scope, *fallback)


def _fallback(
    learner_question: str,
    selected_text: str,
    selection_scope: str,
) -> tuple[str, str, tuple[str, ...], str, str | None, str | None, tuple[str, ...]]:
    normalized = learner_question.lower()
    quote = " ".join(selected_text.split())[:80]
    if selection_scope == "word_or_phrase" or any(
        term in normalized for term in ("词", "搭配", "意思", "word", "meaning")
    ):
        return (
            "vocabulary",
            "这是词或短语级选区，先确认当前语境义、词性和搭配，再放回原句验证。",
            (
                f"先只看选区“{quote}”，判断它在句中承担什么成分。",
                "列出你已知的常见词义，再用前后搭配排除不合语境的一项。",
                "把暂定词义放回原句，检查句意和语气是否同时通顺。",
            ),
            "你现在能否用一个更具体的中文短语替换它，并让前后句仍然连贯？",
            None,
            "先依据词性、固定搭配和上下文缩小语境义，再把候选含义放回原句验证。",
            (),
        )
    if selection_scope == "sentence_or_paragraph" or any(
        term in normalized for term in ("长句", "主干", "结构", "修饰", "从句", "grammar")
    ):
        structure = (
            "主干：先找有限谓语，再确认与它配对的主语和宾语或补语。",
            "从句：用连接词确定名词性、定语或状语从句的边界。",
            "修饰：暂时拿掉介词短语、非谓语和插入成分，再逐层放回。",
        )
        return (
            "syntax",
            "这是句子或段落级选区，应先看完整译意，再用主干、从句和修饰层级解释译意怎样形成。",
            structure,
            "去掉所有修饰后，你能否说出这句话最短的“谁做了什么”？",
            None,
            None,
            structure,
        )
    if any(term in normalized for term in ("指代", "代词", "refer", "this", "they", " it ")):
        return (
            "reference",
            "你的描述指向代词或概念指代不清，需要用语法一致和语义连贯双重验证。",
            (
                f"先定位选区“{quote}”中的指代表达。",
                "向前寻找数、性或概念范围能够匹配的候选对象。",
                "把候选对象逐一代回，排除让逻辑重复或含义断裂的解释。",
            ),
            "哪个候选对象代回后，既符合语法，又能解释作者为什么接着说下一句？",
            None,
            None,
            (),
        )
    if any(term in normalized for term in ("逻辑", "转折", "因果", "关系", "however", "because")):
        return (
            "logic",
            "你的卡点更像是没有确认这处话语与前后内容的逻辑方向。",
            (
                f"先把“{quote}”概括成一个不超过十个字的命题。",
                "寻找转折、因果、递进或举例信号，并确认信号连接的两端。",
                "比较前后两个命题：作者是在支持、限制，还是反驳前一个判断。",
            ),
            "如果删掉连接词，前后两部分最合理的关系仍然是什么？",
            None,
            None,
            (),
        )
    if any(term in normalized for term in ("背景", "语境", "context")):
        return (
            "context",
            "这处困难可能来自省略的背景或概念边界，但先用段内信息建立最低限度理解。",
            (
                f"先记录“{quote}”明确说了什么，不补充文外知识。",
                "从同段寻找定义、例子或对比，确认作者怎样限定这个概念。",
                "只在段内线索仍不足时，再列出需要补查的一个背景问题。",
            ),
            "不用外部知识时，你能从本段确定的最小结论是什么？",
            None,
            None,
            (),
        )
    return (
        "mixed",
        "你已经定位了具体选区，但卡点类型还不够明确；先从结构和上下文各做一次排查。",
        (
            f"先用自己的话复述“{quote}”目前能确定的部分。",
            "标出最不确定的一个词、一个结构或一处逻辑连接，不要同时处理整段。",
            "把这个最小卡点放回前后句，检查它改变的是字面意思还是作者论证。",
        ),
        "如果只能再问一个问题，最能推进理解的是词义、句子主干，还是前后逻辑？",
        None,
        None,
        (),
    )


def _selection_scope(
    selected_text: str,
    paragraph_context: str,
) -> Literal["word_or_phrase", "sentence_or_paragraph"]:
    normalized = selected_text.strip()
    words = re.findall(r"[A-Za-z]+(?:['’-][A-Za-z]+)*", normalized)
    is_short_phrase = len(words) <= 5 and not re.search(r"[.!?;:]", normalized)
    if len(words) <= 1 or is_short_phrase:
        return "word_or_phrase"
    if normalized == paragraph_context.strip() or len(words) >= 28:
        return "sentence_or_paragraph"
    return "sentence_or_paragraph"
