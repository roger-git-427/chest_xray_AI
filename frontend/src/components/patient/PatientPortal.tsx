import { useEffect, useState } from 'react';
import {
  markPersistedStudyExported,
  type PersistedStudy,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useStudyData } from '../../context/StudyDataContext';
import { formatEsDateTime } from '../../lib/format';
import { generateScreeningPdf } from '../../lib/generateScreeningPdf';
import { es } from '../../i18n/es';
import {
  toReportDraft,
  toScreeningResponse,
} from '../../lib/studyMappers';
import { AppHeader } from '../layout/AppHeader';

export function PatientPortal() {
  const { user } = useAuth();
  const { studies, loading } = useStudyData();
  const [selected, setSelected] = useState<PersistedStudy | null>(null);

  useEffect(() => {
    setSelected((current) =>
      studies.find((study) => study.id === current?.id) ??
      studies[0] ??
      null,
    );
  }, [studies]);

  const download = async (study: PersistedStudy) => {
    if (!study.results || !study.report) return;
    await generateScreeningPdf(
      toScreeningResponse(study),
      {
        sourceLabel: study.filename,
        imageUrl: study.image_url,
        sourceKind: es.patientPortalTitle,
        screenedAt: study.created_at,
        reportDraft: toReportDraft(study.report),
        clinicallyReviewed: true,
      },
    );
    await markPersistedStudyExported(study.id);
  };

  return (
    <div className="pro-shell min-h-screen">
      <AppHeader modelsActive={0} />
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-500">
            {es.patientPortalTitle}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {es.patientStudiesTitle}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {user?.name} · {es.patientFinalReportsOnly}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-400" />
          </div>
        ) : studies.length === 0 ? (
          <div className="pro-panel">
            <div className="pro-panel-body py-16 text-center text-sm text-[var(--text-muted)]">
              {es.patientNoStudies}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <aside className="pro-panel">
              <div className="pro-panel-header">
                <h2 className="text-sm font-semibold">{es.patientHistory}</h2>
              </div>
              <div className="pro-panel-body space-y-2">
                {studies.map((study) => (
                  <button
                    key={study.id}
                    type="button"
                    onClick={() => setSelected(study)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selected?.id === study.id
                        ? 'border-teal-500/40 bg-teal-500/10'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                      {study.filename}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--text-faint)]">
                      {formatEsDateTime(study.created_at)}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            {selected && (
              <section className="pro-panel">
                <div className="pro-panel-header flex-wrap gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                      {selected.filename}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">
                      {formatEsDateTime(selected.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pro-btn-primary"
                    onClick={() => void download(selected)}
                  >
                    {es.patientDownloadReport}
                  </button>
                </div>
                <div className="pro-panel-body space-y-5">
                  <img
                    src={selected.image_url}
                    alt={es.patientImageAlt}
                    className="mx-auto max-h-[420px] w-full rounded-lg bg-black object-contain"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="pro-label">
                        {es.patientClinicalImpression}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {selected.report?.impression ||
                          es.patientNoInformation}
                      </p>
                    </div>
                    <div>
                      <p className="pro-label">
                        {es.patientRecommendations}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {selected.report?.recommendations ||
                          es.patientNoInformation}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-faint)]">
                    {es.patientReviewedBy.replace(
                      '{name}',
                      selected.report?.clinician_name ||
                        es.patientClinicalStaff,
                    )}
                  </p>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
