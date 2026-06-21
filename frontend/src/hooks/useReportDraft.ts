import { useCallback, useEffect, useState } from 'react';

export type ReportDraft = {
  impression: string;
  recommendations: string;
  clinicianName: string;
};

const STORAGE_PREFIX = 'byteai-report-draft-';

const EMPTY: ReportDraft = {
  impression: '',
  recommendations: '',
  clinicianName: '',
};

function readDraft(studyKey: string | undefined): ReportDraft {
  if (!studyKey) return EMPTY;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studyKey}`);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

export function useReportDraft(studyKey: string | undefined) {
  const [draft, setDraft] = useState<ReportDraft>(() => readDraft(studyKey));

  useEffect(() => {
    setDraft(readDraft(studyKey));
  }, [studyKey]);

  const updateField = useCallback(
    (field: keyof ReportDraft, value: string) => {
      if (!studyKey) return;
      setDraft((prev) => {
        const next = { ...prev, [field]: value };
        localStorage.setItem(`${STORAGE_PREFIX}${studyKey}`, JSON.stringify(next));
        return next;
      });
    },
    [studyKey],
  );

  return { draft, updateField };
}
