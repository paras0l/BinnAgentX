import hmac
from datetime import timedelta

import sqlalchemy as sa
from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from binnagent_api.database import get_engine
from binnagent_api.learner_auth import (
    SYNTHETIC_LEARNER_ID,
    EmailDeliveryError,
    LearnerIdentity,
    create_email_verification_token,
    deliver_verification_code,
    email_verification_token_is_valid,
    generate_code_salt,
    generate_invite_code,
    hash_experience_code,
    hash_verification_code,
    issue_session,
    new_id,
    normalize_email,
    normalize_experience_code,
    normalize_experience_username,
    normalize_invite_code,
    resolve_request_identity,
    revoke_session,
    utc_now,
    verification_code_matches,
)
from binnagent_api.learner_auth import (
    generate_verification_code as _generate_verification_code,
)
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

auth_router = APIRouter(prefix="/v1/auth", tags=["learner-auth"])


def generate_verification_code() -> str:
    """Test seam around the cryptographically random production generator."""
    return _generate_verification_code()


class EmailRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def normalized_email(cls, value: str) -> str:
        return normalize_email(value)


class ConfirmEmailRequest(EmailRequest):
    code: str = Field(pattern=r"^\d{6}$")


class VerifiedEmailRequest(EmailRequest):
    verification_token: str = Field(min_length=20, max_length=2048)


class LoginRequest(VerifiedEmailRequest):
    learner_id: str = Field(pattern=r"^learner_[a-z0-9_]{8,120}$")


class RegisterRequest(VerifiedEmailRequest):
    nickname: str = Field(min_length=1, max_length=100)
    invite_code: str = Field(min_length=1, max_length=32)

    @field_validator("nickname")
    @classmethod
    def normalized_nickname(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("nickname_required")
        return normalized

    @field_validator("invite_code")
    @classmethod
    def normalized_invite(cls, value: str) -> str:
        return normalize_invite_code(value)


class ExperienceLoginRequest(BaseModel):
    experience_code: str = Field(min_length=6, max_length=32)
    username: str = Field(min_length=1, max_length=100)

    @field_validator("experience_code")
    @classmethod
    def normalized_code(cls, value: str) -> str:
        return normalize_experience_code(value)

    @field_validator("username")
    @classmethod
    def normalized_username(cls, value: str) -> str:
        username, _ = normalize_experience_username(value)
        return username


class LearnerAccountView(BaseModel):
    learner_id: str
    nickname: str


class LearnerIdentityView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    learner_id: str
    nickname: str
    email: str
    invite_code: str
    account_type: str


def _require_verified_email(body: VerifiedEmailRequest) -> None:
    if not email_verification_token_is_valid(
        email=body.email,
        token=body.verification_token,
        now=utc_now(),
    ):
        raise HTTPException(status_code=401, detail="email_verification_required")


def _set_session_cookie(response: Response, token: str, *, max_age: int | None = None) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=max_age or settings.session_ttl_seconds,
        httponly=True,
        secure=settings.env == "production",
        samesite="lax",
        path="/",
    )


@auth_router.post("/email-verifications", status_code=status.HTTP_202_ACCEPTED)
async def request_email_verification(body: EmailRequest) -> dict[str, object]:
    settings = get_settings()
    now = utc_now()
    code = generate_verification_code()
    salt = generate_code_salt()
    async with get_engine().begin() as connection:
        latest = (
            (
                await connection.execute(
                    sa.select(tables.email_verification_challenges)
                    .where(tables.email_verification_challenges.c.email == body.email)
                    .order_by(tables.email_verification_challenges.c.sent_at.desc())
                    .limit(1)
                )
            )
            .mappings()
            .one_or_none()
        )
        if latest is not None:
            elapsed = (now - latest["sent_at"]).total_seconds()
            if elapsed < settings.email_verification_resend_seconds:
                retry_after = max(1, settings.email_verification_resend_seconds - int(elapsed))
                raise HTTPException(
                    status_code=429,
                    detail="verification_resend_too_soon",
                    headers={"Retry-After": str(retry_after)},
                )
        await connection.execute(
            tables.email_verification_challenges.insert().values(
                challenge_id=new_id("email_challenge"),
                email=body.email,
                code_hash=hash_verification_code(email=body.email, code=code, salt=salt),
                code_salt=salt,
                attempt_count=0,
                sent_at=now,
                expires_at=now + timedelta(seconds=settings.email_verification_code_ttl_seconds),
                verified_at=None,
            )
        )
        try:
            await deliver_verification_code(email=body.email, code=code)
        except EmailDeliveryError as exc:
            raise HTTPException(status_code=503, detail="verification_email_unavailable") from exc
    return {
        "email": body.email,
        "expires_in_seconds": settings.email_verification_code_ttl_seconds,
        "resend_after_seconds": settings.email_verification_resend_seconds,
    }


