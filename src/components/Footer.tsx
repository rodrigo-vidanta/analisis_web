import React, { useState } from 'react';
import CatChaseEasterEgg from './CatChaseEasterEgg';

const Footer: React.FC = () => {
  // Versión actual
  const version = 'v5.15.0 - Live Chat: Optimizaciones de Rendimiento';
  
  // Easter egg state
  const [clickCount, setClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  
  // Manejar clics en el gato
  const handleCatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 6) {
      setShowEasterEgg(true);
      setClickCount(0); // Reset counter
    }
    
    // Reset counter después de 3 segundos si no llega a 6
    setTimeout(() => {
      if (newCount < 6) {
        setClickCount(0);
      }
    }, 3000);
  };
  
  // Cerrar easter egg
  const handleCloseEasterEgg = () => {
    setShowEasterEgg(false);
    setClickCount(0);
  };

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            
            {/* Texto principal */}
            <span className="font-medium">
              AI Builder & Analysis Platform
            </span>
            
            {/* Separador */}
            <span className="text-slate-300 dark:text-slate-600">•</span>
            
            {/* Powered by */}
            <div className="flex items-center gap-1">
              <span>Powered by</span>
              <div className="flex items-center gap-1">
                {/* React icon */}
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89s-.84 1.85-1.87 1.85-1.87-.82-1.87-1.85.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 0 1-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9s-1.17 0-1.71.03c-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03s1.17 0 1.71-.03c.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68s-1.83 2.93-4.37 3.68c.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.37 1.95-1.47-.84-1.63-3.05-1.01-5.63-2.54-.75-4.37-1.99-4.37-3.68s1.83-2.93 4.37-3.68c-.62-2.58-.46-4.79 1.01-5.63 1.46-.84 3.45.12 5.37 1.95 1.92-1.83 3.91-2.79 5.37-1.95z"/>
                </svg>
                <span className="font-medium text-blue-600 dark:text-blue-400">React</span>
              </div>
              
              <span className="text-slate-400 dark:text-slate-500">+</span>
              
              {/* Vite icon */}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.286 10.578l7.97-7.93A.535.535 0 0 1 17 3a.535.535 0 0 1 .744.648l-7.97 7.93a.535.535 0 0 1-.488 0z"/>
                  <path d="M11.157 14.4 16.8 2.8a1.067 1.067 0 0 1 1.933.533l-5.643 11.6a1.067 1.067 0 0 1-1.933-.533z"/>
                </svg>
                <span className="font-medium text-purple-600 dark:text-purple-400">Vite</span>
              </div>
            </div>
            
            {/* Separador */}
            <span className="text-slate-300 dark:text-slate-600">•</span>
            
            {/* Diseñado por */}
            <div className="flex items-center gap-1">
              <span>Designed by</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">SamuelRosales</span>
            </div>
            
            {/* Separador */}
            <span className="text-slate-300 dark:text-slate-600">•</span>
            
            {/* Versión Nightly con gato negro clickeable */}
            <div className="flex items-center gap-2">
              {/* Icono de gato - Easter Egg secreto */}
              <div
                onClick={handleCatClick}
                className="w-4 h-4 text-slate-700 dark:text-slate-300 cursor-default select-none"
              >
                <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12c0-1.5.5-3 2-4 1.5-1 3.5-1 5 0s3.5 1 5 0c1.5 1 2 2.5 2 4v3c0 2-1 3-3 3H9c-2 0-3-1-3-3v-3z"/>
                  <circle cx="9" cy="10" r="1"/>
                  <circle cx="15" cy="10" r="1"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 13v1"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 4l1 2"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 4l-1 2"/>
                </svg>
              </div>
              
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                {version}
              </span>
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Easter Egg Component */}
      <CatChaseEasterEgg 
        isVisible={showEasterEgg}
        onClose={handleCloseEasterEgg}
      />
    </footer>
  );
};

export default Footer;
