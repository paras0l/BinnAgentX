"""Pure builders and deterministic gates for personalized learning packages."""

from __future__ import annotations

import re
from hashlib import sha256
from typing import Any

from binnagent_domain.learning.content_quality import (
    ContentArtifact,
    DifficultyConstraints,
    ExpressionTaskArtifact,
    GrammarAnalysisArtifact,
    GrammarRoleSpan,
    LearningObjectiveBundle,
    QualityIssueCode,
    QualityReport,
    QualityResult,
    QualitySeverity,
    QuestionOption,
    ReadingQuestionArtifact,
    RequiredEvidence,
    SourceSpan,
    TargetGrammarStructure,
    TransferContract,
    stable_content_hash,
    validate_source_span,
)
from binnagent_domain.learning.grammar_ontology import (
    GrammarFacet,
    load_grammar_catalog,
)

from binnagent_api.model_adapters import (
    PersonalizedAssessmentOutput,
    PersonalizedGrammarOutput,
    PersonalizedQuestionOptionOutput,
    PersonalizedQuestionOutput,
    PersonalizedReadingOutput,
    PersonalizedTransferOutput,
)


def build_objective_bundle(
    *,
    material_id: str,
    learner_id: str,
    source_asset_ids: list[str],
    goal: str,
    adaptation_profile: dict[str, Any],
    construction_id: str = "clause.adverbial.concession.although.v1",
    discourse_target: str = "concession",
) -> LearningObjectiveBundle:
    if not source_asset_ids:
        raise ValueError("personalized_objective_requires_source_assets")
    level = str(adaptation_profile.get("overall_level", "developing"))
    reading_target = "evidence_boundary"
    construction = load_grammar_catalog().by_id(construction_id)
    goal_evidence = goal.strip() or "Learner needs a reviewed concession target."
    grammar_target = TargetGrammarStructure(
        target_id=construction_id,
        construction_id=construction_id,
        construction_version=construction.version,
        target_facets=(GrammarFacet.MEANING, GrammarFacet.USE),
        learner_gap="Needs evidence of recognizing and transferring concession.",
        evidence=(
            SourceSpan(
                source_id="personalization_goal",
                source_version=stable_content_hash(goal_evidence),
                start=0,
                end=len(goal_evidence),
                text_quote=goal_evidence,
            ),
        ),
    )
    return LearningObjectiveBundle(
        objective_bundle_id=f"objective_{material_id}",
        learner_id=learner_id,
        source_asset_ids=tuple(dict.fromkeys(source_asset_ids)),
        target_grammar_structures=(grammar_target,),
        target_discourse_moves=(discourse_target,),
        reading_skill_targets=(reading_target,),
        difficulty_constraints=DifficultyConstraints(
            lexical_band=level,
            syntax_band=level,
            discourse_band=level,
            estimated_minutes=12,
        ),
        required_evidence=(
            RequiredEvidence(target_id=discourse_target, evidence_kind="discourse"),
            RequiredEvidence(target_id=reading_target, evidence_kind="reading_skill"),
            RequiredEvidence(target_id=construction_id, evidence_kind="grammar"),
        ),
        uncertainty=(),
        version=1,
    )


def imported_article_targets(paragraphs: list[str]) -> tuple[str, str, str, str, int]:
    """Select a supported, uniquely locatable grammar target from imported text."""
    connector_targets = (
        ("Although", "Whenever", "clause.adverbial.concession.although.v1", "concession"),
        ("Because", "Despite", "clause.adverbial.cause.because.v1", "cause"),
        ("When", "Once", "clause.adverbial.time.when.v1", "time"),
        ("If", "As", "clause.adverbial.condition.if.v1", "condition"),
    )
    for canonical, replacement, construction_id, discourse_target in connector_targets:
        for candidate in (canonical, canonical.lower()):
            pattern = rf"\b{re.escape(candidate)}\b"
            matches = [
                index for index, paragraph in enumerate(paragraphs) if re.search(pattern, paragraph)
            ]
            if len(matches) == 1 and len(re.findall(pattern, paragraphs[matches[0]])) == 1:
                return construction_id, discourse_target, candidate, replacement, matches[0]

    for paragraph_index, paragraph in enumerate(paragraphs):
        for match in re.finditer(r"\b[A-Za-z]{2,}\b", paragraph):
            candidate = match.group(0)
            if sum(value.count(candidate) for value in paragraphs) == 1:
                return (
                    "clause.main.finite.v1",
                    "claim_evidence",
                    candidate,
                    "x" * len(candidate),
                    paragraph_index,
                )
    raise ValueError("imported_article_grammar_target_unavailable")


