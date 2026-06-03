import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerRegistros, eliminarRegistro, buscarEnTodos, obtenerMesActual, MESES } from '../utils/sheets';
import { descargarPDF, imprimirPDF } from '../utils/pdf';

// Valor centinela para el modo "todos los meses"
const TODOS = '__TODOS__';

function Seccion({ titulo, campos }) {
  const visibles = campos.filter(([, v]) => v);
  if (!visibles.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-rosa-600 bg-rosa-50 px-2 py-1 rounded-lg mb-1.5 uppercase tracking-wide">{titulo}</p>
      <div className="space-y-1 mb-2">
        {visibles.map(([label, val]) => (
          <div key={label} className="flex gap-2">
            <span className="text-gray-400 w-28 flex-shrink-0 text-[10px] leading-4">{label}</span>
            <span className="font-semibold text-gray-800 text-[10px] leading-4 flex-1">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Pacientes() {
  const navigate = useNavigate();
  const [mesSeleccionado, setMesSeleccionado] = useState(obtenerMesActual);
  const modoTodos = mesSeleccionado === TODOS;

  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Búsqueda global: se activa cuando el input tiene 3+ caracteres
  const modoGlobal = busqueda.length >= 3;
  const [datosGlobal, setDatosGlobal] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [filtroSexo, setFiltroSexo] = useState('');
  const [filtroSector, setFiltroSector] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  // confirmEliminar guarda { id, mes } para saber de qué hoja eliminar
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const detalleRef = useRef(null);

  // Scroll automático al panel de detalle en móvil (solo modo normal)
  useEffect(() => {
    if (!modoTodos && pacienteSeleccionado && detalleRef.current && window.innerWidth < 768) {
      setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [pacienteSeleccionado, modoTodos]);

  // Carga de datos: por mes o todos los meses
  useEffect(() => {
    setLoading(true);
    setErrorCarga('');
    setPacienteSeleccionado(null);
    setDatos([]);

    const fetcher = modoTodos
      ? buscarEnTodos('', 'todos')       // carga todos los registros de todas las hojas
      : obtenerRegistros(mesSeleccionado);

    fetcher
      .then(d => setDatos(Array.isArray(d) ? d : []))
      .catch(err => {
        setErrorCarga(err.message || 'Error al conectar con el servidor.');
        setDatos([]);
      })
      .finally(() => setLoading(false));
  }, [mesSeleccionado]);

  // Búsqueda global con debounce de 400 ms para no saturar el backend
  useEffect(() => {
    if (!modoGlobal) {
      setDatosGlobal([]);
      setPacienteSeleccionado(null);
      return;
    }
    setLoadingGlobal(true);
    setPacienteSeleccionado(null);
    const timer = setTimeout(() => {
      buscarEnTodos(busqueda, 'todos')
        .then(d => setDatosGlobal(Array.isArray(d) ? d : []))
        .catch(() => setDatosGlobal([]))
        .finally(() => setLoadingGlobal(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [busqueda]); // solo depende del texto, no del mes

  // Filtrado en tiempo real (funciona igual en ambos modos)
  const filtrados = datos.filter(p => {
    const q = busqueda.toLowerCase();
    const matchQ = !q
      || p.nombres?.toLowerCase().includes(q)
      || p.dni?.includes(q)
      || p.sector?.toLowerCase().includes(q)
      || p.diagnostico?.toLowerCase().includes(q)
      || p.mes?.toLowerCase().includes(q);
    const matchSexo   = !filtroSexo   || p.sexo   === filtroSexo;
    const matchSector = !filtroSector || p.sector  === filtroSector;
    return matchQ && matchSexo && matchSector;
  });

  const sectores = [...new Set(datos.map(d => d.sector).filter(Boolean))];

  // Resolución del mes correcto para editar/eliminar
  // modoGlobal y modoTodos traen p.mes desde el backend; modo normal usa mesSeleccionado
  const mesDeRegistro = (p) => ((modoTodos || modoGlobal) ? p?.mes : mesSeleccionado) || mesSeleccionado;

  const eliminar = async (id, mes) => {
    setEliminando(true);
    setErrorEliminar('');
    try {
      await eliminarRegistro(id, mes);
      const excluir = p => !(p.id === id && (p.mes || mesSeleccionado) === mes);
      setDatos(d => d.filter(excluir));
      setDatosGlobal(d => d.filter(excluir)); // limpia también el resultado global si aplica
      setConfirmEliminar(null);
      if (pacienteSeleccionado?.id === id) setPacienteSeleccionado(null);
    } catch (err) {
      setErrorEliminar(err.message || 'Error al eliminar. Intenta de nuevo.');
    } finally {
      setEliminando(false);
    }
  };

  // ── Contenido del detalle (reutilizado en panel lateral y en modal TODOS) ──
  const renderContenidoDetalle = (p) => {
    if (!p) return null;
    const tipo = p.tipoAtencion === 'N' ? 'Nuevo'
      : p.tipoAtencion === 'R' ? 'Reingreso'
      : p.tipoAtencion === 'C' ? 'Continúa'
      : p.tipoAtencion;

    return (
      <>
        {/* Cabecera */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rosa-400 to-celeste-400 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {p.nombres?.[0] || '?'}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 leading-tight">{p.nombres}</h3>
              <p className="text-xs text-gray-400">DNI: {p.dni}</p>
              {(modoTodos || modoGlobal) && p.mes && (
                <span className="inline-block text-[10px] bg-rosa-100 text-rosa-700 font-bold px-2 py-0.5 rounded-full mt-0.5">
                  {p.mes}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setPacienteSeleccionado(null)}
            className="text-gray-400 hover:text-gray-600 text-lg flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Secciones scrollables */}
        <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
          <Seccion titulo="Datos de Atención" campos={[
            ['Fecha Atención', p.fechaAtencion],
            ['Profesional', p.profesional],
            ['Responsable', p.responsableAtencion],
            ['Tipo', tipo],
          ]} />
          <Seccion titulo="Datos del Paciente" campos={[
            ['Nombres', p.nombres],
            ['DNI', p.dni],
            ['Fecha Nacimiento', p.fechaNacimiento],
            ['Edad', p.edad ? p.edad + ' años' : ''],
            ['Sexo', p.sexo === 'F' ? 'Femenino' : p.sexo === 'M' ? 'Masculino' : p.sexo],
            ['Apoderado', p.apoderado],
          ]} />
          {(p.gestante === 'G' || p.gestante === 'P') && (
            <Seccion titulo="Gestante / Puérpera" campos={[
              ['Estado', p.gestante === 'G' ? 'Gestante' : 'Puérpera'],
              ['FUR', p.fur],
              ['Semana Gestacional', p.semanaGestacional],
              ['F. Probable Parto', p.fechaProbableParto],
            ]} />
          )}
          <Seccion titulo="Ubicación" campos={[
            ['H.CL', p.hcl],
            ['Sector', p.sector],
            ['Sectorista', p.sectorista],
            ['Seguro', p.seguro],
            ['Celular', p.celular],
          ]} />
          <Seccion titulo="Consulta y Diagnóstico" campos={[
            ['Motivo Consulta', p.motivoConsulta],
            ['Tamizaje', p.tamizaje],
            ['Resultado Tamizaje', p.resultadoTamizaje],
            ['Diagnóstico', p.diagnostico],
          ]} />
          <Seccion titulo="Seguimiento" campos={[
            ['2do Control', p.segundoControl],
            ['N° Intervención', p.intervencion],
            ['Fecha Próx. Cita', p.fechaProxCita],
            ['Término Atención', p.terminoAtencion],
            ['Referencia', p.referencia],
            ['Contrarreferencia', p.contrarreferencia],
          ]} />
          <Seccion titulo="Actividades" campos={[
            ['Val. Riesgo VIF', p.valoracionRiesgo],
            ['Ses. Movilización', p.sesionMovilizacion],
            ['Visita Domiciliaria', p.visitaDomiciliaria],
            ['Medicamentos', p.medicamentos],
            ['Teleorientación', p.teleorientacion],
            ['PROMSA', p.promsa],
            ['Campaña', p.campana],
            ['Observaciones', p.observaciones],
          ]} />
        </div>

        {/* Acciones */}
        <div className="border-t border-rosa-100 mt-4 pt-4 flex flex-wrap gap-2">
          <button onClick={() => descargarPDF(p)} className="btn-rosa text-xs flex items-center gap-1.5 flex-1">
            📄 Descargar PDF
          </button>
          <button onClick={() => imprimirPDF(p)} className="btn-celeste text-xs flex items-center gap-1.5 flex-1">
            🖨️ Imprimir
          </button>
          <button
            onClick={() => navigate(`/registro?editar=${p.id}&mes=${encodeURIComponent(mesDeRegistro(p))}`)}
            className="btn-outline text-xs flex items-center gap-1.5 w-full"
          >
            ✏️ Editar Registro
          </button>
          <button
            onClick={() => setConfirmEliminar({ id: p.id, mes: mesDeRegistro(p) })}
            className="w-full text-xs text-red-500 hover:text-red-700 font-semibold py-1 hover:bg-red-50 rounded-lg transition-colors"
          >
            🗑️ Eliminar Registro
          </button>
        </div>
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      {/* Cabecera de página */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Pacientes Registrados
        </h1>
        <button onClick={() => navigate('/registro')} className="btn-rosa flex items-center gap-1.5 text-sm">
          <span>+</span> Nuevo
        </button>
      </div>

      {/* ── Selector de período ─────────────────────────────────────────────── */}
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
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
            {/* Opción de búsqueda global al inicio */}
            <option value={TODOS}>🔍 TODOS LOS MESES</option>
            <optgroup label="── 2025 ──">
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </optgroup>
            <optgroup label="── 2026 ──">
              {MESES.map(m => <option key={`${m} 2026`} value={`${m} 2026`}>{m} 2026</option>)}
            </optgroup>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-rosa-400 text-xs font-bold">▼</span>
        </div>
        {(loading || loadingGlobal) && (
          <div className="w-5 h-5 border-2 border-rosa-200 border-t-rosa-500 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {/* ── Banner de error ─────────────────────────────────────────────────── */}
      {errorCarga && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">No se pudieron cargar los registros</p>
            <p className="text-xs mt-0.5">{errorCarga}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setErrorCarga('');
              const fetcher = modoTodos ? buscarEnTodos('', 'todos') : obtenerRegistros(mesSeleccionado);
              fetcher
                .then(d => setDatos(Array.isArray(d) ? d : []))
                .catch(err => setErrorCarga(err.message || 'Error al conectar.'))
                .finally(() => setLoading(false));
            }}
            className="ml-auto text-xs bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Barra de filtros ────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input-field flex-1"
            placeholder="🔍 Buscar por nombre, DNI, diagnóstico... (3+ letras = todos los meses)"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {/* Ocultar filtros de sexo y sector cuando la búsqueda global está activa */}
          {!modoGlobal && (
            <select className="input-field sm:w-36" value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)}>
              <option value="">Todos</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          )}
          {!modoGlobal && !modoTodos && (
            <select className="input-field sm:w-40" value={filtroSector} onChange={e => setFiltroSector(e.target.value)}>
              <option value="">Todos los sectores</option>
              {sectores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {loading ? 'Cargando...'
            : loadingGlobal ? 'Buscando en todos los meses...'
            : modoGlobal ? `${datosGlobal.length} registro(s) encontrado(s) en todos los meses`
            : modoTodos ? `${filtrados.length} registro(s) encontrado(s) en todos los meses`
            : `${filtrados.length} registro(s) encontrado(s) en ${mesSeleccionado}`}
        </p>
      </div>

      {/* ── Spinner de carga ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {modoTodos ? 'Buscando en todos los meses...' : `Cargando pacientes de ${mesSeleccionado}...`}
          </p>
        </div>

      ) : modoGlobal ? (
        /* ── MODO BÚSQUEDA GLOBAL (3+ caracteres) ───────────────────────────── */
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {loadingGlobal ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Buscando en todos los meses...
                </p>
              </div>
            ) : datosGlobal.length === 0 ? (
              <div className="card text-center text-gray-400 py-10">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm">Sin resultados para «{busqueda}»</p>
              </div>
            ) : datosGlobal.map((p) => (
              <div
                key={`${p.mes}-${p.id}`}
                onClick={() => setPacienteSeleccionado(p)}
                className={`card cursor-pointer transition-all hover:shadow-md hover:border-rosa-300 ${
                  pacienteSeleccionado?.id === p.id && pacienteSeleccionado?.mes === p.mes
                    ? 'border-rosa-400 bg-rosa-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rosa-200 to-celeste-200 flex items-center justify-center text-rosa-700 font-bold flex-shrink-0">
                    {p.nombres?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{p.nombres}</p>
                    <p className="text-xs text-gray-400">DNI: {p.dni}</p>
                    <p className="text-xs text-gray-400">{p.edad} años · {p.sector} · {p.fechaAtencion}</p>
                    {/* Badge de mes visible en búsqueda global */}
                    <span className="inline-block text-[10px] bg-rosa-100 text-rosa-700 font-bold px-2 py-0.5 rounded-full mt-0.5">
                      {p.mes}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      p.resultadoTamizaje === 'Positivo' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {p.resultadoTamizaje || 'S/D'}
                    </span>
                    {p.diagnostico && <span className="text-[10px] text-rosa-600 font-bold">{p.diagnostico}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Panel de detalle lateral — idéntico al modo normal */}
          {pacienteSeleccionado ? (
            <div ref={detalleRef} className="card slide-in-right sticky top-20 self-start">
              {renderContenidoDetalle(pacienteSeleccionado)}
            </div>
          ) : (
            <div className="card flex items-center justify-center text-gray-300 min-h-32">
              <div className="text-center">
                <p className="text-4xl mb-2">👆</p>
                <p className="text-sm">Selecciona un resultado para ver sus detalles</p>
              </div>
            </div>
          )}
        </div>

      ) : modoTodos ? (
        /* ── MODO TODOS: tabla compacta ─────────────────────────────────────── */
        <>
          {filtrados.length === 0 ? (
            <div className="card text-center text-gray-400 py-10">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">{errorCarga ? 'Error de conexión' : 'No hay registros en ningún mes'}</p>
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-rosa-50 to-celeste-50 border-b border-rosa-100">
                    {['Mes', 'Fecha', 'Nombre', 'DNI', 'Diagnóstico', 'Tamizaje'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p, idx) => (
                    <tr
                      key={`${p.mes}-${p.id}`}
                      onClick={() => setPacienteSeleccionado(p)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors hover:bg-rosa-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="bg-rosa-100 text-rosa-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {p.mes}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{p.fechaAtencion}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 max-w-[160px] truncate">{p.nombres}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{p.dni}</td>
                      <td className="px-3 py-2 text-rosa-600 font-bold whitespace-nowrap">{p.diagnostico || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          p.resultadoTamizaje === 'Positivo'
                            ? 'bg-amber-100 text-amber-700'
                            : p.resultadoTamizaje === 'Negativo'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.resultadoTamizaje || 'S/D'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal de detalle para modo TODOS */}
          {pacienteSeleccionado && (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setPacienteSeleccionado(null)}
            >
              <div
                className="slide-in-right bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5"
                onClick={e => e.stopPropagation()}
              >
                {renderContenidoDetalle(pacienteSeleccionado)}
              </div>
            </div>
          )}
        </>

      ) : (
        /* ── MODO NORMAL: lista + panel lateral ─────────────────────────────── */
        <div className="grid md:grid-cols-2 gap-4">
          {/* Lista de pacientes */}
          <div className="space-y-2">
            {filtrados.length === 0 ? (
              <div className="card text-center text-gray-400 py-10">
                <p className="text-3xl mb-2">🗂️</p>
                <p className="text-sm">
                  {errorCarga ? 'Error de conexión' : `No hay registros en ${mesSeleccionado}`}
                </p>
              </div>
            ) : filtrados.map((p) => (
              <div
                key={p.id}
                onClick={() => setPacienteSeleccionado(p)}
                className={`card cursor-pointer transition-all hover:shadow-md hover:border-rosa-300 ${
                  pacienteSeleccionado?.id === p.id ? 'border-rosa-400 bg-rosa-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rosa-200 to-celeste-200 flex items-center justify-center text-rosa-700 font-bold flex-shrink-0">
                    {p.nombres?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{p.nombres}</p>
                    <p className="text-xs text-gray-400">DNI: {p.dni}</p>
                    <p className="text-xs text-gray-400">{p.edad} años · {p.sexo === 'F' ? 'Femenino' : 'Masculino'}</p>
                    <p className="text-xs text-gray-400">{p.sector} · {p.fechaAtencion}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      p.resultadoTamizaje === 'Positivo' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {p.resultadoTamizaje || 'S/D'}
                    </span>
                    {p.diagnostico && <span className="text-[10px] text-rosa-600 font-bold">{p.diagnostico}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Panel de detalle lateral */}
          {pacienteSeleccionado ? (
            <div ref={detalleRef} className="card slide-in-right sticky top-20 self-start">
              {renderContenidoDetalle(pacienteSeleccionado)}
            </div>
          ) : (
            <div className="card flex items-center justify-center text-gray-300 min-h-32">
              <div className="text-center">
                <p className="text-4xl mb-2">👆</p>
                <p className="text-sm">Selecciona un paciente para ver sus detalles</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal de confirmación de eliminación ─────────────────────────────── */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bounce-in bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg mb-2">¿Eliminar registro?</h3>
            <p className="text-sm text-gray-500 mb-3">
              Esta acción eliminará el registro del sistema y del Google Sheets. No se puede deshacer.
            </p>
            {errorEliminar && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-3">
                ⚠️ {errorEliminar}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmEliminar(null); setErrorEliminar(''); }}
                disabled={eliminando}
                className="btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmEliminar.id, confirmEliminar.mes)}
                disabled={eliminando}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {eliminando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Eliminando...
                  </>
                ) : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
