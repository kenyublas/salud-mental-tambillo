import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Registro from './pages/Registro';
import Pacientes from './pages/Pacientes';
import Seguimiento from './pages/Seguimiento';
import { Gestantes, Referencias, AppsSM } from './pages/OtrasPaginas';
import Login from './pages/Login';
import { isLoggedIn, getUsuario, logout } from './utils/auth';
import CerebroFlotante from './components/CerebroFlotante';
import CEM from './pages/CEM';
export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [usuario, setUsuario]   = useState(getUsuario() || '');

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  const handleLogin = (token, user) => {
    setLoggedIn(true);
    setUsuario(user);
  };

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    setUsuario('');
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-rosa-50 via-white to-celeste-50">
        <Navbar usuario={usuario} onLogout={handleLogout} />
        <main>
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/registro"    element={<Registro />} />
            <Route path="/pacientes"   element={<Pacientes />} />
            <Route path="/seguimiento" element={<Seguimiento />} />
            <Route path="/gestantes"   element={<Gestantes />} />
            <Route path="/referencias" element={<Referencias />} />
            <Route path="/apps"        element={<AppsSM />} />
            <Route path="/cem"         element={<CEM />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <CerebroFlotante />
      </div>
    </BrowserRouter>
  );
}