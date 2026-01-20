/**
 * ============================================
 * HOOK: useNetworkStatus
 * ============================================
 * 
 * Detecta el estado de conexión a internet y provee:
 * - Estado actual de conexión (online/offline)
 * - Tiempo desde última desconexión
 * - Callbacks para cambios de estado
 * 
 * Útil para:
 * - Pausar polling cuando no hay conexión
 * - Silenciar errores de red
 * - Mostrar indicadores al usuario
 * 
 * @author Team PQNC
 * @since 2026-01-20
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStore } from '../stores/networkStore';

export interface NetworkStatus {
  /** Si hay conexión a internet */
  isOnline: boolean;
  /** Timestamp de la última vez que cambió el estado */
  lastChanged: number;
  /** Si estaba offline y acaba de reconectarse */
  justReconnected: boolean;
  /** Tiempo en ms desde última desconexión (0 si está online) */
  offlineDuration: number;
}

/**
 * Hook para detectar estado de conexión a internet
 * 
 * @example
 * ```tsx
 * const { isOnline, justReconnected } = useNetworkStatus();
 * 
 * useEffect(() => {
 *   if (justReconnected) {
 *     // Refrescar datos después de reconexión
 *     refetchData();
 *   }
 * }, [justReconnected]);
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const { isOnline, setOnline, setOffline, lastChanged, offlineSince } = useNetworkStore();
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOfflineRef = useRef(false);

  // Manejar eventos de conexión
  const handleOnline = useCallback(() => {
    const wasOffline = wasOfflineRef.current;
    setOnline();
    wasOfflineRef.current = false;
    
    if (wasOffline) {
      setJustReconnected(true);
      // Reset el flag después de un momento
      setTimeout(() => setJustReconnected(false), 3000);
    }
  }, [setOnline]);

  const handleOffline = useCallback(() => {
    setOffline();
    wasOfflineRef.current = true;
    setJustReconnected(false);
  }, [setOffline]);

  useEffect(() => {
    // Inicializar con el estado actual
    if (navigator.onLine) {
      setOnline();
    } else {
      setOffline();
      wasOfflineRef.current = true;
    }

    // Escuchar cambios
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, setOnline, setOffline]);

  // Calcular duración offline
  const offlineDuration = !isOnline && offlineSince ? Date.now() - offlineSince : 0;

  return {
    isOnline,
    lastChanged,
    justReconnected,
    offlineDuration,
  };
}

/**
 * Verifica si hay conexión sin usar el hook (para uso en servicios)
 */
export function isNetworkOnline(): boolean {
  return navigator.onLine;
}

/**
 * Verifica si un error es causado por falta de conexión
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : String(error);
  
  const networkErrorPatterns = [
    'Failed to fetch',
    'NetworkError',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_ADDRESS_UNREACHABLE',
    'net::ERR_NETWORK_CHANGED',
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_NAME_NOT_RESOLVED',
    'net::ERR_QUIC_PROTOCOL_ERROR',
    'Network request failed',
    'Network Error',
    'offline',
  ];
  
  return networkErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

export default useNetworkStatus;
