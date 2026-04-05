import { createContext, useContext, useState, useEffect } from 'react';
import { hasPermission } from '../utils/permissions.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'specpd_token';

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Valida o token salvo ao carregar a aplicação
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => { setUser(null); setLoading(false); });
  }, []);

  function login(token, userData) {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  function can(modulo, acao) {
    if (!user) return false;
    return hasPermission(user.papel, modulo, acao);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
