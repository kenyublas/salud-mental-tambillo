import React, { useState, useEffect, useRef, useCallback } from 'react';
import { obtenerRegistros, obtenerMesActual } from '../utils/sheets';
import apiFetch from '../utils/api';

const NOMBRE_ASISTENTE = 'Dr. Umari';

function CerebroIcon({ activo, hablando }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={activo ? "#a855f7" : "#6b7280"} />
          <stop offset="100%" stopColor={activo ? "#ec4899" : "#374151"} />
        </radialGradient>
        {activo && (
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#bgGrad)" />
      {hablando && (
        <>
          <circle cx="32" cy="32" r="30" fill="none" stroke="#ec4899" strokeWidth="2" opacity="0.6">
            <animate attributeName="r" values="30;38;30" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="32" cy="32" r="30" fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.4">
            <animate attributeName="r" values="30;44;30" dur="1s" begin="0.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="1s" begin="0.3s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      <g filter={activo ? "url(#glow)" : ""} transform="translate(10, 10) scale(0.68)">
        <path d="M32 8 C20 8 12 16 12 26 C12 32 14 37 18 40 C16 42 15 45 16 48 C17 52 21 54 25 53 C27 57 30 59 32 59"
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M32 8 C44 8 52 16 52 26 C52 32 50 37 46 40 C48 42 49 45 48 48 C47 52 43 54 39 53 C37 57 34 59 32 59"
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M32 10 C32 20 30 35 32 59" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <path d="M18 28 C22 25 26 27 24 31" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M16 38 C20 35 25 37 23 42" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M20 22 C23 19 27 21 26 25" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M46 28 C42 25 38 27 40 31" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M48 38 C44 35 39 37 41 42" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M44 22 C41 19 37 21 38 25" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        {activo && (
          <>
            <circle cx="22" cy="29" r="2" fill="#fbbf24" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="42" cy="29" r="2" fill="#34d399" opacity="0.9">
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="32" cy="20" r="1.5" fill="#60a5fa" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite"/>
            </circle>
          </>
        )}
      </g>
    </svg>
  );
}

// SVG Icons
const IconMic     = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>;
const IconSend    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>;
const IconTrash   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
const IconClose   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>;

function Burbuja({ msg }) {
  const esUser = msg.rol === 'user';
  return (
    <div className={`flex ${esUser ? "justify-end" : "justify-start"} mb-2`}>
      {!esUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 mr-2 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
      )}
      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
        esUser
          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-tr-sm"
          : "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm"
      }`}>
        {msg.texto}
      </div>
    </div>
  );
}

export default function CerebroFlotante() {
  const [abierto, setAbierto]       = useState(false);
  const [historial, setHistorial]   = useState([]);
  const [input, setInput]           = useState('');
  const [cargando, setCargando]     = useState(false);
  const [contexto, setContexto]     = useState('');
  const [escuchando, setEscuchando] = useState(false);
  const [saludado, setSaludado]     = useState(false);
  const chatRef  = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const cargarContexto = async () => {
      try {
        const mesActual = obtenerMesActual();
        const registros = await obtenerRegistros(mesActual);
        const total     = registros.length;
        const hoy       = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
        const hoyFmt    = `${String(new Date().getDate()).padStart(2,'0')}/${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`;
        const citasHoy  = registros.filter(p => p.fechaProxCita === hoyFmt).length;
        const positivos = registros.filter(p => p.resultadoTamizaje === 'Positivo').length;
        const gestantes = registros.filter(p => p.gestante === 'G' || p.gestante === 'P').length;

        const ctx = `Fecha: ${hoy}
Mes actual: ${mesActual}
Total pacientes este mes: ${total}
Atenciones hoy: ${registros.filter(p => p.fechaAtencion === hoyFmt).length}
Citas programadas para hoy: ${citasHoy}
Tamizaje positivo: ${positivos}
Gestantes activas: ${gestantes}
Ultimos pacientes: ${registros.slice(0, 3).map(p => p.nombres).filter(Boolean).join(', ')}`;

        setContexto(ctx);
      } catch {}
    };
    cargarContexto();
  }, []);

  useEffect(() => {
    if (abierto && !saludado && contexto) {
      setSaludado(true);
      enviarMensaje('Hola, dame un resumen del dia', true);
    }
  }, [abierto, saludado, contexto]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [historial, cargando]);

  const enviarMensaje = useCallback(async (texto, esAutomatico = false) => {
    if (!texto.trim() || cargando) return;
    const msgUser = { rol: 'user', texto: texto.trim() };
    if (!esAutomatico) { setHistorial(h => [...h, msgUser]); setInput(''); }
    setCargando(true);
    try {
      const historialEnviar = esAutomatico ? [] : historial;
      const data = await apiFetch('/api/gemini', {
        method: 'POST',
        body: JSON.stringify({ mensaje: texto.trim(), historial: historialEnviar, contexto }),
      });
      const msgBot = { rol: 'assistant', texto: data.respuesta };
      if (esAutomatico) setHistorial([msgBot]);
      else setHistorial(h => [...h, msgBot]);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.respuesta);
        utterance.lang = 'es-PE'; utterance.rate = 1.1; utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setHistorial(h => [...h, { rol: 'assistant', texto: `Lo siento, hubo un error: ${e.message}` }]);
    } finally { setCargando(false); }
  }, [historial, contexto, cargando]);

  const toggleVoz = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Tu navegador no soporta reconocimiento de voz.'); return;
    }
    if (escuchando) { recognitionRef.current?.stop(); setEscuchando(false); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-PE'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (e) => { const texto = e.results[0][0].transcript; setInput(texto); setEscuchando(false); enviarMensaje(texto); };
    recognition.onerror = () => setEscuchando(false);
    recognition.onend   = () => setEscuchando(false);
    recognitionRef.current = recognition;
    recognition.start(); setEscuchando(true);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(input); }
  };

  return (
    <>
      {abierto && (
        <div className="fixed bottom-24 right-4 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8"><CerebroIcon activo={true} hablando={cargando} /></div>
              <div>
                <p className="font-bold text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>{NOMBRE_ASISTENTE}</p>
                <p className="text-xs text-purple-200">{cargando ? 'Pensando...' : 'Asistente IA'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setHistorial([])}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Limpiar chat">
                <IconTrash />
              </button>
              <button onClick={() => setAbierto(false)}
                className="text-white/80 hover:text-white w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
                <IconClose />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 bg-gray-50/50" style={{ minHeight: '200px', maxHeight: '50vh' }}>
            {historial.length === 0 && !cargando && (
              <div className="text-center text-gray-400 py-8">
                <div className="w-16 h-16 mx-auto mb-3"><CerebroIcon activo={false} hablando={false} /></div>
                <p className="text-xs font-semibold">Hola Lic. Janeth</p>
                <p className="text-xs mt-1">Puedes preguntarme sobre tus pacientes, citas o estadisticas</p>
              </div>
            )}
            {historial.map((msg, i) => <Burbuja key={i} msg={msg} />)}
            {cargando && (
              <div className="flex justify-start mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 mr-2 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-purple-400"
                        style={{ animation: `bounce 0.8s ease-in-out ${i*0.15}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sugerencias */}
          {historial.length <= 1 && !cargando && (
            <div className="px-3 py-2 flex gap-1.5 flex-wrap border-t border-gray-100">
              {['Pacientes hoy', 'Citas pendientes', 'Resumen del mes'].map(s => (
                <button key={s} onClick={() => enviarMensaje(s)}
                  className="text-[10px] font-semibold bg-purple-50 text-purple-600 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-gray-100 flex gap-2 items-end">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Escribe tu pregunta..." rows={1}
              className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-400 transition-colors"
              style={{ maxHeight: '80px' }} />
            <button onClick={toggleVoz}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                escuchando ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`} title="Hablar">
              <IconMic />
            </button>
            <button onClick={() => enviarMensaje(input)} disabled={!input.trim() || cargando}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0">
              <IconSend />
            </button>
          </div>
        </div>
      )}

      {/* Boton flotante */}
      <button onClick={() => setAbierto(a => !a)}
        className="fixed bottom-5 right-5 z-50 w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: abierto ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'white',
          boxShadow: abierto ? '0 0 30px rgba(168,85,247,0.6), 0 8px 32px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.15)',
        }}
        title={`${NOMBRE_ASISTENTE} — Asistente IA`}>
        <div className="w-full h-full p-2">
          <CerebroIcon activo={abierto} hablando={cargando} />
        </div>
      </button>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}