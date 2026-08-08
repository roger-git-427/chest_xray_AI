import { useCallback, useEffect, useState } from 'react';
import type { WorklistStatus } from '../api/client';
import { useStudyData } from '../context/StudyDataContext';

export type { WorklistStatus } from '../api/client';

export type WorklistEntry = {
  status: WorklistStatus;
  updatedAt: string;
};

function statusRank(status: WorklistStatus): number {
  switch (status) {
    case 'exported':
      return 4;
    case 'reviewed':
      return 3;
    case 'screened':
      return 2;
    default:
      return 1;
  }
}

export function useWorklist() {
  const { studies } = useStudyData();
  const [entries, setEntries] = useState<Record<string, WorklistEntry>>({});

  useEffect(() => {
    setEntries((current) =>
      Object.fromEntries(
        studies.map((study) => {
          const local = current[study.filename];
          return [
            study.filename,
            local && statusRank(local.status) > statusRank(study.status)
              ? local
              : { status: study.status, updatedAt: study.created_at },
          ];
        }),
      ),
    );
  }, [studies]);

  const getStatus = useCallback(
    (filename: string): WorklistStatus => entries[filename]?.status ?? 'pending',
    [entries],
  );

  const setStatus = useCallback((filename: string, status: WorklistStatus) => {
    setEntries((prev) => {
      const current = prev[filename]?.status ?? 'pending';
      if (statusRank(status) < statusRank(current)) return prev;
      return {
        ...prev,
        [filename]: { status, updatedAt: new Date().toISOString() },
      };
    });
  }, []);

  const markScreened = useCallback(
    (filename: string) => setStatus(filename, 'screened'),
    [setStatus],
  );

  const markReviewed = useCallback(
    (filename: string) => setStatus(filename, 'reviewed'),
    [setStatus],
  );

  const markExported = useCallback(
    (filename: string) => setStatus(filename, 'exported'),
    [setStatus],
  );

  return {
    getStatus,
    setStatus,
    markScreened,
    markReviewed,
    markExported,
  };
}
