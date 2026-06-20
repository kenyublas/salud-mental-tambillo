import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [usuario, setUsuario]   = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');
  const [verPass, setVerPass]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario || !password) {
      setError('Por favor ingresa usuario y contraseña.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión.');
      // Guardar token
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', data.usuario);
      onLogin(data.token, data.usuario);
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
          <p className="text-sm text-gray-500 mt-1 font-medium">C.S. Tambillo — Huánuco</p>
        </div>

        {/* Card de login */}
        <div className="card shadow-xl border border-rosa-100">
          <h2 className="text-base font-bold text-gray-700 mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
            🔐 Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="input-field w-full"
                autoComplete="username"
                disabled={cargando}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Contraseña</label>
              <div className="relative">
                <input
                  type={verPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="input-field w-full pr-10"
                  autoComplete="current-password"
                  disabled={cargando}
                />
                <button
                  type="button"
                  onClick={() => setVerPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  tabIndex={-1}
                >
                  {verPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="btn-rosa w-full flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sistema de Gestión de Pacientes · v1.0
        </p>
      </div>
    </div>
  );
}