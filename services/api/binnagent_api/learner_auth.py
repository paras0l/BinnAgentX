import asyncio
import base64
import hashlib
import hmac
import json
import logging
import re
import secrets
import smtplib
import ssl
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from uuid import uuid4

import sqlalchemy as sa
from fastapi import Request
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from binnagent_api.database import get_engine
from binnagent_api.settings import get_settings
from binnagent_api.vertical_slice import tables

logger = logging.getLogger(__name__)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
EXPERIENCE_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
SYNTHETIC_LEARNER_ID = "learner_synthetic_local"


class EmailDeliveryError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class LearnerIdentity:
    learner_id: str
    nickname: str
    email: str
    invite_code: str
    account_type: str


def normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if not EMAIL_PATTERN.fullmatch(normalized):
        raise ValueError("valid_email_required")
    return normalized


def utc_now() -> datetime:
    return datetime.now(UTC)


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_code_salt() -> str:
    return secrets.token_hex(16)


def hash_verification_code(*, email: str, code: str, salt: str) -> str:
    secret = get_settings().email_verification_secret.get_secret_value()
    return hmac.new(secret.encode(), f"{email}:{code}:{salt}".encode(), hashlib.sha256).hexdigest()


def verification_code_matches(*, email: str, code: str, salt: str, expected_hash: str) -> bool:
    return hmac.compare_digest(
        hash_verification_code(email=email, code=code, salt=salt),
        expected_hash,
    )


def create_email_verification_token(*, email: str, now: datetime) -> str:
    payload = {
        "email": email,
        "exp": int(now.timestamp()) + get_settings().email_verification_token_ttl_seconds,
        "nonce": secrets.token_urlsafe(12),
    }
    encoded = _base64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signature = hmac.new(
        get_settings().email_verification_secret.get_secret_value().encode(),
        encoded.encode(),
        hashlib.sha256,
    ).digest()
    return f"{encoded}.{_base64url_encode(signature)}"


def email_verification_token_is_valid(*, email: str, token: str, now: datetime) -> bool:
    try:
        encoded, provided = token.split(".", maxsplit=1)
        expected = hmac.new(
            get_settings().email_verification_secret.get_secret_value().encode(),
            encoded.encode(),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected, _base64url_decode(provided)):
            return False
        payload = json.loads(_base64url_decode(encoded))
        return payload.get("email") == email and int(payload.get("exp", 0)) >= int(now.timestamp())
    except (TypeError, ValueError, json.JSONDecodeError):
        return False


def generate_invite_code() -> str:
    suffix = "".join(secrets.choice(INVITE_ALPHABET) for _ in range(10))
    return f"BINN-{suffix}"


def generate_experience_code() -> str:
    suffix = "".join(secrets.choice(EXPERIENCE_CODE_ALPHABET) for _ in range(10))
    return f"TRY-{suffix[:5]}-{suffix[5:]}"


def normalize_experience_code(value: str) -> str:
    return value.strip().upper()


def hash_experience_code(value: str) -> str:
    secret = get_settings().experience_code_secret.get_secret_value()
    normalized = normalize_experience_code(value)
    return hmac.new(secret.encode(), normalized.encode(), hashlib.sha256).hexdigest()


def normalize_experience_username(value: str) -> tuple[str, str]:
    username = " ".join(unicodedata.normalize("NFKC", value).strip().split())
    if not 1 <= len(username) <= 100:
        raise ValueError("experience_username_required")
    return username, username.casefold()


def normalize_invite_code(value: str) -> str:
    normalized = value.strip().upper()
    if not normalized:
        raise ValueError("invite_code_required")
    return normalized


async def issue_session(
    connection: AsyncConnection,
    learner_id: str,
    now: datetime,
    *,
    expires_at: datetime | None = None,
) -> str:
    token = secrets.token_urlsafe(32)
    await connection.execute(
        tables.learner_sessions.insert().values(
            token_hash=hash_session_token(token),
            learner_id=learner_id,
            created_at=now,
            expires_at=expires_at or now + timedelta(seconds=get_settings().session_ttl_seconds),
            revoked_at=None,
        )
    )
    return token


