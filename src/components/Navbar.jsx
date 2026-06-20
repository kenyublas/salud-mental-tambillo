import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/',            label: 'Dashboard',      icon: '📊' },
  { path: '/registro',   label: 'Nuevo Registro',  icon: '✏️' },
  { path: '/pacientes',  label: 'Pacientes',        icon: '👥' },
  { path: '/gestantes',  label: 'Gestantes',        icon: '🤰' },
  { path: '/referencias',label: 'Referencias',      icon: '📋' },
  { path: '/seguimiento',label: 'Seguimiento',      icon: '🗂️' },
  { path: '/apps',       label: 'APPs SM',          icon: '🏥' },
];

export default function Navbar({ usuario, onLogout }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    if (confirmLogout) {
      onLogout();
    } else {
      setConfirmLogout(true);
      setTimeout(() => setConfirmLogout(false), 3000);
    }
  };

  return (
    <>
      {/* TOP BAR */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-rosa-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rosa-400 to-rosa-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              🧠
            </div>
            <div>
              <p className="text-xs font-extrabold text-gray-800 leading-none" style={{ fontFamily: 'Poppins,sans-serif' }}>
                Salud Mental
              </p>
              <p className="text-[10px] text-rosa-400 font-semibold leading-none">C.S. Tambillo</p>
            </div>
          </div>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-rosa-100 text-rosa-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Usuario + logout desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-700">{usuario || 'Lic. Janeth'}</p>
              <p className="text-[10px] text-gray-400">Psicóloga</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-celeste-300 to-celeste-500 flex items-center justify-center text-white text-sm font-bold">
              {(usuario?.[0] || 'J').toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className={`ml-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                confirmLogout
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
              }`}
              title="Cerrar sesión"
            >
              {confirmLogout ? '¿Salir?' : '🚪'}
            </button>
          </div>

          {/* Hamburger mobile */}
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-rosa-50 text-gray-600"
          >
            {menuAbierto ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMenuAbierto(false)}>
          <div
            className="absolute top-14 left-0 right-0 bg-white border-b border-rosa-100 shadow-lg p-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Usuario mobile */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-rosa-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-celeste-300 to-celeste-500 flex items-center justify-center text-white font-bold">
                  {(usuario?.[0] || 'J').toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{usuario || 'Lic. Janeth'}</p>
                  <p className="text-xs text-gray-400">Psicóloga - C.S. Tambillo</p>
                </div>
              </div>
              {/* Botón logout mobile */}
              <button
                onClick={handleLogout}
                className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                  confirmLogout
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                }`}
              >
                {confirmLogout ? '¿Confirmar?' : '🚪 Salir'}
              </button>
            </div>

            {/* Nav mobile */}
            <nav className="flex flex-col gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-rosa-100 text-rosa-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}