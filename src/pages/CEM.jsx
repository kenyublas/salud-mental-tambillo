import React, { useState, useEffect } from 'react';
import { authHeaders, logout } from '../utils/auth';
import jsPDF from 'jspdf';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const HOJA = 'CEM PACHITEA';
const POR_PAGINA = 10;

async function apiFetch(url, opts = {}) {
  const res = await fetch(`${API}${url}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) { logout(); window.location.reload(); }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`); }
  return res.json();
}

const NIVELES_RIESGO = ['LEVE', 'MODERADO', 'GRAVE'];

function Paginacion({ paginaActual, totalPaginas, onChange }) {
  if (totalPaginas <= 1) return null;
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('...'); acc.push(p); return acc; }, []);
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => onChange(paginaActual - 1)} disabled={paginaActual === 1}
        className="w-8 h-8 rounded-xl border border-orange-200 text-orange-500 font-bold text-sm hover:bg-orange-50 disabled:opacity-30">←</button>
      {paginas.map((p, i) => p === '...' ? (
        <span key={`d${i}`} className="text-gray-400 text-xs">…</span>
      ) : (
        <button key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-xl text-sm font-bold ${p === paginaActual ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm' : 'border border-orange-200 text-orange-500 hover:bg-orange-50'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(paginaActual + 1)} disabled={paginaActual === totalPaginas}
        className="w-8 h-8 rounded-xl border border-orange-200 text-orange-500 font-bold text-sm hover:bg-orange-50 disabled:opacity-30">→</button>
    </div>
  );
}

async function generarPDFCEM(caso) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 15;

  const str = (val) => {
    if (!val) return '—';
    return String(val).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/Ñ/g, String.fromCharCode(209)).replace(/ñ/g, String.fromCharCode(241));
  };

  // Header
  doc.setFillColor(251, 235, 213);
  doc.rect(0, 0, W, 47, 'F');
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, W, 2.5, 'F');
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 2.5, W, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('GOBIERNO REGIONAL HUANUCO', W / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('DIRECCION REGIONAL DE SALUD HUANUCO', W / 2, 17, { align: 'center' });
  doc.text('Unidad Ejecutora 409 - Red de Salud Pachitea', W / 2, 21.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12);
  doc.text('CENTRO DE SALUD TAMBILLO-UMARI', W / 2, 27, { align: 'center' });
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.8);
  doc.line(M, 30, W - M, 30);

  doc.setFillColor(234, 88, 12);
  doc.roundedRect(M, 35, W - M * 2, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('CASO CEM PACHITEA', W / 2, 41.5, { align: 'center' });

  let y = 52;

  const seccion = (titulo) => {
    doc.setFillColor(234, 88, 12);
    doc.rect(M, y - 4, W - M * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(str(titulo), M + 3, y + 0.5);
    y += 9;
  };

  const campo = (label, value, col = 0, totalCols = 1, wrap = false) => {
    const colW = (W - M * 2) / totalCols;
    const x = M + col * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 80, 20);
    doc.text(str(label).toUpperCase() + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8.5);
    if (wrap) {
      const lines = doc.splitTextToSize(str(value), colW - 4);
      doc.text(lines, x, y + 4);
      return lines.length;
    } else {
      doc.text(str(value), x, y + 4);
      return 1;
    }
  };

  seccion('  DATOS DEL CASO');
  campo('Oficio', caso.oficio, 0, 3);
  campo('Fecha Recepcion', caso.fechaRecepcion, 1, 3);
  campo('Asunto', caso.asunto, 2, 3);
  y += 9;

  seccion('  DATOS DE LA USUARIA');
  const lines = campo('Nombres', caso.nombres, 0, 1, true);
  y += lines > 1 ? 4 + lines * 4.5 : 9;

  campo('DNI', caso.dni, 0, 3);
  campo('Edad', caso.edad, 1, 3);
  campo('Nivel de Riesgo', caso.nivelRiesgo, 2, 3);
  y += 9;
  campo('Domicilio', caso.domicilio, 0, 2);
  campo('Celular', caso.celular, 1, 2);
  y += 9;

  seccion('  ATENCION');
  campo('Fecha Atencion CEM', caso.fechaAtencion, 0, 2);
  campo('Deriva', caso.deriva, 1, 2);
  y += 9;

  if (caso.comentario) {
    const lc = campo('Comentario Adicional', caso.comentario, 0, 1, true);
    y += lc > 1 ? 4 + lc * 4.5 : 9;
  }

  if (caso.observacion) {
    const lo = campo('Observacion', caso.observacion, 0, 1, true);
    y += lo > 1 ? 4 + lo * 4.5 : 9;
  }

  // Footer
  doc.setFillColor(251, 235, 213);
  doc.rect(0, 270, W, 27, 'F');
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 294, W, 3, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Fecha de emision: ' + new Date().toLocaleDateString('es-PE'), M, 277);
  doc.setDrawColor(234, 88, 12);
  doc.line(W / 2 - 30, 285, W / 2 + 30, 285);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Lic. Janeth Karina Santa Cruz Espiritu', W / 2, 289, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Psicologa - Centro de Salud Tambillo', W / 2, 293, { align: 'center' });

  return doc;
}

