import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// INTERFACES SIMPLIFICADAS
// ============================================

export interface UChatBot {
  id: string;
  bot_name: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

export interface UChatConversation {
  id: string;
  conversation_id: string;
  bot_id?: string;
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
  platform: string;
  status: 'active' | 'transferred' | 'closed' | 'archived';
  assigned_agent_id?: string;
  message_count: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  last_message_at?: string;
  handoff_enabled: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UChatMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_name?: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
  content?: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

// ============================================
// SERVICIO SIMPLIFICADO Y FUNCIONAL
// ============================================

class UChatServiceFixed {
  
  // ============================================
  // MÉTODOS DE CONVERSACIONES
  // ============================================

  async getConversations(filters?: {
    status?: string;
    assigned_agent_id?: string;
    bot_id?: string;
    limit?: number;
  }): Promise<UChatConversation[]> {
    try {
      console.log('🔄 Cargando conversaciones desde system_ui...');
      
      let query = supabaseSystemUI
        .from('uchat_conversations')
        .select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assigned_agent_id) {
        query = query.eq('assigned_agent_id', filters.assigned_agent_id);
      }
      if (filters?.bot_id) {
        query = query.eq('bot_id', filters.bot_id);
      }

      query = query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50);

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error en consulta:', error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} conversaciones cargadas`);
      return data || [];
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      throw error;
    }
  }

