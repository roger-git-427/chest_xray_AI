import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchPersistedStudies,
  type PersistedStudy,
  type WorklistStatus,
} from '../api/client';
import { useAuth } from './AuthContext';
import { useClinic } from './ClinicContext';
import { isPatient } from '../lib/roles';

type StudyDataContextValue = {
  studies: PersistedStudy[];
  loading: boolean;
  refreshStudies: () => Promise<void>;
  updateStudyStatus: (filename: string, status: WorklistStatus) => void;
};

const StudyDataContext = createContext<StudyDataContextValue | null>(null);

export function StudyDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeClinic } = useClinic();
  const [studies, setStudies] = useState<PersistedStudy[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const refreshStudies = useCallback(async () => {
    if (!user || (!isPatient(user) && !activeClinic)) {
      setStudies([]);
      return;
    }
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const next = await fetchPersistedStudies(
        isPatient(user) ? undefined : activeClinic?.id,
      );
      if (currentRequest === requestId.current) setStudies(next);
    } catch {
      if (currentRequest === requestId.current) setStudies([]);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [user, activeClinic]);

  useEffect(() => {
    void refreshStudies();
  }, [refreshStudies]);

  const updateStudyStatus = useCallback(
    (filename: string, status: WorklistStatus) => {
      setStudies((current) =>
        current.map((study) =>
          study.filename === filename ? { ...study, status } : study,
        ),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({ studies, loading, refreshStudies, updateStudyStatus }),
    [studies, loading, refreshStudies, updateStudyStatus],
  );

  return (
    <StudyDataContext.Provider value={value}>
      {children}
    </StudyDataContext.Provider>
  );
}

export function useStudyData() {
  const context = useContext(StudyDataContext);
  if (!context) {
    throw new Error('useStudyData must be used within StudyDataProvider');
  }
  return context;
}
