import type { ScreeningResponse } from '../api/client';
import { es } from '../i18n/es';
import { ResultCard } from './ResultCard';

type Props = {
  response: ScreeningResponse | null;
  sourceLabel?: string;
};

export function ResultsPanel({ response, sourceLabel }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{es.resultsTitle}</h2>

      {!response && (
        <p className="mt-4 text-sm text-slate-500">{es.resultsEmpty}</p>
      )}

      {response && (
        <>
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
              response.overall_flagged
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            {response.overall_flagged ? es.overallReview : es.overallRoutine}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {response.results.map((r) => (
              <ResultCard key={r.condition} result={r} />
            ))}
          </div>
          {sourceLabel && (
            <p className="mt-4 text-xs text-slate-500">
              {es.source}: {sourceLabel}
            </p>
          )}
        </>
      )}
    </section>
  );
}
