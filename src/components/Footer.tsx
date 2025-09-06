import React from 'react';

const Footer: React.FC = () => {
  // Versión nightly manual
  const version = 'Nightly v.1.0.3';

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-4">
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
            
            {/* Versión Nightly con gato negro */}
            <div className="flex items-center gap-2">
              {/* Icono de gato negro */}
              <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13 3V5C12.5 5 12 5.2 12 5.5C12 5.8 12.5 6 13 6V8L11 10V12H13V10.5L15 8.5V11C15 12.1 15.9 13 17 13S19 12.1 19 11V9H21ZM7.5 12C8.3 12 9 12.7 9 13.5S8.3 15 7.5 15 6 14.3 6 13.5 6.7 12 7.5 12ZM16.5 12C17.3 12 18 12.7 18 13.5S17.3 15 16.5 15 15 14.3 15 13.5 15.7 12 16.5 12ZM12 16C14.2 16 16 17.8 16 20C16 21.1 15.1 22 14 22H10C8.9 22 8 21.1 8 20C8 17.8 9.8 16 12 16Z"/>
              </svg>
              
              <span className="font-mono text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1 rounded-full border border-slate-700 dark:border-slate-300 shadow-sm">
                {version}
              </span>
            </div>
            
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
