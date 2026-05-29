import { createContext, useContext, useState, useCallback } from 'react';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
  isAdmin: () => boolean;
  isMinister: () => boolean;
  isMinisterOrAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const login = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const isLoggedIn = useCallback(() => !!token, [token]);
  const isAdmin = useCallback(() => user?.roles.includes('Admin') ?? false, [user]);
  const isMinister = useCallback(() => user?.roles.includes('Minister') ?? false, [user]);
  const isMinisterOrAdmin = useCallback(() => isAdmin() || isMinister(), [isAdmin, isMinister]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn, isAdmin, isMinister, isMinisterOrAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
