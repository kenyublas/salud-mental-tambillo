import React, { useState, useEffect } from 'react';
import apiFetch from '../utils/api';

// ── Categorías con sus programas ──────────────────────────────────────────
const CATEGORIAS = [
  {
    key: 'afectivos',
    label: 'Trastornos Afectivos y Ansiedad',
    icono: '🧠',
    color: { from: '#6366f1', to: '#8b5cf6', light: '#ede9fe', text: '#4f46e5', border: '#c4b5fd' },
    programas: [
      { hoja: 'TTO TXS DEPRESIVO',    label: 'Depresión',       meta: 45 },
      { hoja: 'TTO TXT CX SUICIDA',   label: 'Conducta Suicida', meta: 6  },
      { hoja: 'TTO TXT ANSIEDAD',     label: 'Ansiedad',        meta: 60 },
    ],
  },
  {
    key: 'violencia',
    label: 'Violencia y Problemas Psicosociales',
    icono: '🛡️',
    color: { from: '#ec4899', to: '#f43f5e', light: '#fce7f3', text: '#be185d', border: '#fbcfe8' },
    programas: [
      { hoja: 'TTO VIF. Y SEXUAL > 18 AÑOS',    label: 'VIF > 18 años',      meta: 53 },
      { hoja: 'TTO VIOL. INFANTIL  0-17 AÑOS',  label: 'Maltrato Infantil',  meta: 20 },
      { hoja: 'TTO V. SEXUAL DE  0-17 AÑOS',    label: 'V. Sexual 0-17',     meta: 6  },
      { hoja: 'TTO AUTISMO',                    label: 'Autismo',            meta: 6  },
      { hoja: 'TTO TX MENTAL Y COMP. 0-17 AÑOS',label: 'TX Mental 0-17',     meta: 60 },
    ],
  },
  {
    key: 'alcohol',
    label: 'Alcohol y Trastornos Psicóticos',
    icono: '⚕️',
    color: { from: '#0ea5e9', to: '#06b6d4', light: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    programas: [
      { hoja: 'TTO INTERV CONSUMO OH',           label: 'Consumo Alcohol',    meta: 42 },
      { hoja: 'TTO DEPENDENCIA OH',              label: 'Dependencia OH',     meta: 6  },
      { hoja: 'TTO ESPECT.ESQUIZOFRENIA EE.SS',  label: 'Esquizofrenia',      meta: 6  },
    ],
  },
];

// ── Mini barra de progreso ────────────────────────────────────────────────
function BarraProgreso({ avance, meta, color, altura = 6 }) {
  const pct = meta > 0 ? Math.min(Math.round((avance / meta) * 100), 100) : 0;
  return (
    <div className="w-full rounded-full bg-gray-100" style={{ height: altura }}>
      <div
        className="rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          height: altura,
          background: `linear-gradient(90deg, ${color.from}, ${color.to})`,
        }}
      />
    </div>
  );
}

// ── Badge de porcentaje ───────────────────────────────────────────────────
function BadgePct({ pct, color }) {
  const estilo =
    pct >= 80 ? { bg: '#dcfce7', text: '#15803d' } :
    pct >= 50 ? { bg: '#fef9c3', text: '#a16207' } :
                { bg: '#fee2e2', text: '#b91c1c' };
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: estilo.bg, color: estilo.text }}>
      {pct}%
    </span>
  );
}

