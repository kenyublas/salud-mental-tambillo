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
  let anos = hoy.getFullYear() - nac.getFullYear();
  let meses = hoy.getMonth() - nac.getMonth();
  if (hoy.getDate() < nac.getDate()) meses--;
  if (meses < 0) { anos--; meses += 12; }
  if (anos === 0) return meses + ' mes' + (meses !== 1 ? 'es' : '');
  if (meses === 0) return anos + ' a' + String.fromCharCode(241) + 'os';
  return anos + ' a' + String.fromCharCode(241) + 'os ' + meses + ' mes' + (meses !== 1 ? 'es' : '');
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
  doc.text('CENTRO DE SALUD TAMBILLO-UMARI', W / 2, 23.5, { align: 'center' });

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
export async function generarPDFSeguimiento(paciente, hoja, schema) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 15;

  // Logos
  const [imgMinsa, imgDiresa, imgRed, imgTambillo] = await Promise.all([
    cargarImagen('/logo-minsa.png'),
    cargarImagen('/logo-diresa.png'),
    cargarImagen('/logo-red.png'),
    cargarImagen('/logo-tambillo.png'),
  ]);

  // ── Encabezado ────────────────────────────────────────────────────────────
  doc.setFillColor(219, 234, 254); // azul claro
  doc.rect(0, 0, W, 47, 'F');

  doc.setFillColor(37, 99, 235); // azul
  doc.rect(0, 0, W, 2.5, 'F');
  doc.setFillColor(14, 165, 233); // celeste
  doc.rect(0, 2.5, W, 1.5, 'F');

  const LY = 5, LW = 20, LH = 20;
  if (imgMinsa)    doc.addImage(imgMinsa,    fmtImg(imgMinsa),    M,      LY, LW, LH);
  if (imgDiresa)   doc.addImage(imgDiresa,   fmtImg(imgDiresa),   M + 21, LY, LW, LH);
  if (imgRed)      doc.addImage(imgRed,      fmtImg(imgRed),      W - 54, LY, LW, LH);
  if (imgTambillo) doc.addImage(imgTambillo, fmtImg(imgTambillo), W - 32, LY, LW, LH);

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
  doc.setTextColor(37, 99, 235);
  doc.text('CENTRO DE SALUD TAMBILLO-UMARI', W / 2, 23.5, { align: 'center' });

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(M, 27, W - M, 27);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    '"Ano de la Esperanza y el Fortalecimiento de la Democracia"',
    W / 2, 32, { align: 'center' }
  );

  // Banner SEGUIMIENTO
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(M, 35, W - M * 2, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const tituloHoja = str(schema?.titulo || hoja).substring(0, 70);
  doc.text(tituloHoja, W / 2, 41.5, { align: 'center' });

  // ── Helpers ───────────────────────────────────────────────────────────────
  let y = 49;

  const checkPage = (needed = 15) => {
    if (y + needed > 265) { doc.addPage(); y = M; }
  };

  const seccion = (titulo, color = [37, 99, 235]) => {
    checkPage(12);
    doc.setFillColor(...color);
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
    const safeVal = str(value);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 200);
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

  // ── DATOS DEL PACIENTE ────────────────────────────────────────────────────
  seccion('  DATOS DEL PACIENTE', [37, 99, 235]);

  campo('Nombres y Apellidos', paciente.nombres, 0, 1, true);
  const nombreLines = doc.splitTextToSize(str(paciente.nombres), W - M * 2 - 4);
  y += nombreLines.length > 1 ? 4 + nombreLines.length * 4.5 : 9;

  campo('DNI', paciente.dni, 0, 3);
  campo('Fecha de Nacimiento', paciente.fechaNac, 1, 3);
  campo('Edad', calcEdad(paciente.fechaNac) || str(paciente.edad), 2, 3);
  y += 9;

  campo('Sexo', paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : str(paciente.sexo), 0, 3);
  campo('Historia Clinica', paciente.hcl, 1, 3);
  campo('Celular', paciente.celular, 2, 3);
  y += 9;

  campo('Sector', paciente.sector, 0, 2);
  campo('Sectorista', paciente.sectorista, 1, 2);
  y += 9;

  if (paciente.direccion) {
    campo('Direccion', paciente.direccion, 0, 1, true);
    const dirLines = doc.splitTextToSize(str(paciente.direccion), W - M * 2 - 4);
    y += dirLines.length > 1 ? 4 + dirLines.length * 4.5 : 9;
  }

  if (paciente.apoderado) {
    campo('Apoderado / Familiar', paciente.apoderado, 0, 2);
    campo('Institucion Educativa', paciente.institucion || '—', 1, 2);
    y += 9;
  }

  campo('Diagnostico (CIE-10)', paciente.diagnostico, 0, 2);
  campo('Tamizaje', paciente.tamizaje, 1, 2);
  y += 9;

  campo('Fecha de Atencion', paciente.fechaAtencion, 0, 2);
  campo('Psicologo(a)', paciente.psicologo, 1, 2);
  y += 12;

  // ── HISTORIAL DE SESIONES ─────────────────────────────────────────────────
  if (schema?.gruposSesiones?.length) {
    seccion('  HISTORIAL DE SESIONES', [14, 165, 233]);

    schema.gruposSesiones.forEach(grupo => {
      const ses = paciente.sesiones?.[grupo.key];
      if (!ses) return;

      checkPage(20);

      // Título del grupo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(14, 100, 150);
      const labelCorto = str(grupo.label).substring(0, 80);
      doc.text(labelCorto, M, y);
      y += 5;

      // Barra de progreso
      const barW = W - M * 2;
      const pct = ses.completadas / ses.total;
      doc.setFillColor(219, 234, 254);
      doc.roundedRect(M, y, barW, 4, 1, 1, 'F');
      if (pct > 0) {
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(M, y, barW * pct, 4, 1, 1, 'F');
      }

      // Texto progreso
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text(`${ses.completadas}/${ses.total} sesiones`, W - M, y + 3, { align: 'right' });
      y += 7;

      // Fechas de cada sesión
      const numOrdinal = (n) => ['1ra','2da','3ra','4ta','5ta','6ta','7ma','8va','9na','10ma'][n] || `${n+1}ra`;
      const colsPerRow = 3;
      const colW = (W - M * 2) / colsPerRow;

      ses.fechas.forEach((fecha, i) => {
        const col = i % colsPerRow;
        const x = M + col * colW;
        if (col === 0 && i > 0) y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 130, 170);
        doc.text(`${numOrdinal(i)}:`, x, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(fecha ? 30 : 180, fecha ? 30 : 180, fecha ? 30 : 180);
        doc.text(fecha || '—', x + 10, y);
      });

      y += 10;

      // Estado
      const estado = ses.completadas === ses.total ? 'COMPLETADO' :
                     ses.completadas === 0 ? 'PENDIENTE' : 'EN PROGRESO';
      const estadoColor = ses.completadas === ses.total ? [22, 163, 74] :
                          ses.completadas === 0 ? [180, 180, 180] : [245, 158, 11];
      doc.setFillColor(...estadoColor);
      doc.roundedRect(M, y, 30, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(estado, M + 15, y + 3.5, { align: 'center' });
      y += 9;
    });

    y += 4;
  }

  // ── DATOS ADICIONALES (meta) ──────────────────────────────────────────────
  const metaCampos = schema?.colsMeta?.filter(c =>
    paciente[c.key] && paciente[c.key] !== '—'
  ) || [];

  if (metaCampos.length) {
    checkPage(15);
    seccion('  DATOS ADICIONALES', [37, 99, 235]);
    const mitad = Math.ceil(metaCampos.length / 2);
    for (let i = 0; i < mitad; i++) {
      campo(metaCampos[i].label, paciente[metaCampos[i].key], 0, 2, true);
      if (metaCampos[i + mitad]) {
        campo(metaCampos[i + mitad].label, paciente[metaCampos[i + mitad].key], 1, 2, true);
      }
      y += 9;
    }
    y += 4;
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(219, 234, 254);
    doc.rect(0, 270, W, 27, 'F');
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 294, W, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Fecha de emision: ' + new Date().toLocaleDateString('es-PE'), M, 277);
    doc.text(`Pagina ${p} de ${pageCount}`, W - M, 277, { align: 'right' });
    doc.text(`Programa: ${str(hoja)}`, M, 282);

    doc.setDrawColor(37, 99, 235);
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

  return doc;
}

export async function descargarPDFSeguimiento(paciente, hoja, schema) {
  const doc = await generarPDFSeguimiento(paciente, hoja, schema);
  const nombre = str(paciente.nombres).replace(/ /g, '_') || 'paciente';
  doc.save(`SEGUIMIENTO_${nombre}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function imprimirPDFSeguimiento(paciente, hoja, schema) {
  const doc = await generarPDFSeguimiento(paciente, hoja, schema);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url);
  if (win) win.print();
}