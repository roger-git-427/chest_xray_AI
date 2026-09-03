"""Endpoints de administración de clínicas y membresías."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.audit import record_audit
from api.database import get_db
from api.models import Clinic, ClinicMembership, User, UserRole
from api.security import (
    Principal,
    get_principal,
    hash_password,
    require_clinic_admin,
    require_csrf,
)

router = APIRouter(prefix="/api/clinics", tags=["clinics"])


class ClinicCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str | None = Field(default=None, max_length=100)


class ClinicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    active: bool | None = None


class MemberCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=2, max_length=200)
    role: UserRole
    password: str | None = Field(default=None, min_length=5)


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    if not slug:
        raise HTTPException(400, "El slug de la clínica no es válido")
    return slug


def clinic_payload(clinic: Clinic) -> dict:
    return {
        "id": str(clinic.id),
        "name": clinic.name,
        "slug": clinic.slug,
        "active": clinic.active,
        "created_at": clinic.created_at.isoformat(),
    }


def member_payload(membership: ClinicMembership) -> dict:
    user = membership.user
    return {
        "membership_id": str(membership.id),
        "id": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "role": user.role.value,
        "active": user.active,
    }


@router.get("")
def list_clinics(
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    if principal.user.role == UserRole.MASTER:
        clinics = db.scalars(select(Clinic).order_by(Clinic.name)).all()
    else:
        clinics = db.scalars(
            select(Clinic)
            .join(ClinicMembership)
            .where(ClinicMembership.user_id == principal.user.id)
            .order_by(Clinic.name)
        ).all()
    return {"clinics": [clinic_payload(c) for c in clinics]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_clinic(
    body: ClinicCreate,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    if principal.user.role != UserRole.MASTER:
        raise HTTPException(403, "Se requiere acceso Master")

    slug = _slug(body.slug or body.name)
    if db.scalar(select(Clinic.id).where(Clinic.slug == slug)):
        raise HTTPException(409, "El slug de la clínica ya existe")
    clinic = Clinic(name=body.name.strip(), slug=slug)
    db.add(clinic)
    db.flush()
    record_audit(
        db,
        "clinic.created",
        actor_id=principal.user.id,
        clinic_id=clinic.id,
        entity_type="clinic",
        entity_id=clinic.id,
    )
    db.commit()
    return clinic_payload(clinic)


@router.patch("/{clinic_id}")
def update_clinic(
    clinic_id: uuid.UUID,
    body: ClinicUpdate,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    if principal.user.role != UserRole.MASTER:
        raise HTTPException(403, "Se requiere acceso Master")
    clinic = db.get(Clinic, clinic_id)
    if clinic is None:
        raise HTTPException(404, "Clínica no encontrada")
    if body.name is not None:
        clinic.name = body.name.strip()
    if body.active is not None:
        clinic.active = body.active
    record_audit(
        db,
        "clinic.updated",
        actor_id=principal.user.id,
        clinic_id=clinic.id,
        entity_type="clinic",
        entity_id=clinic.id,
    )
    db.commit()
    return clinic_payload(clinic)


@router.get("/{clinic_id}/members")
def list_members(
    clinic_id: uuid.UUID,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    require_clinic_admin(db, principal.user, clinic_id)
    memberships = db.scalars(
        select(ClinicMembership)
        .where(ClinicMembership.clinic_id == clinic_id)
        .order_by(ClinicMembership.created_at)
    ).all()
    return {"members": [member_payload(m) for m in memberships]}


@router.post("/{clinic_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    clinic_id: uuid.UUID,
    body: MemberCreate,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    require_clinic_admin(db, principal.user, clinic_id)
    clinic = db.get(Clinic, clinic_id)
    if clinic is None or not clinic.active:
        raise HTTPException(404, "Clínica no encontrada")
    if body.role == UserRole.MASTER:
        raise HTTPException(400, "Los usuarios Master no son miembros de clínica")
    if principal.user.role == UserRole.ADMIN and body.role != UserRole.PATIENT:
        raise HTTPException(403, "Los administradores solo pueden crear pacientes")

    email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        if not body.password:
            raise HTTPException(400, "Se requiere contraseña para un usuario nuevo")
        user = User(
            email=email,
            full_name=body.full_name.strip(),
            role=body.role,
            password_hash=hash_password(body.password),
            active=True,
        )
        db.add(user)
        db.flush()
    elif user.role != body.role:
        raise HTTPException(409, "El usuario existente tiene un rol diferente")

    existing = db.scalar(
        select(ClinicMembership).where(
            ClinicMembership.clinic_id == clinic_id,
            ClinicMembership.user_id == user.id,
        )
    )
    if existing:
        raise HTTPException(409, "El usuario ya es miembro de la clínica")

    membership = ClinicMembership(clinic_id=clinic_id, user_id=user.id)
    db.add(membership)
    db.flush()
    record_audit(
        db,
        "clinic.member_added",
        actor_id=principal.user.id,
        clinic_id=clinic_id,
        entity_type="user",
        entity_id=user.id,
        details={"role": user.role.value},
    )
    db.commit()
    return member_payload(membership)


@router.delete("/{clinic_id}/members/{user_id}")
def remove_member(
    clinic_id: uuid.UUID,
    user_id: uuid.UUID,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    require_clinic_admin(db, principal.user, clinic_id)
    membership = db.scalar(
        select(ClinicMembership).where(
            ClinicMembership.clinic_id == clinic_id,
            ClinicMembership.user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(404, "Membresía no encontrada")
    if principal.user.id == user_id:
        raise HTTPException(400, "No puede eliminar su propia membresía")
    db.delete(membership)
    record_audit(
        db,
        "clinic.member_removed",
        actor_id=principal.user.id,
        clinic_id=clinic_id,
        entity_type="user",
        entity_id=user_id,
    )
    db.commit()
    return {"ok": True}
