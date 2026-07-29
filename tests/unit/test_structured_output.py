from binnagent_agent.agents.structured_output import load_model_json


def test_model_json_prefers_strict_valid_payload() -> None:
    assert load_model_json('{"status":"ok","items":[1,2]}') == {
        "status": "ok",
        "items": [1, 2],
    }


def test_model_json_repairs_syntax_before_contract_validation() -> None:
    assert load_model_json('```json\n{"status":"ok" "items":[1,2,]}\n```') == {
        "status": "ok",
        "items": [1, 2],
    }
