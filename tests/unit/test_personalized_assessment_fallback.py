import httpx2
import pytest
from binnagent_api import personalized_material_service
from binnagent_api.model_adapters import PersonalizedReadingOutput
from binnagent_api.personalized_package import (
    build_article,
    build_imported_article,
    build_objective_bundle,
    deterministic_assessment,
)


def test_imported_assessment_fallback_keeps_question_types_and_stems_distinct() -> None:
    material_id = "material_imported_fallback"
    objective = build_objective_bundle(
        material_id=material_id,
        learner_id="learner_imported_fallback",
        source_asset_ids=[f"{material_id}_imported_article"],
        goal="理解文章并完成读写迁移",
        adaptation_profile={"overall_level": "developing"},
    )
    article = build_imported_article(
        material_id=material_id,
        objective=objective,
        title="Keep Going",
        paragraphs=[
            "A learner begins by noticing one clear idea in a new text.",
            "Although progress can be slow, careful practice makes the next step easier.",
            "The learner finally uses that evidence to explain the article's message.",
        ],
        focus_points=["evidence"],
    )

    output = deterministic_assessment(article=article, objective=objective)

    assert [question.question_type for question in output.questions] == [
        "detail_comprehension",
        "evidence_reasoning",
        "inference",
    ]
    assert len({question.stem for question in output.questions}) == 3
    assert [question.evidence_paragraph_index for question in output.questions] == [0, 1, 2]
    assert len({tuple(question.hints) for question in output.questions}) == 3


@pytest.mark.asyncio
async def test_personalized_assessment_transport_error_uses_existing_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    objective = build_objective_bundle(
        material_id="material_transport_fallback",
        learner_id="learner_transport_fallback",
        source_asset_ids=["asset_grammar"],
        goal="复核让步关系",
        adaptation_profile={"overall_level": "developing"},
    )
    article = build_article(
        material_id="material_transport_fallback",
        objective=objective,
        output=PersonalizedReadingOutput(
            title="A Different Public Resource",
            paragraphs=[
                "A local service tested a new access rule for shared equipment.",
                "Although the rule seemed restrictive, it allowed more people to participate.",
                "The result depended on sharing existing capacity more carefully.",
            ],
            focus_points=["concession"],
            source_titles=[],
        ),
    )
    events: list[dict[str, object]] = []
    completed: list[dict[str, object]] = []

    class DisconnectingAdapter:
        async def generate(self, **_: object) -> object:
            raise httpx2.RemoteProtocolError("server disconnected")

    async def reserve(**_: object) -> None:
        return None

    async def complete(**kwargs: object) -> None:
        completed.append(kwargs)

    async def record(_: str, **kwargs: object) -> None:
        events.append(kwargs)

    monkeypatch.setattr(
        personalized_material_service,
        "_reserve_or_load_model_invocation",
        reserve,
    )
    monkeypatch.setattr(
        personalized_material_service,
        "_complete_material_model_invocation",
        complete,
    )
    monkeypatch.setattr(personalized_material_service, "_record_event", record)
    monkeypatch.setattr(
        personalized_material_service,
        "personalized_assessment_adapter",
        lambda _: DisconnectingAdapter(),
    )
    monkeypatch.setattr(personalized_material_service, "get_settings", lambda: object())

    output = await personalized_material_service._cached_personalized_assessment(
        material_id="material_transport_fallback",
        revision=0,
        objective=objective,
        article=article,
    )

    assert output.questions
    assert completed
    assert events[0]["event_type"] == "assessment_deterministic_fallback"
    assert events[0]["detail"] == {"reason_code": "RemoteProtocolError"}
