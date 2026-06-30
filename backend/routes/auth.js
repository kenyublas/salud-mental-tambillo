const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const USUARIOS = require('../config/usuarios');
const { getSheets, COLUMNAS, HEADER_MAP, MESES_NOMBRES, buildColIndex, SPREADSHEET_ID } = require('../lib/sheets');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_en_produccion';

// GET /api/ping
router.get('/ping', (req, res) => res.json({ ok: true, mensaje: 'Backend Salud Mental Tambillo activo' }));

// POST /api/login
router.post('/login', (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  const user = USUARIOS.find(u => u.usuario === usuario && u.password === password);
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  const token = jwt.sign({ usuario:user.usuario, nombre:user.nombre, titulo:user.titulo, rol:user.rol }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ ok:true, token, usuario:user.usuario, nombre:user.nombre, titulo:user.titulo, rol:user.rol, expira:'8h' });
});

// GET /api/dni/:numero (público — busca en Sheets primero, luego RENIEC)
router.get('/dni/:numero', async (req, res) => {
  const dni = req.params.numero.trim();
  if (!/^\d{8}$/.test(dni)) return res.status(400).json({ error: 'DNI debe tener exactamente 8 dígitos.' });
  try {
    const sheets = await getSheets();
    const info = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existentes = new Set(info.data.sheets.map(s => s.properties.title));
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

module.exports = router;