def build_article(
    *,
    material_id: str,
    objective: LearningObjectiveBundle,
    output: PersonalizedReadingOutput,
) -> dict[str, Any]:
    artifact = ContentArtifact(
        artifact_id=f"{material_id}_article",
        version=1,
        objective_bundle_id=objective.objective_bundle_id,
        artifact_type="article",
        generation_inputs_hash=stable_content_hash(objective),
        content_hash=stable_content_hash({"title": output.title, "paragraphs": output.paragraphs}),
        producer_version="personalized-reading-v2",
    )
    return {
        "artifact": artifact.model_dump(mode="json"),
        "title": output.title,
        "paragraphs": list(output.paragraphs),
        "focus_points": list(output.focus_points),
        "source_titles": list(output.source_titles),
    }


def build_imported_article(
    *,
    material_id: str,
    objective: LearningObjectiveBundle,
    title: str,
    paragraphs: list[str],
    focus_points: list[str],
) -> dict[str, Any]:
    """Wrap learner-supplied text in the same artifact contract as generated readings."""
    artifact = ContentArtifact(
        artifact_id=f"{material_id}_article",
        version=1,
        objective_bundle_id=objective.objective_bundle_id,
        artifact_type="article",
        generation_inputs_hash=stable_content_hash(
            {"source_kind": "imported", "title": title, "paragraphs": paragraphs}
        ),
        content_hash=stable_content_hash({"title": title, "paragraphs": paragraphs}),
        producer_version="imported-reading-v1",
    )
    return {
        "artifact": artifact.model_dump(mode="json"),
        "title": title,
        "paragraphs": paragraphs,
        "focus_points": focus_points,
        "source_titles": [],
    }


