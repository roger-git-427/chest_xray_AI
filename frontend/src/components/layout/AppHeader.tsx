import { roleLabel } from '../../lib/roles';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { es } from '../../i18n/es';
import { CxrAiLogo } from '../brand/CxrAiLogo';

type Props = {
  modelsActive: number;
  overallFlagged?: boolean;
};

export function AppHeader({ modelsActive, overallFlagged }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <header className="pro-header">
      <div className="mx-auto flex h-14 min-h-[56px] max-w-[1600px] items-center gap-3 px-4 sm:h-16 sm:gap-5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <CxrAiLogo size="sm" showStatus />
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.15em] text-teal-500 sm:text-[10px] sm:tracking-[0.2em]">
              {es.productEdition}
            </p>
            <h1 className="truncate text-base font-bold leading-none text-[var(--text-primary)] sm:text-lg">
              {es.productName}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)]/50 px-2.5 py-1 sm:flex md:px-3 md:py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="hidden text-xs font-medium text-[var(--text-secondary)] md:inline">
              {es.statusOnline}
            </span>
          </div>

          {overallFlagged && (
            <span className="pro-triage-chip pro-triage-chip-urgent hidden sm:inline-flex">
              {es.headerTriageUrgent}
            </span>
          )}

          <span className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)]/50 px-2 py-1 font-mono text-[10px] font-medium text-[var(--text-muted)] sm:inline md:px-3 md:py-1.5 md:text-xs">
            {es.statusModels.replace('{n}', String(modelsActive))}
          </span>

          {user && (
            <span className="hidden rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-muted)] lg:inline">
              {user.name} · {roleLabel(user.role)}
            </span>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
            aria-label={theme === 'dark' ? es.themeLight : es.themeDark}
          >
            {theme === 'dark' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            )}
          </button>

          {user && (
            <button
              type="button"
              onClick={signOut}
              className="flex h-9 items-center rounded-lg border border-[var(--border-subtle)] px-2 text-xs text-[var(--text-muted)] transition hover:text-[var(--text-primary)] sm:px-2.5"
              aria-label={es.authSignOut}
            >
              <span className="hidden sm:inline">{es.authSignOut}</span>
              <svg className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
