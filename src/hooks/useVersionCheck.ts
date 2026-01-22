import { useState, useEffect, useCallback } from 'react';
import { analysisSupabase } from '../config/analysisSupabase';

/**
 * Versión actual de la aplicación
 * Se obtiene de package.json via vite.config.ts (VITE_APP_VERSION)
 * Formato: "2.5.39" o "B10.1.39N2.5.39"
 */
const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '2.5.39';

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

      // Comparar versiones (usa primera parte antes de "N" si existe)
      // Si las versiones no coinciden exactamente, requiere actualización
      const versionsMatch = currentVersionExtracted === requiredVersionExtracted ||
                           currentVersionExtracted.includes(requiredVersionExtracted) ||
                           requiredVersionExtracted.includes(currentVersionExtracted);

      setRequiresUpdate(!versionsMatch && forceUpdate);
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
            console.log('[VersionCheck] Cambio detectado en versión requerida:', payload.new);
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
            console.log('[VersionCheck] Nueva versión requerida configurada:', payload.new);
            checkVersion();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[VersionCheck] Suscrito a cambios de versión (realtime)');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[VersionCheck] Error en canal realtime, usando polling como fallback');
            // Fallback a polling si realtime falla
            pollingInterval = setInterval(checkVersion, 30000); // 30 segundos
          }
        });
    } catch (error) {
      console.warn('[VersionCheck] No se pudo configurar realtime, usando polling:', error);
      // Fallback a polling si hay error
      pollingInterval = setInterval(checkVersion, 30000); // 30 segundos
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
