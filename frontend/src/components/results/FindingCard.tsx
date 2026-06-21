import { useState } from 'react';
import type { ScreeningResult } from '../../api/client';
import { es } from '../../i18n/es';
import { ProbabilityGauge } from '../ui/ProbabilityGauge';

type Props = {
  result: ScreeningResult;
};

export function FindingCard({ result }: Props) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const flagged = result.flagged;
  const pct = Math.round(result.probability * 100);
  const threshPct = Math.round(result.threshold * 100);
  const hasHeatmap = Boolean(result.heatmap_data_url);

  return (
    <article
      className={`finding-card animate-in ${
        flagged ? 'finding-card-flagged' : 'finding-card-clear'
      }`}
    >
      {hasHeatmap && showHeatmap && (
        <div className="mb-3 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-black/40">
          <img
            src={result.heatmap_data_url!}
            alt={es.heatmapAlt.replace('{condition}', result.condition_label)}
            className="mx-auto max-h-40 w-full object-contain"
          />
          <p className="border-t border-[var(--border-subtle)] px-2 py-1 text-center text-[10px] text-[var(--text-faint)]">
            {es.heatmapCaption}
          </p>
        </div>
      )}
      <div className="flex gap-3">
        <ProbabilityGauge
          probability={result.probability}
          threshold={result.threshold}
          flagged={flagged}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {result.condition_label}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                flagged
                  ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25'
              }`}
            >
              {flagged ? es.flagged : es.notFlagged}
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="pro-tabular text-[var(--text-muted)]">
                {pct}%
                <span className="ml-1 text-[var(--text-faint)]">{es.probability}</span>
              </span>
              <span className="pro-tabular text-[var(--text-faint)]">
                {es.thresholdAt.replace('{n}', String(threshPct))}
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  flagged
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                    : 'bg-gradient-to-r from-emerald-700 to-emerald-400'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                style={{ left: `${threshPct}%` }}
                title={es.thresholdAt.replace('{n}', String(threshPct))}
              />
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {result.recommendation}
          </p>
          {hasHeatmap && (
            <button
              type="button"
              onClick={() => setShowHeatmap((v) => !v)}
              className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-teal-600 hover:text-teal-500 dark:text-teal-400"
            >
              {showHeatmap ? es.heatmapHide : es.heatmapShow}
            </button>
          )}
          <p className="mt-1.5 text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
            {es.modelSignal}
          </p>
        </div>
      </div>
    </article>
  );
}
