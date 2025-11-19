// IMPORTANTE: Este import debe ser el PRIMERO para interceptar warnings antes de que se carguen los módulos de Supabase
import './utils/consoleInterceptors';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)