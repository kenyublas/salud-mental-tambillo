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

// ─── CACHÉ EN MEMORIA ─────────────────────────────────────────────────────
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data, ttlMs) {
  cache.set(key, { data, ts: Date.now(), ttl: ttlMs });
}

function invalidarCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

const TTL = {
  SCHEMA: 60 * 60 * 1000,  // 1 hora
  HOJAS:  10 * 60 * 1000,  // 10 minutos
  DATOS:   3 * 60 * 1000,  // 3 minutos
};

const SPREADSHEET_ID   = process.env.SPREADSHEET_ID;
const SPREADSHEET_ID_2 = process.env.SPREADSHEET_ID_2;
const SPREADSHEET_ID_3 = process.env.SPREADSHEET_ID_3;
const JWT_SECRET       = process.env.JWT_SECRET || 'cambiar_en_produccion';

const USUARIOS = [
  {
    usuario:  'janeth',
    password: process.env.ADMIN_PASSWORD,
    nombre:   'Janeth Karina Santa Cruz Espiritu',
    titulo:   'Lic.',
    rol:      'psicologa',
  },
  {
    usuario:  'lina',
    password: process.env.PASSWORD_LINA,
    nombre:   'Lina Jesarell Cabanillas Beraun',
    titulo:   'Lic.',
    rol:      'psicologa',
  },
  {
    usuario:  'ana',
    password: process.env.PASSWORD_ANA,
    nombre:   'Ana Paula Trujillo Molina',
    titulo:   'Lic.',
    rol:      'psicologa',
  },
];

console.log(`[init] SPREADSHEET_ID   cargado: ${SPREADSHEET_ID}`);
console.log(`[init] SPREADSHEET_ID_2 cargado: ${SPREADSHEET_ID_2}`);
console.log(`[init] SPREADSHEET_ID_3 cargado: ${SPREADSHEET_ID_3}`);
console.log(`[init] JWT_SECRET configurado: ${JWT_SECRET !== 'cambiar_en_produccion' ? 'SÍ' : 'NO'}`);
console.log('[init] USUARIOS:', USUARIOS.map(u => ({ usuario: u.usuario, passwordOk: !!u.password })));

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
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido. Por favor inicia sesión.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado. Por favor inicia sesión nuevamente.' });
  }
}

const COLUMNAS = [
  'fechaAtencion','profesional','responsableAtencion','tipoAtencion','apoderado',
  'nombres','dni','fechaNacimiento','edad','sexo','gestante','fur','semanaGestacional',
  'fechaProbableParto','hcl','sector','sectorista','seguro','celular','motivoConsulta',
  'tamizaje','negativo','positivo','diagnostico','segundoControl','intervencion',
  'fechaProxCita','terminoAtencion','referencia','contrarreferencia','valoracionRiesgo',
  'sesionMovilizacion','visitaDomiciliaria','medicamentos','teleorientacion','promsa',
  'campana','observaciones',
];

const HEADER_MAP = {
  'FECHA DE ATENCION':'fechaAtencion','FECHA ATENCION':'fechaAtencion',
  'PROFESIONAL':'profesional','RESPONSABLE DE ATENCION':'responsableAtencion',
  'RESPONSABLE ATENCION':'responsableAtencion','RESPONSABLE':'responsableAtencion',
  'TIPO DE ATENCION':'tipoAtencion','TIPO ATENCION':'tipoAtencion',
  'APODERADO':'apoderado','NOMBRES':'nombres','APELLIDOS Y NOMBRES':'nombres','NOMBRE':'nombres',
  'DNI':'dni','FECHA DE NACIMIENTO':'fechaNacimiento','FECHA NACIMIENTO':'fechaNacimiento',
  'EDAD':'edad','SEXO':'sexo','GESTANTE':'gestante','FUR':'fur',
  'SEMANA GESTACIONAL':'semanaGestacional','SEMANAS GESTACIONALES':'semanaGestacional',
  'SEMANAS':'semanaGestacional','FECHA PROBABLE DE PARTO':'fechaProbableParto',
  'FECHA PROBABLE PARTO':'fechaProbableParto','HCL':'hcl','SECTOR':'sector',
  'SECTORISTA':'sectorista','SEGURO':'seguro','CELULAR':'celular',
  'MOTIVO DE CONSULTA':'motivoConsulta','MOTIVO CONSULTA':'motivoConsulta',
  'TAMIZAJE':'tamizaje','NEGATIVO':'negativo','POSITIVO':'positivo','DIAGNOSTICO':'diagnostico',
  'SEGUNDO CONTROL':'segundoControl','INTERVENCION':'intervencion',
  'FECHA PROX CITA':'fechaProxCita','FECHA PROXIMA CITA':'fechaProxCita','PROX CITA':'fechaProxCita',
  'TERMINO ATENCION':'terminoAtencion','REFERENCIA':'referencia','CONTRARREFERENCIA':'contrarreferencia',
  'VALORACION DE RIESGO':'valoracionRiesgo','VALORACION RIESGO':'valoracionRiesgo',
  'SESION DE MOVILIZACION':'sesionMovilizacion','SESION MOVILIZACION':'sesionMovilizacion',
  'VISITA DOMICILIARIA':'visitaDomiciliaria','MEDICAMENTOS':'medicamentos',
  'TELEORIENTACION':'teleorientacion','PROMSA':'promsa','CAMPANA':'campana','OBSERVACIONES':'observaciones',
};

