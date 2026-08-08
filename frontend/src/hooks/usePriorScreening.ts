import { useCallback, useEffect, useState } from 'react';
import {
  imageContentUrl,
  screenImageFromPath,
  type ScreeningResponse,
} from '../api/client';
import type { WorkspaceTab } from '../types/workspace';
import type {
  TimelineAddContext,
  TimelineEntry,
} from './useStudyTimeline';
import { useStudyMeta } from './useStudyMeta';

type AddTimelineEntry = (
  label: string,
  response: ScreeningResponse,
  context: TimelineAddContext,
) => void;

export function usePriorScreening({
  studyFilename,
  tab,
  resolvedFolder,
  conditions,
  timelineEntries,
  addTimelineEntry,
  markScreened,
}: {
  studyFilename?: string;
  tab: WorkspaceTab;
  resolvedFolder: string;
  conditions: string[];
  timelineEntries: TimelineEntry[];
  addTimelineEntry: AddTimelineEntry;
  markScreened: (filename: string) => void;
}) {
  const { metadata, priors } = useStudyMeta(studyFilename);
  const latestPrior = priors[0];
  const [screening, setScreening] = useState<ScreeningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const timelinePrior = latestPrior
    ? timelineEntries.find(
        (entry) =>
          entry.filename === latestPrior.filename ||
          entry.studyLabel === latestPrior.filename,
      )
    : undefined;
  const priorScreening =
    screening ?? timelinePrior?.screeningResponse ?? null;

  useEffect(() => {
    setScreening(null);
  }, [studyFilename, latestPrior?.filename]);

  const screenPrior = useCallback(async () => {
    if (
      !latestPrior ||
      !resolvedFolder ||
      conditions.length === 0 ||
      loading
    ) {
      return;
    }
    setLoading(true);
    try {
      const response = await screenImageFromPath(
        resolvedFolder,
        latestPrior.filename,
        conditions,
      );
      setScreening(response);
      markScreened(latestPrior.filename);
      addTimelineEntry(latestPrior.filename, response, {
        tab: 'folder',
        folder: resolvedFolder,
        filename: latestPrior.filename,
        imageUrl: imageContentUrl(resolvedFolder, latestPrior.filename),
      });
    } catch {
      // Keep the unavailable state when the prior cannot be screened.
    } finally {
      setLoading(false);
    }
  }, [
    latestPrior,
    resolvedFolder,
    conditions,
    loading,
    markScreened,
    addTimelineEntry,
  ]);

  return {
    metadata,
    priors,
    latestPrior,
    priorScreening,
    priorImageUrl:
      tab === 'folder' && resolvedFolder && latestPrior
        ? imageContentUrl(resolvedFolder, latestPrior.filename)
        : null,
    screenPrior,
    loading,
  };
}
