/**
 * ============================================
 * SERVICIO DE NOTIFICACIONES - v2.0 (2026-01-15)
 * ============================================
 * 
 * ARQUITECTURA:
 * - Las notificaciones son GENERADAS por un trigger de base de datos
 *   (fn_notify_prospecto_changes) en PQNC_AI
 * - El frontend SOLO escucha via Realtime y muestra las notificaciones
 * - Esto elimina duplicados causados por múltiples clientes conectados
 * 
 * FLUJO:
 * 1. Evento en tabla prospectos (INSERT/UPDATE)
 * 2. Trigger fn_notify_prospecto_changes se ejecuta
 * 3. Trigger inserta en user_notifications
 * 4. Realtime detecta INSERT y notifica al frontend
 * 5. Frontend muestra toast + actualiza contador
 * 
 * TIPOS DE NOTIFICACIONES:
 * - nuevo_prospecto: Prospecto llega a coordinación sin ejecutivo
 * - prospecto_asignado: Se asigna ejecutivo a un prospecto
 * - requiere_atencion: Se activa flag requiere_atencion_humana
 * 
 * ROLES QUE RECIBEN NOTIFICACIONES:
 * - Coordinadores (operativos)
 * - Supervisores
 * - Ejecutivos
 */

import { analysisSupabase } from '../config/analysisSupabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Cliente para notificaciones - USAR analysisSupabase (anon_key + RLS)
// SEGURIDAD: NUNCA hardcodear service_role keys en el frontend
const notificationsClient = analysisSupabase;

// ============================================
// TIPOS
// ============================================

export interface UserNotification {
  id: string;
  user_id: string;
  type: 'nuevo_prospecto' | 'prospecto_asignado' | 'mensaje_nuevo' | 'requiere_atencion';
  title: string;
  message: string;
  metadata: {
    prospecto_id?: string;
    prospecto_nombre?: string;
    coordinacion_id?: string;
    coordinacion_nombre?: string;
    telefono?: string;
    action_url?: string;
    motivo?: string;
  };
  is_read: boolean;
  clicked: boolean;
  created_at: string;
  read_at?: string;
  expires_at: string;
}

// Roles que pueden recibir notificaciones
const ROLES_CON_NOTIFICACIONES = ['coordinador', 'supervisor', 'ejecutivo'];

// Roles excluidos de notificaciones
const ROLES_EXCLUIDOS = ['admin', 'administrador_operativo', 'developer', 'evaluador'];

// ============================================
// SERVICIO DE NOTIFICACIONES
// ============================================

class NotificationsService {
  private notificationsChannel: RealtimeChannel | null = null;

  /**
   * Verifica si un usuario puede recibir notificaciones
   */
  async canUserReceiveNotifications(userId: string, roleName: string): Promise<boolean> {
    if (ROLES_EXCLUIDOS.includes(roleName)) {
      return false;
    }
    if (!ROLES_CON_NOTIFICACIONES.includes(roleName)) {
      return false;
    }
    return true;
  }

  /**
   * Obtiene las notificaciones no leídas de un usuario
   */
  async getUnreadNotifications(userId: string): Promise<UserNotification[]> {
    try {
      const { data, error } = await notificationsClient
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('🔔 [NotificationsService] Error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await notificationsClient
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error contando notificaciones:', error);
      return 0;
    }
  }

  /**
   * Marca una notificación como leída y la elimina
   */
  async markAsReadAndDelete(notificationId: string): Promise<boolean> {
    try {
      const { error } = await notificationsClient
        .from('user_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando notificación:', error);
      return false;
    }
  }

  /**
   * Marca todas las notificaciones como leídas (botón "Limpiar")
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await notificationsClient
        .from('user_notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error limpiando notificaciones:', error);
      return false;
    }
  }

  /**
   * Suscribe a cambios en las notificaciones del usuario (REALTIME)
   * Usa analysisSupabase que tiene realtime configurado
   */
  subscribeToUserNotifications(
    userId: string,
    callback: (notification: UserNotification) => void
  ): () => void {
    if (!analysisSupabase) {
      console.error('🔔 [Realtime] analysisSupabase no está disponible');
      return () => {};
    }

    // Limpiar canal anterior si existe
    if (this.notificationsChannel) {
      analysisSupabase.removeChannel(this.notificationsChannel);
      this.notificationsChannel = null;
    }

    // Canal único con timestamp para evitar conflictos
    const channelName = `user_notifications_${userId}_${Date.now()}`;
    
    console.log(`🔔 [Realtime] Suscribiendo a notificaciones: ${channelName}`);
    
    this.notificationsChannel = analysisSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 [Realtime] Notificación recibida:', payload.new);
          callback(payload.new as UserNotification);
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [Realtime] Estado de suscripción: ${status}`);
      });

    return () => {
      if (this.notificationsChannel && analysisSupabase) {
        console.log('🔔 [Realtime] Desuscribiendo de notificaciones');
        analysisSupabase.removeChannel(this.notificationsChannel);
        this.notificationsChannel = null;
      }
    };
  }

  /**
   * Limpia notificaciones expiradas (mantenimiento)
   */
  async cleanExpiredNotifications(): Promise<void> {
    try {
      await notificationsClient
        .from('user_notifications')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Error limpiando notificaciones expiradas:', error);
    }
  }
}

export const notificationsService = new NotificationsService();
