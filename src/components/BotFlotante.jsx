import React from 'react';

export default function BotFlotante({ activo, pausado, escuchando, procesando, mensajeBot, campoActual, campo, onToggle }) {

  const getEstado = () => {
    if (!activo) return 'inactivo';
    if (pausado) return 'pausado';
    if (procesando) return 'procesando';
    if (escuchando) return 'escuchando';
    return 'escuchando';
  };

  const estado = getEstado();

  const colores = {
    inactivo:    'from-rosa-400 to-rosa-600',
    escuchando:  'from-rosa-500 to-pink-600',
    procesando:  'from-celeste-400 to-celeste-600',
    pausado:     'from-gray-400 to-gray-500',
  };

  const tooltip = {
    inactivo:   'Activar asistente IA',
    escuchando: 'Pausar asistente',
    procesando: 'Procesando...',
    pausado:    'Reanudar asistente',
  };

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2">

      {/* Burbuja de mensaje */}
      {mensajeBot && activo && (
        <div className="slide-in-right bg-white border border-rosa-200 rounded-2xl rounded-br-sm shadow-lg px-4 py-2.5 max-w-[230px]">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-rosa-500">Asistente IA</span>
            {escuchando && !procesando && (
              <span className="flex gap-0.5 items-end h-3">
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 font-medium leading-tight">{mensajeBot}</p>
          {campo && activo && !pausado && (
            <div className="mt-1.5 text-xs text-celeste-600 font-semibold">
              Campo {campoActual + 1}: {campo.label}
            </div>
          )}
          {pausado && (
            <p className="mt-1 text-xs text-gray-400">Presiona el botón para continuar</p>
          )}
        </div>
      )}

      {/* Botón flotante */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onToggle}
          className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${colores[estado]} text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95`}
          title={tooltip[estado]}
        >
          {/* Anillos pulsantes cuando escucha */}
          {estado === 'escuchando' && (
            <>
              <span className="absolute inset-0 rounded-full bg-rosa-400 opacity-40"
                style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
              <span className="absolute inset-0 rounded-full bg-rosa-400 opacity-20"
                style={{ animation: 'pulse-ring 1.5s ease-out infinite', animationDelay: '0.6s' }} />
            </>
          )}

          {/* Ícono según estado */}
          {estado === 'escuchando' ? (
            <span className="flex gap-0.5 items-end h-5 relative z-10">
              <span className="wave-bar"></span>
              <span className="wave-bar"></span>
              <span className="wave-bar"></span>
              <span className="wave-bar"></span>
              <span className="wave-bar"></span>
            </span>
          ) : estado === 'procesando' ? (
            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : estado === 'pausado' ? (
            <span className="text-2xl">⏸️</span>
          ) : (
            <span className="text-2xl">🎤</span>
          )}
        </button>

        {/* Etiqueta debajo */}
        <span className="text-[10px] text-rosa-500 font-bold text-center leading-tight">
          {!activo ? 'Asistente IA' : pausado ? 'Pausado' : escuchando ? 'Escuchando' : 'IA activa'}
        </span>
      </div>
    </div>
  );
}
