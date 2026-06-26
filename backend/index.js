require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: ['https://salud-mental-tambillo.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

const SPREADSHEET_ID   = process.env.SPREADSHEET_ID;
const SPREADSHEET_ID_2 = process.env.SPREADSHEET_ID_2;
const SPREADSHEET_ID_3 = process.env.SPREADSHEET_ID_3;
const JWT_SECRET       = process.env.JWT_SECRET       || 'cambiar_en_produccion';
const ADMIN_USER       = process.env.ADMIN_USER       || 'admin';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   || 'admin123';

console.log(`[init] SPREADSHEET_ID   cargado: ${SPREADSHEET_ID}`);
console.log(`[init] SPREADSHEET_ID_2 cargado: ${SPREADSHEET_ID_2}`);
console.log(`[init] SPREADSHEET_ID_3 cargado: ${SPREADSHEET_ID_3}`);
console.log(`[init] ADMIN_USER: ${ADMIN_USER}`);
console.log(`[init] JWT_SECRET configurado: ${JWT_SECRET !== 'cambiar_en_produccion' ? 'SÍ' : 'NO (usar valor por defecto es inseguro)'}`);

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

// ─── MIDDLEWARE JWT ────────────────────────────────────────────────────────
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token requerido. Por favor inicia sesión.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado. Por favor inicia sesión nuevamente.' });
  }
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

// ─── RUTAS PÚBLICAS (sin token) ────────────────────────────────────────────

// ─── ENDPOINT DNI AUTOCOMPLETE ─────────────────────────────────────────────
// GET /api/dni/:numero
// 1. Busca primero en Google Sheets (gratis, sin límite)
// 2. Si no encuentra, consulta apis.net.pe (500 consultas/mes gratis)
app.get('/api/dni/:numero', async (req, res) => {
  const dni = req.params.numero.trim();
  console.log(`[GET /api/dni/${dni}] buscando...`);

  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ error: 'DNI debe tener exactamente 8 dígitos.' });
  }

  try {
    // ── PASO 1: Buscar en Google Sheets ──────────────────────────────────
    const sheets = await getSheets();
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existentes = new Set(info.data.sheets.map(s => s.properties.title));

    const MESES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
      'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const hojasBuscar = [
      ...MESES_NOMBRES,
      ...MESES_NOMBRES.map(m => `${m} 2026`),
    ].filter(h => existentes.has(h));

    for (const hoja of hojasBuscar) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${hoja}!A1:AL`,
        });
        const allRows = response.data.values || [];
        if (!allRows.length) continue;

        let headerIdx = 0, colIndex = {};
        for (let i = 0; i < Math.min(5, allRows.length); i++) {
          const ci = buildColIndex(allRows[i]);
          if (Object.keys(ci).length >= 4) { headerIdx = i; colIndex = ci; break; }
        }

        const iNombres = colIndex.nombres ?? 5;
        const iDni     = colIndex.dni     ?? 6;

        let dataStartIdx = headerIdx + 1;
        for (let i = headerIdx + 1; i < allRows.length; i++) {
          if ((allRows[i][iNombres] || '').trim()) { dataStartIdx = i; break; }
        }

        const encontrado = allRows.slice(dataStartIdx).find(fila =>
          (fila[iDni] || '').trim() === dni
        );

        if (encontrado) {
          console.log(`[GET /api/dni/${dni}] ✅ encontrado en Sheet "${hoja}"`);
          const obj = {};
          COLUMNAS.forEach((col, posIdx) => {
            const idx = colIndex[col] !== undefined ? colIndex[col] : posIdx;
            obj[col] = (encontrado[idx] || '');
          });
          // Convertir fechas DD/MM/YYYY → YYYY-MM-DD para input date
          const convertirFecha = (f) => {
            if (!f) return '';
            const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            return m ? `${m[3]}-${m[2]}-${m[1]}` : f;
          };
          return res.json({
            fuente:          'sheets',
            nombres:         obj.nombres                        || '',
            fechaNacimiento: convertirFecha(obj.fechaNacimiento) || '',
            edad:            obj.edad                           || '',
            sexo:            obj.sexo                           || '',
            sector:          obj.sector                         || '',
            sectorista:      obj.sectorista                     || '',
            celular:         obj.celular                        || '',
            seguro:          obj.seguro                         || '',
            hcl:             obj.hcl                            || '',
          });
        }
      } catch (e) {
        continue;
      }
    }

    // ── PASO 2: No está en Sheets → consultar apis.net.pe ────────────────
    console.log(`[GET /api/dni/${dni}] no en Sheets, consultando apis.net.pe...`);
    const APIPERU_TOKEN = process.env.APIPERU_TOKEN;

    if (!APIPERU_TOKEN) {
      return res.status(404).json({ error: 'DNI no encontrado en registros locales.' });
    }

    const apiRes = await fetch(`https://api.apis.net.pe/v2/dni?numero=${dni}`, {
      headers: {
        'Authorization': `Bearer ${APIPERU_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiRes.ok) {
      console.log(`[GET /api/dni/${dni}] apis.net.pe respondió ${apiRes.status}`);
      return res.status(404).json({ error: 'DNI no encontrado.' });
    }

    const apiData = await apiRes.json();
    console.log(`[GET /api/dni/${dni}] ✅ encontrado en apis.net.pe`);

    // decolecta.com devuelve: full_name, first_name, first_last_name, second_last_name
const nombreCompleto = apiData.nombre_completo ||
  `${apiData.apellido_paterno || ''} ${apiData.apellido_materno || ''}, ${apiData.nombres || ''}`.trim();

    // decolecta no devuelve fechaNacimiento ni sexo
    const edad    = '';
    const sexo    = '';
    const fechaNac = '';

    return res.json({
      fuente:          'apiperu',
      nombres:         nombreCompleto,
      fechaNacimiento: fechaNac,
      edad,
      sexo,
      sector:          '',
      sectorista:      '',
      celular:         '',
      seguro:          '',
      hcl:             '',
    });

  } catch (error) {
    console.error(`[GET /api/dni/${dni}] ERROR:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/ping', (req, res) =>
  res.json({ ok: true, mensaje: 'Backend Salud Mental Tambillo activo' })
);

