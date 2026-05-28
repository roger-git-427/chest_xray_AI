type Props = {
  probability: number;
  threshold: number;
  label: string;
};

export function ProbabilityBar({ probability, threshold, label }: Props) {
  const pct = Math.round(probability * 100);
  const threshPct = Math.round(threshold * 100);
  const flagged = probability >= threshold;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{pct}%</span>
      </div>
      <div className="relative h-3 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            flagged ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-800/70"
          style={{ left: `${threshPct}%` }}
          title={`Umbral ${threshPct}%`}
        />
      </div>
      <p className="text-xs text-slate-500">Umbral: {threshPct}%</p>
    </div>
  );
}
