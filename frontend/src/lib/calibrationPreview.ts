import type { ScreeningResult } from '../api/client';

export function applyThresholdPreview(
  results: ScreeningResult[],
  thresholdOverrides: Record<string, number>,
): ScreeningResult[] {
  return results.map((r) => {
    const threshold = thresholdOverrides[r.condition] ?? r.threshold;
    const flagged = r.probability >= threshold;
    return {
      ...r,
      threshold,
      flagged,
      recommendation: flagged
        ? 'Derivar a radiólogo para confirmación'
        : 'Seguimiento de rutina',
    };
  });
}
