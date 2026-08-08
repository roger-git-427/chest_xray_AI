import type { PriorStudy } from '../../api/client';
import { es } from '../../i18n/es';

export type PriorComparisonRow = {
  condition: string;
  current: number;
  prior: number;
  delta: number;
};

type Props = {
  priorStudy: PriorStudy;
  rows: PriorComparisonRow[];
  hasPriorScreening: boolean;
  onScreenPrior?: () => void;
  loading?: boolean;
};

export function PriorComparisonPanel({
  priorStudy,
  rows,
  hasPriorScreening,
  onScreenPrior,
  loading,
}: Props) {
  if (rows.length > 0) {
    return (
      <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
          {es.priorComparisonTitle}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {es.priorComparisonVs.replace('{study}', priorStudy.filename)}
        </p>
        <div className="mt-3 space-y-2">
          {rows.map((row) => {
            const deltaPct = Math.round(row.delta * 100);
            return (
              <div
                key={row.condition}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="text-[var(--text-secondary)]">
                  {row.condition}
                </span>
                <span className="pro-tabular font-mono text-[var(--text-muted)]">
                  {Math.round(row.prior * 100)}% →{' '}
                  {Math.round(row.current * 100)}%
                  <span
                    className={`ml-2 font-semibold ${
                      deltaPct > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : deltaPct < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[var(--text-faint)]'
                    }`}
                  >
                    ({deltaPct > 0 ? '+' : ''}
                    {deltaPct}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (hasPriorScreening) return null;
  return (
    <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      <p className="text-xs text-[var(--text-muted)]">
        {es.priorComparisonUnavailable}
      </p>
      {onScreenPrior && (
        <button
          type="button"
          onClick={onScreenPrior}
          disabled={loading}
          className="pro-btn-secondary mt-3 w-full text-xs"
        >
          {loading
            ? es.priorScreenRunning
            : es.priorScreenRun.replace('{study}', priorStudy.filename)}
        </button>
      )}
    </div>
  );
}
