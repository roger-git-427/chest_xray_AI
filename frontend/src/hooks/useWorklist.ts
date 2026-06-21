import { useCallback, useEffect, useState } from 'react';

export type WorklistStatus = 'pending' | 'screened' | 'reviewed' | 'exported';

export type WorklistEntry = {
  status: WorklistStatus;
  updatedAt: string;
};

const STORAGE_KEY = 'byteai-worklist-v1';

function readStore(): Record<string, WorklistEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, WorklistEntry>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, WorklistEntry>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

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
  const [entries, setEntries] = useState<Record<string, WorklistEntry>>(readStore);

  useEffect(() => {
    writeStore(entries);
  }, [entries]);

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