function normalizeHeader(text) {
  return (text||'').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function buildColIndex(headersRow) {
  const colIndex = {};
  headersRow.forEach((h,i) => {
    const field = HEADER_MAP[normalizeHeader(h)];
    if (field && !(field in colIndex)) colIndex[field] = i;
  });
  return colIndex;
}

function getNombreHoja(mes) {
  if (mes) return mes;
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const mesNombre = meses[new Date().getMonth()];
  const anio = new Date().getFullYear();
  return anio <= 2025 ? mesNombre : mesNombre + ' ' + anio;
}

function getMesDesdeFecha(fecha) {
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  if (!fecha) return getNombreHoja(null);
  const d = new Date(fecha);
  if (isNaN(d)) return getNombreHoja(null);
  const mes = meses[d.getMonth()];
  const anio = d.getFullYear();
  return anio <= 2025 ? mes : mes + ' ' + anio;
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return match[3]+'/'+match[2]+'/'+match[1];
  return fecha;
}

function datosAFila(datos) {
  return COLUMNAS.map(col => {
    if (col==='negativo') return datos.resultadoTamizaje==='Negativo'?'X':'-';
    if (col==='positivo') return datos.resultadoTamizaje==='Positivo'?'X':'-';
    if (['fechaAtencion','fechaNacimiento','fur','fechaProbableParto','fechaProxCita'].includes(col)) return formatearFecha(datos[col]);
    return datos[col]||'';
  });
}

// ─── RUTAS PÚBLICAS ────────────────────────────────────────────────────────

app.get('/api/dni/:numero', async (req, res) => {
  const dni = req.params.numero.trim();
  if (!/^\d{8}$/.test(dni)) return res.status(400).json({ error: 'DNI debe tener exactamente 8 dígitos.' });
  try {
    const sheets = await getSheets();
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existentes = new Set(info.data.sheets.map(s => s.properties.title));
    const MESES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const hojasBuscar = [...MESES_NOMBRES,...MESES_NOMBRES.map(m=>`${m} 2026`)].filter(h=>existentes.has(h));
    for (const hoja of hojasBuscar) {
      try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${hoja}!A1:AL` });
        const allRows = response.data.values||[];
        if (!allRows.length) continue;
        let headerIdx=0, colIndex={};
        for (let i=0;i<Math.min(5,allRows.length);i++) {
          const ci=buildColIndex(allRows[i]);
          if (Object.keys(ci).length>=4){headerIdx=i;colIndex=ci;break;}
        }
        const iNombres=colIndex.nombres??5, iDni=colIndex.dni??6;
        let dataStartIdx=headerIdx+1;
        for (let i=headerIdx+1;i<allRows.length;i++){if((allRows[i][iNombres]||'').trim()){dataStartIdx=i;break;}}
        const encontrado=allRows.slice(dataStartIdx).find(fila=>(fila[iDni]||'').trim()===dni);
        if (encontrado) {
          const obj={};
          COLUMNAS.forEach((col,posIdx)=>{const idx=colIndex[col]!==undefined?colIndex[col]:posIdx;obj[col]=(encontrado[idx]||'');});
          const convertirFecha=(f)=>{if(!f)return'';const m=f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:f;};
          return res.json({fuente:'sheets',nombres:obj.nombres||'',fechaNacimiento:convertirFecha(obj.fechaNacimiento)||'',edad:obj.edad||'',sexo:obj.sexo||'',sector:obj.sector||'',sectorista:obj.sectorista||'',celular:obj.celular||'',seguro:obj.seguro||'',hcl:obj.hcl||''});
        }
      } catch(e){continue;}
    }
    const APIPERU_TOKEN=process.env.APIPERU_TOKEN;
    if (!APIPERU_TOKEN) return res.status(404).json({ error: 'DNI no encontrado en registros locales.' });
    const apiRes=await fetch(`https://api.apis.net.pe/v2/dni?numero=${dni}`,{headers:{'Authorization':`Bearer ${APIPERU_TOKEN}`,'Content-Type':'application/json'}});
    if (!apiRes.ok) return res.status(404).json({ error: 'DNI no encontrado.' });
    const apiData=await apiRes.json();
    const nombreCompleto=apiData.nombre_completo||`${apiData.apellido_paterno||''} ${apiData.apellido_materno||''}, ${apiData.nombres||''}`.trim();
    return res.json({fuente:'apiperu',nombres:nombreCompleto,fechaNacimiento:'',edad:'',sexo:'',sector:'',sectorista:'',celular:'',seguro:'',hcl:''});
  } catch(error){res.status(500).json({error:error.message});}
});

app.get('/api/ping', (req, res) => res.json({ ok: true, mensaje: 'Backend Salud Mental Tambillo activo' }));

app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  const user = USUARIOS.find(u => u.usuario === usuario && u.password === password);
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  const token = jwt.sign({ usuario:user.usuario, nombre:user.nombre, titulo:user.titulo, rol:user.rol }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ ok:true, token, usuario:user.usuario, nombre:user.nombre, titulo:user.titulo, rol:user.rol, expira:'8h' });
});

// ─── RUTAS PROTEGIDAS ─────────────────────────────────────────────────────
app.use('/api', verificarToken);

app.get('/api/debug-fila', async (req, res) => {
  try {
    const sheets = await getSheets();
    const hoja = req.query.hoja||'MAYO 2026';
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: hoja+'!A1:AL10' });
    const filas = response.data.values||[];
    const analisis=[];
    for (let i=0;i<Math.min(4,filas.length);i++){const ci=buildColIndex(filas[i]);analisis.push({rowIndex:i,rowNum:i+1,camposReconocidos:Object.keys(ci).length,colIndex:ci,valoresCrudos:filas[i]});}
    res.json({totalFilas:filas.length,totalColumnas:COLUMNAS.length,fila1:filas[0],fila2:filas[1],fila3:filas[2],fila4:filas[3],analisisHeaders:analisis});
  } catch(error){res.status(500).json({error:error.message});}
});

app.get('/api/test-conexion', async (req, res) => {
  const resultado={pasos:{}};
  try {
    const client=await auth.getClient();resultado.pasos.autenticacion='OK';
    const sheets=google.sheets({version:'v4',auth:client});
    const info=await sheets.spreadsheets.get({spreadsheetId:SPREADSHEET_ID});
    resultado.pasos.obtenerSpreadsheet='OK';resultado.nombreSpreadsheet=info.data.properties.title;
    resultado.hojas=info.data.sheets.map(s=>s.properties.title);
    res.json({ok:true,...resultado});
  } catch(error){resultado.pasos.error=error.message;res.status(500).json({ok:false,...resultado});}
});

app.get('/api/registros', async (req, res) => {
  const hoja = getNombreHoja(req.query.mes);
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${hoja}!A1:AL` });
    const allRows = response.data.values||[];
    if (!allRows.length) return res.json([]);
    let headerIdx=0,colIndex={};
    for (let i=0;i<Math.min(5,allRows.length);i++){const ci=buildColIndex(allRows[i]);if(Object.keys(ci).length>=4){headerIdx=i;colIndex=ci;break;}}
    const iNombres=colIndex.nombres??5,iNegativo=colIndex.negativo??21,iPositivo=colIndex.positivo??22;
    let dataStartIdx=headerIdx+1;
    for (let i=headerIdx+1;i<allRows.length;i++){if((allRows[i][iNombres]||'').trim()){dataStartIdx=i;break;}}
    const registros=allRows.slice(dataStartIdx).map((fila,i)=>({fila,rowNum:dataStartIdx+i+1})).filter(({fila})=>(fila[iNombres]||'').trim()).map(({fila,rowNum})=>{
      const obj={id:rowNum};
      COLUMNAS.forEach((col,posIdx)=>{const idx=colIndex[col]!==undefined?colIndex[col]:posIdx;obj[col]=(fila[idx]||'');});
      const neg=(fila[iNegativo]||'').toUpperCase(),pos=(fila[iPositivo]||'').toUpperCase();
      obj.resultadoTamizaje=neg==='X'?'Negativo':pos==='X'?'Positivo':'';
      return obj;
    });
    res.json(registros);
  } catch(error){res.status(500).json({error:error.message});}
});

app.post('/api/registro', async (req, res) => {
  const hoja = getMesDesdeFecha(req.body.fechaAtencion);
  try {
    const sheets=await getSheets();
    const existing=await sheets.spreadsheets.values.get({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A3:A`});
    const filaVacia=(existing.data.values?.length||0)+3;
    const fila=datosAFila(req.body);
    await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A${filaVacia}`,valueInputOption:'USER_ENTERED',requestBody:{values:[fila]}});
    res.json({success:true,fila:filaVacia});
  } catch(error){res.status(500).json({error:error.message});}
});

app.put('/api/registro/:fila', async (req, res) => {
  const hoja=getNombreHoja(req.body.mes),numFila=req.params.fila;
  try {
    const sheets=await getSheets();
    const fila=datosAFila(req.body);
    await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A${numFila}`,valueInputOption:'USER_ENTERED',requestBody:{values:[fila]}});
    res.json({success:true});
  } catch(error){res.status(500).json({error:error.message});}
});

