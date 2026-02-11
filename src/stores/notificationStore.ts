/**
 * ============================================
 * STORE DE NOTIFICACIONES - ZUSTAND
 * ============================================
 * 
 * Maneja el estado global de notificaciones estilo redes sociales.
 * Incluye:
 * - Lista de notificaciones no leídas
 * - Contador de notificaciones
 * - Notificación toast actual
 * - Suscripciones realtime
 */

import { create } from 'zustand';
import { notificationsService } from '../services/notificationsService';
import type { UserNotification } from '../services/notificationsService';

// Audio de notificación con manejo de autoplay policy
let notificationAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

// Pre-cargar el audio
const initAudio = () => {
  if (!notificationAudio) {
    notificationAudio = new Audio('/sounds/notification.mp3');
    notificationAudio.volume = 0.7;
    notificationAudio.preload = 'auto';
  }
};

// Desbloquear audio después de la primera interacción del usuario
const unlockAudio = () => {
  if (audioUnlocked) return;
  
  initAudio();
  if (notificationAudio) {
    // Reproducir silenciosamente para desbloquear
    notificationAudio.volume = 0;
    notificationAudio.play().then(() => {
      notificationAudio!.pause();
      notificationAudio!.currentTime = 0;
      notificationAudio!.volume = 0.7;
      audioUnlocked = true;
      // Remover listeners una vez desbloqueado
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    }).catch(() => {
      // Ignorar error, se intentará de nuevo
    });
  }
};

// Registrar listeners para desbloquear audio
if (typeof document !== 'undefined') {
  document.addEventListener('click', unlockAudio, { once: false, passive: true });
  document.addEventListener('keydown', unlockAudio, { once: false, passive: true });
  document.addEventListener('touchstart', unlockAudio, { once: false, passive: true });
  initAudio();
}

const playNotificationSound = () => {
  try {
    initAudio();
    if (notificationAudio) {
      notificationAudio.currentTime = 0;
      notificationAudio.volume = 0.7;
      notificationAudio.play().catch(err => {
        console.log('🔔 Audio bloqueado (haz clic en la página para habilitarlo):', err.message);
      });
    }
  } catch (error) {
    console.error('Error reproduciendo sonido de notificación:', error);
  }
};

interface NotificationState {
  // Notificaciones
  notifications: UserNotification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Toast notification (la que aparece flotante)
  toastNotification: UserNotification | null;
  showToast: boolean;
  
  // Dropdown abierto/cerrado
  isDropdownOpen: boolean;
  
  // Suscripciones activas
  isSubscribed: boolean;
  
  // Acciones
  loadNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: UserNotification) => void;
  removeNotification: (notificationId: string) => Promise<void>;
  markAsReadAndDelete: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  showToastNotification: (notification: UserNotification) => void;
  hideToast: () => void;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  setSubscribed: (value: boolean) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Estado inicial
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  toastNotification: null,
  showToast: false,
  isDropdownOpen: false,
  isSubscribed: false,
  // Cargar notificaciones desde la base de datos
  loadNotifications: async (userId: string) => {
    set({ isLoading: true });
    try {
      const notifications = await notificationsService.getUnreadNotifications(userId);
      const unreadCount = notifications.length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      set({ isLoading: false });
    }
  },

  // Agregar nueva notificación (desde realtime)
  addNotification: (notification: UserNotification) => {
    set((state) => {
      // Evitar duplicados
      if (state.notifications.some(n => n.id === notification.id)) {
        return state;
      }
      
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
    
    // Reproducir sonido de notificación
    playNotificationSound();
    
    // Mostrar toast automáticamente
    get().showToastNotification(notification);
  },

  // Eliminar notificación de la lista local
  removeNotification: async (notificationId: string) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== notificationId),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  // Marcar como leída y eliminar
  markAsReadAndDelete: async (notificationId: string) => {
    // Primero actualizar UI
    get().removeNotification(notificationId);
    
    // Luego eliminar de BD
    await notificationsService.markAsReadAndDelete(notificationId);
  },

  // Marcar todas como leídas
  markAllAsRead: async (userId: string) => {
    await notificationsService.markAllAsRead(userId);
    set({ notifications: [], unreadCount: 0 });
  },

  // Mostrar toast notification
  showToastNotification: (notification: UserNotification) => {
    set({ toastNotification: notification, showToast: true });
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      // Solo ocultar si sigue siendo la misma notificación
      const current = get().toastNotification;
      if (current?.id === notification.id) {
        set({ showToast: false });
        // Limpiar después de la animación de salida
        setTimeout(() => {
          const stillCurrent = get().toastNotification;
          if (stillCurrent?.id === notification.id) {
            set({ toastNotification: null });
          }
        }, 300);
      }
    }, 5000);
  },

  // Ocultar toast
  hideToast: () => {
    set({ showToast: false });
    setTimeout(() => {
      set({ toastNotification: null });
    }, 300);
  },

  // Toggle dropdown
  toggleDropdown: () => {
    set((state) => ({ isDropdownOpen: !state.isDropdownOpen }));
  },

  // Cerrar dropdown
  closeDropdown: () => {
    set({ isDropdownOpen: false });
  },

  // Marcar como suscrito
  setSubscribed: (value: boolean) => {
    set({ isSubscribed: value });
  },

  // Limpiar todo (para logout)
  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
      toastNotification: null,
      showToast: false,
      isDropdownOpen: false,
      isSubscribed: false,
    });
  },
}));