def deterministic_assessment(
    *,
    article: dict[str, Any],
    objective: LearningObjectiveBundle,
) -> PersonalizedAssessmentOutput:
    paragraphs = [str(value) for value in article["paragraphs"]]
    if len(paragraphs) < 3:
        raise ValueError("personalized_assessment_requires_three_paragraphs")
    if article["artifact"].get("producer_version") == "imported-reading-v1":
        return _deterministic_imported_assessment(article=article, objective=objective)
    evidence = [_evidence_excerpt(paragraph) for paragraph in paragraphs[:3]]
    grammar_index = next(
        (index for index, paragraph in enumerate(paragraphs) if "Although " in paragraph),
        1,
    )
    target = objective.target_discourse_moves[0]
    return PersonalizedAssessmentOutput(
        questions=[
            PersonalizedQuestionOutput(
                question_type="detail_comprehension",
                difficulty_tier="foundation",
                stem="According to the first paragraph, how should familiar knowledge be used?",
                options=[
                    PersonalizedQuestionOptionOutput(
                        option_id="A",
                        text="It should be memorized without any change.",
                        error_mechanism="replaces transfer with mechanical repetition",
                    ),
                    PersonalizedQuestionOptionOutput(
                        option_id="B",
                        text="It should be tested in a new context.",
                    ),
                    PersonalizedQuestionOptionOutput(
                        option_id="C",
                        text="It should be discarded after one review.",
                        error_mechanism="reverses the passage's treatment of prior knowledge",
                    ),
                ],
                answer_option_id="B",
                evidence_paragraph_index=0,
                evidence_quote=evidence[0],
                hints=[
                    "Locate the contrast between rereading and using an idea.",
                    "Focus on what happens when the setting changes.",
                    "Eliminate options that describe passive repetition or rejection.",
                    "State the action the learner performs in the unfamiliar setting.",
                ],
                public_explanation=(
                    "The paragraph presents transfer to a new context as more useful than "
                    "mechanical rereading."
                ),
            ),
            PersonalizedQuestionOutput(
                question_type="main_idea",
                difficulty_tier="standard",
                stem="Which statement best captures the central argument of the passage?",
                options=[
                    PersonalizedQuestionOptionOutput(
                        option_id="A",
                        text="Early explanations should always be trusted.",
                        error_mechanism="contradicts the evidence-checking episode",
                    ),
                    PersonalizedQuestionOptionOutput(
                        option_id="B",
                        text="Teams should avoid changing their plans.",
                        error_mechanism="turns a local example into the opposite prescription",
                    ),
                    PersonalizedQuestionOptionOutput(
                        option_id="C",
                        text="A remembered rule becomes useful through careful transfer.",
                    ),
                    PersonalizedQuestionOptionOutput(
                        option_id="D",
                        text="New contexts make previous knowledge irrelevant.",
                        error_mechanism="confuses adaptation with abandonment",
                    ),
                ],
                answer_option_id="C",
                evidence_paragraph_index=2,
                evidence_quote=evidence[2],
                hints=[
                    "Compare the opening problem with the final conclusion.",
                    "Track what changes and what is retained across contexts.",
                    "Reject answers that say prior knowledge is blindly accepted or discarded.",
                    "Choose the option joining remembered knowledge with deliberate transfer.",
                ],
                public_explanation=(
                    "The passage argues that prior knowledge becomes flexible only when its "
                    "conditions are tested in a different situation."
                ),
            ),
            PersonalizedQuestionOutput(
                question_type="inference",
                difficulty_tier="advanced",
                stem="What can be inferred about the team member who checks the evidence?",
                options=[
                    PersonalizedQuestionOptionOutput(
                        option_id="A",
                        text="The member distinguishes a main claim from its support.",
                    ),
                    PersonalizedQuestionOptionOutput(
                        option_id="B",
                        text="The member refuses to use any earlier knowledge.",
                        error_mechanism="confuses critical transfer with total rejection",
                    ),
                    PersonalizedQuestionOptionOutput(
                        option_id="C",
                        text="The member accepts the first explanation because it is natural.",
                        error_mechanism="reverses the member's evidence-checking action",
                    ),
                ],
                answer_option_id="A",
                evidence_paragraph_index=1,
                evidence_quote=evidence[1],
                hints=[
                    "Find the actions attributed to one member.",
                    "Separate what initially seemed convincing from what the member verified.",
                    "Eliminate options that reverse the member's response.",
                    "Describe the reading operation demonstrated by the evidence check.",
                ],
                public_explanation=(
                    "The member explicitly separates the claim from supporting details and "
                    "checks a neglected condition."
                ),
            ),
        ],
        grammar_annotations=[
            PersonalizedGrammarOutput(
                paragraph_index=grammar_index,
                construction_id="clause.adverbial.concession.although.v1",
                target_facets=[GrammarFacet.MEANING, GrammarFacet.USE],
                correct_text="Although",
                incorrect_text="Whenever",
                error_type="subordinator_logic",
                hint="Decide whether the dependent clause expresses cause or concession.",
                explanation=(
                    "Although introduces a concession; the following main clause carries the "
                    "unexpected evidence-checking action."
                ),
            )
        ],
        transfer=PersonalizedTransferOutput(
            title="Apply the same reasoning in a new setting",
            situation=(
                "A study group wants to reuse a familiar revision rule for a subject whose "
                "evidence and constraints are different."
            ),
            audience="another study group",
            purpose="recommend a careful transfer instead of mechanical reuse",
            target_argument_move=target,
            optional_active_resource="a concession clause beginning with Although",
            forbidden_mechanical_use=[
                "Do not copy a complete sentence from the reading.",
                "Do not claim that the old rule always works.",
            ],
            v1_minimum=[
                "State the familiar rule.",
                "Name one changed condition.",
                "Use concession to qualify the recommendation.",
            ],
        ),
    )


