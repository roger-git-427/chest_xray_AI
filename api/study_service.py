"""Transaction-oriented study screening workflow."""

from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass

from fastapi import HTTPException
from PIL import Image
from sqlalchemy.orm import Session

import config
from api.audit import record_audit
from api.dicom_io import is_dicom_file, load_image_bytes
from api.models import (
    Report,
    ScreeningFinding,
    ScreeningRun,
    StoredFile,
    Study,
    StudyStatus,
    User,
    UserRole,
)
from api.registry import screen_image
from api.security import require_clinic_access
from api.storage import StorageBackend, StoredObject


@dataclass(frozen=True)
class ScreeningOutcome:
    study: Study
    run: ScreeningRun
    image: Image.Image


def resolve_conditions(requested: list[str]) -> list[str]:
    available = config.available_screening_conditions()
    selected = [item for item in (requested or available) if item in available]
    if not selected:
        raise HTTPException(400, "No valid conditions selected")
    return selected


def validate_patient(
    db: Session,
    patient_id: uuid.UUID | None,
    clinic_id: uuid.UUID,
) -> None:
    if patient_id is None:
        return
    patient = db.get(User, patient_id)
    if patient is None or patient.role != UserRole.PATIENT:
        raise HTTPException(400, "Patient is invalid")
    require_clinic_access(db, patient, clinic_id)


def _stored_file(original_name: str, obj: StoredObject) -> StoredFile:
    return StoredFile(
        storage_key=obj.key,
        original_name=original_name,
        content_type=obj.content_type,
        size_bytes=obj.size_bytes,
        sha256=obj.sha256,
    )


def _save_heatmap(
    db: Session,
    storage: StorageBackend,
    clinic_id: uuid.UUID,
    condition: str,
    data_url: str | None,
    created_keys: list[str],
) -> StoredFile | None:
    if not data_url or "," not in data_url:
        return None
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1])
    except Exception:
        return None
    obj = storage.put(
        raw,
        clinic_id=str(clinic_id),
        original_name=f"{condition}.jpg",
        content_type="image/jpeg",
        category="heatmaps",
    )
    created_keys.append(obj.key)
    row = _stored_file(f"{condition}.jpg", obj)
    db.add(row)
    db.flush()
    return row


def _persist_run(
    db: Session,
    storage: StorageBackend,
    study: Study,
    actor: User,
    results: list[dict],
    created_keys: list[str],
) -> ScreeningRun:
    run = ScreeningRun(
        study_id=study.id,
        created_by_id=actor.id,
        overall_flagged=any(result["flagged"] for result in results),
        model_version=config.MODEL_NAME,
    )
    db.add(run)
    db.flush()
    for result in results:
        heatmap = _save_heatmap(
            db,
            storage,
            study.clinic_id,
            result["condition"],
            result.get("heatmap_data_url"),
            created_keys,
        )
        run.findings.append(
            ScreeningFinding(
                condition=result["condition"],
                condition_label=result["condition_label"],
                probability=result["probability"],
                threshold=result["threshold"],
                flagged=result["flagged"],
                recommendation=result["recommendation"],
                heatmap_file_id=heatmap.id if heatmap else None,
            )
        )

    study.status = StudyStatus.SCREENED
    if study.report is None:
        study.report = Report(study_id=study.id, screening_run_id=run.id)
    else:
        study.report.screening_run_id = run.id
    return run


def screen_and_persist(
    db: Session,
    storage: StorageBackend,
    *,
    raw: bytes,
    filename: str,
    content_type: str | None,
    clinic_id: uuid.UUID,
    patient_id: uuid.UUID | None,
    actor: User,
    conditions: list[str],
    include_heatmaps: bool,
    audit_action: str,
    audit_details: dict | None = None,
) -> ScreeningOutcome:
    require_clinic_access(db, actor, clinic_id)
    validate_patient(db, patient_id, clinic_id)
    selected = resolve_conditions(conditions)
    try:
        image, dicom_metadata = load_image_bytes(raw, filename)
    except Exception as exc:
        raise HTTPException(400, f"Invalid image: {exc}") from exc

    obj = storage.put(
        raw,
        clinic_id=str(clinic_id),
        original_name=filename,
        content_type=content_type,
        category="studies",
    )
    created_keys = [obj.key]
    try:
        file_row = _stored_file(filename, obj)
        study = Study(
            clinic_id=clinic_id,
            patient_id=patient_id,
            uploaded_by_id=actor.id,
            file=file_row,
            source_filename=filename,
            external_patient_id=(
                (dicom_metadata or {}).get("patient_id")
                if dicom_metadata
                else None
            ),
            is_dicom=is_dicom_file(filename, content_type),
            dicom_metadata=dicom_metadata,
        )
        db.add(study)
        db.flush()
        results = screen_image(
            image,
            selected,
            include_heatmaps=include_heatmaps,
        )
        run = _persist_run(
            db,
            storage,
            study,
            actor,
            results,
            created_keys,
        )
        details = {"conditions": selected, **(audit_details or {})}
        record_audit(
            db,
            audit_action,
            actor_id=actor.id,
            clinic_id=clinic_id,
            entity_type="study",
            entity_id=study.id,
            details=details,
        )
        db.commit()
        db.refresh(study)
        db.refresh(run)
        return ScreeningOutcome(study=study, run=run, image=image)
    except Exception:
        db.rollback()
        for key in created_keys:
            storage.delete(key)
        raise
