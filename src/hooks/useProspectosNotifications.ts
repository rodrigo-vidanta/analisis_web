/**
 * ============================================
 * HOOK: useProspectosNotifications
 * ============================================
 * 
 * Escucha cambios en la tabla prospectos via Realtime y genera
 * notificaciones automáticamente para los usuarios correspondientes.
 * 
 * EVENTOS QUE GENERAN NOTIFICACIONES:
 * 1. INSERT con coordinacion_id pero sin ejecutivo_id → notifica a coordinadores
 * 2. UPDATE de ejecutivo_id (de null a valor) → notifica al ejecutivo asignado
 * 3. UPDATE de requiere_atencion_humana (de false a true) → notifica al ejecutivo o coordinadores
 * 
 * ARQUITECTURA:
 * - Escucha cambios en PQNC_AI (prospectos)
 * - Consulta usuarios en SystemUI (auth_users, auth_user_coordinaciones)
 * - Inserta notificaciones en PQNC_AI (user_notifications)
 * 
 * ANTI-DUPLICACIÓN:
 * - Solo usuarios con rol coordinador o admin generan notificaciones
 * - El servicio verifica duplicados antes de insertar
 */

import { useEffect, useRef } from 'react';
import { analysisSupabase } from '../config/analysisSupabase';
import { notificationsService } from '../services/notificationsService';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseProspectosNotificationsProps {
  userId: string;
  userRole: string;
  isActive: boolean;
}

export function useProspectosNotifications({
  userId,
  userRole,
  isActive
}: UseProspectosNotificationsProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Solo roles específicos pueden generar notificaciones para evitar duplicados
    // Coordinadores y supervisores son los "generadores" de notificaciones
    const canGenerateNotifications = ['coordinador', 'supervisor', 'admin'].includes(userRole);

    if (!isActive || !userId || !canGenerateNotifications) {
      return;
    }

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      analysisSupabase.removeChannel(channelRef.current);
    }

    const channelName = `prospectos_notifications_${userId}_${Date.now()}`;

    channelRef.current = analysisSupabase
      .channel(channelName)
      // Escuchar nuevos prospectos
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prospectos'
        },
        async (payload) => {
          const prospecto = payload.new as any;

          // Si tiene coordinacion pero no ejecutivo, notificar a coordinadores
          if (prospecto.coordinacion_id && !prospecto.ejecutivo_id) {
            await notificationsService.notifyNewProspecto({
              id: prospecto.id,
              nombre_completo: prospecto.nombre_completo,
              nombre_whatsapp: prospecto.nombre_whatsapp,
              coordinacion_id: prospecto.coordinacion_id,
              whatsapp: prospecto.whatsapp
            });
          }
        }
      )
      // Escuchar cambios en ejecutivo_id
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospectos'
        },
        async (payload) => {
          const newProspecto = payload.new as any;
          const oldProspecto = payload.old as any;

          // Caso 1: Se asignó un ejecutivo (antes era null)
          if (!oldProspecto.ejecutivo_id && newProspecto.ejecutivo_id) {
            await notificationsService.notifyProspectoAssignment({
              id: newProspecto.id,
              nombre_completo: newProspecto.nombre_completo,
              nombre_whatsapp: newProspecto.nombre_whatsapp,
              ejecutivo_id: newProspecto.ejecutivo_id,
              whatsapp: newProspecto.whatsapp
            });
          }

          // Caso 2: Se activó requiere_atencion_humana
          if (
            newProspecto.requiere_atencion_humana === true &&
            (oldProspecto.requiere_atencion_humana === false || oldProspecto.requiere_atencion_humana === null)
          ) {
            await notificationsService.notifyRequiereAtencion({
              id: newProspecto.id,
              nombre_completo: newProspecto.nombre_completo,
              nombre_whatsapp: newProspecto.nombre_whatsapp,
              coordinacion_id: newProspecto.coordinacion_id,
              ejecutivo_id: newProspecto.ejecutivo_id,
              whatsapp: newProspecto.whatsapp,
              motivo_handoff: newProspecto.motivo_handoff
            });
          }
        }
      )
      .subscribe();

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        analysisSupabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, userRole, isActive]);

  return null;
}
