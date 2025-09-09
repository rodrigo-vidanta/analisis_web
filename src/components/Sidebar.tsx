import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { useUserProfile } from '../hooks/useUserProfile';
import useAnalysisPermissions from '../hooks/useAnalysisPermissions';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  submenu?: SubMenuItemProps[];
  hasSubmenu?: boolean;
  isCollapsed?: boolean;
}

interface SubMenuItemProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, active, onClick, submenu, hasSubmenu, isCollapsed }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (hasSubmenu) {
      setIsExpanded(!isExpanded);
    } else {
      onClick?.();
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'} rounded-lg transition-all duration-200 text-sm font-medium group ${
          active
            ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title={label}
      >
        {isCollapsed ? (
          // Modo colapsado: solo icono centrado
          <div className="w-5 h-5 flex-shrink-0">
            {icon}
          </div>
        ) : (
          // Modo expandido: icono + texto + flecha
          <>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 flex-shrink-0">
                {icon}
              </div>
              <span className="truncate">{label}</span>
            </div>
            {hasSubmenu && (
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </>
        )}
      </button>
      
      {hasSubmenu && isExpanded && submenu && !isCollapsed && (
        <div className="mt-1 ml-8 space-y-1">
          {submenu.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${
                item.active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : item.disabled
                  ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, canAccessModule } = useAuth();
  const { profile } = useUserProfile();
  const { appMode, setAppMode } = useAppStore();
  const { natalia, pqnc, liveMonitor } = useAnalysisPermissions();
  const [analysisMode, setAnalysisMode] = useState<'natalia' | 'pqnc'>('natalia');

  const handleAnalysisChange = (mode: 'natalia' | 'pqnc') => {
    setAnalysisMode(mode);
    setAppMode('analisis');
    // Aquí podrías agregar lógica adicional para cambiar el submódulo
  };

  const menuItems: MenuItemProps[] = [
    // Constructor
    ...(canAccessModule('constructor') ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: 'Constructor',
      active: appMode === 'constructor',
      onClick: () => setAppMode('constructor')
    }] : []),

    // Plantillas
    ...(canAccessModule('plantillas') ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: 'Plantillas',
      active: appMode === 'plantillas',
      onClick: () => setAppMode('plantillas')
    }] : []),

    // Agent Studio - Solo para Admin y Developer
    ...((user?.role_name === 'admin' || user?.role_name === 'developer') ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      label: 'Agent Studio',
      active: appMode === 'agent-studio',
      onClick: () => setAppMode('agent-studio')
    }] : []),

    // Natalia IA como módulo independiente - PERMISOS ESPECÍFICOS
    ...(canAccessModule('analisis') && natalia ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      label: 'Natalia IA',
      active: appMode === 'natalia',
      onClick: () => setAppMode('natalia')
    }] : []),

    // PQNC Humans como módulo independiente - PERMISOS ESPECÍFICOS
    ...(canAccessModule('analisis') && pqnc ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: 'PQNC Humans',
      active: appMode === 'pqnc',
      onClick: () => setAppMode('pqnc')
    }] : []),

    // Live Monitor - nuevo módulo con permisos específicos
    ...(liveMonitor ? [{
      icon: (
        <div className="relative">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      ),
      label: 'Live Monitor',
      active: appMode === 'live-monitor',
      onClick: () => setAppMode('live-monitor')
    }] : [])
  ];

  // Admin al final
  const adminItem: MenuItemProps | null = user?.role_name === 'admin' ? {
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Administración',
    active: appMode === 'admin',
    onClick: () => setAppMode('admin')
  } : null;

  return (
    <>
      {/* Overlay para móviles */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 z-50 flex flex-col ${
        isCollapsed 
          ? '-translate-x-full lg:translate-x-0 lg:w-16' 
          : 'w-64 translate-x-0'
      }`}>
        
        {/* Header del Sidebar */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-slate-200 dark:border-slate-700`}>
          {isCollapsed ? (
            // Modo colapsado: solo botón de expansión centrado
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Expandir sidebar"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          ) : (
            // Modo expandido: logo + texto + botón
            <>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">PQNC AI</span>
              </div>
              
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Colapsar sidebar"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, index) => (
            <MenuItem key={index} {...item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Admin al final */}
        {adminItem && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <MenuItem {...adminItem} isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Información del usuario si está expandido */}
        {!isCollapsed && user && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.warn('❌ Error cargando avatar en sidebar:', profile.avatar_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xs font-semibold text-white">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user.role_name}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
