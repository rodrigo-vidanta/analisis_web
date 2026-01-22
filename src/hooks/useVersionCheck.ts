import { useState, useEffect, useCallback } from 'react';
import { analysisSupabase } from '../config/analysisSupabase';
import { APP_VERSION } from '../config/appVersion';

/**
 * Versión actual de la aplicación
 * Usa la misma versión que se muestra en el Footer.tsx
 * Formato: "B10.1.39N2.5.39"
 */
const CURRENT_VERSION = APP_VERSION;

interface VersionCheckResult {
  requiresUpdate: boolean;
  currentVersion: string;
  requiredVersion: string | null;
  isLoading: boolean;
}

/**
 * Hook para verificar si la aplicación requiere actualización forzada
 * 
 * Funcionalidades:
 * - Consulta la versión requerida desde system_config (config_key: 'app_version')
 * - Compara con la versión actual del build
 * - Suscripción realtime para detectar cambios inmediatos
 * - Fallback a polling si realtime falla
 */
export const useVersionCheck = (): VersionCheckResult => {
  const [requiresUpdate, setRequiresUpdate] = useState(false);
  const [requiredVersion, setRequiredVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkVersion = useCallback(async () => {
    try {
      setIsLoading(true);

      // Consultar versión requerida desde system_config
      const { data, error } = await analysisSupabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'app_version')
        .single();

      if (error) {
        // Si no existe la configuración, no requiere actualización
        if (error.code === 'PGRST116') {
          console.debug('[VersionCheck] No hay versión requerida configurada');
          setRequiresUpdate(false);
          setRequiredVersion(null);
          return;
        }
        console.error('[VersionCheck] Error al consultar versión:', error);
        setRequiresUpdate(false);
        return;
      }

      const versionConfig = data?.config_value as { version?: string; force_update?: boolean } | null;
      const requiredVersionValue = versionConfig?.version || null;
      const forceUpdate = versionConfig?.force_update ?? true;

      setRequiredVersion(requiredVersionValue);

      if (!requiredVersionValue) {
        setRequiresUpdate(false);
        return;
      }

      // Extraer versión de ambos strings para comparación robusta
      // Maneja formatos: "2.5.39" y "B10.1.39N2.5.39"
      // IMPORTANTE: Usa la PRIMERA parte (antes de "N"), no la segunda
      const extractVersion = (version: string): string => {
        // Si tiene formato "B10.1.39N2.5.39", extraer la parte ANTES de "N"
        if (version.includes('N')) {
          const parts = version.split('N');
          return parts[0]; // Primera parte antes de "N" (ej: "B10.1.39")
        }
        // Si es formato simple "2.5.39", retornar tal cual
        return version;
      };

      const currentVersionExtracted = extractVersion(CURRENT_VERSION);
      const requiredVersionExtracted = extractVersion(requiredVersionValue);

      console.log('[VersionCheck] Comparando versiones:', {
        current: CURRENT_VERSION,
        currentExtracted: currentVersionExtracted,
        required: requiredVersionValue,
        requiredExtracted: requiredVersionExtracted,
        forceUpdate
      });

      // Comparar versiones (usa primera parte antes de "N" si existe)
      // Si las versiones no coinciden exactamente, requiere actualización
      const versionsMatch = currentVersionExtracted === requiredVersionExtracted ||
                           currentVersionExtracted.includes(requiredVersionExtracted) ||
                           requiredVersionExtracted.includes(currentVersionExtracted);

      const shouldRequireUpdate = !versionsMatch && forceUpdate;
      
      console.log('[VersionCheck] Resultado:', {
        versionsMatch,
        shouldRequireUpdate,
        requiresUpdate: shouldRequireUpdate
      });

      setRequiresUpdate(shouldRequireUpdate);
    } catch (error) {
      console.error('[VersionCheck] Error inesperado:', error);
      setRequiresUpdate(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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
        console.debug('[VersionCheck] Polling: verificando versión...');
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
          (payload) => {
            console.log('[VersionCheck] 🔔 Cambio detectado en versión requerida (realtime):', payload.new);
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
          (payload) => {
            console.log('[VersionCheck] 🔔 Nueva versión requerida configurada (realtime):', payload.new);
            checkVersion();
          }
        )
        .subscribe((status) => {
          console.log(`[VersionCheck] Estado de suscripción realtime: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            realtimeSubscribed = true;
            console.log('[VersionCheck] ✅ Suscrito a cambios de versión (realtime activo)');
            // Reducir intervalo de polling a 60s si realtime funciona (solo como backup)
            setupPolling(60000);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            console.warn(`[VersionCheck] ⚠️ Realtime no disponible (${status}), usando solo polling cada 30s`);
            realtimeSubscribed = false;
            // Asegurar que polling esté activo
            setupPolling(30000);
          } else {
            console.debug(`[VersionCheck] Estado de suscripción: ${status}`);
          }
        });

      // Verificar estado después de 2 segundos
      setTimeout(() => {
        if (channel && !realtimeSubscribed) {
          console.warn('[VersionCheck] ⚠️ Realtime no se suscribió después de 2s, usando solo polling');
          setupPolling(30000);
        }
      }, 2000);

    } catch (error) {
      console.warn('[VersionCheck] ⚠️ Error configurando realtime, usando solo polling:', error);
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
  }, [checkVersion]);

  return {
    requiresUpdate,
    currentVersion: CURRENT_VERSION,
    requiredVersion,
    isLoading
  };
};
