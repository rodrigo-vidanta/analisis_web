/**
 * ============================================
 * SERVICIO PRINCIPAL - MÓDULO LIVE CHAT
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/chat/README.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/chat/README.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/chat/CHANGELOG_LIVECHAT.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface UChatBot {
  id: string;
  bot_name: string;
  bot_description?: string;
  api_key: string;
  api_url: string;
  webhook_url?: string;
  is_active: boolean;
  bot_config: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UChatConversation {
  id: string;
  conversation_id: string;
  bot_id: string;
  prospect_id?: string;
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
  platform: string;
  status: 'active' | 'transferred' | 'closed' | 'archived';
  assigned_agent_id?: string;
  assignment_date?: string;
  handoff_enabled: boolean;
  handoff_triggered_at?: string;
  last_message_at?: string;
  message_count: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  bot?: UChatBot;
  assigned_agent?: any;
  prospect?: any;
  latest_messages?: UChatMessage[];
}

export interface UChatMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_id?: string;
  sender_name?: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
  content?: string;
  media_url?: string;
  media_type?: string;
  media_size?: number;
  is_read: boolean;
  read_at?: string;
  delivered_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface UChatAgentAssignment {
  id: string;
  conversation_id: string;
  agent_id: string;
  assigned_by?: string;
  assigned_at: string;
  unassigned_at?: string;
  is_active: boolean;
  assignment_reason?: string;
  notes?: string;
}

export interface UChatHandoffRule {
  id: string;
  bot_id: string;
  rule_name: string;
  trigger_type: 'message_received' | 'keyword_detected' | 'time_based' | 'manual';
  trigger_conditions: Record<string, any>;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface UChatMetrics {
  id: string;
  bot_id: string;
  agent_id?: string;
  metric_date: string;
  conversations_total: number;
  conversations_assigned: number;
  conversations_resolved: number;
  messages_sent: number;
  messages_received: number;
  avg_response_time: number;
  handoffs_triggered: number;
  customer_satisfaction?: number;
  created_at: string;
}

export interface UChatWebhookEvent {
  id: string;
  bot_id: string;
  event_type: string;
  event_data: Record<string, any>;
  processed: boolean;
  processed_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

// Interfaces para la API de UChat
export interface UChatAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UChatContact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface UChatAPIMessage {
  id: string;
  conversation_id: string;
  type: string;
  content: string;
  sender: {
    id: string;
    name: string;
    type: 'user' | 'bot' | 'agent';
  };
  timestamp: string;
  media?: {
    url: string;
    type: string;
    size?: number;
  };
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class UChatService {
  private baseUrl = 'https://www.uchat.com.au/api';

  // ============================================
  // MÉTODOS DE BASE DE DATOS
  // ============================================

  async getBots(): Promise<UChatBot[]> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_bots')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getBot(id: string): Promise<UChatBot | null> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_bots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createBot(bot: Omit<UChatBot, 'id' | 'created_at' | 'updated_at'>): Promise<UChatBot> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_bots')
      .insert(bot)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBot(id: string, updates: Partial<UChatBot>): Promise<UChatBot> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_bots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // MÉTODOS DE CONVERSACIONES
  // ============================================

  async getConversations(filters?: {
    status?: string;
    assigned_agent_id?: string;
    bot_id?: string;
    limit?: number;
  }): Promise<UChatConversation[]> {
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

    if (error) throw error;
    return data || [];
  }

  async getConversation(id: string): Promise<UChatConversation | null> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createConversation(conversation: Omit<UChatConversation, 'id' | 'created_at' | 'updated_at'>): Promise<UChatConversation> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateConversation(id: string, updates: Partial<UChatConversation>): Promise<UChatConversation> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // MÉTODOS DE MENSAJES
  // ============================================

  async getMessages(conversationId: string, limit = 50): Promise<UChatMessage[]> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse(); // Mostrar mensajes más antiguos primero
  }

  async createMessage(message: Omit<UChatMessage, 'id' | 'created_at'>): Promise<UChatMessage> {
    const { data, error } = await supabaseSystemUI
      .from('uchat_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabaseSystemUI
      .from('uchat_messages')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  async markConversationMessagesAsRead(conversationId: string): Promise<void> {
    const { error } = await supabaseSystemUI
      .from('uchat_messages')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    if (error) throw error;
  }

  // ============================================
  // MÉTODOS DE ASIGNACIÓN DE AGENTES
  // ============================================

  async assignConversation(conversationId: string, agentId: string, assignedBy?: string, reason?: string): Promise<UChatAgentAssignment> {
    // Primero desactivar asignaciones anteriores
    await supabaseSystemUI
      .from('uchat_agent_assignments')
      .update({ 
        is_active: false, 
        unassigned_at: new Date().toISOString() 
      })
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    // Crear nueva asignación
    const { data, error } = await supabaseSystemUI
      .from('uchat_agent_assignments')
      .insert({
        conversation_id: conversationId,
        agent_id: agentId,
        assigned_by: assignedBy,
        assignment_reason: reason,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar la conversación
    await this.updateConversation(conversationId, {
      assigned_agent_id: agentId,
      assignment_date: new Date().toISOString(),
      status: 'transferred'
    });

    return data;
  }

  async unassignConversation(conversationId: string): Promise<void> {
    // Desactivar asignaciones activas
    const { error } = await supabaseSystemUI
      .from('uchat_agent_assignments')
      .update({ 
        is_active: false, 
        unassigned_at: new Date().toISOString() 
      })
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    if (error) throw error;

    // Actualizar la conversación
    await this.updateConversation(conversationId, {
      assigned_agent_id: null,
      assignment_date: null,
      status: 'active'
    });
  }

  // ============================================
  // BÚSQUEDA DE PROSPECTOS
  // ============================================

  async findProspectByPhone(phone: string): Promise<any | null> {
    try {
      // Usar el servicio de prospectos para búsqueda avanzada
      const { prospectsService } = await import('./prospectsService');
      const result = await prospectsService.findProspectByPhone(phone);
      
      return result.found ? result.prospect : null;
    } catch (error) {
      console.error('Error en búsqueda de prospecto:', error);
      return null;
    }
  }

  // ============================================
  // INTEGRACIÓN CON UCHAT API
  // ============================================

  private async makeUChatRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', apiKey: string, data?: any): Promise<UChatAPIResponse> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const config: RequestInit = {
        method,
        headers,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.message || `HTTP ${response.status}`,
          data: responseData
        };
      }

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async sendMessage(botId: string, conversationId: string, message: string, messageType: string = 'text'): Promise<UChatAPIResponse> {
    const bot = await this.getBot(botId);
    if (!bot) {
      return { success: false, error: 'Bot no encontrado' };
    }

    return await this.makeUChatRequest('/messages', 'POST', bot.api_key, {
      conversation_id: conversationId,
      type: messageType,
      content: message
    });
  }

  async getUChatConversations(botId: string): Promise<UChatAPIResponse> {
    const bot = await this.getBot(botId);
    if (!bot) {
      return { success: false, error: 'Bot no encontrado' };
    }

    return await this.makeUChatRequest('/conversations', 'GET', bot.api_key);
  }

  async getUChatMessages(botId: string, conversationId: string): Promise<UChatAPIResponse> {
    const bot = await this.getBot(botId);
    if (!bot) {
      return { success: false, error: 'Bot no encontrado' };
    }

    return await this.makeUChatRequest(`/conversations/${conversationId}/messages`, 'GET', bot.api_key);
  }

  async enableHandoff(conversationId: string): Promise<void> {
    await this.updateConversation(conversationId, {
      handoff_enabled: true,
      handoff_triggered_at: new Date().toISOString()
    });
  }

  async disableBot(botId: string, conversationId: string): Promise<UChatAPIResponse> {
    const bot = await this.getBot(botId);
    if (!bot) {
      return { success: false, error: 'Bot no encontrado' };
    }

    // Llamar a la API de UChat para deshabilitar el bot en esta conversación
    return await this.makeUChatRequest(`/conversations/${conversationId}/bot/disable`, 'POST', bot.api_key);
  }

  // ============================================
  // WEBHOOKS Y EVENTOS
  // ============================================

  async processWebhookEvent(botId: string, eventType: string, eventData: any): Promise<void> {
    try {
      // Guardar el evento
      const { data: webhookEvent, error } = await supabaseSystemUI
        .from('uchat_webhook_events')
        .insert({
          bot_id: botId,
          event_type: eventType,
          event_data: eventData,
          processed: false
        })
        .select()
        .single();

      if (error) throw error;

      // Procesar según el tipo de evento
      await this.handleWebhookEvent(webhookEvent);

    } catch (error) {
      console.error('Error procesando webhook:', error);
    }
  }

  private async handleWebhookEvent(event: UChatWebhookEvent): Promise<void> {
    try {
      switch (event.event_type) {
        case 'message_received':
          await this.handleMessageReceived(event);
          break;
        case 'conversation_started':
          await this.handleConversationStarted(event);
          break;
        case 'conversation_ended':
          await this.handleConversationEnded(event);
          break;
        default:
          console.log(`Evento no manejado: ${event.event_type}`);
      }

      // Marcar como procesado
      await supabaseSystemUI
        .from('uchat_webhook_events')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
        .eq('id', event.id);

    } catch (error) {
      console.error(`Error manejando evento ${event.event_type}:`, error);
      
      // Incrementar contador de reintentos
      await supabaseSystemUI
        .from('uchat_webhook_events')
        .update({ 
          retry_count: event.retry_count + 1,
          error_message: error instanceof Error ? error.message : 'Error desconocido'
        })
        .eq('id', event.id);
    }
  }

  private async handleMessageReceived(event: UChatWebhookEvent): Promise<void> {
    const messageData = event.event_data;
    
    // Buscar o crear conversación
    let conversation = await supabaseSystemUI
      .from('uchat_conversations')
      .select('*')
      .eq('conversation_id', messageData.conversation_id)
      .single();

    if (!conversation.data) {
      // Crear nueva conversación
      const newConversation = await this.createConversation({
        conversation_id: messageData.conversation_id,
        bot_id: event.bot_id,
        customer_phone: messageData.sender.phone || '',
        customer_name: messageData.sender.name || '',
        platform: 'whatsapp',
        status: 'active',
        handoff_enabled: false,
        message_count: 0,
        tags: [],
        priority: 'medium',
        metadata: {}
      });
      conversation.data = newConversation;
    }

    // Crear mensaje
    await this.createMessage({
      message_id: messageData.id,
      conversation_id: conversation.data.id,
      sender_type: 'customer',
      sender_id: messageData.sender.id,
      sender_name: messageData.sender.name,
      message_type: messageData.type || 'text',
      content: messageData.content,
      media_url: messageData.media?.url,
      media_type: messageData.media?.type,
      media_size: messageData.media?.size,
      is_read: false,
      metadata: messageData.metadata || {}
    });

    // Verificar reglas de handoff automático
    await this.checkHandoffRules(conversation.data);
  }

  private async handleConversationStarted(event: UChatWebhookEvent): Promise<void> {
    // Lógica para cuando se inicia una conversación
    console.log('Conversación iniciada:', event.event_data);
  }

  private async handleConversationEnded(event: UChatWebhookEvent): Promise<void> {
    // Actualizar estado de la conversación
    await supabaseSystemUI
      .from('uchat_conversations')
      .update({ status: 'closed' })
      .eq('conversation_id', event.event_data.conversation_id);
  }

  private async checkHandoffRules(conversation: UChatConversation): Promise<void> {
    const { data: rules } = await supabaseSystemUI
      .from('uchat_handoff_rules')
      .select('*')
      .eq('bot_id', conversation.bot_id)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (!rules) return;

    for (const rule of rules) {
      if (await this.evaluateHandoffRule(rule, conversation)) {
        await this.triggerHandoff(conversation, rule);
        break; // Solo ejecutar la primera regla que coincida
      }
    }
  }

  private async evaluateHandoffRule(rule: UChatHandoffRule, conversation: UChatConversation): Promise<boolean> {
    switch (rule.trigger_type) {
      case 'message_received':
        // Si la regla es activar handoff cuando el usuario envía un mensaje
        return rule.trigger_conditions.sender_type === 'customer';
      
      case 'keyword_detected':
        // Implementar detección de palabras clave
        return false; // Por implementar
      
      case 'time_based':
        // Implementar reglas basadas en tiempo
        return false; // Por implementar
      
      default:
        return false;
    }
  }

  private async triggerHandoff(conversation: UChatConversation, rule: UChatHandoffRule): Promise<void> {
    // Habilitar handoff
    await this.enableHandoff(conversation.id);
    
    // Deshabilitar bot si está configurado
    if (rule.trigger_conditions.auto_disable_bot) {
      await this.disableBot(conversation.bot_id, conversation.conversation_id);
    }

    // Asignar a agente disponible si está configurado
    if (rule.trigger_conditions.assign_to_available_agent) {
      const availableAgent = await this.findAvailableAgent();
      if (availableAgent) {
        await this.assignConversation(
          conversation.id, 
          availableAgent.id, 
          'system', 
          `Handoff automático: ${rule.rule_name}`
        );
      }
    }
  }

  private async findAvailableAgent(): Promise<any | null> {
    // Buscar agente disponible (por implementar lógica más sofisticada)
    const { data } = await supabaseSystemUI
      .from('auth_users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .limit(1);

    return data?.[0] || null;
  }

  // ============================================
  // MÉTRICAS Y ESTADÍSTICAS
  // ============================================

  async getDashboardMetrics(botId?: string, agentId?: string): Promise<any> {
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
  }
}

export const uchatService = new UChatService();
