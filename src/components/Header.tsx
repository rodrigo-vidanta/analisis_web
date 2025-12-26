import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { useUserProfile } from '../hooks/useUserProfile';
import { useEffectivePermissions } from '../hooks/useEffectivePermissions';
import { AssignmentBadge } from './analysis/AssignmentBadge';
import UserProfileModal from './shared/UserProfileModal';
import AdminMessagesModal from './admin/AdminMessagesModal';
import { adminMessagesService } from '../services/adminMessagesService';
import { Mail, Wrench } from 'lucide-react';
import { NotificationControl } from './dashboard/NotificationControl';
import { ThemeSelector, type ThemeMode } from './ThemeSelector';

// ============================================
// COMPONENTES DE ANIMACIÓN PARA THEME TOGGLE
// ============================================

// Partículas sutiles al cambiar tema
const ThemeParticles: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    angle: (i * 60) * (Math.PI / 180),
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ scale: 0, x: 0, y: 0, opacity: 0.6 }}
          animate={{ 
            scale: [0, 1, 0],
            x: Math.cos(particle.angle) * 20,
            y: Math.sin(particle.angle) * 20,
            opacity: [0.6, 0.3, 0]
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`absolute left-1/2 top-1/2 w-1 h-1 rounded-full ${
            isDark ? 'bg-amber-400/70' : 'bg-slate-400/70'
          }`}
          style={{ marginLeft: -2, marginTop: -2 }}
        />
      ))}
    </div>
  );
};

