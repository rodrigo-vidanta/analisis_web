/**
 * ============================================
 * HOOK: useProspectosNotifications
 * ============================================
 * 
 * @deprecated Este hook fue reemplazado por un trigger de base de datos
 * 
 * FECHA DE DEPRECACIÓN: 2026-01-15
 * 
 * RAZÓN:
 * El enfoque basado en frontend causaba duplicados cuando múltiples
 * clientes estaban conectados simultáneamente. Cada cliente escuchaba
 * los mismos cambios y generaba sus propias notificaciones.
 * 
 * NUEVA ARQUITECTURA:
 * - Trigger de BD: `fn_notify_prospecto_changes` en tabla `prospectos`
 * - Se ejecuta en INSERT/UPDATE directamente en la base de datos
 * - Garantiza UNA sola notificación por evento
 * 
 * TIPOS DE NOTIFICACIONES (manejados por el trigger):
 * 1. nuevo_prospecto: INSERT con coordinacion_id y sin ejecutivo_id
 * 2. prospecto_asignado: UPDATE de ejecutivo_id de NULL a valor
 * 3. requiere_atencion: UPDATE de requiere_atencion_humana de false a true
 * 
 * MANTENIDO PARA:
 * - Referencia histórica
 * - Posible rollback si se necesita
 * 
 * NO USAR EN PRODUCCIÓN - El trigger de BD maneja todo automáticamente
 */

import { useEffect, useRef } from 'react';
import { analysisSupabase } from '../config/analysisSupabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseProspectosNotificationsProps {
  userId: string;
  userRole: string;
  isActive: boolean;
}

/**
 * @deprecated Usar trigger de BD fn_notify_prospecto_changes
 */
export function useProspectosNotifications({
  userId,
  userRole,
  isActive
}: UseProspectosNotificationsProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // ============================================
    // DESHABILITADO - El trigger de BD maneja esto
    // ============================================
    // Este hook ya no genera notificaciones.
    // Las notificaciones son generadas por:
    // - Función: fn_notify_prospecto_changes
    // - Trigger: trigger_notify_prospecto_changes
    // - Ubicación: PQNC_AI.public.prospectos
    // ============================================
    
    console.log('🔔 [useProspectosNotifications] Hook deprecado - usando trigger de BD');
    
    return () => {
      if (channelRef.current) {
        analysisSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, userRole, isActive]);

  return null;
}
