import { useEffect, useState } from 'react';
import type { ScreeningResponse } from '../../api/client';
import { es } from '../../i18n/es';
import { ExportReportButton } from './ExportReportButton';
import { FindingCard } from './FindingCard';

type Props = {
  response: ScreeningResponse | null;
  sourceLabel?: string;
  imageUrl?: string | null;
  sourceKind?: string;
  screenedAt?: string;
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
}: Props) {
  const [exportNotice, setExportNotice] = useState(false);
  const [clinicallyReviewed, setClinicallyReviewed] = useState(false);

  useEffect(() => {
    if (!sourceLabel) {
      setClinicallyReviewed(false);
      return;
    }
    setClinicallyReviewed(
      window.localStorage.getItem(reviewStorageKey(sourceLabel)) === '1',
    );
  }, [sourceLabel]);

  const toggleClinicalReview = () => {
    if (!sourceLabel) return;
    const key = reviewStorageKey(sourceLabel);
    const next = !clinicallyReviewed;
    setClinicallyReviewed(next);
    if (next) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  };

  return (
    <section className="pro-panel pro-panel-opaque animate-in-delay-2">
      <div className="pro-panel-header flex-wrap gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">
            {es.resultsTitle}
          </p>
          {response ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`pro-triage-chip ${
                  response.overall_flagged ? 'pro-triage-chip-urgent' : 'pro-triage-chip-routine'
                }`}
              >
                {response.overall_flagged ? es.overallReview : es.overallRoutine}
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
        {response && (
          <div className="flex flex-col items-end gap-1">
            <ExportReportButton
              response={response}
              sourceLabel={sourceLabel}
              imageUrl={imageUrl}
              sourceKind={sourceKind}
              screenedAt={screenedAt}
              onSuccess={() => {
                setExportNotice(true);
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
        {response && !imageUrl && sourceKind === es.pdfSourceUpload && (
          <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300/90">
            {es.uploadRestoreNoPreview}
          </p>
        )}
        {!response && (
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

        {response && (
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
            <p className="text-[10px] text-[var(--text-faint)]">{es.resultsSubtitle}</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {response.results.map((r) => (
                <FindingCard key={r.condition} result={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
