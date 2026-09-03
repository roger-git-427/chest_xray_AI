import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchClinics, type ClinicSummary } from '../api/client';
import { isPatient } from '../lib/roles';
import { useAuth } from './AuthContext';

type ClinicContextValue = {
  clinics: ClinicSummary[];
  activeClinic: ClinicSummary | null;
  setActiveClinicId: (id: string) => void;
  refreshClinics: () => Promise<void>;
  loading: boolean;
};

const ClinicContext = createContext<ClinicContextValue | null>(null);
const ACTIVE_KEY = 'cxrai-active-clinic';

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [activeClinicId, setActiveClinicIdState] = useState(
    () => sessionStorage.getItem(ACTIVE_KEY) ?? '',
  );
  const [loading, setLoading] = useState(false);

  const refreshClinics = useCallback(async () => {
    if (!user || isPatient(user)) {
      setClinics(user?.clinics ?? []);
      return;
    }
    setLoading(true);
    try {
      setClinics(await fetchClinics());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshClinics();
  }, [refreshClinics]);

  useEffect(() => {
    if (clinics.length === 0) {
      setActiveClinicIdState('');
      return;
    }
    if (!clinics.some((clinic) => clinic.id === activeClinicId)) {
      setActiveClinicIdState(clinics[0].id);
      sessionStorage.setItem(ACTIVE_KEY, clinics[0].id);
    }
  }, [clinics, activeClinicId]);

  const setActiveClinicId = useCallback((id: string) => {
    setActiveClinicIdState(id);
    sessionStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const activeClinic =
    clinics.find((clinic) => clinic.id === activeClinicId) ?? null;

  const value = useMemo(
    () => ({
      clinics,
      activeClinic,
      setActiveClinicId,
      refreshClinics,
      loading,
    }),
    [
      clinics,
      activeClinic,
      setActiveClinicId,
      refreshClinics,
      loading,
    ],
  );

  return (
    <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic debe usarse dentro de ClinicProvider');
  return context;
}
