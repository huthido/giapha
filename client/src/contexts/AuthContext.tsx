import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('giapha_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('giapha_token');
    if (storedToken) {
      api.get<User>('/auth/me')
        .then(u => setUser(u))
        .catch(() => { localStorage.removeItem('giapha_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (t: string, u: User) => {
    localStorage.setItem('giapha_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('giapha_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (u: User) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
