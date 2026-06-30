const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { getSheets, auth, COLUMNAS, HEADER_MAP, MESES_NOMBRES, buildColIndex, getNombreHoja, getMesDesdeFecha, datosAFila, SPREADSHEET_ID } = require('../lib/sheets');

// GET /api/debug-fila
router.get('/debug-fila', async (req, res) => {
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

// GET /api/test-conexion
router.get('/test-conexion', async (req, res) => {
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

// GET /api/registros
router.get('/registros', async (req, res) => {
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

// POST /api/registro
router.post('/registro', async (req, res) => {
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

// PUT /api/registro/:fila
router.put('/registro/:fila', async (req, res) => {
  const hoja=getNombreHoja(req.body.mes),numFila=req.params.fila;
  try {
    const sheets=await getSheets();
    const fila=datosAFila(req.body);
    await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A${numFila}`,valueInputOption:'USER_ENTERED',requestBody:{values:[fila]}});
    res.json({success:true});
  } catch(error){res.status(500).json({error:error.message});}
});

// DELETE /api/registro/:fila
router.delete('/registro/:fila', async (req, res) => {
  const hoja=getNombreHoja(req.query.mes),numFila=req.params.fila;
  try {
    const sheets=await getSheets();
    await sheets.spreadsheets.values.update({spreadsheetId:SPREADSHEET_ID,range:`${hoja}!A${numFila}`,valueInputOption:'USER_ENTERED',requestBody:{values:[new Array(COLUMNAS.length).fill('')]}});
    res.json({success:true});
  } catch(error){res.status(500).json({error:error.message});}
});

// GET /api/listar-hojas
router.get('/listar-hojas', async (req, res) => {
  try {
    const sheets=await getSheets();
    const info=await sheets.spreadsheets.get({spreadsheetId:SPREADSHEET_ID});
    res.json(info.data.sheets.map(s=>({id:s.properties.sheetId,nombre:s.properties.title})));
  } catch(error){res.status(500).json({error:error.message});}
});

// GET /api/crear-todas-hojas
router.get('/crear-todas-hojas', async (req, res) => {
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

// GET /api/buscar
router.get('/buscar', async (req, res) => {
  const q=(req.query.q||'').trim(),tipo=(req.query.tipo||'todos'),qLower=q.toLowerCase();
  try {
    const sheets=await getSheets();
    const info=await sheets.spreadsheets.get({spreadsheetId:SPREADSHEET_ID});
    const existentes=new Set(info.data.sheets.map(s=>s.properties.title));
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

module.exports = router;