export default function CEM() {
  const [tab, setTab] = useState('registros');
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [form, setForm] = useState({
    asunto: 'TERAPIA PSICOLOGICA',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    fechaAtencion: new Date().toISOString().split('T')[0],
    deriva: 'PSIC. YHINA MARIBEL COQUIRA HUARILLOCLLA',
  });

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/seguimiento/${encodeURIComponent(HOJA)}`);
      const schema = await apiFetch(`/api/seguimiento/schema/${encodeURIComponent(HOJA)}`);
      const colNombre = schema?.colsFijas?.find(c => c.key === 'nombres')?.col ?? 3;
      const colDni    = schema?.colsFijas?.find(c => c.key === 'dni')?.col ?? 4;
      const casos = (data.registros || []).map(reg => {
        const f = reg.valores || [];
        return {
          id: reg.id,
          oficio:         (f[0] || '').trim(),
          fechaRecepcion: (f[1] || '').trim(),
          asunto:         (f[2] || '').trim(),
          nombres:        (f[colNombre] || '').trim(),
          dni:            (f[colDni] || '').trim(),
          edad:           (f[5] || '').trim(),
          comentario:     (f[6] || '').trim(),
          nivelRiesgo:    (f[7] || '').trim(),
          domicilio:      (f[8] || '').trim(),
          celular:        (f[9] || '').trim(),
          fechaAtencion:  (f[10] || '').trim(),
          deriva:         (f[11] || '').trim(),
          observacion:    (f[12] || '').trim(),
        };
      }).filter(c => c.nombres || c.dni);
      setCasos(casos);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.nombres || !form.dni) { setError('Nombres y DNI son obligatorios.'); return; }
    setGuardando(true); setError('');
    try {
      await apiFetch(`/api/seguimiento/${encodeURIComponent(HOJA)}/nuevo`, {
        method: 'POST',
        body: JSON.stringify({
          oficio:         form.oficio || '',
          fechaRecepcion: form.fechaRecepcion || '',
          asunto:         form.asunto || '',
          nombres:        form.nombres || '',
          dni:            form.dni || '',
          edad:           form.edad || '',
          comentario:     form.comentario || '',
          nivelRiesgo:    form.nivelRiesgo || '',
          domicilio:      form.domicilio || '',
          celular:        form.celular || '',
          fechaAtencion:  form.fechaAtencion || '',
          deriva:         form.deriva || '',
          observacion:    form.observacion || '',
        }),
      });
      setGuardado(true);
      setTimeout(() => {
        setGuardado(false);
        setForm({
          asunto: 'TERAPIA PSICOLOGICA',
          fechaRecepcion: new Date().toISOString().split('T')[0],
          fechaAtencion: new Date().toISOString().split('T')[0],
          deriva: 'PSIC. YHINA MARIBEL COQUIRA HUARILLOCLLA',
        });
        cargar();
        setTab('registros');
      }, 2000);
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const filtrados = casos.filter(c => {
    const q = busqueda.toLowerCase();
    return !q || c.nombres?.toLowerCase().includes(q) || c.dni?.includes(q) || c.domicilio?.toLowerCase().includes(q);
  });

  const paginar = (lista) => lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const totalPags = Math.ceil(filtrados.length / POR_PAGINA);

  const colorRiesgo = (nivel) => {
    if (nivel === 'GRAVE')    return 'bg-red-100 text-red-700';
    if (nivel === 'MODERADO') return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="px-4 py-5 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
          CEM Pachitea
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Centro de Emergencia Mujer — C.S. Tambillo 2026</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'registros', icon: '📋', label: 'Registros' },
          { key: 'nuevo',     icon: '➕', label: 'Nuevo Caso' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB REGISTROS */}
      {tab === 'registros' && (
        <div className="space-y-3">
          <div className="card">
            <input className="input-field w-full" placeholder="🔍 Buscar por nombre, DNI, domicilio..."
              value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} />
            <p className="text-xs text-gray-400 mt-2">{filtrados.length} caso(s) registrado(s)</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm font-semibold">No hay casos registrados</p>
              <button onClick={() => setTab('nuevo')} className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600">+ Agregar primer caso</button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginar(filtrados).map((c, i) => (
                  <div key={i} onClick={() => setCasoSeleccionado(c)}
                    className="card cursor-pointer hover:shadow-md hover:border-orange-300 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(c.nombres || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{c.nombres}</p>
                        <p className="text-xs text-gray-500">DNI: {c.dni} · {c.domicilio}</p>
                        <p className="text-xs text-gray-400">{c.fechaRecepcion} · Oficio: {c.oficio}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorRiesgo(c.nivelRiesgo)}`}>
                          {c.nivelRiesgo || 'S/N'}
                        </span>
                        <span className="text-gray-300 group-hover:text-gray-500 text-sm">→</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Paginacion paginaActual={pagina} totalPaginas={totalPags} onChange={p => { setPagina(p); setCasoSeleccionado(null); }} />
            </>
          )}
        </div>
      )}

      {/* TAB NUEVO */}
      {tab === 'nuevo' && (
        <div className="card space-y-4">
          <h3 className="font-bold text-orange-600 text-sm">Nuevo Caso CEM</h3>

          {guardado && <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl px-4 py-3 text-sm font-semibold">✅ Caso registrado correctamente</div>}
          {error && <div className="bg-red-100 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">⚠️ {error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'oficio',         label: 'N° Oficio' },
              { key: 'fechaRecepcion', label: 'Fecha de Recepcion', type: 'date' },
              { key: 'asunto',         label: 'Asunto', full: true },
              { key: 'nombres',        label: 'Nombres y Apellidos *', full: true },
              { key: 'dni',            label: 'DNI *', type: 'number' },
              { key: 'edad',           label: 'Edad' },
              { key: 'nivelRiesgo',    label: 'Nivel de Riesgo', type: 'select', opts: NIVELES_RIESGO },
              { key: 'domicilio',      label: 'Domicilio' },
              { key: 'celular',        label: 'Celular' },
              { key: 'fechaAtencion',  label: 'Fecha de Atencion en CEM', type: 'date' },
              { key: 'deriva',         label: 'Deriva', full: true },
              { key: 'comentario',     label: 'Comentario Adicional', full: true, type: 'textarea' },
              { key: 'observacion',    label: 'Observacion', full: true, type: 'textarea' },
            ].map(f => (
              <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                <label className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="input-field w-full" value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                    <option value="">-- Seleccionar --</option>
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="input-field w-full" rows={3} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.label} />
                ) : (
                  <input className="input-field w-full" type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.label} />
                )}
              </div>
            ))}
          </div>

          <button onClick={guardar} disabled={guardando}
            className="w-full font-bold py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:opacity-90 disabled:opacity-60">
            {guardando ? '⏳ Guardando...' : '💾 Guardar Caso'}
          </button>
        </div>
      )}

      {/* MODAL FICHA */}
      {casoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-700 px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold opacity-75 mb-1">CEM PACHITEA · Oficio {casoSeleccionado.oficio}</p>
                  <h2 className="text-xl font-extrabold truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{casoSeleccionado.nombres}</h2>
                  <div className="flex items-center gap-3 mt-2 text-sm opacity-90 flex-wrap">
                    <span>🪪 {casoSeleccionado.dni}</span>
                    <span>· {casoSeleccionado.edad} años</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorRiesgo(casoSeleccionado.nivelRiesgo)}`}>
                      {casoSeleccionado.nivelRiesgo}
                    </span>
                  </div>
                </div>
                <button onClick={() => setCasoSeleccionado(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white ml-3">✕</button>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={async () => { setGenerandoPDF(true); try { const d = await generarPDFCEM(casoSeleccionado); d.save(`CEM_${casoSeleccionado.nombres?.replace(/ /g,'_')}.pdf`); } finally { setGenerandoPDF(false); } }}
                  disabled={generandoPDF}
                  className="flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                  {generandoPDF ? '⏳' : '⬇️'} Descargar PDF
                </button>
                <button onClick={async () => { setGenerandoPDF(true); try { const d = await generarPDFCEM(casoSeleccionado); const url = URL.createObjectURL(d.output('blob')); const w = window.open(url); if(w) w.print(); } finally { setGenerandoPDF(false); } }}
                  disabled={generandoPDF}
                  className="flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                  🖨️ Imprimir
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {[
                { label: 'Fecha Recepcion', val: casoSeleccionado.fechaRecepcion },
                { label: 'Asunto',          val: casoSeleccionado.asunto },
                { label: 'Domicilio',       val: casoSeleccionado.domicilio },
                { label: 'Celular',         val: casoSeleccionado.celular },
                { label: 'Fecha Atencion',  val: casoSeleccionado.fechaAtencion },
                { label: 'Deriva',          val: casoSeleccionado.deriva },
                { label: 'Comentario',      val: casoSeleccionado.comentario },
                { label: 'Observacion',     val: casoSeleccionado.observacion },
              ].filter(i => i.val).map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-400 font-semibold">{item.label}</p>
                  <p className="text-gray-800 font-medium text-sm leading-relaxed">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}