// ── Tarjeta de categoría ──────────────────────────────────────────────────
function TarjetaCategoria({ categoria, avances, defaultAbierto }) {
  const [abierto, setAbierto] = useState(defaultAbierto);
  const { color, label, icono, programas } = categoria;

  const totalMeta   = programas.reduce((a, p) => a + p.meta, 0);
  const totalAvance = programas.reduce((a, p) => a + (avances[p.hoja] ?? 0), 0);
  const pctCategoria = totalMeta > 0 ? Math.round((totalAvance / totalMeta) * 100) : 0;

  return (
    <div className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{ borderColor: color.border, background: 'white' }}>

      {/* Header de categoría — clickeable */}
      <button
        onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-90 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${color.from}15, ${color.to}10)` }}
      >
        {/* Ícono */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>
          {icono}
        </div>

        {/* Título + barra resumen */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: color.text }}>{label}</p>
          <div className="flex items-center gap-2 mt-1">
            <BarraProgreso avance={totalAvance} meta={totalMeta} color={color} altura={4} />
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: color.text }}>
              {totalAvance}/{totalMeta}
            </span>
          </div>
        </div>

        {/* Badge % + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <BadgePct pct={pctCategoria} color={color} />
          <span className="text-gray-400 text-xs transition-transform duration-200"
            style={{ transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
            ▼
          </span>
        </div>
      </button>

      {/* Detalle de programas */}
      {abierto && (
        <div className="px-4 pb-3 pt-2 space-y-2.5 border-t" style={{ borderColor: color.border }}>
          {programas.map((p, i) => {
            const av = avances[p.hoja] ?? 0;
            const pct = p.meta > 0 ? Math.round((av / p.meta) * 100) : 0;
            return (
              <div key={i} className="flex items-center gap-3">
                {/* Punto de color */}
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }} />
                {/* Nombre */}
                <span className="text-xs text-gray-600 font-semibold w-36 flex-shrink-0 truncate">{p.label}</span>
                {/* Barra */}
                <div className="flex-1">
                  <BarraProgreso avance={av} meta={p.meta} color={color} altura={5} />
                </div>
                {/* Números */}
                <span className="text-[10px] text-gray-500 font-bold w-12 text-right flex-shrink-0">
                  {av}/{p.meta}
                </span>
                {/* Badge */}
                <BadgePct pct={pct} color={color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function MetasVsAvance() {
  const [avances, setAvances]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [ultimaActu, setUltimaActu] = useState(null);

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      // Cargar avance real de cada hoja en paralelo
      const todasHojas = CATEGORIAS.flatMap(c => c.programas.map(p => p.hoja));
      const resultados = await Promise.all(
        todasHojas.map(async (hoja) => {
          try {
            const data = await apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}`);
            return { hoja, total: data.total || 0 };
          } catch {
            return { hoja, total: 0 };
          }
        })
      );
      const mapa = {};
      resultados.forEach(r => { mapa[r.hoja] = r.total; });
      setAvances(mapa);
      setUltimaActu(new Date());
    } catch(e) {
      setError('No se pudieron cargar los avances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Totales globales
  const totalMeta   = CATEGORIAS.flatMap(c => c.programas).reduce((a, p) => a + p.meta, 0);
  const totalAvance = CATEGORIAS.flatMap(c => c.programas).reduce((a, p) => a + (avances[p.hoja] ?? 0), 0);
  const pctGlobal   = totalMeta > 0 ? Math.round((totalAvance / totalMeta) * 100) : 0;

  const colorGlobal = pctGlobal >= 80 ? '#15803d' : pctGlobal >= 50 ? '#a16207' : '#b91c1c';

  return (
    <div className="card mb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            🎯 Metas 2026
          </h3>
          {ultimaActu && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              Actualizado {ultimaActu.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="text-xs font-semibold text-rosa-500 hover:text-rosa-700 flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading
            ? <div className="w-3.5 h-3.5 border-2 border-rosa-300 border-t-rosa-600 rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          }
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Resumen global */}
      {!loading && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #f8faff, #f0f4ff)' }}>
          {/* Número grande */}
          <div className="text-center flex-shrink-0">
            <p className="text-3xl font-extrabold leading-none" style={{ color: colorGlobal, fontFamily: 'Poppins, sans-serif' }}>
              {pctGlobal}%
            </p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">avance total</p>
          </div>
          {/* Barra + detalle */}
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${pctGlobal}%`,
                  background: 'linear-gradient(90deg, #6366f1, #ec4899, #0ea5e9)',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
              <span>{totalAvance} pacientes atendidos</span>
              <span>Meta: {totalMeta}</span>
            </div>
          </div>
        </div>
      )}

      {/* Categorías */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {CATEGORIAS.map((cat, i) => (
            <TarjetaCategoria
              key={cat.key}
              categoria={cat}
              avances={avances}
              defaultAbierto={i === 0}
            />
          ))}
        </div>
      )}

      {/* Leyenda */}
      {!loading && (
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
          {[
            { color: '#15803d', bg: '#dcfce7', label: '≥ 80% En meta' },
            { color: '#a16207', bg: '#fef9c3', label: '50–79% En progreso' },
            { color: '#b91c1c', bg: '#fee2e2', label: '< 50% Requiere atención' },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.bg, border: `1.5px solid ${l.color}` }} />
              <span className="text-[10px] text-gray-500 font-semibold">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}