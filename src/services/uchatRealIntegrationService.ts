import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURACIÓN DE BASES DE DATOS
// ============================================

// Base de análisis (pqnc_ia) donde están los prospectos y mensajes
const analysisSupabase = createClient(
  'https://glsmifhkoaifvaegsozd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E'
);

// Base system_ui para almacenar conversaciones de Live Chat
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// INTERFACES REALES
// ============================================

export interface RealProspect {
  id: string;
  nombre_completo?: string;
  nombre_whatsapp: string;
  whatsapp: string;
  email?: string;
  etapa: string;
  id_uchat: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  fecha_hora: string;
  mensaje: string;
  rol: 'Prospecto' | 'AI' | 'Agente';
  intencion?: string;
  sentimiento?: string;
  prospecto_id: string;
  conversacion_id: string;
  adjuntos?: any[];
  created_at: string;
}

export interface WhatsAppConversation {
  id: string;
  prospecto_id: string;
  summary?: string;
  resultado?: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string;
  intencion?: string;
  created_at: string;
  updated_at: string;
}

export interface UChatActiveConversation {
  uchat_id: string;
  customer_name: string;
  customer_phone: string;
  last_message_time: string;
  status: 'active' | 'pending' | 'closed';
  unread_count: number;
  prospect?: RealProspect;
}

export interface ConversationBlock {
  date: string;
  message_count: number;
  conversacion_id: string;
  first_message_time: string;
  last_message_time: string;
  summary?: string;
}

// ============================================
// SERVICIO REAL DE INTEGRACIÓN
// ============================================

class UChatRealIntegrationService {
  private apiKey = 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5';
  private apiUrl = 'https://www.uchat.com.au/api';

  // ============================================
  // OBTENER CONVERSACIONES ACTIVAS DE UCHAT
  // ============================================