def _deterministic_imported_assessment(
    *,
    article: dict[str, Any],
    objective: LearningObjectiveBundle,
) -> PersonalizedAssessmentOutput:
    paragraphs = [str(value) for value in article["paragraphs"]]
    evidence = [_evidence_excerpt(paragraph) for paragraph in paragraphs[:3]]
    closing_evidence = _closing_evidence_excerpt(paragraphs[2])
    questions = [
        PersonalizedQuestionOutput(
            question_type="detail_comprehension",
            difficulty_tier="foundation",
            stem="Which statement is explicitly supported by the opening paragraph?",
            options=[
                PersonalizedQuestionOptionOutput(option_id="A", text=evidence[0]),
                PersonalizedQuestionOptionOutput(
                    option_id="B",
                    text=evidence[1],
                    error_mechanism="quotes the middle paragraph instead of the opening",
                ),
                PersonalizedQuestionOptionOutput(
                    option_id="C",
                    text=evidence[2],
                    error_mechanism="quotes the final paragraph instead of the opening",
                ),
            ],
            answer_option_id="A",
            evidence_paragraph_index=0,
            evidence_quote=evidence[0],
            hints=[
                "Focus only on what the opening paragraph states.",
                "Locate the first distinctive words of each option.",
                "Cross out wording that appears later in the article.",
                "Choose the statement found directly in the opening paragraph.",
            ],
            public_explanation="The opening paragraph contains this statement directly.",
        ),
        PersonalizedQuestionOutput(
            question_type="evidence_reasoning",
            difficulty_tier="standard",
            stem=(
                f'A reader cites "{evidence[1]}". What does a source check show?'
            ),
            options=[
                PersonalizedQuestionOptionOutput(
                    option_id="A",
                    text="It comes from the opening paragraph, not the middle paragraph.",
                    error_mechanism="assigns the quotation to the wrong source location",
                ),
                PersonalizedQuestionOptionOutput(
                    option_id="B",
                    text="It appears in the middle paragraph exactly as cited.",
                ),
                PersonalizedQuestionOptionOutput(
                    option_id="C",
                    text="It is not present in the article and should not be cited.",
                    error_mechanism="rejects a quotation that is present in the source",
                ),
            ],
            answer_option_id="B",
            evidence_paragraph_index=1,
            evidence_quote=evidence[1],
            hints=[
                "Identify the exact quotation being checked.",
                "Scan the middle paragraph for its first distinctive words.",
                "Compare the cited wording with the source word for word.",
                "Choose the option that reports the verified source location.",
            ],
            public_explanation=(
                "The cited wording occurs verbatim in the middle paragraph, so the source check "
                "confirms it."
            ),
        ),
        PersonalizedQuestionOutput(
            question_type="inference",
            difficulty_tier="advanced",
            stem=(
                "What can a reader infer about the role of the sentence "
                f'"{closing_evidence}" in the article\'s organization?'
            ),
            options=[
                PersonalizedQuestionOptionOutput(
                    option_id="A",
                    text="It introduces the topic at the start of the opening paragraph.",
                    error_mechanism="moves the sentence from the conclusion to the opening",
                ),
                PersonalizedQuestionOptionOutput(
                    option_id="B",
                    text="It is unrelated wording that does not appear in the article.",
                    error_mechanism="denies evidence that appears in the final paragraph",
                ),
                PersonalizedQuestionOptionOutput(
                    option_id="C",
                    text="It closes the final paragraph and serves as the concluding statement.",
                ),
            ],
            answer_option_id="C",
            evidence_paragraph_index=2,
            evidence_quote=closing_evidence,
            hints=[
                "This question asks about organization, not just word meaning.",
                "Locate the quoted sentence before deciding its role.",
                "Notice what comes after the sentence in the final paragraph.",
                "Use its position to infer whether it opens, develops, or closes the article.",
            ],
            public_explanation=(
                "The sentence appears at the end of the final paragraph, which makes it the "
                "article's concluding statement."
            ),
        ),
    ]

    construction_id, target, correct_text, incorrect_text, paragraph_index = (
        imported_article_targets(paragraphs)
    )
    if construction_id != objective.target_grammar_structures[0].construction_id:
        raise ValueError("imported_article_objective_target_mismatch")
    return PersonalizedAssessmentOutput(
        questions=questions,
        grammar_annotations=[
            PersonalizedGrammarOutput(
                paragraph_index=paragraph_index,
                construction_id=construction_id,
                target_facets=[GrammarFacet.FORM, GrammarFacet.MEANING],
                correct_text=correct_text,
                incorrect_text=incorrect_text,
                error_type="imported_text_structure",
                hint="Use the surrounding clause to restore the wording from the source article.",
                explanation=(
                    "This span is preserved from the imported article and is reviewed in its "
                    "original sentence context."
                ),
            )
        ],
        transfer=PersonalizedTransferOutput(
            title="Apply the article's reasoning in a new setting",
            situation=(
                "A study group faces a new text and must reuse the same reading operation "
                "without copying the imported article's wording."
            ),
            audience="another study group",
            purpose="transfer the article's reasoning to a different context",
            target_argument_move=target,
            optional_active_resource="claim, evidence, and a clearly stated relationship",
            forbidden_mechanical_use=["Do not copy a complete sentence from the reading."],
            v1_minimum=[
                "State a claim for the new setting.",
                "Support it with a relevant condition or piece of evidence.",
            ],
        ),
    )