async def resolve_request_identity(request: Request) -> LearnerIdentity | None:
    settings = get_settings()
    if settings.learner_identity_adapter == "synthetic":
        return LearnerIdentity(
            learner_id=SYNTHETIC_LEARNER_ID,
            nickname="本地学习者",
            email="local@binnagent.invalid",
            invite_code="BINN-LOCAL",
            account_type="registered",
        )
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        return None
    async with get_engine().connect() as connection:
        return await resolve_session_identity(connection, token, utc_now())


async def resolve_session_identity(
    connection: AsyncConnection,
    token: str,
    now: datetime,
) -> LearnerIdentity | None:
    row = (
        (
            await connection.execute(
                sa.select(
                    tables.learners.c.learner_id,
                    tables.learners.c.nickname,
                    tables.learners.c.email,
                    tables.learners.c.invite_code,
                    tables.learners.c.account_type,
                )
                .select_from(
                    tables.learner_sessions.join(
                        tables.learners,
                        tables.learners.c.learner_id == tables.learner_sessions.c.learner_id,
                    )
                    .outerjoin(
                        tables.experience_code_redemptions,
                        tables.experience_code_redemptions.c.learner_id
                        == tables.learners.c.learner_id,
                    )
                    .outerjoin(
                        tables.experience_codes,
                        tables.experience_codes.c.code_id
                        == tables.experience_code_redemptions.c.code_id,
                    )
                )
                .where(
                    tables.learner_sessions.c.token_hash == hash_session_token(token),
                    tables.learner_sessions.c.revoked_at.is_(None),
                    tables.learner_sessions.c.expires_at > now,
                    sa.or_(
                        tables.learners.c.account_type == "registered",
                        sa.and_(
                            tables.learners.c.account_type == "experience",
                            tables.experience_codes.c.revoked_at.is_(None),
                            tables.experience_codes.c.expires_at > now,
                        ),
                    ),
                )
            )
        )
        .mappings()
        .one_or_none()
    )
    if row is None:
        return None
    values = dict(row)
    if values["account_type"] == "experience":
        values["email"] = ""
        values["invite_code"] = ""
    return LearnerIdentity(**values)


async def ensure_identity_learner(
    connection: AsyncConnection,
    identity: LearnerIdentity,
    now: datetime,
) -> None:
    await connection.execute(
        pg_insert(tables.learners)
        .values(
            learner_id=identity.learner_id,
            nickname=identity.nickname,
            email=identity.email,
            invite_code=identity.invite_code,
            invited_by_learner_id=None,
            account_type="registered",
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(index_elements=["learner_id"])
    )


async def revoke_session(connection: AsyncConnection, token: str, now: datetime) -> None:
    await connection.execute(
        tables.learner_sessions.update()
        .where(
            tables.learner_sessions.c.token_hash == hash_session_token(token),
            tables.learner_sessions.c.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def deliver_verification_code(*, email: str, code: str) -> None:
    settings = get_settings()
    if settings.email_delivery_mode == "console":
        logger.warning("BinnAgent email verification code for %s: %s", email, code)
        return
    if not settings.smtp_host or not settings.smtp_from_address:
        raise EmailDeliveryError("smtp_not_configured")
    try:
        await asyncio.to_thread(_deliver_via_smtp, email, code)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("verification_email_delivery_failed") from exc


def _deliver_via_smtp(email: str, code: str) -> None:
    settings = get_settings()
    host = settings.smtp_host
    if not host:
        raise EmailDeliveryError("smtp_not_configured")
    message = EmailMessage()
    message["Subject"] = "BinnAgent 考研英语邮箱验证码"
    message["From"] = settings.smtp_from_address
    message["To"] = email
    message.set_content(
        f"你正在登录 BinnAgent 考研英语。\n\n验证码: {code}\n"
        f"验证码将在 {settings.email_verification_code_ttl_seconds // 60} 分钟后失效。"
    )
    if settings.smtp_use_ssl:
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(
            host,
            settings.smtp_port,
            timeout=10,
            context=ssl.create_default_context(),
        )
    else:
        smtp = smtplib.SMTP(host, settings.smtp_port, timeout=10)
    with smtp:
        if settings.smtp_starttls and not settings.smtp_use_ssl:
            smtp.starttls(context=ssl.create_default_context())
        if settings.smtp_username:
            password = settings.smtp_password.get_secret_value() if settings.smtp_password else ""
            smtp.login(settings.smtp_username, password)
        smtp.send_message(message)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def _base64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
