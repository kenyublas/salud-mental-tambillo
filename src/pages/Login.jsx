import React, { useState } from 'react';

const IconKey = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
  </svg>
);

const IconEye = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const IconEyeOff = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
  </svg>
);

const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
  </svg>
);

export default function Login({ onLogin }) {
  const [usuario, setUsuario]   = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');
  const [verPass, setVerPass]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario || !password) { setError('Por favor ingresa usuario y contrasena.'); return; }
    setCargando(true); setError('');
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesion.');

      // Guardar token y datos del usuario
      localStorage.setItem('token',   data.token);
      localStorage.setItem('usuario', data.usuario);
      localStorage.setItem('nombre',  data.nombre);   // ← nuevo
      localStorage.setItem('titulo',  data.titulo);   // ← nuevo

      onLogin(data.token, data.usuario, data.nombre, data.titulo);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rosa-50 via-white to-celeste-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo-minsa.png"    alt="MINSA"    className="h-10 object-contain" onError={e => e.target.style.display='none'} />
            <img src="/logo-diresa.png"   alt="DIRESA"   className="h-10 object-contain" onError={e => e.target.style.display='none'} />
            <img src="/logo-tambillo.png" alt="Tambillo" className="h-10 object-contain" onError={e => e.target.style.display='none'} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Salud Mental
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">C.S. Tambillo — Huanuco</p>
        </div>

        {/* Card */}
        <div className="card shadow-xl border border-rosa-100">
          <h2 className="text-base font-bold text-gray-700 mb-5 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <IconKey /> Iniciar Sesion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Usuario</label>
              <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
                placeholder="Ingresa tu usuario" className="input-field w-full"
                autoComplete="username" disabled={cargando} />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Contrasena</label>
              <div className="relative">
                <input type={verPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contrasena" className="input-field w-full pr-10"
                  autoComplete="current-password" disabled={cargando} />
                <button type="button" onClick={() => setVerPass(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {verPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5 flex items-center gap-2">
                <IconWarning /><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={cargando}
              className="btn-rosa w-full flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {cargando ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Iniciando sesion...</>
              ) : (
                <><IconKey />Iniciar Sesion</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sistema de Gestion de Pacientes v1.0
        </p>
      </div>
    </div>
  );
}