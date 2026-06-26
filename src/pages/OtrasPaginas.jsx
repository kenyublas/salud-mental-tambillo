import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerRegistros, buscarPacientes, obtenerMesActual, MESES } from '../utils/sheets';
import { descargarPDF, imprimirPDF } from '../utils/pdf';

// ── Gestantes ─────────────────────────────────────────────────────────────────
export function Gestantes() {
  const navigate = useNavigate();
  const [mesSeleccionado, setMesSeleccionado] = useState(obtenerMesActual);
  const [gestantes, setGestantes]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda]     = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    setLoading(true); setErrorCarga(''); setSeleccionada(null);
    obtenerRegistros(mesSeleccionado)
      .then(data => {
        const lista = Array.isArray(data) ? data : [];
        setGestantes(lista.filter(p => p.gestante === 'G' || p.gestante === 'P'));
      })
      .catch(err => { setErrorCarga(err.message || 'Error al conectar.'); setGestantes([]); })
      .finally(() => setLoading(false));
  }, [mesSeleccionado]);

  // Calcular días para FPP
  const diasParaFPP = (fpp) => {
    if (!fpp) return null;
    const m = fpp.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const fecha = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const dias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const filtradas = gestantes.filter(g => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return g.nombres?.toLowerCase().includes(q) || g.dni?.includes(q) || g.sector?.toLowerCase().includes(q);
  });

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Gestantes / Puérperas 🤰
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{gestantes.length} registradas en {mesSeleccionado}</p>
        </div>
        <button onClick={() => navigate('/registro')} className="btn-rosa text-sm">+ Nueva</button>
      </div>

      {/* Selector de mes */}
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5"><span>📆</span> Período:</span>
        <div className="relative flex-1 max-w-xs">
          <select value={mesSeleccionado} onChange={e => setMesSeleccionado(e.target.value)}
            className="w-full appearance-none rounded-xl border-2 border-rosa-200 bg-gradient-to-r from-rosa-50 to-celeste-50 px-4 py-2 pr-9 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:border-rosa-400 cursor-pointer"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            <optgroup label="── 2025 ──">{MESES.map(m => <option key={m} value={m}>{m}</option>)}</optgroup>
            <optgroup label="── 2026 ──">{MESES.map(m => <option key={`${m} 2026`} value={`${m} 2026`}>{m} 2026</option>)}</optgroup>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-rosa-400 text-xs font-bold">▼</span>
        </div>
        {loading && <div className="w-5 h-5 border-2 border-rosa-200 border-t-rosa-500 rounded-full animate-spin flex-shrink-0" />}
      </div>

      {/* Búsqueda */}
      <div className="card mb-4">
        <input className="input-field w-full" placeholder="🔍 Buscar por nombre, DNI o sector..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {errorCarga && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2">
          <span>⚠️</span><span>{errorCarga}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-rosa-400">Cargando gestantes de {mesSeleccionado}...</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🤰</p>
          <p className="text-sm">No hay gestantes registradas en {mesSeleccionado}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Lista */}
          <div className="space-y-2">
            {filtradas.map((g) => {
              const dias = diasParaFPP(g.fechaProbableParto);
              const urgente = dias !== null && dias >= 0 && dias <= 30;
              const pasado  = dias !== null && dias < 0;
              return (
                <div key={g.id} onClick={() => setSeleccionada(g)}
                  className={`card cursor-pointer hover:shadow-md transition-all ${seleccionada?.id === g.id ? 'border-purple-400 bg-purple-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {g.nombres?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{g.nombres}</p>
                      <p className="text-xs text-gray-400">DNI: {g.dni} · {g.sector}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.gestante === 'G' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {g.gestante === 'G' ? '🤰 Gestante' : '👶 Puérpera'}
                        </span>
                        {g.semanaGestacional && (
                          <span className="text-[10px] font-semibold text-gray-500">{g.semanaGestacional} sem.</span>
                        )}
                        {dias !== null && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pasado ? 'bg-gray-100 text-gray-500' :
                            urgente ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {pasado ? `FPP hace ${Math.abs(dias)}d` : urgente ? `⚠️ FPP en ${dias}d` : `FPP en ${dias}d`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel detalle */}
          {seleccionada ? (
            <div className="card sticky top-20 self-start">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                    {seleccionada.nombres?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{seleccionada.nombres}</h3>
                    <p className="text-xs text-gray-400">DNI: {seleccionada.dni}</p>
                  </div>
                </div>
                <button onClick={() => setSeleccionada(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-3 text-sm">
                {/* Badge estado */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${seleccionada.gestante === 'G' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {seleccionada.gestante === 'G' ? '🤰 Gestante' : '👶 Puérpera'}
                  </span>
                  {seleccionada.semanaGestacional && (
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      Sem. {seleccionada.semanaGestacional}
                    </span>
                  )}
                </div>

                {/* Datos obstétricos */}
                <div className="bg-purple-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-purple-600 uppercase">Datos Obstétricos</p>
                  {[
                    ['FUR', seleccionada.fur],
                    ['Semanas Gestacionales', seleccionada.semanaGestacional],
                    ['Fecha Probable de Parto', seleccionada.fechaProbableParto],
                  ].filter(([,v]) => v).map(([l, v]) => (
                    <div key={l} className="flex gap-2">
                      <span className="text-gray-400 text-xs w-36 flex-shrink-0">{l}</span>
                      <span className="font-semibold text-gray-800 text-xs">{v}</span>
                    </div>
                  ))}
                  {(() => {
                    const dias = diasParaFPP(seleccionada.fechaProbableParto);
                    if (dias === null) return null;
                    return (
                      <div className={`mt-2 text-center text-xs font-bold py-1.5 rounded-lg ${
                        dias < 0 ? 'bg-gray-100 text-gray-500' :
                        dias <= 7 ? 'bg-red-100 text-red-700' :
                        dias <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {dias < 0 ? `Fecha probable de parto fue hace ${Math.abs(dias)} días` :
                         dias === 0 ? '🚨 Fecha probable de parto es HOY' :
                         dias <= 7 ? `🚨 Faltan ${dias} día(s) para la fecha probable de parto` :
                         `Faltan ${dias} días para la fecha probable de parto`}
                      </div>
                    );
                  })()}
                </div>

                {/* Datos generales */}
                <div className="space-y-1">
                  {[
                    ['Edad', seleccionada.edad ? seleccionada.edad + ' años' : ''],
                    ['Sector', seleccionada.sector],
                    ['Sectorista', seleccionada.sectorista],
                    ['Celular', seleccionada.celular],
                    ['Seguro', seleccionada.seguro],
                    ['HCL', seleccionada.hcl],
                    ['Diagnóstico', seleccionada.diagnostico],
                  ].filter(([,v]) => v).map(([l, v]) => (
                    <div key={l} className="flex gap-2">
                      <span className="text-gray-400 text-xs w-24 flex-shrink-0">{l}</span>
                      <span className="font-semibold text-gray-800 text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones PDF */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-purple-100">
                <button onClick={() => descargarPDF(seleccionada)} className="btn-rosa text-xs flex items-center gap-1.5 flex-1">
                  📄 Descargar PDF
                </button>
                <button onClick={() => imprimirPDF(seleccionada)} className="btn-celeste text-xs flex items-center gap-1.5 flex-1">
                  🖨️ Imprimir
                </button>
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center text-gray-300 min-h-32">
              <div className="text-center">
                <p className="text-4xl mb-2">👆</p>
                <p className="text-sm">Selecciona una gestante para ver sus detalles</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Referencias() {
  const [refs] = useState([
    { id:1, fecha:'2023-01-16', origen:'CS. PANAO', nombres:'Kiliam Jahir Trujillo Rojas', dni:'91930799', seguro:'SIS', codDiag:'F809', descripcion:'Habla y Lenguaje', profesional:'Psico. Isabel' },
    { id:2, fecha:'2023-02-23', origen:'CS. PANAO', nombres:'Jose Jhomar Meneses Aguirre', dni:'61020275', seguro:'SIS', codDiag:'F412', descripcion:'Trastorno ansioso', profesional:'Psico. Belex' },
    { id:3, fecha:'2023-03-16', origen:'CS. PANAO', nombres:'Violeta Tucto Borja', dni:'42397821', seguro:'SIS', codDiag:'F413', descripcion:'', profesional:'Psico. Isabel' },
  ]);

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-extrabold text-gray-800 mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
        📋 Referencias / Contrarreferencias
      </h1>
      <div className="space-y-3">
        {refs.map(r => (
          <div key={r.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-celeste-100 flex items-center justify-center text-celeste-700 font-bold text-sm flex-shrink-0">{r.id}</div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-bold text-gray-800 text-sm">{r.nombres}</p>
                  <span className="text-xs text-gray-400">{r.fecha}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">DNI: {r.dni} · {r.origen} · {r.profesional}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-celeste-100 text-celeste-700 px-2 py-0.5 rounded-full font-semibold">{r.codDiag}</span>
                  {r.descripcion && <span className="text-xs text-gray-500">{r.descripcion}</span>}
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{r.seguro}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppsSM() {
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-extrabold text-gray-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>🏥 APPs en Salud Mental</h1>
      <p className="text-sm text-gray-400 mb-5">Actividades de Salud Mental - C.S. Tambillo</p>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-celeste-50">
                {['Mes','N°','Fecha','Sesión Educativa','APP-Población','Participantes','Lugar','Responsable','Turno'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-bold text-celeste-700 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meses.map(mes => (
                <React.Fragment key={mes}>
                  <tr className="bg-rosa-50"><td colSpan={9} className="px-3 py-1.5 font-bold text-rosa-700 text-xs">{mes}</td></tr>
                  <tr className="border-b border-gray-100">
                    {['','','','','','','','',''].map((_, i) => (
                      <td key={i} className="px-2 py-2">
                        <input className="w-full border-b border-dashed border-gray-200 bg-transparent outline-none text-xs py-0.5" placeholder="..." />
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}