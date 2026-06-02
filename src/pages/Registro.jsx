import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CAMPOS_RUA, CIE10 } from '../data/cie10';
import { crearRegistro, editarRegistro, obtenerRegistros, obtenerMesActual } from '../utils/sheets';
import BotFlotante from '../components/BotFlotante';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

// ─── InputField FUERA del componente para evitar re-render y pérdida de foco ───
function InputField({ campo, value, onChange, isActivo, busquedaCIE, setBusquedaCIE, mostrarCIE, setMostrarCIE }) {
  const base = `input-field ${isActivo ? 'ring-2 ring-rosa-400 border-rosa-300' : ''}`;

  if (campo.key === 'profesional') {
    return (
      <div className="input-field bg-gray-50 text-gray-500 select-none">
        Psicología
      </div>
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
      <textarea
        className={base}
        rows={2}
        value={value}
        onChange={e => onChange(campo.key, e.target.value)}
        placeholder={`Ingrese ${campo.label.toLowerCase()}...`}
      />
    );
  }

  if (campo.type === 'cie10') {
    const cieFiltrado = CIE10.filter(c =>
      c.code.toLowerCase().includes((busquedaCIE || '').toLowerCase()) ||
      c.desc.toLowerCase().includes((busquedaCIE || '').toLowerCase())
    ).slice(0, 8);

    return (
      <div className="relative">
        <input
          className={base}
          value={value}
          onChange={e => {
            onChange(campo.key, e.target.value);
            setBusquedaCIE(e.target.value);
            setMostrarCIE(true);
          }}
          onFocus={() => setMostrarCIE(true)}
          placeholder="Ej: F41.9 o ansiedad..."
          autoComplete="off"
        />
        {mostrarCIE && busquedaCIE && cieFiltrado.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-rosa-200 rounded-xl shadow-lg mt-1 max-h-44 overflow-y-auto">
            {cieFiltrado.map(c => (
              <button
                key={c.code}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-rosa-50 flex gap-2 items-start border-b border-gray-50"
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(campo.key, c.code);
                  setMostrarCIE(false);
                  setBusquedaCIE('');
                }}
              >
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
    <input
      className={base}
      type={campo.type === 'date' ? 'date' : campo.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={e => onChange(campo.key, e.target.value)}
      placeholder={campo.type === 'date' ? '' : `Ingrese ${campo.label.toLowerCase()}...`}
      autoComplete="off"
    />
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function Registro() {
  const navigate = useNavigate();
  // MEJORADO: lee parámetros de URL para modo edición
  const [searchParams] = useSearchParams();
  const editarId = searchParams.get('editar');   // número de fila en el Sheet
  const editarMes = searchParams.get('mes');      // nombre de la hoja (ej: "JUNIO 2026")
  const modoEdicion = Boolean(editarId && editarMes);

  const [form, setForm] = useState({
    fechaAtencion: new Date().toISOString().split('T')[0],
    profesional: 'Psicología',
    responsableAtencion: 'Lic. Janeth Karina Santa Cruz Espiritu',
  });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');
  const [busquedaCIE, setBusquedaCIE] = useState('');
  const [mostrarCIE, setMostrarCIE] = useState(false);
  // MEJORADO: estado de carga de datos para modo edición
  const [cargandoDatos, setCargandoDatos] = useState(modoEdicion);
  const [errorCarga, setErrorCarga] = useState('');

  // MEJORADO: carga los datos del paciente cuando está en modo edición
  useEffect(() => {
    if (!modoEdicion) return;
    setCargandoDatos(true);
    setErrorCarga('');
    obtenerRegistros(editarMes)
      .then(registros => {
        const paciente = registros.find(r => String(r.id) === String(editarId));
        if (!paciente) {
          setErrorCarga('No se encontró el registro. Puede haber sido eliminado.');
          return;
        }
        // MEJORADO: convierte fechas DD/MM/YYYY → YYYY-MM-DD para los campos date del formulario
        const camposFecha = ['fechaAtencion', 'fechaNacimiento', 'fur', 'fechaProbableParto', 'fechaProxCita'];
        const formData = { ...paciente };
        camposFecha.forEach(cf => {
          if (formData[cf]) {
            const match = formData[cf].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) formData[cf] = `${match[3]}-${match[2]}-${match[1]}`;
          }
        });
        setForm(formData);
      })
      .catch(err => setErrorCarga(err.message || 'Error al cargar el registro.'))
      .finally(() => setCargandoDatos(false));
  }, [modoEdicion, editarId, editarMes]);

  const esGestante = form.gestante === 'G' || form.gestante === 'P';
  const esMenor = parseInt(form.edad) < 18;
  const tamizajePositivo = form.resultadoTamizaje === 'Positivo';

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const camposVisibles = CAMPOS_RUA.filter(c => {
    if (c.conditionalOn === 'esGestante' && !esGestante) return false;
    if (c.conditionalOn === 'esMenor' && !esMenor) return false;
    if (c.conditionalOn === 'tamizajePositivo' && !tamizajePositivo) return false;
    return true;
  });

  const { activo, pausado, escuchando, procesando, campoActual, mensajeBot, toggle } =
   useVoiceAssistant({
      onDatosActualizados: (d) => setForm(f => ({ ...f, ...d })),
      onGuardar: (d) => handleGuardar(d),
      camposVisibles,
      datosIniciales: form,
    });

  const handleGuardar = async (datosExtra = {}) => {
    const mesDestino = modoEdicion ? editarMes : obtenerMesActual();
    const payload = { ...form, ...datosExtra, mes: mesDestino };
    if (!payload.nombres || !payload.dni) {
      setError('Nombres y DNI son obligatorios.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      if (modoEdicion) {
        // MEJORADO: en modo edición llama editarRegistro con el id de fila y el mes correcto
        await editarRegistro(editarId, payload);
      } else {
        await crearRegistro(payload);
      }
      setGuardado(true);
      setTimeout(() => {
        setGuardado(false);
        if (modoEdicion) {
          // Vuelve a la lista de pacientes tras editar
          navigate('/pacientes');
        } else {
          setForm({
            fechaAtencion: new Date().toISOString().split('T')[0],
            profesional: 'Psicología',
            responsableAtencion: 'Lic. Janeth Karina Santa Cruz Espiritu',
          });
        }
      }, 2000);
    } catch (err) {
      // MEJORADO: muestra el mensaje de error real del servidor
      setError(err.message || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const secciones = [
    {
      titulo: '📅 Datos de Atención',
      campos: ['fechaAtencion', 'profesional', 'responsableAtencion', 'tipoAtencion'],
    },
    {
      titulo: '👤 Datos del Paciente',
      campos: ['apoderado', 'nombres', 'dni', 'fechaNacimiento', 'edad', 'sexo'],
    },
    {
      titulo: '🤰 Gestante / Puérpera',
      campos: ['gestante', 'fur', 'semanaGestacional', 'fechaProbableParto'],
    },
    {
      titulo: '📍 Ubicación',
      campos: ['hcl', 'sector', 'sectorista', 'seguro', 'celular'],
    },
    {
      titulo: '🩺 Consulta y Diagnóstico',
      campos: ['motivoConsulta', 'tamizaje', 'resultadoTamizaje', 'diagnostico'],
    },
    {
      titulo: '📋 Seguimiento',
      campos: ['segundoControl', 'intervencion', 'fechaProxCita', 'terminoAtencion', 'referencia', 'contrarreferencia'],
    },
    {
      titulo: '⚙️ Actividades Complementarias',
      campos: ['valoracionRiesgo', 'sesionMovilizacion', 'visitaDomiciliaria', 'medicamentos', 'teleorientacion', 'promsa', 'campana', 'observaciones'],
    },
  ];

  // MEJORADO: pantalla de carga mientras se obtienen datos en modo edición
  if (cargandoDatos) {
    return (
      <div className="px-4 py-5 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="w-12 h-12 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Cargando datos del registro...
        </p>
      </div>
    );
  }

  // MEJORADO: pantalla de error si no se encuentra el registro
  if (errorCarga) {
    return (
      <div className="px-4 py-5 max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="font-bold text-gray-800 mb-2">No se pudo cargar el registro</p>
          <p className="text-sm text-gray-500 mb-5">{errorCarga}</p>
          <button onClick={() => navigate('/pacientes')} className="btn-rosa">
            Volver a Pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-5 max-w-3xl mx-auto pb-24"
      onClick={() => setMostrarCIE(false)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-white border border-rosa-200 flex items-center justify-center text-rosa-500 hover:bg-rosa-50"
        >
          ←
        </button>
        <div>
          {/* MEJORADO: título dinámico según modo */}
          <h1 className="text-xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {modoEdicion ? '✏️ Editar Registro RUA' : 'Nuevo Registro RUA'}
          </h1>
          <p className="text-xs text-gray-400">
            {modoEdicion ? `Editando: ${editarMes}` : obtenerMesActual()}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {guardado && (
        <div className="bounce-in bg-green-100 border border-green-300 text-green-800 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 font-semibold text-sm">
          ✅ {modoEdicion ? 'Registro actualizado correctamente' : 'Registro guardado correctamente'}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Secciones del formulario */}
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
                  <div
                    key={campo.key}
                    className={
                      campo.type === 'textarea' ||
                      campo.key === 'nombres' ||
                      campo.key === 'motivoConsulta'
                        ? 'sm:col-span-2'
                        : ''
                    }
                    onClick={e => e.stopPropagation()}
                  >
                    <label className="label">
                      {campo.label}
                      {campo.required && <span className="text-rosa-500 ml-0.5">*</span>}
                    </label>
                    <InputField
                      campo={campo}
                      value={form[campo.key] || ''}
                      onChange={set}
                      isActivo={activo && camposVisibles[campoActual]?.key === campo.key}
                      busquedaCIE={busquedaCIE}
                      setBusquedaCIE={setBusquedaCIE}
                      mostrarCIE={mostrarCIE}
                      setMostrarCIE={setMostrarCIE}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botones guardar */}
      <div className="flex gap-3 mt-6">
        <button onClick={() => navigate(-1)} className="btn-outline flex-1">
          Cancelar
        </button>
        <button
          onClick={() => handleGuardar()}
          disabled={guardando}
          className="btn-rosa flex-1 flex items-center justify-center gap-2"
        >
          {guardando ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {modoEdicion ? 'Actualizando...' : 'Guardando...'}
            </>
          ) : modoEdicion ? '💾 Actualizar Registro' : '💾 Guardar Registro'}
        </button>
      </div>

      {/* Bot flotante — solo en modo creación */}
      {!modoEdicion && (
        <BotFlotante
          activo={activo}
          pausado={pausado}
          escuchando={escuchando}
          procesando={procesando}
          mensajeBot={mensajeBot}
          campoActual={campoActual}
          campo={camposVisibles[campoActual]}
          onToggle={toggle}
        />
      )}
    </div>
  );
}
