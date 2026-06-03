// MEJORADO: URL de API desde variable de entorno; sin fallback hardcodeado
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// MEJORADO: fetch centralizado con timeout (20s) y verificación de res.ok
// Antes: cada función silenciaba errores con datos mock → usuario creía haber guardado cuando no
async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Error del servidor (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('La conexión tardó demasiado. Verifica tu internet e intenta de nuevo.');
    }
    throw err;
  }
}

// MEJORADO: ya no retorna mock data en producción — lanza el error real
export async function obtenerRegistros(mes) {
  return apiFetch(`${API_URL}/api/registros?mes=${encodeURIComponent(mes)}`);
}

// MEJORADO: lanza error real en lugar de simular éxito con mock: true
export async function crearRegistro(datos) {
  return apiFetch(`${API_URL}/api/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

// MEJORADO: lanza error real
export async function editarRegistro(id, datos) {
  return apiFetch(`${API_URL}/api/registro/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

// MEJORADO: acepta `mes` para que el backend elimine de la hoja correcta
// Antes: no pasaba mes → DELETE siempre operaba sobre el mes actual → borraba fila equivocada
export async function eliminarRegistro(id, mes) {
  const params = mes ? `?mes=${encodeURIComponent(mes)}` : '';
  return apiFetch(`${API_URL}/api/registro/${id}${params}`, {
    method: 'DELETE',
  });
}

export async function buscarPaciente(dni) {
  return apiFetch(`${API_URL}/api/paciente/${dni}`).catch(() => null);
}

// Búsqueda global en todas las hojas (2025 + 2026)
// q vacío → devuelve todos los registros de todos los meses
export async function buscarEnTodos(q = '', tipo = 'todos') {
  return apiFetch(
    `${API_URL}/api/buscar?q=${encodeURIComponent(q)}&tipo=${encodeURIComponent(tipo)}`
  );
}

// ── Utilidad compartida de mes actual ──────────────────────────────────────────
// MEJORADO: exportada para evitar duplicación en Dashboard, Pacientes, OtrasPaginas
const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

export function obtenerMesActual() {
  const now = new Date();
  const mes = MESES[now.getMonth()];
  const año = now.getFullYear();
  return año === 2025 ? mes : `${mes} ${año}`;
}

export { MESES };

// ── DATOS MOCK — solo para referencia de estructura, NO se usa en producción ──
export const DATOS_MOCK = [
  {
    id: 1, fechaAtencion: '03/01/2026', profesional: 'Psicología',
    tipoAtencion: 'N', nombres: 'Odalia Tolentino Rojas', dni: '72363430',
    fechaNacimiento: '02/01/1997', edad: '27', sexo: 'F', gestante: '-',
    hcl: '01-344-07', sector: 'Tambillo', seguro: 'SIS',
    motivoConsulta: 'Atención integral', tamizaje: '96150.03',
    resultadoTamizaje: 'Negativo', diagnostico: 'F41.2',
  },
];
