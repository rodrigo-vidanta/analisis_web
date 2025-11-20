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
 */

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { analysisSupabase } from '../../config/analysisSupabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const NotificationListener: React.FC = () => {
  const { user } = useAuth();

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
  }, [user?.id]);

  // Este componente no renderiza nada
  return null;
};

export default NotificationListener;

