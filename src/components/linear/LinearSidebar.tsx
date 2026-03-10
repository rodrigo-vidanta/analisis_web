import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAppStore } from '../../stores/appStore';
import { useAnalysisPermissions } from '../../hooks/useAnalysisPermissions';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';

interface LinearSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const LinearSidebar: React.FC<LinearSidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, canAccessModule } = useAuth();
  const { profile } = useUserProfile();
  const { appMode, setAppMode } = useAppStore();
  const { pqnc, liveMonitor } = useAnalysisPermissions();
  const { isAdmin } = useEffectivePermissions();

  const menuItems = [
    // PQNC Humans
    ...(pqnc ? [{
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: 'PQNC Humans',
      active: appMode === 'pqnc',
      onClick: () => setAppMode('pqnc')
    }] : []),

    // AI Call Monitor
    ...(liveMonitor ? [{
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728m-9.192 0a9 9 0 010-12.728M6.464 8.464a5 5 0 000 7.072" />
          </svg>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
        </div>
      ),
      label: 'AI Call Monitor',
      active: appMode === 'live-monitor',
      onClick: () => setAppMode('live-monitor')
    }] : []),


  ];

  // Botón de admin separado para ir abajo - Usar canAccessModule para incluir administrador_operativo
  const adminButton = canAccessModule('admin') ? {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Administración',
    active: appMode === 'admin',
    onClick: () => setAppMode('admin')
  } : null;

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      
      {/* Header del sidebar */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">PQNC AI</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Platform</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
                isCollapsed ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation principal */}
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              item.active
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className={`transition-colors duration-200 ${
              item.active 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
            }`}>
              {item.icon}
            </div>
            
            {!isCollapsed && (
              <span className="truncate">{item.label}</span>
            )}
            
            {/* Indicador activo */}
            {item.active && (
              <div className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Botón de Admin abajo */}
      {adminButton && (
        <div className="p-2 border-t border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={adminButton.onClick}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              adminButton.active
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className={`transition-colors duration-200 ${
              adminButton.active 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
            }`}>
              {adminButton.icon}
            </div>
            
            {!isCollapsed && (
              <span className="truncate">{adminButton.label}</span>
            )}
            
            {/* Indicador activo */}
            {adminButton.active && (
              <div className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
            )}
          </button>
        </div>
      )}

      {/* User profile */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {(user?.first_name || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.first_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.role_name || 'User'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinearSidebar;
