"""Endpoints persistentes de estudios, tamizaje e informes con alcance por inquilino."""

from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload, selectinload

from api.audit import record_audit
from api.database import get_db
from api.dicom_io import (
    encode_preview_data_url,
    is_dicom_file,
    load_image_bytes,
)
from api.images import resolve_image_file
from api.models import (
    Report,
    ReportStatus,
    ScreeningFinding,
    ScreeningRun,
    Study,
    StudyStatus,
    User,
    UserRole,
)
from api.security import (
    Principal,
    get_principal,
    require_clinic_access,
    require_csrf,
    require_master,
)
from api.storage import get_storage
from api.study_serializers import latest_screening_run, study_payload
from api.study_service import screen_and_persist

router = APIRouter(prefix="/api/studies", tags=["studies"])


class ReportBody(BaseModel):
    impression: str = ""
    recommendations: str = ""
    clinician_name: str = ""


class PathScreenBody(BaseModel):
    folder: str
    filename: str
    clinic_id: uuid.UUID
    patient_id: uuid.UUID | None = None


def _study_access(db: Session, user: User, study: Study) -> None:
    if user.role == UserRole.PATIENT:
        if (
            study.patient_id != user.id
            or study.report is None
            or study.report.status != ReportStatus.FINAL
        ):
            raise HTTPException(403, "Acceso al estudio denegado")
        return
    require_clinic_access(db, user, study.clinic_id)


STUDY_LOAD_OPTIONS = (
    joinedload(Study.report),
    joinedload(Study.file),
    selectinload(Study.screening_runs).selectinload(ScreeningRun.findings),
)


def _load_study(db: Session, study_id: uuid.UUID) -> Study:
    study = db.scalar(
        select(Study)
        .options(*STUDY_LOAD_OPTIONS)
        .where(Study.id == study_id)
    )
    if study is None:
        raise HTTPException(404, "Estudio no encontrado")
    return study