def build_question_artifacts(
    *,
    material_id: str,
    objective: LearningObjectiveBundle,
    article: dict[str, Any],
    assessment: PersonalizedAssessmentOutput,
) -> tuple[ReadingQuestionArtifact, ...]:
    article_artifact = ContentArtifact.model_validate(article["artifact"])
    paragraphs = [str(value) for value in article["paragraphs"]]
    results: list[ReadingQuestionArtifact] = []
    for index, draft in enumerate(assessment.questions, start=1):
        paragraph = _paragraph(paragraphs, draft.evidence_paragraph_index)
        start = paragraph.find(draft.evidence_quote)
        if start < 0:
            raise ValueError(f"question_evidence_not_in_article:{index}")
        answer_options = [
            option for option in draft.options if option.option_id == draft.answer_option_id
        ]
        if len(answer_options) != 1:
            raise ValueError(f"question_answer_option_invalid:{index}")
        options = tuple(
            QuestionOption(
                option_id=option.option_id,
                text=option.text,
                error_mechanism=(
                    None if option.option_id == draft.answer_option_id else option.error_mechanism
                ),
            )
            for option in draft.options
        )
        artifact_id = f"{material_id}_question_{index:02d}"
        results.append(
            ReadingQuestionArtifact(
                artifact=ContentArtifact(
                    artifact_id=artifact_id,
                    version=1,
                    objective_bundle_id=objective.objective_bundle_id,
                    artifact_type="question",
                    generation_inputs_hash=stable_content_hash(
                        {
                            "objective": objective.model_dump(mode="json"),
                            "article_hash": article_artifact.content_hash,
                            "ordinal": index,
                        }
                    ),
                    content_hash=stable_content_hash(draft),
                    producer_version="personalized-assessment-v1",
                ),
                question_type=draft.question_type,
                stem=draft.stem,
                options=options,
                answer_option_id=draft.answer_option_id,
                answer_evidence=(
                    SourceSpan(
                        source_id=f"personalized_p_{draft.evidence_paragraph_index + 1:02d}",
                        source_version=article_artifact.content_hash,
                        start=start,
                        end=start + len(draft.evidence_quote),
                        text_quote=draft.evidence_quote,
                    ),
                ),
                solver_trace_ref=f"human_review_required:{artifact_id}",
                hint_texts=tuple(draft.hints),
            )
        )
    artifact_ids = [question.artifact.artifact_id for question in results]
    if len(artifact_ids) != len(set(artifact_ids)):
        raise ValueError("question_artifact_ids_not_unique")
    return tuple(results)


