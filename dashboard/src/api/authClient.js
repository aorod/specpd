const TOKEN_KEY = 'specpd_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, senha) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
  return data; // { token, user }
}

// ── Usuários (admin) ──────────────────────────────────────────────────────────

export function listUsers() {
  return authFetch('/api/users');
}

export function createUser(data) {
  return authFetch('/api/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id, data) {
  return authFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteUser(id) {
  return authFetch(`/api/users/${id}`, { method: 'DELETE' });
}
