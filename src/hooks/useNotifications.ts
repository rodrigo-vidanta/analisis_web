/**
 * ============================================
 * HOOK DE NOTIFICACIONES
 * ============================================
 * 
 * Hook para manejar notificaciones en tiempo real
 * - Inicializa el servicio con el usuario actual
 * - Maneja suscripciones a nuevos mensajes y llamadas
 * - Marca notificaciones como leídas al entrar a módulos
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';

interface UseNotificationsOptions {
  /**
   * Módulo actual - si se proporciona, marca las notificaciones de ese módulo como leídas al montar
   */
  currentModule?: 'live-chat' | 'live-monitor';
  
  /**
   * Si es true, marca todas las notificaciones como leídas al montar
   */
  markAllAsReadOnMount?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { user } = useAuth();
  const { currentModule, markAllAsReadOnMount = false } = options;

  useEffect(() => {
    if (!user?.id) return;

    // Inicializar servicio con el usuario actual
    notificationService.setUserId(user.id);

    // Marcar notificaciones como leídas al entrar al módulo
    if (currentModule || markAllAsReadOnMount) {
      notificationService.markAllAsRead(currentModule || undefined);
    }
  }, [user?.id, currentModule, markAllAsReadOnMount]);

  return {
    notificationService,
  };
};

