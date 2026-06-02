import jsPDF from 'jspdf';

// Normaliza texto para Helvetica (sin tildes ni ñ)
const str = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  return String(val)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ñ]/g, 'n')
    .replace(/[Ñ]/g, 'N');
};

const calcEdad = (fechaNac) => {
  if (!fechaNac) return '';
  const nac = new Date(fechaNac);
  if (isNaN(nac.getTime())) return '';
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e + ' anos';
};

// Carga una imagen desde public/ como data URL. Retorna null si falla.
async function cargarImagen(ruta) {
  try {
    const res = await fetch(ruta);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Detecta formato a partir del data URL ('PNG', 'JPEG', etc.)
function fmtImg(dataUrl) {
  if (!dataUrl) return 'PNG';
  const m = dataUrl.match(/^data:image\/(\w+);/);
  return m ? m[1].toUpperCase().replace('JPG', 'JPEG') : 'PNG';
}

// ─────────────────────────────────────────────────────────────────────────────
export async function generarPDFPaciente(paciente) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 15;

  // ── Carga de logos en paralelo ──────────────────────────────────────────────
  const [imgMinsa, imgDiresa, imgRed, imgTambillo] = await Promise.all([
    cargarImagen('/logo-minsa.png'),
    cargarImagen('/logo-diresa.png'),
    cargarImagen('/logo-red.png'),
    cargarImagen('/logo-tambillo.png'),
  ]);

  // ── Fondo rosa suave del encabezado (0 → 47 mm) ────────────────────────────
  doc.setFillColor(252, 231, 243);
  doc.rect(0, 0, W, 47, 'F');

  // Barra decorativa rosa (tope de página)
  doc.setFillColor(236, 72, 153);
  doc.rect(0, 0, W, 2.5, 'F');

  // Barra decorativa celeste
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 2.5, W, 1.5, 'F');

  // ── Logos (Y=5, 20×20 mm cada uno) ─────────────────────────────────────────
  //   Izquierda: MINSA (x=15) · DIRESA (x=36)
  //   Derecha  : RED   (x=W-54=156) · TAMBILLO (x=W-32=178)
  const LY = 5, LW = 20, LH = 20;
  if (imgMinsa)    doc.addImage(imgMinsa,    fmtImg(imgMinsa),    M,      LY, LW, LH);
  if (imgDiresa)   doc.addImage(imgDiresa,   fmtImg(imgDiresa),   M + 21, LY, LW, LH);
  if (imgRed)      doc.addImage(imgRed,      fmtImg(imgRed),      W - 54, LY, LW, LH);
  if (imgTambillo) doc.addImage(imgTambillo, fmtImg(imgTambillo), W - 32, LY, LW, LH);

  // ── Bloque de texto institucional (centrado, W/2=105) ──────────────────────
  //   Las líneas se ubican dentro del rango vertical de los logos (Y 5→25)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('GOBIERNO REGIONAL HUANUCO', W / 2, 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('DIRECCION REGIONAL DE SALUD HUANUCO', W / 2, 14, { align: 'center' });
  doc.text('Unidad Ejecutora 409 - Red de Salud Pachitea', W / 2, 18.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(236, 72, 153);
  doc.text('CENTRO DE SALUD TAMBILLO', W / 2, 23.5, { align: 'center' });

  // ── Línea separadora celeste (debajo de logos y texto) ─────────────────────
  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.8);
  doc.line(M, 27, W - M, 27);
  doc.setLineWidth(0.2); // reset

  // ── Texto del año en cursiva ────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    '"Ano de la Esperanza y el Fortalecimiento de la Democracia"',
    W / 2, 32, { align: 'center' }
  );

  // ── Banner RUA (rect redondeado rosa, texto blanco) ─────────────────────────
  doc.setFillColor(236, 72, 153);
  doc.roundedRect(M, 35, W - M * 2, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('RUA SALUD MENTAL 2026', W / 2, 41.5, { align: 'center' });

  // ── Cuerpo del reporte ──────────────────────────────────────────────────────
  let y = 49; // primera línea del cuerpo (4 mm bajo el banner)

  // Helper: encabezado de sección con fondo de color
  const seccion = (titulo, color = [14, 165, 233]) => {
    doc.setFillColor(...color);
    doc.rect(M, y - 4, W - M * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(str(titulo), M + 3, y + 0.5);
    y += 9;
  };

  // Helper: campo etiqueta + valor (soporta multi-columna y texto largo con wrap)
  const campo = (label, value, col = 0, totalCols = 1, wrap = false) => {
    const colW = (W - M * 2) / totalCols;
    const x = M + col * colW;
    const safeVal = str(value);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 100, 130);
    doc.text(str(label).toUpperCase() + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8.5);
    if (wrap) {
      const lines = doc.splitTextToSize(safeVal, colW - 4);
      doc.text(lines, x, y + 4);
    } else {
      doc.text(safeVal, x, y + 4);
    }
  };

  // ── DATOS DEL PACIENTE ──────────────────────────────────────────────────────
  seccion('  DATOS DEL PACIENTE', [236, 72, 153]);

  campo('Nombres y Apellidos', paciente.nombres, 0, 1, true);
  const nombreLines = doc.splitTextToSize(str(paciente.nombres), W - M * 2 - 4);
  y += nombreLines.length > 1 ? 4 + nombreLines.length * 4.5 : 9;

  campo('DNI', paciente.dni, 0, 3);
  campo('Fecha de Nacimiento', paciente.fechaNacimiento, 1, 3);
  campo('Edad Actual', calcEdad(paciente.fechaNacimiento) || str(paciente.edad), 2, 3);
  y += 9;

  campo('Sexo', paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : paciente.sexo, 0, 3);
  campo('Seguro', paciente.seguro, 1, 3);
  campo('Celular', paciente.celular, 2, 3);
  y += 12;

  // ── UBICACIÓN Y SECTORIZACIÓN ───────────────────────────────────────────────
  seccion('  UBICACION Y SECTORIZACION', [14, 165, 233]);

  campo('Sector', paciente.sector, 0, 2);
  campo('Sectorista', paciente.sectorista, 1, 2);
  y += 9;
  campo('Historia Clinica', paciente.hcl, 0, 1);
  y += 12;

  // ── GESTANTE / PUÉRPERA (condicional) ───────────────────────────────────────
  if (paciente.gestante && paciente.gestante !== '-' && paciente.gestante !== '') {
    seccion('  DATOS DE GESTANTE/PUERPERA', [168, 85, 247]);
    campo('Estado', paciente.gestante === 'G' ? 'Gestante' : 'Puerpera', 0, 3);
    campo('FUR', paciente.fur, 1, 3);
    campo('Semana Gestacional', paciente.semanaGestacional, 2, 3);
    y += 9;
    campo('Fecha Probable de Parto', paciente.fechaProbableParto, 0, 1);
    y += 12;
  }

  // ── DATOS DE ATENCIÓN ───────────────────────────────────────────────────────
  seccion('  DATOS DE ATENCION', [236, 72, 153]);

  campo('Fecha de Atencion', paciente.fechaAtencion, 0, 3);
  campo('Profesional', paciente.profesional, 1, 3);
  campo('Tipo', paciente.tipoAtencion === 'N' ? 'Nuevo' : paciente.tipoAtencion === 'R' ? 'Reingreso' : 'Continua', 2, 3);
  y += 9;

  campo('Motivo de Consulta', paciente.motivoConsulta, 0, 1, true);
  const motivoLines = doc.splitTextToSize(str(paciente.motivoConsulta), W - M * 2 - 4);
  y += motivoLines.length > 1 ? 4 + motivoLines.length * 4.5 : 9;

  campo('Tamizaje', paciente.tamizaje, 0, 3);
  campo('Resultado', paciente.resultadoTamizaje, 1, 3);
  campo('Diagnostico (CIE-10)', paciente.diagnostico, 2, 3);
  y += 9;

  y += 4;

  // ── SEGUIMIENTO ─────────────────────────────────────────────────────────────
  const seguimientoCampos = [
    ['Segundo Control',  paciente.segundoControl],
    ['N Intervencion',   paciente.intervencion],
    ['Proxima Cita',     paciente.fechaProxCita],
    ['Termino Atencion', paciente.terminoAtencion],
    ['Referencia',       paciente.referencia],
    ['Contrarreferencia',paciente.contrarreferencia],
  ].filter(([, v]) => v);

  if (seguimientoCampos.length) {
    if (y > 245) { doc.addPage(); y = M; }
    seccion('  SEGUIMIENTO', [14, 165, 233]);
    const mitad = Math.ceil(seguimientoCampos.length / 2);
    for (let i = 0; i < mitad; i++) {
      campo(seguimientoCampos[i][0], seguimientoCampos[i][1], 0, 2);
      if (seguimientoCampos[i + mitad]) campo(seguimientoCampos[i + mitad][0], seguimientoCampos[i + mitad][1], 1, 2);
      y += 9;
    }
    y += 4;
  }

  // ── ACTIVIDADES ─────────────────────────────────────────────────────────────
  const actividadesCampos = [
    ['Valoracion Riesgo VIF', paciente.valoracionRiesgo],
    ['Sesion Movilizacion',   paciente.sesionMovilizacion],
    ['Visita Domiciliaria',   paciente.visitaDomiciliaria],
    ['Medicamentos',          paciente.medicamentos],
    ['Teleorientacion',       paciente.teleorientacion],
    ['PROMSA',                paciente.promsa],
    ['Campana',               paciente.campana],
  ].filter(([, v]) => v);

  if (actividadesCampos.length || paciente.observaciones) {
    if (y > 230) { doc.addPage(); y = M; }
    seccion('  ACTIVIDADES', [236, 72, 153]);
    const mitadA = Math.ceil(actividadesCampos.length / 2);
    for (let i = 0; i < mitadA; i++) {
      campo(actividadesCampos[i][0], actividadesCampos[i][1], 0, 2);
      if (actividadesCampos[i + mitadA]) campo(actividadesCampos[i + mitadA][0], actividadesCampos[i + mitadA][1], 1, 2);
      y += 9;
    }
    if (paciente.observaciones) {
      campo('Observaciones', paciente.observaciones, 0, 1, true);
      const obsLines = doc.splitTextToSize(str(paciente.observaciones), W - M * 2 - 4);
      y += obsLines.length > 1 ? 4 + obsLines.length * 4.5 : 9;
    }
  }

  y += 8;

  // ── PIE DE PÁGINA ───────────────────────────────────────────────────────────
  doc.setFillColor(252, 231, 243);
  doc.rect(0, 270, W, 27, 'F');
  doc.setFillColor(236, 72, 153);
  doc.rect(0, 294, W, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Fecha de emision: ' + new Date().toLocaleDateString('es-PE'), M, 277);

  doc.setDrawColor(236, 72, 153);
  doc.line(W / 2 - 30, 285, W / 2 + 30, 285);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Lic. Janeth', W / 2, 289, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Psicologa - Centro de Salud Tambillo', W / 2, 293, { align: 'center' });

  return doc;
}

export async function descargarPDF(paciente) {
  const doc = await generarPDFPaciente(paciente);
  const nombre = str(paciente.nombres).replace(/ /g, '_') || 'paciente';
  doc.save(`RUA_${nombre}_${paciente.fechaAtencion || ''}.pdf`);
}

export async function imprimirPDF(paciente) {
  const doc = await generarPDFPaciente(paciente);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url);
  if (win) win.print();
}
