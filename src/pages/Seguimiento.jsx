import React, { useState, useEffect, useCallback } from 'react';
import { authHeaders, logout } from '../utils/auth';
import { descargarPDFSeguimiento, imprimirPDFSeguimiento } from '../utils/pdf';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SECTORES = [
  'PINQUIRAY','LA PUNTA','CASA BLANCA','HUANIN','GOYAR PUNTA',
  'AURAGSHAY','CRUZ PUNTA','TAMBILLO','PANAOCOCHA','SHALLA',
  'SAN MARCOS','CHACHASPATA','RAMOS CURVA',
];

const HOJAS_SOLO_LECTURA = ['TA - 2026', 'Hoja1'];

async function apiFetch(url, opts = {}) {
  const res = await fetch(`${API}${url}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) { logout(); window.location.reload(); }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`); }
  return res.json();
}

const TABS = [
  { key: 'hojas',  icon: '📋', label: 'Hojas' },
  { key: 'buscar', icon: '🔍', label: 'Buscar' },
  { key: 'nuevo',  icon: '➕', label: 'Nuevo Registro' },
];

const HOJA_COLORES = {
  'TTO TXS DEPRESIVO':               { bg: 'from-blue-500 to-blue-700',     light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  'TTO VIF. Y SEXUAL > 18 AÑOS':    { bg: 'from-rose-500 to-rose-700',     light: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200'    },
  'TTO VIOL. INFANTIL  0-17 AÑOS':  { bg: 'from-orange-500 to-orange-700', light: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200'  },
  'TTO V. SEXUAL DE  0-17 AÑOS':    { bg: 'from-pink-500 to-pink-700',     light: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200'    },
  'TTO AUTISMO':                     { bg: 'from-violet-500 to-violet-700', light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200'  },
  'TTO TX MENTAL Y COMP. 0-17 AÑOS':{ bg: 'from-indigo-500 to-indigo-700', light: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200'  },
  'TTO TXT CX SUICIDA':              { bg: 'from-red-500 to-red-700',       light: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
  'TTO TXT ANSIEDAD':                { bg: 'from-amber-500 to-amber-700',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  'TTO INTERV CONSUMO OH':           { bg: 'from-teal-500 to-teal-700',     light: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'    },
  'TTO DEPENDENCIA OH':              { bg: 'from-cyan-500 to-cyan-700',     light: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200'    },
  'TTO ESPECT.ESQUIZOFRENIA EE.SS':  { bg: 'from-purple-500 to-purple-700', light: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  'VIPOL 1 FORTALECIMIENTO':         { bg: 'from-green-500 to-green-700',   light: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200'   },
  'VIPOL 2 ACOMPAÑAMIENTO':          { bg: 'from-emerald-500 to-emerald-700',light:'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'VIPOL 3 RECONSTRUCCION':          { bg: 'from-lime-500 to-lime-700',     light: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200'    },
  'FAMILIAS FUERTES':                { bg: 'from-sky-500 to-sky-700',       light: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200'     },
  'SS. HH.SS ADOLESCENTES':          { bg: 'from-fuchsia-500 to-fuchsia-700',light:'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  'SS. HH.SS NIÑOS':                 { bg: 'from-rose-400 to-rose-600',     light: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200'    },
  'PRIMEROS AUX. PSICOLOGICOS':      { bg: 'from-red-400 to-red-600',       light: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200'     },
  'MADRES Y PADRES CUIDADORES':      { bg: 'from-orange-400 to-orange-600', light: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200'  },
  'PAREJAS CONSEJERIA':              { bg: 'from-pink-400 to-pink-600',     light: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-200'    },
  'LIDERES ADOLESCENTES':            { bg: 'from-violet-400 to-violet-600', light: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200'  },
  'AGENTES COMUNITARIOS':            { bg: 'from-green-400 to-green-600',   light: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-200'   },
};

const colorHoja = (nombre) => HOJA_COLORES[nombre] || {
  bg: 'from-gray-500 to-gray-700', light: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200'
};

// ── Ficha del paciente ────────────────────────────────────────────────────────
function FichaPaciente({ paciente, hoja, schema, onAgregarSesion, onActualizarMeta, onCerrar }) {
  const [modalSesion, setModalSesion]     = useState(null);
  const [fechaSesion, setFechaSesion]     = useState(new Date().toISOString().split('T')[0]);
  const [guardandoSes, setGuardandoSes]   = useState(false);
  const [errorSes, setErrorSes]           = useState('');
  const [metaEdit, setMetaEdit]           = useState({});
  const [guardandoMeta, setGuardandoMeta] = useState(false);
  const [generandoPDF, setGenerandoPDF]   = useState(false);
  const col = colorHoja(hoja);

  useEffect(() => {
    if (!paciente || !schema) return;
    const init = {};
    schema.colsMeta?.forEach(c => { init[c.key] = paciente[c.key] || ''; });
    setMetaEdit(init);
  }, [paciente, schema]);

  if (!paciente || !schema) return null;

  const agregarSesion = async () => {
    if (!modalSesion || !fechaSesion) return;
    setGuardandoSes(true); setErrorSes('');
    try {
      await apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}/sesion`, {
        method: 'PUT',
        body: JSON.stringify({ rowNum: paciente.id, grupoKey: modalSesion.grupoKey, fecha: fechaSesion }),
      });
      setModalSesion(null);
      onAgregarSesion();
    } catch (e) { setErrorSes(e.message); }
    finally { setGuardandoSes(false); }
  };

  const guardarMeta = async () => {
    setGuardandoMeta(true);
    try {
      await apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}/meta`, {
        method: 'PUT',
        body: JSON.stringify({ rowNum: paciente.id, ...metaEdit }),
      });
      onActualizarMeta(metaEdit);
    } catch (e) { alert(e.message); }
    finally { setGuardandoMeta(false); }
  };

  const handleDescargar = async () => {
    setGenerandoPDF(true);
    try { await descargarPDFSeguimiento(paciente, hoja, schema); }
    catch (e) { alert('Error al generar PDF: ' + e.message); }
    finally { setGenerandoPDF(false); }
  };

  const handleImprimir = async () => {
    setGenerandoPDF(true);
    try { await imprimirPDFSeguimiento(paciente, hoja, schema); }
    catch (e) { alert('Error al imprimir: ' + e.message); }
    finally { setGenerandoPDF(false); }
  };

  const numOrdinal = (n) => ['1ra','2da','3ra','4ta','5ta','6ta','7ma','8va','9na','10ma'][n] || `${n+1}ra`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">

        {/* Header */}
        <div className={`bg-gradient-to-r ${col.bg} px-6 py-5 text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold opacity-75 mb-1 truncate">{hoja}</p>
              <h2 className="text-xl font-extrabold truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {paciente.nombres}
              </h2>
              <div className="flex items-center gap-3 mt-2 text-sm opacity-90 flex-wrap">
                <span>🪪 {paciente.dni}</span>
                <span>· {paciente.edad} años</span>
                <span>· {paciente.sexo === 'F' ? '♀️' : '♂️'} {paciente.sexo}</span>
              </div>
            </div>
            <button onClick={onCerrar} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0 ml-3">✕</button>
          </div>

          {/* Botones PDF */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleDescargar}
              disabled={generandoPDF}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {generandoPDF ? '⏳' : '⬇️'} Descargar PDF
            </button>
            <button
              onClick={handleImprimir}
              disabled={generandoPDF}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">

          {/* Datos del paciente */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Sector',      val: paciente.sector },
              { label: 'Sectorista',  val: paciente.sectorista },
              { label: 'Celular',     val: paciente.celular },
              { label: 'HCL',         val: paciente.hcl },
              { label: 'Diagnóstico', val: paciente.diagnostico, full: true },
              { label: 'Dirección',   val: paciente.direccion,   full: true },
              { label: 'Apoderado',   val: paciente.apoderado,   full: true },
            ].filter(i => i.val).map((item, i) => (
              <div key={i} className={item.full ? 'col-span-2' : ''}>
                <p className="text-xs text-gray-400 font-semibold">{item.label}</p>
                <p className="text-gray-800 font-medium">{item.val}</p>
              </div>
            ))}
          </div>

          {/* Sesiones */}
          <div>
            <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${col.bg}`}></span>
              Historial de sesiones
            </h3>
            <div className="space-y-3">
              {schema.gruposSesiones?.map(grupo => {
                const ses = paciente.sesiones?.[grupo.key];
                if (!ses) return null;
                const pct = Math.round((ses.completadas / ses.total) * 100);
                const sigSesion = ses.siguiente;
                const completo = sigSesion === -1;

                return (
                  <div key={grupo.key} className={`rounded-xl border ${col.border} ${col.light} p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-700 leading-tight max-w-[70%]">{grupo.label}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${completo ? 'bg-green-100 text-green-700' : `${col.light} ${col.text}`}`}>
                        {ses.completadas}/{ses.total}
                      </span>
                    </div>

                    <div className="w-full bg-white rounded-full h-1.5 mb-2">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${col.bg} transition-all`} style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ses.fechas.map((f, i) => (
                        <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                          f ? `${col.light} ${col.text}` : 'bg-gray-100 text-gray-400'
                        }`}>
                          {numOrdinal(i)}: {f || '—'}
                        </span>
                      ))}
                    </div>

                    {!completo ? (
                      <button
                        onClick={() => setModalSesion({ grupoKey: grupo.key, label: grupo.label, sesionNum: sigSesion })}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r ${col.bg} text-white hover:opacity-90 transition-opacity`}
                      >
                        + Agregar {numOrdinal(sigSesion)} sesión
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-green-600 flex items-center gap-1">✅ Completado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campos meta */}
          {schema.colsMeta && schema.colsMeta.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${col.bg}`}></span>
                Datos adicionales
              </h3>
              <div className="space-y-2">
{schema.colsMeta.map(c => {
  const esFecha = c.key === 'proyeccion' || c.key === 'referido' || c.label.toLowerCase().includes('fecha') || c.label.toLowerCase().includes('proyeccion');
  return (
    <div key={c.key}>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{c.label}</label>
      <input
        className="input-field w-full text-sm"
        type={esFecha ? 'date' : 'text'}
        value={metaEdit[c.key] || ''}
        onChange={e => setMetaEdit(p => ({ ...p, [c.key]: e.target.value }))}
        placeholder={esFecha ? '' : c.label}
      />
    </div>
  );
})}
                <button
                  onClick={guardarMeta}
                  disabled={guardandoMeta}
                  className={`w-full text-sm font-bold py-2 rounded-xl bg-gradient-to-r ${col.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-60`}
                >
                  {guardandoMeta ? 'Guardando...' : '💾 Guardar datos adicionales'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar sesión */}
      {modalSesion && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-extrabold text-gray-800 text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {numOrdinal(modalSesion.sesionNum)} sesión
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{modalSesion.label}</p>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Fecha de la sesión</label>
            <input
              type="date"
              className="input-field w-full mb-4"
              value={fechaSesion}
              onChange={e => setFechaSesion(e.target.value)}
            />
            {errorSes && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-3">⚠️ {errorSes}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalSesion(null)} className="btn-outline flex-1">Cancelar</button>
              <button
                onClick={agregarSesion}
                disabled={guardandoSes || !fechaSesion}
                className={`flex-1 font-bold py-2 rounded-xl bg-gradient-to-r ${col.bg} text-white hover:opacity-90 disabled:opacity-60`}
              >
                {guardandoSes ? 'Guardando...' : 'Agregar sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nuevo Registro ────────────────────────────────────────────────────────────
function NuevoRegistro({ hojas, onGuardado }) {
  const [hojaSeleccionada, setHojaSeleccionada] = useState('');
  const [schema, setSchema]               = useState(null);
  const [form, setForm]                   = useState({});
  const [buscandoDNI, setBuscandoDNI]     = useState(false);
  const [dniEstado, setDniEstado]         = useState('');
  const [pacienteExistente, setPacienteExistente] = useState(null);
  const [buscandoPaciente, setBuscandoPaciente]   = useState(false);
  const [guardando, setGuardando]         = useState(false);
  const [guardado, setGuardado]           = useState(false);
  const [error, setError]                 = useState('');
  const col = colorHoja(hojaSeleccionada);

  useEffect(() => {
    if (!hojaSeleccionada) { setSchema(null); setForm({}); setPacienteExistente(null); setDniEstado(''); return; }
    apiFetch(`/api/seguimiento/schema/${encodeURIComponent(hojaSeleccionada)}`)
      .then(s => {
        setSchema(s.tieneSchema ? s : null);
        setForm({ psicologo: 'Lic. Janeth Karina Santa Cruz Espiritu', fechaAtencion: new Date().toISOString().split('T')[0] });
        setPacienteExistente(null);
        setDniEstado('');
      })
      .catch(() => setSchema(null));
  }, [hojaSeleccionada]);

  const handleDNI = async (val) => {
    setForm(f => ({ ...f, dni: val }));
    setDniEstado(''); setPacienteExistente(null);
    if (val.length !== 8 || !/^\d{8}$/.test(val)) return;

    if (hojaSeleccionada) {
      setBuscandoPaciente(true);
      try {
        const pac = await apiFetch(`/api/seguimiento/${encodeURIComponent(hojaSeleccionada)}/paciente/${val}`);
        setPacienteExistente(pac);
        setBuscandoPaciente(false);
        return;
      } catch {}
      setBuscandoPaciente(false);
    }

    setBuscandoDNI(true);
    try {
      const data = await apiFetch(`/api/dni/${val}`);
      setForm(f => ({
        ...f,
        nombres:    data.nombres         || f.nombres    || '',
        edad:       data.edad            || f.edad        || '',
        sexo:       data.sexo            || f.sexo        || '',
        fechaNac:   data.fechaNacimiento || f.fechaNac    || '',
        sector:     data.sector          || f.sector      || '',
        sectorista: data.sectorista      || f.sectorista  || '',
        celular:    data.celular         || f.celular     || '',
        hcl:        data.hcl             || f.hcl         || '',
        apoderado:  data.apoderado       || f.apoderado   || '',
        diagnostico:data.diagnostico     || f.diagnostico || '',
      }));
      setDniEstado(data.fuente === 'sheets' ? 'ok-sheets' : 'ok-api');
    } catch { setDniEstado('no-encontrado'); }
    finally { setBuscandoDNI(false); }
  };

  const guardar = async () => {
    if (!form.nombres || !form.dni) { setError('Nombres y DNI son obligatorios.'); return; }
    setGuardando(true); setError('');
    try {
      const sesiones = {};
      schema?.gruposSesiones?.forEach(g => {
        if (form[`ses_${g.key}_0`]) sesiones[g.key] = [form[`ses_${g.key}_0`]];
      });
      const metaData = {};
      schema?.colsMeta?.forEach(c => { metaData[c.key] = form[c.key] || ''; });

      await apiFetch(`/api/seguimiento/${encodeURIComponent(hojaSeleccionada)}/nuevo`, {
        method: 'POST',
        body: JSON.stringify({ ...form, sesiones, ...metaData }),
      });

      setGuardado(true);
      setTimeout(() => {
        setGuardado(false);
        setForm({ psicologo: 'Lic. Janeth Karina Santa Cruz Espiritu', fechaAtencion: new Date().toISOString().split('T')[0] });
        setDniEstado(''); setPacienteExistente(null);
        onGuardado?.();
      }, 2000);
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="text-xs font-bold text-gray-500 mb-2 block">📋 Selecciona el programa</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hojas.filter(h => !HOJAS_SOLO_LECTURA.includes(h.nombre)).map(h => {
            const c = colorHoja(h.nombre);
            const sel = hojaSeleccionada === h.nombre;
            return (
              <button
                key={h.id}
                onClick={() => setHojaSeleccionada(h.nombre)}
                className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all text-xs font-semibold ${
                  sel ? `bg-gradient-to-r ${c.bg} text-white border-transparent shadow-md` : `${c.light} ${c.text} ${c.border} hover:shadow-sm`
                }`}
              >
                {h.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {hojaSeleccionada && schema && (
        <div className="card space-y-4">
          <h3 className={`font-bold ${col.text} text-sm`}>{hojaSeleccionada}</h3>

          {guardado && (
            <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl px-4 py-3 text-sm font-semibold">
              ✅ Registro guardado correctamente
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">⚠️ {error}</div>
          )}

          {pacienteExistente && (
            <div className={`${col.light} border ${col.border} rounded-xl px-4 py-3`}>
              <p className={`font-bold ${col.text} text-sm mb-1`}>⚠️ Paciente ya registrado en esta hoja</p>
              <p className="text-xs text-gray-600">{pacienteExistente.nombres}</p>
              <p className="text-xs text-gray-500 mt-1">Ve a Buscar para ver su ficha y agregar sesiones.</p>
            </div>
          )}

          {!pacienteExistente && (
            <>
              {/* DNI */}
              <div>
                <label className="label">DNI *</label>
                <div className="relative">
                  <input
                    className="input-field w-full pr-10"
                    type="text" inputMode="numeric" maxLength={8}
                    value={form.dni || ''}
                    onChange={e => handleDNI(e.target.value.replace(/\D/g,''))}
                    placeholder="8 dígitos..."
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {(buscandoDNI || buscandoPaciente) && <div className="w-4 h-4 border-2 border-rosa-300 border-t-rosa-600 rounded-full animate-spin" />}
                    {dniEstado === 'ok-sheets' && <span className="text-green-500 text-sm">✓</span>}
                    {dniEstado === 'ok-api'    && <span className="text-blue-500 text-sm">✓</span>}
                  </div>
                </div>
                {dniEstado === 'ok-sheets'     && <p className="text-xs text-green-600 mt-1 font-semibold">✅ Encontrado en registros</p>}
                {dniEstado === 'ok-api'        && <p className="text-xs text-blue-600 mt-1 font-semibold">🔍 Encontrado en RENIEC</p>}
                {dniEstado === 'no-encontrado' && <p className="text-xs text-amber-600 mt-1 font-semibold">⚠️ DNI no encontrado — ingresa manualmente</p>}
              </div>

              {/* Campos paciente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'nombres',     label: 'Apellidos y Nombres *', full: true },
                  { key: 'edad',        label: 'Edad' },
                  { key: 'sexo',        label: 'Sexo', type: 'select', opts: ['M','F'] },
                  { key: 'fechaNac',    label: 'Fecha de Nacimiento', type: 'date' },
                  { key: 'hcl',         label: 'Historia Clínica' },
                  { key: 'sector',      label: 'Sector', type: 'datalist' },
                  { key: 'sectorista',  label: 'Sectorista' },
                  { key: 'direccion',   label: 'Dirección' },
                  { key: 'apoderado',   label: 'Apoderado / Familiar' },
                  { key: 'celular',     label: 'Celular' },
                  { key: 'tamizaje',    label: 'Tamizaje' },
                  { key: 'diagnostico', label: 'Diagnóstico (CIE-10)' },
                  { key: 'fechaAtencion', label: 'Fecha de Atención', type: 'date' },
                  { key: 'psicologo',   label: 'Psicólogo(a) Responsable', full: true },
                ].map(f => (
                  <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                    <label className="label">{f.label}</label>
                    {f.type === 'select' ? (
                      <select className="input-field w-full" value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                        <option value="">-- Seleccionar --</option>
                        {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'datalist' ? (
                      <>
                        <input className="input-field w-full" list={`list-${f.key}`} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="Escribe o selecciona..." />
                        <datalist id={`list-${f.key}`}>{SECTORES.map(s => <option key={s} value={s} />)}</datalist>
                      </>
                    ) : (
                      <input className="input-field w-full" type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.label} />
                    )}
                  </div>
                ))}
              </div>

              {/* Primera sesión de cada grupo */}
              <div>
                <h4 className={`font-bold ${col.text} text-xs mb-3`}>📅 Primera sesión de cada intervención</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schema.gruposSesiones?.map(g => (
                    <div key={g.key}>
                      <label className="label text-[10px] leading-tight">{g.label}</label>
                      <input type="date" className="input-field w-full" value={form[`ses_${g.key}_0`] || ''} onChange={e => setForm(p => ({ ...p, [`ses_${g.key}_0`]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Campos meta */}
{/* Campos meta */}
{schema.colsMeta && schema.colsMeta.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {schema.colsMeta.map(c => {
      const esFecha = c.key === 'proyeccion' || c.key === 'referido' || c.key === 'fur' || c.key === 'fpp' || c.label.toLowerCase().includes('fecha') || c.label.toLowerCase().includes('proyeccion');
      return (
        <div key={c.key}>
          <label className="label">{c.label}</label>
          <input
            className="input-field w-full"
            type={esFecha ? 'date' : 'text'}
            value={form[c.key] || ''}
            onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
            placeholder={esFecha ? '' : c.label}
          />
        </div>
      );
    })}
  </div>
)}

              <button
                onClick={guardar}
                disabled={guardando}
                className={`w-full font-bold py-3 rounded-xl bg-gradient-to-r ${col.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-60`}
              >
                {guardando ? '⏳ Guardando...' : '💾 Guardar Registro'}
              </button>
            </>
          )}
        </div>
      )}

      {hojaSeleccionada && !schema && (
        <div className="card text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">👁️</p>
          <p className="text-sm font-semibold">Esta hoja es de solo lectura</p>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Seguimiento() {
  const [tab, setTab]         = useState('hojas');
  const [hojas, setHojas]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const [buscando, setBuscando]       = useState(false);
  const [resultados, setResultados]   = useState([]);
  const [errorBuscar, setErrorBuscar] = useState('');
  const [fichaAbierta, setFichaAbierta]   = useState(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  // Hoja seleccionada para ver pacientes
  const [hojaVista, setHojaVista]         = useState(null);
  const [pacientesHoja, setPacientesHoja] = useState([]);
  const [loadingHoja, setLoadingHoja]     = useState(false);
  const [errorHoja, setErrorHoja]         = useState('');

  useEffect(() => {
    apiFetch('/api/seguimiento/hojas')
      .then(data => setHojas(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const verPacientesHoja = async (hoja) => {
    setHojaVista(hoja);
    setLoadingHoja(true);
    setErrorHoja('');
    setPacientesHoja([]);
    setTab('hojas');
    try {
      const data = await apiFetch(`/api/seguimiento/${encodeURIComponent(hoja.nombre)}`);
      const schema = await apiFetch(`/api/seguimiento/schema/${encodeURIComponent(hoja.nombre)}`);
      const colNombre = schema?.colsFijas?.find(c => c.key === 'nombres')?.col ?? 6;
      const colDni    = schema?.colsFijas?.find(c => c.key === 'dni')?.col    ?? 10;
      const pacs = (data.registros || []).map(reg => {
        const fila = reg.valores || [];
        return {
          id:      reg.id,
          nombres: (fila[colNombre] || '').trim(),
          dni:     (fila[colDni]    || '').trim(),
          hoja:    hoja.nombre,
          valores: fila,
          sesiones: {},
        };
      }).filter(p => p.nombres || p.dni);
      setPacientesHoja(pacs);
    } catch (e) { setErrorHoja(e.message); }
    finally { setLoadingHoja(false); }
  };

  const buscar = async () => {
    if (!query.trim()) return;
    setBuscando(true); setErrorBuscar(''); setResultados([]);
    try {
      const data = await apiFetch(`/api/seguimiento/buscar?q=${encodeURIComponent(query)}`);
      setResultados(Array.isArray(data) ? data : []);
    } catch (e) { setErrorBuscar(e.message); }
    finally { setBuscando(false); }
  };

const abrirFicha = async (paciente, hoja) => {
  setCargandoFicha(true);
  try {
    const schema = await apiFetch(`/api/seguimiento/schema/${encodeURIComponent(hoja)}`);
    // Si el paciente tiene DNI, cargar ficha completa desde el backend
    let pacienteCompleto = paciente;
    if (paciente.dni) {
      try {
        pacienteCompleto = await apiFetch(`/api/seguimiento/${encodeURIComponent(hoja)}/paciente/${paciente.dni}`);
      } catch {}
    }
    setFichaAbierta({ paciente: pacienteCompleto, hoja, schema: schema.tieneSchema ? schema : null });
  } catch { setFichaAbierta({ paciente, hoja, schema: null }); }
  finally { setCargandoFicha(false); }
};

  const recargarFicha = async () => {
    if (!fichaAbierta) return;
    try {
      const pac = await apiFetch(`/api/seguimiento/${encodeURIComponent(fichaAbierta.hoja)}/paciente/${fichaAbierta.paciente.dni}`);
      setFichaAbierta(p => ({ ...p, paciente: pac }));
    } catch {}
  };

  return (
    <div className="px-4 py-5 max-w-4xl mx-auto">

      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Seguimiento
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Programas de salud mental — C.S. Tambillo 2026</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB HOJAS ──────────────────────────────────────────────────────── */}
      {tab === 'hojas' && (
        loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
          </div>
        ) : hojaVista ? (
          // ── Vista de pacientes de una hoja ─────────────────────────────
          <div className="space-y-3">
            {/* Header hoja */}
            <div className={`rounded-2xl bg-gradient-to-r ${colorHoja(hojaVista.nombre).bg} p-4 text-white flex items-center justify-between`}>
              <div>
                <p className="text-xs opacity-75 font-semibold">Programa</p>
                <p className="font-extrabold text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>{hojaVista.nombre}</p>
                {!loadingHoja && <p className="text-xs opacity-80 mt-0.5">{pacientesHoja.length} paciente(s) registrado(s)</p>}
              </div>
              <button onClick={() => { setHojaVista(null); setPacientesHoja([]); }} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                ← Volver
              </button>
            </div>

            {loadingHoja && (
              <div className="flex justify-center py-10">
                <div className="w-10 h-10 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
              </div>
            )}

            {errorHoja && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">⚠️ {errorHoja}</div>
            )}

            {!loadingHoja && pacientesHoja.length === 0 && !errorHoja && (
              <div className="card text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">🗂️</p>
                <p className="text-sm font-semibold">No hay pacientes en este programa todavía</p>
                <button onClick={() => setTab('nuevo')} className="mt-3 btn-rosa text-xs">+ Agregar primer registro</button>
              </div>
            )}

            {!loadingHoja && pacientesHoja.length > 0 && (
              <div className="space-y-2">
                {pacientesHoja.map((pac, i) => {
                  const c = colorHoja(pac.hoja);
                  return (
                    <button key={i} onClick={() => abrirFicha(pac, pac.hoja)} className="card w-full text-left hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {(pac.nombres || '?').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{pac.nombres || '—'}</p>
                          <p className="text-xs text-gray-500">{pac.dni}</p>
                        </div>
                        <span className="text-gray-300 group-hover:text-gray-500 text-sm">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // ── Lista de hojas ─────────────────────────────────────────────
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hojas.filter(h => HOJAS_SOLO_LECTURA.includes(h.nombre)).map(h => (
                <div key={h.id} className="card flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">📊</div>
                  <div>
                    <p className="font-bold text-gray-700 text-sm">{h.nombre}</p>
                    <p className="text-xs text-gray-400">Solo lectura — Programación</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hojas.filter(h => !HOJAS_SOLO_LECTURA.includes(h.nombre)).map(h => {
                const c = colorHoja(h.nombre);
                return (
                  <button
                    key={h.id}
                    onClick={() => verPacientesHoja(h)}
                    className="card text-left hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                        {h.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{h.nombre}</p>
                        <p className={`text-xs font-semibold ${c.text}`}>Ver pacientes →</p>
                      </div>
                      <span className="text-gray-300 group-hover:text-gray-500 text-sm">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ── TAB BUSCAR ─────────────────────────────────────────────────────── */}
      {tab === 'buscar' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()}
                placeholder="Buscar por DNI o nombre..."
                autoFocus
              />
              <button onClick={buscar} disabled={buscando || !query.trim()} className="btn-rosa px-4 flex-shrink-0 disabled:opacity-60">
                {buscando ? '⏳' : '🔍'}
              </button>
            </div>
          </div>

          {errorBuscar && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">⚠️ {errorBuscar}</div>
          )}

          {resultados.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 px-1">{resultados.length} resultado(s)</p>
              {resultados.map((pac, i) => {
                const c = colorHoja(pac.hoja);
                const totalSes = Object.values(pac.sesiones || {}).reduce((acc, s) => acc + s.completadas, 0);
                const totalMax = Object.values(pac.sesiones || {}).reduce((acc, s) => acc + s.total, 0);
                return (
                  <button key={i} onClick={() => abrirFicha(pac, pac.hoja)} className="card w-full text-left hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {(pac.nombres || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{pac.nombres}</p>
                        <p className="text-xs text-gray-500">{pac.dni} · {pac.sector}</p>
                        <p className={`text-xs font-semibold ${c.text} mt-0.5`}>{pac.hoja}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-bold ${c.text}`}>{totalSes}/{totalMax} ses.</p>
                        <span className="text-gray-300 group-hover:text-gray-500 text-sm">→</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {resultados.length === 0 && query && !buscando && !errorBuscar && (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm font-semibold">No se encontraron resultados para "{query}"</p>
            </div>
          )}

          {cargandoFicha && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-xl">
                <div className="w-6 h-6 border-2 border-rosa-300 border-t-rosa-600 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-gray-700">Cargando ficha...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB NUEVO REGISTRO ─────────────────────────────────────────────── */}
      {tab === 'nuevo' && (
        <NuevoRegistro hojas={hojas} onGuardado={() => setTab('hojas')} />
      )}

      {/* ── FICHA ──────────────────────────────────────────────────────────── */}
      {fichaAbierta && (
        <FichaPaciente
          paciente={fichaAbierta.paciente}
          hoja={fichaAbierta.hoja}
          schema={fichaAbierta.schema}
          onAgregarSesion={recargarFicha}
          onActualizarMeta={(meta) => setFichaAbierta(p => ({ ...p, paciente: { ...p.paciente, ...meta } }))}
          onCerrar={() => setFichaAbierta(null)}
        />
      )}
    </div>
  );
}