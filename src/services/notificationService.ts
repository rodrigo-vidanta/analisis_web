/**
 * ============================================
 * SERVICIO DE NOTIFICACIONES
 * ============================================
 * 
 * Maneja notificaciones en tiempo real para:
 * - Nuevos mensajes en Live Chat
 * - Nuevas llamadas en Live Monitor
 */

import { analysisSupabase } from '../config/analysisSupabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  created_at: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: {
    new_message: number;
    new_call: number;
  };
}

class NotificationService {
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private userId: string | null = null;

  /**
   * Inicializar el servicio con el ID del usuario
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Obtener notificaciones del usuario
   */
  async getNotifications(limit: number = 50): Promise<UserNotification[]> {
    if (!this.userId) {
      console.warn('⚠️ NotificationService: userId no configurado');
      return [];
    }

    try {
      if (!analysisSupabase) {
        console.warn('⚠️ NotificationService: analysisSupabase no está configurado');
        return [];
      }

      const { data, error } = await analysisSupabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Si la tabla no existe, retornar array vacío silenciosamente
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          return [];
        }
        console.error('❌ Error obteniendo notificaciones:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      // Si la tabla no existe, retornar array vacío silenciosamente
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        return [];
      }
      console.error('❌ Error en getNotifications:', error);
      return [];
    }
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  async getUnreadCount(): Promise<NotificationCounts> {
    if (!this.userId) {
      return { total: 0, unread: 0, byType: { new_message: 0, new_call: 0 } };
    }

    try {
      if (!analysisSupabase) {
        return { total: 0, unread: 0, byType: { new_message: 0, new_call: 0 } };
      }

      const { data, error } = await analysisSupabase
        .from('user_notifications')
        .select('notification_type, is_read')
        .eq('user_id', this.userId);

      if (error) {
        // Si la tabla no existe, retornar contadores en cero silenciosamente
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          return { total: 0, unread: 0, byType: { new_message: 0, new_call: 0 } };
        }
        console.error('❌ Error obteniendo contador:', error);
        return { total: 0, unread: 0, byType: { new_message: 0, new_call: 0 } };
      }

      const total = data?.length || 0;
      const unread = data?.filter(n => !n.is_read).length || 0;
      const byType = {
        new_message: data?.filter(n => n.notification_type === 'new_message' && !n.is_read).length || 0,
        new_call: data?.filter(n => n.notification_type === 'new_call' && !n.is_read).length || 0,
      };

      return { total, unread, byType };
    } catch (error: any) {
      // Si la tabla no existe, retornar contadores en cero silenciosamente
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        return { total: 0, unread: 0, byType: { new_message: 0, new_call: 0 } };
      }
      console.error('❌ Error en getUnreadCount:', error);
      return { total: 0, unread: 0, byType: { new_message: 0, new_call: 0 } };
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!analysisSupabase) return false;

      const { error } = await analysisSupabase
        .from('user_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', this.userId);

      if (error) {
        // Si la tabla no existe, retornar true silenciosamente
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          return true;
        }
        console.error('❌ Error marcando como leída:', error);
        return false;
      }

      return true;
    } catch (error: any) {
      // Si la tabla no existe, retornar true silenciosamente
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        return true;
      }
      console.error('❌ Error en markAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(module?: 'live-chat' | 'live-monitor'): Promise<boolean> {
    if (!this.userId) return false;

    try {
      if (!analysisSupabase) return false;

      let query = analysisSupabase
        .from('user_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', this.userId)
        .eq('is_read', false);

      if (module) {
        query = query.eq('module', module);
      }

      const { error } = await query;

      if (error) {
        // Si la tabla no existe, solo loggear silenciosamente (no es crítico)
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          // Tabla no existe, ignorar silenciosamente
          return true; // Retornar true para no bloquear el flujo
        }
        console.error('❌ Error marcando todas como leídas:', error);
        return false;
      }

      return true;
    } catch (error: any) {
      // Si la tabla no existe, ignorar silenciosamente
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        return true; // Retornar true para no bloquear el flujo
      }
      console.error('❌ Error en markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Crear notificación para un usuario
   */
  async createNotification(notification: Omit<UserNotification, 'id' | 'created_at' | 'is_read' | 'read_at'>): Promise<string | null> {
    try {
      if (!analysisSupabase) {
        console.warn('⚠️ NotificationService: analysisSupabase no está configurado');
        return null;
      }

      const { data, error } = await analysisSupabase
        .from('user_notifications')
        .insert({
          ...notification,
          is_read: false,
        })
        .select('id')
        .single();

      // Si la tabla no existe, retornar null silenciosamente
      if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find the table'))) {
        return null;
      }

      if (error) {
        console.error('❌ Error creando notificación:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('❌ Error en createNotification:', error);
      return null;
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
      console.warn('⚠️ NotificationService: userId no configurado para suscripción');
      return () => {};
    }

    const channelName = `user_notifications_${this.userId}`;
    
    // Limpiar canal existente si existe
    if (this.realtimeChannels.has(channelName)) {
      this.realtimeChannels.get(channelName)?.unsubscribe();
    }

    if (!analysisSupabase) {
      console.warn('⚠️ NotificationService: analysisSupabase no está configurado');
      return () => {};
    }

    const channel = analysisSupabase
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
          if (payload.eventType === 'INSERT') {
            const notification = payload.new as UserNotification;
            onNotification(notification);
            
            // Actualizar contador
            if (onCountChange) {
              const counts = await this.getUnreadCount();
              onCountChange(counts);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Si se marca como leída, actualizar contador
            if (onCountChange) {
              const counts = await this.getUnreadCount();
              onCountChange(counts);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a notificaciones del usuario');
        }
      });

    this.realtimeChannels.set(channelName, channel);

    // Retornar función de limpieza
    return () => {
      channel.unsubscribe();
      this.realtimeChannels.delete(channelName);
    };
  }

  /**
   * Suscribirse a nuevos mensajes en Live Chat
   * Esta función debe ser llamada desde el módulo de Live Chat
   */
  subscribeToNewMessages(
    userId: string,
    onNewMessage: (message: any) => void
  ): () => void {
    const channelName = `live_chat_messages_${userId}`;

    // Limpiar canal existente si existe
    if (this.realtimeChannels.has(channelName)) {
      this.realtimeChannels.get(channelName)?.unsubscribe();
    }

    const channel = analysisSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_whatsapp',
        },
        async (payload) => {
          const message = payload.new;
          
          // Obtener datos del prospecto (Single Source of Truth)
          let customerName = 'Cliente';
          let customerPhone = '';
          
          if (message.prospecto_id) {
            const { prospectsService } = await import('./prospectsService');
            const prospecto = await prospectsService.getProspectById(message.prospecto_id);
            if (prospecto) {
              customerName = prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Cliente';
              customerPhone = prospecto.whatsapp || '';
            }
          }
          
          // Crear notificación para el usuario
          await this.createNotification({
            user_id: userId,
            notification_type: 'new_message',
            module: 'live-chat',
            message_id: message.id,
            prospect_id: message.prospecto_id,
            customer_name: customerName,
            customer_phone: customerPhone,
            message_preview: message.mensaje?.substring(0, 100) || '',
          });

          onNewMessage(message);
        }
      )
      .subscribe();

    this.realtimeChannels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.realtimeChannels.delete(channelName);
    };
  }

  /**
   * Suscribirse a nuevas llamadas en Live Monitor
   * Esta función debe ser llamada desde el módulo de Live Monitor
   */
  subscribeToNewCalls(
    userId: string,
    onNewCall: (call: any) => void
  ): () => void {
    const channelName = `live_monitor_calls_${userId}`;

    // Limpiar canal existente si existe
    if (this.realtimeChannels.has(channelName)) {
      this.realtimeChannels.get(channelName)?.unsubscribe();
    }

    const channel = analysisSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'llamadas_ventas',
        },
        async (payload) => {
          const call = payload.new;
          
          // Crear notificación para el usuario
          await this.createNotification({
            user_id: userId,
            notification_type: 'new_call',
            module: 'live-monitor',
            call_id: call.call_id,
            call_status: call.call_status,
            prospect_id: call.prospecto,
          });

          onNewCall(call);
        }
      )
      .subscribe();

    this.realtimeChannels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.realtimeChannels.delete(channelName);
    };
  }

  /**
   * Limpiar todas las suscripciones
   */
  cleanup() {
    this.realtimeChannels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.realtimeChannels.clear();
  }
}

export const notificationService = new NotificationService();

