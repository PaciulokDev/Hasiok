import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createApiClient, type AuthResponse, type MyProfile } from '@hasiok/shared';

const TOKEN_KEY = 'hasiok.token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // np. tryb prywatny — trudno, sesja będzie tylko do odświeżenia strony
  }
}

let currentToken = readToken();
let onUnauthorized = () => {};

/** Klient API dla przeglądarki — ten sam adres co strona (Vite przekierowuje /api do serwera). */
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  getToken: () => currentToken,
  onUnauthorized: () => onUnauthorized(),
});

interface AuthState {
  user: MyProfile | null;
  loading: boolean;
  signIn: (res: AuthResponse) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
  setUser: (user: MyProfile) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(!!currentToken);

  const signOut = useCallback(() => {
    currentToken = null;
    writeToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!currentToken) return;
    setUser(await api.me());
  }, []);

  useEffect(() => {
    onUnauthorized = signOut;
    if (currentToken) {
      refresh()
        .catch(signOut)
        .finally(() => setLoading(false));
    }
  }, [refresh, signOut]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: (res) => {
        currentToken = res.token;
        writeToken(res.token);
        setUser(res.user);
      },
      signOut,
      refresh,
      setUser,
    }),
    [user, loading, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth musi być użyte wewnątrz AuthProvider');
  return ctx;
}
