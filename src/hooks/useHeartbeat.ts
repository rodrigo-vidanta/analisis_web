/**
 * ============================================
 * useHeartbeat Hook
 * ============================================
 * 
 * Mantiene la sesión activa actualizando `last_activity` cada 30 segundos.
 * 
 * Características:
 * - Actualiza automáticamente last_activity en active_sessions
 * - Se detiene cuando el usuario hace logout
 * - Usa UPSERT para crear/actualizar sesión
 * - Implementa beforeunload con fetch keepalive para cleanup confiable
 * 
 * ⚠️ FIX 5 Febrero 2026:
 * - beforeunload ahora usa fetch con keepalive:true en vez de async/await
 * - El browser garantiza que requests con keepalive completen después de cerrar
 * - Almacena access_token en ref para uso síncrono en beforeunload
 */

import { useEffect, useRef } from 'react';
import { supabaseSystemUI, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseSystemUI';

interface HeartbeatOptions {
  userId: string;
  sessionId: string;
  enabled: boolean;
  intervalMs?: number; // Por defecto 30000 (30s)
}

export const useHeartbeat = ({ 
  userId, 
  sessionId, 
  enabled,
  intervalMs = 30000 // 30 segundos
}: HeartbeatOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnloadingRef = useRef(false);
  // Almacenar token para uso síncrono en beforeunload
  const accessTokenRef = useRef<string | null>(null);

  // Mantener token actualizado para beforeunload
  useEffect(() => {
    if (!enabled || !userId) {
      accessTokenRef.current = null;
      return;
    }

    const updateToken = async () => {
      try {
        const { data: { session } } = await supabaseSystemUI.auth.getSession();
        accessTokenRef.current = session?.access_token || null;
      } catch {
        accessTokenRef.current = null;
      }
    };

    updateToken();
    // Actualizar token cada vez que el heartbeat se ejecuta (el token puede haber sido refrescado)
    const tokenInterval = setInterval(updateToken, intervalMs);

    return () => clearInterval(tokenInterval);
  }, [enabled, userId, intervalMs]);

  // Función para actualizar last_activity
  const sendHeartbeat = async () => {
    if (!enabled || !userId || !sessionId) return;

    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas

      const { error } = await supabaseSystemUI
        .from('active_sessions')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          last_activity: now,
          expires_at: expiresAt,
          device_info: {
            browser: navigator.userAgent,
            platform: navigator.platform,
            timestamp: now
          }
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('⚠️ Error enviando heartbeat:', error);
      }
    } catch (err) {
      console.error('⚠️ Excepción en sendHeartbeat:', err);
    }
  };

  // Efecto para configurar heartbeat
  useEffect(() => {
    if (!enabled || !userId || !sessionId) {
      // Limpiar intervalo si se deshabilita
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Enviar heartbeat inicial inmediatamente
    sendHeartbeat();

    // Configurar intervalo para heartbeats periódicos
    intervalRef.current = setInterval(sendHeartbeat, intervalMs);

    // Cleanup al desmontar o deshabilitar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, userId, sessionId, intervalMs]);

  // Efecto para evento beforeunload con fetch keepalive
  useEffect(() => {
    if (!enabled || !userId || !sessionId) return;

    const handleBeforeUnload = () => {
      if (isUnloadingRef.current) return;
      isUnloadingRef.current = true;

      const token = accessTokenRef.current;
      if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;

      // 1. Marcar is_operativo = false via RPC (fetch con keepalive)
      try {
        fetch(`${SUPABASE_URL}/rest/v1/rpc/update_user_metadata`, {
          method: 'POST',
          keepalive: true, // Garantiza que el request complete después de cerrar
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            p_user_id: userId,
            p_updates: { is_operativo: false }
          })
        }).catch(() => {}); // Ignorar errores (best-effort)
      } catch {
        // Silencioso - beforeunload es best-effort
      }

      // 2. Eliminar sesión de active_sessions (fetch con keepalive)
      try {
        fetch(`${SUPABASE_URL}/rest/v1/active_sessions?session_id=eq.${sessionId}`, {
          method: 'DELETE',
          keepalive: true,
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      } catch {
        // Silencioso
      }
    };

    // Agregar listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      isUnloadingRef.current = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, userId, sessionId]);

  return {
    sendHeartbeat, // Exponer por si se quiere forzar un heartbeat manual
  };
};
