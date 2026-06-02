import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Registro from './pages/Registro';
import Pacientes from './pages/Pacientes';
import { Gestantes, Referencias, AppsSM } from './pages/OtrasPaginas';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-rosa-50 via-white to-celeste-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/gestantes" element={<Gestantes />} />
            <Route path="/referencias" element={<Referencias />} />
            <Route path="/apps" element={<AppsSM />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
