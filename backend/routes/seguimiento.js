const express = require('express');
const router = express.Router();
const SCHEMA_SEGUIMIENTO = require('../schemas/seguimiento');
const { getSheets, getCached, setCache, invalidarCache, TTL, leerHojaSeguimiento, parsearPacientes, filaAPaciente, colToLetter, SPREADSHEET_ID_3 } = require('../lib/sheets');

// GET /api/seguimiento/hojas
router.get('/seguimiento/hojas', async (req, res) => {
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
router.get('/seguimiento/schema/:hoja', (req, res) => {
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
router.get('/seguimiento/buscar', async (req, res) => {
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
router.get('/seguimiento/:hoja/paciente/:dni', async (req, res) => {
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
router.get('/seguimiento/:hoja', async (req, res) => {
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
router.post('/seguimiento/:hoja/nuevo', async (req, res) => {
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
router.put('/seguimiento/:hoja/sesion', async (req, res) => {
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
router.put('/seguimiento/:hoja/meta', async (req, res) => {
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

module.exports = router;
