import { authHeaders, logout } from './auth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Fetch base con token — si recibe 401/403 cierra sesión automáticamente
async function apiFetch(url, options = {}) {
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

// ─── RUA (Spreadsheet principal) ──────────────────────────────────────────

export const obtenerRegistros = (mes) =>
  apiFetch(`/api/registros${mes ? `?mes=${encodeURIComponent(mes)}` : ''}`);

export const crearRegistro = (datos) =>
  apiFetch('/api/registro', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export const editarRegistro = (fila, datos) =>
  apiFetch(`/api/registro/${fila}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const eliminarRegistro = (fila, mes) =>
  apiFetch(`/api/registro/${fila}?mes=${encodeURIComponent(mes)}`, {
    method: 'DELETE',
  });

export const buscarPacientes = (q, tipo = 'todos') =>
  apiFetch(`/api/buscar?q=${encodeURIComponent(q)}&tipo=${tipo}`);

export const listarHojas = () =>
  apiFetch('/api/listar-hojas');

// ─── DNI AUTOCOMPLETE ─────────────────────────────────────────────────────

export const buscarDNI = (dni) =>
  apiFetch(`/api/dni/${dni}`);

// ─── SEGUIMIENTO (Spreadsheet 3) ──────────────────────────────────────────

export const obtenerHojasSeguimiento = () =>
  apiFetch('/api/seguimiento/hojas');

export const obtenerRegistrosSeguimiento = (hoja) =>
  apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}`);

export const crearRegistroSeguimiento = (hoja, datos) =>
  apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export const editarRegistroSeguimiento = (hoja, fila, datos) =>
  apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}/${fila}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const eliminarRegistroSeguimiento = (hoja, fila) =>
  apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}/${fila}`, {
    method: 'DELETE',
  });

// ─── UTILIDADES ───────────────────────────────────────────────────────────
export const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];

export function obtenerMesActual() {
  const anio = new Date().getFullYear();
  const mes  = MESES[new Date().getMonth()];
  return anio <= 2025 ? mes : `${mes} ${anio}`;
}