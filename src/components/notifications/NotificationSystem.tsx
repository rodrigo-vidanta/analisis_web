/**
 * ============================================
 * SISTEMA DE NOTIFICACIONES - ESTILO REDES SOCIALES
 * ============================================
 * 
 * Componentes:
 * 1. NotificationBell: Icono con contador que abre dropdown
 * 2. NotificationDropdown: Lista de notificaciones no leídas
 * 3. NotificationToast: Notificación flotante desde abajo
 * 4. NotificationSystem: Wrapper que combina todo + suscripciones
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, MessageSquare, User, ChevronRight, Sparkles, AlertTriangle, UserPlus } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { notificationsService } from '../../services/notificationsService';
import type { UserNotification } from '../../services/notificationsService';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';

// ============================================
// NOTIFICATION BELL (ICONO CON CONTADOR)
// ============================================

const NotificationBell: React.FC = () => {
  const { unreadCount, toggleDropdown, isDropdownOpen } = useNotificationStore();

  return (
    <motion.button
      onClick={toggleDropdown}
      className={`relative p-2 rounded-xl transition-all duration-300 group ${
        isDropdownOpen 
          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
    >
      {/* Icono de campana con animación */}
      <motion.div
        animate={unreadCount > 0 ? { 
          rotate: [0, -10, 10, -10, 10, 0],
        } : {}}
        transition={{ 
          duration: 0.5, 
          repeat: unreadCount > 0 ? Infinity : 0,
          repeatDelay: 3
        }}
      >
        <Bell className="w-5 h-5" />
      </motion.div>

      {/* Contador con animación de pulso */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg border-2 border-white dark:border-slate-900"
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>

      {/* Efecto de brillo cuando hay notificaciones */}
      {unreadCount > 0 && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
};

// ============================================
// NOTIFICATION DROPDOWN (LISTA)
// ============================================

const NotificationDropdown: React.FC<{ onNavigate: (prospectoId: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { 
    notifications, 
    isDropdownOpen, 
    closeDropdown,
    markAsReadAndDelete,
    markAllAsRead,
    isLoading 
  } = useNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, closeDropdown]);

  const handleNotificationClick = async (notification: UserNotification) => {
    // Navegar a la conversación
    if (notification.metadata?.prospecto_id) {
      onNavigate(notification.metadata.prospecto_id);
    }
    
    // Eliminar notificación
    await markAsReadAndDelete(notification.id);
    closeDropdown();
  };

  const handleClearAll = async () => {
    if (user?.id && notifications.length > 0) {
      await markAllAsRead(user.id);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  return (
    <AnimatePresence>
      {isDropdownOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
        >
          {/* Header del dropdown */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Notificaciones
                </h3>
                {notifications.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Limpiar todas"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={closeDropdown}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                <Bell className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin notificaciones</p>
                <p className="text-xs mt-1">Las nuevas aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notification, index) => {
                  // Determinar icono y color según tipo de notificación
                  const getIconAndColor = () => {
                    switch (notification.type) {
                      case 'requiere_atencion':
                        return {
                          icon: <AlertTriangle className="w-5 h-5 text-white" />,
                          gradient: 'from-red-500 to-orange-600'
                        };
                      case 'prospecto_asignado':
                        return {
                          icon: <UserPlus className="w-5 h-5 text-white" />,
                          gradient: 'from-green-500 to-emerald-600'
                        };
                      default:
                        return {
                          icon: <MessageSquare className="w-5 h-5 text-white" />,
                          gradient: 'from-indigo-500 to-purple-600'
                        };
                    }
                  };
                  const { icon, gradient } = getIconAndColor();
                  
                  return (
                    <motion.button
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full px-4 py-3 flex items-start space-x-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
                    >
                      {/* Icono */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
                        {icon}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {notification.metadata?.prospecto_nombre || notification.message}
                        </p>
                        {notification.type === 'requiere_atencion' && notification.metadata?.motivo && (
                          <p className="text-xs text-red-500 dark:text-red-400 truncate mt-0.5">
                            {notification.metadata.motivo}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Flecha */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-5 h-5 text-indigo-500" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer - solo si hay notificaciones */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Haz clic en una notificación para ir a la conversación
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// NOTIFICATION TOAST (FLOTANTE)
// ============================================

const NotificationToast: React.FC<{ onNavigate: (prospectoId: string) => void }> = ({ onNavigate }) => {
  const { 
    toastNotification, 
    showToast, 
    hideToast,
    markAsReadAndDelete 
  } = useNotificationStore();

  const handleClick = async () => {
    if (!toastNotification) return;
    
    // Navegar a la conversación
    if (toastNotification.metadata?.prospecto_id) {
      onNavigate(toastNotification.metadata.prospecto_id);
    }
    
    // Eliminar notificación
    await markAsReadAndDelete(toastNotification.id);
    hideToast();
  };

  // Obtener nombre del prospecto o "WhatsApp" como fallback
  const getProspectoDisplayName = () => {
    if (!toastNotification) return '';
    const nombre = toastNotification.metadata?.prospecto_nombre;
    return nombre || 'WhatsApp';
  };

  return (
    <AnimatePresence>
      {showToast && toastNotification && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 30 
          }}
          className="fixed top-20 right-6 z-[100] max-w-sm"
        >
          <motion.div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
          >
            {/* Barra de progreso animada */}
            <motion.div
              className={`absolute top-0 left-0 h-1 bg-gradient-to-r ${
                toastNotification.type === 'requiere_atencion' 
                  ? 'from-red-500 to-orange-500' 
                  : toastNotification.type === 'prospecto_asignado'
                    ? 'from-green-500 to-emerald-500'
                    : 'from-indigo-500 to-purple-600'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />

            {/* Contenido */}
            <div className="p-4 flex items-start space-x-3">
              {/* Icono animado */}
              <motion.div 
                className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${
                  toastNotification.type === 'requiere_atencion'
                    ? 'from-red-500 via-orange-500 to-yellow-500'
                    : toastNotification.type === 'prospecto_asignado'
                      ? 'from-green-500 via-emerald-500 to-teal-500'
                      : 'from-indigo-500 via-purple-500 to-pink-500'
                } flex items-center justify-center shadow-lg`}
                animate={{ 
                  boxShadow: toastNotification.type === 'requiere_atencion'
                    ? [
                        '0 0 20px rgba(239, 68, 68, 0.4)',
                        '0 0 40px rgba(239, 68, 68, 0.6)',
                        '0 0 20px rgba(239, 68, 68, 0.4)',
                      ]
                    : [
                        '0 0 20px rgba(99, 102, 241, 0.4)',
                        '0 0 40px rgba(99, 102, 241, 0.6)',
                        '0 0 20px rgba(99, 102, 241, 0.4)',
                      ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {toastNotification.type === 'requiere_atencion' ? (
                    <AlertTriangle className="w-6 h-6 text-white" />
                  ) : toastNotification.type === 'prospecto_asignado' ? (
                    <UserPlus className="w-6 h-6 text-white" />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </motion.div>
              </motion.div>

              {/* Texto */}
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {toastNotification.title}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {getProspectoDisplayName()}
                </p>
                {toastNotification.type === 'requiere_atencion' && toastNotification.metadata?.motivo && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 line-clamp-1">
                    {toastNotification.metadata.motivo}
                  </p>
                )}
                <p className={`text-xs mt-1 font-medium group-hover:underline ${
                  toastNotification.type === 'requiere_atencion' 
                    ? 'text-red-500 dark:text-red-400' 
                    : 'text-indigo-500 dark:text-indigo-400'
                }`}>
                  Clic para ver conversacion
                </p>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  hideToast();
                }}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Efecto de brillo */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
              animate={{ translateX: ['100%', '-100%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// NOTIFICATION SYSTEM (WRAPPER PRINCIPAL)
// ============================================

interface NotificationSystemProps {
  onNavigateToProspecto?: (prospectoId: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  onNavigateToProspecto 
}) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { 
    loadNotifications, 
    addNotification, 
    isSubscribed, 
    setSubscribed,
    clearAll 
  } = useNotificationStore();

  // Cargar notificaciones al montar
  useEffect(() => {
    if (user?.id) {
      loadNotifications(user.id);
    }
  }, [user?.id, loadNotifications]);

  // Suscribirse a notificaciones realtime
  useEffect(() => {
    if (!user?.id || !user?.role_name || isSubscribed) return;

    // Verificar si el usuario puede recibir notificaciones
    const checkAndSubscribe = async () => {
      const canReceive = await notificationsService.canUserReceiveNotifications(
        user.id,
        user.role_name
      );

      if (!canReceive) {
        return;
      }

      // Suscribirse a nuevas notificaciones en la BD
      const unsubscribe = notificationsService.subscribeToUserNotifications(
        user.id,
        (notification) => {
          addNotification(notification);
        }
      );

      setSubscribed(true);

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    checkAndSubscribe().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id, user?.role_name, isSubscribed, addNotification, setSubscribed]);

  // Limpiar al desmontar o logout
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  // Handler para navegación
  const handleNavigate = useCallback((prospectoId: string) => {
    if (onNavigateToProspecto) {
      onNavigateToProspecto(prospectoId);
    } else {
      // Fallback: usar localStorage y cambiar a live-chat
      localStorage.setItem('livechat-prospect-id', prospectoId);
      window.dispatchEvent(new CustomEvent('navigate-to-livechat', { 
        detail: { prospectoId } 
      }));
    }
  }, [onNavigateToProspecto]);

  // Verificar si el usuario debe ver notificaciones
  const rolesConNotificaciones = ['coordinador', 'supervisor', 'ejecutivo'];
  if (!user?.role_name || !rolesConNotificaciones.includes(user.role_name)) {
    return null; // No mostrar nada para roles sin notificaciones
  }

  return (
    <>
      {/* Bell con dropdown (se posiciona relativamente al padre) */}
      <div className="relative">
        <NotificationBell />
        <NotificationDropdown onNavigate={handleNavigate} />
      </div>

      {/* Toast flotante (fixed, fuera del flujo) */}
      <NotificationToast onNavigate={handleNavigate} />
    </>
  );
};

export default NotificationSystem;

