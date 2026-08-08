import type {
  PersistedReport,
  PersistedStudy,
  ScreeningResponse,
} from '../api/client';

export type ReportDraft = {
  impression: string;
  recommendations: string;
  clinicianName: string;
};

export function toScreeningResponse(
  study: PersistedStudy,
): ScreeningResponse {
  return {
    filename: study.filename,
    study_id: study.id,
    screening_run_id: study.screening_run_id,
    status: study.status,
    overall_flagged: Boolean(study.overall_flagged),
    results: study.results ?? [],
    is_dicom: study.is_dicom,
    dicom_metadata: study.dicom_metadata ?? undefined,
    report: study.report,
  };
}

export function toReportDraft(report?: PersistedReport | null): ReportDraft {
  return {
    impression: report?.impression ?? '',
    recommendations: report?.recommendations ?? '',
    clinicianName: report?.clinician_name ?? '',
  };
}
