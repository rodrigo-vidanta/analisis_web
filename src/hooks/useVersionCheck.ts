import { useState, useEffect, useCallback } from 'react';
import { analysisSupabase } from '../config/analysisSupabase';
import { APP_VERSION } from '../config/appVersion';

/**
 * Versión actual de la aplicación
 * Usa la misma versión que se muestra en el Footer.tsx
 * Formato: "B10.1.39N2.5.39"
 */
const CURRENT_VERSION = APP_VERSION;

interface ReleaseNoteCategory {
  type: string;
  items: string[];
}

interface VersionCheckResult {
  requiresUpdate: boolean;
  currentVersion: string;
  requiredVersion: string | null;
  releaseNotes: ReleaseNoteCategory[];
  isLoading: boolean;
}

interface UseVersionCheckOptions {
  enabled?: boolean; // Si está deshabilitado, no hace ninguna verificación
}

/**
 * Hook para verificar si la aplicación requiere actualización forzada
 * 
 * Funcionalidades:
 * - Consulta la versión requerida desde system_config (config_key: 'app_version')
 * - Compara con la versión actual del build
 * - Suscripción realtime para detectar cambios inmediatos
 * - Fallback a polling si realtime falla
 * - Solo se activa después del login (enabled: true)
 */
export const useVersionCheck = (options: UseVersionCheckOptions = {}): VersionCheckResult => {
  const { enabled = true } = options;
  const [requiresUpdate, setRequiresUpdate] = useState(false);
  const [requiredVersion, setRequiredVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNoteCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkVersion = useCallback(async () => {
    // No hacer nada si el hook está deshabilitado
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Consultar versión requerida desde system_config
      const { data, error } = await analysisSupabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'app_version')
        .single();

      if (error) {
        // Si no existe la configuración o no tiene permisos, no requiere actualización
        if (error.code === 'PGRST116' || error.code === '42501') {
          // Silenciar el error (no autenticado o sin permisos)
          setRequiresUpdate(false);
          setRequiredVersion(null);
          return;
        }
        // Solo loggear otros errores inesperados
        setRequiresUpdate(false);
        return;
      }

      const versionConfig = data?.config_value as { version?: string; force_update?: boolean; release_notes?: ReleaseNoteCategory[] } | null;
      const requiredVersionValue = versionConfig?.version || null;
      const forceUpdate = versionConfig?.force_update ?? true;

      setRequiredVersion(requiredVersionValue);
      setReleaseNotes(Array.isArray(versionConfig?.release_notes) ? versionConfig.release_notes : []);

      if (!requiredVersionValue) {
        setRequiresUpdate(false);
        return;
      }

      // Comparar versiones completas
      // Maneja formatos: "2.5.39" y "B10.1.39N2.5.39"
      // IMPORTANTE: Compara la versión COMPLETA, no solo una parte
      const compareVersions = (current: string, required: string): boolean => {
        // Comparación exacta primero
        if (current === required) {
          return true;
        }

        // Si ambas tienen formato "B10.1.XNY.Z.W", comparar ambas partes
        if (current.includes('N') && required.includes('N')) {
          const currentParts = current.split('N');
          const requiredParts = required.split('N');
          
          // Comparar primera parte (backend version)
          const backendMatch = currentParts[0] === requiredParts[0];
          
          // Comparar segunda parte (frontend version)
          const frontendMatch = currentParts[1] === requiredParts[1];
          
          // Solo coincide si ambas partes son iguales
          return backendMatch && frontendMatch;
        }

        // Si solo una tiene formato con "N", comparar directamente
        // Si la versión requerida es más nueva, requiere actualización
        return false;
      };

      const versionsMatch = compareVersions(CURRENT_VERSION, requiredVersionValue);
      const shouldRequireUpdate = !versionsMatch && forceUpdate;

      // Forzar actualización si las versiones no coinciden
      setRequiresUpdate(shouldRequireUpdate);
    } catch (error) {
      // Silenciar errores para no exponer información
      setRequiresUpdate(false);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    // No hacer nada si el hook está deshabilitado
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    
    // Verificación inicial
    checkVersion();

    // Configurar suscripción realtime a system_config
    let channel: ReturnType<typeof analysisSupabase.channel> | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let realtimeSubscribed = false;

    // Configurar polling como fallback (siempre activo, pero con intervalo más largo si realtime funciona)
    const setupPolling = (interval: number = 30000) => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      pollingInterval = setInterval(() => {
        checkVersion();
      }, interval);
    };

    // Iniciar polling inmediatamente (fallback seguro)
    setupPolling(30000); // 30 segundos

    try {
      // Intentar suscripción realtime
      channel = analysisSupabase
        .channel(`version_check_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'system_config',
            filter: `config_key=eq.app_version`
          },
          () => {
            checkVersion();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'system_config',
            filter: `config_key=eq.app_version`
          },
          () => {
            checkVersion();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            realtimeSubscribed = true;
            // Reducir intervalo de polling a 60s si realtime funciona (solo como backup)
            setupPolling(60000);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            realtimeSubscribed = false;
            // Asegurar que polling esté activo
            setupPolling(30000);
          }
        });

      // Verificar estado después de 2 segundos
      setTimeout(() => {
        if (channel && !realtimeSubscribed) {
          setupPolling(30000);
        }
      }, 2000);

    } catch (error) {
      // Silenciar error
      realtimeSubscribed = false;
      setupPolling(30000);
    }

    // Cleanup
    return () => {
      if (channel) {
        analysisSupabase.removeChannel(channel);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [checkVersion, enabled]);

  return {
    requiresUpdate,
    currentVersion: CURRENT_VERSION,
    requiredVersion,
    releaseNotes,
    isLoading
  };
};
