import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { obtenerRegistros, obtenerMesActual, MESES } from '../utils/sheets';
import { authHeaders, logout } from '../utils/auth';
import jsPDF from 'jspdf';
import MetasVsAvance from '../components/MetasVsAvance';
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

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconBell       = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>;
const IconRefresh    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
const IconUsers      = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const IconCalendar   = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>;
const IconHeart      = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>;
const IconAlert      = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
const IconEdit       = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
const IconDownload   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>;
const IconCheck      = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>;
const IconWarning    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
const IconClock      = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;

// ── Reporte mensual PDF ───────────────────────────────────────────────────────
async function generarReporteMensual(mes, datos) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 15;
  const str = (v) => (v || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/n\u0303/g, String.fromCharCode(241));

  // Header
  doc.setFillColor(236, 72, 153);
  doc.rect(0, 0, W, 2.5, 'F');
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 2.5, W, 1.5, 'F');
  doc.setFillColor(252, 231, 243);
  doc.rect(0, 4, W, 40, 'F');

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
  doc.setTextColor(236, 72, 153);
  doc.text('CENTRO DE SALUD TAMBILLO-UMARI', W / 2, 27, { align: 'center' });

  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.8);
  doc.line(M, 31, W - M, 31);
  doc.setLineWidth(0.2);

  // Banner
  doc.setFillColor(236, 72, 153);
  doc.roundedRect(M, 36, W - M * 2, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`REPORTE MENSUAL — ${mes.toUpperCase()}`, W / 2, 42.5, { align: 'center' });

  let y = 55;

  const seccion = (titulo, color = [14, 165, 233]) => {
    doc.setFillColor(...color);
    doc.rect(M, y - 4, W - M * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, M + 3, y + 0.5);
    y += 9;
  };

  const fila = (label, value, col = 0, totalCols = 1) => {
    const colW = (W - M * 2) / totalCols;
    const x = M + col * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 100, 130);
    doc.text(label.toUpperCase() + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(str(String(value)), x, y + 4);
  };

  // Resumen general
  seccion('  RESUMEN GENERAL', [236, 72, 153]);
  const total     = datos.length;
  const gestantes = datos.filter(d => d.gestante === 'G' || d.gestante === 'P').length;
  const positivos = datos.filter(d => d.resultadoTamizaje === 'Positivo').length;
  const negativos = datos.filter(d => d.resultadoTamizaje === 'Negativo').length;

  fila('Total Atenciones', total, 0, 4);
  fila('Gestantes', gestantes, 1, 4);
  fila('Tamizaje Positivo', positivos, 2, 4);
  fila('Tamizaje Negativo', negativos, 3, 4);
  y += 12;

  // Por psicólogo
  const porPsicologo = Object.entries(
    datos.reduce((acc, d) => {
      const p = d.responsableAtencion || d.profesional || 'Sin asignar';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  seccion('  ATENCIONES POR PSICOLOGO(A)', [14, 165, 233]);
  porPsicologo.forEach(([nombre, count]) => {
    fila(str(nombre), `${count} atenciones`, 0, 1);
    y += 9;
  });
  y += 3;

  // Por diagnóstico
  const porDiag = Object.entries(
    datos.reduce((acc, d) => {
      if (d.diagnostico) acc[d.diagnostico] = (acc[d.diagnostico] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (y > 220) { doc.addPage(); y = M; }
  seccion('  DIAGNOSTICOS MAS FRECUENTES', [168, 85, 247]);
  const mitadDiag = Math.ceil(porDiag.length / 2);
  for (let i = 0; i < mitadDiag; i++) {
    fila(porDiag[i][0], `${porDiag[i][1]} caso(s)`, 0, 2);
    if (porDiag[i + mitadDiag]) fila(porDiag[i + mitadDiag][0], `${porDiag[i + mitadDiag][1]} caso(s)`, 1, 2);
    y += 9;
  }
  y += 3;

  // Por sector
  const porSector = Object.entries(
    datos.reduce((acc, d) => {
      if (d.sector) acc[d.sector] = (acc[d.sector] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  if (y > 220) { doc.addPage(); y = M; }
  seccion('  ATENCIONES POR SECTOR', [236, 72, 153]);
  const mitadSec = Math.ceil(porSector.length / 2);
  for (let i = 0; i < mitadSec; i++) {
    fila(str(porSector[i][0]), `${porSector[i][1]} atenciones`, 0, 2);
    if (porSector[i + mitadSec]) fila(str(porSector[i + mitadSec][0]), `${porSector[i + mitadSec][1]} atenciones`, 1, 2);
    y += 9;
  }
  y += 3;

  // Por sexo
  if (y > 220) { doc.addPage(); y = M; }
  seccion('  DISTRIBUCION POR SEXO', [14, 165, 233]);
  const femenino  = datos.filter(d => d.sexo === 'F').length;
  const masculino = datos.filter(d => d.sexo === 'M').length;
  fila('Femenino', femenino, 0, 2);
  fila('Masculino', masculino, 1, 2);
  y += 12;

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(252, 231, 243);
    doc.rect(0, 270, W, 27, 'F');
    doc.setFillColor(236, 72, 153);
    doc.rect(0, 294, W, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Fecha de emision: ' + new Date().toLocaleDateString('es-PE'), M, 277);
    doc.text(`Pagina ${p} de ${pageCount}`, W - M, 277, { align: 'right' });

    doc.setDrawColor(236, 72, 153);
    doc.line(W / 2 - 30, 285, W / 2 + 30, 285);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Lic. Janeth Karina Santa Cruz Espiritu', W / 2, 289, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Psicologa - Centro de Salud Tambillo', W / 2, 293, { align: 'center' });
  }

  doc.save(`Reporte_${mes.replace(/ /g, '_')}.pdf`);
}

// ── Componente de alertas ─────────────────────────────────────────────────────
function AlertasSeguimiento({ navigate }) {
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const cargarAlertas = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

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

      const hojasSeg = await apiFetch('/api/seguimiento/hojas');
      const hojasConSchema = hojasSeg.filter(h => !['TA - 2026', 'Hoja1'].includes(h.nombre));

      const proyeccionVencida = [];
      const sinSesiones30dias = [];

      const chunks = [];
      for (let i = 0; i < hojasConSchema.length; i += 4) chunks.push(hojasConSchema.slice(i, i + 4));

      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (h) => {
          try {
            const schema = await apiFetch(`/api/seguimiento/schema/${encodeURIComponent(h.nombre)}`);
            if (!schema.tieneSchema) return;
            const data = await apiFetch(`/api/seguimiento/${encodeURIComponent(h.nombre)}`);
            const pacientes = (data.registros || []).map(reg => {
              const fila = reg.valores || [];
              const colNombre     = schema.colsFijas?.find(c => c.key === 'nombres')?.col ?? 6;
              const colDni        = schema.colsFijas?.find(c => c.key === 'dni')?.col    ?? 10;
              const colProyeccion = schema.colsMeta?.find(c => c.key === 'proyeccion')?.col;
              const proyeccion    = colProyeccion !== undefined ? (fila[colProyeccion] || '') : '';

              let ultimaFechaSesion = null;
              schema.gruposSesiones?.forEach(g => {
                for (let s = g.sesiones - 1; s >= 0; s--) {
                  const f = (fila[g.col + s] || '').trim();
                  if (f) {
                    const d = parsearFechaES(f) || new Date(f);
                    if (!isNaN(d) && (!ultimaFechaSesion || d > ultimaFechaSesion)) ultimaFechaSesion = d;
                    break;
                  }
                }
              });

              return { nombres: (fila[colNombre] || '').trim(), dni: (fila[colDni] || '').trim(), hoja: h.nombre, proyeccion, ultimaFechaSesion };
            }).filter(p => p.nombres);

            pacientes.forEach(p => {
              if (p.proyeccion) {
                const fechaProy = parsearFechaES(p.proyeccion) || new Date(p.proyeccion);
                if (!isNaN(fechaProy) && fechaProy < hoy) proyeccionVencida.push(p);
              }
              if (p.ultimaFechaSesion) {
                const diasSinVenir = Math.floor((hoy - p.ultimaFechaSesion) / (1000 * 60 * 60 * 24));
                if (diasSinVenir > 30) sinSesiones30dias.push({ ...p, diasSinVenir });
              }
            });
          } catch {}
        }));
      }

      const gestantesProximas = [];
      registrosRUA.filter(p => p.gestante === 'G' || p.gestante === 'P').forEach(p => {
        if (!p.fechaProbableParto) return;
        const m = p.fechaProbableParto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return;
        const fpp = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        fpp.setHours(0,0,0,0);
        const diasRestantes = Math.ceil((fpp - hoy) / (1000 * 60 * 60 * 24));
        if (diasRestantes >= 0 && diasRestantes <= 30) gestantesProximas.push({ ...p, diasRestantes });
      });
      gestantesProximas.sort((a, b) => a.diasRestantes - b.diasRestantes);

      setAlertas({ citasHoy, proyeccionVencida, sinSesiones30dias, gestantesProximas });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargarAlertas(); }, [cargarAlertas]);

  const total = alertas
    ? alertas.citasHoy.length + alertas.proyeccionVencida.length + alertas.sinSesiones30dias.length
    : 0;

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconBell />
          <h3 className="font-bold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>Alertas de Seguimiento</h3>
          {alertas && total > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{total}</span>
          )}
        </div>
        <button onClick={cargarAlertas} disabled={loading}
          className="text-xs font-semibold text-rosa-500 hover:text-rosa-700 flex items-center gap-1.5 disabled:opacity-50">
          {loading ? <div className="w-3.5 h-3.5 border-2 border-rosa-300 border-t-rosa-600 rounded-full animate-spin" /> : <IconRefresh />}
          {loading ? 'Cargando...' : alertas ? 'Actualizar' : 'Cargar alertas'}
        </button>
      </div>

      {!alertas && !loading && !error && (
        <div className="text-center py-6 text-gray-400">
          <p className="text-xs font-semibold">Toca "Cargar alertas" para ver el estado del seguimiento</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 flex items-center gap-2">
          <IconWarning /> {error}
        </div>
      )}

      {alertas && alertas.gestantesProximas?.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <IconHeart />
            <p className="font-bold text-purple-700 text-sm">
              {alertas.gestantesProximas.length} gestante{alertas.gestantesProximas.length > 1 ? 's' : ''} proxima{alertas.gestantesProximas.length > 1 ? 's' : ''} a dar a luz
            </p>
          </div>
          <div className="space-y-1.5">
            {alertas.gestantesProximas.slice(0, 3).map((p, i) => (
              <div key={i} onClick={() => navigate('/gestantes')}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-purple-50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700 flex-shrink-0">{p.nombres?.[0] || '?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{p.nombres}</p>
                  <p className="text-[10px] text-purple-500">FPP: {p.fechaProbableParto}</p>
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded ${p.diasRestantes <= 7 ? 'bg-red-100 text-red-700' : p.diasRestantes <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                  {p.diasRestantes === 0 ? 'HOY' : `${p.diasRestantes}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertas && total === 0 && !alertas.gestantesProximas?.length && (
        <div className="text-center py-6 text-green-600 flex flex-col items-center gap-2">
          <IconCheck />
          <p className="text-xs font-semibold">Todo al dia — sin alertas pendientes</p>
        </div>
      )}

      {alertas && total > 0 && (
        <div className="space-y-3">
          {alertas.citasHoy.length > 0 && (
            <div className="rounded-xl border border-celeste-200 bg-celeste-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <IconCalendar />
                <p className="font-bold text-celeste-700 text-sm">
                  {alertas.citasHoy.length} cita{alertas.citasHoy.length > 1 ? 's' : ''} programada{alertas.citasHoy.length > 1 ? 's' : ''} para hoy
                </p>
              </div>
              <div className="space-y-1.5">
                {alertas.citasHoy.slice(0, 3).map((p, i) => (
                  <div key={i} onClick={() => navigate(`/pacientes?buscar=${encodeURIComponent(p.dni || p.nombres)}`)}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-celeste-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-celeste-200 flex items-center justify-center text-xs font-bold text-celeste-700 flex-shrink-0">{p.nombres?.[0] || '?'}</div>
                    <p className="text-xs font-semibold text-gray-700 truncate flex-1">{p.nombres}</p>
                    <span className="text-[10px] text-celeste-500 font-semibold flex-shrink-0">{p.sector}</span>
                  </div>
                ))}
                {alertas.citasHoy.length > 3 && <p className="text-xs text-celeste-500 font-semibold text-center">+{alertas.citasHoy.length - 3} mas</p>}
              </div>
            </div>
          )}

          {alertas.proyeccionVencida.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <IconWarning />
                <p className="font-bold text-amber-700 text-sm">
                  {alertas.proyeccionVencida.length} paciente{alertas.proyeccionVencida.length > 1 ? 's' : ''} con TA vencido
                </p>
              </div>
              <div className="space-y-1.5">
                {alertas.proyeccionVencida.slice(0, 3).map((p, i) => (
                  <div key={i} onClick={() => navigate(`/seguimiento?buscar=${encodeURIComponent(p.dni || p.nombres)}&hoja=${encodeURIComponent(p.hoja)}`)}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-amber-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">{p.nombres?.[0] || '?'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{p.nombres}</p>
                      <p className="text-[10px] text-amber-500">{p.hoja}</p>
                    </div>
                    <span className="text-[10px] text-amber-600 font-bold flex-shrink-0 bg-amber-100 px-1.5 py-0.5 rounded">{p.proyeccion}</span>
                  </div>
                ))}
                {alertas.proyeccionVencida.length > 3 && <p className="text-xs text-amber-500 font-semibold text-center">+{alertas.proyeccionVencida.length - 3} mas</p>}
              </div>
            </div>
          )}

          {alertas.sinSesiones30dias.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <IconClock />
                <p className="font-bold text-red-700 text-sm">
                  {alertas.sinSesiones30dias.length} paciente{alertas.sinSesiones30dias.length > 1 ? 's' : ''} sin sesion hace +30 dias
                </p>
              </div>
              <div className="space-y-1.5">
                {alertas.sinSesiones30dias.slice(0, 3).map((p, i) => (
                  <div key={i} onClick={() => navigate(`/seguimiento?buscar=${encodeURIComponent(p.dni || p.nombres)}&hoja=${encodeURIComponent(p.hoja)}`)}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-red-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">{p.nombres?.[0] || '?'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{p.nombres}</p>
                      <p className="text-[10px] text-red-400">{p.hoja}</p>
                    </div>
                    <span className="text-[10px] text-red-600 font-bold flex-shrink-0 bg-red-100 px-1.5 py-0.5 rounded">{p.diasSinVenir}d sin venir</span>
                  </div>
                ))}
                {alertas.sinSesiones30dias.length > 3 && <p className="text-xs text-red-400 font-semibold text-center">+{alertas.sinSesiones30dias.length - 3} mas</p>}
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
  const [datos, setDatos]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [generandoPDF, setGenerandoPDF] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true); setErrorCarga('');
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
    { label: 'Total del Mes',     value: total,        icon: <IconUsers />,    color: 'from-rosa-400 to-rosa-600',      sub: mesSeleccionado },
    { label: 'Atendidos Hoy',     value: atendidosHoy, icon: <IconCalendar />, color: 'from-celeste-400 to-celeste-600', sub: 'hoy' },
    { label: 'Gestantes',         value: gestantes,    icon: <IconHeart />,    color: 'from-purple-400 to-purple-600',  sub: 'activas' },
    { label: 'Tamizaje Positivo', value: positivos,    icon: <IconAlert />,    color: 'from-amber-400 to-amber-600',    sub: 'requieren seguimiento' },
  ];

  const handleReporte = async () => {
    if (!datos.length) return;
    setGenerandoPDF(true);
    try { await generarReporteMensual(mesSeleccionado, datos); }
    catch (e) { alert('Error al generar reporte: ' + e.message); }
    finally { setGenerandoPDF(false); }
  };

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">

      {/* Saludo */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {obtenerSaludo()}, {localStorage.getItem('titulo') || 'Lic.'} {(localStorage.getItem('nombre') || 'Janeth').split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Selector de mes + reporte */}
      <div className="card mb-5 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 flex-shrink-0">
          Periodo:
        </span>
        <div className="relative flex-1 max-w-xs">
          <select value={mesSeleccionado} onChange={e => setMesSeleccionado(e.target.value)}
            className="w-full appearance-none rounded-xl border-2 border-rosa-200 bg-gradient-to-r from-rosa-50 to-celeste-50 px-4 py-2 pr-9 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:border-rosa-400 cursor-pointer transition-colors"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            <optgroup label="── 2025 ──">{MESES.map(m => <option key={m} value={m}>{m}</option>)}</optgroup>
            <optgroup label="── 2026 ──">{MESES.map(m => <option key={`${m} 2026`} value={`${m} 2026`}>{m} 2026</option>)}</optgroup>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-rosa-400 text-xs font-bold">▼</span>
        </div>
        {loading && <div className="w-5 h-5 border-2 border-rosa-200 border-t-rosa-500 rounded-full animate-spin flex-shrink-0" />}
        <button onClick={handleReporte} disabled={generandoPDF || !datos.length}
          className="ml-auto btn-rosa flex items-center gap-2 text-sm disabled:opacity-50">
          {generandoPDF ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <IconDownload />}
          {generandoPDF ? 'Generando...' : 'Reporte del Mes'}
        </button>
      </div>

      {/* Error */}
      {errorCarga && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm">
          <IconWarning />
          <div>
            <p className="font-semibold">No se pudieron cargar los datos</p>
            <p className="text-xs mt-0.5">{errorCarga}</p>
          </div>
          <button onClick={() => { setLoading(true); setErrorCarga(''); obtenerRegistros(mesSeleccionado).then(d => setDatos(Array.isArray(d) ? d : [])).catch(err => setErrorCarga(err.message)).finally(() => setLoading(false)); }}
            className="ml-auto text-xs bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Cargando datos de {mesSeleccionado}...</p>
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
                  <span className="opacity-80">{s.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <AlertasSeguimiento navigate={navigate} />
          <MetasVsAvance />

          {/* Nuevo paciente */}
          <div className="card mb-6 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">Nuevo paciente</p>
              <p className="text-sm text-gray-500">Registra una nueva atencion rapidamente</p>
            </div>
            <button onClick={() => navigate('/registro')} className="btn-rosa flex items-center gap-2">
              <IconEdit /> Nuevo Registro
            </button>
          </div>

          {/* Graficas */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="card">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rosa-400 inline-block"></span>
                Pacientes por Sector
              </h3>
              {porSector.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos para este periodo</p>
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
                Distribucion por Sexo
              </h3>
              {(porSexo[0].value === 0 && porSexo[1].value === 0) ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos para este periodo</p>
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

          {/* Diagnosticos */}
          <div className="card mb-4">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400 inline-block"></span>
              Diagnosticos Mas Frecuentes
            </h3>
            <div className="space-y-2">
              {porDiag.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin diagnosticos para este periodo</p>
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

          {/* Ultimas atenciones */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                Ultimas Atenciones
              </h3>
              <button onClick={() => navigate('/pacientes')} className="text-xs text-rosa-500 font-semibold hover:underline">
                Ver todos
              </button>
            </div>
            <div className="space-y-2">
              {datos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin atenciones en este periodo</p>
              ) : datos.slice(0, 4).map((p, i) => (
                <div key={i} onClick={() => navigate('/pacientes')}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rosa-50 transition-colors cursor-pointer">
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