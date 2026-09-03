import type { TimelineEntry } from '../../hooks/useStudyTimeline';
import { es } from '../../i18n/es';
import { formatEsDateTime } from '../../lib/format';

type Props = {
  entries: TimelineEntry[];
  onClear: () => void;
  onSelect?: (entry: TimelineEntry) => void;
  onExport?: (entry: TimelineEntry) => void;
  activeId?: string | null;
  exportError?: string | null;
  /** Área de desplazamiento más corta para el diseño de barra lateral en portátil */
  compact?: boolean;
};

export function StudyTimeline({
  entries,
  onClear,
  onSelect,
  onExport,
  activeId,
  exportError,
  compact,
}: Props) {
  return (
    <div className="pro-panel">
      <div className="pro-panel-header">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {es.timelineTitle}
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)] hover:text-[var(--text-muted)]"
          >
            {es.timelineClear}
          </button>
        )}
      </div>
      <div
        className={`pro-panel-body overflow-y-auto ${compact ? 'max-h-[160px] lg:max-h-[160px] xl:max-h-[240px]' : 'max-h-[280px]'}`}
      >
        {exportError && (
          <p className="mb-3 text-[10px] text-red-400" role="alert">
            {exportError}
          </p>
        )}
        {entries.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--text-muted)]">
            {es.timelineEmpty}
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(e)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                    e.overallFlagged ? 'pro-priority-flagged' : 'pro-priority-clear'
                  } ${
                    activeId === e.id
                      ? 'border-teal-500/40 ring-1 ring-teal-500/25'
                      : 'border-[var(--border-subtle)] hover:border-teal-500/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-mono text-xs text-[var(--text-secondary)]">
                      {e.studyLabel}
                    </p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        e.overallFlagged
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {e.overallFlagged ? es.flagged : es.notFlagged}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-faint)]">
                    {formatEsDateTime(e.at, 'compact')}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {e.findings.map((f) => (
                      <li
                        key={f.label}
                        className="rounded bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]"
                      >
                        {f.label} {Math.round(f.probability * 100)}%
                      </li>
                    ))}
                  </ul>
                  {!compact && (
                    <p className="mt-2 text-[9px] text-teal-600/80 dark:text-teal-500/70">
                      {es.timelineClickHint}
                    </p>
                  )}
                </button>
                {onExport && (
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onExport(e);
                    }}
                    className="mt-1.5 w-full text-[10px] font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400"
                  >
                    {es.timelineExport}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
