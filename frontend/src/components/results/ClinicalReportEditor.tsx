import type { ReportDraft } from '../../hooks/useReportDraft';
import { es } from '../../i18n/es';

type Props = {
  draft: ReportDraft;
  reviewed: boolean;
  disabled?: boolean;
  onReview: () => void;
  onChange: (field: keyof ReportDraft, value: string) => void;
};

export function ClinicalReportEditor({
  draft,
  reviewed,
  disabled,
  onReview,
  onChange,
}: Props) {
  return (
    <>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={onReview}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] text-teal-600 focus:ring-teal-500/40"
        />
        <span className="text-xs leading-snug text-[var(--text-secondary)]">
          {reviewed ? es.confirmReviewDone : es.confirmReview}
        </span>
      </label>
      <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
          {es.reportImpression}
        </p>
        <textarea
          value={draft.impression}
          onChange={(event) => onChange('impression', event.target.value)}
          placeholder={es.reportImpressionPlaceholder}
          rows={2}
          className="pro-input w-full resize-y text-xs"
        />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
          {es.reportRecommendations}
        </p>
        <textarea
          value={draft.recommendations}
          onChange={(event) =>
            onChange('recommendations', event.target.value)
          }
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
          onChange={(event) => onChange('clinicianName', event.target.value)}
          className="pro-input w-full text-xs"
        />
      </div>
    </>
  );
}
