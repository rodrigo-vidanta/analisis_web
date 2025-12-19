/**
 * ============================================
 * LISTENER GLOBAL DE NOTIFICACIONES
 * ============================================
 * 
 * Componente que se monta globalmente y escucha:
 * - Nuevos mensajes en Live Chat
 * - Nuevas llamadas en Live Monitor
 * 
 * Crea notificaciones automáticamente cuando detecta estos eventos
 * 
 * ⚠️ CRÍTICO: Verifica permisos del usuario antes de crear notificaciones
 * para evitar que ejecutivos vean mensajes de prospectos no asignados
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { analysisSupabase } from '../../config/analysisSupabase';
import { permissionsService } from '../../services/permissionsService';
import type { RealtimeChannel } from '@supabase/supabase-js';

const NotificationListener: React.FC = () => {
  const { user } = useAuth();
  
  // Refs para datos de permisos cacheados localmente
  const isAdminRef = useRef<boolean | null>(null);
  const permissionsLoadedRef = useRef(false);

  // Verificar permisos de acceso a un prospecto
  const checkProspectAccess = useCallback(async (prospectId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    // Admin siempre tiene acceso
    if (isAdminRef.current === true) return true;
    
    // Verificar permisos específicos del prospecto
    try {
      const result = await permissionsService.canUserAccessProspect(user.id, prospectId);
      return result.canAccess;
    } catch (error) {
      console.error('[NotificationListener] Error verificando permisos:', error);
      return false; // Por seguridad, denegar si hay error
    }
  }, [user?.id]);

  // Cargar permisos iniciales del usuario
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id || permissionsLoadedRef.current) return;
      
      try {
        const isAdmin = await permissionsService.isAdmin(user.id);
        isAdminRef.current = isAdmin;
        permissionsLoadedRef.current = true;
      } catch (error) {
        console.error('[NotificationListener] Error cargando permisos:', error);
      }
    };
    
    loadPermissions();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    notificationService.setUserId(user.id);
    const channels: RealtimeChannel[] = [];

    // Suscripción a nuevos mensajes en mensajes_whatsapp
    const messagesChannel = analysisSupabase
      .channel(`global_notifications_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_whatsapp',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Solo crear notificación si el mensaje es del prospecto (no del sistema)
          if (message.rol === 'Prospecto' && message.prospecto_id) {
            // ⚠️ CRÍTICO: Verificar permisos ANTES de crear notificación
            const hasAccess = await checkProspectAccess(message.prospecto_id);
            if (!hasAccess) {
              // Usuario no tiene acceso a este prospecto, no crear notificación
              return;
            }
            
            try {
              await notificationService.createNotification({
                user_id: user.id,
                notification_type: 'new_message',
                module: 'live-chat',
                message_id: message.id,
                prospect_id: message.prospecto_id,
                customer_name: message.nombre_contacto || message.customer_name,
                customer_phone: message.numero_telefono || message.customer_phone,
                message_preview: message.mensaje?.substring(0, 100) || '',
              });
            } catch (error) {
              console.error('Error creando notificación de mensaje:', error);
            }
          }
        }
      )
      .subscribe();

    channels.push(messagesChannel);

    // Suscripción a nuevas llamadas en llamadas_ventas
    const callsChannel = analysisSupabase
      .channel(`global_notifications_calls_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'llamadas_ventas',
        },
        async (payload) => {
          const call = payload.new as any;
          
          // Solo crear notificación para llamadas activas o nuevas
          if (call.call_status === 'activa' || call.call_status === 'ringing') {
            // ⚠️ CRÍTICO: Verificar permisos ANTES de crear notificación
            if (call.prospecto) {
              const hasAccess = await checkProspectAccess(call.prospecto);
              if (!hasAccess) {
                // Usuario no tiene acceso a este prospecto, no crear notificación
                return;
              }
            }
            
            try {
              await notificationService.createNotification({
                user_id: user.id,
                notification_type: 'new_call',
                module: 'live-monitor',
                call_id: call.call_id,
                call_status: call.call_status,
                prospect_id: call.prospecto,
              });
            } catch (error) {
              console.error('Error creando notificación de llamada:', error);
            }
          }
        }
      )
      .subscribe();

    channels.push(callsChannel);

    // Cleanup
    return () => {
      channels.forEach((channel) => {
        channel.unsubscribe();
      });
    };
  }, [user?.id, checkProspectAccess]);

  // Este componente no renderiza nada
  return null;
};

export default NotificationListener;

