require('dotenv').config();
const express = require('express');
const cors = require('cors');

const verificarToken = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const registrosRoutes = require('./routes/registros');
const seguimientoRoutes = require('./routes/seguimiento');
const cemRoutes = require('./routes/cem');
const { SPREADSHEET_ID, SPREADSHEET_ID_2, SPREADSHEET_ID_3 } = require('./lib/sheets');
const USUARIOS = require('./config/usuarios');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_en_produccion';

const app = express();
app.use(cors({
  origin: ['https://salud-mental-tambillo.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

console.log(`[init] SPREADSHEET_ID   cargado: ${SPREADSHEET_ID}`);
console.log(`[init] SPREADSHEET_ID_2 cargado: ${SPREADSHEET_ID_2}`);
console.log(`[init] SPREADSHEET_ID_3 cargado: ${SPREADSHEET_ID_3}`);
console.log(`[init] JWT_SECRET configurado: ${JWT_SECRET !== 'cambiar_en_produccion' ? 'SÍ' : 'NO'}`);
console.log('[init] USUARIOS:', USUARIOS.map(u => ({ usuario: u.usuario, passwordOk: !!u.password })));

// Rutas públicas (sin auth): ping, login, búsqueda por DNI
app.use('/api', authRoutes);

// Middleware JWT — todas las rutas siguientes requieren token válido
app.use('/api', verificarToken);

// Rutas protegidas
app.use('/api', registrosRoutes);
app.use('/api', seguimientoRoutes);
app.use('/api', cemRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Backend corriendo en http://localhost:${PORT}`));
