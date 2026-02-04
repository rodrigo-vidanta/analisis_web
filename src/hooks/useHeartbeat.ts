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
 * - Implementa beforeunload para limpiar sesión al cerrar ventana
 */

import { useEffect, useRef } from 'react';
import { supabaseSystemUI } from '../config/supabaseSystemUI';

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

  // Función para limpiar sesión al cerrar ventana
  const cleanupSession = async () => {
    if (!userId || isUnloadingRef.current) return;
    
    isUnloadingRef.current = true;

    try {
      // Marcar is_operativo = false
      await supabaseSystemUI.rpc('update_user_metadata', {
        p_user_id: userId,
        p_updates: { is_operativo: false }
      });

      // Eliminar sesión de active_sessions
      await supabaseSystemUI
        .from('active_sessions')
        .delete()
        .eq('session_id', sessionId);

      console.log('🧹 Sesión limpiada al cerrar ventana');
    } catch (err) {
      console.error('⚠️ Error limpiando sesión:', err);
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

    console.log(`💓 Heartbeat iniciado (cada ${intervalMs / 1000}s)`);

    // Cleanup al desmontar o deshabilitar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('💓 Heartbeat detenido');
      }
    };
  }, [enabled, userId, sessionId, intervalMs]);

  // Efecto para evento beforeunload
  useEffect(() => {
    if (!enabled || !userId || !sessionId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Intentar limpiar sesión de forma síncrona
      // Nota: beforeunload es limitado, pero intentamos hacer lo mejor posible
      cleanupSession();
      
      // No mostrar diálogo de confirmación (opcional)
      // e.preventDefault();
      // e.returnValue = '';
    };

    // Agregar listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('👋 beforeunload listener registrado');

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('👋 beforeunload listener removido');
    };
  }, [enabled, userId, sessionId]);

  return {
    sendHeartbeat, // Exponer por si se quiere forzar un heartbeat manual
  };
};
