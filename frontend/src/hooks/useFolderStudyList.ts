import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchImageList, imageContentUrl } from '../api/client';
import type { WorkspaceTab } from '../types/workspace';

export function useFolderStudyList(
  tab: WorkspaceTab,
  onSelectionChange: () => void,
) {
  const [folder, setFolder] = useState('');
  const [resolvedFolder, setResolvedFolder] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [listTruncated, setListTruncated] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    if (!folder.trim() || tab !== 'folder') return;
    const timer = window.setTimeout(() => {
      setListLoading(true);
      fetchImageList(folder.trim(), filterQuery)
        .then((data) => {
          setResolvedFolder(data.folder);
          setImageNames(data.names);
          setListTruncated(data.truncated);
          setSelectedName((current) =>
            current && data.names.includes(current)
              ? current
              : data.names[0] ?? '',
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

  const selectedIndex = useMemo(
    () => imageNames.indexOf(selectedName),
    [imageNames, selectedName],
  );
  const previewUrl = useMemo(
    () =>
      resolvedFolder && selectedName
        ? imageContentUrl(resolvedFolder, selectedName)
        : null,
    [resolvedFolder, selectedName],
  );

  const selectStudy = useCallback(
    (name: string) => {
      setSelectedName(name);
      onSelectionChange();
    },
    [onSelectionChange],
  );
  const selectPrevStudy = useCallback(() => {
    if (selectedIndex > 0) selectStudy(imageNames[selectedIndex - 1]);
  }, [imageNames, selectedIndex, selectStudy]);
  const selectNextStudy = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < imageNames.length - 1) {
      selectStudy(imageNames[selectedIndex + 1]);
    }
  }, [imageNames, selectedIndex, selectStudy]);

  return {
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
    previewUrl,
    selectStudy,
    selectPrevStudy,
    selectNextStudy,
  };
}
