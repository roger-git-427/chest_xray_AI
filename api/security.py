"""Password hashing, revocable sessions, CSRF, and authorization helpers."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import ClinicMembership, User, UserRole, UserSession
from api.settings import settings

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters")
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def _token_hash(token: str) -> bytes:
    return hashlib.sha256(token.encode("utf-8")).digest()


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@dataclass(frozen=True)
class Principal:
    user: User
    session: UserSession


def create_session(db: Session, user: User) -> tuple[UserSession, str]:
    raw_token = secrets.token_urlsafe(48)
    session = UserSession(
        user_id=user.id,
        token_hash=_token_hash(raw_token),
        csrf_token=secrets.token_urlsafe(32),
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.session_days),
    )
    db.add(session)
    db.flush()
    return session, raw_token


def get_principal(
    session_cookie: str | None = Cookie(
        default=None, alias=settings.session_cookie_name
    ),
    db: Session = Depends(get_db),
) -> Principal:
    if not session_cookie:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")

    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == _token_hash(session_cookie)
        )
    )
    if (
        session is None
        or _aware(session.expires_at) <= datetime.now(timezone.utc)
        or not session.user.active
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    return Principal(user=session.user, session=session)


def require_csrf(
    request: Request,
    principal: Principal = Depends(get_principal),
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
    csrf_cookie: str | None = Cookie(
        default=None, alias=settings.csrf_cookie_name
    ),
) -> Principal:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return principal
    expected = principal.session.csrf_token
    if (
        not csrf_header
        or not csrf_cookie
        or not secrets.compare_digest(csrf_header, expected)
        or not secrets.compare_digest(csrf_cookie, expected)
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid CSRF token")
    return principal


def require_master(
    principal: Principal = Depends(require_csrf),
) -> Principal:
    if principal.user.role != UserRole.MASTER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Master access required")
    return principal


def user_has_clinic(
    db: Session, user: User, clinic_id: uuid.UUID
) -> bool:
    if user.role == UserRole.MASTER:
        return True
    return (
        db.scalar(
            select(ClinicMembership.id).where(
                ClinicMembership.user_id == user.id,
                ClinicMembership.clinic_id == clinic_id,
            )
        )
        is not None
    )


def require_clinic_access(
    db: Session, user: User, clinic_id: uuid.UUID
) -> None:
    if not user_has_clinic(db, user, clinic_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Clinic access denied")


def require_clinic_admin(
    db: Session, user: User, clinic_id: uuid.UUID
) -> None:
    if user.role == UserRole.MASTER:
        return
    if user.role != UserRole.ADMIN or not user_has_clinic(db, user, clinic_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Clinic administrator access required"
        )
