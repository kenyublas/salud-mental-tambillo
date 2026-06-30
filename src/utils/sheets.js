import apiFetch from './api';

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