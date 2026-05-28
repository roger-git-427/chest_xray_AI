import type { ScreeningResult } from '../api/client';
import { es } from '../i18n/es';
import { ProbabilityBar } from './ProbabilityBar';

type Props = {
  result: ScreeningResult;
};

export function ResultCard({ result }: Props) {
  const flagged = result.flagged;

  return (
    <article
      className={`rounded-xl border p-5 ${
        flagged
          ? 'border-amber-200 bg-amber-50/80'
          : 'border-emerald-200 bg-emerald-50/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {result.condition_label}
        </h3>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            flagged
              ? 'bg-amber-200 text-amber-900'
              : 'bg-emerald-200 text-emerald-900'
          }`}
        >
          {flagged ? es.flagged : es.notFlagged}
        </span>
      </div>

      <ProbabilityBar
        probability={result.probability}
        threshold={result.threshold}
        label={es.probability}
      />

      <p className="mt-4 text-sm text-slate-700">{result.recommendation}</p>
      <p className="mt-1 text-xs text-slate-500">{es.modelSignal}</p>
    </article>
  );
}
