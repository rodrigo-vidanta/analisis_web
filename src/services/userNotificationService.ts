/**
 * ============================================
 * SERVICIO DE NOTIFICACIONES POR USUARIO
 * ============================================
 * 
 * Maneja notificaciones individuales por usuario almacenadas en user_notifications
 * - Cada usuario ve solo sus notificaciones según permisos
 * - Las notificaciones se marcan como leídas individualmente por usuario
 * - Soporte para silenciar notificaciones
 * 
 * MEJORA 2026-01-20: Verificación de conexión antes de queries
 */

import { analysisSupabase as supabaseSystemUI } from '../config/analysisSupabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isNetworkOnline } from '../hooks/useNetworkStatus';

export interface UserNotification {
  id: string;
  user_id: string;
  notification_type: 'new_message' | 'new_call';
  module: 'live-chat' | 'live-monitor';
  message_id?: string;
  conversation_id?: string;
  prospect_id?: string;
  customer_name?: string;
  customer_phone?: string;
  message_preview?: string;
  call_id?: string;
  call_status?: string;
  is_read: boolean;
  read_at?: string;
  is_muted: boolean;
  created_at: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  activeCalls: number;
  newMessages: number;
}

class UserNotificationService {
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private userId: string | null = null;

  /**
   * Inicializar el servicio con el ID del usuario
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Obtener contador de notificaciones no leídas del usuario
   * MEJORA 2026-01-20: Verificar conexión antes de consultar
   */
  async getUnreadCount(): Promise<NotificationCounts> {
    if (!this.userId) {
      console.log('⚠️ [UserNotificationService] getUnreadCount: No userId configurado');
      return { total: 0, unread: 0, activeCalls: 0, newMessages: 0 };
    }

    // Verificar conexión antes de consultar
    if (!isNetworkOnline()) {
      // Retornar silenciosamente sin loguear error
      return { total: 0, unread: 0, activeCalls: 0, newMessages: 0 };
    }

    try {
      console.log(`🔍 [UserNotificationService] Consultando notificaciones para usuario: ${this.userId}`);
      
      if (!pqncSupabase) {
        console.error('❌ [UserNotificationService] pqncSupabase no está configurado');
        return { total: 0, unread: 0, activeCalls: 0, newMessages: 0 };
      }

      const { data, error, count } = await pqncSupabase
        .from('user_notifications')
        .select('notification_type, is_read', { count: 'exact' })
        .eq('user_id', this.userId)
        .eq('is_read', false);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.log('⚠️ [UserNotificationService] Tabla user_notifications no existe');
          return { total: 0, unread: 0, activeCalls: 0, newMessages: 0 };
        }
        console.error('❌ [UserNotificationService] Error obteniendo contador de notificaciones:', error);
        console.error('❌ [UserNotificationService] Error details:', JSON.stringify(error, null, 2));
        return { total: 0, unread: 0, activeCalls: 0, newMessages: 0 };
      }

      console.log(`📊 [UserNotificationService] Total de registros encontrados: ${count || 0}`);
      console.log(`📊 [UserNotificationService] Datos recibidos:`, data);

      const unreadMessages = data?.filter(n => n.notification_type === 'new_message').length || 0;
      const unreadCalls = data?.filter(n => n.notification_type === 'new_call').length || 0;
      const total = unreadMessages + unreadCalls;

      console.log(`📊 [UserNotificationService] Contadores calculados:`, {
        total,
        unread: total,
        activeCalls: unreadCalls,
        newMessages: unreadMessages,
      });

