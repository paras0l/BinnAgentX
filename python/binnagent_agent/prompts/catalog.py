# ruff: noqa: RUF001

"""Reviewed BinnAgentX Prompt fallbacks used before database configuration exists."""

from binnagent_agent.prompts.registry import PromptDefinition, PromptRegistry

DEFAULT_PROMPT_REGISTRY = PromptRegistry(
    (
        PromptDefinition(
            prompt_id="personalized_reading.generate",
            prompt_version="v1",
            owner="learning_content",
            purpose="根据学习者长期记忆生成个性化英语阅读。",
            template_text=(
                "你是 BinnAgentX 个性化阅读生成器。围绕 {{contexts}} 创作全新的考研英语阅读，"
                "自然迁移学习者需要巩固的知识，不复制记忆原句，只输出 {{output_schema}}。"
            ),
            variables=("contexts", "output_schema"),
            model_policy={"temperature": 0.45, "max_tokens": 1800},
        ),
        PromptDefinition(
            prompt_id="reading.selection_analysis",
            prompt_version="v2",
            owner="reading_lab",
            purpose="结合长期记忆诊断学习者选中的阅读卡点，不代做题目。",
            template_text=(
                "分析 {{selected_span}} 在 {{paragraph_context}} 中的语境义与结构。"
                "学习者问题为 {{learner_question}}，长期记忆见独立用户消息。"
                "不得泄露答案，只输出 {{output_schema}}。"
            ),
            variables=(
                "selected_span",
                "paragraph_context",
                "learner_question",
                "output_schema",
            ),
            model_policy={"temperature": 0.1, "max_tokens": 1200},
        ),
        PromptDefinition(
            prompt_id="expression.priority_feedback",
            prompt_version="v2",
            owner="expression_lab",
            purpose="结合长期记忆提供一项最高优先级、不可代写的表达反馈。",
            template_text=(
                "针对 {{learner_attempt}} 只指出 claim、logic 或 expression 中一个最高优先级问题。"
                "长期记忆只用于识别反复薄弱点，证据必须逐字引用，只输出 {{output_schema}}。"
            ),
            variables=("learner_attempt", "output_schema"),
            model_policy={"temperature": 0.1, "max_tokens": 900},
        ),
        PromptDefinition(
            prompt_id="expression.review_draft",
            prompt_version="v1",
            owner="expression_lab",
            purpose="结合长期记忆生成三种受约束的表达风格复盘。",
            template_text=(
                "保留 {{learner_draft}} 的核心立场与事实，"
                "生成 logic_mirror、academic、news 三个版本。"
                "长期记忆只可迁移结构或搭配，不得复制整句，只输出 {{output_schema}}。"
            ),
            variables=("learner_draft", "output_schema"),
            model_policy={"temperature": 0.2, "max_tokens": 1600},
        ),
    )
)
