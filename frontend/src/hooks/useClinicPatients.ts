import { useEffect, useState } from 'react';
import {
  fetchClinicMembers,
  type ClinicMember,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { isPatient } from '../lib/roles';

export function useClinicPatients() {
  const { user } = useAuth();
  const { activeClinic } = useClinic();
  const [patients, setPatients] = useState<ClinicMember[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  useEffect(() => {
    if (!activeClinic || isPatient(user)) {
      setPatients([]);
      setSelectedPatientId('');
      return;
    }
    let cancelled = false;
    fetchClinicMembers(activeClinic.id)
      .then((members) => {
        if (cancelled) return;
        const next = members.filter((member) => member.role === 'patient');
        setPatients(next);
        setSelectedPatientId((current) =>
          next.some((patient) => patient.id === current)
            ? current
            : next[0]?.id ?? '',
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPatients([]);
          setSelectedPatientId('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeClinic, user]);

  return { patients, selectedPatientId, setSelectedPatientId };
}
