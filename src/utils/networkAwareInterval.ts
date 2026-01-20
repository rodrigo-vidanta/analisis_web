/**
 * ============================================
 * UTILIDAD: Network-Aware Interval
 * ============================================
 * 
 * Wrapper para setInterval que:
 * - Pausa automáticamente cuando no hay conexión
 * - Resume cuando se restaura la conexión
 * - Ejecuta inmediatamente al reconectar (opcional)
 * - Reduce spam de errores en la consola
 * 
 * @author Team PQNC
 * @since 2026-01-20
 */

import { useNetworkStore } from '../stores/networkStore';

interface NetworkAwareIntervalOptions {
  /** Intervalo en milisegundos */
  interval: number;
  /** Si debe ejecutar inmediatamente al reconectar */
  executeOnReconnect?: boolean;
  /** Nombre para logging (opcional) */
  name?: string;
  /** Si debe hacer log de pausa/resume (default: false en prod) */
  verbose?: boolean;
}

interface NetworkAwareIntervalResult {
  /** Limpiar el intervalo */
  clear: () => void;
  /** Pausar manualmente */
  pause: () => void;
  /** Resumir manualmente */
  resume: () => void;
  /** Si está actualmente pausado */
  isPaused: () => boolean;
}

/**
 * Crea un intervalo que respeta el estado de conexión a internet
 * 
 * @example
 * ```ts
 * const { clear } = createNetworkAwareInterval(
 *   () => fetchNotifications(),
 *   { interval: 30000, executeOnReconnect: true, name: 'notifications' }
 * );
 * 
 * // Limpiar cuando ya no se necesite
 * clear();
 * ```
 */
export function createNetworkAwareInterval(
  callback: () => void | Promise<void>,
  options: NetworkAwareIntervalOptions
): NetworkAwareIntervalResult {
  const { 
    interval, 
    executeOnReconnect = true, 
    name = 'anonymous',
    verbose = import.meta.env.DEV 
  } = options;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isPaused = false;
  let isManuallyPaused = false;
  let unsubscribe: (() => void) | null = null;

  const log = (message: string) => {
    if (verbose) {
      console.log(`⏱️ [NetworkInterval:${name}] ${message}`);
    }
  };

  const startInterval = () => {
    if (intervalId || isPaused || isManuallyPaused) return;
    
    intervalId = setInterval(async () => {
      // Verificar estado de red antes de ejecutar
      if (!useNetworkStore.getState().isOnline) {
        return;
      }
      
      try {
        await callback();
        // Reset errores de red si la llamada fue exitosa
        useNetworkStore.getState().resetNetworkErrors();
      } catch (error) {
        // Si es error de red, incrementar contador
        const isNetworkError = error instanceof Error && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('net::'));
        
        if (isNetworkError) {
          useNetworkStore.getState().incrementNetworkErrors();
        }
      }
    }, interval);
    
    log(`Iniciado (cada ${interval}ms)`);
  };

  const stopInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      log('Detenido');
    }
  };

  // Suscribirse a cambios de estado de red
  unsubscribe = useNetworkStore.subscribe(
    (state) => state.isOnline,
    (isOnline, wasOnline) => {
      if (isManuallyPaused) return;

      if (!isOnline && wasOnline) {
        // Pasó a offline
        isPaused = true;
        stopInterval();
        log('Pausado (sin conexión)');
      } else if (isOnline && !wasOnline) {
        // Pasó a online
        isPaused = false;
        
        if (executeOnReconnect) {
          log('Ejecutando inmediatamente (reconexión)');
          callback().catch(() => {
            // Silenciar errores en reconexión
          });
        }
        
        startInterval();
        log('Reanudado (conexión restaurada)');
      }
    }
  );

  // Iniciar si hay conexión
  if (useNetworkStore.getState().isOnline) {
    startInterval();
  } else {
    isPaused = true;
    log('Iniciado en pausa (sin conexión)');
  }

  return {
    clear: () => {
      stopInterval();
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      log('Limpiado completamente');
    },
    pause: () => {
      isManuallyPaused = true;
      stopInterval();
      log('Pausado manualmente');
    },
    resume: () => {
      isManuallyPaused = false;
      if (useNetworkStore.getState().isOnline) {
        startInterval();
        log('Reanudado manualmente');
      }
    },
    isPaused: () => isPaused || isManuallyPaused,
  };
}

/**
 * Hook helper para usar en componentes React
 * Limpia automáticamente al desmontar
 */
export function useNetworkAwareInterval(
  callback: () => void | Promise<void>,
  options: NetworkAwareIntervalOptions,
  deps: React.DependencyList = []
): void {
  // Importar React hooks dinámicamente para evitar problemas
  // cuando se usa fuera de componentes
  const { useEffect, useCallback } = require('react');
  
  // Memoizar callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, deps);
  
  useEffect(() => {
    const { clear } = createNetworkAwareInterval(memoizedCallback, options);
    return clear;
  }, [memoizedCallback, options.interval, options.name]);
}

/**
 * Wrapper simple para fetch que verifica conexión primero
 * Evita intentar fetch cuando no hay red
 */
export async function networkAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!useNetworkStore.getState().isOnline) {
    throw new Error('No hay conexión a internet');
  }
  
  try {
    const response = await fetch(input, init);
    useNetworkStore.getState().resetNetworkErrors();
    return response;
  } catch (error) {
    useNetworkStore.getState().incrementNetworkErrors();
    throw error;
  }
}

export default createNetworkAwareInterval;
