import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { obtenerRegistros } from '../utils/sheets';

const ROSA = '#ec4899';
const CELESTE = '#0ea5e9';
const COLORS = ['#ec4899', '#0ea5e9', '#a855f7', '#f59e0b', '#10b981', '#ef4444'];

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const obtenerMesActual = () => {
  const now = new Date();
  const mes = MESES[now.getMonth()];
  const año = now.getFullYear();
  return año === 2025 ? mes : `${mes} ${año}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [mesSeleccionado, setMesSeleccionado] = useState(obtenerMesActual);
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    obtenerRegistros(mesSeleccionado)
      .then(d => setDatos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [mesSeleccionado]);

  // Estadísticas
  const total = datos.length;
  const hoy = new Date().toISOString().split('T')[0];
  const atendidosHoy = datos.filter(d => d.fechaAtencion === hoy).length;
  const gestantes = datos.filter(d => d.gestante === 'G' || d.gestante === 'P').length;
  const positivos = datos.filter(d => d.resultadoTamizaje === 'Positivo').length;

  // Por sector
  const porSector = Object.entries(
    datos.reduce((acc, d) => { acc[d.sector] = (acc[d.sector] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Por diagnóstico
  const porDiag = Object.entries(
    datos.reduce((acc, d) => {
      if (d.diagnostico) acc[d.diagnostico] = (acc[d.diagnostico] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  // Por sexo
  const porSexo = [
    { name: 'Femenino', value: datos.filter(d => d.sexo === 'F').length },
    { name: 'Masculino', value: datos.filter(d => d.sexo === 'M').length },
  ];

  const stats = [
    { label: 'Total del Mes', value: total, icon: '👥', color: 'from-rosa-400 to-rosa-600', sub: mesSeleccionado },
    { label: 'Atendidos Hoy', value: atendidosHoy, icon: '📅', color: 'from-celeste-400 to-celeste-600', sub: 'hoy' },
    { label: 'Gestantes', value: gestantes, icon: '🤰', color: 'from-purple-400 to-purple-600', sub: 'activas' },
    { label: 'Tamizaje Positivo', value: positivos, icon: '⚠️', color: 'from-amber-400 to-amber-600', sub: 'requieren seguimiento' },
  ];

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Buenos días, Lic. Janeth 👋
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
              {MESES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </optgroup>
            <optgroup label="── 2026 ──">
              {MESES.map(m => (
                <option key={`${m} 2026`} value={`${m} 2026`}>{m} 2026</option>
              ))}
            </optgroup>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-rosa-400 text-xs font-bold">▼</span>
        </div>
        {loading && (
          <div className="w-5 h-5 border-2 border-rosa-200 border-t-rosa-500 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Spinner de carga principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Cargando datos de {mesSeleccionado}...
          </p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {stats.map((s, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-sm fade-in-up`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
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

          {/* Botón acción rápida */}
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
            {/* Por sector */}
            <div className="card">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rosa-400 inline-block"></span>
                Pacientes por Sector
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={porSector} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" fill={ROSA} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Por sexo */}
            <div className="card">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-celeste-400 inline-block"></span>
                Distribución por Sexo
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={porSexo}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {porSexo.map((_, i) => <Cell key={i} fill={[ROSA, CELESTE][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diagnósticos más frecuentes */}
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
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ width: `${total > 0 ? (d.value / total) * 100 : 0}%`, background: COLORS[i] }}
                    />
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
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rosa-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/pacientes')}
                >
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
