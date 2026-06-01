import { useCallback, useEffect, useState } from 'react';
import type { ScreeningResponse } from '../api/client';
import type { WorkspaceTab } from '../types/workspace';

export type TimelineEntry = {
  id: string;
  at: string;
  studyLabel: string;
  overallFlagged: boolean;
  findings: { label: string; probability: number; flagged: boolean }[];
  screeningResponse: ScreeningResponse;
  tab: WorkspaceTab;
  folder?: string;
  filename?: string;
  imageUrl?: string | null;
};

const STORAGE_KEY = 'byteai-timeline-v2';
const LEGACY_STORAGE_KEY = 'byteai-timeline';
const MAX_ENTRIES = 20;

function normalizeEntry(raw: unknown): TimelineEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Partial<TimelineEntry> & {
    screeningResponse?: ScreeningResponse;
  };

  const response = e.screeningResponse;
  if (!e.id || !e.studyLabel || !response?.results?.length) return null;

  return {
    id: e.id,
    at: e.at ?? new Date().toISOString(),
    studyLabel: e.studyLabel,
    overallFlagged: Boolean(e.overallFlagged ?? response.overall_flagged),
    findings:
      e.findings ??
      response.results.map((r) => ({
        label: r.condition_label,
        probability: r.probability,
        flagged: r.flagged,
      })),
    screeningResponse: response,
    tab: e.tab === 'upload' ? 'upload' : 'folder',
    folder: e.folder,
    filename: e.filename,
    imageUrl: e.imageUrl,
  };
}

function loadFromKey(key: string): TimelineEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((e): e is TimelineEntry => e !== null);
  } catch {
    return [];
  }
}

function load(): TimelineEntry[] {
  const current = loadFromKey(STORAGE_KEY);
  if (current.length > 0) return current;

  const legacy = loadFromKey(LEGACY_STORAGE_KEY);
  if (legacy.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore quota errors */
    }
    return legacy;
  }
  return [];
}

export type TimelineAddContext = {
  tab: WorkspaceTab;
  folder?: string;
  filename?: string;
  imageUrl?: string | null;
};

export function useStudyTimeline() {
  const [entries, setEntries] = useState<TimelineEntry[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const addEntry = useCallback(
    (
      studyLabel: string,
      response: ScreeningResponse,
      context: TimelineAddContext,
    ) => {
      const entry: TimelineEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        studyLabel,
        overallFlagged: response.overall_flagged,
        findings: response.results.map((r) => ({
          label: r.condition_label,
          probability: r.probability,
          flagged: r.flagged,
        })),
        screeningResponse: response,
        tab: context.tab,
        folder: context.folder,
        filename: context.filename,
        imageUrl: context.imageUrl,
      };
      setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
    },
    [],
  );

  const clear = useCallback(() => setEntries([]), []);

  return { entries, addEntry, clear };
}
