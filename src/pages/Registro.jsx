import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CAMPOS_RUA, CIE10, TAMIZAJES } from '../data/cie10';
import { crearRegistro, editarRegistro, obtenerRegistros, obtenerMesActual, buscarDNI } from '../utils/sheets';

// ─── TamizajeMultiInput ──────────────────────────────────────────────────────
function TamizajeMultiInput({ value, onChange }) {
  const [inputVal, setInputVal] = useState('');
  const chips = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const agregar = (texto) => {
    const nuevos = texto.split(',').map(s => s.trim()).filter(Boolean);
    if (!nuevos.length) return;
    const combinado = [...new Set([...chips, ...nuevos])];
    onChange(combinado.join(', '));
    setInputVal('');
  };

  const eliminar = (codigo) => {
    onChange(chips.filter(c => c !== codigo).join(', '));
  };

  const disponibles = TAMIZAJES.filter(t => !chips.includes(t));

  return (
    <div className="space-y-2">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => (
            <span key={c} className="inline-flex items-center gap-1 bg-rosa-100 text-rosa-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {c}
              <button type="button" onClick={() => eliminar(c)} className="text-rosa-400 hover:text-rosa-600 font-bold text-sm leading-none ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {disponibles.length > 0 && (
          <select className="input-field flex-1" value="" onChange={e => { if (e.target.value) agregar(e.target.value); }}>
            <option value="">Seleccionar código...</option>
            {disponibles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <input
          className="input-field flex-1"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(inputVal); } }}
          placeholder="Otro código o separados por coma..."
          autoComplete="off"
        />
        <button type="button" onClick={() => agregar(inputVal)} disabled={!inputVal.trim()}
          className="px-3 py-2 bg-rosa-500 hover:bg-rosa-600 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-40 flex-shrink-0">
          Agregar
        </button>
      </div>
    </div>
  );
}

