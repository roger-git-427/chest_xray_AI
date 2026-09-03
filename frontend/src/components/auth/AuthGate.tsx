import { useState, type FormEvent, type ReactNode } from 'react';
import { CxrAiLogo } from '../brand/CxrAiLogo';
import { useAuth } from '../../context/AuthContext';
import { es } from '../../i18n/es';

const DEMO_EMAIL = 'root@root.com';
const DEMO_PASSWORD = 'admin';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn } = useAuth();
  const [username, setUsername] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="pro-shell flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-400" />
      </div>
    );
  }
  if (user) return <>{children}</>;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (await signIn(username, password)) {
      setError(null);
      return;
    }
    setError(es.errorAuth);
  };

  return (
    <div className="pro-shell flex min-h-screen items-center justify-center p-4">
      <div className="pro-panel w-full max-w-md animate-in">
        <div className="pro-panel-body">
          <div className="mb-8 text-center">
            <CxrAiLogo size="lg" className="mx-auto mb-5" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {es.productName}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{es.productEdition}</p>
          </div>

          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {es.authTitle}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{es.authSubtitle}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" lang="es" noValidate={false}>
            <div>
              <label className="pro-label" htmlFor="auth-username">
                {es.authUsername}
              </label>
              <input
                id="auth-username"
                type="email"
                autoComplete="email"
                value={username}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity('');
                  setUsername(e.target.value);
                }}
                onInvalid={(e) => {
                  const el = e.currentTarget;
                  if (el.validity.valueMissing) {
                    el.setCustomValidity(es.authEmailRequired);
                  } else if (el.validity.typeMismatch) {
                    el.setCustomValidity(
                      es.authEmailInvalid.replace('{value}', el.value || '…'),
                    );
                  }
                }}
                className="pro-input font-mono"
                required
              />
            </div>
            <div>
              <label className="pro-label" htmlFor="auth-password">
                {es.authPassword}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity('');
                  setPassword(e.target.value);
                }}
                onInvalid={(e) => {
                  const el = e.currentTarget;
                  if (el.validity.valueMissing) {
                    el.setCustomValidity(es.authPasswordRequired);
                  }
                }}
                className="pro-input"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-[var(--text-faint)]">{es.authDemoHint}</p>
            <button type="submit" className="pro-btn-primary">
              {es.authSignIn}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
