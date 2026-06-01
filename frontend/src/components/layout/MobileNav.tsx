import { es } from '../../i18n/es';

export type MobilePanel = 'study' | 'viewer' | 'results' | 'protocol';

type Props = {
  active: MobilePanel;
  onChange: (panel: MobilePanel) => void;
  hasResults: boolean;
};

const TABS: { id: MobilePanel; label: string; icon: string }[] = [
  { id: 'study', label: es.navStudy, icon: 'M2.25 12.75h19.5M5.25 7.5h13.5m-13.5 10.5h13.5' },
  { id: 'viewer', label: es.navViewer, icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159' },
  { id: 'results', label: es.navResults, icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25' },
  { id: 'protocol', label: es.navProtocol, icon: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093' },
];

export function MobileNav({ active, onChange, hasResults }: Props) {
  return (
    <nav
      className="mobile-nav fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur-xl lg:hidden"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2 safe-pb">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const showDot = tab.id === 'results' && hasResults;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition ${
                isActive
                  ? 'text-teal-500'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.label}
              {showDot && (
                <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
