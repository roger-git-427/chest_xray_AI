import { useEffect, useState, type FormEvent } from 'react';
import {
  createClinic,
  createClinicMember,
  fetchClinicMembers,
  type ClinicMember,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { es } from '../../i18n/es';
import { isMaster, isPatient, roleLabel } from '../../lib/roles';

export function ClinicAdminPanel() {
  const { user } = useAuth();
  const {
    clinics,
    activeClinic,
    setActiveClinicId,
    refreshClinics,
  } = useClinic();
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [member, setMember] = useState({
    email: '',
    full_name: '',
    role: 'patient' as 'admin' | 'patient',
    password: '',
  });

  const loadMembers = async () => {
    if (!activeClinic) return;
    try {
      setMembers(await fetchClinicMembers(activeClinic.id));
    } catch {
      setMembers([]);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [activeClinic?.id]);

  const submitClinic = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const clinic = await createClinic(clinicName);
      setClinicName('');
      await refreshClinics();
      setActiveClinicId(clinic.id);
    } catch {
      setError(es.adminClinicCreateError);
    }
  };

  const submitMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeClinic) return;
    setError('');
    try {
      await createClinicMember(activeClinic.id, member);
      setMember({
        email: '',
        full_name: '',
        role: 'patient',
        password: '',
      });
      await loadMembers();
    } catch {
      setError(es.adminMemberCreateError);
    }
  };

  if (!user || isPatient(user)) return null;

  return (
    <section className="pro-panel mb-5">
      <div className="pro-panel-header flex-wrap gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-500">
            {isMaster(user) ? es.adminMasterTitle : es.adminClinicTitle}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {activeClinic?.name ?? es.adminClinicEmpty}
          </p>
        </div>
        <select
          value={activeClinic?.id ?? ''}
          onChange={(event) => setActiveClinicId(event.target.value)}
          className="pro-input max-w-xs text-xs"
        >
          <option value="" disabled>
            {es.adminClinicSelect}
          </option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="pro-btn-secondary"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? es.adminClose : es.adminOpen}
        </button>
      </div>

      {open && (
        <div className="pro-panel-body grid gap-5 lg:grid-cols-2">
          {isMaster(user) && (
            <form onSubmit={submitClinic} className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {es.adminNewClinic}
              </h3>
              <input
                value={clinicName}
                onChange={(event) => setClinicName(event.target.value)}
                placeholder={es.adminClinicName}
                className="pro-input text-sm"
                minLength={2}
                required
              />
              <button className="pro-btn-primary" type="submit">
                {es.adminCreateClinic}
              </button>
            </form>
          )}

          <form onSubmit={submitMember} className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {es.adminAddAccount}
            </h3>
            <input
              value={member.full_name}
              onChange={(event) =>
                setMember((value) => ({
                  ...value,
                  full_name: event.target.value,
                }))
              }
              placeholder={es.adminFullName}
              className="pro-input text-sm"
              required
            />
            <input
              type="email"
              value={member.email}
              onChange={(event) =>
                setMember((value) => ({
                  ...value,
                  email: event.target.value,
                }))
              }
              placeholder={es.adminEmail}
              className="pro-input text-sm"
              required
            />
            <input
              type="password"
              value={member.password}
              onChange={(event) =>
                setMember((value) => ({
                  ...value,
                  password: event.target.value,
                }))
              }
              placeholder={es.adminInitialPassword}
              className="pro-input text-sm"
              minLength={12}
              required
            />
            {isMaster(user) && (
              <select
                value={member.role}
                onChange={(event) =>
                  setMember((value) => ({
                    ...value,
                    role: event.target.value as 'admin' | 'patient',
                  }))
                }
                className="pro-input text-sm"
              >
                <option value="patient">{es.adminPatientRole}</option>
                <option value="admin">{es.adminAdministratorRole}</option>
              </select>
            )}
            <button
              className="pro-btn-primary"
              type="submit"
              disabled={!activeClinic}
            >
              {es.adminCreateAssign}
            </button>
          </form>

          <div className="lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              {es.adminMembers.replace(
                '{clinic}',
                activeClinic?.name ?? es.adminClinicFallback,
              )}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((item) => (
                <div
                  key={item.membership_id}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.email} · {roleLabel(item.role)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400 lg:col-span-2">{error}</p>
          )}
        </div>
      )}
    </section>
  );
}
