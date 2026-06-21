import { useEffect, useState } from 'react';
import { fetchStudyMetadata, fetchStudyPriors, type PriorStudy, type StudyMetadata } from '../api/client';

export function useStudyMeta(filename: string | undefined) {
  const [metadata, setMetadata] = useState<StudyMetadata | null>(null);
  const [priors, setPriors] = useState<PriorStudy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filename) {
      setMetadata(null);
      setPriors([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchStudyMetadata(filename).catch(() => null),
      fetchStudyPriors(filename).catch(() => [] as PriorStudy[]),
    ])
      .then(([meta, priorList]) => {
        if (cancelled) return;
        setMetadata(meta);
        setPriors(priorList);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filename]);

  return { metadata, priors, loading };
}
