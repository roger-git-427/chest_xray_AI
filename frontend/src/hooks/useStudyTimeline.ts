import { useCallback, useEffect, useState } from 'react';
import type { ScreeningResponse } from '../api/client';
import { useStudyData } from '../context/StudyDataContext';
import { toScreeningResponse } from '../lib/studyMappers';
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

const MAX_ENTRIES = 20;

export type TimelineAddContext = {
  tab: WorkspaceTab;
  folder?: string;
  filename?: string;
  imageUrl?: string | null;
};

export function useStudyTimeline() {
  const { studies, refreshStudies } = useStudyData();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    setEntries(
      studies
        .filter((study) => study.results?.length)
        .slice(0, MAX_ENTRIES)
        .map((study) => {
          const response = toScreeningResponse(study);
          return {
            id: study.id,
            at: study.created_at,
            studyLabel: study.filename,
            overallFlagged: Boolean(study.overall_flagged),
            findings: response.results.map((result) => ({
              label: result.condition_label,
              probability: result.probability,
              flagged: result.flagged,
            })),
            screeningResponse: response,
            tab: 'upload',
            filename: study.filename,
            imageUrl: study.image_url,
          };
        }),
    );
  }, [studies]);

  const addEntry = useCallback(
    (
      studyLabel: string,
      response: ScreeningResponse,
      context: TimelineAddContext,
    ) => {
      const entry: TimelineEntry = {
        id:
          response.study_id ??
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      setEntries((prev) => [
        entry,
        ...prev.filter((item) => item.id !== entry.id),
      ].slice(0, MAX_ENTRIES));
    },
    [],
  );

  const clear = useCallback(() => setEntries([]), []);

  return { entries, addEntry, clear, refresh: refreshStudies };
}
