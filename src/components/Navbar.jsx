import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconShield    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
const IconDashboard = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
const IconEdit      = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
const IconUsers     = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const IconHeart     = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>;
const IconClipboard = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
const IconFolder    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>;
const IconHospital  = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>;
const IconLogout    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>;
const IconMenu      = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>;
const IconClose     = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>;

const navItems = [
  { path: '/',            label: 'Dashboard',      icon: <IconDashboard /> },
  { path: '/registro',    label: 'Nuevo Registro', icon: <IconEdit /> },
  { path: '/pacientes',   label: 'Pacientes',      icon: <IconUsers /> },
  { path: '/gestantes',   label: 'Gestantes',      icon: <IconHeart /> },
  { path: '/referencias', label: 'Referencias',    icon: <IconClipboard /> },
  { path: '/seguimiento', label: 'Seguimiento',    icon: <IconFolder /> },
  { path: '/apps',        label: 'APPs SM',        icon: <IconHospital /> },
  { path: '/cem',         label: 'CEM',            icon: <IconShield /> },
];

export default function Navbar({ usuario, onLogout }) {
  const [menuAbierto, setMenuAbierto]     = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    if (confirmLogout) { onLogout(); }
    else { setConfirmLogout(true); setTimeout(() => setConfirmLogout(false), 3000); }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-rosa-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">

          {/* Logo — clickeable, va al inicio */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm bg-white flex items-center justify-center">
              <img
                src="/logo-red.png"
                alt="Red de Salud Pachitea"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-extrabold text-gray-800 leading-none" style={{ fontFamily: 'Poppins,sans-serif' }}>
                Salud Mental
              </p>
              <p className="text-[10px] text-rosa-400 font-semibold leading-none">C.S. Tambillo</p>
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive ? 'bg-rosa-100 text-rosa-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`
                }>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Usuario + logout desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-700">{usuario || 'Lic. Janeth'}</p>
              <p className="text-[10px] text-gray-400">Psicologa</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-celeste-300 to-celeste-500 flex items-center justify-center text-white text-sm font-bold">
              {(usuario?.[0] || 'J').toUpperCase()}
            </div>
            <button onClick={handleLogout}
              className={`ml-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                confirmLogout ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
              }`} title="Cerrar sesion">
              <IconLogout />
              {confirmLogout ? 'Salir?' : 'Salir'}
            </button>
          </div>

          {/* Hamburger mobile */}
          <button onClick={() => setMenuAbierto(!menuAbierto)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-rosa-50 text-gray-600">
            {menuAbierto ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMenuAbierto(false)}>
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-rosa-100 shadow-lg p-4"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-rosa-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-100 shadow-sm">
                  <img src="/logo-red.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{usuario || 'Lic. Janeth'}</p>
                  <p className="text-xs text-gray-400">Psicologa - C.S. Tambillo</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  confirmLogout ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                }`}>
                <IconLogout />
                {confirmLogout ? 'Confirmar?' : 'Salir'}
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map(item => (
                <NavLink key={item.path} to={item.path} end={item.path === '/'}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? 'bg-rosa-100 text-rosa-700' : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="h-14" />
    </>
  );
}