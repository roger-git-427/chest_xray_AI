import { useCallback, useEffect, useRef, useState } from 'react';

function isDicomName(name: string): boolean {
  return /\.(dcm|dicom)$/i.test(name);
}

export function useUploadStudy(onSelectionChange: () => void) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDicom, setIsDicom] = useState(false);
  const previewRef = useRef<string | null>(null);

  const replacePreview = useCallback((next: string | null) => {
    if (previewRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = next;
    setPreview(next);
  }, []);

  useEffect(
    () => () => {
      if (previewRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current);
      }
    },
    [],
  );

  const onFile = useCallback(
    (nextFile: File | null) => {
      setFile(nextFile);
      onSelectionChange();
      if (!nextFile) {
        replacePreview(null);
        setIsDicom(false);
        return;
      }
      const dicom = isDicomName(nextFile.name);
      setIsDicom(dicom);
      replacePreview(dicom ? null : URL.createObjectURL(nextFile));
    },
    [onSelectionChange, replacePreview],
  );

  return {
    file,
    setFile,
    uploadPreview: preview,
    setUploadPreview: replacePreview,
    uploadIsDicom: isDicom,
    setUploadIsDicom: setIsDicom,
    onFile,
  };
}
