import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { useUserProfile } from '../hooks/useUserProfile';
import useAnalysisPermissions from '../hooks/useAnalysisPermissions';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { useNotificationStore } from '../stores/notificationStore';
import TokenUsageIndicator from './TokenUsageIndicator';
import type { TokenLimits } from '../services/tokenService';

// Estilos para el logo con animación y glow
const sidebarLogoStyles = `
  @keyframes sidebar-leaf-sway {
    0% {
      transform: rotate(0deg) translateY(0px) scale(1);
    }
    3% {
      transform: rotate(-10deg) translateY(-3px) scale(1.03);
    }
    6% {
      transform: rotate(12deg) translateY(-4px) scale(1.04);
    }
    9% {
      transform: rotate(-6deg) translateY(-2px) scale(1.02);
    }
    12% {
      transform: rotate(4deg) translateY(-1px) scale(1.01);
    }
    15%, 100% {
      transform: rotate(0deg) translateY(0px) scale(1);
    }
  }

  @keyframes sidebar-neon-glow {
    0%, 100% {
      filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.9))
              drop-shadow(0 0 4px rgba(59, 130, 246, 0.7))
              drop-shadow(0 0 6px rgba(59, 130, 246, 0.5));
    }
    50% {
      filter: drop-shadow(0 0 3px rgba(59, 130, 246, 1))
              drop-shadow(0 0 6px rgba(59, 130, 246, 0.9))
              drop-shadow(0 0 9px rgba(59, 130, 246, 0.7));
    }
  }

  @keyframes sidebar-neon-glow-green {
    0%, 100% {
      filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.9))
              drop-shadow(0 0 4px rgba(34, 197, 94, 0.7))
              drop-shadow(0 0 6px rgba(34, 197, 94, 0.5));
    }
    50% {
      filter: drop-shadow(0 0 3px rgba(34, 197, 94, 1))
              drop-shadow(0 0 6px rgba(34, 197, 94, 0.9))
              drop-shadow(0 0 9px rgba(34, 197, 94, 0.7));
    }
  }

  @keyframes sidebar-ringing {
    0%, 100% {
      transform: rotate(0deg) scale(1);
    }
    10% {
      transform: rotate(-5deg) scale(1.05);
    }
    20% {
      transform: rotate(5deg) scale(1.05);
    }
    30% {
      transform: rotate(-5deg) scale(1.05);
    }
    40% {
      transform: rotate(5deg) scale(1.05);
    }
    50% {
      transform: rotate(0deg) scale(1);
    }
  }

  .sidebar-logo-container {
    position: relative;
  }

  .sidebar-logo {
    animation: sidebar-leaf-sway 30s ease-in-out infinite,
               sidebar-neon-glow 2s ease-in-out infinite;
    transform-origin: center bottom;
    backface-visibility: hidden;
    will-change: transform, filter;
  }

  .sidebar-logo.ringing {
    animation: sidebar-leaf-sway 30s ease-in-out infinite,
               sidebar-neon-glow-green 1s ease-in-out infinite,
               sidebar-ringing 0.5s ease-in-out infinite;
  }

  .sidebar-logo img,
  .sidebar-logo svg {
    filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.9))
            drop-shadow(0 0 4px rgba(59, 130, 246, 0.7))
            drop-shadow(0 0 6px rgba(59, 130, 246, 0.5));
  }

  .dark .sidebar-logo img,
  .dark .sidebar-logo svg {
    filter: drop-shadow(0 0 2px rgba(96, 165, 250, 1))
            drop-shadow(0 0 4px rgba(96, 165, 250, 0.8))
            drop-shadow(0 0 6px rgba(96, 165, 250, 0.6));
  }

  .dark .sidebar-logo.ringing img,
  .dark .sidebar-logo.ringing svg {
    filter: drop-shadow(0 0 2px rgba(74, 222, 128, 1))
            drop-shadow(0 0 4px rgba(74, 222, 128, 0.8))
            drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
  }
`;

