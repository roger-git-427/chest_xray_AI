import { useEffect, useMemo, useState } from 'react';
import type { PriorStudy, ScreeningResponse, StudyMetadata } from '../../api/client';
import { useReportDraft } from '../../hooks/useReportDraft';
import { applyThresholdPreview } from '../../lib/calibrationPreview';
import { es } from '../../i18n/es';
import { ExportReportButton } from './ExportReportButton';
import { FindingCard } from './FindingCard';

type Props = {
  response: ScreeningResponse | null;
  sourceLabel?: string;
  imageUrl?: string | null;
  sourceKind?: string;
  screenedAt?: string;
  metadata?: StudyMetadata | null;
  priorStudy?: PriorStudy | null;
  priorScreening?: ScreeningResponse | null;
  onReviewChange?: (reviewed: boolean) => void;
  onExportSuccess?: () => void;
};

function reviewStorageKey(sourceLabel: string) {
  return `byteai-reviewed-${sourceLabel}`;
}

export function ResultsDashboard({
  response,
  sourceLabel,
  imageUrl,
  sourceKind,
  screenedAt,
  metadata,
  priorStudy,
  priorScreening,
  onReviewChange,
  onExportSuccess,
}: Props) {
  const [exportNotice, setExportNotice] = useState(false);
  const [clinicallyReviewed, setClinicallyReviewed] = useState(false);
  const [thresholdOverrides, setThresholdOverrides] = useState<Record<string, number>>({});
  const { draft, updateField } = useReportDraft(sourceLabel);

  useEffect(() => {
    if (!sourceLabel) {
      setClinicallyReviewed(false);
      return;
    }
    setClinicallyReviewed(
      window.localStorage.getItem(reviewStorageKey(sourceLabel)) === '1',
    );
  }, [sourceLabel]);

  useEffect(() => {
    setThresholdOverrides({});
  }, [sourceLabel, response?.filename]);

  const displayResponse = useMemo(() => {
    if (!response) return null;
    const results = applyThresholdPreview(response.results, thresholdOverrides);
    return {
      ...response,
      results,
      overall_flagged: results.some((r) => r.flagged),
    };
  }, [response, thresholdOverrides]);

  const toggleClinicalReview = () => {
    if (!sourceLabel) return;
    const key = reviewStorageKey(sourceLabel);
    const next = !clinicallyReviewed;
    setClinicallyReviewed(next);
    if (next) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
    onReviewChange?.(next);
  };

  return (
    <section className="pro-panel pro-panel-opaque animate-in-delay-2">
      <div className="pro-panel-header flex-wrap gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">
            {es.resultsTitle}
          </p>
          {displayResponse ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`pro-triage-chip ${
                  displayResponse.overall_flagged ? 'pro-triage-chip-urgent' : 'pro-triage-chip-routine'
                }`}
              >
                {displayResponse.overall_flagged ? es.overallReview : es.overallRoutine}
              </span>
              {sourceLabel && (
                <span className="truncate font-mono text-xs text-[var(--text-muted)]">
                  {sourceLabel}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{es.resultsSubtitle}</p>
          )}
        </div>
        {displayResponse && (
          <div className="flex flex-col items-end gap-1">
            <ExportReportButton
              response={displayResponse}
              sourceLabel={sourceLabel}
              imageUrl={imageUrl}
              sourceKind={sourceKind}
              screenedAt={screenedAt}
              metadata={metadata}
              reportDraft={draft}
              clinicallyReviewed={clinicallyReviewed}
              onSuccess={() => {
                setExportNotice(true);
                onExportSuccess?.();
                window.setTimeout(() => setExportNotice(false), 3000);
              }}
            />
            {exportNotice && (
              <p className="text-[10px] text-teal-500">{es.exportPdfSuccess}</p>
            )}
          </div>
        )}
      </div>

      <div className="pro-panel-body">
        {displayResponse?.is_dicom && displayResponse.dicom_metadata && (
          <div className="mb-4 grid gap-2 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 text-xs sm:grid-cols-2">
            <p className="sm:col-span-2 text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              {es.dicomMetaTitle}
            </p>
            {displayResponse.dicom_metadata.patient_id && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaPatient}:</span> {displayResponse.dicom_metadata.patient_id}</p>
            )}
            {displayResponse.dicom_metadata.patient_age && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaAge}:</span> {displayResponse.dicom_metadata.patient_age}</p>
            )}
            {displayResponse.dicom_metadata.patient_sex && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaGender}:</span> {displayResponse.dicom_metadata.patient_sex}</p>
            )}
            {displayResponse.dicom_metadata.view_position && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaView}:</span> {displayResponse.dicom_metadata.view_position}</p>
            )}
            {displayResponse.dicom_metadata.study_date && (
              <p><span className="text-[var(--text-faint)]">{es.dicomStudyDate}:</span> {displayResponse.dicom_metadata.study_date}</p>
            )}
            {displayResponse.dicom_metadata.modality && (
              <p><span className="text-[var(--text-faint)]">{es.dicomModality}:</span> {displayResponse.dicom_metadata.modality}</p>
            )}
          </div>
        )}

        {displayResponse && metadata && (
          <div className="mb-4 grid gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-xs sm:grid-cols-2">
            {metadata.patient_id && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaPatient}:</span> {metadata.patient_id}</p>
            )}
            {metadata.age && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaAge}:</span> {metadata.age}</p>
            )}
            {metadata.gender && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaGender}:</span> {metadata.gender}</p>
            )}
            {metadata.view_position && (
              <p><span className="text-[var(--text-faint)]">{es.studyMetaView}:</span> {metadata.view_position}</p>
            )}
            {metadata.finding_labels && (
              <p className="sm:col-span-2">
                <span className="text-[var(--text-faint)]">{es.studyMetaFindings}:</span>{' '}
                <span className="text-[var(--text-muted)]">{metadata.finding_labels}</span>
              </p>
            )}
          </div>
        )}

        {displayResponse && !metadata && !displayResponse.is_dicom && sourceLabel && (
          <p className="mb-4 text-xs text-[var(--text-faint)]">{es.studyMetaUnavailable}</p>
        )}

        {displayResponse && priorStudy && priorComparison.length > 0 && (
          <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              {es.priorComparisonTitle}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {es.priorComparisonVs.replace('{study}', priorStudy.filename)}
            </p>
            <div className="mt-3 space-y-2">
              {priorComparison.map((row) => {
                const deltaPct = Math.round(row.delta * 100);
                const sign = deltaPct > 0 ? '+' : '';
                return (
                  <div key={row.condition} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--text-secondary)]">{row.condition}</span>
                    <span className="pro-tabular font-mono text-[var(--text-muted)]">
                      {Math.round(row.prior * 100)}% → {Math.round(row.current * 100)}%
                      <span
                        className={`ml-2 font-semibold ${
                          deltaPct > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : deltaPct < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[var(--text-faint)]'
                        }`}
                      >
                        ({sign}{deltaPct}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {displayResponse && priorStudy && !priorScreening && (
          <p className="mb-4 text-xs text-[var(--text-faint)]">{es.priorComparisonUnavailable}</p>
        )}

        {displayResponse && !imageUrl && sourceKind === es.pdfSourceUpload && (
          <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300/90">
            {es.uploadRestoreNoPreview}
          </p>
        )}
        {!displayResponse && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-panel)] px-6 py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <svg
                className="h-5 w-5 text-[var(--text-faint)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"
                />
              </svg>
            </div>
            <p className="max-w-sm text-sm text-[var(--text-muted)]">{es.resultsEmpty}</p>
            <p className="mt-2 text-xs text-[var(--text-faint)]">{es.resultsEmptyHint}</p>
          </div>
        )}

        {displayResponse && (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5">
              <input
                type="checkbox"
                checked={clinicallyReviewed}
                onChange={toggleClinicalReview}
                disabled={!sourceLabel}
                className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] text-teal-600 focus:ring-teal-500/40"
              />
              <span className="text-xs leading-snug text-[var(--text-secondary)]">
                {clinicallyReviewed ? es.confirmReviewDone : es.confirmReview}
              </span>
            </label>

            <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                {es.reportImpression}
              </p>
              <textarea
                value={draft.impression}
                onChange={(e) => updateField('impression', e.target.value)}
                placeholder={es.reportImpressionPlaceholder}
                rows={2}
                className="pro-input w-full resize-y text-xs"
              />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                {es.reportRecommendations}
              </p>
              <textarea
                value={draft.recommendations}
                onChange={(e) => updateField('recommendations', e.target.value)}
                placeholder={es.reportRecommendationsPlaceholder}
                rows={2}
                className="pro-input w-full resize-y text-xs"
              />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                {es.reportClinician}
              </p>
              <input
                type="text"
                value={draft.clinicianName}
                onChange={(e) => updateField('clinicianName', e.target.value)}
                className="pro-input w-full text-xs"
              />
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-black/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                {es.calibrationPreview}
              </p>
              <p className="mb-2 text-[10px] text-[var(--text-faint)]">{es.calibrationHint}</p>
              <div className="space-y-2">
                {response?.results.map((r) => (
                  <div key={r.condition} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="min-w-[7rem] text-[var(--text-secondary)]">{r.condition_label}</span>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={Math.round((thresholdOverrides[r.condition] ?? r.threshold) * 100)}
                      onChange={(e) =>
                        setThresholdOverrides((prev) => ({
                          ...prev,
                          [r.condition]: Number(e.target.value) / 100,
                        }))
                      }
                      className="flex-1"
                    />
                    <span className="pro-tabular font-mono text-teal-500">
                      {Math.round((thresholdOverrides[r.condition] ?? r.threshold) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-faint)]">{es.resultsSubtitle}</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {displayResponse.results.map((r) => (
                <FindingCard key={r.condition} result={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
