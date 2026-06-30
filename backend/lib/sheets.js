require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

// ─── CONSTANTES DE SPREADSHEET ────────────────────────────────────────────────
const SPREADSHEET_ID   = process.env.SPREADSHEET_ID;
const SPREADSHEET_ID_2 = process.env.SPREADSHEET_ID_2;
const SPREADSHEET_ID_3 = process.env.SPREADSHEET_ID_3;

// ─── AUTENTICACIÓN GOOGLE ─────────────────────────────────────────────────────
let auth;
if (process.env.GOOGLE_CREDENTIALS) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} else {
  auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// ─── CACHÉ EN MEMORIA ─────────────────────────────────────────────────────────
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

// ─── COLUMNAS RUA ─────────────────────────────────────────────────────────────
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

const MESES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

// ─── HELPERS RUA ──────────────────────────────────────────────────────────────
function normalizeHeader(text) {
  return (text||'').toUpperCase().trim().normalize('NFD').replace(/[̀-ͯ]/g,'');
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
  const mesNombre = MESES_NOMBRES[new Date().getMonth()];
  const anio = new Date().getFullYear();
  return anio <= 2025 ? mesNombre : mesNombre + ' ' + anio;
}

function getMesDesdeFecha(fecha) {
  if (!fecha) return getNombreHoja(null);
  const d = new Date(fecha);
  if (isNaN(d)) return getNombreHoja(null);
  const mes = MESES_NOMBRES[d.getMonth()];
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

// ─── HELPERS SEGUIMIENTO ──────────────────────────────────────────────────────
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

module.exports = {
  auth,
  getSheets,
  getCached,
  setCache,
  invalidarCache,
  TTL,
  SPREADSHEET_ID,
  SPREADSHEET_ID_2,
  SPREADSHEET_ID_3,
  COLUMNAS,
  HEADER_MAP,
  MESES_NOMBRES,
  normalizeHeader,
  buildColIndex,
  getNombreHoja,
  getMesDesdeFecha,
  formatearFecha,
  datosAFila,
  leerHojaSeguimiento,
  parsearPacientes,
  filaAPaciente,
  colToLetter,
};
