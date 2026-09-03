"""Serialización JSON canónica para estudios persistidos."""

from __future__ import annotations

from api.models import ScreeningRun, Study


def latest_screening_run(study: Study) -> ScreeningRun | None:
    if not study.screening_runs:
        return None
    return max(study.screening_runs, key=lambda run: run.created_at)


def screening_run_payload(run: ScreeningRun) -> dict:
    return {
        "screening_run_id": str(run.id),
        "overall_flagged": run.overall_flagged,
        "screened_at": run.created_at.isoformat(),
        "results": [
            {
                "condition": finding.condition,
                "condition_label": finding.condition_label,
                "probability": finding.probability,
                "threshold": finding.threshold,
                "flagged": finding.flagged,
                "recommendation": finding.recommendation,
                "heatmap_data_url": (
                    f"/api/studies/heatmaps/{finding.heatmap_file_id}"
                    if finding.heatmap_file_id
                    else None
                ),
            }
            for finding in run.findings
        ],
    }


def study_payload(
    study: Study,
    run: ScreeningRun | None = None,
) -> dict:
    report = study.report
    payload = {
        "id": str(study.id),
        "study_id": str(study.id),
        "clinic_id": str(study.clinic_id),
        "patient_id": str(study.patient_id) if study.patient_id else None,
        "filename": study.source_filename,
        "status": study.status.value,
        "is_dicom": study.is_dicom,
        "dicom_metadata": study.dicom_metadata,
        "created_at": study.created_at.isoformat(),
        "image_url": f"/api/studies/{study.id}/image",
        "report": (
            {
                "id": str(report.id),
                "impression": report.impression,
                "recommendations": report.recommendations,
                "clinician_name": report.clinician_name,
                "status": report.status.value,
                "reviewed_at": (
                    report.reviewed_at.isoformat()
                    if report.reviewed_at
                    else None
                ),
            }
            if report
            else None
        ),
    }
    if run:
        payload.update(screening_run_payload(run))
    return payload