@auth_router.post("/email-verifications/confirm")
async def confirm_email_verification(body: ConfirmEmailRequest) -> dict[str, object]:
    settings = get_settings()
    now = utc_now()
    invalid = False
    async with get_engine().begin() as connection:
        challenge = (
            (
                await connection.execute(
                    sa.select(tables.email_verification_challenges)
                    .where(
                        tables.email_verification_challenges.c.email == body.email,
                        tables.email_verification_challenges.c.verified_at.is_(None),
                    )
                    .order_by(tables.email_verification_challenges.c.sent_at.desc())
                    .limit(1)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if challenge is None or challenge["expires_at"] < now:
            invalid = True
        elif challenge["attempt_count"] >= settings.email_verification_max_attempts:
            raise HTTPException(status_code=429, detail="verification_attempts_exhausted")
        else:
            matches = verification_code_matches(
                email=body.email,
                code=body.code,
                salt=challenge["code_salt"],
                expected_hash=challenge["code_hash"],
            )
            await connection.execute(
                tables.email_verification_challenges.update()
                .where(
                    tables.email_verification_challenges.c.challenge_id == challenge["challenge_id"]
                )
                .values(
                    attempt_count=challenge["attempt_count"] + 1,
                    verified_at=now if matches else None,
                )
            )
            invalid = not matches
    if invalid:
        raise HTTPException(status_code=400, detail="verification_code_invalid_or_expired")
    return {
        "email": body.email,
        "verification_token": create_email_verification_token(email=body.email, now=now),
        "expires_in_seconds": settings.email_verification_token_ttl_seconds,
    }


@auth_router.post("/lookup")
async def lookup_accounts(body: VerifiedEmailRequest) -> dict[str, object]:
    _require_verified_email(body)
    async with get_engine().connect() as connection:
        rows = (
            (
                await connection.execute(
                    sa.select(tables.learners.c.learner_id, tables.learners.c.nickname)
                    .where(
                        tables.learners.c.email == body.email,
                        tables.learners.c.account_type == "registered",
                    )
                    .order_by(tables.learners.c.created_at, tables.learners.c.learner_id)
                )
            )
            .mappings()
            .all()
        )
    return {
        "email": body.email,
        "accounts": [LearnerAccountView(**row).model_dump() for row in rows],
    }


@auth_router.post("/login", response_model=LearnerIdentityView)
async def login(body: LoginRequest, response: Response) -> LearnerIdentity:
    _require_verified_email(body)
    now = utc_now()
    async with get_engine().begin() as connection:
        row = (
            (
                await connection.execute(
                    sa.select(tables.learners).where(
                        tables.learners.c.learner_id == body.learner_id,
                        tables.learners.c.email == body.email,
                        tables.learners.c.account_type == "registered",
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            raise HTTPException(status_code=404, detail="learner_not_found_for_email")
        token = await issue_session(connection, row["learner_id"], now)
    _set_session_cookie(response, token)
    return LearnerIdentity(
        learner_id=row["learner_id"],
        nickname=row["nickname"],
        email=row["email"],
        invite_code=row["invite_code"],
        account_type=row["account_type"],
    )


@auth_router.post("/register", response_model=LearnerIdentityView, status_code=201)
async def register(body: RegisterRequest, response: Response) -> LearnerIdentity:
    _require_verified_email(body)
    settings = get_settings()
    now = utc_now()
    async with get_engine().begin() as connection:
        await connection.execute(
            sa.text("SELECT pg_advisory_xact_lock(hashtext('learner-registration'))")
        )
        inviter = (
            (
                await connection.execute(
                    sa.select(tables.learners).where(
                        tables.learners.c.invite_code == body.invite_code,
                        tables.learners.c.account_type == "registered",
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if inviter is None:
            count = int(
                await connection.scalar(
                    sa.select(sa.func.count())
                    .select_from(tables.learners)
                    .where(
                        tables.learners.c.learner_id != SYNTHETIC_LEARNER_ID,
                        tables.learners.c.account_type == "registered",
                    )
                )
                or 0
            )
            bootstrap = normalize_invite_code(settings.bootstrap_invite_code.get_secret_value())
            if count != 0 or not hmac.compare_digest(body.invite_code, bootstrap):
                raise HTTPException(status_code=400, detail="invalid_invitation_code")
        learner_id = new_id("learner")
        invite_code = generate_invite_code()
        await connection.execute(
            tables.learners.insert().values(
                learner_id=learner_id,
                nickname=body.nickname,
                email=body.email,
                invite_code=invite_code,
                invited_by_learner_id=inviter["learner_id"] if inviter is not None else None,
                account_type="registered",
                created_at=now,
                updated_at=now,
            )
        )
        token = await issue_session(connection, learner_id, now)
    _set_session_cookie(response, token)
    return LearnerIdentity(
        learner_id=learner_id,
        nickname=body.nickname,
        email=body.email,
        invite_code=invite_code,
        account_type="registered",
    )


@auth_router.post("/experience-login", response_model=LearnerIdentityView)
async def experience_login(body: ExperienceLoginRequest, response: Response) -> LearnerIdentity:
    now = utc_now()
    username, username_key = normalize_experience_username(body.username)
    code_hash = hash_experience_code(body.experience_code)
    async with get_engine().begin() as connection:
        code = (
            (
                await connection.execute(
                    sa.select(tables.experience_codes)
                    .where(tables.experience_codes.c.code_hash == code_hash)
                    .with_for_update()
                )
            )
            .mappings()
            .one_or_none()
        )
        if code is None or code["revoked_at"] is not None or code["expires_at"] <= now:
            raise HTTPException(status_code=400, detail="experience_code_invalid_or_unavailable")

        redemption = (
            (
                await connection.execute(
                    sa.select(tables.experience_code_redemptions).where(
                        tables.experience_code_redemptions.c.code_id == code["code_id"],
                        tables.experience_code_redemptions.c.username_key == username_key,
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if redemption is None:
            if code["used_count"] >= code["max_uses"]:
                raise HTTPException(
                    status_code=400,
                    detail="experience_code_invalid_or_unavailable",
                )
            learner_id = new_id("learner")
            identity_username = username
            await connection.execute(
                tables.learners.insert().values(
                    learner_id=learner_id,
                    nickname=username,
                    email=f"experience+{learner_id}@binnagent.invalid",
                    invite_code=generate_invite_code().replace("BINN-", "EXP-", 1),
                    invited_by_learner_id=None,
                    account_type="experience",
                    created_at=now,
                    updated_at=now,
                )
            )
            await connection.execute(
                tables.experience_code_redemptions.insert().values(
                    redemption_id=new_id("experience_redemption"),
                    code_id=code["code_id"],
                    learner_id=learner_id,
                    username=username,
                    username_key=username_key,
                    login_count=1,
                    redeemed_at=now,
                    last_login_at=now,
                )
            )
            await connection.execute(
                tables.experience_codes.update()
                .where(tables.experience_codes.c.code_id == code["code_id"])
                .values(used_count=code["used_count"] + 1, last_used_at=now)
            )
        else:
            learner_id = redemption["learner_id"]
            identity_username = redemption["username"]
            await connection.execute(
                tables.experience_code_redemptions.update()
                .where(
                    tables.experience_code_redemptions.c.redemption_id
                    == redemption["redemption_id"]
                )
                .values(login_count=redemption["login_count"] + 1, last_login_at=now)
            )
            await connection.execute(
                tables.experience_codes.update()
                .where(tables.experience_codes.c.code_id == code["code_id"])
                .values(last_used_at=now)
            )

        session_expires_at = min(
            code["expires_at"],
            now + timedelta(seconds=get_settings().session_ttl_seconds),
        )
        token = await issue_session(
            connection,
            learner_id,
            now,
            expires_at=session_expires_at,
        )
    _set_session_cookie(
        response,
        token,
        max_age=max(1, int((session_expires_at - now).total_seconds())),
    )
    return LearnerIdentity(
        learner_id=learner_id,
        nickname=identity_username,
        email="",
        invite_code="",
        account_type="experience",
    )


@auth_router.get("/session", response_model=LearnerIdentityView)
async def current_session(request: Request) -> LearnerIdentity:
    identity = await resolve_request_identity(request)
    if identity is None:
        raise HTTPException(status_code=401, detail="authentication_required")
    return identity


@auth_router.post("/logout", status_code=204)
async def logout(request: Request, response: Response) -> None:
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        async with get_engine().begin() as connection:
            await revoke_session(connection, token, utc_now())
    response.delete_cookie(settings.session_cookie_name, path="/")
