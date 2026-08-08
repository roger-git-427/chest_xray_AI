import { useEffect, useMemo, useState } from 'react';
import {
  markPersistedStudyExported,
  reviewPersistedStudy,
  type PriorStudy,
  type ScreeningResponse,
  type StudyMetadata,
} from '../../api/client';
import { useReportDraft } from '../../hooks/useReportDraft';
import { applyThresholdPreview } from '../../lib/calibrationPreview';
import {
  isLegacyStudyReviewed,
  writeLegacyStudyReviewed,
} from '../../lib/legacyClinicalStorage';
import { es } from '../../i18n/es';
import { ExportReportButton } from './ExportReportButton';
import { FindingCard } from './FindingCard';
import { ClinicalReportEditor } from './ClinicalReportEditor';
import { PriorComparisonPanel } from './PriorComparisonPanel';
import { StudyMetadataPanel } from './StudyMetadataPanel';

type Props = {
  response: ScreeningResponse | null;
  sourceLabel?: string;
  imageUrl?: string | null;
  sourceKind?: string;
  screenedAt?: string;
  metadata?: StudyMetadata | null;
  priorStudy?: PriorStudy | null;
  priorScreening?: ScreeningResponse | null;
  onScreenPrior?: () => void;
  priorScreeningLoading?: boolean;
  onReviewChange?: (reviewed: boolean) => void;
  onExportSuccess?: () => void;
};

export function ResultsDashboard({
  response,
  sourceLabel,
  imageUrl,
  sourceKind,
  screenedAt,
  metadata,
  priorStudy,
  priorScreening,
  onScreenPrior,
  priorScreeningLoading,
  onReviewChange,
  onExportSuccess,
}: Props) {
  const [exportNotice, setExportNotice] = useState(false);
  const [clinicallyReviewed, setClinicallyReviewed] = useState(false);
  const [thresholdOverrides, setThresholdOverrides] = useState<Record<string, number>>({});
  const { draft, updateField } = useReportDraft(
    sourceLabel,
    response?.study_id,
    response?.report,
  );

  useEffect(() => {
    if (!sourceLabel) {
      setClinicallyReviewed(false);
      return;
    }
    setClinicallyReviewed(
      response?.report?.status === 'final' ||
        isLegacyStudyReviewed(sourceLabel),
    );
  }, [sourceLabel, response?.report?.status]);

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

  const priorComparison = useMemo(() => {
    if (!displayResponse || !priorScreening) return [];
    return displayResponse.results
      .map((r) => {
        const prior = priorScreening.results.find((p) => p.condition === r.condition);
        if (!prior) return null;
        const delta = r.probability - prior.probability;
        return {
          condition: r.condition_label,
          current: r.probability,
          prior: prior.probability,
          delta,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [displayResponse, priorScreening]);

  const toggleClinicalReview = async () => {
    if (!sourceLabel) return;
    const next = !clinicallyReviewed;
    if (response?.study_id && next) {
      await reviewPersistedStudy(response.study_id);
    }
    setClinicallyReviewed(next);
    if (!response?.study_id) {
      writeLegacyStudyReviewed(sourceLabel, next);
    }
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
                if (response?.study_id) {
                  void markPersistedStudyExported(response.study_id);
                }
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
        {displayResponse && (
          <StudyMetadataPanel
            response={displayResponse}
            metadata={metadata}
            sourceLabel={sourceLabel}
          />
        )}

        {displayResponse && priorStudy && (
          <PriorComparisonPanel
            priorStudy={priorStudy}
            rows={priorComparison}
            hasPriorScreening={Boolean(priorScreening)}
            onScreenPrior={onScreenPrior}
            loading={priorScreeningLoading}
          />
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
            <ClinicalReportEditor
              draft={draft}
              reviewed={clinicallyReviewed}
              disabled={!sourceLabel}
              onReview={() => void toggleClinicalReview()}
              onChange={updateField}
            />

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
