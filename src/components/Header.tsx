// import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { useUserProfile } from '../hooks/useUserProfile';

interface HeaderProps {
  currentStep: number;
  progress: number;
  progressText: string;
  darkMode: boolean;
  appMode?: 'constructor' | 'plantillas' | 'agent-studio' | 'natalia' | 'pqnc' | 'live-monitor' | 'admin' | 'aws-manager';
  onToggleDarkMode: () => void;
  onReset: () => void;
  onModeChange?: (mode: 'constructor' | 'plantillas' | 'agent-studio' | 'natalia' | 'pqnc' | 'live-monitor' | 'admin' | 'aws-manager') => void;
  simplified?: boolean;
  onToggleSidebar?: () => void;
}

const Header = ({ 
  currentStep, 
  progress, 
  progressText, 
  darkMode,
  appMode = 'constructor',
  onToggleDarkMode, 
  onReset,
  onModeChange,
  simplified = false,
  onToggleSidebar
}: HeaderProps) => {
  const { user, logout, canAccessModule } = useAuth();
  const { config } = useSystemConfig();
  const { profile } = useUserProfile();

  // Renderizar header simplificado para layout con sidebar
  if (simplified) {
    return (
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/20 dark:border-slate-700/20 sticky top-0 z-40">
        <div className="px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Botón hamburguesa para móviles y título */}
            <div className="flex items-center space-x-4">
              {/* Botón hamburguesa - solo en móviles */}
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                title="Abrir menú"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <h1 className="text-xl font-semibold text-slate-900 dark:text-white capitalize">
                {appMode === 'constructor' ? 'Constructor de Agentes' :
                 appMode === 'plantillas' ? 'Gestión de Plantillas' :
                 appMode === 'agent-studio' ? 'Agent Studio' :
                 appMode === 'natalia' ? 'Análisis Natalia IA' :
                 appMode === 'pqnc' ? 'Análisis PQNC Humans' :
                 appMode === 'live-monitor' ? 'Monitor en Vivo' :
                 appMode === 'admin' ? 'Administración' :
                 appMode === 'aws-manager' ? 'AWS Manager' : 'PQNC AI'}
              </h1>
              
              {/* Barra de progreso para constructor */}
              {appMode === 'constructor' && currentStep > 0 && (
                <div className="hidden lg:flex items-center space-x-3">
                  <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {progressText}
                  </span>
                </div>
              )}
            </div>

            {/* Controles de usuario */}
            <div className="flex items-center space-x-3">
              
              {/* Botones de navegación para admin */}
              {user?.role_name === 'admin' && (
                <div className="hidden md:flex items-center space-x-2">
                  <button 
                    onClick={() => onModeChange?.('aws-manager')}
                    className={`relative px-3 py-1.5 rounded-lg transition-all duration-300 group text-sm font-medium ${
                      appMode === 'aws-manager'
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                    title="AWS Manager - Gestión de Infraestructura"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                      <span>AWS</span>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => onModeChange?.('admin')}
                    className={`relative px-3 py-1.5 rounded-lg transition-all duration-300 group text-sm font-medium ${
                      appMode === 'admin'
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                    title="Administración del Sistema"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Admin</span>
                    </div>
                  </button>
                </div>
              )}
              
              {/* Toggle tema */}
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                title={darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Usuario y logout */}
              {user && (
                <div className="flex items-center space-x-3">
                  {/* Avatar y info */}
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn('❌ Error cargando avatar:', profile.avatar_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs font-semibold text-white">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="hidden md:block">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {user.role_name}
                      </p>
                    </div>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Cerrar sesión"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Header original para retrocompatibilidad
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-700/20 sticky top-0 z-50">
      {/* Gradiente superior sutil */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo y branding modernos */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 animate-slide-in-right">
              {/* Logo minimalista */}
              <div className="relative group">
                {config.app_branding?.logo_url ? (
                  <div className="w-12 h-12 transform transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                    <img 
                      src={config.app_branding.logo_url} 
                      alt="Logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm transform transition-all duration-300 group-hover:scale-105">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Título minimalista */}
              <div>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {config.app_branding?.app_name || 'VAPI Builder'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  {config.app_branding?.header_description || 'AI AGENT PLATFORM'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress minimalista */}
          {currentStep > 1 && (
            <div className="flex items-center space-x-4 animate-scale-in">
              <div className="flex items-center space-x-3">
                {/* Progress ring minimalista */}
                <div className="relative">
                  <svg className="w-12 h-12" viewBox="0 0 36 36">
                    <circle
                      className="stroke-slate-200 dark:stroke-slate-700"
                      strokeWidth="2"
                      fill="none"
                      r="16"
                      cx="18"
                      cy="18"
                    />
                    <circle
                      className="stroke-indigo-500"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      r="16"
                      cx="18"
                      cy="18"
                      strokeDasharray={`${progress}, 100`}
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>
                
                {/* Progress text minimalista */}
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {progressText}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configuración inicial
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Controles modernos */}
          <div className="flex items-center space-x-3">
            {/* Navegación principal */}
            <nav className="flex items-center space-x-1">
              {canAccessModule('constructor') && (
                <button 
                  onClick={() => onModeChange?.('constructor')}
                  className={`relative px-4 py-2 rounded-lg transition-all duration-300 group text-sm font-medium ${
                    appMode === 'constructor'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Constructor de Agentes"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Constructor</span>
                  </div>
                </button>
              )}
              
              {canAccessModule('plantillas') && (
                <button 
                  onClick={() => onModeChange?.('plantillas')}
                  className={`relative px-4 py-2 rounded-lg transition-all duration-300 group text-sm font-medium ${
                    appMode === 'plantillas'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Gestión de Plantillas"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Plantillas</span>
                  </div>
                </button>
              )}
              
              {canAccessModule('analisis') && (
                <button 
                  onClick={() => onModeChange?.('analisis')}
                  className={`relative px-4 py-2 rounded-lg transition-all duration-300 group text-sm font-medium ${
                    appMode === 'analisis'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Análisis de Llamadas"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Análisis</span>
                  </div>
                </button>
              )}
              
              {user?.role_name === 'admin' && (
                <button 
                  onClick={() => onModeChange?.('aws-manager')}
                  className={`relative px-4 py-2 rounded-lg transition-all duration-300 group text-sm font-medium ${
                    appMode === 'aws-manager'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="AWS Manager - Gestión de Infraestructura"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>AWS</span>
                  </div>
                </button>
              )}
              
              {user?.role_name === 'admin' && (
                <button 
                  onClick={() => onModeChange?.('admin')}
                  className={`relative px-4 py-2 rounded-lg transition-all duration-300 group text-sm font-medium ${
                    appMode === 'admin'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Administración del Sistema"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Admin</span>
                  </div>
                </button>
              )}
            </nav>

            {/* Tool buttons sutiles */}
            {currentStep >= 2 && (
              <div className="flex items-center space-x-2 border-l border-gray-200/50 dark:border-gray-700/50 pl-3">
                <button 
                  className="relative p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 group"
                  title="Ver código generado"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </button>
                <button 
                  className="relative p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 group"
                  title="Gestionar variables"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M13 5l8 8-2 2-8-8 2-2z" />
                  </svg>
                </button>
              </div>
            )}

            {/* User section moderna */}
            {user && (
              <div className="flex items-center space-x-4 pl-4 border-l border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile?.full_name || user.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {profile?.role_name || user.role_display_name} • {profile?.email || user.email}
                    </p>
                  </div>
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <div className="w-10 h-10 rounded-full ring-2 ring-blue-500/20 overflow-hidden">
                        <img 
                          src={profile.avatar_url} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full ring-2 ring-blue-500/20 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {(profile?.first_name || user.first_name)?.charAt(0)}{(profile?.last_name || user.last_name)?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  </div>
                </div>
                
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors group"
                  title="Cerrar sesión"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}

            {/* Toggle dark mode moderno */}
            <button
              onClick={onToggleDarkMode}
              className="relative p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 group"
              title="Cambiar tema"
            >
              <div className="relative w-5 h-5">
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-500 transform transition-transform group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700 transform transition-transform group-hover:-rotate-12" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </div>
            </button>

            {/* Reset button minimalista */}
            {currentStep >= 2 && (
              <button
                onClick={onReset}
                className="relative p-3 rounded-xl bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 transition-all duration-300 group"
                title="Reiniciar constructor"
              >
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;