def build_grammar_artifacts(
    *,
    material_id: str,
    objective: LearningObjectiveBundle,
    article: dict[str, Any],
    assessment: PersonalizedAssessmentOutput,
) -> tuple[GrammarAnalysisArtifact, ...]:
    article_artifact = ContentArtifact.model_validate(article["artifact"])
    paragraphs = [str(value) for value in article["paragraphs"]]
    results: list[GrammarAnalysisArtifact] = []
    allowed_constructions = {
        target.construction_id for target in objective.target_grammar_structures
    }
    for index, draft in enumerate(assessment.grammar_annotations, start=1):
        if draft.construction_id not in allowed_constructions:
            raise ValueError(f"grammar_construction_outside_objective:{index}")
        if len(draft.correct_text) != len(draft.incorrect_text):
            raise ValueError(f"grammar_replacement_length_mismatch:{index}")
        paragraph = _paragraph(paragraphs, draft.paragraph_index)
        challenge_start = paragraph.find(draft.correct_text)
        if challenge_start < 0:
            raise ValueError(f"grammar_span_not_in_article:{index}")
        if paragraph.count(draft.correct_text) != 1:
            raise ValueError(f"grammar_replacement_not_unique:{index}")
        start, analysis_text = _sentence_containing(paragraph, challenge_start)
        span = SourceSpan(
            source_id=f"personalized_p_{draft.paragraph_index + 1:02d}",
            source_version=article_artifact.content_hash,
            start=start,
            end=start + len(analysis_text),
            text_quote=analysis_text,
        )
        construction = load_grammar_catalog().by_id(draft.construction_id)
        role_spans = (
            _concession_role_spans(
                paragraph=paragraph,
                sentence_start=start,
                sentence=analysis_text,
                source_id=span.source_id,
                source_version=span.source_version,
            )
            if draft.construction_id == "clause.adverbial.concession.although.v1"
            else ()
        )
        results.append(
            GrammarAnalysisArtifact(
                artifact=ContentArtifact(
                    artifact_id=f"{material_id}_grammar_{index:02d}",
                    version=1,
                    objective_bundle_id=objective.objective_bundle_id,
                    artifact_type="grammar_annotation",
                    generation_inputs_hash=stable_content_hash(
                        {
                            "article_hash": article_artifact.content_hash,
                            "construction_id": draft.construction_id,
                            "construction_version": construction.version,
                        }
                    ),
                    content_hash=stable_content_hash(draft),
                    source_spans=(span,),
                    producer_version="personalized-assessment-v1",
                ),
                construction_id=draft.construction_id,
                construction_version=construction.version,
                target_facets=tuple(draft.target_facets),
                span=span,
                role_spans=role_spans,
                form=construction.form,
                meaning=construction.meaning,
                use=construction.use,
                explanation=draft.explanation,
                parser_id="model_candidate_unverified",
                parser_version="v1",
                parser_evidence=construction.parser_signatures,
                confidence=0.5,
                status="review_required",
                alternatives=(),
            )
        )
    return tuple(results)


def build_transfer_artifacts(
    *,
    material_id: str,
    objective: LearningObjectiveBundle,
    article: dict[str, Any],
    questions: tuple[ReadingQuestionArtifact, ...],
    assessment: PersonalizedAssessmentOutput,
) -> tuple[TransferContract, ExpressionTaskArtifact]:
    article_artifact = ContentArtifact.model_validate(article["artifact"])
    discourse_targets = objective.target_discourse_moves or objective.reading_skill_targets
    if assessment.transfer.target_argument_move not in discourse_targets:
        raise ValueError("transfer_task_target_mismatch")
    target_ids = tuple(
        dict.fromkeys(
            (
                *discourse_targets,
                *(target.construction_id for target in objective.target_grammar_structures),
            )
        )
    )
    reading_refs = tuple(question.artifact.artifact_id for question in questions)
    transfer_id = f"{material_id}_transfer"
    transfer = TransferContract(
        transfer_contract_id=transfer_id,
        objective_bundle_id=objective.objective_bundle_id,
        source_reading_artifact_id=article_artifact.artifact_id,
        required_transfer_targets=tuple(target_ids),
        reading_evidence_refs=reading_refs,
        novel_context_constraints=tuple(assessment.transfer.forbidden_mechanical_use),
        success_criteria=tuple(assessment.transfer.v1_minimum),
        delayed_validation_plan=(
            "After the immediate expression revision, schedule the same argument move in an "
            "unfamiliar passage before changing mastery confidence."
        ),
    )
    expression = ExpressionTaskArtifact(
        artifact=ContentArtifact(
            artifact_id=f"{material_id}_expression",
            version=1,
            objective_bundle_id=objective.objective_bundle_id,
            artifact_type="expression_task",
            generation_inputs_hash=stable_content_hash(
                {
                    "article_hash": article_artifact.content_hash,
                    "transfer_id": transfer_id,
                }
            ),
            content_hash=stable_content_hash(assessment.transfer),
            producer_version="personalized-assessment-v1",
        ),
        transfer_contract_id=transfer_id,
        prompt=f"{assessment.transfer.situation} {assessment.transfer.purpose}",
        required_target_ids=tuple(target_ids),
        reading_evidence_refs=reading_refs,
    )
    return transfer, expression