@router.post("/screen", status_code=status.HTTP_201_CREATED)
async def upload_and_screen(
    file: UploadFile = File(...),
    clinic_id: uuid.UUID = Form(...),
    patient_id: uuid.UUID | None = Form(default=None),
    conditions: list[str] = Query(default=[]),
    include_heatmaps: bool = Query(default=True),
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    if principal.user.role == UserRole.PATIENT:
        raise HTTPException(403, "Los pacientes no pueden subir estudios")

    raw = await file.read()
    if not raw:
        raise HTTPException(400, "El archivo está vacío")
    filename = file.filename or "study"
    dicom = is_dicom_file(filename, file.content_type)
    if not dicom and file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(400, "El archivo debe ser una imagen o DICOM")

    outcome = screen_and_persist(
        db,
        get_storage(),
        raw=raw,
        filename=filename,
        content_type=file.content_type,
        clinic_id=clinic_id,
        patient_id=patient_id,
        actor=principal.user,
        conditions=conditions,
        include_heatmaps=include_heatmaps,
        audit_action="study.screened",
    )
    payload = study_payload(outcome.study, outcome.run)
    payload["folder"] = None
    payload["preview_data_url"] = (
        encode_preview_data_url(outcome.image) if dicom else None
    )
    return payload


@router.post("/screen/path", status_code=status.HTTP_201_CREATED)
def import_and_screen_path(
    body: PathScreenBody,
    conditions: list[str] = Query(default=[]),
    include_heatmaps: bool = Query(default=True),
    principal: Principal = Depends(require_master),
    db: Session = Depends(get_db),
):
    path = resolve_image_file(body.folder, body.filename)
    raw = path.read_bytes()
    outcome = screen_and_persist(
        db,
        get_storage(),
        raw=raw,
        filename=body.filename,
        content_type=None,
        clinic_id=body.clinic_id,
        patient_id=body.patient_id,
        actor=principal.user,
        conditions=conditions,
        include_heatmaps=include_heatmaps,
        audit_action="study.imported_and_screened",
        audit_details={"source": "local_path"},
    )
    payload = study_payload(outcome.study, outcome.run)
    payload["folder"] = body.folder
    return payload


@router.get("")
def list_studies(
    clinic_id: uuid.UUID | None = Query(default=None),
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    query = (
        select(Study)
        .options(*STUDY_LOAD_OPTIONS)
        .order_by(desc(Study.created_at))
    )
    if principal.user.role == UserRole.PATIENT:
        query = (
            query.join(Report)
            .where(
                Study.patient_id == principal.user.id,
                Report.status == ReportStatus.FINAL,
            )
        )
        if clinic_id:
            require_clinic_access(db, principal.user, clinic_id)
            query = query.where(Study.clinic_id == clinic_id)
    else:
        if clinic_id is None:
            if principal.user.role != UserRole.MASTER:
                raise HTTPException(400, "Se requiere clinic_id")
        else:
            require_clinic_access(db, principal.user, clinic_id)
            query = query.where(Study.clinic_id == clinic_id)

    studies = db.scalars(query.limit(250)).unique().all()
    return {
        "studies": [
            study_payload(study, latest_screening_run(study))
            for study in studies
        ]
    }


@router.get("/{study_id}")
def get_study(
    study_id: uuid.UUID,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    study = _load_study(db, study_id)
    _study_access(db, principal.user, study)
    record_audit(
        db,
        "study.viewed",
        actor_id=principal.user.id,
        clinic_id=study.clinic_id,
        entity_type="study",
        entity_id=study.id,
    )
    db.commit()
    return study_payload(study, latest_screening_run(study))


@router.get("/{study_id}/image")
def get_study_image(
    study_id: uuid.UUID,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    study = _load_study(db, study_id)
    _study_access(db, principal.user, study)
    raw = get_storage().get(study.file.storage_key)
    if study.is_dicom:
        image, _ = load_image_bytes(raw, study.source_filename)
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=92)
        return Response(buf.getvalue(), media_type="image/jpeg")
    return Response(raw, media_type=study.file.content_type)


@router.get("/heatmaps/{file_id}")
def get_heatmap(
    file_id: uuid.UUID,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    finding = db.scalar(
        select(ScreeningFinding)
        .options(
            joinedload(ScreeningFinding.heatmap_file),
            joinedload(ScreeningFinding.screening_run)
            .joinedload(ScreeningRun.study)
            .joinedload(Study.report),
        )
        .where(ScreeningFinding.heatmap_file_id == file_id)
    )
    if finding is None or finding.heatmap_file is None:
        raise HTTPException(404, "Mapa de calor no encontrado")
    _study_access(db, principal.user, finding.screening_run.study)
    raw = get_storage().get(finding.heatmap_file.storage_key)
    return Response(raw, media_type=finding.heatmap_file.content_type)


@router.put("/{study_id}/report")
def save_report(
    study_id: uuid.UUID,
    body: ReportBody,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    if principal.user.role == UserRole.PATIENT:
        raise HTTPException(403, "Los pacientes no pueden editar informes")
    study = db.get(Study, study_id)
    if study is None:
        raise HTTPException(404, "Estudio no encontrado")
    require_clinic_access(db, principal.user, study.clinic_id)
    report = study.report or Report(study_id=study.id)
    report.impression = body.impression
    report.recommendations = body.recommendations
    report.clinician_name = body.clinician_name
    db.add(report)
    record_audit(
        db,
        "report.saved",
        actor_id=principal.user.id,
        clinic_id=study.clinic_id,
        entity_type="study",
        entity_id=study.id,
    )
    db.commit()
    db.refresh(report)
    return study_payload(study, latest_screening_run(study))["report"]


@router.post("/{study_id}/review")
def review_report(
    study_id: uuid.UUID,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    if principal.user.role == UserRole.PATIENT:
        raise HTTPException(403, "Los pacientes no pueden revisar informes")
    study = db.get(Study, study_id)
    if study is None:
        raise HTTPException(404, "Estudio no encontrado")
    require_clinic_access(db, principal.user, study.clinic_id)
    report = study.report or Report(study_id=study.id)
    report.status = ReportStatus.FINAL
    report.reviewed_by_id = principal.user.id
    report.reviewed_at = datetime.now(timezone.utc)
    study.status = StudyStatus.REVIEWED
    db.add(report)
    record_audit(
        db,
        "report.finalized",
        actor_id=principal.user.id,
        clinic_id=study.clinic_id,
        entity_type="study",
        entity_id=study.id,
    )
    db.commit()
    return study_payload(study, latest_screening_run(study))


@router.post("/{study_id}/export")
def mark_exported(
    study_id: uuid.UUID,
    principal: Principal = Depends(require_csrf),
    db: Session = Depends(get_db),
):
    study = db.get(Study, study_id)
    if study is None:
        raise HTTPException(404, "Estudio no encontrado")
    _study_access(db, principal.user, study)
    if principal.user.role != UserRole.PATIENT:
        study.status = StudyStatus.EXPORTED
    record_audit(
        db,
        "report.exported",
        actor_id=principal.user.id,
        clinic_id=study.clinic_id,
        entity_type="study",
        entity_id=study.id,
    )
    db.commit()
    return {"ok": True}