      return {
        total,
        unread: total,
        activeCalls: unreadCalls,
        newMessages: unreadMessages,
      };
    } catch (error: any) {
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        console.log('⚠️ [UserNotificationService] Tabla user_notifications no existe (catch)');
        return { total: 0, unread: 0, activeCalls: 0, newMessages: 0 };
      }
      console.error('❌ [UserNotificationService] Error en getUnreadCount:', error);
      return { total: 0, unread: 0, activeCalls: 0, newMessages: 0 };
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!pqncSupabase) return false;

      const { error } = await pqncSupabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('❌ Error marcando notificación como leída:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en markAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar todas las notificaciones de un tipo como leídas
   */
  async markAllAsRead(type?: 'new_message' | 'new_call'): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!pqncSupabase) return false;

      let query = pqncSupabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId)
        .eq('is_read', false);

      if (type) {
        query = query.eq('notification_type', type);
      }

      const { error } = await query;

      if (error) {
        console.error('❌ Error marcando todas las notificaciones como leídas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar notificaciones de mensaje como leídas cuando se marca una conversación como leída
   */
  async markMessageNotificationsAsRead(conversationId: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!pqncSupabase) return false;

      const { error } = await pqncSupabase.rpc('mark_message_notifications_as_read', {
        p_conversation_id: conversationId,
        p_user_id: this.userId,
      });

      if (error) {
        // Si la función RPC no existe, usar UPDATE directo
        const { error: updateError } = await pqncSupabase
          .from('user_notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', this.userId)
          .eq('notification_type', 'new_message')
          .eq('is_read', false);

        if (updateError) {
          console.error('❌ Error marcando notificaciones de mensaje como leídas:', updateError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error en markMessageNotificationsAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar notificaciones de llamada como leídas
   */
  async markCallNotificationsAsRead(callId: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!pqncSupabase) return false;

      const { error } = await pqncSupabase.rpc('mark_call_notifications_as_read', {
        p_call_id: callId,
        p_user_id: this.userId,
      });

      if (error) {
        // Si la función RPC no existe, usar UPDATE directo
        const { error: updateError } = await pqncSupabase
          .from('user_notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('call_id', callId)
          .eq('user_id', this.userId)
          .eq('notification_type', 'new_call')
          .eq('is_read', false);

        if (updateError) {
          console.error('❌ Error marcando notificaciones de llamada como leídas:', updateError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error en markCallNotificationsAsRead:', error);
      return false;
    }
  }

  /**
   * Toggle silenciar notificaciones
   */
  async toggleMute(notificationId: string, isMuted: boolean): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!pqncSupabase) return false;

      const { error } = await pqncSupabase
        .from('user_notifications')
        .update({ is_muted: isMuted })
        .eq('id', notificationId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('❌ Error cambiando estado de mute:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en toggleMute:', error);
      return false;
    }
  }

  /**
   * Obtener estado de mute global del usuario
   */
  async getMuteStatus(): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!pqncSupabase) return false;

      // Verificar si hay alguna notificación sin silenciar
      const { data, error } = await pqncSupabase
        .from('user_notifications')
        .select('is_muted')
        .eq('user_id', this.userId)
        .eq('is_read', false)
        .limit(1);

      if (error || !data || data.length === 0) {
        return false; // Por defecto no silenciado
      }

      // Si todas están silenciadas, retornar true
      return data.every(n => n.is_muted === true);
    } catch (error) {
      return false;
    }
  }

  /**
   * Suscribirse a cambios en notificaciones del usuario
   */
  subscribeToNotifications(
    onNotification: (notification: UserNotification) => void,
    onCountChange?: (counts: NotificationCounts) => void
  ): () => void {
    if (!this.userId) {
      console.warn('⚠️ [UserNotificationService] userId no configurado para suscripción');
      return () => {};
    }

    console.log(`🔔 [UserNotificationService] Configurando suscripción para usuario: ${this.userId}`);

    const channelName = `user_notifications_${this.userId}`;
    
    // Limpiar canal existente si existe
    if (this.realtimeChannels.has(channelName)) {
      console.log(`🔄 [UserNotificationService] Limpiando canal existente: ${channelName}`);
      this.realtimeChannels.get(channelName)?.unsubscribe();
    }

    if (!pqncSupabase) {
      console.warn('⚠️ [UserNotificationService] pqncSupabase no está configurado');
      return () => {};
    }

    const channel = pqncSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${this.userId}`,
        },
        async (payload) => {
          console.log(`📨 [UserNotificationService] Evento recibido:`, payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            const notification = payload.new as UserNotification;
            console.log(`✅ [UserNotificationService] Nueva notificación INSERT:`, notification);
            onNotification(notification);
            
            // Actualizar contador
            if (onCountChange) {
              const counts = await this.getUnreadCount();
              console.log(`📊 [UserNotificationService] Contadores actualizados después de INSERT:`, counts);
              onCountChange(counts);
            }
          } else if (payload.eventType === 'UPDATE') {
            console.log(`🔄 [UserNotificationService] Notificación UPDATE:`, payload.new);
            // Si se marca como leída, actualizar contador
            if (onCountChange) {
              const counts = await this.getUnreadCount();
              console.log(`📊 [UserNotificationService] Contadores actualizados después de UPDATE:`, counts);
              onCountChange(counts);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [UserNotificationService] Suscrito a notificaciones del usuario ${this.userId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [UserNotificationService] Error en canal de suscripción`);
        } else {
          console.log(`⚠️ [UserNotificationService] Estado de suscripción: ${status}`);
        }
      });

    this.realtimeChannels.set(channelName, channel);

    // Retornar función de limpieza
    return () => {
      console.log(`🛑 [UserNotificationService] Limpiando suscripción: ${channelName}`);
      channel.unsubscribe();
      this.realtimeChannels.delete(channelName);
    };
  }
}

export const userNotificationService = new UserNotificationService();

