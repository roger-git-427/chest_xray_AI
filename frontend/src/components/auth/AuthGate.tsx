import { useState, type FormEvent, type ReactNode } from 'react';
import { ByteAILogo } from '../brand/ByteAILogo';
import { useAuth } from '../../context/AuthContext';
import { es } from '../../i18n/es';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (user) return <>{children}</>;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (signIn(username, password)) {
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
            <ByteAILogo size="lg" className="mx-auto mb-5" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {es.productName}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{es.productEdition}</p>
          </div>

          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {es.authTitle}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{es.authSubtitle}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="pro-label" htmlFor="auth-username">
                {es.authUsername}
              </label>
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
