"""Authorized audit event queries."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import AuditEvent, UserRole
from api.security import Principal, get_principal, require_clinic_admin

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def list_audit_events(
    clinic_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    query = select(AuditEvent).order_by(desc(AuditEvent.created_at))
    if principal.user.role != UserRole.MASTER:
        if clinic_id is None:
            raise HTTPException(400, "clinic_id is required")
        require_clinic_admin(db, principal.user, clinic_id)
        query = query.where(AuditEvent.clinic_id == clinic_id)
    elif clinic_id:
        query = query.where(AuditEvent.clinic_id == clinic_id)

    events = db.scalars(query.limit(limit)).all()
    return {
        "events": [
            {
                "id": str(event.id),
                "clinic_id": str(event.clinic_id) if event.clinic_id else None,
                "actor_id": str(event.actor_id) if event.actor_id else None,
                "action": event.action,
                "entity_type": event.entity_type,
                "entity_id": event.entity_id,
                "details": event.details,
                "created_at": event.created_at.isoformat(),
            }
            for event in events
        ]
    }
