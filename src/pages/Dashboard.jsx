import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { obtenerRegistros, obtenerMesActual, MESES } from '../utils/sheets';
import { authHeaders, logout } from '../utils/auth';

const ROSA    = '#ec4899';
const CELESTE = '#0ea5e9';
const COLORS  = ['#ec4899', '#0ea5e9', '#a855f7', '#f59e0b', '#10b981', '#ef4444'];
const API     = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function obtenerSaludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaHoyFormateada() {
  const hoy = new Date();
  const d = String(hoy.getDate()).padStart(2, '0');
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${hoy.getFullYear()}`;
}

function parsearFechaES(f = '') {
  // DD/MM/YYYY → Date
  const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`) : null;
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(`${API}${url}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) { logout(); window.location.reload(); }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`); }
  return res.json();
}

// ── Componente de alertas ─────────────────────────────────────────────────────
function AlertasSeguimiento({ navigate }) {
  const [alertas, setAlertas]   = useState(null); // null = no cargado aún
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const cargarAlertas = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const hoy    = new Date();
      hoy.setHours(0, 0, 0, 0);
      const hoyStr = fechaHoyFormateada();

      // 1. Citas de hoy desde Sheet 1 (RUA)
      const MESES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
        'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      const mesActual = `${MESES_NOMBRES[hoy.getMonth()]} ${hoy.getFullYear()}`;
      const registrosRUA = await apiFetch(`/api/registros?mes=${encodeURIComponent(mesActual)}`);

      const citasHoy = registrosRUA.filter(p => {
        const fecha = parsearFechaES(p.fechaProxCita);
        if (!fecha) return false;
        fecha.setHours(0, 0, 0, 0);
        return fecha.getTime() === hoy.getTime();
      });

      // 2. Alertas desde Sheet 3 (Seguimiento)
      // Buscar en todas las hojas de seguimiento
      const hojasSeg = await apiFetch('/api/seguimiento/hojas');
      const hojasConSchema = hojasSeg.filter(h =>
        !['TA - 2026', 'Hoja1'].includes(h.nombre)
      );

      const proyeccionVencida = [];
      const sinSesiones30dias = [];

      // Leer hojas en paralelo (máx 5 a la vez para no exceder quota)
      const chunks = [];
      for (let i = 0; i < hojasConSchema.length; i += 4) {
        chunks.push(hojasConSchema.slice(i, i + 4));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (h) => {
          try {
            const schema = await apiFetch(`/api/seguimiento/schema/${encodeURIComponent(h.nombre)}`);
            if (!schema.tieneSchema) return;

            const data = await apiFetch(`/api/seguimiento/${encodeURIComponent(h.nombre)}`);
            const pacientes = (data.registros || []).map(reg => {
              const fila = reg.valores || [];
              const colNombre = schema.colsFijas?.find(c => c.key === 'nombres')?.col ?? 6;
              const colDni    = schema.colsFijas?.find(c => c.key === 'dni')?.col    ?? 10;

              // Columna de proyección
              const colProyeccion = schema.colsMeta?.find(c => c.key === 'proyeccion')?.col;
              const proyeccion    = colProyeccion !== undefined ? (fila[colProyeccion] || '') : '';

              // Última sesión de cualquier grupo
              let ultimaFechaSesion = null;
              schema.gruposSesiones?.forEach(g => {
                for (let s = g.sesiones - 1; s >= 0; s--) {
                  const f = (fila[g.col + s] || '').trim();
                  if (f) {
                    const d = parsearFechaES(f) || new Date(f);
                    if (!isNaN(d) && (!ultimaFechaSesion || d > ultimaFechaSesion)) {
                      ultimaFechaSesion = d;
                    }
                    break;
                  }
                }
              });

              return {
                nombres:    (fila[colNombre] || '').trim(),
                dni:        (fila[colDni]    || '').trim(),
                hoja:       h.nombre,
                proyeccion,
                ultimaFechaSesion,
              };
            }).filter(p => p.nombres);

            pacientes.forEach(p => {
              // Proyección vencida: tiene fecha de proyección y ya pasó
              if (p.proyeccion) {
                const fechaProy = parsearFechaES(p.proyeccion) || new Date(p.proyeccion);
                if (!isNaN(fechaProy) && fechaProy < hoy) {
                  proyeccionVencida.push(p);
                }
              }

              // Sin sesiones en +30 días
              if (p.ultimaFechaSesion) {
                const diasSinVenir = Math.floor((hoy - p.ultimaFechaSesion) / (1000 * 60 * 60 * 24));
                if (diasSinVenir > 30) {
                  sinSesiones30dias.push({ ...p, diasSinVenir });
                }
              }
            });
          } catch {}
        }));
      }

      setAlertas({ citasHoy, proyeccionVencida, sinSesiones30dias });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar automáticamente al montar
  useEffect(() => {
    cargarAlertas();
  }, [cargarAlertas]);

  const total = alertas
    ? alertas.citasHoy.length + alertas.proyeccionVencida.length + alertas.sinSesiones30dias.length
    : 0;

  return (
    <div className="card mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Alertas de Seguimiento
          </h3>
          {alertas && total > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={cargarAlertas}
          disabled={loading}
          className="text-xs font-semibold text-rosa-500 hover:text-rosa-700 flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-rosa-300 border-t-rosa-600 rounded-full animate-spin" />
          ) : '🔄'}
          {loading ? 'Cargando...' : alertas ? 'Actualizar' : 'Cargar alertas'}
        </button>
      </div>

      {/* Sin cargar */}
      {!alertas && !loading && !error && (
        <div className="text-center py-6 text-gray-400">
          <p className="text-2xl mb-1">🔔</p>
          <p className="text-xs font-semibold">Toca "Cargar alertas" para ver el estado del seguimiento</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* Sin alertas */}
      {alertas && total === 0 && (
        <div className="text-center py-6 text-green-600">
          <p className="text-2xl mb-1">✅</p>
          <p className="text-xs font-semibold">Todo al día — sin alertas pendientes</p>
        </div>
      )}

      {/* Alertas */}
      {alertas && total > 0 && (
        <div className="space-y-3">

          {/* Citas de hoy */}
          {alertas.citasHoy.length > 0 && (
            <div className="rounded-xl border border-celeste-200 bg-celeste-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📅</span>
                <p className="font-bold text-celeste-700 text-sm">
                  {alertas.citasHoy.length} cita{alertas.citasHoy.length > 1 ? 's' : ''} programada{alertas.citasHoy.length > 1 ? 's' : ''} para hoy
                </p>
              </div>
              <div className="space-y-1.5">
                {alertas.citasHoy.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-celeste-50 transition-colors"
                    onClick={() => navigate('/pacientes')}
                  >
                    <div className="w-6 h-6 rounded-full bg-celeste-200 flex items-center justify-center text-xs font-bold text-celeste-700 flex-shrink-0">
                      {(p.nombres?.[0] || '?')}
                    </div>
                    <p className="text-xs font-semibold text-gray-700 truncate flex-1">{p.nombres}</p>
                    <span className="text-[10px] text-celeste-500 font-semibold flex-shrink-0">{p.sector}</span>
                  </div>
                ))}
                {alertas.citasHoy.length > 3 && (
                  <p className="text-xs text-celeste-500 font-semibold text-center">+{alertas.citasHoy.length - 3} más</p>
                )}
              </div>
            </div>
          )}

          {/* Proyección vencida */}
          {alertas.proyeccionVencida.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⚠️</span>
                <p className="font-bold text-amber-700 text-sm">
                  {alertas.proyeccionVencida.length} paciente{alertas.proyeccionVencida.length > 1 ? 's' : ''} con TA vencido
                </p>
              </div>
              <div className="space-y-1.5">
                {alertas.proyeccionVencida.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => navigate('/seguimiento')}
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
                      {(p.nombres?.[0] || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{p.nombres}</p>
                      <p className="text-[10px] text-amber-500">{p.hoja}</p>
                    </div>
                    <span className="text-[10px] text-amber-600 font-bold flex-shrink-0 bg-amber-100 px-1.5 py-0.5 rounded">
                      {p.proyeccion}
                    </span>
                  </div>
                ))}
                {alertas.proyeccionVencida.length > 3 && (
                  <p className="text-xs text-amber-500 font-semibold text-center">+{alertas.proyeccionVencida.length - 3} más</p>
                )}
              </div>
            </div>
          )}

          {/* Sin sesiones +30 días */}
          {alertas.sinSesiones30dias.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔴</span>
                <p className="font-bold text-red-700 text-sm">
                  {alertas.sinSesiones30dias.length} paciente{alertas.sinSesiones30dias.length > 1 ? 's' : ''} sin sesión hace +30 días
                </p>
              </div>
              <div className="space-y-1.5">
                {alertas.sinSesiones30dias.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => navigate('/seguimiento')}
                  >
                    <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">
                      {(p.nombres?.[0] || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{p.nombres}</p>
                      <p className="text-[10px] text-red-400">{p.hoja}</p>
                    </div>
                    <span className="text-[10px] text-red-600 font-bold flex-shrink-0 bg-red-100 px-1.5 py-0.5 rounded">
                      {p.diasSinVenir}d sin venir
                    </span>
                  </div>
                ))}
                {alertas.sinSesiones30dias.length > 3 && (
                  <p className="text-xs text-red-400 font-semibold text-center">+{alertas.sinSesiones30dias.length - 3} más</p>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [mesSeleccionado, setMesSeleccionado] = useState(obtenerMesActual);
  const [datos, setDatos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setErrorCarga('');
      obtenerRegistros(mesSeleccionado)
        .then(d => setDatos(Array.isArray(d) ? d : []))
        .catch(err => setErrorCarga(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [mesSeleccionado]);

  const total         = datos.length;
  const hoyFormateado = fechaHoyFormateada();
  const hoyISO        = new Date().toISOString().split('T')[0];
  const atendidosHoy  = datos.filter(d => d.fechaAtencion === hoyFormateado || d.fechaAtencion === hoyISO).length;
  const gestantes     = datos.filter(d => d.gestante === 'G' || d.gestante === 'P').length;
  const positivos     = datos.filter(d => d.resultadoTamizaje === 'Positivo').length;

  const porSector = Object.entries(
    datos.reduce((acc, d) => { acc[d.sector] = (acc[d.sector] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const porDiag = Object.entries(
    datos.reduce((acc, d) => {
      if (d.diagnostico) acc[d.diagnostico] = (acc[d.diagnostico] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  const porSexo = [
    { name: 'Femenino',  value: datos.filter(d => d.sexo === 'F').length },
    { name: 'Masculino', value: datos.filter(d => d.sexo === 'M').length },
  ];

  const stats = [
    { label: 'Total del Mes',     value: total,        icon: '👥', color: 'from-rosa-400 to-rosa-600',     sub: mesSeleccionado },
    { label: 'Atendidos Hoy',     value: atendidosHoy, icon: '📅', color: 'from-celeste-400 to-celeste-600', sub: 'hoy' },
    { label: 'Gestantes',         value: gestantes,    icon: '🤰', color: 'from-purple-400 to-purple-600',  sub: 'activas' },
    { label: 'Tamizaje Positivo', value: positivos,    icon: '⚠️', color: 'from-amber-400 to-amber-600',   sub: 'requieren seguimiento' },
  ];

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">

      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {obtenerSaludo()}, Lic. Janeth 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Selector de mes */}
      <div className="card mb-5 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 flex-shrink-0">
          <span>📆</span> Período:
        </span>
        <div className="relative flex-1 max-w-xs">
          <select
            value={mesSeleccionado}
            onChange={e => setMesSeleccionado(e.target.value)}
            className="w-full appearance-none rounded-xl border-2 border-rosa-200 bg-gradient-to-r from-rosa-50 to-celeste-50 px-4 py-2 pr-9 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:border-rosa-400 cursor-pointer transition-colors"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <optgroup label="── 2025 ──">
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </optgroup>
            <optgroup label="── 2026 ──">
              {MESES.map(m => <option key={`${m} 2026`} value={`${m} 2026`}>{m} 2026</option>)}
            </optgroup>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-rosa-400 text-xs font-bold">▼</span>
        </div>
        {loading && <div className="w-5 h-5 border-2 border-rosa-200 border-t-rosa-500 rounded-full animate-spin flex-shrink-0" />}
      </div>

      {/* Error */}
      {errorCarga && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">No se pudieron cargar los datos</p>
            <p className="text-xs mt-0.5">{errorCarga}</p>
          </div>
          <button
            onClick={() => { setLoading(true); setErrorCarga(''); obtenerRegistros(mesSeleccionado).then(d => setDatos(Array.isArray(d) ? d : [])).catch(err => setErrorCarga(err.message)).finally(() => setLoading(false)); }}
            className="ml-auto text-xs bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Spinner */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Cargando datos de {mesSeleccionado}...
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {stats.map((s, i) => (
              <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-sm fade-in-up`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold opacity-80">{s.label}</p>
                    <p className="text-3xl font-extrabold mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.value}</p>
                    <p className="text-xs opacity-70 mt-0.5">{s.sub}</p>
                  </div>
                  <span className="text-2xl opacity-80">{s.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 🔔 ALERTAS DE SEGUIMIENTO */}
          <AlertasSeguimiento navigate={navigate} />

          {/* Nuevo paciente */}
          <div className="card mb-6 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">¿Nuevo paciente?</p>
              <p className="text-sm text-gray-500">Registra una nueva atención rápidamente</p>
            </div>
            <button onClick={() => navigate('/registro')} className="btn-rosa flex items-center gap-2">
              <span>✏️</span> Nuevo Registro
            </button>
          </div>

          {/* Gráficas */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="card">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rosa-400 inline-block"></span>
                Pacientes por Sector
              </h3>
              {porSector.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos para este período</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={porSector} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill={ROSA} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-celeste-400 inline-block"></span>
                Distribución por Sexo
              </h3>
              {(porSexo[0].value === 0 && porSexo[1].value === 0) ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos para este período</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={porSexo} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value"
                      label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false} fontSize={11}>
                      {porSexo.map((_, i) => <Cell key={i} fill={[ROSA, CELESTE][i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Diagnósticos */}
          <div className="card mb-4">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400 inline-block"></span>
              Diagnósticos Más Frecuentes
            </h3>
            <div className="space-y-2">
              {porDiag.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin diagnósticos para este período</p>
              ) : porDiag.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-16 text-right">{d.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className="h-3 rounded-full transition-all duration-500"
                      style={{ width: `${total > 0 ? (d.value / total) * 100 : 0}%`, background: COLORS[i] }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 w-6">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas atenciones */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                Últimas Atenciones
              </h3>
              <button onClick={() => navigate('/pacientes')} className="text-xs text-rosa-500 font-semibold hover:underline">
                Ver todos →
              </button>
            </div>
            <div className="space-y-2">
              {datos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin atenciones en este período</p>
              ) : datos.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rosa-50 transition-colors cursor-pointer" onClick={() => navigate('/pacientes')}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rosa-200 to-celeste-200 flex items-center justify-center text-sm font-bold text-rosa-700 flex-shrink-0">
                    {p.nombres?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.nombres}</p>
                    <p className="text-xs text-gray-400">{p.sector} · {p.fechaAtencion}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${p.resultadoTamizaje === 'Positivo' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {p.resultadoTamizaje || 'S/D'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}