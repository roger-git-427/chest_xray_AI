"""Pequeño auxiliar para eventos de auditoría de seguridad y flujo de trabajo persistentes."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from api.models import AuditEvent


def record_audit(
    db: Session,
    action: str,
    *,
    actor_id: uuid.UUID | None = None,
    clinic_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: str | uuid.UUID | None = None,
    details: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            action=action,
            actor_id=actor_id,
            clinic_id=clinic_id,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=details,
        )
    )
