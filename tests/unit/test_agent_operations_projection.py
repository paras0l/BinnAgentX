from binnagent_api.agent_operations_routes import _operational_trace_view


def test_operational_trace_projection_exposes_metadata_but_not_evidence() -> None:
    trace = _operational_trace_view(
        {
            "id": "a" * 32,
            "name": "personalized.material.pipeline",
            "environment": "development",
            "metadata": {
                "project_key": "binnagentx",
                "operation": "personalized_material_pipeline",
                "provider": "longcat",
                "material_id": "material_001",
                "private_note": "must-not-leak",
                "resourceAttributes": {"service.name": "internal"},
            },
            "observations": ["observation_1", "observation_2"],
            "latency": 1.25,
            "totalCost": 0.03,
            "timestamp": "2026-08-07T12:00:00Z",
            "updatedAt": "2026-08-07T12:00:02Z",
            "input": {"private": "evidence"},
            "output": {"private": "evidence"},
        },
        "http://localhost:3100",
    )

    assert trace.metadata == {
        "project_key": "binnagentx",
        "operation": "personalized_material_pipeline",
        "provider": "longcat",
        "material_id": "material_001",
    }
    assert trace.observation_count == 2
    assert trace.latency_ms == 1250
    assert trace.evidence_url == f"http://localhost:3100/trace/{'a' * 32}"
    serialized = trace.model_dump_json()
    assert "must-not-leak" not in serialized
    assert '"private"' not in serialized
