"""Endpoints de autenticación basados en sesiones de base de datos revocables."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.audit import record_audit
from api.database import get_db
from api.models import ClinicMembership, User
from api.security import (
    Principal,
    create_session,
    get_principal,
    require_csrf,
    verify_password,
)
from api.settings import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginBody(BaseModel):
    email: str
    password: str


class ClinicSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str


def user_payload(db: Session, user: User) -> dict:
    memberships = db.scalars(
        select(ClinicMembership).where(ClinicMembership.user_id == user.id)
    ).all()
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "role": user.role.value,
        "clinics": [
            {
                "id": str(item.clinic.id),
                "name": item.clinic.name,
                "slug": item.clinic.slug,
            }
            for item in memberships
            if item.clinic.active
        ],
    }


@router.post("/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not user.active or not verify_password(
        body.password, user.password_hash
    ):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Correo o contraseña no válidos"
        )

    session, token = create_session(db, user)
    record_audit(db, "auth.login", actor_id=user.id, entity_type="user", entity_id=user.id)
    db.commit()

    cookie_options = {
        "secure": settings.secure_cookies,
        "samesite": "strict",
        "path": "/",
        "max_age": settings.session_days * 86400,
    }
    response.set_cookie(
        settings.session_cookie_name,
        token,
        httponly=True,
        **cookie_options,
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        session.csrf_token,
        httponly=False,
        **cookie_options,
    )
    return {"user": user_payload(db, user)}


@router.get("/me")
def me(
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    return {"user": user_payload(db, principal.user)}


@router.post("/logout")
def logout(
    response: Response,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    record_audit(
        db,
        "auth.logout",
        actor_id=principal.user.id,
        entity_type="user",
        entity_id=principal.user.id,
    )
    db.delete(principal.session)
    db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")
    return {"ok": True}
