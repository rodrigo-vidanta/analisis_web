/**
 * ============================================
 * SERVICIO DE NOTIFICACIONES - ESTILO REDES SOCIALES
 * ============================================
 * 
 * Sistema de notificaciones en tiempo real para:
 * - Nuevos prospectos asignados
 * - Prospectos que llegan a una coordinación
 * 
 * ROLES QUE RECIBEN NOTIFICACIONES:
 * - Coordinadores (operativos): cuando llega un prospecto a su coordinación
 * - Supervisores: cuando se les asigna un prospecto
 * - Ejecutivos: cuando se les asigna un prospecto
 * 
 * ROLES EXCLUIDOS:
 * - Administradores
 * - Coordinadores de calidad
 * - Administradores operativos
 * - Developer
 * - Evaluador
 */

import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Cliente para notificaciones usando PQNC_AI (donde está la tabla user_notifications)
const NOTIFICATIONS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const NOTIFICATIONS_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4Njc4NywiZXhwIjoyMDY4MjYyNzg3fQ.oyKsFpO_8ulE_m877kpDoxF-htfenoXjq0_GrFThrwI';

const notificationsClient = createClient(NOTIFICATIONS_SUPABASE_URL, NOTIFICATIONS_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

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

export interface NotificationPayload {
  user_id: string;
  type: UserNotification['type'];
  title: string;
  message: string;
  metadata?: UserNotification['metadata'];
}

// Roles que pueden recibir notificaciones de prospectos
const ROLES_CON_NOTIFICACIONES = ['coordinador', 'supervisor', 'ejecutivo'];

// Roles excluidos de notificaciones
const ROLES_EXCLUIDOS = ['admin', 'administrador_operativo', 'developer', 'evaluador'];

// ============================================
// SERVICIO DE NOTIFICACIONES
// ============================================

class NotificationsService {
  private prospectosChannel: RealtimeChannel | null = null;
  private notificationsChannel: RealtimeChannel | null = null;

  /**
   * Verifica si un usuario puede recibir notificaciones
   * 
   * ROLES PERMITIDOS:
   * - Coordinadores (incluye calidad)
   * - Supervisores
   * - Ejecutivos
   */
  async canUserReceiveNotifications(userId: string, roleName: string): Promise<boolean> {
    // Roles excluidos nunca reciben notificaciones
    if (ROLES_EXCLUIDOS.includes(roleName)) {
      return false;
    }

    // Verificar si el rol base puede recibir notificaciones
    // Coordinadores (todos, incluyendo calidad), supervisores y ejecutivos
    if (!ROLES_CON_NOTIFICACIONES.includes(roleName)) {
      return false;
    }

    return true;
  }

  /**
   * Obtiene las notificaciones no leídas de un usuario
   * Usa fetch directo con service_role para bypasear RLS
   */
  async getUnreadNotifications(userId: string): Promise<UserNotification[]> {
    try {
      // Usar el cliente de Supabase directamente (más confiable)
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
      // Usar notificationsClient (PQNC_AI)
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
   * Marca una notificación como leída/clickeada y la elimina
   */
  async markAsReadAndDelete(notificationId: string): Promise<boolean> {
    try {
      // Usar cliente dedicado con service_role
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
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      // Usar notificationsClient (PQNC_AI)
      const { error } = await notificationsClient
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marcando notificaciones como leídas:', error);
      return false;
    }
  }

  /**
   * Crea una nueva notificación
   */
  async createNotification(payload: NotificationPayload): Promise<UserNotification | null> {
    try {
      // Usar notificationsClient (PQNC_AI)
      const { data, error } = await notificationsClient
        .from('user_notifications')
        .insert({
          user_id: payload.user_id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creando notificación:', error);
      return null;
    }
  }

  /**
   * Obtiene usuarios que deben recibir notificación por un nuevo prospecto
   * Busca coordinadores, supervisores y ejecutivos de la coordinación
   * Usa auth_user_coordinaciones para determinar pertenencia a coordinación
   */
  async getUsersForProspectoNotification(
    coordinacionId: string | null,
    ejecutivoId: string | null
  ): Promise<{ userId: string; roleName: string; nombre: string }[]> {
    const users: { userId: string; roleName: string; nombre: string }[] = [];

    try {
      // Si hay ejecutivo asignado, notificar directamente
      if (ejecutivoId) {
        const { data: ejecutivo } = await supabaseSystemUI
          .from('auth_users')
          .select('id, full_name, role_name')
          .eq('id', ejecutivoId)
          .eq('is_active', true)
          .single();

        if (ejecutivo && ejecutivo.role_name === 'ejecutivo') {
          users.push({
            userId: ejecutivo.id,
            roleName: ejecutivo.role_name,
            nombre: ejecutivo.full_name
          });
        }
      }

      // Si hay coordinación, notificar a coordinadores y supervisores
      if (coordinacionId) {
        // Buscar usuarios que pertenezcan a esta coordinación via auth_user_coordinaciones
        const { data: userCoords, error } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .select('user_id')
          .eq('coordinacion_id', coordinacionId);

        if (error) {
          console.warn('Error buscando usuarios por coordinación:', error.message);
        }

        if (userCoords && userCoords.length > 0) {
          const userIds = userCoords.map(uc => uc.user_id);

          // Obtener datos de esos usuarios (coordinadores y supervisores)
          const { data: usersData } = await supabaseSystemUI
            .from('auth_users')
            .select('id, full_name, role_name')
            .in('id', userIds)
            .eq('is_active', true)
            .in('role_name', ['coordinador', 'supervisor']);

          if (usersData) {
            for (const u of usersData) {
              // Verificar que el coordinador no sea de calidad
              const canReceive = await this.canUserReceiveNotifications(u.id, u.role_name);
              if (canReceive && !users.find(existing => existing.userId === u.id)) {
                users.push({
                  userId: u.id,
                  roleName: u.role_name,
                  nombre: u.full_name
                });
              }
            }
          }
        }
      }

      return users;
    } catch (error) {
      console.error('Error obteniendo usuarios para notificación:', error);
      return [];
    }
  }

  /**
   * Notifica a usuarios sobre un nuevo prospecto usando RPC
   */
  async notifyNewProspecto(prospecto: {
    id: string;
    nombre_completo?: string;
    nombre_whatsapp?: string;
    coordinacion_id?: string;
    ejecutivo_id?: string;
    whatsapp?: string;
  }): Promise<{ success: boolean; notifications_created: number }> {
    const nombreProspecto = prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Nuevo prospecto';
    
    try {
      // Usar notificationsClient (PQNC_AI) para crear notificaciones
      const { data, error } = await notificationsClient.rpc('create_prospect_notifications', {
        p_prospecto_id: prospecto.id,
        p_prospecto_nombre: nombreProspecto,
        p_coordinacion_id: prospecto.coordinacion_id || null,
        p_ejecutivo_id: prospecto.ejecutivo_id || null,
        p_telefono: prospecto.whatsapp || null
      });

      if (error) throw error;
      
      console.log('📬 Notificaciones creadas:', data);
      return data as { success: boolean; notifications_created: number };
    } catch (error) {
      console.error('Error creando notificaciones:', error);
      return { success: false, notifications_created: 0 };
    }
  }

  /**
   * Notifica a un ejecutivo cuando se le asigna un prospecto
   */
  async notifyProspectoAssignment(prospecto: {
    id: string;
    nombre_completo?: string;
    nombre_whatsapp?: string;
    ejecutivo_id: string;
    whatsapp?: string;
  }): Promise<{ success: boolean }> {
    const nombreProspecto = prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Nuevo prospecto';
    
    try {
      // Usar notificationsClient (PQNC_AI) para crear notificaciones
      const { data, error } = await notificationsClient.rpc('create_assignment_notification', {
        p_prospecto_id: prospecto.id,
        p_prospecto_nombre: nombreProspecto,
        p_ejecutivo_id: prospecto.ejecutivo_id,
        p_telefono: prospecto.whatsapp || null
      });

      if (error) throw error;
      
      console.log('📋 Notificación de asignación creada:', data);
      return data as { success: boolean };
    } catch (error) {
      console.error('Error creando notificación de asignación:', error);
      return { success: false };
    }
  }

  /**
   * Suscribe a cambios en prospectos para notificaciones en tiempo real
   */
  subscribeToProspectos(
    userId: string,
    roleName: string,
    coordinacionId: string | null,
    callback: (prospecto: any) => void
  ): () => void {
    // Verificar si el rol puede recibir notificaciones (sincrónico para suscripción)
    if (ROLES_EXCLUIDOS.includes(roleName)) {
      return () => {}; // No-op para roles excluidos
    }

    if (!ROLES_CON_NOTIFICACIONES.includes(roleName)) {
      return () => {};
    }

    // Suscribirse a inserts en prospectos
    this.prospectosChannel = analysisSupabase
      .channel('prospectos-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prospectos'
        },
        async (payload) => {
          const prospecto = payload.new as any;
          
          // Verificar si este prospecto corresponde al usuario actual
          const shouldNotify = await this.shouldNotifyUser(
            userId,
            roleName,
            coordinacionId,
            prospecto
          );

          if (shouldNotify) {
            callback(prospecto);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospectos',
          filter: 'ejecutivo_id=neq.null'
        },
        async (payload) => {
          const prospecto = payload.new as any;
          const oldProspecto = payload.old as any;

          // Solo notificar si se acaba de asignar un ejecutivo (antes era null)
          if (!oldProspecto.ejecutivo_id && prospecto.ejecutivo_id) {
            const shouldNotify = await this.shouldNotifyUser(
              userId,
              roleName,
              coordinacionId,
              prospecto
            );

            if (shouldNotify) {
              callback(prospecto);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (this.prospectosChannel) {
        analysisSupabase.removeChannel(this.prospectosChannel);
        this.prospectosChannel = null;
      }
    };
  }

  /**
   * Suscribe a cambios en las notificaciones del usuario
   * Usa analysisSupabase (PQNC_AI con anon_key) que tiene realtime configurado
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
          callback(payload.new as UserNotification);
        }
      )
      .subscribe();

    return () => {
      if (this.notificationsChannel && analysisSupabase) {
        analysisSupabase.removeChannel(this.notificationsChannel);
        this.notificationsChannel = null;
      }
    };
  }

  /**
   * Determina si un usuario debe ser notificado sobre un prospecto
   */
  private async shouldNotifyUser(
    userId: string,
    roleName: string,
    userCoordinacionId: string | null,
    prospecto: any
  ): Promise<boolean> {
    // Si es ejecutivo, notificar solo si el prospecto le fue asignado
    if (roleName === 'ejecutivo') {
      return prospecto.ejecutivo_id === userId;
    }

    // Si es supervisor, notificar si el prospecto está en su coordinación
    if (roleName === 'supervisor') {
      return userCoordinacionId && prospecto.coordinacion_id === userCoordinacionId;
    }

    // Si es coordinador, notificar si el prospecto está en su coordinación
    if (roleName === 'coordinador') {
      if (!userCoordinacionId) return false;
      
      // Verificar que no sea coordinador de calidad (ya se verifica al suscribirse)
      return prospecto.coordinacion_id === userCoordinacionId;
    }

    return false;
  }

  /**
   * Limpia notificaciones expiradas
   */
  async cleanExpiredNotifications(): Promise<void> {
    try {
      // Usar notificationsClient (PQNC_AI)
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