// POST /api/login
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  console.log(`[POST /api/login] intento de login: usuario="${usuario}"`);

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  if (usuario !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    console.log(`[POST /api/login] credenciales incorrectas para "${usuario}"`);
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  const token = jwt.sign(
    { usuario, rol: 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  console.log(`[POST /api/login] login exitoso para "${usuario}"`);
  res.json({
    ok: true,
    token,
    usuario,
    expira: '8h',
  });
});

// ─── RUTAS PROTEGIDAS (requieren token) ───────────────────────────────────
app.use('/api', verificarToken);

// GET /api/debug-fila
app.get('/api/debug-fila', async (req, res) => {
  try {
    const sheets = await getSheets();
    const hoja = req.query.hoja || 'MAYO 2026';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: hoja + '!A1:AL10',
    });
    const filas = response.data.values || [];
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
      fila1: filas[0], fila2: filas[1], fila3: filas[2], fila4: filas[3],
      analisisHeaders: analisis,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/test-conexion
app.get('/api/test-conexion', async (req, res) => {
  const resultado = { pasos: {} };
  try {
    const client = await auth.getClient();
    resultado.pasos.autenticacion = 'OK';
    const sheets = google.sheets({ version: 'v4', auth: client });
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    resultado.pasos.obtenerSpreadsheet = 'OK';
    resultado.nombreSpreadsheet = info.data.properties.title;
    resultado.hojas = info.data.sheets.map(s => s.properties.title);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    resultado.pasos.error = error.message;
    res.status(500).json({ ok: false, ...resultado });
  }
});

// GET /api/registros?mes=ENERO 2026
app.get('/api/registros', async (req, res) => {
  const hoja = getNombreHoja(req.query.mes);
  console.log(`[GET /api/registros] hoja="${hoja}"`);
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A1:AL`,
    });
    const allRows = response.data.values || [];
    if (!allRows.length) return res.json([]);

    let headerIdx = 0, colIndex = {};
    for (let i = 0; i < Math.min(5, allRows.length); i++) {
      const ci = buildColIndex(allRows[i]);
      if (Object.keys(ci).length >= 4) { headerIdx = i; colIndex = ci; break; }
    }

    const iNombres  = colIndex.nombres  ?? 5;
    const iNegativo = colIndex.negativo ?? 21;
    const iPositivo = colIndex.positivo ?? 22;

    let dataStartIdx = headerIdx + 1;
    for (let i = headerIdx + 1; i < allRows.length; i++) {
      if ((allRows[i][iNombres] || '').trim()) { dataStartIdx = i; break; }
    }

    const registros = allRows.slice(dataStartIdx)
      .map((fila, i) => ({ fila, rowNum: dataStartIdx + i + 1 }))
      .filter(({ fila }) => (fila[iNombres] || '').trim())
      .map(({ fila, rowNum }) => {
        const obj = { id: rowNum };
        COLUMNAS.forEach((col, posIdx) => {
          const idx = colIndex[col] !== undefined ? colIndex[col] : posIdx;
          obj[col] = (fila[idx] || '');
        });
        const neg = (fila[iNegativo] || '').toUpperCase();
        const pos = (fila[iPositivo] || '').toUpperCase();
        obj.resultadoTamizaje = neg === 'X' ? 'Negativo' : pos === 'X' ? 'Positivo' : '';
        return obj;
      });

    res.json(registros);
  } catch (error) {
    console.error('[GET /api/registros] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registro
app.post('/api/registro', async (req, res) => {
  const hoja = getMesDesdeFecha(req.body.fechaAtencion);
  try {
    const sheets = await getSheets();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A3:A`,
    });
    const filaVacia = (existing.data.values?.length || 0) + 3;
    const fila = datosAFila(req.body);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A${filaVacia}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] },
    });
    res.json({ success: true, fila: filaVacia });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/registro/:fila
