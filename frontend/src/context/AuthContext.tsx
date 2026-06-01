import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'byteai-session';

/** Temporary dev credentials until backend auth exists. */
const DEV_USER = 'root';
const DEV_PASSWORD = 'admin';

export type UserSession = {
  username: string;
  name: string;
};

type AuthContextValue = {
  user: UserSession | null;
  signIn: (username: string, password: string) => boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession & { email?: string };
    if (parsed.username) return parsed;
    if (parsed.email) {
      return { username: parsed.email, name: parsed.name || 'Administrador' };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(loadSession);

  const signIn = useCallback((username: string, password: string) => {
    const trimmed = username.trim();
    if (trimmed !== DEV_USER || password !== DEV_PASSWORD) return false;
    const session: UserSession = {
      username: trimmed,
      name: 'Administrador',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return true;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
