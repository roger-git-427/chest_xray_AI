import { useMemo } from 'react';
import type { BatchRow } from '../../hooks/useBatchScreening';
import { es } from '../../i18n/es';

type Props = {
  rows: BatchRow[];
  running: boolean;
  current: number;
  total: number;
  onCancel: () => void;
  onOpenRow: (row: BatchRow) => void;
};

function topFinding(row: BatchRow): string {
  if (row.error) return es.batchError;
  if (!row.response?.results.length) return '—';
  const sorted = [...row.response.results].sort(
    (a, b) => b.probability - a.probability,
  );
  const top = sorted[0];
  return `${top.condition_label} ${Math.round(top.probability * 100)}%`;
}

export function BatchScreeningPanel({
  rows,
  running,
  current,
  total,
  onCancel,
  onOpenRow,
}: Props) {
  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aFlag = a.response?.overall_flagged ? 1 : 0;
        const bFlag = b.response?.overall_flagged ? 1 : 0;
        return bFlag - aFlag;
      }),
    [rows],
  );

  if (!running && rows.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
          {es.batchSummaryTitle}
        </h3>
        {running && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {es.batchProgress
                .replace('{current}', String(current))
                .replace('{total}', String(total))}
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] font-semibold uppercase tracking-wider text-red-400 hover:text-red-300"
            >
              {es.batchCancel}
            </button>
          </div>
        )}
      </div>

      {running && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/20">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: total ? `${(current / total) * 100}%` : '0%' }}
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="max-h-[200px] overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-faint)]">
                <th className="pb-2 pr-2 font-medium">{es.batchColStudy}</th>
                <th className="pb-2 pr-2 font-medium">{es.batchColStatus}</th>
                <th className="pb-2 pr-2 font-medium">{es.batchColFinding}</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const flagged = Boolean(row.response?.overall_flagged);
                return (
                <tr
                  key={row.filename}
                  tabIndex={row.response ? 0 : undefined}
                  role={row.response ? 'button' : undefined}
                  onKeyDown={(e) => {
                    if (row.response && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onOpenRow(row);
                    }
                  }}
                  onClick={() => {
                    if (row.response) onOpenRow(row);
                  }}
                  className={`border-b border-[var(--border-subtle)]/50 last:border-0 ${
                    row.response ? 'cursor-pointer hover:bg-teal-500/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40' : ''
                  } ${
                    flagged ? 'pro-priority-flagged' : row.response ? 'pro-priority-clear' : ''
                  }`}
                >
                  <td className="py-2 pr-2 font-mono text-[var(--text-secondary)]">
                    {row.filename}
                  </td>
                  <td className="py-2 pr-2">
                    {row.error ? (
                      <span className="text-red-400">{es.batchError}</span>
                    ) : (
                      <span
                        className={
                          row.response?.overall_flagged
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }
                      >
                        {row.response?.overall_flagged
                          ? es.flagged
                          : es.notFlagged}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-[var(--text-muted)]">
                    {topFinding(row)}
                  </td>
                  <td className="py-2 text-right">
                    {row.response && (
                      <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                        {es.batchOpenStudy}
                      </span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