app.put('/api/registro/:fila', async (req, res) => {
  const hoja = getNombreHoja(req.body.mes);
  const numFila = req.params.fila;
  try {
    const sheets = await getSheets();
    const fila = datosAFila(req.body);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A${numFila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/registro/:fila
app.delete('/api/registro/:fila', async (req, res) => {
  const hoja = getNombreHoja(req.query.mes);
  const numFila = req.params.fila;
  try {
    const sheets = await getSheets();
    const filaVacia = new Array(COLUMNAS.length).fill('');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A${numFila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [filaVacia] },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/listar-hojas
app.get('/api/listar-hojas', async (req, res) => {
  try {
    const sheets = await getSheets();
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const hojas = info.data.sheets.map(s => ({
      id: s.properties.sheetId,
      nombre: s.properties.title
    }));
    res.json(hojas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crear-todas-hojas
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
    if (!plantilla) return res.status(400).json({ error: 'No se encontró la hoja plantilla MAYO 2026' });

    const plantillaId = plantilla.properties.sheetId;
    const resultados = [];
    for (const hoja of hojas2026) {
      if (nombresExistentes.includes(hoja)) { resultados.push({ hoja, estado: 'ya existe' }); continue; }
      const copia = await sheets.spreadsheets.sheets.copyTo({
        spreadsheetId: SPREADSHEET_ID,
        sheetId: plantillaId,
        requestBody: { destinationSpreadsheetId: SPREADSHEET_ID }
      });
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ updateSheetProperties: { properties: { sheetId: copia.data.sheetId, title: hoja }, fields: 'title' } }] }
      });
      await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${hoja}!A3:AL` });
      resultados.push({ hoja, estado: 'creada con formato' });
    }
    res.json({ success: true, resultados });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/buscar
app.get('/api/buscar', async (req, res) => {
  const q      = (req.query.q    || '').trim();
  const tipo   = (req.query.tipo || 'todos');
  const qLower = q.toLowerCase();
  try {
    const sheets = await getSheets();
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existentes = new Set(info.data.sheets.map(s => s.properties.title));
    const MESES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
      'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const hojasBuscar = [
      ...MESES_NOMBRES,
      ...MESES_NOMBRES.map(m => `${m} 2026`),
    ].filter(h => existentes.has(h));

    const porHoja = await Promise.all(
      hojasBuscar.map(async (hoja) => {
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID, range: `${hoja}!A1:AL`,
          });
          const allRows = response.data.values || [];
          if (!allRows.length) return [];

          let headerIdx = 0, colIndex = {};
          for (let i = 0; i < Math.min(5, allRows.length); i++) {
            const ci = buildColIndex(allRows[i]);
            if (Object.keys(ci).length >= 4) { headerIdx = i; colIndex = ci; break; }
          }
          const iNombres  = colIndex.nombres  ?? 5;
          const iDni      = colIndex.dni      ?? 6;
          const iNegativo = colIndex.negativo ?? 21;
          const iPositivo = colIndex.positivo ?? 22;

          let dataStartIdx = headerIdx + 1;
          for (let i = headerIdx + 1; i < allRows.length; i++) {
            if ((allRows[i][iNombres] || '').trim()) { dataStartIdx = i; break; }
          }

          return allRows.slice(dataStartIdx)
            .map((fila, i) => ({ fila, rowNum: dataStartIdx + i + 1 }))
            .filter(({ fila }) => (fila[iNombres] || '').trim())
            .filter(({ fila }) => {
              if (!q) return true;
              const nombre = (fila[iNombres] || '').toLowerCase();
              const dni    = (fila[iDni]     || '').trim();
              if (tipo === 'dni')    return dni === q;
              if (tipo === 'nombre') return nombre.includes(qLower);
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
          console.warn(`[buscar] Hoja "${hoja}" omitida: ${err.message}`);
          return [];
        }
      })
    );

    const todos = porHoja.flat();
    const parseFecha = (f = '') => {
      const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime() : 0;
    };
    todos.sort((a, b) => parseFecha(b.fechaAtencion) - parseFecha(a.fechaAtencion));
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ─── SCHEMA SEGUIMIENTO ────────────────────────────────────────────────────
// ─── SCHEMA DE HOJAS DE SEGUIMIENTO ──────────────────────────────────────
// Define la estructura de columnas de cada hoja
// col_inicio: índice base 0 de la primera columna del grupo
// sesiones: número de subcolumnas (sesiones) que tiene ese grupo
// tipo: 'fijo' = dato del paciente, 'sesiones' = fechas de atención, 'meta' = datos finales

const SCHEMA_SEGUIMIENTO = {
  'TTO TXS DEPRESIVO': {
    titulo: 'SEGUIMIENTO DE TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESIÓN. (5005190)',
    colsFijas: [
      { key: 'producto',       col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',      col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',    col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',         col: 3,  label: 'N°' },
      { key: 'psicologo',      col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion',  col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',        col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',           col: 7,  label: 'EDAD' },
      { key: 'sexo',           col: 8,  label: 'SEXO' },
      { key: 'fechaNac',       col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',            col: 10, label: 'DNI' },
      { key: 'hcl',            col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',         col: 12, label: 'SECTOR' },
      { key: 'direccion',      col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',    col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',      col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',        col: 16, label: 'CELULAR' },
      { key: 'sectorista',     col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',       col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',    col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consultaMedica',        col: 20, sesiones: 3, label: 'CONSULTA MÉDICA (99215 - 30 A 20 MIN)' },
      { key: 'psicoeducacion',        col: 23, sesiones: 1, label: 'PSICOEDUCACIÓN AL USUARIO (99207.04 - 45 MIN)' },
      { key: 'intervencionIndividual',col: 24, sesiones: 6, label: 'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 30, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 31, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 32, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 33, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO VIF. Y SEXUAL > 18 AÑOS': {
    titulo: 'SEGUIMIENTO DE TRATAMIENTO EN VIOLENCIA FAMILIAR (5005189)',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'apoderado',     col: 14, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 15, label: 'CELULAR' },
      { key: 'sectorista',    col: 16, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 17, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 18, label: 'DIAGNÓSTICO (CIE-10)' },
      { key: 'tipoViolencia', col: 19, label: 'TIPO DE VIOLENCIA' },
    ],
    gruposSesiones: [
      { key: 'fichaRiesgo',            col: 20, sesiones: 3, label: 'APLICACIÓN FICHA VALORACIÓN RIESGOS (99207.06)' },
      { key: 'consultaSaludMental',    col: 23, sesiones: 2, label: 'CONSULTA SALUD MENTAL (99207 - 45 MIN)' },
      { key: 'psicoterapiaIndividual', col: 25, sesiones: 6, label: 'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)' },
      { key: 'intervencionFamiliar',   col: 31, sesiones: 1, label: 'INTERVENCIÓN FAMILIAR (C2111.01)' },
      { key: 'visitaDomiciliaria',     col: 32, sesiones: 1, label: 'VISITA DOMICILIARIA (C0011)' },
      { key: 'movilizacionRedes',      col: 33, sesiones: 1, label: 'MOVILIZACIÓN REDES DE APOYO (C1043)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 34, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 35, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 36, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 37, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO VIOL. INFANTIL  0-17 AÑOS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO NIÑOS/AS AFECTADOS POR MALTRATO INFANTIL',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'fichaRiesgo',            col: 20, sesiones: 3, label: 'APLICACIÓN FICHA VALORACIÓN RIESGOS (99207.06)' },
      { key: 'consultaSaludMental',    col: 23, sesiones: 2, label: 'CONSULTA SALUD MENTAL (99207 - 45 MIN)' },
      { key: 'intervencionIndividual', col: 25, sesiones: 6, label: 'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)' },
      { key: 'intervencionFamiliar',   col: 31, sesiones: 3, label: 'INTERVENCIÓN FAMILIAR (C2111.01)' },
      { key: 'visitaDomiciliaria',     col: 34, sesiones: 1, label: 'VISITA DOMICILIARIA (C0011)' },
      { key: 'movilizacionRedes',      col: 35, sesiones: 1, label: 'MOVILIZACIÓN REDES DE APOYO (C1043)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 36, label: 'CONDICIÓN' },
      { key: 'fur',         col: 37, label: 'FUR' },
      { key: 'fpp',         col: 38, label: 'FPP' },
      { key: 'proyeccion',  col: 39, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 40, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 41, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO V. SEXUAL DE  0-17 AÑOS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO NIÑOS/AS AFECTADOS POR VIOLENCIA SEXUAL',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'fichaRiesgo',            col: 20, sesiones: 3, label: 'APLICACIÓN FICHA VALORACIÓN RIESGOS (99207.06)' },
      { key: 'consultaSaludMental',    col: 23, sesiones: 2, label: 'CONSULTA SALUD MENTAL (99207 - 45 MIN)' },
      { key: 'intervencionIndividual', col: 25, sesiones: 6, label: 'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)' },
      { key: 'intervencionFamiliar',   col: 31, sesiones: 3, label: 'INTERVENCIÓN FAMILIAR (C2111.01)' },
      { key: 'visitaDomiciliaria',     col: 34, sesiones: 1, label: 'VISITA DOMICILIARIA (C0011)' },
      { key: 'movilizacionRedes',      col: 35, sesiones: 1, label: 'MOVILIZACIÓN REDES DE APOYO (C1043)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 36, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 37, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 38, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 39, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO AUTISMO': {
    titulo: 'SEGUIMIENTO TRATAMIENTO AMBULATORIO PERSONAS CON AUTISMO',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consultaMedica',        col: 20, sesiones: 2, label: 'CONSULTA MÉDICA ESPECIALIZADA (99215 - 45 MIN)' },
      { key: 'psicoterapia',          col: 22, sesiones: 6, label: 'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)' },
      { key: 'intervencionGrupal',    col: 28, sesiones: 6, label: 'INTERVENCIÓN GRUPAL SALUD MENTAL (99207.02)' },
      { key: 'visitaDomiciliaria',    col: 34, sesiones: 1, label: 'VISITA DOMICILIARIA (C0011)' },
      { key: 'movilizacionRedes',     col: 35, sesiones: 1, label: 'MOVILIZACIÓN REDES DE APOYO (C1043)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 36, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 37, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 38, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 39, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO TX MENTAL Y COMP. 0-17 AÑOS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO TRASTORNO MENTAL Y COMPORTAMIENTO 0-17 AÑOS',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consultaSaludMental',    col: 20, sesiones: 2, label: 'CONSULTA SALUD MENTAL (99207 - 45 MIN)' },
      { key: 'intervencionIndividual', col: 22, sesiones: 6, label: 'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)' },
      { key: 'intervencionFamiliar',   col: 28, sesiones: 3, label: 'INTERVENCIÓN FAMILIAR (C2111.01)' },
      { key: 'visitaDomiciliaria',     col: 31, sesiones: 1, label: 'VISITA DOMICILIARIA (C0011)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 32, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 33, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 34, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 35, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO TXT CX SUICIDA': {
    titulo: 'SEGUIMIENTO TRATAMIENTO CONDUCTA SUICIDA',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consultaMedica',         col: 20, sesiones: 2, label: 'CONSULTA MÉDICA (99215 - 30 MIN)' },
      { key: 'psicoeducacion',         col: 22, sesiones: 1, label: 'PSICOEDUCACIÓN (99207.04 - 45 MIN)' },
      { key: 'psicoterapiaIndividual', col: 23, sesiones: 6, label: 'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)' },
      { key: 'intervencionFamiliar',   col: 29, sesiones: 2, label: 'INTERVENCIÓN FAMILIAR (C2111.01)' },
      { key: 'visitaDomiciliaria',     col: 31, sesiones: 1, label: 'VISITA DOMICILIARIA (C0011)' },
      { key: 'movilizacionRedes',      col: 32, sesiones: 1, label: 'MOVILIZACIÓN REDES DE APOYO (C1043)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 33, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 34, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 35, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 36, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO TXT ANSIEDAD': {
    titulo: 'SEGUIMIENTO TRATAMIENTO TRASTORNO DE ANSIEDAD',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consultaMedica',         col: 20, sesiones: 2, label: 'CONSULTA MÉDICA (99215 - 45 MIN)' },
      { key: 'psicoeducacion',         col: 22, sesiones: 1, label: 'PSICOEDUCACIÓN (99207.04 - 45 MIN)' },
      { key: 'psicoterapiaIndividual', col: 23, sesiones: 6, label: 'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 29, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 30, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 31, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 32, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO INTERV CONSUMO OH': {
    titulo: 'SEGUIMIENTO INTERVENCIÓN CONSUMO DE ALCOHOL',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consejeria',         col: 20, sesiones: 1, label: 'CONSEJERÍA ESTILOS VIDA SALUDABLE (99401.13)' },
      { key: 'intervencionBreve',  col: 21, sesiones: 6, label: 'INTERVENCIÓN BREVE (99207.01 - 30 MIN)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 27, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 28, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 29, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 30, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO DEPENDENCIA OH': {
    titulo: 'SEGUIMIENTO TRATAMIENTO DEPENDENCIA AL ALCOHOL',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consultasMedicas',          col: 19, sesiones: 4, label: 'CONSULTAS MÉDICAS (99215 - 30 MIN)' },
      { key: 'entrevistaMotivacional',    col: 23, sesiones: 2, label: 'ENTREVISTAS MOTIVACIONALES (96150 - 30 MIN)' },
      { key: 'psicoterapiaIndividual',    col: 25, sesiones: 4, label: 'PSICOTERAPIAS INDIVIDUALES (90806 - 60 MIN)' },
      { key: 'intervencionFamiliar',      col: 29, sesiones: 2, label: 'INTERVENCIONES FAMILIARES (96100.01 - 60 MIN)' },
      { key: 'visitasFamiliares',         col: 31, sesiones: 2, label: 'VISITAS FAMILIARES (C0011 - 45 MIN)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 33, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 34, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 35, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 36, label: 'OBSERVACIÓN' },
    ],
  },

  'TTO ESPECT.ESQUIZOFRENIA EE.SS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO ESPECTRO DE ESQUIZOFRENIA',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'institucion',   col: 14, label: 'INSTITUCIÓN EDUCATIVA' },
      { key: 'apoderado',     col: 15, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 16, label: 'CELULAR' },
      { key: 'sectorista',    col: 17, label: 'SECTORISTA' },
      { key: 'tamizaje',      col: 18, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 19, label: 'DIAGNÓSTICO (CIE-10)' },
    ],
    gruposSesiones: [
      { key: 'consultaMedica',        col: 20, sesiones: 4, label: 'CONSULTA MÉDICA AMBULATORIA (99215 - 45 MIN)' },
      { key: 'intervencionIndividual',col: 24, sesiones: 6, label: 'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)' },
      { key: 'psicoeducacion',        col: 30, sesiones: 4, label: 'PSICOEDUCACIÓN (99207.04 - 30 MIN)' },
      { key: 'visitaDomiciliaria',    col: 34, sesiones: 1, label: 'VISITA DOMICILIARIA (C0011)' },
      { key: 'movilizacionRedes',     col: 35, sesiones: 1, label: 'MOVILIZACIÓN REDES DE APOYO (C1043)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 36, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 37, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 38, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 39, label: 'OBSERVACIÓN' },
    ],
  },

  'VIPOL 1 FORTALECIMIENTO': {
    titulo: 'SEGUIMIENTO VIPOL 1 - FORTALECIMIENTO DE REDES DE APOYO',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'apoderado',     col: 14, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 15, label: 'CELULAR' },
      { key: 'tamizaje',      col: 16, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 17, label: 'DIAGNÓSTICO (Z654)' },
    ],
    gruposSesiones: [
      { key: 'fortalecimientoRedes', col: 18, sesiones: 6, label: 'FORTALECIMIENTO REDES DE APOYO (C0071 + Z654)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 24, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 25, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 26, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 27, label: 'OBSERVACIÓN' },
    ],
  },

  'VIPOL 2 ACOMPAÑAMIENTO': {
    titulo: 'SEGUIMIENTO VIPOL 2 - ACOMPAÑAMIENTO PSICOSOCIAL',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'apoderado',     col: 14, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 15, label: 'CELULAR' },
      { key: 'tamizaje',      col: 16, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 17, label: 'DIAGNÓSTICO (Z654)' },
    ],
    gruposSesiones: [
      { key: 'acompañamiento', col: 18, sesiones: 6, label: 'ACOMPAÑAMIENTO PSICOSOCIAL (99207.07 + Z654)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 24, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 25, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 26, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 27, label: 'OBSERVACIÓN' },
    ],
  },

  'VIPOL 3 RECONSTRUCCION': {
    titulo: 'SEGUIMIENTO VIPOL 3 - RECONSTRUCCIÓN DE IDENTIDAD COLECTIVA',
    colsFijas: [
      { key: 'producto',      col: 0,  label: 'PRODUCTO' },
      { key: 'actividad',     col: 1,  label: 'ACTIVIDAD OPERATIVA' },
      { key: 'subproducto',   col: 2,  label: 'SUBPRODUCTO' },
      { key: 'numero',        col: 3,  label: 'N°' },
      { key: 'psicologo',     col: 4,  label: 'NOMBRE DEL PSICÓLOGO(A)' },
      { key: 'fechaAtencion', col: 5,  label: 'FECHA DE ATENCIÓN' },
      { key: 'nombres',       col: 6,  label: 'APELLIDOS Y NOMBRES' },
      { key: 'edad',          col: 7,  label: 'EDAD' },
      { key: 'sexo',          col: 8,  label: 'SEXO' },
      { key: 'fechaNac',      col: 9,  label: 'FECHA DE NACIMIENTO' },
      { key: 'dni',           col: 10, label: 'DNI' },
      { key: 'hcl',           col: 11, label: 'HISTORIA CLÍNICA' },
      { key: 'sector',        col: 12, label: 'SECTOR' },
      { key: 'direccion',     col: 13, label: 'DIRECCIÓN' },
      { key: 'apoderado',     col: 14, label: 'APODERADO O FAMILIAR' },
      { key: 'celular',       col: 15, label: 'CELULAR' },
      { key: 'tamizaje',      col: 16, label: 'TAMIZAJE' },
      { key: 'diagnostico',   col: 17, label: 'DIAGNÓSTICO (Z654)' },
    ],
    gruposSesiones: [
      { key: 'reconstruccion', col: 18, sesiones: 6, label: 'RECONSTRUCCIÓN IDENTIDAD COLECTIVA (C0006 + Z654)' },
    ],
    colsMeta: [
      { key: 'condicion',   col: 24, label: 'CONDICIÓN' },
      { key: 'proyeccion',  col: 25, label: 'PROYECCIÓN MES A DAR TA' },
      { key: 'referido',    col: 26, label: 'REFERIDO LUGAR Y FECHA' },
      { key: 'observacion', col: 27, label: 'OBSERVACIÓN' },
    ],
  },
};



// ─── HELPER: leer hoja de seguimiento con schema ──────────────────────────
async function leerHojaSeguimiento(sheets, hoja) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID_3,
    range: `'${hoja}'!A1:ZZ`,
  });
  const allRows = response.data.values || [];
  return allRows;
}

function parsearPacientes(allRows, schema) {
  // Fila 1=titulo, 2=subtitulo, 3=encabezados, 4=subencabezados, 5+=datos
  const DATA_START = 4; // índice base 0 = fila 5 en Excel
  if (allRows.length <= DATA_START) return [];

  const colDni    = schema?.colsFijas?.find(c => c.key === 'dni')?.col ?? 10;
  const colNombre = schema?.colsFijas?.find(c => c.key === 'nombres')?.col ?? 6;

  return allRows.slice(DATA_START)
    .map((fila, i) => ({ fila, rowNum: DATA_START + i + 1 }))
    .filter(({ fila }) => (fila[colNombre] || '').trim() || (fila[colDni] || '').trim());
}

function filaAPaciente(fila, rowNum, schema, hoja) {
  if (!schema) return { id: rowNum, hoja, raw: fila };

  const paciente = { id: rowNum, hoja };

  // Campos fijos
  schema.colsFijas.forEach(c => {
    paciente[c.key] = (fila[c.col] || '').trim();
  });

  // Grupos de sesiones
  paciente.sesiones = {};
  schema.gruposSesiones.forEach(g => {
    const fechas = [];
    for (let s = 0; s < g.sesiones; s++) {
      const val = (fila[g.col + s] || '').trim();
      fechas.push(val);
    }
    paciente.sesiones[g.key] = {
      label: g.label,
      col: g.col,
      total: g.sesiones,
      fechas,
      completadas: fechas.filter(f => f).length,
      siguiente: fechas.findIndex(f => !f), // -1 si todas completas
    };
  });

  // Columnas meta
  schema.colsMeta.forEach(c => {
    paciente[c.key] = (fila[c.col] || '').trim();
  });

  return paciente;
}

// GET /api/seguimiento/hojas — lista todas las hojas
app.get('/api/seguimiento/hojas', async (req, res) => {
  try {
    const sheets = await getSheets();
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID_3 });
    const hojas = info.data.sheets.map(s => ({
      id: s.properties.sheetId,
      nombre: s.properties.title,
    }));
    res.json(hojas);
  } catch (error) {
    console.error('[GET /api/seguimiento/hojas] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/seguimiento/schema/:hoja — devuelve el schema de una hoja
app.get('/api/seguimiento/schema/:hoja', (req, res) => {
  const hoja = decodeURIComponent(req.params.hoja);
  const schema = SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) {
    return res.json({ hoja, tieneSchema: false, mensaje: 'Hoja sin schema definido (solo lectura)' });
  }
  res.json({ hoja, tieneSchema: true, ...schema });
});

// GET /api/seguimiento/buscar?q=TEXTO&hoja=NOMBRE — busca paciente por DNI o nombre
app.get('/api/seguimiento/buscar', async (req, res) => {
  const q    = (req.query.q || '').trim();
  const hoja = req.query.hoja ? decodeURIComponent(req.query.hoja) : null;
  if (!q) return res.status(400).json({ error: 'Parámetro q requerido.' });

  try {
    const sheets = await getSheets();
    const info   = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID_3 });
    const hojas  = hoja
      ? [hoja]
      : info.data.sheets.map(s => s.properties.title).filter(h => !['TA - 2026', 'Hoja1'].includes(h));

    const resultados = [];
    for (const h of hojas) {
      try {
        const schema  = SCHEMA_SEGUIMIENTO[h];
        const allRows = await leerHojaSeguimiento(sheets, h);
        const pacientes = parsearPacientes(allRows, schema);
        const colDni    = schema?.colsFijas?.find(c => c.key === 'dni')?.col ?? 10;
        const colNombre = schema?.colsFijas?.find(c => c.key === 'nombres')?.col ?? 6;

        pacientes.forEach(({ fila, rowNum }) => {
          const dni    = (fila[colDni]    || '').trim();
          const nombre = (fila[colNombre] || '').toLowerCase();
          if (dni === q || nombre.includes(q.toLowerCase())) {
            resultados.push(filaAPaciente(fila, rowNum, schema, h));
          }
        });
      } catch (e) { continue; }
    }

    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/seguimiento/:hoja/paciente/:dni — busca un paciente específico
app.get('/api/seguimiento/:hoja/paciente/:dni', async (req, res) => {
  const hoja = decodeURIComponent(req.params.hoja);
  const dni  = req.params.dni.trim();
  const schema = SCHEMA_SEGUIMIENTO[hoja];

  try {
    const sheets  = await getSheets();
    const allRows = await leerHojaSeguimiento(sheets, hoja);
    const pacientes = parsearPacientes(allRows, schema);
    const colDni = schema?.colsFijas?.find(c => c.key === 'dni')?.col ?? 10;

    const encontrado = pacientes.find(({ fila }) => (fila[colDni] || '').trim() === dni);
    if (!encontrado) return res.status(404).json({ error: 'Paciente no encontrado en esta hoja.' });

    res.json(filaAPaciente(encontrado.fila, encontrado.rowNum, schema, hoja));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/seguimiento/:hoja — lista pacientes de una hoja
app.get('/api/seguimiento/:hoja', async (req, res) => {
  const hoja = decodeURIComponent(req.params.hoja);
  try {
    const sheets  = await getSheets();
    const allRows = await leerHojaSeguimiento(sheets, hoja);
    if (!allRows.length) return res.json({ encabezados: [], registros: [], total: 0 });

    // Fila 3 (índice 2) = encabezados
    // Fila 4 (índice 3) = subencabezados numéricos
    // Fila 5+ (índice 4+) = datos reales
    const encabezados = (allRows[2] || []).filter(h => (h || '').trim());
    const DATA_START  = 4;

    const registros = allRows.slice(DATA_START)
      .map((fila, i) => ({ id: DATA_START + i + 1, valores: fila }))
      .filter(({ valores }) =>
        valores.some(v => {
          const s = (v || '').trim();
          return s && isNaN(s) && s.length > 1;
        })
      );

    res.json({ encabezados, registros, total: registros.length });
  } catch (error) {
    console.error(`[GET /api/seguimiento/${hoja}] ERROR:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/seguimiento/:hoja/nuevo — crear nuevo registro completo
app.post('/api/seguimiento/:hoja/nuevo', async (req, res) => {
  const hoja   = decodeURIComponent(req.params.hoja);
  const schema = SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) return res.status(400).json({ error: 'Hoja sin schema definido.' });

  const datos = req.body;
  const maxCol = Math.max(
    ...schema.colsMeta.map(c => c.col),
    ...schema.gruposSesiones.map(g => g.col + g.sesiones - 1)
  ) + 1;

  // Construir fila vacía
  const fila = new Array(maxCol).fill('');

  // Campos fijos
  schema.colsFijas.forEach(c => {
    fila[c.col] = datos[c.key] || '';
  });

  // Primera sesión de cada grupo (si viene en el body)
  schema.gruposSesiones.forEach(g => {
    const val = datos.sesiones?.[g.key]?.[0] || '';
    if (val) fila[g.col] = val;
  });

  // Campos meta
  schema.colsMeta.forEach(c => {
    fila[c.col] = datos[c.key] || '';
  });

  try {
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID_3,
      range: `'${hoja}'!A5`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [fila] },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/seguimiento/:hoja/sesion — agregar siguiente sesión a paciente existente
app.put('/api/seguimiento/:hoja/sesion', async (req, res) => {
  const hoja   = decodeURIComponent(req.params.hoja);
  const schema = SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) return res.status(400).json({ error: 'Hoja sin schema definido.' });

  const { rowNum, grupoKey, fecha } = req.body;
  if (!rowNum || !grupoKey || !fecha) {
    return res.status(400).json({ error: 'rowNum, grupoKey y fecha son requeridos.' });
  }

  const grupo = schema.gruposSesiones.find(g => g.key === grupoKey);
  if (!grupo) return res.status(400).json({ error: `Grupo "${grupoKey}" no existe en esta hoja.` });

  try {
    const sheets = await getSheets();
    // Leer la fila actual para saber qué sesión sigue
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID_3,
      range: `'${hoja}'!A${rowNum}:ZZ${rowNum}`,
    });
    const filaActual = (response.data.values || [[]])[0] || [];

    // Encontrar la primera sesión vacía del grupo
    let colLibre = -1;
    for (let s = 0; s < grupo.sesiones; s++) {
      if (!(filaActual[grupo.col + s] || '').trim()) {
        colLibre = grupo.col + s;
        break;
      }
    }

    if (colLibre === -1) {
      return res.status(400).json({ error: `Ya se completaron todas las sesiones de "${grupo.label}".` });
    }

    // Convertir columna a letra
    const colLetra = colToLetter(colLibre);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID_3,
      range: `'${hoja}'!${colLetra}${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[fecha]] },
    });

    const sesionNum = colLibre - grupo.col + 1;
    res.json({ success: true, sesionAgregada: sesionNum, columna: colLetra });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/seguimiento/:hoja/meta — actualizar campos meta (condicion, proyeccion, etc.)
app.put('/api/seguimiento/:hoja/meta', async (req, res) => {
  const hoja   = decodeURIComponent(req.params.hoja);
  const schema = SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) return res.status(400).json({ error: 'Hoja sin schema definido.' });

  const { rowNum, ...campos } = req.body;
  if (!rowNum) return res.status(400).json({ error: 'rowNum requerido.' });

  try {
    const sheets = await getSheets();
    const requests = [];

    schema.colsMeta.forEach(c => {
      if (campos[c.key] !== undefined) {
        requests.push({
          range: `'${hoja}'!${colToLetter(c.col)}${rowNum}`,
          values: [[campos[c.key]]],
        });
      }
    });

    if (requests.length === 0) return res.json({ success: true, mensaje: 'Nada que actualizar.' });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID_3,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: requests,
      },
    });

    res.json({ success: true, camposActualizados: requests.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function colToLetter(col) {
  let letter = '';
  let n = col;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}


// ─── ENDPOINT CLAUDE (Dr. Umari) ───────────────────────────────────────────
// POST /api/gemini
app.post('/api/gemini', async (req, res) => {
  const { mensaje, historial, contexto } = req.body;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurado.' });
  }

  try {
    const messages = [];
    if (historial && historial.length > 0) {
      historial.forEach(h => {
        messages.push({ role: h.rol === 'user' ? 'user' : 'assistant', content: h.texto });
      });
    }
    messages.push({ role: 'user', content: mensaje });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: `Eres Dr. Umari, asistente IA de la Lic. Janeth Karina Santa Cruz Espíritu, psicóloga del Centro de Salud Tambillo-Umari, Huánuco, Perú. Ayúdala con sus pacientes, citas, estadísticas y diagnósticos CIE-10. Responde siempre en español, sé conciso (máximo 3-4 oraciones), usa emojis ocasionalmente. CONTEXTO ACTUAL: ${contexto || 'Sin contexto disponible'}`,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Error ${response.status}`);
    }

    const data = await response.json();
    const texto = data.content?.[0]?.text || 'Lo siento, no pude generar una respuesta.';
    res.json({ respuesta: texto });

  } catch (error) {
    console.error('[POST /api/gemini] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Backend corriendo en http://localhost:${PORT}`));