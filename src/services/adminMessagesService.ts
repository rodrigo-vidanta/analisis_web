/**
 * ============================================
 * SERVICIO DE MENSAJES DE ADMINISTRADORES
 * ============================================
 * 
 * Gestiona el sistema de mensajería para administradores
 * Base de datos: System UI (zbylezfyagwrxoecioup.supabase.co)
 */

import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

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
      const { data, error } = await supabaseSystemUIAdmin
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
   * Crear mensaje usando HTTP directo con SQL ejecutado mediante función RPC exec_sql
   * Usa las credenciales de System UI almacenadas en el proyecto
   */
  private async createMessageViaHTTP(params: CreateAdminMessageParams): Promise<AdminMessage | null> {
    try {
      const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
      const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

      // Escapar valores para SQL seguro
      const escapeSQL = (str: string) => (str || '').replace(/'/g, "''").replace(/\\/g, '\\\\');
      const metadataJson = JSON.stringify(params.metadata || {}).replace(/'/g, "''");
      
      // Construir SQL INSERT directo
      const insertSQL = `
        INSERT INTO admin_messages (
          category, title, message, sender_id, sender_email,
          recipient_role, priority, metadata, status
        ) VALUES (
          '${escapeSQL(params.category)}', 
          '${escapeSQL(params.title)}', 
          '${escapeSQL(params.message)}', 
          ${params.sender_id ? `'${params.sender_id}'` : 'NULL'}, 
          ${params.sender_email ? `'${escapeSQL(params.sender_email)}'` : 'NULL'}, 
          '${escapeSQL(params.recipient_role || 'admin')}', 
          '${escapeSQL(params.priority || 'normal')}', 
          '${metadataJson}'::jsonb, 
          'pending'
        ) RETURNING row_to_json(admin_messages.*)::jsonb;
      `;

      // Intentar usar exec_sql para ejecutar SQL directo
      const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: insertSQL
        })
      });

      if (sqlResponse.ok) {
        const sqlData = await sqlResponse.json();
        console.log('✅ Mensaje creado via exec_sql:', sqlData);
        
        // exec_sql retorna TABLE(result JSONB), así que viene como array
        if (Array.isArray(sqlData) && sqlData.length > 0) {
          const result = sqlData[0];
          // result.result contiene el JSONB del mensaje
          if (result && result.result) {
            const messageData = typeof result.result === 'string' 
              ? JSON.parse(result.result) 
              : result.result;
            if (messageData.id) {
              return messageData as AdminMessage;
            }
          }
          // Si result tiene id directamente
          if (result.id) {
            return result as AdminMessage;
          }
        }
        // Si viene como objeto directo
        if (sqlData && typeof sqlData === 'object' && sqlData.id) {
          return sqlData as AdminMessage;
        }
      } else {
        const errorText = await sqlResponse.text();
        console.log('⚠️ exec_sql no disponible:', errorText);
      }

      // Si exec_sql no funciona, intentar con insert_admin_message
      const rpcResponse1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_admin_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          p_category: params.category,
          p_title: params.title,
          p_message: params.message,
          p_sender_id: params.sender_id || null,
          p_sender_email: params.sender_email || null,
          p_recipient_role: params.recipient_role || 'admin',
          p_priority: params.priority || 'normal',
          p_metadata: params.metadata || {}
        })
      });

      if (rpcResponse1.ok) {
        const rpcData = await rpcResponse1.json();
        console.log('✅ Mensaje creado via insert_admin_message:', rpcData);
        
        if (rpcData && typeof rpcData === 'object') {
          if (rpcData.id) {
            return rpcData as AdminMessage;
          }
          if (rpcData.category || rpcData.title) {
            return rpcData as AdminMessage;
          }
        }
      }

      // Si insert_admin_message no funciona, intentar con create_admin_message
      const rpcResponse2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_admin_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          p_category: params.category,
          p_title: params.title,
          p_message: params.message,
          p_sender_id: params.sender_id || null,
          p_sender_email: params.sender_email || null,
          p_recipient_role: params.recipient_role || 'admin',
          p_priority: params.priority || 'normal',
          p_metadata: params.metadata || {}
        })
      });

      if (rpcResponse2.ok) {
        const rpcData = await rpcResponse2.json();
        console.log('✅ Mensaje creado via create_admin_message:', rpcData);
        
        if (rpcData && typeof rpcData === 'object') {
          if (rpcData.id) {
            return rpcData as AdminMessage;
          }
          if (rpcData.category || rpcData.title) {
            return rpcData as AdminMessage;
          }
        }
      } else {
        const errorText2 = await rpcResponse2.text();
        console.error('❌ Error en todas las funciones RPC:', errorText2);
      }

      console.error('⚠️ No se pudo crear el mensaje usando ningún método');
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
      let query = supabaseSystemUIAdmin
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
   */
  async getUnreadCount(recipientRole: string = 'admin'): Promise<number> {
    try {
      const { count, error } = await supabaseSystemUIAdmin
        .from('admin_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('recipient_role', recipientRole);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error obteniendo contador de mensajes:', error);
      return 0;
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseSystemUIAdmin
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
      const { error } = await supabaseSystemUIAdmin
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
      const { error } = await supabaseSystemUIAdmin
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
      const { data: user, error: findError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('id, email, locked_until, failed_login_attempts')
        .eq('email', userEmail)
        .single();

      if (findError || !user) {
        console.error('Error encontrando usuario:', findError);
        return false;
      }

      // Desbloquear usuario: resetear intentos fallidos y locked_until
      const { error: updateError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .update({
          failed_login_attempts: 0,
          locked_until: null
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error desbloqueando usuario:', updateError);
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
   */
  subscribeToMessages(
    recipientRole: string,
    callback: (message: AdminMessage) => void
  ) {
    const channel = supabaseSystemUIAdmin
      .channel('admin_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `recipient_role=eq.${recipientRole}`
        },
        (payload) => {
          callback(payload.new as AdminMessage);
        }
      )
      .subscribe();

    return () => {
      supabaseSystemUIAdmin.removeChannel(channel);
    };
  }
}

export const adminMessagesService = new AdminMessagesService();
export default adminMessagesService;

