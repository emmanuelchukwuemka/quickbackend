import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchMe, loginAdmin } from '../lib/api';
import { clearToken, getToken, setToken, type AdminProfile } from '../lib/auth';

interface AuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setAdmin)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await loginAdmin({ email, password });
    setToken(result.token);
    setAdmin(result.admin);
  }

  function logout() {
    clearToken();
    setAdmin(null);
  }

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