def structural_quality_reports(
    state: dict[str, Any],
) -> tuple[QualityReport, ...]:
    article = dict(state["article"])
    article_artifact = ContentArtifact.model_validate(article["artifact"])
    paragraphs = [str(value) for value in article["paragraphs"]]
    questions = tuple(ReadingQuestionArtifact.model_validate(value) for value in state["questions"])
    grammar = tuple(
        GrammarAnalysisArtifact.model_validate(value) for value in state["grammar_annotations"]
    )
    TransferContract.model_validate(state["transfer_contract"])
    ExpressionTaskArtifact.model_validate(state["expression_task"])
    for question in questions:
        for span in question.answer_evidence:
            paragraph = _paragraph_for_source(paragraphs, span.source_id)
            if not validate_source_span(span, paragraph):
                raise ValueError("question_evidence_span_invalid")
    for annotation in grammar:
        paragraph = _paragraph_for_source(paragraphs, annotation.span.source_id)
        if not validate_source_span(annotation.span, paragraph):
            raise ValueError("grammar_evidence_span_invalid")
    return (
        QualityReport(
            report_id=f"{article_artifact.artifact_id}_structure_v2",
            artifact_id=article_artifact.artifact_id,
            validator_id="personalized_package_deterministic_gate",
            validator_version="v2",
            result=QualityResult.PASS,
            severity=QualitySeverity.INFO,
            confidence=1.0,
        ),
        QualityReport(
            report_id=f"{article_artifact.artifact_id}_human_review_v1",
            artifact_id=article_artifact.artifact_id,
            validator_id="personalized_package_human_gate",
            validator_version="v1",
            result=QualityResult.REVIEW_REQUIRED,
            issue_code=QualityIssueCode.SEMANTIC_REVIEW_NOT_RUN,
            severity=QualitySeverity.BLOCKER,
            repair_scope=(
                "article",
                "question_bank",
                "grammar_annotations",
                "transfer_contract",
            ),
            confidence=1.0,
        ),
    )


def persisted_question(
    question: ReadingQuestionArtifact,
    *,
    draft: PersonalizedQuestionOutput,
) -> dict[str, Any]:
    evidence = question.answer_evidence[0]
    return {
        "question_id": question.artifact.artifact_id,
        "question_type": question.question_type,
        "difficulty_tier": draft.difficulty_tier,
        "prompt": question.stem,
        "answer_type": "single_choice_with_explanation",
        "options": [option.model_dump(mode="json") for option in question.options],
        "correct_answer": question.answer_option_id,
        "minimum_evidence": {
            "paragraph_id": evidence.source_id,
            "start": evidence.start,
            "end": evidence.end,
            "text_quote": evidence.text_quote,
            "text_hash": sha256(evidence.text_quote.encode()).hexdigest(),
        },
        "acceptable_alternative_evidence": [],
        "common_error_candidates": [
            option.error_mechanism
            for option in question.options
            if option.error_mechanism is not None
        ],
        "hints": {f"h{index}": value for index, value in enumerate(question.hint_texts, start=1)},
        "public_explanation": draft.public_explanation,
        "reveal_gate": "after_independent_output",
        "artifact": question.artifact.model_dump(mode="json"),
    }


def persisted_grammar(
    annotation: GrammarAnalysisArtifact,
    draft: PersonalizedGrammarOutput,
) -> dict[str, Any]:
    return {
        "challenge_id": annotation.artifact.artifact_id,
        "paragraph_id": annotation.span.source_id,
        "correct_text": draft.correct_text,
        "incorrect_text": draft.incorrect_text,
        "error_type": draft.error_type,
        "construction_id": annotation.construction_id,
        "construction_version": annotation.construction_version,
        "tested_facet": annotation.target_facets[0].value,
        "hint": draft.hint,
        "analysis": annotation.model_dump(mode="json"),
    }


