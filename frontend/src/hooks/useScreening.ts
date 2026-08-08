import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchConditions,
  fetchSettings,
  screenImage,
  screenImageFromPath,
  type ConditionInfo,
  type ScreeningResponse,
} from '../api/client';
import { es } from '../i18n/es';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import type { TimelineAddContext, TimelineEntry } from './useStudyTimeline';
import type { WorkspaceTab } from '../types/workspace';
import { isAdmin } from '../lib/roles';
import { useClinicPatients } from './useClinicPatients';
import { useFolderStudyList } from './useFolderStudyList';
import { useUploadStudy } from './useUploadStudy';

export type { WorkspaceTab };

export function useScreening(
  onAnalysisComplete?: (
    studyLabel: string,
    response: ScreeningResponse,
    context: TimelineAddContext,
  ) => void,
) {
  const { user } = useAuth();
  const { activeClinic } = useClinic();
  const [conditions, setConditions] = useState<ConditionInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<WorkspaceTab>(
    isAdmin(user) ? 'upload' : 'folder',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ScreeningResponse | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [sourceKind, setSourceKind] = useState<'folder' | 'upload'>('folder');
  const [screenedAt, setScreenedAt] = useState<string | null>(null);
  const clearResponse = useCallback(() => setResponse(null), []);
  const folderStudy = useFolderStudyList(tab, clearResponse);
  const uploadStudy = useUploadStudy(clearResponse);
  const { patients, selectedPatientId, setSelectedPatientId } =
    useClinicPatients();
  const {
    folder,
    setFolder,
    resolvedFolder,
    setResolvedFolder,
    filterQuery,
    setFilterQuery,
    imageNames,
    listTruncated,
    selectedName,
    setSelectedName,
    selectedIndex,
    listLoading,
    previewUrl: folderPreviewUrl,
    selectStudy,
    selectPrevStudy,
    selectNextStudy,
  } = folderStudy;
  const {
    file,
    setFile,
    uploadPreview,
    setUploadPreview,
    uploadIsDicom,
    setUploadIsDicom,
    onFile,
  } = uploadStudy;

  useEffect(() => {
    Promise.all([fetchConditions(), fetchSettings()])
      .then(([list, settings]) => {
        setConditions(list);
        setSelected(list.filter((c) => c.available).map((c) => c.id));
        setFolder(settings.default_image_dir);
      })
      .catch(() => setError(es.errorLoadConditions));
  }, [setFolder]);

  useEffect(() => {
    if (isAdmin(user)) setTab('upload');
  }, [user?.role]);

  const availableCount = useMemo(
    () => conditions.filter((c) => c.available).length,
    [conditions],
  );

  const toggleCondition = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const advanceAfterScreening = useCallback(() => {
    if (!autoAdvance || tab !== 'folder') return;
    selectNextStudy();
  }, [autoAdvance, tab, selectNextStudy]);

  const completeAnalysis = useCallback(
    (
      studyLabel: string,
      res: ScreeningResponse,
      kind: 'folder' | 'upload',
      imageUrl: string | null,
    ) => {
      setResponse(res);
      setSourceKind(kind);
      setScreenedAt(new Date().toISOString());
      if (kind === 'upload' && res.preview_data_url) {
        setUploadPreview(res.preview_data_url);
      }
      onAnalysisComplete?.(studyLabel, res, {
        tab: kind === 'folder' ? 'folder' : 'upload',
        folder: kind === 'folder' ? resolvedFolder : undefined,
        filename: kind === 'folder' ? selectedName : file?.name,
        imageUrl,
      });
    },
    [onAnalysisComplete, resolvedFolder, selectedName, file?.name],
  );

  const runUploadScreening = async () => {
    if (!file || selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      if (!activeClinic) return;
      const res = await screenImage(
        file,
        selected,
        activeClinic.id,
        selectedPatientId || undefined,
        { includeHeatmaps: true },
      );
      completeAnalysis(
        file.name,
        res,
        'upload',
        res.preview_data_url ?? uploadPreview,
      );
    } catch {
      setError(es.errorScreening);
    } finally {
      setLoading(false);
    }
  };

  const runFolderScreening = async () => {
    if (!resolvedFolder || !selectedName || selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await screenImageFromPath(
        resolvedFolder,
        selectedName,
        selected,
        { includeHeatmaps: true },
        activeClinic?.id,
        selectedPatientId || undefined,
      );
      completeAnalysis(selectedName, res, 'folder', folderPreviewUrl);
      advanceAfterScreening();
    } catch {
      setError(es.errorScreening);
    } finally {
      setLoading(false);
    }
  };

  const restoreFromTimeline = useCallback((entry: TimelineEntry) => {
    setTab(entry.tab);
    setResponse(entry.screeningResponse);
    setSourceKind(entry.tab);
    setScreenedAt(entry.at);
    setError(null);

    if (entry.tab === 'folder' && entry.folder) {
      setFolder(entry.folder);
      setResolvedFolder(entry.folder);
      if (entry.filename) setSelectedName(entry.filename);
    } else if (entry.tab === 'upload') {
      setFile(null);
      setUploadPreview(
        entry.imageUrl ?? entry.screeningResponse.preview_data_url ?? null,
      );
      setUploadIsDicom(Boolean(entry.screeningResponse.is_dicom));
    }
  }, [
    setFile,
    setFolder,
    setResolvedFolder,
    setSelectedName,
    setUploadIsDicom,
    setUploadPreview,
  ]);

  const applyBatchResult = useCallback(
    (folder: string, filename: string, res: ScreeningResponse) => {
      setTab('folder');
      setFolder(folder);
      setResolvedFolder(folder);
      setSelectedName(filename);
      setResponse(res);
      setSourceKind('folder');
      setScreenedAt(new Date().toISOString());
      setError(null);
    },
    [],
  );

  const previewUrl = tab === 'folder' ? folderPreviewUrl : uploadPreview;
  const sourceLabel =
    response?.filename ??
    (tab === 'folder' && selectedName
      ? selectedName
      : file?.name);

  const workflowStep = response ? 3 : previewUrl ? 2 : 1;
  const canRun =
    selected.length > 0 &&
    !loading &&
    (tab === 'folder'
      ? Boolean(selectedName) && !listLoading && Boolean(activeClinic)
      : Boolean(file) &&
        Boolean(activeClinic) &&
        (!isAdmin(user) || Boolean(selectedPatientId)));

  const canPrevStudy = tab === 'folder' && selectedIndex > 0;
  const canNextStudy =
    tab === 'folder' &&
    selectedIndex >= 0 &&
    selectedIndex < imageNames.length - 1;

  const pdfSourceLabel =
    sourceKind === 'folder' ? es.pdfSourceFolder : es.pdfSourceUpload;

  return {
    conditions,
    selected,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    tab,
    setTab,
    folder,
    setFolder,
    resolvedFolder,
    filterQuery,
    setFilterQuery,
    imageNames,
    listTruncated,
    selectedName,
    file,
    listLoading,
    loading,
    error,
    response,
    availableCount,
    previewUrl,
    uploadIsDicom,
    sourceLabel,
    pdfSourceLabel,
    screenedAt,
    workflowStep,
    canRun,
    autoAdvance,
    setAutoAdvance,
    canPrevStudy,
    canNextStudy,
    toggleCondition,
    onFile,
    selectStudy,
    selectPrevStudy,
    selectNextStudy,
    restoreFromTimeline,
    applyBatchResult,
    runUploadScreening,
    runFolderScreening,
  };
}