// Inyectar estilos en el head
if (typeof document !== 'undefined') {
  const styleId = 'sidebar-logo-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = sidebarLogoStyles;
    document.head.appendChild(style);
  }
}

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
      <motion.button
        onClick={handleClick}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'} rounded-lg transition-colors duration-200 text-sm font-medium group ${
          active
            ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title={label}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        {isCollapsed ? (
          // Modo colapsado: solo icono centrado
          <motion.div 
            className="w-5 h-5 flex-shrink-0"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        ) : (
          // Modo expandido: icono + texto + flecha
          <>
            <motion.div 
              className="flex items-center space-x-3"
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-5 h-5 flex-shrink-0">
                {icon}
              </div>
              <span className="truncate">{label}</span>
            </motion.div>
            {hasSubmenu && (
              <motion.svg 
                className="w-4 h-4"
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            )}
          </>
        )}
      </motion.button>
      
      {hasSubmenu && isExpanded && submenu && !isCollapsed && (
        <motion.div 
          className="mt-1 ml-8 space-y-1 overflow-hidden"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
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
        </motion.div>
      )}
    </div>
  );
};

// Función para reproducir sonido de checkpoint completado (misma que LiveMonitor)
const playCheckpointCompleteSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Asegurar que el contexto esté en estado "running"
    // Si está suspendido, intentar reanudarlo
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        // Si falla, el sonido no se reproducirá pero no romperá la app
        return;
      });
    }
    
    const playTone = (frequency: number, duration: number, delay: number = 0) => {
      setTimeout(() => {
        // Verificar que el contexto siga activo
        if (audioContext.state === 'closed') {
          return;
        }
        
        // Si está suspendido, intentar reanudarlo
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();
        
        oscillator.connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(audioContext.destination);
        
        compressor.threshold.setValueAtTime(-10, audioContext.currentTime);
        compressor.knee.setValueAtTime(20, audioContext.currentTime);
        compressor.ratio.setValueAtTime(8, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.01, audioContext.currentTime);
        compressor.release.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, delay);
    };
    
    for (let i = 0; i < 4; i++) {
      const baseDelay = i * 800;
      playTone(800, 0.5, baseDelay);
      playTone(1000, 0.3, baseDelay + 100);  // Armónico
      playTone(600, 0.4, baseDelay + 200);   // Tono grave
    }
  } catch (error) {
    // Silenciar errores de audio
  }
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, canAccessModule, canAccessLiveMonitor } = useAuth();
  const { profile } = useUserProfile();
  const { appMode, setAppMode } = useAppStore();
  const [tokenInfo, setTokenInfo] = useState<TokenLimits | null>(null);
  const { natalia, pqnc, liveMonitor } = useAnalysisPermissions();
  const [analysisMode, setAnalysisMode] = useState<'natalia' | 'pqnc'>('natalia');
  const { config } = useSystemConfig();
  const { activeCallNotification, clearCallNotification } = useNotificationStore();
  const [isRinging, setIsRinging] = useState(false);
  const processedCallsRef = useRef<Set<string>>(new Set());
  
  const faviconUrl = config.app_branding?.favicon_url;

  // Escuchar notificaciones de llamadas y activar animación
  useEffect(() => {
    if (!activeCallNotification || activeCallNotification.checkpoint !== 'checkpoint #5') {
      setIsRinging(false);
      return;
    }
    
    // Evitar procesar la misma llamada múltiples veces (una vez por callId único)
    if (processedCallsRef.current.has(activeCallNotification.callId)) {
      // Ya se procesó esta llamada, ignorar completamente
      return;
    }
    
    // Marcar esta llamada como procesada (solo una vez por callId)
    processedCallsRef.current.add(activeCallNotification.callId);
    
    // Limpiar callIds antiguos después de 5 minutos para evitar acumulación de memoria
    setTimeout(() => {
      processedCallsRef.current.delete(activeCallNotification.callId);
    }, 300000); // 5 minutos
    
    // Capturar el timestamp actual para verificar después
    const currentTimestamp = activeCallNotification.timestamp;
    
    // Resetear primero para permitir reactivación
    setIsRinging(false);
    
    // Pequeño delay para asegurar que el estado se resetea antes de activar
    const activateTimer = setTimeout(() => {
      // Verificar que la notificación sigue siendo la misma antes de activar
      if (activeCallNotification?.timestamp === currentTimestamp) {
        setIsRinging(true);
        playCheckpointCompleteSound();
      }
    }, 50);
    
    // Auto-detener después de 5 segundos
    const deactivateTimer = setTimeout(() => {
      // Solo desactivar si esta sigue siendo la notificación activa
      if (activeCallNotification?.timestamp === currentTimestamp) {
        setIsRinging(false);
        clearCallNotification();
      }
    }, 5000);
    
    return () => {
      clearTimeout(activateTimer);
      clearTimeout(deactivateTimer);
    };
  }, [activeCallNotification?.timestamp, activeCallNotification?.checkpoint, activeCallNotification?.callId, clearCallNotification]);

  const handleAnalysisChange = (mode: 'natalia' | 'pqnc') => {
    setAnalysisMode(mode);
    setAppMode('analisis');
    // Aquí podrías agregar lógica adicional para cambiar el submódulo
  };

  const handleTokenInfoChange = (info: TokenLimits | null) => {
    setTokenInfo(info);
  };

  const getRemainingTokens = () => {
    if (!tokenInfo) return null;
    if (tokenInfo.monthly_limit === -1) return '∞';
    return (tokenInfo.monthly_limit - tokenInfo.current_month_usage).toLocaleString();
  };

  const menuItems: MenuItemProps[] = [

    // 1. Inicio (Dashboard Operativo)
    ...((canAccessModule('prospectos') || canAccessModule('live-chat') || canAccessModule('live-monitor')) ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
        </svg>
      ),
      label: 'Inicio',
      active: appMode === 'operative-dashboard',
      onClick: () => setAppMode('operative-dashboard')
    }] : []),

    // 2. Análisis IA (OCULTO - No visible pero código preservado)
    // ...(canAccessModule('analisis') && natalia ? [{
    //   icon: (
    //     <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    //     </svg>
    //   ),
    //   label: 'Análisis IA',
    //   active: appMode === 'natalia',
    //   onClick: () => setAppMode('natalia')
    // }] : []),

    // 3. Llamadas PQNC (PQNC Humans)
    ...(canAccessModule('analisis') && pqnc ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: 'Llamadas PQNC',
      active: appMode === 'pqnc',
      onClick: () => setAppMode('pqnc')
    }] : []),

    // 4. Llamadas IA (AI Call Monitor)
    ...(canAccessLiveMonitor() ? [{
      icon: (
        <div className="relative">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      ),
      label: 'Llamadas IA',
      active: appMode === 'live-monitor',
      onClick: () => setAppMode('live-monitor')
    }] : []),

    // 5. WhatsApp (AI Chat Monitor)
    ...(canAccessModule('live-chat') ? [{
      icon: (
        <div className="relative">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      ),
      label: 'WhatsApp',
      active: appMode === 'live-chat',
      onClick: () => setAppMode('live-chat')
    }] : []),


    // 6. Prospectos (SEXTO)
    ...(canAccessModule('prospectos') ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: 'Prospectos',
      active: appMode === 'prospectos',
      onClick: () => setAppMode('prospectos')
    }] : []),

    // 6.5. Programación (Llamadas Programadas)
    ...(canAccessModule('scheduled-calls') ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Programación',
      active: appMode === 'scheduled-calls',
      onClick: () => setAppMode('scheduled-calls')
    }] : []),

    // 7. Modelos LLM (AI Models)
    ...((user?.role_name === 'admin' || user?.role_name === 'productor' || user?.role_name === 'developer') ? [{
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Modelos LLM',
      active: appMode === 'ai-models',
      onClick: () => setAppMode('ai-models')
    }] : []),

  ];

  // Logs (Log Server Manager) - Solo para Admin
  const logServerItem: MenuItemProps | null = user?.role_name === 'admin' ? {
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Logs',
    active: appMode === 'log-server',
    onClick: () => setAppMode('log-server')
  } : null;

  // Administración AWS (AWS Manager) - Para Admin y Developer
  const awsItem: MenuItemProps | null = canAccessModule('aws-manager') ? {
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4" />
      </svg>
    ),
    label: 'Administración AWS',
    active: appMode === 'aws-manager',
    onClick: () => setAppMode('aws-manager')
  } : null;

  // Campañas - Solo para Admin
  const campaignsItem: MenuItemProps | null = user?.role_name === 'admin' ? {
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    label: 'Campañas',
    active: appMode === 'campaigns',
    onClick: () => setAppMode('campaigns')
  } : null;

  // Documentación Técnica - Para Admin y Developer
  const documentationItem: MenuItemProps | null = (user?.role_name === 'admin' || user?.role_name === 'developer') ? {
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    label: 'Documentación',
    active: appMode === 'documentation',
    onClick: () => setAppMode('documentation')
  } : null;

  // Admin al final - Usar canAccessModule para incluir administrador_operativo
  const adminItem: MenuItemProps | null = canAccessModule('admin') ? {
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
      <motion.div 
        className="fixed top-0 left-0 h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 flex flex-col"
        initial={false}
        animate={{
          width: isCollapsed ? (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 64 : 0) : 256,
          x: isCollapsed ? (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0 : -256) : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 35,
          mass: 0.5
        }}
      >
        
        {/* Header del Sidebar */}
        <motion.div 
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-slate-200 dark:border-slate-700`}
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isCollapsed ? (
            // Modo colapsado: favicon/logo + botón de expansión
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                onClick={() => setAppMode('operative-dashboard')}
                className="w-8 h-8 flex items-center justify-center sidebar-logo-container hover:opacity-80 transition-opacity cursor-pointer"
                title="Ir al Dashboard"
              >
                {faviconUrl ? (
                  <img 
                    src={faviconUrl} 
                    alt="Logo" 
                    className={`w-full h-full object-contain sidebar-logo ${isRinging ? 'ringing' : ''}`}
                    onError={(e) => {
                      // Fallback al icono SVG si el favicon falla
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <svg class="w-5 h-5 ${isRinging ? 'text-green-500' : 'text-blue-500'} sidebar-logo ${isRinging ? 'ringing' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        `;
                      }
                    }}
                  />
                ) : (
                  <svg className={`w-5 h-5 ${isRinging ? 'text-green-500' : 'text-blue-500'} sidebar-logo ${isRinging ? 'ringing' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Expandir sidebar"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          ) : (
            // Modo expandido: logo + texto + botón
            <>
              <button
                onClick={() => setAppMode('operative-dashboard')}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
                title="Ir al Dashboard"
              >
                <div className="w-8 h-8 flex items-center justify-center sidebar-logo-container">
                  {faviconUrl ? (
                    <img 
                      src={faviconUrl} 
                      alt="Logo" 
                      className={`w-full h-full object-contain sidebar-logo ${isRinging ? 'ringing' : ''}`}
                      onError={(e) => {
                        // Fallback al icono SVG si el favicon falla
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <svg class="w-5 h-5 ${isRinging ? 'text-green-500' : 'text-blue-500'} sidebar-logo ${isRinging ? 'ringing' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <svg className={`w-5 h-5 ${isRinging ? 'text-green-500' : 'text-blue-500'} sidebar-logo ${isRinging ? 'ringing' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">PQNC AI</span>
              </button>
              
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
        </motion.div>

        {/* Navegación principal */}
        <motion.nav 
          className="flex-1 p-4 space-y-2 overflow-y-auto"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          {menuItems.map((item, index) => (
            <MenuItem key={index} {...item} isCollapsed={isCollapsed} />
          ))}
        </motion.nav>

        {/* Logs - Solo para Admin */}
        {logServerItem && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <MenuItem {...logServerItem} isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Administración AWS - Para Admin y Developer */}
        {awsItem && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <MenuItem {...awsItem} isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Campañas - Solo para Admin */}
        {campaignsItem && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <MenuItem {...campaignsItem} isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Documentación Técnica - Para Admin y Developer */}
        {documentationItem && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <MenuItem {...documentationItem} isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Admin al final */}
        {adminItem && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <MenuItem {...adminItem} isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Información del usuario si está expandido */}
        {!isCollapsed && user && (
          <motion.div 
            className="p-4 border-t border-slate-200 dark:border-slate-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
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
                
                {/* Indicador de tokens alrededor del avatar */}
                {(user.role_name === 'productor' || user.role_name === 'admin') && (
                  <div className="absolute -inset-2 flex items-center justify-center">
                    <TokenUsageIndicator size="lg" onTokenInfoChange={handleTokenInfoChange} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user.full_name || user.email}
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {user.role_name}
                  </p>
                  {(user.role_name === 'productor' || user.role_name === 'admin') && getRemainingTokens() && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      • {getRemainingTokens()} tokens
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
};

export default Sidebar;
