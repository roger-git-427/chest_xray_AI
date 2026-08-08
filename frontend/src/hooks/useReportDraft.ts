import { useCallback, useEffect, useRef, useState } from 'react';
import { savePersistedReport, type PersistedReport } from '../api/client';
import {
  isLegacyStudyReviewed,
  readLegacyReportDraft,
  writeLegacyReportDraft,
} from '../lib/legacyClinicalStorage';
import {
  toReportDraft,
  type ReportDraft,
} from '../lib/studyMappers';

export type { ReportDraft } from '../lib/studyMappers';
export {
  isLegacyStudyReviewed as isClinicallyReviewed,
  readLegacyReportDraft as readReportDraft,
};

export function useReportDraft(
  studyKey: string | undefined,
  studyId?: string,
  persisted?: PersistedReport | null,
) {
  const [draft, setDraft] = useState<ReportDraft>(() =>
    persisted ? toReportDraft(persisted) : readLegacyReportDraft(studyKey),
  );
  const dirty = useRef(false);

  useEffect(() => {
    dirty.current = false;
    setDraft(
      persisted ? toReportDraft(persisted) : readLegacyReportDraft(studyKey),
    );
  }, [studyKey, studyId, persisted?.id]);

  useEffect(() => {
    if (!studyId || !dirty.current) return;
    const timer = window.setTimeout(() => {
      void savePersistedReport(studyId, {
        impression: draft.impression,
        recommendations: draft.recommendations,
        clinician_name: draft.clinicianName,
      }).then(() => {
        dirty.current = false;
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draft, studyId]);

  const updateField = useCallback(
    (field: keyof ReportDraft, value: string) => {
      if (!studyKey) return;
      setDraft((prev) => {
        const next = { ...prev, [field]: value };
        dirty.current = true;
        if (!studyId) {
          writeLegacyReportDraft(studyKey, next);
        }
        return next;
      });
    },
    [studyKey, studyId],
  );

  return { draft, updateField };
}
