import { es } from '../../i18n/es';

type Props = {
  step: number;
};

const STEPS = [
  { key: 1, label: es.stepSource },
  { key: 2, label: es.stepReview },
  { key: 3, label: es.stepResults },
] as const;

export function WorkflowBar({ step }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
      {STEPS.map((s, i) => {
        const done = step > s.key;
        const active = step === s.key;
        return (
          <div key={s.key} className="flex items-center gap-4">
            <div
              className={`workflow-step ${
                active
                  ? 'workflow-step-active workflow-step-pill'
                  : done
                    ? 'workflow-step-done'
                    : ''
              }`}
            >
              <span className="workflow-dot">{done ? '✓' : s.key}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`hidden h-px w-8 sm:block ${
                  done ? 'bg-teal-500/40' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
