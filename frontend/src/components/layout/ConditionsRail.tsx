import type { ConditionInfo } from '../../api/client';
import { es } from '../../i18n/es';

type Props = {
  conditions: ConditionInfo[];
  selected: string[];
  onToggle: (id: string) => void;
};

export function ConditionsRail({ conditions, selected, onToggle }: Props) {
  const available = conditions.filter((c) => c.available);

  return (
    <aside className="pro-panel flex h-full flex-col animate-in">
      <div className="pro-panel-header">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {es.sidebarTitle}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-white">
            {es.conditionsLabel}
          </h2>
        </div>
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400">
          {available.length}/{conditions.length}
        </span>
      </div>

      <div className="pro-panel-body flex flex-1 flex-col gap-3">
        <p className="text-xs leading-relaxed text-slate-500">{es.conditionsHint}</p>

        <ul className="space-y-2">
          {conditions.map((c) => {
            const on = selected.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={!c.available}
                  onClick={() => onToggle(c.id)}
                  className={`condition-card w-full text-left ${
                    on ? 'condition-card-on' : ''
                  } ${!c.available ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{c.label}</p>
                      {!c.available && (
                        <p className="mt-0.5 text-[11px] text-slate-500">{es.unavailable}</p>
                      )}
                    </div>
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        on
                          ? 'border-teal-400/50 bg-teal-500/20 text-teal-300'
                          : 'border-slate-600 bg-slate-900/80'
                      }`}
                    >
                      {on && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0L1.72 5.53a.75.75 0 1 1 1.06-1.06L4.5 6.19l4.72-4.72a.75.75 0 0 1 1.06 0z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {c.available && (
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        {es.thresholdLabel}
                      </span>
                      <span className="font-mono text-xs font-medium text-teal-400/90">
                        {Math.round(c.threshold * 100)}%
                      </span>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {available.length === 0 && (
          <p className="rounded-lg border border-red-500/25 bg-red-950/30 px-3 py-2.5 text-xs text-red-300">
            {es.noModels}
          </p>
        )}
      </div>
    </aside>
  );
}
