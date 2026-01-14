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
   * Crea una nueva notificación con verificación de duplicados
   * Evita duplicados si hay múltiples usuarios conectados escuchando los mismos cambios
   */
  async createNotification(payload: NotificationPayload): Promise<UserNotification | null> {
    try {
      // Verificar si ya existe una notificación similar reciente (últimos 30 segundos)
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      const prospectoId = payload.metadata?.prospecto_id;

      if (prospectoId) {
        const { data: existing } = await notificationsClient
          .from('user_notifications')
          .select('id')
          .eq('user_id', payload.user_id)
          .eq('type', payload.type)
          .gte('created_at', thirtySecondsAgo)
          .limit(1);

        // También verificar por prospecto_id en metadata
        if (existing && existing.length > 0) {
          // Ya existe una notificación reciente, no duplicar
          return null;
        }
      }

      // Insertar nueva notificación
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
          .select(`
            id, 
            full_name,
            auth_roles(name)
          `)
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
            .select(`
              id, 
              full_name,
              auth_roles!inner(name)
            `)
            .in('id', userIds)
            .eq('is_active', true)
            .in('auth_roles.name', ['coordinador', 'supervisor']);

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
   * Notifica a usuarios sobre un nuevo prospecto
   * 
   * ARQUITECTURA CROSS-DATABASE:
   * 1. Consulta usuarios en SystemUI (auth_users, auth_user_coordinaciones)
   * 2. Inserta notificaciones en PQNC_AI (user_notifications)
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
    let notificationsCreated = 0;
    
    try {
      // Obtener usuarios a notificar desde SystemUI
      const users = await this.getUsersForProspectoNotification(
        prospecto.coordinacion_id || null,
        prospecto.ejecutivo_id || null
      );

      // Crear notificaciones en PQNC_AI
      for (const user of users) {
        const isAssignment = user.userId === prospecto.ejecutivo_id;
        
        const notification = await this.createNotification({
          user_id: user.userId,
          type: isAssignment ? 'prospecto_asignado' : 'nuevo_prospecto',
          title: isAssignment ? 'Prospecto asignado' : 'Nuevo prospecto en tu coordinacion',
          message: isAssignment 
            ? `Se te ha asignado a ${nombreProspecto}`
            : `${nombreProspecto} esta esperando atencion`,
          metadata: {
            prospecto_id: prospecto.id,
            prospecto_nombre: nombreProspecto,
            coordinacion_id: prospecto.coordinacion_id,
            telefono: prospecto.whatsapp,
            action_url: `/live-chat?prospecto=${prospecto.id}`
          }
        });

        if (notification) {
          notificationsCreated++;
        }
      }

      return { success: true, notifications_created: notificationsCreated };
    } catch (error) {
      console.error('Error creando notificaciones:', error);
      return { success: false, notifications_created: 0 };
    }
  }

  /**
   * Notifica a un ejecutivo cuando se le asigna un prospecto
   * 
   * ARQUITECTURA CROSS-DATABASE:
   * 1. Verifica ejecutivo en SystemUI (auth_users)
   * 2. Inserta notificación en PQNC_AI (user_notifications)
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
      // Verificar que el ejecutivo existe y está activo en SystemUI
      const { data: ejecutivo } = await supabaseSystemUI
        .from('auth_users')
        .select(`
          id, 
          full_name, 
          is_active,
          auth_roles!inner(name)
        `)
        .eq('id', prospecto.ejecutivo_id)
        .eq('is_active', true)
        .eq('auth_roles.name', 'ejecutivo')
        .single();

      if (!ejecutivo) {
        return { success: false };
      }

      // Crear notificación en PQNC_AI
      const notification = await this.createNotification({
        user_id: prospecto.ejecutivo_id,
        type: 'prospecto_asignado',
        title: 'Prospecto asignado',
        message: `Se te ha asignado a ${nombreProspecto}`,
        metadata: {
          prospecto_id: prospecto.id,
          prospecto_nombre: nombreProspecto,
          telefono: prospecto.whatsapp,
          action_url: `/live-chat?prospecto=${prospecto.id}`
        }
      });

      return { success: !!notification };
    } catch (error) {
      console.error('Error creando notificación de asignación:', error);
      return { success: false };
    }
  }

  /**
   * Notifica cuando un prospecto requiere atención humana
   * 
   * ARQUITECTURA CROSS-DATABASE:
   * 1. Consulta ejecutivo o coordinadores en SystemUI
   * 2. Inserta notificación en PQNC_AI
   */
  async notifyRequiereAtencion(prospecto: {
    id: string;
    nombre_completo?: string;
    nombre_whatsapp?: string;
    coordinacion_id?: string;
    ejecutivo_id?: string;
    whatsapp?: string;
    motivo_handoff?: string;
  }): Promise<{ success: boolean; notifications_created: number }> {
    const nombreProspecto = prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Prospecto';
    const motivo = prospecto.motivo_handoff || 'Requiere atencion humana';
    let notificationsCreated = 0;
    
    try {
      const usersToNotify: string[] = [];

      // Si tiene ejecutivo asignado, notificar al ejecutivo
      if (prospecto.ejecutivo_id) {
        const { data: ejecutivo } = await supabaseSystemUI
          .from('auth_users')
          .select(`
            id,
            auth_roles!inner(name)
          `)
          .eq('id', prospecto.ejecutivo_id)
          .eq('is_active', true)
          .eq('auth_roles.name', 'ejecutivo')
          .single();

        if (ejecutivo) {
          usersToNotify.push(ejecutivo.id);
        }
      }

      // Si NO tiene ejecutivo pero tiene coordinación, notificar a coordinadores
      if (usersToNotify.length === 0 && prospecto.coordinacion_id) {
        const { data: userCoords } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .select('user_id')
          .eq('coordinacion_id', prospecto.coordinacion_id);

        if (userCoords && userCoords.length > 0) {
          const userIds = userCoords.map(uc => uc.user_id);

          // ============================================
          // CORRECCIÓN 2025-01-14: Usar JOIN con auth_roles
          // ============================================
          // La tabla auth_users NO tiene columna 'role_name' directamente.
          // El rol se obtiene via FK 'role_id' → 'auth_roles.id'.
          // Usamos 'auth_roles!inner(name)' para hacer el JOIN y filtrar.
          // 
          // PROPÓSITO: Obtener coordinadores/supervisores de la coordinación
          // para notificarles cuando un prospecto requiere atención humana
          // y NO tiene ejecutivo asignado.
          // ============================================
          const { data: coordinadores } = await supabaseSystemUI
            .from('auth_users')
            .select('id, auth_roles!inner(name)')
            .in('id', userIds)
            .eq('is_active', true)
            .in('auth_roles.name', ['coordinador', 'supervisor']);

          if (coordinadores) {
            usersToNotify.push(...coordinadores.map(c => c.id));
          }
        }
      }

      // Crear notificaciones en PQNC_AI
      for (const userId of usersToNotify) {
        const notification = await this.createNotification({
          user_id: userId,
          type: 'requiere_atencion',
          title: 'Atencion humana requerida',
          message: `${nombreProspecto}: ${motivo}`,
          metadata: {
            prospecto_id: prospecto.id,
            prospecto_nombre: nombreProspecto,
            motivo: motivo,
            coordinacion_id: prospecto.coordinacion_id,
            telefono: prospecto.whatsapp,
            action_url: `/live-chat?prospecto=${prospecto.id}`
          }
        });

        if (notification) {
          notificationsCreated++;
        }
      }

      return { success: true, notifications_created: notificationsCreated };
    } catch (error) {
      console.error('Error creando notificación de atención requerida:', error);
      return { success: false, notifications_created: 0 };
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

