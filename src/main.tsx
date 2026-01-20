// IMPORTANTE: Este import debe ser el PRIMERO para interceptar warnings antes de que se carguen los módulos de Supabase
import './utils/consoleInterceptors';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { CitasApp } from './components/citas'

// Inicializar listeners de estado de red (mejora 2026-01-20)
import { initializeNetworkListeners } from './stores/networkStore';
initializeNetworkListeners();

/**
 * Configuración de Rutas Principal
 * 
 * La aplicación tiene dos proyectos principales:
 * 
 * 1. PQNC AI Platform (/)
 *    - Sistema principal de QA con IA
 * 
 * 2. Sistema de Citas (/citas)
 *    - Sub-proyecto independiente
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Ruta principal - PQNC Platform */}
        <Route path="/*" element={<App />} />
        
        {/* Sub-proyecto de Citas */}
        <Route path="/citas/*" element={<CitasApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
