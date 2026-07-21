from collections.abc import AsyncIterator

import httpx2
import pytest
import pytest_asyncio
import sqlalchemy as sa
from binnagent_api import auth_routes
from binnagent_api.database import dispose_engine, get_engine
from binnagent_api.learner_auth import SYNTHETIC_LEARNER_ID, utc_now
from binnagent_api.main import create_app
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

pytestmark = pytest.mark.integration


@pytest_asyncio.fixture(autouse=True)
async def session_auth(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
    monkeypatch.setenv("BINNAGENT_LEARNER_IDENTITY_ADAPTER", "session")
    monkeypatch.setenv("BINNAGENT_EMAIL_DELIVERY_MODE", "console")
    monkeypatch.setenv("BINNAGENT_EMAIL_VERIFICATION_RESEND_SECONDS", "1")
    get_settings.cache_clear()
    await _clean()
    yield
    await _clean()
    await dispose_engine()
    get_settings.cache_clear()


async def _clean() -> None:
    ordered = [
        tables.learner_sessions,
        tables.experience_code_redemptions,
        tables.email_verification_challenges,
        tables.audit_events,
        tables.domain_events,
        tables.next_task_placeholders,
        tables.difficulty_feedback_events,
        tables.material_match_decisions,
        tables.run_task_completion_events,
        tables.run_task_refs,
        tables.revision_events,
        tables.model_invocations,
        tables.ai_interventions,
        tables.attempt_versions,
        tables.material_assignment_invalidations,
        tables.task_grammar_challenges,
        tables.task_annotations,
        tables.task_material_assignments,
        tables.learning_tasks,
        tables.workflow_runs,
        tables.learners,
        tables.experience_codes,
        tables.learner_profile_snapshots,
        tables.outbox_messages,
        tables.idempotency_records,
    ]
    async with get_engine().begin() as connection:
        for table in ordered:
            await connection.execute(sa.delete(table))


async def _verify_email(client: httpx2.AsyncClient, email: str, code: str) -> str:
    auth_routes.generate_verification_code = lambda: code
    sent = await client.post("/learner/v1/auth/email-verifications", json={"email": email})
    assert sent.status_code == 202, sent.text
    confirmed = await client.post(
        "/learner/v1/auth/email-verifications/confirm",
        json={"email": email, "code": code},
    )
    assert confirmed.status_code == 200, confirmed.text
    return str(confirmed.json()["verification_token"])


def _profile() -> dict[str, object]:
    return {
        "learner_profile": {
            "exam_track": "english_1",
            "target_score": 70,
            "weekly_minutes": 420,
            "self_reported_level": "developing",
            "prior_exam_seen": False,
            "session_minutes": 45,
            "feedback_density": "minimal",
            "timed": False,
            "evidence_count": 0,
            "confidence_band": "low",
        }
    }


@pytest.mark.asyncio
async def test_controlled_experience_code_login_reuse_capacity_and_revocation() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    control_headers = {"X-BinnAgent-Control-Role": "developer_reviewer"}
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        forbidden = await client.post(
            "/control/v1/experience-codes",
            json={"label": "内测班", "max_uses": 1, "valid_days": 7},
        )
        assert forbidden.status_code == 403

        created = await client.post(
            "/control/v1/experience-codes",
            headers=control_headers,
            json={"label": "内测班", "max_uses": 1, "valid_days": 7},
        )
        assert created.status_code == 201, created.text
        created_payload = created.json()
        raw_code = created_payload["experience_code"]
        code_id = created_payload["code_id"]
        assert raw_code.startswith("TRY-")

        first = await client.post(
            "/learner/v1/auth/experience-login",
            json={"experience_code": raw_code.lower(), "username": "  小林  "},
        )
        assert first.status_code == 200, first.text
        first_identity = first.json()
        assert first_identity["nickname"] == "小林"
        assert first_identity["account_type"] == "experience"
        assert first_identity["email"] == ""
        assert first_identity["invite_code"] == ""

        run = await client.post(
            "/learner/v1/runs",
            headers={"Idempotency-Key": "experience-run-create-0001"},
            json=_profile(),
        )
        assert run.status_code == 201, run.text
        await client.post("/learner/v1/auth/logout")

        reused = await client.post(
            "/learner/v1/auth/experience-login",
            json={"experience_code": raw_code, "username": "小林"},
        )
        assert reused.status_code == 200, reused.text
        assert reused.json()["learner_id"] == first_identity["learner_id"]

        await client.post("/learner/v1/auth/logout")
        full = await client.post(
            "/learner/v1/auth/experience-login",
            json={"experience_code": raw_code, "username": "另一位"},
        )
        assert full.status_code == 400
        assert full.json()["detail"] == "experience_code_invalid_or_unavailable"

        listed = await client.get("/control/v1/experience-codes", headers=control_headers)
        assert listed.status_code == 200, listed.text
        assert listed.json()[0]["used_count"] == 1
        assert listed.json()[0]["status"] == "exhausted"
        assert "experience_code" not in listed.json()[0]

        await client.post(
            "/learner/v1/auth/experience-login",
            json={"experience_code": raw_code, "username": "小林"},
        )
        revoked = await client.post(
            f"/control/v1/experience-codes/{code_id}/revoke",
            headers=control_headers,
        )
        assert revoked.status_code == 200, revoked.text
        assert revoked.json()["status"] == "revoked"
        assert (await client.get("/learner/v1/auth/session")).status_code == 401

    async with get_engine().connect() as connection:
        stored = (
            (
                await connection.execute(
                    sa.select(tables.experience_codes).where(
                        tables.experience_codes.c.code_id == code_id
                    )
                )
            )
            .mappings()
            .one()
        )
        redemption = (
            (
                await connection.execute(
                    sa.select(tables.experience_code_redemptions).where(
                        tables.experience_code_redemptions.c.code_id == code_id
                    )
                )
            )
            .mappings()
            .one()
        )
    assert stored["code_hash"] != raw_code
    assert raw_code not in str(stored)
    assert redemption["login_count"] == 3


@pytest.mark.asyncio
async def test_email_registration_session_logout_and_account_lookup() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        email = "first@example.com"
        token = await _verify_email(client, email, "123456")
        lookup = await client.post(
            "/learner/v1/auth/lookup",
            json={"email": email, "verification_token": token},
        )
        assert lookup.json()["accounts"] == []

        registered = await client.post(
            "/learner/v1/auth/register",
            json={
                "email": email,
                "verification_token": token,
                "nickname": "First Learner",
                "invite_code": "BINN-LOCAL-FIRST",
            },
        )
        assert registered.status_code == 201, registered.text
        identity = registered.json()
        assert identity["nickname"] == "First Learner"
        assert "binnagent_session=" in registered.headers["set-cookie"]
        assert "HttpOnly" in registered.headers["set-cookie"]

        session = await client.get("/learner/v1/auth/session")
        assert session.status_code == 200
        assert session.json()["learner_id"] == identity["learner_id"]

        personalized_command = await client.post(
            "/learner/v1/runs/personalized/training_material_missing",
            headers={"Idempotency-Key": "personalized-route-auth-check"},
            json={},
        )
        assert personalized_command.status_code == 422, personalized_command.text
        assert personalized_command.json()["code"] == "CONTENT_NOT_ELIGIBLE"

        logged_out = await client.post("/learner/v1/auth/logout")
        assert logged_out.status_code == 204
        assert (await client.get("/learner/v1/auth/session")).status_code == 401

        accounts = await client.post(
            "/learner/v1/auth/lookup",
            json={"email": email, "verification_token": token},
        )
        assert accounts.json()["accounts"] == [
            {"learner_id": identity["learner_id"], "nickname": "First Learner"}
        ]


@pytest.mark.asyncio
async def test_control_user_management_lists_accounts_and_revokes_sessions() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    control_headers = {"X-BinnAgent-Control-Role": "developer_reviewer"}
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        email = "managed@example.com"
        token = await _verify_email(client, email, "112233")
        registered = await client.post(
            "/learner/v1/auth/register",
            json={
                "email": email,
                "verification_token": token,
                "nickname": "Managed Learner",
                "invite_code": "BINN-LOCAL-FIRST",
            },
        )
        assert registered.status_code == 201, registered.text
        learner_id = registered.json()["learner_id"]

        listed = await client.get("/control/v1/users", headers=control_headers)
        assert listed.status_code == 200, listed.text
        managed = next(item for item in listed.json() if item["learner_id"] == learner_id)
        assert managed["email"] == email
        assert managed["active_session_count"] == 1
        assert managed["asset_count"] == 0
        assert managed["obsidian_paired"] is False

        revoked = await client.post(
            f"/control/v1/users/{learner_id}/revoke-sessions",
            headers=control_headers,
        )
        assert revoked.status_code == 200, revoked.text
        assert revoked.json()["active_session_count"] == 0
        assert (await client.get("/learner/v1/auth/session")).status_code == 401


@pytest.mark.asyncio
async def test_synthetic_placeholder_does_not_consume_bootstrap_invite() -> None:
    now = utc_now()
    async with get_engine().begin() as connection:
        await connection.execute(
            tables.learners.insert().values(
                learner_id=SYNTHETIC_LEARNER_ID,
                nickname="本地学习者",
                email="local@binnagent.invalid",
                invite_code="BINN-LOCAL",
                invited_by_learner_id=None,
                created_at=now,
                updated_at=now,
            )
        )

    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        email = "first-after-synthetic@example.com"
        token = await _verify_email(client, email, "654321")
        registered = await client.post(
            "/learner/v1/auth/register",
            json={
                "email": email,
                "verification_token": token,
                "nickname": "First Real Learner",
                "invite_code": "BINN-LOCAL-FIRST",
            },
        )

    assert registered.status_code == 201, registered.text
    assert registered.json()["nickname"] == "First Real Learner"


@pytest.mark.asyncio
async def test_run_and_task_access_isolated_between_accounts() -> None:
    transport = httpx2.ASGITransport(app=create_app())
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
        first_email = "owner@example.com"
        first_token = await _verify_email(client, first_email, "111111")
        first = await client.post(
            "/learner/v1/auth/register",
            json={
                "email": first_email,
                "verification_token": first_token,
                "nickname": "Owner",
                "invite_code": "BINN-LOCAL-FIRST",
            },
        )
        assert first.status_code == 201, first.text
        invite_code = first.json()["invite_code"]
        created = await client.post(
            "/learner/v1/runs",
            headers={"Idempotency-Key": "owner-create-run-0001"},
            json=_profile(),
        )
        assert created.status_code == 201, created.text
        run_id = created.json()["workflow_run_id"]
        task_id = created.json()["current_task_id"]
        await client.post("/learner/v1/auth/logout")

        second_email = "other@example.com"
        second_token = await _verify_email(client, second_email, "222222")
        second = await client.post(
            "/learner/v1/auth/register",
            json={
                "email": second_email,
                "verification_token": second_token,
                "nickname": "Other",
                "invite_code": invite_code,
            },
        )
        assert second.status_code == 201, second.text

        assert (await client.get(f"/learner/v1/runs/{run_id}")).status_code == 404
        assert (await client.get(f"/learner/v1/tasks/{task_id}")).status_code == 404