app.delete('/api/registro/:fila', async (req, res) => {
  const hoja=getNombreHoja(req.query.mes),numFila=req.params.fila;
  try {
    const sheets=await getSheets();
    await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A${numFila}`,valueInputOption:'USER_ENTERED',requestBody:{values:[new Array(COLUMNAS.length).fill('')]}});
    res.json({success:true});
  } catch(error){res.status(500).json({error:error.message});}
});

app.get('/api/listar-hojas', async (req, res) => {
  try {
    const sheets=await getSheets();
    const info=await sheets.spreadsheets.get({spreadsheetId:SPREADSHEET_ID});
    res.json(info.data.sheets.map(s=>({id:s.properties.sheetId,nombre:s.properties.title})));
  } catch(error){res.status(500).json({error:error.message});}
});

app.get('/api/crear-todas-hojas', async (req, res) => {
  try {
    const sheets=await getSheets();
    const hojas2026=['JUNIO 2026','JULIO 2026','AGOSTO 2026','SETIEMBRE 2026','OCTUBRE 2026','NOVIEMBRE 2026','DICIEMBRE 2026'];
    const info=await sheets.spreadsheets.get({spreadsheetId:SPREADSHEET_ID});
    const hojasExistentes=info.data.sheets,nombresExistentes=hojasExistentes.map(s=>s.properties.title);
    const plantilla=hojasExistentes.find(s=>s.properties.title==='MAYO 2026');
    if (!plantilla) return res.status(400).json({error:'No se encontró la hoja plantilla MAYO 2026'});
    const plantillaId=plantilla.properties.sheetId,resultados=[];
    for (const hoja of hojas2026){
      if (nombresExistentes.includes(hoja)){resultados.push({hoja,estado:'ya existe'});continue;}
      const copia=await sheets.spreadsheets.sheets.copyTo({spreadsheetId:SPREADSHEET_ID,sheetId:plantillaId,requestBody:{destinationSpreadsheetId:SPREADSHEET_ID}});
      await sheets.spreadsheets.batchUpdate({spreadsheetId:SPREADSHEET_ID,requestBody:{requests:[{updateSheetProperties:{properties:{sheetId:copia.data.sheetId,title:hoja},fields:'title'}}]}});
      await sheets.spreadsheets.values.clear({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A3:AL`});
      resultados.push({hoja,estado:'creada con formato'});
    }
    res.json({success:true,resultados});
  } catch(error){res.status(500).json({error:error.message});}
});