def persisted_expression(
    *,
    objective: LearningObjectiveBundle,
    transfer: TransferContract,
    expression: ExpressionTaskArtifact,
    draft: PersonalizedTransferOutput,
) -> dict[str, Any]:
    return {
        "content_type": "micro_expression",
        "content_version_id": expression.artifact.artifact_id,
        "title": draft.title,
        "situation": draft.situation,
        "audience": draft.audience,
        "purpose": draft.purpose,
        "target_argument_move": draft.target_argument_move,
        "optional_active_resource": draft.optional_active_resource,
        "forbidden_mechanical_use": draft.forbidden_mechanical_use,
        "output_requirement": {
            "sentence_min": 2,
            "sentence_max": 4,
            "word_min": 35,
            "word_max": 90,
            "language": "English",
        },
        "v1_minimum": draft.v1_minimum,
        "objective_bundle_id": objective.objective_bundle_id,
        "transfer_contract_id": transfer.transfer_contract_id,
        "required_target_ids": list(expression.required_target_ids),
        "reading_evidence_refs": list(expression.reading_evidence_refs),
        "artifact": expression.artifact.model_dump(mode="json"),
    }


def _paragraph(paragraphs: list[str], index: int) -> str:
    if index >= len(paragraphs):
        raise ValueError("personalized_paragraph_index_invalid")
    return paragraphs[index]


def _paragraph_for_source(paragraphs: list[str], source_id: str) -> str:
    prefix = "personalized_p_"
    if not source_id.startswith(prefix):
        raise ValueError("personalized_span_source_invalid")
    return _paragraph(paragraphs, int(source_id.removeprefix(prefix)) - 1)


def _evidence_excerpt(paragraph: str) -> str:
    sentence = paragraph.split(".", maxsplit=1)[0].strip()
    if len(sentence) < 20:
        sentence = paragraph[:160].strip()
    return sentence


def _closing_evidence_excerpt(paragraph: str) -> str:
    sentences = [value.strip() for value in re.split(r"(?<=[.!?])\s+", paragraph) if value.strip()]
    sentence = sentences[-1] if sentences else paragraph.strip()
    if len(sentence) < 20:
        sentence = paragraph[-160:].strip()
    return sentence


def _sentence_containing(paragraph: str, offset: int) -> tuple[int, str]:
    start = paragraph.rfind(".", 0, offset)
    start = 0 if start < 0 else start + 1
    while start < len(paragraph) and paragraph[start].isspace():
        start += 1
    end = paragraph.find(".", offset)
    end = len(paragraph) if end < 0 else end + 1
    sentence = paragraph[start:end]
    if not sentence:
        raise ValueError("grammar_analysis_sentence_missing")
    return start, sentence


def _concession_role_spans(
    *,
    paragraph: str,
    sentence_start: int,
    sentence: str,
    source_id: str,
    source_version: str,
) -> tuple[GrammarRoleSpan, ...]:
    comma = sentence.find(",")
    if comma < 0:
        return ()
    subordinate = sentence[:comma]
    main_local_start = comma + 1
    while main_local_start < len(sentence) and sentence[main_local_start].isspace():
        main_local_start += 1
    main = sentence[main_local_start:]
    if not subordinate or not main:
        return ()
    roles = (
        GrammarRoleSpan(
            role="concessive_clause",
            span=SourceSpan(
                source_id=source_id,
                source_version=source_version,
                start=sentence_start,
                end=sentence_start + len(subordinate),
                text_quote=subordinate,
            ),
        ),
        GrammarRoleSpan(
            role="main_clause",
            span=SourceSpan(
                source_id=source_id,
                source_version=source_version,
                start=sentence_start + main_local_start,
                end=sentence_start + main_local_start + len(main),
                text_quote=main,
            ),
        ),
    )
    if all(validate_source_span(role.span, paragraph) for role in roles):
        return roles
    raise ValueError("grammar_role_span_invalid")
