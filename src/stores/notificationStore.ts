// Store global para notificaciones de llamadas en tiempo real
// Permite comunicación entre LiveMonitor y Sidebar sin acoplamiento
import { create } from 'zustand';

interface CallNotification {
  callId: string;
  checkpoint: string;
  timestamp: number;
}

interface NotificationState {
  activeCallNotification: CallNotification | null;
  triggerCallNotification: (callId: string, checkpoint: string) => void;
  clearCallNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  activeCallNotification: null,
  triggerCallNotification: (callId: string, checkpoint: string) => {
    set({
      activeCallNotification: {
        callId,
        checkpoint,
        timestamp: Date.now(),
      },
    });
    // Auto-limpiar después de 5 segundos
    setTimeout(() => {
      set((state) => {
        if (state.activeCallNotification?.callId === callId) {
          return { activeCallNotification: null };
        }
        return state;
      });
    }, 5000);
  },
  clearCallNotification: () => set({ activeCallNotification: null }),
}));