  async getActiveConversationsFromUChat(): Promise<UChatActiveConversation[]> {
    try {
      console.log('🔄 Obteniendo conversaciones activas de UChat...');

      // Por ahora, usar los prospectos reales de la base de datos
      // TODO: Implementar llamada real a UChat API cuando tengamos el endpoint correcto
      const { data: prospects, error } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_whatsapp, whatsapp, id_uchat, etapa, updated_at')
        .not('id_uchat', 'is', null)
        .in('etapa', ['Primer contacto', 'Interesado', 'En seguimiento', 'Validando si es miembro'])
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error obteniendo prospectos:', error);
        return [];
      }

      console.log(`✅ ${prospects.length} conversaciones activas encontradas`);

      // Convertir prospectos a conversaciones activas
      const activeConversations: UChatActiveConversation[] = prospects.map(prospect => ({
        uchat_id: prospect.id_uchat,
        customer_name: prospect.nombre_whatsapp,
        customer_phone: prospect.whatsapp,
        last_message_time: prospect.updated_at,
        status: this.mapEtapaToStatus(prospect.etapa),
        unread_count: 0, // TODO: Calcular mensajes no leídos
        prospect: prospect
      }));

      return activeConversations;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones activas:', error);
      return [];
    }
  }

  // ============================================
  // BUSCAR PROSPECTO POR UCHAT_ID
  // ============================================

  async findProspectByUChatId(uchatId: string): Promise<RealProspect | null> {
    try {
      console.log('🔍 Buscando prospecto por uchat_id:', uchatId);

      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id_uchat', uchatId)
        .single();

      if (error) {
        console.error('❌ Error buscando prospecto:', error);
        return null;
      }

      console.log('✅ Prospecto encontrado:', data.nombre_whatsapp);
      return data;
    } catch (error) {
      console.error('❌ Error en findProspectByUChatId:', error);
      return null;
    }
  }

  // ============================================
  // OBTENER BLOQUES DE CONVERSACIÓN
  // ============================================

  async getConversationBlocks(prospectId: string): Promise<ConversationBlock[]> {
    try {
      console.log('📅 Obteniendo bloques de conversación para prospect_id:', prospectId);

      const { data: conversations, error } = await analysisSupabase
        .from('conversaciones_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo conversaciones:', error);
        return [];
      }

      console.log(`✅ ${conversations.length} bloques de conversación encontrados`);

      // Convertir conversaciones a bloques
      const blocks: ConversationBlock[] = conversations.map(conv => {
        const startDate = new Date(conv.fecha_inicio);
        const endDate = new Date(conv.fecha_fin);
        
        return {
          date: startDate.toISOString().split('T')[0],
          message_count: 0, // Se calculará después
          conversacion_id: conv.id,
          first_message_time: conv.fecha_inicio,
          last_message_time: conv.fecha_fin,
          summary: conv.summary
        };
      });

      // Calcular número de mensajes por bloque
      for (const block of blocks) {
        const { count } = await analysisSupabase
          .from('mensajes_whatsapp')
          .select('*', { count: 'exact', head: true })
          .eq('conversacion_id', block.conversacion_id);

        block.message_count = count || 0;
      }

      return blocks;
    } catch (error) {
      console.error('❌ Error obteniendo bloques:', error);
      return [];
    }
  }

  // ============================================
  // OBTENER MENSAJES DE UN BLOQUE
  // ============================================

  async getMessagesForBlock(prospectId: string, conversacionId: string): Promise<WhatsAppMessage[]> {
    try {
      console.log('💬 Obteniendo mensajes para conversación:', conversacionId);

      const { data: messages, error } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .eq('conversacion_id', conversacionId)
        .order('fecha_hora', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        return [];
      }

      console.log(`✅ ${messages.length} mensajes obtenidos`);
      return messages;
    } catch (error) {
      console.error('❌ Error en getMessagesForBlock:', error);
      return [];
    }
  }

  // ============================================
  // OBTENER MENSAJES RECIENTES (ÚLTIMAS 24H)
  // ============================================

  async getRecentMessages(prospectId: string): Promise<WhatsAppMessage[]> {
    try {
      console.log('⏰ Obteniendo mensajes de las últimas 24 horas...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: messages, error } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .gte('fecha_hora', yesterday.toISOString())
        .order('fecha_hora', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo mensajes recientes:', error);
        return [];
      }

      console.log(`✅ ${messages.length} mensajes recientes obtenidos`);
      return messages;
    } catch (error) {
      console.error('❌ Error en getRecentMessages:', error);
      return [];
    }
  }

  // ============================================
  // SINCRONIZAR CON SYSTEM_UI
  // ============================================

  async syncToSystemUI(): Promise<{ success: boolean; count: number }> {
    try {
      console.log('🔄 Sincronizando conversaciones activas a system_ui...');

      // 1. Obtener conversaciones activas
      const activeConversations = await this.getActiveConversationsFromUChat();

      if (activeConversations.length === 0) {
        console.log('⚠️ No hay conversaciones activas');
        return { success: true, count: 0 };
      }

      // 2. Obtener bot de system_ui
      const { data: bot } = await supabaseSystemUI
        .from('uchat_bots')
        .select('id')
        .eq('bot_name', 'Bot Principal WhatsApp')
        .single();

      if (!bot) {
        console.error('❌ No se encontró bot en system_ui');
        return { success: false, count: 0 };
      }

      // 3. Limpiar conversaciones anteriores
      await supabaseSystemUI
        .from('uchat_conversations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // 4. Insertar conversaciones reales
      const conversationsToInsert = activeConversations.map(conv => ({
        conversation_id: conv.uchat_id,
        bot_id: bot.id,
        customer_phone: conv.customer_phone,
        customer_name: conv.customer_name,
        status: conv.status,
        message_count: 0, // Se calculará después
        priority: this.calculatePriority(conv.prospect?.etapa || ''),
        last_message_at: conv.last_message_time,
        platform: 'whatsapp',
        handoff_enabled: conv.status === 'transferred',
        metadata: {
          source: 'uchat_real',
          prospect_id: conv.prospect?.id,
          etapa: conv.prospect?.etapa,
          id_uchat: conv.uchat_id
        }
      }));

      const { data: insertedConversations, error: insertError } = await supabaseSystemUI
        .from('uchat_conversations')
        .insert(conversationsToInsert)
        .select();

      if (insertError) {
        console.error('❌ Error insertando conversaciones:', insertError);
        return { success: false, count: 0 };
      }

      console.log(`✅ ${insertedConversations.length} conversaciones reales sincronizadas`);

      // 5. Sincronizar mensajes recientes para cada conversación
      for (const conv of insertedConversations) {
        if (conv.metadata?.prospect_id) {
          await this.syncRecentMessagesForConversation(conv.id, conv.metadata.prospect_id);
        }
      }

      return { success: true, count: insertedConversations.length };
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return { success: false, count: 0 };
    }
  }

  private async syncRecentMessagesForConversation(conversationId: string, prospectId: string): Promise<void> {
    try {
      // Obtener mensajes recientes del prospecto
      const recentMessages = await this.getRecentMessages(prospectId);

      if (recentMessages.length === 0) return;

      // Convertir a formato de system_ui
      const messagesToInsert = recentMessages.map(msg => ({
        message_id: `real_${msg.id}`,
        conversation_id: conversationId,
        sender_type: this.mapRolToSenderType(msg.rol),
        sender_name: msg.rol === 'Prospecto' ? 'Cliente' : msg.rol === 'AI' ? 'Bot Vidanta' : 'Agente',
        message_type: 'text',
        content: msg.mensaje,
        is_read: true,
        created_at: msg.fecha_hora
      }));

      const { error } = await supabaseSystemUI
        .from('uchat_messages')
        .insert(messagesToInsert);

      if (error) {
        console.error(`❌ Error insertando mensajes para conversación ${conversationId}:`, error);
      } else {
        console.log(`✅ ${messagesToInsert.length} mensajes sincronizados para conversación`);

        // Actualizar contador de mensajes
        await supabaseSystemUI
          .from('uchat_conversations')
          .update({ message_count: messagesToInsert.length })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('❌ Error sincronizando mensajes:', error);
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private mapEtapaToStatus(etapa: string): 'active' | 'transferred' | 'closed' | 'archived' {
    switch (etapa) {
      case 'Primer contacto':
      case 'Interesado':
      case 'En seguimiento':
      case 'Validando si es miembro':
        return 'active';
      case 'Transferido':
      case 'Contactado por vendedor':
        return 'transferred';
      case 'Finalizado':
      case 'No interesado':
        return 'closed';
      default:
        return 'active';
    }
  }

  private mapRolToSenderType(rol: string): 'customer' | 'bot' | 'agent' {
    switch (rol) {
      case 'Prospecto':
        return 'customer';
      case 'AI':
        return 'bot';
      case 'Agente':
        return 'agent';
      default:
        return 'customer';
    }
  }

  private calculatePriority(etapa: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (etapa) {
      case 'Interesado':
        return 'high';
      case 'En seguimiento':
        return 'medium';
      case 'Primer contacto':
        return 'medium';
      case 'Validando si es miembro':
        return 'high';
      default:
        return 'low';
    }
  }

  // ============================================
  // MÉTODOS PARA EL DASHBOARD
  // ============================================

  async getConversations(): Promise<any[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo conversaciones:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getConversations:', error);
      return [];
    }
  }

  async getMessages(conversationId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getMessages:', error);
      return [];
    }
  }

  async getDashboardMetrics(): Promise<any> {
    try {
      const conversations = await this.getConversations();
      
      const totalConversations = conversations.length;
      const activeConversations = conversations.filter(c => c.status === 'active').length;
      const transferredConversations = conversations.filter(c => c.status === 'transferred').length;
      const closedConversations = conversations.filter(c => c.status === 'closed').length;

      return {
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0
      };
    } catch (error) {
      console.error('❌ Error calculando métricas:', error);
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
  // MÉTODOS PARA BLOQUES DE CONVERSACIÓN
  // ============================================

  async getConversationBlocksForProspect(prospectId: string): Promise<ConversationBlock[]> {
    try {
      return await this.getConversationBlocks(prospectId);
    } catch (error) {
      console.error('❌ Error obteniendo bloques:', error);
      return [];
    }
  }

  async getMessagesForConversationBlock(prospectId: string, conversacionId: string): Promise<WhatsAppMessage[]> {
    try {
      return await this.getMessagesForBlock(prospectId, conversacionId);
    } catch (error) {
      console.error('❌ Error obteniendo mensajes del bloque:', error);
      return [];
    }
  }

  // ============================================
  // ENVÍO DE MENSAJES (PLACEHOLDER)
  // ============================================

  async sendMessage(conversationId: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📤 Enviando mensaje:', { conversationId, message });
      
      // TODO: Implementar envío real a UChat API
      // Por ahora, solo crear mensaje local
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .insert({
          message_id: `agent_${Date.now()}`,
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_name: 'Agente',
          message_type: 'text',
          content: message,
          is_read: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando mensaje:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      return { success: false, error: 'Error enviando mensaje' };
    }
  }
}

export const uchatRealIntegrationService = new UChatRealIntegrationService();
