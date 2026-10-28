import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserRole } from '@tracelens/shared';
import { api, setToken, enableMock } from '../api/client.js';

interface AuthState {
  token: string | null;
  role: UserRole | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  demoLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ token: null, role: null });

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login({ username, password });
    setToken(res.token);
    setAuth({ token: res.token, role: res.role });
  }, []);

  const demoLogin = useCallback(() => {
    enableMock();
    setToken('mock-token');
    setAuth({ token: 'mock-token', role: 'admin' });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAuth({ token: null, role: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
