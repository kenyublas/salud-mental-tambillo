import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerRegistros } from '../utils/sheets';

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const obtenerMesActual = () => {
  const now = new Date();
  const mes = MESES[now.getMonth()];
  const año = now.getFullYear();
  return año === 2025 ? mes : `${mes} ${año}`;
};

export function Gestantes() {
  const navigate = useNavigate();
  const [mesSeleccionado, setMesSeleccionado] = useState(obtenerMesActual);
  const [gestantes, setGestantes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    obtenerRegistros(mesSeleccionado)
      .then(data => {
        const lista = Array.isArray(data) ? data : [];
        setGestantes(lista.filter(p => p.gestante === 'G' || p.gestante === 'P'));
      })
      .finally(() => setLoading(false));
  }, [mesSeleccionado]);

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Gestantes / Puérperas
        </h1>
        <button onClick={() => navigate('/registro')} className="btn-rosa text-sm">+ Nueva</button>
      </div>

      {/* Selector de mes */}
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 flex-shrink-0">
          <span>📆</span> Período:
        </span>
        <div className="relative flex-1 max-w-xs">
          <select
            value={mesSeleccionado}
            onChange={e => setMesSeleccionado(e.target.value)}
            className="w-full appearance-none rounded-xl border-2 border-rosa-200 bg-gradient-to-r from-rosa-50 to-celeste-50 px-4 py-2 pr-9 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:border-rosa-400 cursor-pointer transition-colors"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <optgroup label="── 2025 ──">
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </optgroup>
            <optgroup label="── 2026 ──">
              {MESES.map(m => <option key={`${m} 2026`} value={`${m} 2026`}>{m} 2026</option>)}
            </optgroup>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-rosa-400 text-xs font-bold">▼</span>
        </div>
        {loading && (
          <div className="w-5 h-5 border-2 border-rosa-200 border-t-rosa-500 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 border-4 border-rosa-200 border-t-rosa-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-rosa-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Cargando gestantes de {mesSeleccionado}...
          </p>
        </div>
      ) : gestantes.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🤰</p>
          <p className="text-sm">No hay gestantes registradas en {mesSeleccionado}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-rosa-50 to-celeste-50">
                {['Nombre','DNI','Edad','G/P','FUR','Semanas','F. Probable Parto','Sector','Profesional','F. Atención'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-600 whitespace-nowrap border-b border-rosa-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gestantes.map((g, idx) => (
                <tr key={g.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-rosa-50/40'}>
                  <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{g.nombres}</td>
                  <td className="px-3 py-2 text-gray-500">{g.dni}</td>
                  <td className="px-3 py-2 text-gray-500">{g.edad}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${g.gestante === 'G' ? 'bg-purple-100 text-purple-700' : 'bg-celeste-100 text-celeste-700'}`}>
                      {g.gestante === 'G' ? 'Gestante' : 'Puérpera'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{g.fur || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-center">{g.semanaGestacional || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{g.fechaProbableParto || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{g.sector}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{g.profesional}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{g.fechaAtencion}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3 px-1">{gestantes.length} gestante(s) en {mesSeleccionado}</p>
        </div>
      )}
    </div>
  );
}

export function Referencias() {
  const [refs] = useState([
    { id:1, fecha:'2023-01-16', origen:'CS. PANAO', nombres:'Kiliam Jahir Trujillo Rojas', dni:'91930799', seguro:'SIS', codDiag:'F809', descripcion:'Habla y Lenguaje', profesional:'Psico. Isabel' },
    { id:2, fecha:'2023-02-23', origen:'CS. PANAO', nombres:'Jose Jhomar Meneses Aguirre', dni:'61020275', seguro:'SIS', codDiag:'F412', descripcion:'Trastorno ansioso', profesional:'Psico. Belex' },
    { id:3, fecha:'2023-03-16', origen:'CS. PANAO', nombres:'Violeta Tucto Borja', dni:'42397821', seguro:'SIS', codDiag:'F413', descripcion:'', profesional:'Psico. Isabel' },
  ]);

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-extrabold text-gray-800 mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
        📋 Referencias / Contrarreferencias
      </h1>

      <div className="space-y-3">
        {refs.map(r => (
          <div key={r.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-celeste-100 flex items-center justify-center text-celeste-700 font-bold text-sm flex-shrink-0">
                {r.id}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-bold text-gray-800 text-sm">{r.nombres}</p>
                  <span className="text-xs text-gray-400">{r.fecha}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">DNI: {r.dni} · {r.origen} · {r.profesional}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-celeste-100 text-celeste-700 px-2 py-0.5 rounded-full font-semibold">{r.codDiag}</span>
                  {r.descripcion && <span className="text-xs text-gray-500">{r.descripcion}</span>}
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{r.seguro}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppsSM() {
  const [actividades] = useState([
    { mes:'ENERO', n:1, fecha:'', sesion:'', app:'', participantes:'', lugar:'', responsable:'', turno:'' },
  ]);

  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-extrabold text-gray-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
        🏥 APPs en Salud Mental
      </h1>
      <p className="text-sm text-gray-400 mb-5">Actividades de Salud Mental - C.S. Tambillo</p>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-celeste-50">
                {['Mes','N°','Fecha','Sesión Educativa','APP-Población','Participantes','Lugar','Responsable','Turno'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-bold text-celeste-700 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meses.map(mes => (
                <React.Fragment key={mes}>
                  <tr className="bg-rosa-50">
                    <td colSpan={9} className="px-3 py-1.5 font-bold text-rosa-700 text-xs">{mes}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    {['','','','','','','','',''].map((_, i) => (
                      <td key={i} className="px-2 py-2">
                        <input className="w-full border-b border-dashed border-gray-200 bg-transparent outline-none text-xs py-0.5" placeholder="..." />
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
