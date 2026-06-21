import { useState } from 'react';
import type { ConditionInfo } from '../../api/client';
import { es } from '../../i18n/es';

type Props = {
  condition: ConditionInfo;
};

export function ModelCardPanel({ condition }: Props) {
  const [open, setOpen] = useState(false);
  const card = condition.model_card;
  if (!card) return null;

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] font-semibold uppercase tracking-wider text-teal-500 hover:text-teal-400"
      >
        {open ? es.modelCardHide : es.modelCardShow}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-[var(--border-subtle)] bg-black/20 p-2.5 text-[10px] text-[var(--text-muted)]">
          <p>
            <span className="text-[var(--text-faint)]">{es.modelCardArchitecture}:</span>{' '}
            <span className="font-mono text-[var(--text-secondary)]">{card.architecture}</span>
          </p>
          <p>
            <span className="text-[var(--text-faint)]">{es.modelCardDataset}:</span>{' '}
            {card.dataset}
          </p>
          {card.test_auc != null && (
            <p>
              <span className="text-[var(--text-faint)]">{es.modelCardAuc}:</span>{' '}
              <span className="pro-tabular font-mono text-teal-500">{card.test_auc.toFixed(3)}</span>
            </p>
          )}
          {card.weights_updated && (
            <p>
              <span className="text-[var(--text-faint)]">{es.modelCardWeights}:</span>{' '}
              {card.weights_updated}
            </p>
          )}
          <p className="leading-relaxed text-[var(--text-faint)]">{card.limitations}</p>
          {card.threshold_analysis && card.threshold_analysis.length > 0 && (
            <div className="mt-1 overflow-x-auto">
              <p className="mb-1 font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                {es.modelCardCalibration}
              </p>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[var(--text-faint)]">
                    <th className="pr-2">{es.pdfColThreshold}</th>
                    <th className="pr-2">Sens.</th>
                    <th>Spec.</th>
                  </tr>
                </thead>
                <tbody>
                  {card.threshold_analysis.map((row) => (
                    <tr key={row.threshold}>
                      <td className="pro-tabular pr-2 font-mono">{Math.round(row.threshold * 100)}%</td>
                      <td className="pro-tabular pr-2 font-mono">{Math.round(row.sensitivity * 100)}%</td>
                      <td className="pro-tabular font-mono">{Math.round(row.specificity * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
