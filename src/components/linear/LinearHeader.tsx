import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { AssignmentBadge } from '../analysis/AssignmentBadge';

interface LinearHeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentMode: string;
  onToggleSidebar: () => void;
}

const LinearHeader: React.FC<LinearHeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  currentMode,
  onToggleSidebar
}) => {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();

  const getModuleTitle = () => {
    switch (currentMode) {
      case 'constructor': return 'Constructor de Agentes';
      case 'plantillas': return 'Plantillas';
      case 'natalia': return 'Natalia IA';
      case 'pqnc': return 'PQNC Humans';
      case 'live-monitor': return 'AI Call Monitor';
      case 'live-chat': return 'AI Chat Monitor';
      case 'admin': return 'Administración';
      default: return 'PQNC AI Platform';
    }
  };

  return (
    <header className="h-16 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="h-full px-6 flex items-center justify-between">
        
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getModuleTitle()}
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          
          {/* Theme toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-500 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.first_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
            
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {(user?.first_name || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Mostrar coordinación para ejecutivos */}
            {user?.role_name === 'ejecutivo' && profile?.coordinacion_codigo && (
              <AssignmentBadge
                call={{
                  coordinacion_codigo: profile.coordinacion_codigo,
                  coordinacion_nombre: profile.coordinacion_nombre
                } as any}
                variant="header"
              />
            )}
            
            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5 text-gray-500 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LinearHeader;
