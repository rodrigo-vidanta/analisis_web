/**
 * ============================================
 * STORE: Network Status (Zustand)
 * ============================================
 * 
 * Store global para el estado de conexión a internet.
 * Permite que múltiples componentes y servicios reaccionen
 * al estado de red sin duplicar listeners.
 * 
 * @author Team PQNC
 * @since 2026-01-20
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface NetworkState {
  /** Si hay conexión a internet */
  isOnline: boolean;
  /** Timestamp del último cambio de estado */
  lastChanged: number;
  /** Timestamp de cuándo empezó a estar offline (null si está online) */
  offlineSince: number | null;
  /** Contador de errores de red consecutivos */
  consecutiveNetworkErrors: number;
}

interface NetworkActions {
  /** Marcar como online */
  setOnline: () => void;
  /** Marcar como offline */
  setOffline: () => void;
  /** Incrementar contador de errores de red */
  incrementNetworkErrors: () => void;
  /** Resetear contador de errores */
  resetNetworkErrors: () => void;
}

type NetworkStore = NetworkState & NetworkActions;

/**
 * Store de Zustand para estado de red
 * 
 * Uso en componentes:
 * ```tsx
 * const isOnline = useNetworkStore(state => state.isOnline);
 * ```
 * 
 * Uso en servicios (sin React):
 * ```ts
 * const isOnline = useNetworkStore.getState().isOnline;
 * ```
 */
export const useNetworkStore = create<NetworkStore>()(
  subscribeWithSelector((set, get) => ({
    // Estado inicial
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChanged: Date.now(),
    offlineSince: null,
    consecutiveNetworkErrors: 0,

    // Acciones
    setOnline: () => {
      const wasOffline = !get().isOnline;
      if (wasOffline) {
        console.log('🌐 [Network] Conexión restaurada');
      }
      set({
        isOnline: true,
        lastChanged: Date.now(),
        offlineSince: null,
        consecutiveNetworkErrors: 0,
      });
    },

    setOffline: () => {
      const wasOnline = get().isOnline;
      if (wasOnline) {
        console.log('🔌 [Network] Conexión perdida');
      }
      set(state => ({
        isOnline: false,
        lastChanged: Date.now(),
        offlineSince: state.offlineSince ?? Date.now(),
      }));
    },

    incrementNetworkErrors: () => {
      const newCount = get().consecutiveNetworkErrors + 1;
      
      // Si hay muchos errores consecutivos, probablemente estamos offline
      if (newCount >= 3 && get().isOnline) {
        console.log('⚠️ [Network] Múltiples errores de red detectados, posible desconexión');
      }
      
      set({ consecutiveNetworkErrors: newCount });
    },

    resetNetworkErrors: () => {
      set({ consecutiveNetworkErrors: 0 });
    },
  }))
);

// Suscribirse a cambios para logging (solo en desarrollo)
if (import.meta.env.DEV) {
  useNetworkStore.subscribe(
    (state) => state.isOnline,
    (isOnline, wasOnline) => {
      if (isOnline !== wasOnline) {
        console.log(`🌐 [Network] Estado: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      }
    }
  );
}

/**
 * Inicializar listeners de red a nivel de window
 * Llamar una vez en el punto de entrada de la app
 */
export function initializeNetworkListeners(): () => void {
  const handleOnline = () => useNetworkStore.getState().setOnline();
  const handleOffline = () => useNetworkStore.getState().setOffline();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Retornar cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export default useNetworkStore;
