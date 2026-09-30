import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, MyProfile } from '@hasiok/shared';
import { api, onUnauthorized, setSessionToken, tokenStore } from './api';

interface AuthState {
  user: MyProfile | null;
  loading: boolean;
  signIn: (res: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: MyProfile) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setSessionToken(null);
    await tokenStore.set(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    setUser(await api.me());
  }, []);

  // Przy starcie aplikacji: jeśli mamy zapisany token, pobierz profil.
  useEffect(() => {
    onUnauthorized(() => void signOut());
    (async () => {
      const token = await tokenStore.get();
      if (token) {
        setSessionToken(token);
        await refresh().catch(signOut);
      }
      setLoading(false);
    })();
  }, [refresh, signOut]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (res) => {
        setSessionToken(res.token);
        await tokenStore.set(res.token);
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
