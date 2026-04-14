import { createContext, useContext, useState, useEffect } from 'react';
import { hasPermission, loadUserPermissions } from '../utils/permissions.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'specpd_token';

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [userPerms, setUserPerms] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Valida o token salvo ao carregar a aplicação
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => { setUser(null); setLoading(false); });
  }, []);

  // Carrega permissões customizadas sempre que o usuário muda
  useEffect(() => {
    if (user?.id) {
      setUserPerms(loadUserPermissions(user.id));
      setAvatarUrl(localStorage.getItem(`specpd_avatar_${user.id}`) || null);
    } else {
      setUserPerms(null);
      setAvatarUrl(null);
    }
  }, [user?.id]);

  function updateAvatar(base64OrNull) {
    if (user?.id) {
      if (base64OrNull === null) {
        localStorage.removeItem(`specpd_avatar_${user.id}`);
      } else {
        localStorage.setItem(`specpd_avatar_${user.id}`, base64OrNull);
      }
      setAvatarUrl(base64OrNull);
    }
  }

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
    if (userPerms) {
      return (userPerms[modulo] ?? []).includes(acao);
    }
    return hasPermission(user.papel, modulo, acao);
  }

  // Recarrega as permissões customizadas do usuário atual do localStorage
  function refreshPermissions() {
    if (user?.id) {
      setUserPerms(loadUserPermissions(user.id));
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, refreshPermissions, avatarUrl, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