// Sol animado discreto
const AnimatedSunIcon: React.FC = () => (
  <motion.div className="relative w-5 h-5 flex items-center justify-center">
    {/* Rayos sutiles girando lentamente */}
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
    >
      <svg className="w-full h-full" viewBox="0 0 20 20" fill="none">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <motion.line
            key={i}
            x1="10"
            y1="10"
            x2={10 + Math.cos((angle * Math.PI) / 180) * 8}
            y2={10 + Math.sin((angle * Math.PI) / 180) * 8}
            stroke="#D4A854"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </svg>
    </motion.div>
    
    {/* Centro del sol - más sutil */}
    <motion.div
      className="relative w-2.5 h-2.5 rounded-full bg-amber-400/90 z-10"
      animate={{ 
        scale: [1, 1.08, 1],
        boxShadow: [
          '0 0 4px rgba(217, 168, 84, 0.3)',
          '0 0 8px rgba(217, 168, 84, 0.5)',
          '0 0 4px rgba(217, 168, 84, 0.3)'
        ]
      }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

// Luna con estrellas titilantes
const AnimatedMoonIcon: React.FC = () => (
  <motion.div className="relative w-5 h-5">
    {/* Estrellas titilantes alrededor - mismo tono que la luna */}
    {[
      { x: -9, y: -5, size: 2, delay: 0 },
      { x: 8, y: -7, size: 1.5, delay: 0.3 },
      { x: 7, y: 6, size: 2, delay: 0.6 },
      { x: -7, y: 5, size: 1.5, delay: 0.9 },
      { x: 0, y: -9, size: 1.5, delay: 0.2 },
    ].map((star, i) => (
      <motion.div
        key={i}
        className="absolute bg-slate-500 dark:bg-slate-400 rounded-full"
        style={{ 
          left: `calc(50% + ${star.x}px)`,
          top: `calc(50% + ${star.y}px)`,
          width: star.size,
          height: star.size
        }}
        animate={{ 
          opacity: [0.3, 1, 0.3],
          scale: [0.8, 1.2, 0.8]
        }}
        transition={{ duration: 1.5, repeat: Infinity, delay: star.delay }}
      />
    ))}
    
    {/* Luna */}
    <motion.svg 
      className="w-5 h-5 text-slate-500 dark:text-slate-400" 
      fill="currentColor" 
      viewBox="0 0 20 20"
      animate={{ rotate: [0, 3, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </motion.svg>
  </motion.div>
);

// Componente del botón de toggle de tema con todas las animaciones
interface ThemeToggleButtonProps {
  darkMode: boolean;
  onToggle: () => void;
  variant?: 'default' | 'large';
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ 
  darkMode, 
  onToggle, 
  variant = 'default' 
}) => {
  const [showParticles, setShowParticles] = useState(false);
  const [particleKey, setParticleKey] = useState(0);

  const handleClick = () => {
    setShowParticles(true);
    setParticleKey(prev => prev + 1);
    onToggle();
    setTimeout(() => setShowParticles(false), 600);
  };

  const isLarge = variant === 'large';

  return (
    <motion.button
      onClick={handleClick}
      className={`relative ${isLarge ? 'p-2.5' : 'p-2'} rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200 overflow-visible`}
      title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Partículas sutiles */}
      {showParticles && (
        <ThemeParticles key={particleKey} isDark={darkMode} />
      )}
      
      {/* Iconos con transición suave */}
      <AnimatePresence mode="wait">
        {darkMode ? (
          <motion.div
            key="sun-icon"
            initial={{ scale: 0.8, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotate: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <AnimatedSunIcon />
          </motion.div>
        ) : (
          <motion.div
            key="moon-icon"
            initial={{ scale: 0.8, rotate: 90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotate: -90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <AnimatedMoonIcon />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resplandor muy sutil */}
      <motion.div
        className={`absolute inset-0 rounded-lg pointer-events-none ${
          darkMode 
            ? 'bg-amber-400/5' 
            : 'bg-indigo-400/5'
        }`}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.button>
  );
};

interface HeaderProps {
  currentStep?: number;
  progress?: number;
  progressText?: string;
  darkMode: boolean;
  appMode?: 'natalia' | 'pqnc' | 'live-monitor' | 'admin' | 'direccion' | 'live-chat' | 'ai-models' | 'prospectos' | 'scheduled-calls' | 'analisis' | 'operative-dashboard' | 'campaigns';
  onToggleDarkMode: () => void;
  onReset?: () => void;
  onModeChange?: (mode: 'natalia' | 'pqnc' | 'live-monitor' | 'admin' | 'direccion' | 'live-chat' | 'ai-models' | 'prospectos' | 'scheduled-calls' | 'analisis' | 'operative-dashboard' | 'campaigns') => void;
  simplified?: boolean;
  onToggleSidebar?: () => void;
}

const Header = ({ 
  currentStep = 0, 
  progress = 0, 
  progressText = '', 
  darkMode,
  appMode = 'admin',
  onToggleDarkMode, 
  onReset,
  onModeChange,
  simplified = false,
  onToggleSidebar
}: HeaderProps) => {
  const { user, logout, canAccessModule } = useAuth();
  const { config } = useSystemConfig();
  const { profile, refreshProfile } = useUserProfile();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prospectCount, setProspectCount] = useState<{filtered: number, total: number} | null>(null);
  
  // Estado del tema (light, twilight, dark)
  const [currentThemeMode, setCurrentThemeMode] = useState<ThemeMode>('dark');

  // Cargar tema al iniciar
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode && ['light', 'twilight', 'dark'].includes(savedMode)) {
      setCurrentThemeMode(savedMode);
      applyThemeMode(savedMode);
    } else {
      setCurrentThemeMode('dark');
      applyThemeMode('dark');
    }
  }, []);

  // Aplicar modo de tema
  const applyThemeMode = (mode: ThemeMode) => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.removeAttribute('data-theme');
    } else if (mode === 'twilight') {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'twilight');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // Manejar cambio de tema
  const handleThemeChange = (mode: ThemeMode) => {
    console.log('🎨 Header: Cambiando tema a:', mode);
    setCurrentThemeMode(mode);
    
    // Aplicar directamente al documento
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.style.backgroundColor = '#0f172a';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.style.backgroundColor = '#f8fafc';
    }
    
    localStorage.setItem('theme-mode', mode);
    
    // Mantener compatibilidad con código legacy (onToggleDarkMode)
    const shouldBeDark = mode === 'dark';
    if (shouldBeDark !== darkMode) {
      onToggleDarkMode();
    }
  };

  // Escuchar eventos para actualizar contador de prospectos
  useEffect(() => {
    const handleProspectCountUpdate = (event: CustomEvent<{filtered: number, total: number}>) => {
      setProspectCount(event.detail);
    };
    window.addEventListener('prospect-count-update', handleProspectCountUpdate as EventListener);
    return () => {
      window.removeEventListener('prospect-count-update', handleProspectCountUpdate as EventListener);
    };
  }, []);
  
  // Permisos efectivos (rol base + grupos asignados)
  const { isAdmin, isAdminOperativo } = useEffectivePermissions();

  // Cargar contador de mensajes no leídos
  useEffect(() => {
    if ((isAdmin || isAdminOperativo) && user?.role_name) {
      const loadUnreadCount = async () => {
        try {
          const count = await adminMessagesService.getUnreadCount(user.role_name);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error cargando contador de mensajes:', error);
          setUnreadCount(0);
        }
      };
      loadUnreadCount();

      // Actualizar cada 30 segundos
      const interval = setInterval(loadUnreadCount, 30000);

      // Suscribirse a nuevos mensajes en tiempo real
      // Usar setTimeout para evitar problemas con React StrictMode double-invoke
      let unsubscribe: (() => void) | null = null;
      const subscribeTimeout = setTimeout(() => {
        try {
          unsubscribe = adminMessagesService.subscribeToMessages(
            user.role_name,
            () => {
              loadUnreadCount();
            }
          );
        } catch (error) {
          console.warn('⚠️ Error suscribiéndose a mensajes (no crítico):', error);
        }
      }, 100);

      return () => {
        clearInterval(interval);
        clearTimeout(subscribeTimeout);
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch (error) {
            // Ignorar errores al desconectar
            console.debug('Error al desconectar suscripción (no crítico)');
          }
        }
      };
    }
  }, [isAdmin, isAdminOperativo, user?.role_name]);

  // Renderizar header simplificado para layout con sidebar
  if (simplified) {
    return (
      <header className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/20 dark:border-slate-700/20 sticky top-0 z-40">
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

              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg font-medium text-slate-900 dark:text-white capitalize">
                    {appMode === 'natalia' ? 'Análisis Natalia IA' :
                     appMode === 'pqnc' ? 'Llamadas PQNC' :
                     appMode === 'live-monitor' ? 'Llamadas IA' :
                     appMode === 'admin' ? 'Administración' :
                     appMode === 'live-chat' ? 'WhatsApp' :
                     appMode === 'ai-models' ? 'Modelos LLM' :
                     appMode === 'prospectos' ? 'Prospectos' :
                     appMode === 'scheduled-calls' ? 'Programación' :
                     appMode === 'operative-dashboard' ? 'Inicio' :
                     appMode === 'campaigns' ? 'Campañas' :
                     appMode === 'direccion' ? 'Mis Tareas' : 'PQNC AI Platform'}
                  </h1>
                  {appMode === 'live-monitor' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Gestión visual del proceso de ventas por checkpoints
                    </p>
                  )}
                  {appMode === 'operative-dashboard' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Vista centralizada de prospectos, conversaciones y llamadas
                    </p>
                  )}
                </div>
                {appMode === 'operative-dashboard' && (
                  <div className="flex items-center gap-2">
                    <NotificationControl />
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-dashboard-config'))}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                      title="Configurar Dashboard"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {appMode === 'live-chat' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Monitoreo y gestión de conversaciones en tiempo real
                  </p>
                )}
                {appMode === 'prospectos' && (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Gestión completa de prospectos y asignaciones
                    </p>
                    {prospectCount && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                        {prospectCount.filtered} de {prospectCount.total} prospectos
                      </p>
                    )}
                  </>
                )}
                {appMode === 'scheduled-calls' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Programación y seguimiento de llamadas agendadas
                  </p>
                )}
                {appMode === 'ai-models' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Gestión avanzada de modelos de IA para voz e imágenes
                  </p>
                )}
                {appMode === 'admin' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Administración de plantillas y configuración del sistema
                  </p>
                )}
                {appMode === 'direccion' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Gestión de tareas y asignaciones
                  </p>
                )}
                {appMode === 'natalia' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Análisis detallado de llamadas con IA Natalia
                  </p>
                )}
                {appMode === 'pqnc' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Análisis de llamadas con evaluación humana PQNC
                  </p>
                )}
              </div>
            </div>

            {/* Controles de usuario */}
            <div className="flex items-center space-x-3">
              
              {/* Botón Mis Tareas para roles con acceso */}
              {canAccessModule('direccion') && (
                <button 
                  onClick={() => onModeChange?.('direccion')}
                  className={`relative px-3 py-1.5 rounded-lg transition-all duration-300 group text-sm font-medium ${
                    appMode === 'direccion'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Mis Tareas - Timeline de Actividades"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Mis Tareas</span>
                  </div>
                </button>
              )}
              
              {/* Botones de navegación para admin */}
              {isAdmin && (
                <div className="hidden md:flex items-center space-x-2">
                  {/* Botón CRM - Vinculado a Dynamics CRM */}
                  <button 
                    onClick={() => {
                      onModeChange?.('admin');
                      // Disparar evento para cambiar a pestaña dynamics después de navegar
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('admin-navigate-tab', { detail: 'dynamics' }));
                      }, 100);
                    }}
                    className="relative px-3 py-1.5 rounded-lg transition-all duration-300 group text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Dynamics CRM Manager"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>CRM</span>
                    </div>
                  </button>

                  {/* Botón Logs - Solo icono */}
                  <button 
                    onClick={() => {
                      onModeChange?.('admin');
                      // Disparar evento para cambiar a pestaña logs después de navegar
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('admin-navigate-tab', { detail: 'logs' }));
                      }, 100);
                    }}
                    className="relative p-2 rounded-lg transition-all duration-300 group bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    title="Logs del Sistema"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
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
              
              {/* Selector de tema con 3 opciones */}
              <ThemeSelector 
                currentTheme={currentThemeMode}
                onThemeChange={handleThemeChange}
                variant="default"
              />

              {/* Usuario y logout */}
              {user && (
                <div className="flex items-center space-x-3">
                  {/* Botón de buzón de mensajes (solo para admins) */}
                  {(isAdmin || isAdminOperativo) && (
                    <button
                      onClick={() => setShowMessagesModal(true)}
                      className="relative p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title={`Mensajes de administración${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
                    >
                      <Mail className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center animate-pulse shadow-lg border-2 border-white dark:border-slate-900">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  )}
                  
                  {/* Avatar y info */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                      title="Editar perfil"
                    >
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
                    </button>
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      logout();
                    }}
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

        {/* Modal de Perfil de Usuario */}
        {user && (
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            userId={user.id}
            userEmail={user.email}
            currentAvatarUrl={profile?.avatar_url}
            onAvatarUpdated={() => {
              refreshProfile();
            }}
          />
        )}

        {/* Modal de Mensajes de Administración */}
        {(isAdmin || isAdminOperativo) && user?.role_name && (
          <AdminMessagesModal
            isOpen={showMessagesModal}
            onClose={() => {
              setShowMessagesModal(false);
              // Recargar contador al cerrar
              if (user?.role_name) {
                adminMessagesService.getUnreadCount(user.role_name).then(setUnreadCount);
              }
            }}
            recipientRole={user.role_name}
          />
        )}
      </header>
    );
  }

  // Header original para retrocompatibilidad
  return (
    <header className="bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-700/20 sticky top-0 z-50">
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
            {/* Botón Mis Tareas para roles con acceso */}
            {canAccessModule('direccion') && (
              <button 
                onClick={() => onModeChange?.('direccion')}
                className={`relative px-4 py-2 rounded-lg transition-all duration-300 group text-sm font-medium ${
                  appMode === 'direccion'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Mis Tareas - Timeline de Actividades"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Mis Tareas</span>
                </div>
              </button>
            )}
            
            {/* Navegación principal */}
            <nav className="flex items-center space-x-1">
              {/* Módulos disponibles */}
              
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
              
              {/* Botón CRM - Vinculado a Dynamics CRM */}
              {isAdmin && (
                <button 
                  onClick={() => {
                    onModeChange?.('admin');
                    // Disparar evento para cambiar a pestaña dynamics después de navegar
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('admin-navigate-tab', { detail: 'dynamics' }));
                    }, 100);
                  }}
                  className="relative px-4 py-2 rounded-lg transition-all duration-300 group text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Dynamics CRM Manager"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>CRM</span>
                  </div>
                </button>
              )}
              
              {isAdmin && (
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
                {/* Botón de buzón de mensajes (solo para admins) */}
                {(isAdmin || isAdminOperativo) && (
                  <button
                    onClick={() => setShowMessagesModal(true)}
                    className="relative p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title={`Mensajes de administración${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
                  >
                    <Mail className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center animate-pulse shadow-lg border-2 border-white dark:border-gray-900">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile?.full_name || user.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {profile?.role_name || user.role_display_name} • {profile?.email || user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="relative hover:ring-2 hover:ring-blue-500/50 rounded-full transition-all cursor-pointer"
                    title="Editar perfil"
                  >
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
                  </button>
                  {/* Mostrar coordinación para ejecutivos */}
                  {user.role_name === 'ejecutivo' && profile?.coordinacion_codigo && (
                    <AssignmentBadge
                      call={{
                        coordinacion_codigo: profile.coordinacion_codigo,
                        coordinacion_nombre: profile.coordinacion_nombre
                      } as any}
                      variant="header"
                    />
                  )}
                </div>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    logout();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors group"
                  title="Cerrar sesión"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}

            {/* Selector de tema con 3 opciones */}
            <ThemeSelector 
              currentTheme={currentThemeMode}
              onThemeChange={handleThemeChange}
              variant="default"
            />

            {/* Reset button minimalista */}
            {currentStep >= 2 && (
              <button
                onClick={onReset}
                className="relative p-3 rounded-xl bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 transition-all duration-300 group"
                title="Reiniciar"
              >
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Modal de Perfil de Usuario */}
        {user && (
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            userId={user.id}
            userEmail={user.email}
            currentAvatarUrl={profile?.avatar_url}
            onAvatarUpdated={() => {
              refreshProfile();
            }}
          />
        )}

        {/* Modal de Mensajes de Administración */}
        {(isAdmin || isAdminOperativo) && user?.role_name && (
          <AdminMessagesModal
            isOpen={showMessagesModal}
            onClose={() => {
              setShowMessagesModal(false);
              // Recargar contador al cerrar
              if (user?.role_name) {
                adminMessagesService.getUnreadCount(user.role_name).then(setUnreadCount);
              }
            }}
            recipientRole={user.role_name}
          />
        )}
      </div>
    </header>
  );
};

export default Header;