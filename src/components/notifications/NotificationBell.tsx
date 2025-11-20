/**
 * ============================================
 * COMPONENTE DE NOTIFICACIONES
 * ============================================
 * 
 * Muestra notificaciones en tiempo real en el header
 * - Badge con contador de no leídas
 * - Dropdown con lista de notificaciones
 * - Marcar como leídas al hacer click
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService, type UserNotification, type NotificationCounts } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, MessageSquare, Phone, X, Check } from 'lucide-react';

interface NotificationBellProps {
  darkMode?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ darkMode = false }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, unread: 0, byType: { new_message: 0, new_call: 0 } });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (!user?.id) return;

    notificationService.setUserId(user.id);
    loadNotifications();
    loadCounts();

    // Suscribirse a cambios en tiempo real
    const unsubscribe = notificationService.subscribeToNotifications(
      (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        loadCounts();
      },
      (newCounts) => {
        setCounts(newCounts);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(20);
      setNotifications(data);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    const newCounts = await notificationService.getUnreadCount();
    setCounts(newCounts);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    loadCounts();
  };

  const handleMarkAllAsRead = async (module?: 'live-chat' | 'live-monitor') => {
    await notificationService.markAllAsRead(module);
    await loadNotifications();
    await loadCounts();
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navegar al módulo correspondiente
    if (notification.module === 'live-chat') {
      window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'live-chat' }));
    } else if (notification.module === 'live-monitor') {
      window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'live-monitor' }));
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return <MessageSquare className="w-4 h-4" />;
      case 'new_call':
        return <Phone className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_message':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'new_call':
        return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (!user?.id) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {counts.unread > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
          >
            {counts.unread > 9 ? '9+' : counts.unread}
          </motion.div>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Notificaciones
                {counts.unread > 0 && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({counts.unread} nuevas)
                  </span>
                )}
              </h3>
              {counts.unread > 0 && (
                <button
                  onClick={() => handleMarkAllAsRead()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Lista de notificaciones */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm">Cargando notificaciones...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-colors ${
                        notification.is_read
                          ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                          : 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icono */}
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getNotificationColor(
                            notification.notification_type
                          )}`}
                        >
                          {getNotificationIcon(notification.notification_type)}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {notification.notification_type === 'new_message'
                                  ? 'Nuevo mensaje'
                                  : 'Nueva llamada'}
                              </p>
                              {notification.customer_name && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {notification.customer_name}
                                </p>
                              )}
                              {notification.message_preview && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                                  {notification.message_preview}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {new Date(notification.created_at).toLocaleString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>

                            {/* Botón marcar como leída */}
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="Marcar como leída"
                              >
                                <Check className="w-4 h-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navegar a página de todas las notificaciones si existe
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;