app.get('/api/buscar', async (req, res) => {
  const q=(req.query.q||'').trim(),tipo=(req.query.tipo||'todos'),qLower=q.toLowerCase();
  try {
    const sheets=await getSheets();
    const info=await sheets.spreadsheets.get({spreadsheetId:SPREADSHEET_ID});
    const existentes=new Set(info.data.sheets.map(s=>s.properties.title));
    const MESES_NOMBRES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const hojasBuscar=[...MESES_NOMBRES,...MESES_NOMBRES.map(m=>`${m} 2026`)].filter(h=>existentes.has(h));
    const porHoja=await Promise.all(hojasBuscar.map(async(hoja)=>{
      try {
        const response=await sheets.spreadsheets.values.get({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A1:AL`});
        const allRows=response.data.values||[];if(!allRows.length)return[];
        let headerIdx=0,colIndex={};
        for(let i=0;i<Math.min(5,allRows.length);i++){const ci=buildColIndex(allRows[i]);if(Object.keys(ci).length>=4){headerIdx=i;colIndex=ci;break;}}
        const iNombres=colIndex.nombres??5,iDni=colIndex.dni??6,iNegativo=colIndex.negativo??21,iPositivo=colIndex.positivo??22;
        let dataStartIdx=headerIdx+1;
        for(let i=headerIdx+1;i<allRows.length;i++){if((allRows[i][iNombres]||'').trim()){dataStartIdx=i;break;}}
        return allRows.slice(dataStartIdx).map((fila,i)=>({fila,rowNum:dataStartIdx+i+1}))
          .filter(({fila})=>(fila[iNombres]||'').trim())
          .filter(({fila})=>{if(!q)return true;const nombre=(fila[iNombres]||'').toLowerCase(),dni=(fila[iDni]||'').trim();if(tipo==='dni')return dni===q;if(tipo==='nombre')return nombre.includes(qLower);return dni===q||nombre.includes(qLower);})
          .map(({fila,rowNum})=>{const obj={id:rowNum,mes:hoja};COLUMNAS.forEach((col,posIdx)=>{const idx=colIndex[col]!==undefined?colIndex[col]:posIdx;obj[col]=(fila[idx]||'');});const neg=(fila[iNegativo]||'').toUpperCase(),pos=(fila[iPositivo]||'').toUpperCase();obj.resultadoTamizaje=neg==='X'?'Negativo':pos==='X'?'Positivo':'';return obj;});
      } catch(err){return[];}
    }));
    const todos=porHoja.flat();
    const parseFecha=(f='')=>{const m=f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime():0;};
    todos.sort((a,b)=>parseFecha(b.fechaAtencion)-parseFecha(a.fechaAtencion));
    res.json(todos);
  } catch(error){res.status(500).json({error:error.message});}
});

// ─── SCHEMA SEGUIMIENTO ───────────────────────────────────────────────────
const SCHEMA_SEGUIMIENTO = {
  'TTO TXS DEPRESIVO': {
    titulo: 'SEGUIMIENTO DE TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESIÓN. (5005190)',
    headerInfo: { producto:'PERSONAS CON TRASTORNOS AFECTIVOS Y DE ANSIEDAD TRATADAS OPORTUNAMENTE', actividad:'PERSONAS CON TRASTORNOS AFECTIVOS Y DE ANSIEDAD TRATADAS OPORTUNAMENTE (5005190)', subproducto:'TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESION (5005190)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consultaMedica',col:20,sesiones:3,label:'CONSULTA MÉDICA (99215 - 30 A 20 MIN)'},
      {key:'psicoeducacion',col:23,sesiones:1,label:'PSICOEDUCACIÓN AL USUARIO (99207.04 - 45 MIN)'},
      {key:'intervencionIndividual',col:24,sesiones:6,label:'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)'},
    ],
    colsMeta: [{key:'condicion',col:30,label:'CONDICIÓN'},{key:'proyeccion',col:31,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:32,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:33,label:'OBSERVACIÓN'}],
  },
  'TTO VIF. Y SEXUAL > 18 AÑOS': {
    titulo: 'SEGUIMIENTO DE TRATAMIENTO EN VIOLENCIA FAMILIAR (5005189)',
    headerInfo: { producto:'POBLACION CON PROBLEMAS PSICOSOCIALES QUE RECIBEN ATENCION OPORTUNA Y DE CALIDAD', actividad:'TRATAMIENTO DE PERSONAS CON PROBLEMAS PSICOSOCIALES (5005189)', subproducto:'TRATAMIENTO EN VIOLENCIA FAMILIAR EN EL PRIMER NIVEL DE ATENCION NO ESPECIALIZADO (5005189)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'apoderado',col:14,label:'APODERADO O FAMILIAR'},
      {key:'celular',col:15,label:'CELULAR'},{key:'sectorista',col:16,label:'SECTORISTA'},{key:'tamizaje',col:17,label:'TAMIZAJE'},
      {key:'diagnostico',col:18,label:'DIAGNÓSTICO (CIE-10)'},{key:'tipoViolencia',col:19,label:'TIPO DE VIOLENCIA'},
    ],
    gruposSesiones: [
      {key:'fichaRiesgo',col:20,sesiones:1,label:'APLICACIÓN FICHA VALORACIÓN RIESGOS (99207.06)'},
      {key:'consultaSaludMental',col:23,sesiones:2,label:'CONSULTA SALUD MENTAL (99207 - 45 MIN)'},
      {key:'psicoterapiaIndividual',col:25,sesiones:6,label:'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)'},
      {key:'intervencionFamiliar',col:31,sesiones:1,label:'INTERVENCIÓN FAMILIAR (C2111.01)'},
      {key:'visitaDomiciliaria',col:32,sesiones:1,label:'VISITA DOMICILIARIA (C0011)'},
      {key:'movilizacionRedes',col:33,sesiones:1,label:'MOVILIZACIÓN REDES DE APOYO (C1043)'},
    ],
    colsMeta: [{key:'condicion',col:34,label:'CONDICIÓN'},{key:'proyeccion',col:35,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:36,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:37,label:'OBSERVACIÓN'}],
  },
  'TTO VIOL. INFANTIL  0-17 AÑOS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO NIÑOS/AS AFECTADOS POR MALTRATO INFANTIL',
    headerInfo: { producto:'POBLACION CON PROBLEMAS PSICOSOCIALES QUE RECIBEN ATENCION OPORTUNA Y DE CALIDAD', actividad:'TRATAMIENTO DE PERSONAS CON PROBLEMAS PSICOSOCIALES (5005189)', subproducto:'TRATAMIENTO DE NINOS, NINAS Y ADOLESCENTES AFECTADOS POR MALTRATO INFANTIL (0060614)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'fichaRiesgo',col:20,sesiones:1,label:'APLICACIÓN FICHA VALORACIÓN RIESGOS (99207.06)'},
      {key:'consultaSaludMental',col:23,sesiones:2,label:'CONSULTA SALUD MENTAL (99207 - 45 MIN)'},
      {key:'intervencionIndividual',col:25,sesiones:6,label:'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)'},
      {key:'intervencionFamiliar',col:31,sesiones:3,label:'INTERVENCIÓN FAMILIAR (C2111.01)'},
      {key:'visitaDomiciliaria',col:34,sesiones:1,label:'VISITA DOMICILIARIA (C0011)'},
      {key:'movilizacionRedes',col:35,sesiones:1,label:'MOVILIZACIÓN REDES DE APOYO (C1043)'},
    ],
    colsMeta: [{key:'condicion',col:36,label:'CONDICIÓN'},{key:'fur',col:37,label:'FUR'},{key:'fpp',col:38,label:'FPP'},{key:'proyeccion',col:39,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:40,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:41,label:'OBSERVACIÓN'}],
  },
  'TTO V. SEXUAL DE  0-17 AÑOS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO NIÑOS/AS AFECTADOS POR VIOLENCIA SEXUAL',
    headerInfo: { producto:'POBLACION CON PROBLEMAS PSICOSOCIALES QUE RECIBEN ATENCION OPORTUNA Y DE CALIDAD', actividad:'TRATAMIENTO DE PERSONAS CON PROBLEMAS PSICOSOCIALES (5005189)', subproducto:'TRATAMIENTO ESPECIALIZADO DE PERSONAS AFECTADAS POR VIOLENCIA SEXUAL (0060613)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'fichaRiesgo',col:20,sesiones:1,label:'APLICACIÓN FICHA VALORACIÓN RIESGOS (99207.06)'},
      {key:'consultaSaludMental',col:23,sesiones:2,label:'CONSULTA SALUD MENTAL (99207 - 45 MIN)'},
      {key:'intervencionIndividual',col:25,sesiones:6,label:'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)'},
      {key:'intervencionFamiliar',col:31,sesiones:3,label:'INTERVENCIÓN FAMILIAR (C2111.01)'},
      {key:'visitaDomiciliaria',col:34,sesiones:1,label:'VISITA DOMICILIARIA (C0011)'},
      {key:'movilizacionRedes',col:35,sesiones:1,label:'MOVILIZACIÓN REDES DE APOYO (C1043)'},
    ],
    colsMeta: [{key:'condicion',col:36,label:'CONDICIÓN'},{key:'proyeccion',col:37,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:38,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:39,label:'OBSERVACIÓN'}],
  },
  'TTO AUTISMO': {
    titulo: 'SEGUIMIENTO TRATAMIENTO AMBULATORIO PERSONAS CON AUTISMO',
    headerInfo: { producto:'POBLACION CON PROBLEMAS PSICOSOCIALES QUE RECIBEN ATENCION OPORTUNA Y DE CALIDAD', actividad:'TRATAMIENTO AMBULATORIO DE NINOS Y NINAS DE 0 A 17 ANOS CON TRASTORNOS MENTALES (5006281)', subproducto:'TRATAMIENTO AMBULATORIO DE NINOS Y NINAS DE 0 A 17 ANOS CON TRASTORNOS DEL ESPECTRO AUTISTA (0070616)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consultaMedica',col:20,sesiones:2,label:'CONSULTA MÉDICA ESPECIALIZADA (99215 - 45 MIN)'},
      {key:'psicoterapia',col:22,sesiones:6,label:'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)'},
      {key:'intervencionGrupal',col:28,sesiones:6,label:'INTERVENCIÓN GRUPAL SALUD MENTAL (99207.02)'},
      {key:'visitaDomiciliaria',col:34,sesiones:1,label:'VISITA DOMICILIARIA (C0011)'},
      {key:'movilizacionRedes',col:35,sesiones:1,label:'MOVILIZACIÓN REDES DE APOYO (C1043)'},
    ],
    colsMeta: [{key:'condicion',col:36,label:'CONDICIÓN'},{key:'proyeccion',col:37,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:38,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:39,label:'OBSERVACIÓN'}],
  },
  'TTO TX MENTAL Y COMP. 0-17 AÑOS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO TRASTORNO MENTAL Y COMPORTAMIENTO 0-17 AÑOS',
    headerInfo: { producto:'POBLACION CON PROBLEMAS PSICOSOCIALES QUE RECIBEN ATENCION OPORTUNA Y DE CALIDAD', actividad:'TRATAMIENTO AMBULATORIO DE NINOS Y NINAS DE 0 A 17 ANOS CON TRASTORNOS MENTALES (5006281)', subproducto:'TRATAMIENTO AMBULATORIO DE NINOS Y NINAS DE 0 A 17 ANOS CON TRASTORNOS MENTALES Y/O PROBLEMAS PSICOSOCIALES (5005927)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consultaSaludMental',col:20,sesiones:2,label:'CONSULTA SALUD MENTAL (99207 - 45 MIN)'},
      {key:'intervencionIndividual',col:22,sesiones:6,label:'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)'},
      {key:'intervencionFamiliar',col:28,sesiones:3,label:'INTERVENCIÓN FAMILIAR (C2111.01)'},
      {key:'visitaDomiciliaria',col:31,sesiones:1,label:'VISITA DOMICILIARIA (C0011)'},
    ],
    colsMeta: [{key:'condicion',col:32,label:'CONDICIÓN'},{key:'proyeccion',col:33,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:34,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:35,label:'OBSERVACIÓN'}],
  },
  'TTO TXT CX SUICIDA': {
    titulo: 'SEGUIMIENTO TRATAMIENTO CONDUCTA SUICIDA',
    headerInfo: { producto:'PERSONAS CON TRASTORNOS AFECTIVOS Y DE ANSIEDAD TRATADAS OPORTUNAMENTE', actividad:'PERSONAS CON TRASTORNOS AFECTIVOS Y DE ANSIEDAD TRATADAS OPORTUNAMENTE (5005190)', subproducto:'TRATAMIENTO AMBULATORIO DE PERSONAS CON CONDUCTA SUICIDA (0070610)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consultaMedica',col:20,sesiones:2,label:'CONSULTA MÉDICA (99215 - 30 MIN)'},
      {key:'psicoeducacion',col:22,sesiones:1,label:'PSICOEDUCACIÓN (99207.04 - 45 MIN)'},
      {key:'psicoterapiaIndividual',col:23,sesiones:6,label:'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)'},
      {key:'intervencionFamiliar',col:29,sesiones:2,label:'INTERVENCIÓN FAMILIAR (C2111.01)'},
      {key:'visitaDomiciliaria',col:31,sesiones:1,label:'VISITA DOMICILIARIA (C0011)'},
      {key:'movilizacionRedes',col:32,sesiones:1,label:'MOVILIZACIÓN REDES DE APOYO (C1043)'},
    ],
    colsMeta: [{key:'condicion',col:33,label:'CONDICIÓN'},{key:'proyeccion',col:34,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:35,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:36,label:'OBSERVACIÓN'}],
  },
  'TTO TXT ANSIEDAD': {
    titulo: 'SEGUIMIENTO TRATAMIENTO TRASTORNO DE ANSIEDAD',
    headerInfo: { producto:'PERSONAS CON TRASTORNOS AFECTIVOS Y DE ANSIEDAD TRATADAS OPORTUNAMENTE', actividad:'PERSONAS CON TRASTORNOS AFECTIVOS Y DE ANSIEDAD TRATADAS OPORTUNAMENTE (5005190)', subproducto:'TRATAMIENTO AMBULATORIO DE PERSONAS CON ANSIEDAD (0070611)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consultaMedica',col:20,sesiones:2,label:'CONSULTA MÉDICA (99215 - 45 MIN)'},
      {key:'psicoeducacion',col:22,sesiones:1,label:'PSICOEDUCACIÓN (99207.04 - 45 MIN)'},
      {key:'psicoterapiaIndividual',col:23,sesiones:6,label:'PSICOTERAPIA INDIVIDUAL (90806 - 60 MIN)'},
    ],
    colsMeta: [{key:'condicion',col:29,label:'CONDICIÓN'},{key:'proyeccion',col:30,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:31,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:32,label:'OBSERVACIÓN'}],
  },
  'TTO INTERV CONSUMO OH': {
    titulo: 'SEGUIMIENTO INTERVENCIÓN CONSUMO DE ALCOHOL',
    headerInfo: { producto:'PERSONAS CON TRASTORNOS MENTALES Y DEL COMPORTAMIENTO DEBIDO AL CONSUMO DEL ALCOHOL TRATADAS OPORTUNAMENTE', actividad:'PERSONAS CON TRASTORNOS MENTALES Y DEL COMPORTAMIENTO DEBIDO AL CONSUMO DEL ALCOHOL TRATADAS OPORTUNAMENTE (5006282)', subproducto:'INTERVENCIONES BREVES MOTIVACIONALES PARA PERSONAS CON CONSUMO PERJUDICIAL DEL ALCOHOL Y TABACO (5005192)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consejeria',col:20,sesiones:1,label:'CONSEJERÍA ESTILOS VIDA SALUDABLE (99401.13)'},
      {key:'intervencionBreve',col:21,sesiones:6,label:'INTERVENCIÓN BREVE (99207.01 - 30 MIN)'},
    ],
    colsMeta: [{key:'condicion',col:27,label:'CONDICIÓN'},{key:'proyeccion',col:28,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:29,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:30,label:'OBSERVACIÓN'}],
  },
  'TTO DEPENDENCIA OH': {
    titulo: 'SEGUIMIENTO TRATAMIENTO DEPENDENCIA AL ALCOHOL',
    headerInfo: { producto:'PERSONAS CON TRASTORNOS MENTALES Y DEL COMPORTAMIENTO DEBIDO AL CONSUMO DEL ALCOHOL TRATADAS OPORTUNAMENTE', actividad:'PERSONAS CON TRASTORNOS MENTALES Y DEL COMPORTAMIENTO DEBIDO AL CONSUMO DEL ALCOHOL TRATADAS OPORTUNAMENTE (5006282)', subproducto:'INTERVENCION PARA PERSONAS CON DEPENDENCIA DEL ALCOHOL Y TABACO (0070617)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consultasMedicas',col:19,sesiones:4,label:'CONSULTAS MÉDICAS (99215 - 30 MIN)'},
      {key:'entrevistaMotivacional',col:23,sesiones:2,label:'ENTREVISTAS MOTIVACIONALES (96150 - 30 MIN)'},
      {key:'psicoterapiaIndividual',col:25,sesiones:4,label:'PSICOTERAPIAS INDIVIDUALES (90806 - 60 MIN)'},
      {key:'intervencionFamiliar',col:29,sesiones:2,label:'INTERVENCIONES FAMILIARES (96100.01 - 60 MIN)'},
      {key:'visitasFamiliares',col:31,sesiones:2,label:'VISITAS FAMILIARES (C0011 - 45 MIN)'},
    ],
    colsMeta: [{key:'condicion',col:33,label:'CONDICIÓN'},{key:'proyeccion',col:34,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:35,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:36,label:'OBSERVACIÓN'}],
  },
  'TTO ESPECT.ESQUIZOFRENIA EE.SS': {
    titulo: 'SEGUIMIENTO TRATAMIENTO ESPECTRO DE ESQUIZOFRENIA',
    headerInfo: { producto:'PERSONAS CON TRASTORNOS MENTALES Y SINDROMES PSICOTICOS TRATADAS OPORTUNAMENTE (3000702)', actividad:'PERSONAS CON TRASTORNOS MENTALES Y DEL COMPORTAMIENTO CON SINDROME PSICOTICO O TRASTORNO ESPECTRO ESQUIZOFRENIA TRATADAS OPORTUNAMENTE', subproducto:'TRATAMIENTO AMBULATORIO A PERSONAS CON SINDROME PSICOTICO O TRASTORNO DEL ESPECTRO DE LA ESQUIZOFRENIA (5005195)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'institucion',col:14,label:'INSTITUCIÓN EDUCATIVA'},
      {key:'apoderado',col:15,label:'APODERADO O FAMILIAR'},{key:'celular',col:16,label:'CELULAR'},{key:'sectorista',col:17,label:'SECTORISTA'},
      {key:'tamizaje',col:18,label:'TAMIZAJE'},{key:'diagnostico',col:19,label:'DIAGNÓSTICO (CIE-10)'},
    ],
    gruposSesiones: [
      {key:'consultaMedica',col:20,sesiones:4,label:'CONSULTA MÉDICA AMBULATORIA (99215 - 45 MIN)'},
      {key:'intervencionIndividual',col:24,sesiones:6,label:'INTERVENCIÓN INDIVIDUAL / PSICOTERAPIA (99207.01 / 90806)'},
      {key:'psicoeducacion',col:30,sesiones:4,label:'PSICOEDUCACIÓN (99207.04 - 30 MIN)'},
      {key:'visitaDomiciliaria',col:34,sesiones:1,label:'VISITA DOMICILIARIA (C0011)'},
      {key:'movilizacionRedes',col:35,sesiones:1,label:'MOVILIZACIÓN REDES DE APOYO (C1043)'},
    ],
    colsMeta: [{key:'condicion',col:36,label:'CONDICIÓN'},{key:'proyeccion',col:37,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:38,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:39,label:'OBSERVACIÓN'}],
  },
  'VIPOL 1 FORTALECIMIENTO': {
    titulo: 'SEGUIMIENTO VIPOL 1 - FORTALECIMIENTO DE REDES DE APOYO',
    headerInfo: { producto:'COMUNIDADES CON POBLACIONES VICTIMAS DE VIOLENCIA POLITICA ATENDIDAS', actividad:'INTERVENCION COMUNITARIA PARA LA RECUPERACION EMOCIONAL DE POBLACIONES VICTIMAS DE VIOLENCIA POLITICA', subproducto:'FORTALECIMIENTO DE REDES DE APOYO PSICOSOCIAL (5005199)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'apoderado',col:14,label:'APODERADO O FAMILIAR'},
      {key:'celular',col:15,label:'CELULAR'},{key:'tamizaje',col:16,label:'TAMIZAJE'},{key:'diagnostico',col:17,label:'DIAGNÓSTICO (Z654)'},
    ],
    gruposSesiones: [{key:'fortalecimientoRedes',col:18,sesiones:6,label:'FORTALECIMIENTO REDES DE APOYO (C0071 + Z654)'}],
    colsMeta: [{key:'condicion',col:24,label:'CONDICIÓN'},{key:'proyeccion',col:25,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:26,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:27,label:'OBSERVACIÓN'}],
  },
  'VIPOL 2 ACOMPAÑAMIENTO': {
    titulo: 'SEGUIMIENTO VIPOL 2 - ACOMPAÑAMIENTO PSICOSOCIAL',
    headerInfo: { producto:'COMUNIDADES CON POBLACIONES VICTIMAS DE VIOLENCIA POLITICA ATENDIDAS', actividad:'INTERVENCION COMUNITARIA PARA LA RECUPERACION EMOCIONAL DE POBLACIONES VICTIMAS DE VIOLENCIA POLITICA', subproducto:'ACOMPANAMIENTO PSICOSOCIAL A VICTIMAS DE VIOLENCIA POLITICA (0070625)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'apoderado',col:14,label:'APODERADO O FAMILIAR'},
      {key:'celular',col:15,label:'CELULAR'},{key:'tamizaje',col:16,label:'TAMIZAJE'},{key:'diagnostico',col:17,label:'DIAGNÓSTICO (Z654)'},
    ],
    gruposSesiones: [{key:'acompañamiento',col:18,sesiones:6,label:'ACOMPAÑAMIENTO PSICOSOCIAL (99207.07 + Z654)'}],
    colsMeta: [{key:'condicion',col:24,label:'CONDICIÓN'},{key:'proyeccion',col:25,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:26,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:27,label:'OBSERVACIÓN'}],
  },
  'VIPOL 3 RECONSTRUCCION': {
    titulo: 'SEGUIMIENTO VIPOL 3 - RECONSTRUCCIÓN DE IDENTIDAD COLECTIVA',
    headerInfo: { producto:'COMUNIDADES CON POBLACIONES VICTIMAS DE VIOLENCIA POLITICA ATENDIDAS', actividad:'INTERVENCION COMUNITARIA PARA LA RECUPERACION EMOCIONAL DE POBLACIONES VICTIMAS DE VIOLENCIA POLITICA', subproducto:'RECONSTRUCCION DE LA IDENTIDAD COLECTIVA (0070626)' },
    colsFijas: [
      {key:'producto',col:0,label:'PRODUCTO'},{key:'actividad',col:1,label:'ACTIVIDAD OPERATIVA'},{key:'subproducto',col:2,label:'SUBPRODUCTO'},
      {key:'numero',col:3,label:'N°'},{key:'psicologo',col:4,label:'NOMBRE DEL PSICÓLOGO(A)'},{key:'fechaAtencion',col:5,label:'FECHA DE ATENCIÓN'},
      {key:'nombres',col:6,label:'APELLIDOS Y NOMBRES'},{key:'edad',col:7,label:'EDAD'},{key:'sexo',col:8,label:'SEXO'},
      {key:'fechaNac',col:9,label:'FECHA DE NACIMIENTO'},{key:'dni',col:10,label:'DNI'},{key:'hcl',col:11,label:'HISTORIA CLÍNICA'},
      {key:'sector',col:12,label:'SECTOR'},{key:'direccion',col:13,label:'DIRECCIÓN'},{key:'apoderado',col:14,label:'APODERADO O FAMILIAR'},
      {key:'celular',col:15,label:'CELULAR'},{key:'tamizaje',col:16,label:'TAMIZAJE'},{key:'diagnostico',col:17,label:'DIAGNÓSTICO (Z654)'},
    ],
    gruposSesiones: [{key:'reconstruccion',col:18,sesiones:6,label:'RECONSTRUCCIÓN IDENTIDAD COLECTIVA (C0006 + Z654)'}],
    colsMeta: [{key:'condicion',col:24,label:'CONDICIÓN'},{key:'proyeccion',col:25,label:'PROYECCIÓN MES A DAR TA'},{key:'referido',col:26,label:'REFERIDO LUGAR Y FECHA'},{key:'observacion',col:27,label:'OBSERVACIÓN'}],
  },
  'CEM PACHITEA': {
    titulo: 'CASOS DEL CENTRO DE EMERGENCIA MUJER - PACHITEA',
    headerInfo: { producto:'CENTRO DE EMERGENCIA MUJER - PACHITEA', actividad:'TERAPIA PSICOLOGICA', subproducto:'ATENCION Y SEGUIMIENTO DE CASOS CEM' },
    dataStart: 2,
    colsFijas: [
      {key:'oficio',col:0,label:'OFICIO'},{key:'fechaRecepcion',col:1,label:'FECHA DE RECEPCION'},
      {key:'asunto',col:2,label:'ASUNTO'},{key:'nombres',col:3,label:'USUARIA'},
      {key:'dni',col:4,label:'DNI'},{key:'edad',col:5,label:'EDAD'},
      {key:'comentario',col:6,label:'COMENTARIO ADICIONAL'},{key:'nivelRiesgo',col:7,label:'NIVEL DE RIESGO'},
      {key:'domicilio',col:8,label:'DOMICILIO'},{key:'celular',col:9,label:'CELULAR'},
      {key:'fechaAtencion',col:10,label:'FECHA DE ATENCION EN CEM'},{key:'deriva',col:11,label:'DERIVA'},
      {key:'observacion',col:12,label:'OBSERVACION'},
    ],
    gruposSesiones: [],
    colsMeta: [],
  },
};

// ─── HELPERS SEGUIMIENTO ──────────────────────────────────────────────────
async function leerHojaSeguimiento(sheets, hoja) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID_3, range: `'${hoja}'!A1:ZZ` });
  return response.data.values||[];
}

function parsearPacientes(allRows, schema) {
  const DATA_START = schema?.dataStart??4;
  if (allRows.length<=DATA_START) return [];
  const colDni=schema?.colsFijas?.find(c=>c.key==='dni')?.col??10;
  const colNombre=schema?.colsFijas?.find(c=>c.key==='nombres')?.col??6;
  return allRows.slice(DATA_START).map((fila,i)=>({fila,rowNum:DATA_START+i+1})).filter(({fila})=>(fila[colNombre]||'').trim()||(fila[colDni]||'').trim());
}

function filaAPaciente(fila, rowNum, schema, hoja) {
  if (!schema) return {id:rowNum,hoja,raw:fila};
  const paciente={id:rowNum,hoja};
  schema.colsFijas.forEach(c=>{paciente[c.key]=(fila[c.col]||'').trim();});
  paciente.sesiones={};
  schema.gruposSesiones.forEach(g=>{
    const fechas=[];
    for(let s=0;s<g.sesiones;s++){fechas.push((fila[g.col+s]||'').trim());}
    paciente.sesiones[g.key]={label:g.label,col:g.col,total:g.sesiones,fechas,completadas:fechas.filter(f=>f).length,siguiente:fechas.findIndex(f=>!f)};
  });
  schema.colsMeta.forEach(c=>{paciente[c.key]=(fila[c.col]||'').trim();});
  return paciente;
}

function colToLetter(col) {
  let letter='',n=col;
  while(n>=0){letter=String.fromCharCode(65+(n%26))+letter;n=Math.floor(n/26)-1;}
  return letter;
}

// ─── ENDPOINTS SEGUIMIENTO ────────────────────────────────────────────────

// GET /api/seguimiento/hojas
app.get('/api/seguimiento/hojas', async (req, res) => {
  const cached = getCached('seguimiento:hojas');
  if (cached) return res.json(cached);
  try {
    const sheets = await getSheets();
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID_3 });
    const hojas = info.data.sheets.map(s => ({ id: s.properties.sheetId, nombre: s.properties.title }));
    setCache('seguimiento:hojas', hojas, TTL.HOJAS);
    res.json(hojas);
  } catch(error) {
    console.error('[GET /api/seguimiento/hojas] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/seguimiento/schema/:hoja
app.get('/api/seguimiento/schema/:hoja', (req, res) => {
  const hoja = decodeURIComponent(req.params.hoja);
  const cached = getCached(`schema:${hoja}`);
  if (cached) return res.json(cached);
  const schema = SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) {
    const resp = { hoja, tieneSchema: false, mensaje: 'Hoja sin schema definido (solo lectura)' };
    setCache(`schema:${hoja}`, resp, TTL.SCHEMA);
    return res.json(resp);
  }
  const resp = { hoja, tieneSchema: true, ...schema };
  setCache(`schema:${hoja}`, resp, TTL.SCHEMA);
  res.json(resp);
});

// GET /api/seguimiento/buscar
app.get('/api/seguimiento/buscar', async (req, res) => {
  const q=(req.query.q||'').trim(), hoja=req.query.hoja?decodeURIComponent(req.query.hoja):null;
  if (!q) return res.status(400).json({ error: 'Parámetro q requerido.' });
  try {
    const sheets=await getSheets();
    const info=await sheets.spreadsheets.get({spreadsheetId:SPREADSHEET_ID_3});
    const hojas=hoja?[hoja]:info.data.sheets.map(s=>s.properties.title).filter(h=>!['TA - 2026','Hoja1'].includes(h));
    const resultados=[];
    for (const h of hojas) {
      try {
        const schema=SCHEMA_SEGUIMIENTO[h];
        const allRows=await leerHojaSeguimiento(sheets,h);
        const pacientes=parsearPacientes(allRows,schema);
        const colDni=schema?.colsFijas?.find(c=>c.key==='dni')?.col??10;
        const colNombre=schema?.colsFijas?.find(c=>c.key==='nombres')?.col??6;
        pacientes.forEach(({fila,rowNum})=>{
          const dni=(fila[colDni]||'').trim(),nombre=(fila[colNombre]||'').toLowerCase();
          if(dni===q||nombre.includes(q.toLowerCase())) resultados.push(filaAPaciente(fila,rowNum,schema,h));
        });
      } catch(e){continue;}
    }
    res.json(resultados);
  } catch(error){res.status(500).json({error:error.message});}
});

// GET /api/seguimiento/:hoja/paciente/:dni
app.get('/api/seguimiento/:hoja/paciente/:dni', async (req, res) => {
  const hoja=decodeURIComponent(req.params.hoja),dni=req.params.dni.trim();
  const schema=SCHEMA_SEGUIMIENTO[hoja];
  try {
    const sheets=await getSheets();
    const allRows=await leerHojaSeguimiento(sheets,hoja);
    const pacientes=parsearPacientes(allRows,schema);
    const colDni=schema?.colsFijas?.find(c=>c.key==='dni')?.col??10;
    const encontrado=pacientes.find(({fila})=>(fila[colDni]||'').trim()===dni);
    if (!encontrado) return res.status(404).json({error:'Paciente no encontrado en esta hoja.'});
    res.json(filaAPaciente(encontrado.fila,encontrado.rowNum,schema,hoja));
  } catch(error){res.status(500).json({error:error.message});}
});

// GET /api/seguimiento/:hoja
app.get('/api/seguimiento/:hoja', async (req, res) => {
  const hoja = decodeURIComponent(req.params.hoja);
  const cached = getCached(`seguimiento:datos:${hoja}`);
  if (cached) return res.json(cached);
  try {
    const sheets=await getSheets();
    const allRows=await leerHojaSeguimiento(sheets,hoja);
    if (!allRows.length) return res.json({encabezados:[],registros:[],total:0});
    const encabezados=(allRows[2]||[]).filter(h=>(h||'').trim());
    const DATA_START=4;
    const registros=allRows.slice(DATA_START).map((fila,i)=>({id:DATA_START+i+1,valores:fila})).filter(({valores})=>valores.some(v=>{const s=(v||'').trim();return s&&isNaN(s)&&s.length>1;}));
    const resultado={encabezados,registros,total:registros.length};
    setCache(`seguimiento:datos:${hoja}`, resultado, TTL.DATOS);
    res.json(resultado);
  } catch(error){
    console.error(`[GET /api/seguimiento/${hoja}] ERROR:`,error.message);
    res.status(500).json({error:error.message});
  }
});

// POST /api/seguimiento/:hoja/nuevo
app.post('/api/seguimiento/:hoja/nuevo', async (req, res) => {
  const hoja=decodeURIComponent(req.params.hoja);
  const schema=SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) return res.status(400).json({error:'Hoja sin schema definido.'});
  const datos=req.body;
  const maxCol=Math.max(...schema.colsMeta.map(c=>c.col),...schema.gruposSesiones.map(g=>g.col+g.sesiones-1),schema.colsFijas.map(c=>c.col).reduce((a,b)=>Math.max(a,b),0))+1;
  const fila=new Array(maxCol).fill('');
  schema.colsFijas.forEach(c=>{fila[c.col]=datos[c.key]||'';});
  schema.gruposSesiones.forEach(g=>{const val=datos.sesiones?.[g.key]?.[0]||'';if(val)fila[g.col]=val;});
  schema.colsMeta.forEach(c=>{fila[c.col]=datos[c.key]||'';});
  try {
    const sheets=await getSheets();
    await sheets.spreadsheets.values.append({spreadsheetId:SPREADSHEET_ID_3,range:`'${hoja}'!A5`,valueInputOption:'USER_ENTERED',insertDataOption:'INSERT_ROWS',requestBody:{values:[fila]}});
    invalidarCache(`seguimiento:datos:${hoja}`);
    res.json({success:true});
  } catch(error){res.status(500).json({error:error.message});}
});

// PUT /api/seguimiento/:hoja/sesion
app.put('/api/seguimiento/:hoja/sesion', async (req, res) => {
  const hoja=decodeURIComponent(req.params.hoja);
  const schema=SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) return res.status(400).json({error:'Hoja sin schema definido.'});
  const {rowNum,grupoKey,fecha}=req.body;
  if (!rowNum||!grupoKey||!fecha) return res.status(400).json({error:'rowNum, grupoKey y fecha son requeridos.'});
  const grupo=schema.gruposSesiones.find(g=>g.key===grupoKey);
  if (!grupo) return res.status(400).json({error:`Grupo "${grupoKey}" no existe en esta hoja.`});
  try {
    const sheets=await getSheets();
    const response=await sheets.spreadsheets.values.get({spreadsheetId:SPREADSHEET_ID_3,range:`'${hoja}'!A${rowNum}:ZZ${rowNum}`});
    const filaActual=(response.data.values||[[]])[0]||[];
    let colLibre=-1;
    for(let s=0;s<grupo.sesiones;s++){if(!(filaActual[grupo.col+s]||'').trim()){colLibre=grupo.col+s;break;}}
    if (colLibre===-1) return res.status(400).json({error:`Ya se completaron todas las sesiones de "${grupo.label}".`});
    const colLetra=colToLetter(colLibre);
    await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID_3,range:`'${hoja}'!${colLetra}${rowNum}`,valueInputOption:'USER_ENTERED',requestBody:{values:[[fecha]]}});
    invalidarCache(`seguimiento:datos:${hoja}`);
    res.json({success:true,sesionAgregada:colLibre-grupo.col+1,columna:colLetra});
  } catch(error){res.status(500).json({error:error.message});}
});

// PUT /api/seguimiento/:hoja/meta
app.put('/api/seguimiento/:hoja/meta', async (req, res) => {
  const hoja=decodeURIComponent(req.params.hoja);
  const schema=SCHEMA_SEGUIMIENTO[hoja];
  if (!schema) return res.status(400).json({error:'Hoja sin schema definido.'});
  const {rowNum,...campos}=req.body;
  if (!rowNum) return res.status(400).json({error:'rowNum requerido.'});
  try {
    const sheets=await getSheets();
    const requests=[];
    schema.colsMeta.forEach(c=>{if(campos[c.key]!==undefined)requests.push({range:`'${hoja}'!${colToLetter(c.col)}${rowNum}`,values:[[campos[c.key]]]});});
    if (!requests.length) return res.json({success:true,mensaje:'Nada que actualizar.'});
    await sheets.spreadsheets.values.batchUpdate({spreadsheetId:SPREADSHEET_ID_3,requestBody:{valueInputOption:'USER_ENTERED',data:requests}});
    invalidarCache(`seguimiento:datos:${hoja}`);
    res.json({success:true,camposActualizados:requests.length});
  } catch(error){res.status(500).json({error:error.message});}
});

// ─── ENDPOINT DR. UMARI ───────────────────────────────────────────────────
app.post('/api/gemini', async (req, res) => {
  const {mensaje,historial,contexto}=req.body;
  const ANTHROPIC_API_KEY=process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({error:'ANTHROPIC_API_KEY no configurado.'});
  try {
    const messages=[];
    if (historial?.length>0) historial.forEach(h=>messages.push({role:h.rol==='user'?'user':'assistant',content:h.texto}));
    messages.push({role:'user',content:mensaje});
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:500,system:`Eres Dr. Umari, asistente IA de la Lic. Janeth Karina Santa Cruz Espíritu, psicóloga del Centro de Salud Tambillo-Umari, Huánuco, Perú. Ayúdala con sus pacientes, citas, estadísticas y diagnósticos CIE-10. Responde siempre en español, sé conciso (máximo 3-4 oraciones), usa emojis ocasionalmente. CONTEXTO ACTUAL: ${contexto||'Sin contexto disponible'}`,messages})});
    if (!response.ok){const err=await response.json();throw new Error(err.error?.message||`Error ${response.status}`);}
    const data=await response.json();
    res.json({respuesta:data.content?.[0]?.text||'Lo siento, no pude generar una respuesta.'});
  } catch(error){
    console.error('[POST /api/gemini] ERROR:',error.message);
    res.status(500).json({error:error.message});
  }
});

const PORT = process.env.PORT||3001;
app.listen(PORT, () => console.log(`✅ Backend corriendo en http://localhost:${PORT}`));