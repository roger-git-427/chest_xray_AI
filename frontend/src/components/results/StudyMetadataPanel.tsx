import type {
  ScreeningResponse,
  StudyMetadata,
} from '../../api/client';
import { es } from '../../i18n/es';

type Props = {
  response: ScreeningResponse;
  metadata?: StudyMetadata | null;
  sourceLabel?: string;
};

function MetaField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="text-[var(--text-faint)]">{label}:</span> {value}
    </p>
  );
}

export function StudyMetadataPanel({
  response,
  metadata,
  sourceLabel,
}: Props) {
  const dicom = response.is_dicom ? response.dicom_metadata : null;
  if (dicom) {
    return (
      <div className="mb-4 grid gap-2 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 text-xs sm:grid-cols-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 sm:col-span-2 dark:text-teal-400">
          {es.dicomMetaTitle}
        </p>
        <MetaField label={es.studyMetaPatient} value={dicom.patient_id} />
        <MetaField label={es.studyMetaAge} value={dicom.patient_age} />
        <MetaField label={es.studyMetaGender} value={dicom.patient_sex} />
        <MetaField label={es.studyMetaView} value={dicom.view_position} />
        <MetaField label={es.dicomStudyDate} value={dicom.study_date} />
        <MetaField label={es.dicomModality} value={dicom.modality} />
      </div>
    );
  }
  if (metadata) {
    return (
      <div className="mb-4 grid gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-xs sm:grid-cols-2">
        <MetaField label={es.studyMetaPatient} value={metadata.patient_id} />
        <MetaField label={es.studyMetaAge} value={metadata.age} />
        <MetaField label={es.studyMetaGender} value={metadata.gender} />
        <MetaField label={es.studyMetaView} value={metadata.view_position} />
        {metadata.finding_labels && (
          <p className="sm:col-span-2">
            <span className="text-[var(--text-faint)]">
              {es.studyMetaFindings}:
            </span>{' '}
            <span className="text-[var(--text-muted)]">
              {metadata.finding_labels}
            </span>
          </p>
        )}
      </div>
    );
  }
  return sourceLabel ? (
    <p className="mb-4 text-xs text-[var(--text-faint)]">
      {es.studyMetaUnavailable}
    </p>
  ) : null;
}
