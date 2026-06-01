import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchConditions,
  fetchImageList,
  fetchSettings,
  imageContentUrl,
  screenImage,
  screenImageFromPath,
  type ConditionInfo,
  type ScreeningResponse,
} from '../api/client';
import { es } from '../i18n/es';
import type { TimelineAddContext, TimelineEntry } from './useStudyTimeline';
import type { WorkspaceTab } from '../types/workspace';

export type { WorkspaceTab };

export function useScreening(
  onAnalysisComplete?: (
    studyLabel: string,
    response: ScreeningResponse,
    context: TimelineAddContext,
  ) => void,
) {
  const [conditions, setConditions] = useState<ConditionInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<WorkspaceTab>('folder');

  const [folder, setFolder] = useState('');
  const [resolvedFolder, setResolvedFolder] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [listTruncated, setListTruncated] = useState(false);
  const [selectedName, setSelectedName] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ScreeningResponse | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [sourceKind, setSourceKind] = useState<'folder' | 'upload'>('folder');
  const [screenedAt, setScreenedAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchConditions(), fetchSettings()])
      .then(([list, settings]) => {
        setConditions(list);
        setSelected(list.filter((c) => c.available).map((c) => c.id));
        setFolder(settings.default_image_dir);
      })
      .catch(() => setError(es.errorLoadConditions));
  }, []);

  useEffect(() => {
    if (!folder.trim() || tab !== 'folder') return;

    const timer = window.setTimeout(() => {
      setListLoading(true);
      fetchImageList(folder.trim(), filterQuery)
        .then((data) => {
          setResolvedFolder(data.folder);
          setImageNames(data.names);
          setListTruncated(data.truncated);
          setSelectedName((prev) =>
            prev && data.names.includes(prev) ? prev : data.names[0] ?? '',
          );
        })
        .catch(() => {
          setImageNames([]);
          setSelectedName('');
          setResolvedFolder('');
        })
        .finally(() => setListLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [folder, filterQuery, tab]);

  const folderPreviewUrl = useMemo(() => {
    if (!resolvedFolder || !selectedName) return null;
    return imageContentUrl(resolvedFolder, selectedName);
  }, [resolvedFolder, selectedName]);

  const onFile = useCallback(
    (f: File | null) => {
      setFile(f);
      setResponse(null);
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
      setUploadPreview(f ? URL.createObjectURL(f) : null);
    },
    [uploadPreview],
  );

  const availableCount = useMemo(
    () => conditions.filter((c) => c.available).length,
    [conditions],
  );

  const toggleCondition = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedIndex = useMemo(
    () => imageNames.indexOf(selectedName),
    [imageNames, selectedName],
  );

  const selectStudy = useCallback((name: string) => {
    setSelectedName(name);
    setResponse(null);
  }, []);

  const selectPrevStudy = useCallback(() => {
    if (selectedIndex <= 0) return;
    selectStudy(imageNames[selectedIndex - 1]);
  }, [imageNames, selectedIndex, selectStudy]);

  const selectNextStudy = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= imageNames.length - 1) return;
    selectStudy(imageNames[selectedIndex + 1]);
  }, [imageNames, selectedIndex, selectStudy]);

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
      const res = await screenImage(file, selected);
      completeAnalysis(file.name, res, 'upload', uploadPreview);
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
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
      setUploadPreview(null);
    }
  }, [uploadPreview]);

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
      ? Boolean(selectedName) && !listLoading
      : Boolean(file));

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
