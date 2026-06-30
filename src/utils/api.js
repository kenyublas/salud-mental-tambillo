import { authHeaders, logout } from './auth';

export const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default async function apiFetch(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  // Token expirado o inválido → cerrar sesión
  if (res.status === 401 || res.status === 403) {
    logout();
    window.location.reload(); // vuelve al Login automáticamente
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }

  return res.json();
}
