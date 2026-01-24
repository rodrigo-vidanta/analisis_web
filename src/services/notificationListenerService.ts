/**
 * ============================================
 * SERVICIO LISTENER DE NOTIFICACIONES
 * ============================================
 * 
 * Escucha eventos en tiempo real de mensajes y llamadas,
 * determina qué usuarios deben recibir notificaciones según permisos,
 * y crea las notificaciones en user_notifications (system_ui)
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { permissionsService } from './permissionsService';
import type { RealtimeChannel } from '@supabase/supabase-js';

class NotificationListenerService {
  private messageChannel: RealtimeChannel | null = null;
  private callChannel: RealtimeChannel | null = null;
  private isListening = false;

  /**
   * Iniciar escucha de eventos para crear notificaciones
   */
  async startListening() {
    if (this.isListening) {
      console.log('⚠️ [NotificationListener] Ya está escuchando');
      return;
    }

    this.isListening = true;
    console.log('✅ [NotificationListener] Iniciando escucha de eventos...');

    // Suscribirse a nuevos mensajes
    this.messageChannel = analysisSupabase
      .channel('notification-listener-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_whatsapp',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // IMPORTANTE: Solo procesar mensajes ENTRANTES (de Prospecto/Cliente)
          // Ignorar mensajes salientes (de Agente) y mensajes ya leídos
          if (message.rol !== 'Prospecto' || message.leido === true) {
            console.log(`⚠️ [NotificationListener] Mensaje ignorado - rol: ${message.rol}, leido: ${message.leido}`);
            return;
          }

          console.log(`📨 [NotificationListener] Mensaje ENTRANTE detectado - ID: ${message.id}, rol: ${message.rol}`);
          await this.createMessageNotifications(message);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [NotificationListener] Suscrito a mensajes nuevos');
        }
      });

    // Suscribirse a nuevas llamadas
    this.callChannel = analysisSupabase
      .channel('notification-listener-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'llamadas_ventas',
        },
        async (payload) => {
          const call = payload.new as any;
          
          // Solo procesar llamadas activas (ENTRANTES o SALIENTES - ambas son relevantes)
          if (call.call_status !== 'activa') {
            console.log(`⚠️ [NotificationListener] Llamada ignorada - status: ${call.call_status}`);
            return;
          }

          console.log(`📞 [NotificationListener] Llamada ACTIVA detectada - ID: ${call.call_id}, status: ${call.call_status}`);
          await this.createCallNotifications(call);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'llamadas_ventas',
        },
        async (payload) => {
          const oldCall = payload.old as any;
          const newCall = payload.new as any;
          
          // Si la llamada cambió de activa a otra cosa, marcar notificaciones como leídas
          if (oldCall.call_status === 'activa' && newCall.call_status !== 'activa') {
            await this.markCallNotificationsAsRead(newCall.call_id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [NotificationListener] Suscrito a llamadas nuevas');
        }
      });
  }

  /**
   * Detener escucha de eventos
   */
  stopListening() {
    if (this.messageChannel) {
      this.messageChannel.unsubscribe();
      this.messageChannel = null;
    }
    if (this.callChannel) {
      this.callChannel.unsubscribe();
      this.callChannel = null;
    }
    this.isListening = false;
    console.log('🛑 [NotificationListener] Escucha detenida');
  }

  /**
   * Crear notificaciones para un mensaje nuevo
   */
  private async createMessageNotifications(message: any) {
    try {
      const prospectId = message.prospecto_id;
      if (!prospectId) {
        console.log('⚠️ [NotificationListener] Mensaje sin prospecto_id, ignorando');
        return;
      }

      console.log(`📨 [NotificationListener] Procesando mensaje para prospecto: ${prospectId}`);

      // Obtener información del prospecto
      const { data: prospecto, error: prospectoError } = await analysisSupabase
        .from('prospectos')
        .select('nombre_completo, whatsapp, ejecutivo_id, coordinacion_id')
        .eq('id', prospectId)
        .single();

      if (prospectoError || !prospecto) {
        console.error('❌ [NotificationListener] Error obteniendo prospecto:', prospectoError);
        return;
      }

      console.log(`✅ [NotificationListener] Prospecto obtenido: ${prospecto.nombre_completo}`);

      // Obtener todos los usuarios activos del sistema con sus roles
      const { data: allUsers, error: usersError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, role_id, is_active')
        .eq('is_active', true);

      if (usersError) {
        console.error('❌ [NotificationListener] Error obteniendo usuarios:', usersError);
        return;
      }

      if (!allUsers || allUsers.length === 0) {
        console.log('⚠️ [NotificationListener] No hay usuarios activos');
        return;
      }

      console.log(`✅ [NotificationListener] ${allUsers.length} usuarios activos encontrados`);

      // Obtener roles para mapear role_id a role_name
      const { data: roles, error: rolesError } = await supabaseSystemUI
        .from('auth_roles')
        .select('id, name');

      if (rolesError) {
        console.error('❌ [NotificationListener] Error obteniendo roles:', rolesError);
        return;
      }

      const roleMap = new Map(roles?.map(r => [r.id, r.name]) || []);

      // Filtrar usuarios que deben recibir la notificación
      const userIds: string[] = [];

      for (const user of allUsers) {
        const roleName = roleMap.get(user.role_id);
        if (!roleName) {
          console.log(`⚠️ [NotificationListener] Usuario ${user.id} sin rol válido`);
          continue;
        }

        // Obtener permisos del usuario para verificar coordinación
        const permissions = await permissionsService.getUserPermissions(user.id);
        if (!permissions) {
          console.log(`⚠️ [NotificationListener] Usuario ${user.id} sin permisos`);
          continue;
        }

        let shouldNotify = false;

        // Administradores: todos
        if (roleName === 'admin') {
          shouldNotify = true;
          console.log(`✅ [NotificationListener] Admin ${user.id} recibirá notificación`);
        }
        // Ejecutivos: solo si el prospecto está asignado a ellos
        else if (roleName === 'ejecutivo') {
          // Verificar si el prospecto tiene ejecutivo_id y coincide con este usuario
          if (prospecto.ejecutivo_id && user.id === prospecto.ejecutivo_id) {
            shouldNotify = true;
            console.log(`✅ [NotificationListener] Ejecutivo ${user.id} recibirá notificación`);
          }
        }
        // Coordinadores: si el prospecto está en su coordinación
        else if (roleName === 'coordinador') {
          if (prospecto.coordinacion_id && permissions.coordinacion_id === prospecto.coordinacion_id) {
            shouldNotify = true;
            console.log(`✅ [NotificationListener] Coordinador ${user.id} recibirá notificación`);
          }
        }

        if (shouldNotify) {
          userIds.push(user.id);
        }
      }

      if (userIds.length === 0) {
        console.log('⚠️ [NotificationListener] No hay usuarios que deban recibir la notificación');
        return;
      }

      console.log(`📤 [NotificationListener] Creando notificaciones para ${userIds.length} usuarios`);
      console.log(`📤 [NotificationListener] User IDs:`, userIds);
      console.log(`📤 [NotificationListener] Message ID:`, message.id);
      console.log(`📤 [NotificationListener] Conversation ID:`, message.conversacion_id || message.conversation_id || 'null');
      console.log(`📤 [NotificationListener] Prospect ID:`, prospectId);
      console.log(`📤 [NotificationListener] Customer Name:`, prospecto.nombre_completo || message.nombre_contacto || 'Cliente');
      console.log(`📤 [NotificationListener] Customer Phone:`, prospecto.whatsapp || message.numero_telefono || '');

      // Crear notificaciones usando la función batch
      // IMPORTANTE: conversation_id puede ser null, usar el campo correcto del mensaje
      const conversationId = message.conversacion_id || message.conversation_id || null;
      
      const rpcParams = {
        p_user_ids: userIds,
        p_message_id: message.id,
        p_conversation_id: conversationId,
        p_prospect_id: prospectId,
        p_customer_name: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Cliente',
        p_customer_phone: prospecto.whatsapp || '',
        p_message_preview: (message.mensaje || message.text || '').substring(0, 100),
      };
      
      console.log(`📤 [NotificationListener] Parámetros RPC:`, JSON.stringify(rpcParams, null, 2));

      console.log(`🔍 [NotificationListener] Llamando RPC create_message_notifications_batch...`);
      const { data: result, error } = await supabaseSystemUI.rpc('create_message_notifications_batch', rpcParams);

      console.log(`🔍 [NotificationListener] Respuesta RPC recibida:`);
      console.log(`🔍 [NotificationListener] - error:`, error);
      console.log(`🔍 [NotificationListener] - data:`, result);
      console.log(`🔍 [NotificationListener] - data type:`, typeof result);
      console.log(`🔍 [NotificationListener] - data is null:`, result === null);
      console.log(`🔍 [NotificationListener] - data is undefined:`, result === undefined);

      if (error) {
        console.error('❌ [NotificationListener] Error creando notificaciones de mensaje:', error);
        console.error('❌ [NotificationListener] Error code:', error.code);
        console.error('❌ [NotificationListener] Error message:', error.message);
        console.error('❌ [NotificationListener] Error details:', JSON.stringify(error, null, 2));
        console.error('❌ [NotificationListener] Error hint:', (error as any).hint);
        console.error('❌ [NotificationListener] Error details object:', error);
      } else {
        console.log(`✅ [NotificationListener] Llamada RPC exitosa (sin error)`);
        console.log(`✅ [NotificationListener] Resultado RPC completo:`, JSON.stringify(result, null, 2));
        
        // Si la función retorna JSONB con información de debug
        if (result && typeof result === 'object') {
          console.log(`📊 [NotificationListener] Insertadas: ${result.inserted || 0}`);
          console.log(`📊 [NotificationListener] Errores: ${result.errors || 0}`);
          if (result.error_details && result.error_details.length > 0) {
            console.error(`❌ [NotificationListener] Detalles de errores:`, result.error_details);
          }
        } else {
          console.warn(`⚠️ [NotificationListener] Resultado RPC no es un objeto válido:`, result);
        }
        
        // Verificar que las notificaciones se crearon consultando directamente la BD
        setTimeout(async () => {
          console.log(`🔍 [NotificationListener] Verificando notificaciones en BD...`);
          
          // Buscar por message_id primero
          const { data: createdNotifications, error: checkError } = await supabaseSystemUI
            .from('user_notifications')
            .select('id, user_id, notification_type, is_read, message_id, prospect_id')
            .eq('message_id', message.id)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (checkError) {
            console.error('❌ [NotificationListener] Error verificando notificaciones creadas:', checkError);
          } else {
            console.log(`🔍 [NotificationListener] Notificaciones encontradas en BD (por message_id):`, createdNotifications?.length || 0);
            if (createdNotifications && createdNotifications.length > 0) {
              console.log(`🔍 [NotificationListener] Detalles:`, createdNotifications);
            } else {
              // Si no se encuentran por message_id, buscar por prospect_id recientes
              const { data: recentNotifications } = await supabaseSystemUI
                .from('user_notifications')
                .select('id, user_id, notification_type, is_read, message_id, prospect_id, created_at')
                .eq('prospect_id', prospectId)
                .eq('user_id', userIds[0]) // Verificar para el primer usuario
                .order('created_at', { ascending: false })
                .limit(5);
              
              console.log(`🔍 [NotificationListener] Notificaciones recientes para prospecto:`, recentNotifications?.length || 0);
              if (recentNotifications && recentNotifications.length > 0) {
                console.log(`🔍 [NotificationListener] Últimas notificaciones:`, recentNotifications);
              }
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error('❌ [NotificationListener] Error en createMessageNotifications:', error);
    }
  }

  /**
   * Crear notificaciones para una llamada nueva
   */
  private async createCallNotifications(call: any) {
    try {
      const prospectId = call.prospecto;
      if (!prospectId) return;

      // Obtener información del prospecto
      const { data: prospecto } = await analysisSupabase
        .from('prospectos')
        .select('nombre_completo, whatsapp, ejecutivo_id, coordinacion_id')
        .eq('id', prospectId)
        .single();

      if (!prospecto) return;

      // Obtener todos los usuarios activos del sistema con sus roles
      const { data: allUsers } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, role_id, is_active')
        .eq('is_active', true);

      if (!allUsers || allUsers.length === 0) return;

      // Obtener roles para mapear role_id a role_name
      const { data: roles } = await supabaseSystemUI
        .from('auth_roles')
        .select('id, name');

      const roleMap = new Map(roles?.map(r => [r.id, r.name]) || []);

      // Filtrar usuarios que deben recibir la notificación
      const userIds: string[] = [];

      for (const user of allUsers) {
        const roleName = roleMap.get(user.role_id);
        if (!roleName) continue;

        // Obtener permisos del usuario para verificar coordinación
        const permissions = await permissionsService.getUserPermissions(user.id);
        if (!permissions) continue;

        let shouldNotify = false;

        // Administradores: todos
        if (roleName === 'admin') {
          shouldNotify = true;
        }
        // Ejecutivos: solo si el prospecto está asignado a ellos
        else if (roleName === 'ejecutivo') {
          // Verificar si el prospecto tiene ejecutivo_id y coincide con este usuario
          if (prospecto.ejecutivo_id && user.id === prospecto.ejecutivo_id) {
            shouldNotify = true;
          }
        }
        // Coordinadores: si el prospecto está en su coordinación
        else if (roleName === 'coordinador') {
          if (prospecto.coordinacion_id && permissions.coordinacion_id === prospecto.coordinacion_id) {
            shouldNotify = true;
          }
        }

        if (shouldNotify) {
          userIds.push(user.id);
        }
      }

      if (userIds.length === 0) return;

      // Crear notificaciones usando la función batch
      const { error } = await supabaseSystemUI.rpc('create_call_notifications_batch', {
        p_user_ids: userIds,
        p_call_id: call.call_id,
        p_prospect_id: prospectId,
        p_call_status: call.call_status,
        p_customer_name: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Cliente',
        p_customer_phone: prospecto.whatsapp || '',
      });

      if (error) {
        console.error('❌ Error creando notificaciones de llamada:', error);
      } else {
        console.log(`✅ Notificaciones de llamada creadas para ${userIds.length} usuarios`);
      }
    } catch (error) {
      console.error('❌ Error en createCallNotifications:', error);
    }
  }

  /**
   * Marcar notificaciones de llamada como leídas
   */
  private async markCallNotificationsAsRead(callId: string) {
    try {
      // Obtener todos los usuarios que tienen notificaciones de esta llamada
      const { data: notifications } = await supabaseSystemUI
        .from('user_notifications')
        .select('user_id')
        .eq('call_id', callId)
        .eq('notification_type', 'new_call')
        .eq('is_read', false);

      if (!notifications || notifications.length === 0) return;

      // Marcar todas como leídas
      const { error } = await supabaseSystemUI
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('call_id', callId)
        .eq('notification_type', 'new_call')
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error marcando notificaciones de llamada como leídas:', error);
      }
    } catch (error) {
      console.error('❌ Error en markCallNotificationsAsRead:', error);
    }
  }
}

export const notificationListenerService = new NotificationListenerService();