// ─── InputField ──────────────────────────────────────────────────────────────
function InputField({ campo, value, onChange, busquedaCIE, setBusquedaCIE, mostrarCIE, setMostrarCIE, buscandoDNI, dniEstado }) {
  const base = 'input-field';

  if (campo.key === 'profesional') {
    return <div className="input-field bg-gray-50 text-gray-500 select-none">Psicología</div>;
  }

  if (campo.key === 'dni') {
    const iconoEstado = {
      'ok-sheets':     { icon: '✅', text: 'Encontrado en registros',                         color: 'text-green-600 bg-green-50 border-green-200' },
      'ok-api':        { icon: '🔍', text: 'Encontrado en RENIEC',                             color: 'text-blue-600 bg-blue-50 border-blue-200'   },
      'no-encontrado': { icon: '⚠️', text: 'DNI no encontrado — ingresa los datos manualmente', color: 'text-amber-600 bg-amber-50 border-amber-200' },
      'error':         { icon: '❌', text: 'Error al buscar — ingresa los datos manualmente',   color: 'text-red-600 bg-red-50 border-red-200'       },
    }[dniEstado];

    return (
      <div className="space-y-1.5">
        <div className="relative">
          <input
            className={`${base} pr-10`}
            type="text" inputMode="numeric" maxLength={8}
            value={value}
            onChange={e => onChange(campo.key, e.target.value.replace(/\D/g, ''))}
            placeholder="Ingresa el DNI (8 dígitos)..."
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {buscandoDNI ? (
              <div className="w-4 h-4 border-2 border-rosa-300 border-t-rosa-600 rounded-full animate-spin" />
            ) : (dniEstado === 'ok-sheets' || dniEstado === 'ok-api') ? (
              <span className="text-green-500 text-sm">✓</span>
            ) : null}
          </div>
        </div>
        {iconoEstado && (
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${iconoEstado.color}`}>
            <span>{iconoEstado.icon}</span>
            <span>{iconoEstado.text}</span>
          </div>
        )}
      </div>
    );
  }

  if (campo.key === 'sector') {
    return (
      <>
        <input className={base} list="lista-sectores" value={value}
          onChange={e => onChange(campo.key, e.target.value)}
          placeholder="Escribe o selecciona un sector..." autoComplete="off" />
        <datalist id="lista-sectores">
          {['PINQUIRAY','LA PUNTA','CASA BLANCA','HUANIN','GOYAR PUNTA',
            'AURAGSHAY','CRUZ PUNTA','TAMBILLO','PANAOCOCHA','SHALLA',
            'SAN MARCOS','CHACHASPATA','RAMOS CURVA'
          ].map(s => <option key={s} value={s} />)}
        </datalist>
      </>
    );
  }

  if (campo.key === 'valoracionRiesgo') {
    return (
      <>
        <input className={base} list="lista-riesgo" value={value}
          onChange={e => onChange(campo.key, e.target.value)}
          placeholder="Selecciona o escribe..." autoComplete="off" />
        <datalist id="lista-riesgo">
          {['Negativo', 'Leve', 'Moderado', 'Severo'].map(o => <option key={o} value={o} />)}
        </datalist>
      </>
    );
  }

  if (campo.type === 'select') {
    return (
      <select className={base} value={value} onChange={e => onChange(campo.key, e.target.value)}>
        <option value="">-- Seleccionar --</option>
        {campo.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (campo.type === 'textarea') {
    return (
      <textarea className={base} rows={2} value={value}
        onChange={e => onChange(campo.key, e.target.value)}
        placeholder={`Ingrese ${campo.label.toLowerCase()}...`} />
    );
  }

  if (campo.type === 'tamizaje-multi') {
    return <TamizajeMultiInput value={value} onChange={(newVal) => onChange(campo.key, newVal)} />;
  }

  if (campo.type === 'cie10') {
    const cieFiltrado = CIE10.filter(c =>
      c.code.toLowerCase().includes((busquedaCIE || '').toLowerCase()) ||
      c.desc.toLowerCase().includes((busquedaCIE || '').toLowerCase())
    ).slice(0, 8);

    return (
      <div className="relative">
        <input className={base} value={value}
          onChange={e => { onChange(campo.key, e.target.value); setBusquedaCIE(e.target.value); setMostrarCIE(true); }}
          onFocus={() => setMostrarCIE(true)}
          placeholder="Ej: F41.9 o ansiedad..." autoComplete="off" />
        {mostrarCIE && busquedaCIE && cieFiltrado.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-rosa-200 rounded-xl shadow-lg mt-1 max-h-44 overflow-y-auto">
            {cieFiltrado.map(c => (
              <button key={c.code} type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-rosa-50 flex gap-2 items-start border-b border-gray-50"
                onMouseDown={e => { e.preventDefault(); onChange(campo.key, c.code); setMostrarCIE(false); setBusquedaCIE(''); }}>
                <span className="font-bold text-rosa-600 flex-shrink-0 w-14">{c.code}</span>
                <span className="text-gray-600">{c.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <input className={base}
      type={campo.type === 'date' ? 'date' : campo.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={e => onChange(campo.key, e.target.value)}
      placeholder={campo.type === 'date' ? '' : `Ingrese ${campo.label.toLowerCase()}...`}
      autoComplete="off" />
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Registro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editarId    = searchParams.get('editar');
  const editarMes   = searchParams.get('mes');
  const modoEdicion = Boolean(editarId && editarMes);

  const [form, setForm] = useState({
    fechaAtencion: new Date().toISOString().split('T')[0],
    profesional: 'Psicología',
    responsableAtencion: 'Lic. Janeth Karina Santa Cruz Espiritu',
  });
  const [guardando, setGuardando]         = useState(false);
  const [guardado, setGuardado]           = useState(false);
  const [error, setError]                 = useState('');
  const [busquedaCIE, setBusquedaCIE]     = useState('');
  const [mostrarCIE, setMostrarCIE]       = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(modoEdicion);
  const [errorCarga, setErrorCarga]       = useState('');
  const [confirmGuardar, setConfirmGuardar]       = useState(false);
  const [formDirty, setFormDirty]                 = useState(false);
  const [mostrarModalSalir, setMostrarModalSalir] = useState(false);
  const [pendingNavPath, setPendingNavPath]        = useState(null);
  const [buscandoDNI, setBuscandoDNI]     = useState(false);
  const [dniEstado, setDniEstado]         = useState('');

  // Carga en modo edición
  useEffect(() => {
    if (!modoEdicion) return;
    setCargandoDatos(true);
    setErrorCarga('');
    obtenerRegistros(editarMes)
      .then(registros => {
        const paciente = registros.find(r => String(r.id) === String(editarId));
        if (!paciente) { setErrorCarga('No se encontró el registro.'); return; }
        const camposFecha = ['fechaAtencion','fechaNacimiento','fur','fechaProbableParto','fechaProxCita'];
        const formData = { ...paciente };
        camposFecha.forEach(cf => {
          if (formData[cf]) {
            const match = formData[cf].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) formData[cf] = `${match[3]}-${match[2]}-${match[1]}`;
          }
        });
        setForm(formData);
        setFormDirty(false);
      })
      .catch(err => setErrorCarga(err.message || 'Error al cargar el registro.'))
      .finally(() => setCargandoDatos(false));
  }, [modoEdicion, editarId, editarMes]);

  // Guardia de navegación
  useEffect(() => {
    if (!formDirty || guardado) return;
    const handler = (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || /^(https?:\/\/|\/\/|mailto:|tel:)/.test(href)) return;
      e.preventDefault(); e.stopPropagation();
      setPendingNavPath(href);
      setMostrarModalSalir(true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [formDirty, guardado]);

  useEffect(() => {
    const handler = (e) => { if (!formDirty || guardado) return; e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [formDirty, guardado]);

  const guardiaNavegarSi = useCallback((path) => {
    if (formDirty && !guardado) {
      setPendingNavPath(path ?? null);
      setMostrarModalSalir(true);
    } else {
      if (path === null || path === undefined) navigate(-1);
      else navigate(path);
    }
  }, [formDirty, guardado, navigate]);

  const esGestante       = form.gestante === 'G' || form.gestante === 'P';
  const esMenor          = parseInt(form.edad) < 18;
  const tamizajePositivo = form.resultadoTamizaje === 'Positivo';

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return '';
  const nac = new Date(fechaNac);
  if (isNaN(nac.getTime())) return '';
  const hoy = new Date();
  let a = hoy.getFullYear() - nac.getFullYear();
  let m = hoy.getMonth() - nac.getMonth();
  if (hoy.getDate() < nac.getDate()) m--;
  if (m < 0) { a--; m += 12; }
  if (a < 0) return '';
  if (a === 0) return m + ' meses';
  if (m === 0) return a + ' a\u00f1os';
  return a + ' a\u00f1os ' + m + ' meses';
};
  const set = (key, val) => {
    setForm(f => {
      const nuevo = { ...f, [key]: val };
      // Calcular edad automáticamente al cambiar fecha de nacimiento
      if (key === 'fechaNacimiento') {
        nuevo.edad = calcularEdad(val);
      }
      return nuevo;
    });
    setFormDirty(true);
  };

  const handleDNIChange = async (val) => {
    set('dni', val);
    setDniEstado('');
    if (val.length !== 8 || !/^\d{8}$/.test(val)) return;
    setBuscandoDNI(true);
    try {
      const data = await buscarDNI(val);
      setForm(f => ({
        ...f, dni: val,
        nombres:         data.nombres         || f.nombres,
        fechaNacimiento: data.fechaNacimiento  || f.fechaNacimiento,
        edad:            data.edad             || f.edad,
        sexo:            data.sexo             || f.sexo,
        sector:          data.sector           || f.sector,
        sectorista:      data.sectorista       || f.sectorista,
        celular:         data.celular          || f.celular,
        seguro:          data.seguro           || f.seguro,
        hcl:             data.hcl              || f.hcl,
      }));
      setFormDirty(true);
      setDniEstado(data.fuente === 'sheets' ? 'ok-sheets' : 'ok-api');
    } catch (err) {
      setDniEstado(err.message?.includes('no encontrado') ? 'no-encontrado' : 'error');
    } finally {
      setBuscandoDNI(false);
    }
  };

  const camposVisibles = CAMPOS_RUA.filter(c => {
    if (c.conditionalOn === 'esGestante'       && !esGestante)       return false;
    if (c.conditionalOn === 'esMenor'          && !esMenor)          return false;
    if (c.conditionalOn === 'tamizajePositivo' && !tamizajePositivo) return false;
    return true;
  });

  const handleGuardar = async (datosExtra = {}) => {
    const mesDestino = modoEdicion ? editarMes : obtenerMesActual();
    const payload = { ...form, ...datosExtra, mes: mesDestino };
    if (!payload.nombres || !payload.dni) { setError('Nombres y DNI son obligatorios.'); return; }
    setGuardando(true); setError('');
    try {
      if (modoEdicion) await editarRegistro(editarId, payload);
      else             await crearRegistro(payload);
      setFormDirty(false); setPendingNavPath(null); setGuardado(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        setGuardado(false);
        if (modoEdicion) navigate('/pacientes');
        else {
          setForm({
            fechaAtencion: new Date().toISOString().split('T')[0],
            profesional: 'Psicología',
            responsableAtencion: 'Lic. Janeth Karina Santa Cruz Espiritu',
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const pedirConfirmacionGuardar = () => {
    if (!form.nombres || !form.dni) { setError('Nombres y DNI son obligatorios.'); return; }
    setError(''); setConfirmGuardar(true);
  };

  const secciones = [
    { titulo: '📅 Datos de Atención',           campos: ['fechaAtencion','profesional','responsableAtencion','tipoAtencion'] },
    { titulo: '👤 Datos del Paciente',           campos: ['apoderado','nombres','dni','fechaNacimiento','edad','sexo'] },
    { titulo: '🤰 Gestante / Puérpera',          campos: ['gestante','fur','semanaGestacional','fechaProbableParto'] },
    { titulo: '📍 Ubicación',                    campos: ['hcl','sector','sectorista','seguro','celular'] },
    { titulo: '🩺 Consulta y Diagnóstico',       campos: ['motivoConsulta','tamizaje','resultadoTamizaje','diagnostico'] },
    { titulo: '📋 Seguimiento',                  campos: ['segundoControl','intervencion','fechaProxCita','terminoAtencion','referencia','contrarreferencia'] },
    { titulo: '⚙️ Actividades Complementarias', campos: ['valoracionRiesgo','sesionMovilizacion','visitaDomiciliaria','medicamentos','teleorientacion','promsa','campana','observaciones'] },
  ];

  if (cargandoDatos) return (
    <div className="px-4 py-5 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-12 h-12 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
      <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Cargando datos del registro...</p>
    </div>
  );

  if (errorCarga) return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <div className="card text-center py-12">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="font-bold text-gray-800 mb-2">No se pudo cargar el registro</p>
        <p className="text-sm text-gray-500 mb-5">{errorCarga}</p>
        <button onClick={() => navigate('/pacientes')} className="btn-rosa">Volver a Pacientes</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="px-4 py-5 max-w-3xl mx-auto pb-24" onClick={() => setMostrarCIE(false)}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => guardiaNavegarSi(null)}
            className="w-9 h-9 rounded-xl bg-white border border-rosa-200 flex items-center justify-center text-rosa-500 hover:bg-rosa-50">←</button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {modoEdicion ? '✏️ Editar Registro RUA' : 'Nuevo Registro RUA'}
            </h1>
            <p className="text-xs text-gray-400">{modoEdicion ? `Editando: ${editarMes}` : obtenerMesActual()}</p>
          </div>
        </div>

        {guardado && (
          <div className="bounce-in bg-green-100 border border-green-300 text-green-800 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 font-semibold text-sm">
            ✅ {modoEdicion ? 'Registro actualizado correctamente' : 'Registro guardado correctamente'}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">⚠️ {error}</div>
        )}

        {/* Secciones */}
        <div className="space-y-4">
          {secciones.map(sec => {
            const camposSec = sec.campos
              .map(k => CAMPOS_RUA.find(c => c.key === k))
              .filter(c => c && camposVisibles.find(cv => cv.key === c.key));
            if (camposSec.length === 0) return null;
            return (
              <div key={sec.titulo} className="card fade-in-up">
                <h3 className="section-title">{sec.titulo}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {camposSec.map(campo => (
                    <div key={campo.key}
                      className={campo.type === 'textarea' || campo.type === 'tamizaje-multi' || campo.key === 'nombres' || campo.key === 'motivoConsulta' ? 'sm:col-span-2' : ''}
                      onClick={e => e.stopPropagation()}>
                      <label className="label">
                        {campo.label}
                        {campo.required && <span className="text-rosa-500 ml-0.5">*</span>}
                      </label>
                      <InputField
                        campo={campo}
                        value={form[campo.key] || ''}
                        onChange={campo.key === 'dni' ? (_, val) => handleDNIChange(val) : set}
                        busquedaCIE={busquedaCIE}
                        setBusquedaCIE={setBusquedaCIE}
                        mostrarCIE={mostrarCIE}
                        setMostrarCIE={setMostrarCIE}
                        buscandoDNI={buscandoDNI}
                        dniEstado={dniEstado}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button onClick={() => guardiaNavegarSi(null)} className="btn-outline flex-1">Cancelar</button>
          <button onClick={pedirConfirmacionGuardar} disabled={guardando}
            className="btn-rosa flex-1 flex items-center justify-center gap-2">
            {guardando ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>{modoEdicion ? 'Actualizando...' : 'Guardando...'}</>
            ) : modoEdicion ? '💾 Actualizar Registro' : '💾 Guardar Registro'}
          </button>
        </div>
      </div>

      {/* Modal confirmar guardar */}
      {confirmGuardar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bounce-in bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">💾</div>
            <h3 className="font-extrabold text-gray-800 text-lg text-center mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {modoEdicion ? '¿Actualizar este registro?' : '¿Guardar este registro?'}
            </h3>
            <p className="text-xs text-gray-400 text-center mb-4">Verifica que los datos sean correctos antes de confirmar</p>
            <div className="bg-rosa-50 border border-rosa-100 rounded-xl px-4 py-3 mb-5 space-y-2">
              <div className="flex gap-2 items-start">
                <span className="text-gray-400 text-xs w-24 flex-shrink-0 pt-0.5">Paciente</span>
                <span className="font-bold text-gray-800 text-sm leading-tight">{form.nombres || '—'}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-gray-400 text-xs w-24 flex-shrink-0">Fecha atención</span>
                <span className="font-semibold text-gray-700 text-sm">{form.fechaAtencion || '—'}</span>
              </div>
              {form.dni && (
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 text-xs w-24 flex-shrink-0">DNI</span>
                  <span className="font-semibold text-gray-700 text-sm">{form.dni}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmGuardar(false)} className="btn-outline flex-1">Cancelar</button>
              <button onClick={() => { setConfirmGuardar(false); handleGuardar(); }} className="btn-rosa flex-1">
                Sí, guardar registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal salir sin guardar */}
      {mostrarModalSalir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bounce-in bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
            <h3 className="font-extrabold text-gray-800 text-lg text-center mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              ¿Seguro que quieres salir?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
              Tienes datos sin guardar. Si sales ahora, perderás la información ingresada.
            </p>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => { setMostrarModalSalir(false); setPendingNavPath(null); }} className="btn-rosa w-full">
                Quedarme
              </button>
              <button
                onClick={() => { setMostrarModalSalir(false); setFormDirty(false); if (pendingNavPath === null) navigate(-1); else navigate(pendingNavPath); }}
                className="w-full border-2 border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold px-4 py-2 rounded-xl transition-all text-sm">
                Salir de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}