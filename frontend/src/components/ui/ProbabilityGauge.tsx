type Props = {
  probability: number;
  threshold: number;
  flagged: boolean;
};

export function ProbabilityGauge({ probability, threshold: _threshold, flagged }: Props) {
  const pct = Math.round(probability * 100);
  const color = flagged ? '#fbbf24' : '#34d399';

  return (
    <div
      className="gauge shrink-0"
      style={{
        '--pct': `${Math.min(pct, 100)}%`,
        '--gauge-color': color,
      } as Record<string, string>}
    >
      <span className="gauge-inner">{pct}%</span>
    </div>
  );
}