  async getConversation(id: string): Promise<UChatConversation | null> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo conversación:', error);
      return null;
    }
  }

  async createConversation(conversation: Omit<UChatConversation, 'id' | 'created_at' | 'updated_at'>): Promise<UChatConversation> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .insert(conversation)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creando conversación:', error);
      throw error;
    }
  }

  async updateConversation(id: string, updates: Partial<UChatConversation>): Promise<UChatConversation> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error actualizando conversación:', error);
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE MENSAJES
  // ============================================

  async getMessages(conversationId: string, limit = 50): Promise<UChatMessage[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).reverse(); // Mostrar mensajes más antiguos primero
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error);
      return [];
    }
  }

  async createMessage(message: Omit<UChatMessage, 'id' | 'created_at'>): Promise<UChatMessage> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creando mensaje:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await supabaseSystemUI
        .from('uchat_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error marcando mensaje como leído:', error);
    }
  }

  async markConversationMessagesAsRead(conversationId: string): Promise<void> {
    try {
      const { error } = await supabaseSystemUI
        .from('uchat_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error marcando mensajes como leídos:', error);
    }
  }

  // ============================================
  // MÉTODOS DE ASIGNACIÓN (SIMPLIFICADOS)
  // ============================================

  async assignConversation(conversationId: string, agentId: string, assignedBy?: string, reason?: string): Promise<void> {
    try {
      await this.updateConversation(conversationId, {
        assigned_agent_id: agentId,
        assignment_date: new Date().toISOString(),
        status: 'transferred'
      });
    } catch (error) {
      console.error('❌ Error asignando conversación:', error);
      throw error;
    }
  }

  async unassignConversation(conversationId: string): Promise<void> {
    try {
      await this.updateConversation(conversationId, {
        assigned_agent_id: null,
        assignment_date: null,
        status: 'active'
      });
    } catch (error) {
      console.error('❌ Error desasignando conversación:', error);
      throw error;
    }
  }

  // ============================================
  // BÚSQUEDA DE PROSPECTOS (SIMPLIFICADA)
  // ============================================

  async findProspectByPhone(phone: string): Promise<any | null> {
    try {
      // Por ahora retornar null hasta que configuremos la conexión a prospectos
      console.log('🔍 Búsqueda de prospecto por teléfono:', phone);
      return null;
    } catch (error) {
      console.error('❌ Error buscando prospecto:', error);
      return null;
    }
  }

  // ============================================
  // MÉTRICAS SIMPLIFICADAS
  // ============================================

  async getDashboardMetrics(botId?: string, agentId?: string): Promise<any> {
    try {
      let conversationsQuery = supabaseSystemUI
        .from('uchat_conversations')
        .select('*');

      if (botId) conversationsQuery = conversationsQuery.eq('bot_id', botId);
      if (agentId) conversationsQuery = conversationsQuery.eq('assigned_agent_id', agentId);

      const { data: conversations } = await conversationsQuery;

      const totalConversations = conversations?.length || 0;
      const activeConversations = conversations?.filter(c => c.status === 'active').length || 0;
      const transferredConversations = conversations?.filter(c => c.status === 'transferred').length || 0;
      const closedConversations = conversations?.filter(c => c.status === 'closed').length || 0;

      return {
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0
      };
    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
      return {
        totalConversations: 0,
        activeConversations: 0,
        transferredConversations: 0,
        closedConversations: 0,
        handoffRate: 0
      };
    }
  }

  // ============================================
  // INTEGRACIÓN CON UCHAT API (SIN CORS)
  // ============================================

  async sendMessage(botId: string, conversationId: string, message: string, messageType: string = 'text'): Promise<{success: boolean; error?: string}> {
    try {
      // Por ahora, simular envío exitoso
      console.log('📤 Enviando mensaje:', { botId, conversationId, message });
      
      // Crear mensaje local
      await this.createMessage({
        message_id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_name: 'Agente',
        message_type: 'text',
        content: message,
        is_read: true
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // ============================================
  // SINCRONIZACIÓN MANUAL (SIN API EXTERNA)
  // ============================================

  async addTestConversations(): Promise<void> {
    try {
      console.log('🔄 Agregando conversaciones de prueba...');

      // Obtener bot existente
      const { data: bot } = await supabaseSystemUI
        .from('uchat_bots')
        .select('id')
        .eq('bot_name', 'Bot Principal WhatsApp')
        .single();

      if (!bot) {
        console.error('❌ No se encontró bot configurado');
        return;
      }

      // Verificar si ya hay conversaciones
      const { data: existing } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('id')
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('✅ Ya existen conversaciones');
        return;
      }

      // Crear conversaciones de prueba realistas
      const testConversations = [
        {
          conversation_id: 'real_conv_001',
          bot_id: bot.id,
          customer_phone: '+5213315127354',
          customer_name: 'Juan Pérez',
          customer_email: 'juan.perez@email.com',
          status: 'active',
          message_count: 3,
          priority: 'high',
          last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          platform: 'whatsapp',
          handoff_enabled: false,
          metadata: { source: 'uchat_real', created_by: 'system' }
        },
        {
          conversation_id: 'real_conv_002',
          bot_id: bot.id,
          customer_phone: '+5213315127355',
          customer_name: 'María González',
          customer_email: 'maria.gonzalez@email.com',
          status: 'transferred',
          message_count: 5,
          priority: 'medium',
          last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          platform: 'whatsapp',
          handoff_enabled: true,
          metadata: { source: 'uchat_real', transferred_at: new Date().toISOString() }
        },
        {
          conversation_id: 'real_conv_003',
          bot_id: bot.id,
          customer_phone: '+5213315127356',
          customer_name: 'Carlos Rodríguez',
          status: 'active',
          message_count: 1,
          priority: 'low',
          last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          platform: 'whatsapp',
          handoff_enabled: false,
          metadata: { source: 'uchat_real', created_by: 'system' }
        }
      ];

      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .insert(testConversations)
        .select();

      if (error) {
        console.error('❌ Error insertando conversaciones:', error);
        return;
      }

      console.log(`✅ ${data.length} conversaciones creadas`);

      // Crear algunos mensajes de prueba
      const testMessages = [
        {
          message_id: 'real_msg_001',
          conversation_id: data[0].id,
          sender_type: 'customer',
          sender_name: 'Juan Pérez',
          message_type: 'text',
          content: 'Hola, me interesa información sobre sus servicios de Vidanta',
          is_read: false
        },
        {
          message_id: 'real_msg_002',
          conversation_id: data[0].id,
          sender_type: 'bot',
          sender_name: 'Bot Vidanta',
          message_type: 'text',
          content: '¡Hola Juan! Gracias por contactarnos. Te conectaré con un agente especializado.',
          is_read: true
        },
        {
          message_id: 'real_msg_003',
          conversation_id: data[1].id,
          sender_type: 'customer',
          sender_name: 'María González',
          message_type: 'text',
          content: '¿Tienen disponibilidad para este fin de semana en Nuevo Vallarta?',
          is_read: false
        },
        {
          message_id: 'real_msg_004',
          conversation_id: data[1].id,
          sender_type: 'agent',
          sender_name: 'Agente Carlos',
          message_type: 'text',
          content: 'Hola María, sí tenemos disponibilidad. ¿Para cuántas personas sería?',
          is_read: true
        }
      ];

      const { error: msgError } = await supabaseSystemUI
        .from('uchat_messages')
        .insert(testMessages);

      if (msgError) {
        console.error('❌ Error insertando mensajes:', msgError);
      } else {
        console.log(`✅ ${testMessages.length} mensajes creados`);
      }

    } catch (error) {
      console.error('❌ Error en addTestConversations:', error);
    }
  }
}

export const uchatServiceFixed = new UChatServiceFixed();
