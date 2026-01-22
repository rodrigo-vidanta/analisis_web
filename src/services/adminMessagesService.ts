/**
 * ============================================
 * SERVICIO DE MENSAJES DE ADMINISTRADORES
 * ============================================
 * 
 * Gestiona el sistema de mensajería para administradores
 * Base de datos: System UI (zbylezfyagwrxoecioup.supabase.co)
 * 
 * MEJORA 2026-01-20: Verificación de conexión antes de queries
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { isNetworkOnline } from '../hooks/useNetworkStatus';

// Importar función MCP si está disponible (para uso futuro)
declare global {
  interface Window {
    mcp_SupaVidanta_execute_sql?: (params: { sql: string; description?: string }) => Promise<any>;
  }
}

export interface AdminMessage {
  id: string;
  category: 'password_reset_request' | 'user_unblock_request' | 'system_alert' | 'user_request';
  title: string;
  message: string;
  sender_id?: string;
  sender_email?: string;
  recipient_id?: string;
  recipient_role?: string;
  status: 'pending' | 'read' | 'resolved' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata: Record<string, any>;
  resolved_at?: string;
  resolved_by?: string;
  resolved_note?: string;
  read_at?: string;
  read_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminMessageParams {
  category: AdminMessage['category'];
  title: string;
  message: string;
  sender_id?: string;
  sender_email?: string;
  recipient_role?: string;
  priority?: AdminMessage['priority'];
  metadata?: Record<string, any>;
}

class AdminMessagesService {
  /**
   * Crear un nuevo mensaje para administradores
   */
  async createMessage(params: CreateAdminMessageParams): Promise<AdminMessage | null> {
    try {
      // Intentar primero con acceso directo a la tabla
      const { data, error } = await supabaseSystemUI
        .from('admin_messages')
        .insert({
          category: params.category,
          title: params.title,
          message: params.message,
          sender_id: params.sender_id || null,
          sender_email: params.sender_email || null,
          recipient_role: params.recipient_role || 'admin',
          priority: params.priority || 'normal',
          metadata: params.metadata || {},
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando mensaje de admin:', error);
        // Si falla por schema cache, usar SQL directo
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return await this.createMessageViaSQL(params);
        }
        throw error;
      }
      return data as AdminMessage;
    } catch (error) {
      console.error('Error creando mensaje de admin:', error);
      // Si todo falla, intentar con SQL directo
      return await this.createMessageViaSQL(params);
    }
  }

  /**
   * Crear mensaje usando SQL directo como fallback
   */
  private async createMessageViaSQL(params: CreateAdminMessageParams): Promise<AdminMessage | null> {
    // Ir directamente a HTTP ya que SQL directo también puede tener problemas de cache
    return await this.createMessageViaHTTP(params);
  }

  /**
   * Crear mensaje usando HTTP directo con SQL ejecutado mediante función RPC
   * 
   * 🔒 SEGURIDAD (Actualizado 2026-01-16):
   * - Usa supabaseSystemUI con anon_key + RLS
   * - Las políticas permiten INSERT para public/authenticated
   * - NO se usa SERVICE_KEY en frontend
   */
  private async createMessageViaHTTP(params: CreateAdminMessageParams): Promise<AdminMessage | null> {
    try {
      // ⚠️ SEGURIDAD: Usar cliente con anon_key, RLS permite INSERT
      if (!supabaseSystemUI) {
        console.error('⚠️ AdminMessagesService: Cliente Supabase no disponible');
        return null;
      }

      // Usar Supabase client directamente en lugar de HTTP con SERVICE_KEY
      const { data, error } = await supabaseSystemUI
        .from('admin_messages')
        .insert({
          category: params.category,
          title: params.title,
          message: params.message,
          sender_id: params.sender_id || null,
          sender_email: params.sender_email || null,
          recipient_role: params.recipient_role || 'admin',
          priority: params.priority || 'normal',
          metadata: params.metadata || {},
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error insertando mensaje:', error);
        return null;
      }
      
      if (data) {
        console.log('✅ Mensaje creado via Supabase client:', data.id);
        return data as AdminMessage;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error creando mensaje via HTTP:', error);
      return null;
    }
  }

  /**
   * Obtener mensajes para administradores
   */
  async getMessages(
    filters?: {
      status?: AdminMessage['status'];
      category?: AdminMessage['category'];
      recipient_role?: string;
    },
    limit: number = 50
  ): Promise<AdminMessage[]> {
    try {
      let query = supabaseSystemUI
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.recipient_role) {
        query = query.eq('recipient_role', filters.recipient_role);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as AdminMessage[];
    } catch (error) {
      console.error('Error obteniendo mensajes de admin:', error);
      return [];
    }
  }

  /**
   * Obtener contador de mensajes pendientes
   * MEJORA 2026-01-20: Verificar conexión antes de consultar
   */
  async getUnreadCount(recipientRole: string = 'admin'): Promise<number> {
    // Verificar conexión antes de consultar
    if (!isNetworkOnline()) {
      // Retornar silenciosamente sin loguear error
      return 0;
    }

    try {
      const { count, error } = await supabaseSystemUI
        .from('admin_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('recipient_role', recipientRole);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      // Solo loguear si hay conexión (evitar spam cuando no hay internet)
      if (isNetworkOnline()) {
        console.error('Error obteniendo contador de mensajes:', error);
      }
      return 0;
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseSystemUI
        .from('admin_messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          read_by: userId
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marcando mensaje como leído:', error);
      return false;
    }
  }

  /**
   * Resolver mensaje
   */
  async resolveMessage(
    messageId: string,
    userId: string,
    note?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabaseSystemUI
        .from('admin_messages')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          resolved_note: note || null
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resolviendo mensaje:', error);
      return false;
    }
  }

  /**
   * Archivar mensaje
   */
  async archiveMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabaseSystemUI
        .from('admin_messages')
        .update({
          status: 'archived'
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error archivando mensaje:', error);
      return false;
    }
  }

  /**
   * Desbloquear usuario por email
   */
  async unlockUser(userEmail: string): Promise<boolean> {
    try {
      // Buscar usuario por email en System UI
      const { data: user, error: findError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, email, locked_until, failed_login_attempts')
        .eq('email', userEmail)
        .single();

      if (findError || !user) {
        console.error('Error encontrando usuario:', findError);
        return false;
      }

      // Desbloquear usuario: resetear intentos fallidos y locked_until
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'updateUserMetadata',
          params: {
            userId: user.id,
            metadata: {
              failed_login_attempts: 0,
              locked_until: null
            }
          }
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        console.error('Error desbloqueando usuario:', result.error);
        return false;
      }

      console.log('✅ Usuario desbloqueado:', userEmail);
      return true;
    } catch (error) {
      console.error('Error en unlockUser:', error);
      return false;
    }
  }

  /**
   * Suscribirse a nuevos mensajes (Realtime)
   * 
   * ⚠️ NOTA DE SEGURIDAD: Usa el cliente admin con service key.
   * En producción, considerar mover esto a un backend o usar funciones RPC.
   * 
   * ⚡ OPTIMIZADO: Handler no bloqueante usando setTimeout para diferir trabajo pesado
   */
  subscribeToMessages(
    recipientRole: string,
    callback: (message: AdminMessage) => void
  ) {
    let channel: ReturnType<typeof supabaseSystemUI.channel> | null = null;
    let isSubscribed = false;

    try {
      channel = supabaseSystemUI
        .channel(`admin_messages_${recipientRole}_${Date.now()}`) // Canal único para evitar conflictos
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_messages',
            filter: `recipient_role=eq.${recipientRole}`
          },
          (payload) => {
            // ⚡ OPTIMIZACIÓN: Diferir el callback para no bloquear el handler de Realtime
            // Esto evita violations de performance cuando el callback hace trabajo pesado
            setTimeout(() => {
              try {
                callback(payload.new as AdminMessage);
              } catch (error) {
                // Silenciar errores en callback para no bloquear
                console.debug('Error en callback de mensaje admin:', error);
              }
            }, 0);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            isSubscribed = false;
          }
        });
    } catch (error) {
      // Silenciar errores - no crítico
    }

    return () => {
      if (channel && isSubscribed) {
        try {
          supabaseSystemUI.removeChannel(channel);
        } catch (error) {
          // Ignorar errores al desconectar (puede ser que ya se cerró)
        }
      }
    };
  }
}

export const adminMessagesService = new AdminMessagesService();
export default adminMessagesService;

