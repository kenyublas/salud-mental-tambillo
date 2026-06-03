require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const app = express();
app.use(cors({
  origin: ['https://salud-mental-tambillo.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
console.log(`[init] SPREADSHEET_ID cargado: ${SPREADSHEET_ID}`);

let auth;
if (process.env.GOOGLE_CREDENTIALS) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} else {
  auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// Columnas en orden estándar (para escritura POST/PUT)
const COLUMNAS = [
  'fechaAtencion',       // A
  'profesional',         // B
  'responsableAtencion', // C
  'tipoAtencion',        // D
  'apoderado',           // E
  'nombres',             // F
  'dni',                 // G
  'fechaNacimiento',     // H
  'edad',                // I
  'sexo',                // J
  'gestante',            // K
  'fur',                 // L
  'semanaGestacional',   // M
  'fechaProbableParto',  // N
  'hcl',                 // O
  'sector',              // P
  'sectorista',          // Q
  'seguro',              // R
  'celular',             // S
  'motivoConsulta',      // T
  'tamizaje',            // U
  'negativo',            // V
  'positivo',            // W
  'diagnostico',         // X
  'segundoControl',      // Y
  'intervencion',        // Z
  'fechaProxCita',       // AA
  'terminoAtencion',     // AB
  'referencia',          // AC
  'contrarreferencia',   // AD
  'valoracionRiesgo',    // AE
  'sesionMovilizacion',  // AF
  'visitaDomiciliaria',  // AG
  'medicamentos',        // AH
  'teleorientacion',     // AI
  'promsa',              // AJ
  'campana',             // AK
  'observaciones',       // AL
];

// Mapeo de encabezados normalizados del Sheet → campo JS
const HEADER_MAP = {
  'FECHA DE ATENCION':         'fechaAtencion',
  'FECHA ATENCION':            'fechaAtencion',
  'PROFESIONAL':               'profesional',
  'RESPONSABLE DE ATENCION':   'responsableAtencion',
  'RESPONSABLE ATENCION':      'responsableAtencion',
  'RESPONSABLE':               'responsableAtencion',
  'TIPO DE ATENCION':          'tipoAtencion',
  'TIPO ATENCION':             'tipoAtencion',
  'APODERADO':                 'apoderado',
  'NOMBRES':                   'nombres',
  'APELLIDOS Y NOMBRES':       'nombres',
  'NOMBRE':                    'nombres',
  'DNI':                       'dni',
  'FECHA DE NACIMIENTO':       'fechaNacimiento',
  'FECHA NACIMIENTO':          'fechaNacimiento',
  'EDAD':                      'edad',
  'SEXO':                      'sexo',
  'GESTANTE':                  'gestante',
  'FUR':                       'fur',
  'SEMANA GESTACIONAL':        'semanaGestacional',
  'SEMANAS GESTACIONALES':     'semanaGestacional',
  'SEMANAS':                   'semanaGestacional',
  'FECHA PROBABLE DE PARTO':   'fechaProbableParto',
  'FECHA PROBABLE PARTO':      'fechaProbableParto',
  'HCL':                       'hcl',
  'SECTOR':                    'sector',
  'SECTORISTA':                'sectorista',
  'SEGURO':                    'seguro',
  'CELULAR':                   'celular',
  'MOTIVO DE CONSULTA':        'motivoConsulta',
  'MOTIVO CONSULTA':           'motivoConsulta',
  'TAMIZAJE':                  'tamizaje',
  'NEGATIVO':                  'negativo',
  'POSITIVO':                  'positivo',
  'DIAGNOSTICO':               'diagnostico',
  'SEGUNDO CONTROL':           'segundoControl',
  'INTERVENCION':              'intervencion',
  'FECHA PROX CITA':           'fechaProxCita',
  'FECHA PROXIMA CITA':        'fechaProxCita',
  'PROX CITA':                 'fechaProxCita',
  'TERMINO ATENCION':          'terminoAtencion',
  'REFERENCIA':                'referencia',
  'CONTRARREFERENCIA':         'contrarreferencia',
  'VALORACION DE RIESGO':      'valoracionRiesgo',
  'VALORACION RIESGO':         'valoracionRiesgo',
  'SESION DE MOVILIZACION':    'sesionMovilizacion',
  'SESION MOVILIZACION':       'sesionMovilizacion',
  'VISITA DOMICILIARIA':       'visitaDomiciliaria',
  'MEDICAMENTOS':              'medicamentos',
  'TELEORIENTACION':           'teleorientacion',
  'PROMSA':                    'promsa',
  'CAMPANA':                   'campana',
  'OBSERVACIONES':             'observaciones',
};

function normalizeHeader(text) {
  return (text || '')
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function buildColIndex(headersRow) {
  const colIndex = {};
  headersRow.forEach((h, i) => {
    const field = HEADER_MAP[normalizeHeader(h)];
    if (field && !(field in colIndex)) {
      colIndex[field] = i;
    }
  });
  return colIndex;
}

function getNombreHoja(mes) {
  if (mes) return mes;
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
    'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const mesNombre = meses[new Date().getMonth()];
  const anio = new Date().getFullYear();
  if (anio <= 2025) return mesNombre;
  return mesNombre + ' ' + anio;
}

function getMesDesdeFecha(fecha) {
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
    'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  if (!fecha) return getNombreHoja(null);
  const d = new Date(fecha);
  if (isNaN(d)) return getNombreHoja(null);
  const mes = meses[d.getMonth()];
  const anio = d.getFullYear();
  if (anio <= 2025) return mes;
  return mes + ' ' + anio;
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return match[3] + '/' + match[2] + '/' + match[1];
  return fecha;
}

function datosAFila(datos) {
  return COLUMNAS.map(col => {
    if (col === 'negativo') return datos.resultadoTamizaje === 'Negativo' ? 'X' : '-';
    if (col === 'positivo') return datos.resultadoTamizaje === 'Positivo' ? 'X' : '-';
    if (['fechaAtencion','fechaNacimiento','fur','fechaProbableParto','fechaProxCita'].includes(col)) {
      return formatearFecha(datos[col]);
    }
    return datos[col] || '';
  });
}

// ─── ENDPOINTS ───────────────────────────────────────────

// GET /api/debug-fila - diagnóstico de estructura de la hoja
app.get('/api/debug-fila', async (req, res) => {
  try {
    const sheets = await getSheets();
    const hoja = req.query.hoja || 'MAYO 2026';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: hoja + '!A1:AL10',
    });
    const filas = response.data.values || [];

    // Mostrar qué colIndex se construye desde cada fila candidata
    const analisis = [];
    for (let i = 0; i < Math.min(4, filas.length); i++) {
      const ci = buildColIndex(filas[i]);
      analisis.push({
        rowIndex: i,
        rowNum: i + 1,
        camposReconocidos: Object.keys(ci).length,
        colIndex: ci,
        valoresCrudos: filas[i],
      });
    }

    res.json({
      totalFilas: filas.length,
      totalColumnas: COLUMNAS.length,
      fila1: filas[0],
      fila2: filas[1],
      fila3: filas[2],
      fila4: filas[3],
      analisisHeaders: analisis,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/test-conexion - diagnóstico completo
app.get('/api/test-conexion', async (req, res) => {
  const resultado = { pasos: {} };
  try {
    console.log('[test-conexion] Iniciando diagnóstico...');
    console.log(`[test-conexion] SPREADSHEET_ID: ${SPREADSHEET_ID}`);
    resultado.spreadsheetId = SPREADSHEET_ID;

    console.log('[test-conexion] Paso 1: autenticando con Google...');
    const client = await auth.getClient();
    resultado.pasos.autenticacion = 'OK';
    console.log('[test-conexion] Autenticación OK');

    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log('[test-conexion] Paso 2: obteniendo spreadsheet...');
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    resultado.pasos.obtenerSpreadsheet = 'OK';
    resultado.nombreSpreadsheet = info.data.properties.title;
    resultado.hojas = info.data.sheets.map(s => s.properties.title);
    console.log(`[test-conexion] Spreadsheet encontrado: "${resultado.nombreSpreadsheet}"`);
    console.log(`[test-conexion] Hojas: ${resultado.hojas.join(', ')}`);

    res.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('[test-conexion] ERROR:', error.message);
    resultado.pasos.error = error.message;
    resultado.codigoHttp = error?.response?.status;
    resultado.detalleGoogle = error?.response?.data;
    res.status(500).json({ ok: false, ...resultado });
  }
});

// GET /api/registros?mes=ENERO 2026
app.get('/api/registros', async (req, res) => {
  const hoja = getNombreHoja(req.query.mes);
  console.log(`[GET /api/registros] hoja="${hoja}" spreadsheetId="${SPREADSHEET_ID}"`);
  try {
    console.log('[GET /api/registros] Autenticando...');
    const sheets = await getSheets();
    console.log('[GET /api/registros] Autenticación OK. Leyendo rango...');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A1:AL`,
    });
    console.log(`[GET /api/registros] Lectura OK. Filas recibidas: ${response.data.values?.length ?? 0}`);

    const allRows = response.data.values || [];
    if (!allRows.length) return res.json([]);

    // ── 1. Encontrar la fila de encabezados (puede ser row 0, 1, 2…)
    //       Tomamos la primera que reconozca al menos 4 campos del HEADER_MAP
    let headerIdx = 0;
    let colIndex = {};
    for (let i = 0; i < Math.min(5, allRows.length); i++) {
      const ci = buildColIndex(allRows[i]);
      if (Object.keys(ci).length >= 4) {
        headerIdx = i;
        colIndex = ci;
        break;
      }
    }
    console.log(`[GET /api/registros] headerIdx=${headerIdx} campos reconocidos=${Object.keys(colIndex).length}`, colIndex);

    // ── 2. Índices de columnas clave (fallback posicional si header no se reconoció)
    const iNombres   = colIndex.nombres   ?? 5;
    const iNegativo  = colIndex.negativo  ?? 21;
    const iPositivo  = colIndex.positivo  ?? 22;

    // ── 3. Encontrar primer row de datos (después del header, con nombre no vacío)
    let dataStartIdx = headerIdx + 1;
    for (let i = headerIdx + 1; i < allRows.length; i++) {
      if ((allRows[i][iNombres] || '').trim()) {
        dataStartIdx = i;
        break;
      }
    }
    console.log(`[GET /api/registros] dataStartIdx=${dataStartIdx}`);
    const dataRows = allRows.slice(dataStartIdx);

    const registros = dataRows
      .map((fila, i) => ({ fila, rowNum: dataStartIdx + i + 1 }))
      .filter(({ fila }) => (fila[iNombres] || '').trim())
      .map(({ fila, rowNum }) => {
        const obj = { id: rowNum };
        COLUMNAS.forEach((col, posIdx) => {
          // Fallback posicional: si el header no mapeó esta columna, usa su posición en COLUMNAS
          const idx = colIndex[col] !== undefined ? colIndex[col] : posIdx;
          obj[col] = (fila[idx] || '');
        });
        const neg = (fila[iNegativo] || '').toUpperCase();
        const pos = (fila[iPositivo] || '').toUpperCase();
        if (neg === 'X')      obj.resultadoTamizaje = 'Negativo';
        else if (pos === 'X') obj.resultadoTamizaje = 'Positivo';
        else                  obj.resultadoTamizaje = '';
        return obj;
      });

    console.log(`[GET /api/registros] Registros válidos: ${registros.length}`);
    res.json(registros);
  } catch (error) {
    console.error('[GET /api/registros] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registro - crear nuevo
app.post('/api/registro', async (req, res) => {
  const hoja = getMesDesdeFecha(req.body.fechaAtencion);
  console.log(`[POST /api/registro] hoja="${hoja}" spreadsheetId="${SPREADSHEET_ID}"`);
  try {
    console.log('[POST /api/registro] Autenticando...');
    const sheets = await getSheets();
    console.log('[POST /api/registro] Autenticación OK. Buscando fila vacía...');

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A3:A`,
    });
    const filaVacia = (existing.data.values?.length || 0) + 3;
    console.log(`[POST /api/registro] Escribiendo en fila ${filaVacia}...`);

    const fila = datosAFila(req.body);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A${filaVacia}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] },
    });

    console.log(`[POST /api/registro] Escritura OK en fila ${filaVacia}`);
    res.json({ success: true, fila: filaVacia });
  } catch (error) {
    console.error('[POST /api/registro] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/registro/:fila - editar
app.put('/api/registro/:fila', async (req, res) => {
  const hoja = getNombreHoja(req.body.mes);
  const numFila = req.params.fila;
  console.log(`[PUT /api/registro/${numFila}] hoja="${hoja}" spreadsheetId="${SPREADSHEET_ID}"`);
  try {
    console.log(`[PUT /api/registro/${numFila}] Autenticando...`);
    const sheets = await getSheets();
    console.log(`[PUT /api/registro/${numFila}] Autenticación OK. Actualizando fila...`);

    const fila = datosAFila(req.body);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A${numFila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] },
    });

    console.log(`[PUT /api/registro/${numFila}] Actualización OK`);
    res.json({ success: true });
  } catch (error) {
    console.error(`[PUT /api/registro/${numFila}] ERROR:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/registro/:fila - eliminar (limpia la fila)
app.delete('/api/registro/:fila', async (req, res) => {
  const hoja = getNombreHoja(req.query.mes);
  const numFila = req.params.fila;
  console.log(`[DELETE /api/registro/${numFila}] hoja="${hoja}" spreadsheetId="${SPREADSHEET_ID}"`);
  try {
    console.log(`[DELETE /api/registro/${numFila}] Autenticando...`);
    const sheets = await getSheets();
    console.log(`[DELETE /api/registro/${numFila}] Autenticación OK. Limpiando fila...`);

    const filaVacia = new Array(COLUMNAS.length).fill('');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A${numFila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [filaVacia] },
    });

    console.log(`[DELETE /api/registro/${numFila}] Limpieza OK`);
    res.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/registro/${numFila}] ERROR:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/listar-hojas
app.get('/api/listar-hojas', async (req, res) => {
  console.log(`[GET /api/listar-hojas] spreadsheetId="${SPREADSHEET_ID}"`);
  try {
    console.log('[GET /api/listar-hojas] Autenticando...');
    const sheets = await getSheets();
    console.log('[GET /api/listar-hojas] Autenticación OK. Obteniendo hojas...');

    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const hojas = info.data.sheets.map(s => ({
      id: s.properties.sheetId,
      nombre: s.properties.title
    }));

    console.log(`[GET /api/listar-hojas] Hojas encontradas: ${hojas.map(h => h.nombre).join(', ')}`);
    res.json(hojas);
  } catch (error) {
    console.error('[GET /api/listar-hojas] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crear-todas-hojas - crea hojas faltantes de 2026 copiando formato de MAYO 2026
app.get('/api/crear-todas-hojas', async (req, res) => {
  try {
    const sheets = await getSheets();
    const hojas2026 = [
      'JUNIO 2026','JULIO 2026','AGOSTO 2026','SETIEMBRE 2026',
      'OCTUBRE 2026','NOVIEMBRE 2026','DICIEMBRE 2026'
    ];

    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const hojasExistentes = info.data.sheets;
    const nombresExistentes = hojasExistentes.map(s => s.properties.title);

    const plantilla = hojasExistentes.find(s => s.properties.title === 'MAYO 2026');
    if (!plantilla) {
      return res.status(400).json({ error: 'No se encontró la hoja plantilla MAYO 2026' });
    }
    const plantillaId = plantilla.properties.sheetId;

    const resultados = [];

    for (const hoja of hojas2026) {
      if (nombresExistentes.includes(hoja)) {
        resultados.push({ hoja, estado: 'ya existe' });
        continue;
      }

      const copia = await sheets.spreadsheets.sheets.copyTo({
        spreadsheetId: SPREADSHEET_ID,
        sheetId: plantillaId,
        requestBody: { destinationSpreadsheetId: SPREADSHEET_ID }
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties: {
                sheetId: copia.data.sheetId,
                title: hoja
              },
              fields: 'title'
            }
          }]
        }
      });

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${hoja}!A3:AL`
      });

      resultados.push({ hoja, estado: 'creada con formato' });
    }

    res.json({ success: true, resultados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/buscar?q=TEXTO&tipo=dni|nombre|todos
// Busca en todas las hojas de 2025 y 2026 en paralelo
app.get('/api/buscar', async (req, res) => {
  const q     = (req.query.q    || '').trim();
  const tipo  = (req.query.tipo || 'todos');
  const qLower = q.toLowerCase();

  console.log(`[GET /api/buscar] q="${q}" tipo="${tipo}"`);
  try {
    const sheets = await getSheets();

    // Solo buscar en hojas que realmente existen en el spreadsheet
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existentes = new Set(info.data.sheets.map(s => s.properties.title));

    const MESES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
      'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

    const hojasBuscar = [
      ...MESES_NOMBRES,
      ...MESES_NOMBRES.map(m => `${m} 2026`),
    ].filter(h => existentes.has(h));

    console.log(`[GET /api/buscar] Buscando en ${hojasBuscar.length} hojas en paralelo`);

    // Leer todas las hojas en paralelo
    const porHoja = await Promise.all(
      hojasBuscar.map(async (hoja) => {
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${hoja}!A1:AL`,
          });

          const allRows = response.data.values || [];
          if (!allRows.length) return [];

          // Detectar fila de encabezados (misma lógica que GET /api/registros)
          let headerIdx = 0;
          let colIndex = {};
          for (let i = 0; i < Math.min(5, allRows.length); i++) {
            const ci = buildColIndex(allRows[i]);
            if (Object.keys(ci).length >= 4) {
              headerIdx = i;
              colIndex = ci;
              break;
            }
          }

          const iNombres  = colIndex.nombres  ?? 5;
          const iDni      = colIndex.dni      ?? 6;
          const iNegativo = colIndex.negativo ?? 21;
          const iPositivo = colIndex.positivo ?? 22;

          let dataStartIdx = headerIdx + 1;
          for (let i = headerIdx + 1; i < allRows.length; i++) {
            if ((allRows[i][iNombres] || '').trim()) {
              dataStartIdx = i;
              break;
            }
          }

          return allRows.slice(dataStartIdx)
            .map((fila, i) => ({ fila, rowNum: dataStartIdx + i + 1 }))
            .filter(({ fila }) => (fila[iNombres] || '').trim())
            .filter(({ fila }) => {
              if (!q) return true; // sin query → incluir todos
              const nombre = (fila[iNombres] || '').toLowerCase();
              const dni    = (fila[iDni]     || '').trim();
              if (tipo === 'dni')    return dni === q;
              if (tipo === 'nombre') return nombre.includes(qLower);
              // tipo === 'todos'
              return dni === q || nombre.includes(qLower);
            })
            .map(({ fila, rowNum }) => {
              const obj = { id: rowNum, mes: hoja };
              COLUMNAS.forEach((col, posIdx) => {
                const idx = colIndex[col] !== undefined ? colIndex[col] : posIdx;
                obj[col] = (fila[idx] || '');
              });
              const neg = (fila[iNegativo] || '').toUpperCase();
              const pos = (fila[iPositivo] || '').toUpperCase();
              obj.resultadoTamizaje = neg === 'X' ? 'Negativo' : pos === 'X' ? 'Positivo' : '';
              return obj;
            });
        } catch (err) {
          // Si la hoja no existe o hay error puntual, no detiene el resto
          console.warn(`[buscar] Hoja "${hoja}" omitida: ${err.message}`);
          return [];
        }
      })
    );

    const todos = porHoja.flat();

    // Ordenar por fecha de atención descendente (formato DD/MM/YYYY)
    const parseFecha = (f = '') => {
      const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime() : 0;
    };
    todos.sort((a, b) => parseFecha(b.fechaAtencion) - parseFecha(a.fechaAtencion));

    console.log(`[GET /api/buscar] Total resultados: ${todos.length}`);
    res.json(todos);
  } catch (error) {
    console.error('[GET /api/buscar] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/ping', (req, res) => res.json({ ok: true, mensaje: 'Backend Salud Mental Tambillo activo' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Backend corriendo en http://localhost:${PORT}`));
