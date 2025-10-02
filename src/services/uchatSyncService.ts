import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

// ============================================
// SERVICIO DE SINCRONIZACIÓN CON UCHAT API REAL
// ============================================

interface UChatAPIConversation {
  id: string;
  contact: {
    id: string;
    phone: string;
    name?: string;
    email?: string;
  };
  status: string;
  last_message: {
    id: string;
    content: string;
    type: string;
    sender: {
      id: string;
      name: string;
      type: 'user' | 'bot' | 'agent';
    };
    timestamp: string;
  };
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface UChatAPIMessage {
  id: string;
  conversation_id: string;
  content: string;
  type: string;
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

class UChatSyncService {
  private apiKey = 'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5';
  private apiUrl = 'https://www.uchat.com.au/api';

  // ============================================
  // MÉTODOS DE API REAL
  // ============================================

  private async makeUChatAPICall(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
    try {
      const url = `${this.apiUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const config: RequestInit = {
        method,
        headers,
      };

      if (data && method === 'POST') {
        config.body = JSON.stringify(data);
      }

      console.log(`🔄 Llamando UChat API: ${method} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error UChat API (${response.status}):`, errorText);
        throw new Error(`UChat API Error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ Respuesta UChat API exitosa');
      
      return responseData;
    } catch (error) {
      console.error('❌ Error en llamada a UChat API:', error);
      throw error;
    }
  }

  // ============================================
  // SINCRONIZACIÓN DE CONVERSACIONES REALES
  // ============================================

  async syncConversationsFromUChat(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log('🔄 Sincronizando conversaciones reales desde UChat...');

      // 1. Obtener conversaciones de UChat API
      const uchatConversations = await this.makeUChatAPICall('/conversations');
      
      if (!uchatConversations || !Array.isArray(uchatConversations)) {
        console.log('⚠️ No se encontraron conversaciones en UChat o formato inesperado');
        return { success: false, count: 0, error: 'No conversations found' };
      }

      console.log(`📱 ${uchatConversations.length} conversaciones encontradas en UChat`);

      // 2. Obtener o crear bot en la base de datos
      let { data: botData, error: botError } = await supabaseSystemUIAdmin
        .from('uchat_bots')
        .select('*')
        .eq('api_key', this.apiKey)
        .single();

      if (botError || !botData) {
        console.log('🤖 Creando bot en base de datos...');
        const { data: newBot, error: newBotError } = await supabaseSystemUIAdmin
          .from('uchat_bots')
          .insert({
            bot_name: 'Bot Principal WhatsApp',
            api_key: this.apiKey,
            is_active: true
          })
          .select()
          .single();

        if (newBotError) {
          console.error('❌ Error creando bot:', newBotError);
          return { success: false, count: 0, error: newBotError.message };
        }
        
        botData = newBot;
      }

      console.log('✅ Bot configurado:', botData.bot_name);

      // 3. Sincronizar cada conversación
      let syncedCount = 0;
      
      for (const uchatConv of uchatConversations) {
        try {
          // Verificar si la conversación ya existe
          const { data: existingConv } = await supabaseSystemUIAdmin
            .from('uchat_conversations')
            .select('id')
            .eq('conversation_id', uchatConv.id)
            .single();

          const conversationData = {
            conversation_id: uchatConv.id,
            bot_id: botData.id,
            customer_phone: uchatConv.contact?.phone || 'Sin teléfono',
            customer_name: uchatConv.contact?.name || null,
            customer_email: uchatConv.contact?.email || null,
            status: this.mapUChatStatus(uchatConv.status),
            message_count: uchatConv.message_count || 0,
            priority: 'medium',
            last_message_at: uchatConv.last_message?.timestamp || uchatConv.updated_at,
            platform: 'whatsapp',
            handoff_enabled: false,
            metadata: {
              uchat_data: uchatConv,
              synced_at: new Date().toISOString()
            }
          };

          if (existingConv) {
            // Actualizar conversación existente
            const { error: updateError } = await supabaseSystemUIAdmin
              .from('uchat_conversations')
              .update({
                ...conversationData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingConv.id);

            if (updateError) {
              console.error(`❌ Error actualizando conversación ${uchatConv.id}:`, updateError);
            } else {
              console.log(`✅ Conversación actualizada: ${uchatConv.contact?.name || uchatConv.id}`);
              syncedCount++;
            }
          } else {
            // Crear nueva conversación
            const { error: insertError } = await supabaseSystemUIAdmin
              .from('uchat_conversations')
              .insert(conversationData);

            if (insertError) {
              console.error(`❌ Error insertando conversación ${uchatConv.id}:`, insertError);
            } else {
              console.log(`✅ Conversación sincronizada: ${uchatConv.contact?.name || uchatConv.id}`);
              syncedCount++;
            }
          }

          // Sincronizar último mensaje si existe
          if (uchatConv.last_message) {
            await this.syncMessage(uchatConv.id, uchatConv.last_message);
          }

        } catch (error) {
          console.error(`❌ Error procesando conversación ${uchatConv.id}:`, error);
        }
      }

      console.log(`\n🎉 Sincronización completada: ${syncedCount}/${uchatConversations.length} conversaciones`);
      
      return { success: true, count: syncedCount };

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  // ============================================
  // SINCRONIZACIÓN DE MENSAJES
  // ============================================

  async syncMessagesForConversation(conversationId: string): Promise<number> {
    try {
      console.log(`🔄 Sincronizando mensajes para conversación: ${conversationId}`);

      // Obtener mensajes de UChat API
      const uchatMessages = await this.makeUChatAPICall(`/conversations/${conversationId}/messages`);
      
      if (!uchatMessages || !Array.isArray(uchatMessages)) {
        console.log('⚠️ No se encontraron mensajes para esta conversación');
        return 0;
      }

      // Obtener conversación local
      const { data: localConv } = await supabaseSystemUIAdmin
        .from('uchat_conversations')
        .select('id')
        .eq('conversation_id', conversationId)
        .single();

      if (!localConv) {
        console.error('❌ Conversación local no encontrada');
        return 0;
      }

      let syncedMessages = 0;

      for (const uchatMsg of uchatMessages) {
        try {
          await this.syncMessage(localConv.id, uchatMsg);
          syncedMessages++;
        } catch (error) {
          console.error(`❌ Error sincronizando mensaje ${uchatMsg.id}:`, error);
        }
      }

      console.log(`✅ ${syncedMessages} mensajes sincronizados`);
      return syncedMessages;

    } catch (error) {
      console.error('❌ Error sincronizando mensajes:', error);
      return 0;
    }
  }

  private async syncMessage(conversationId: string, uchatMessage: any): Promise<void> {
    try {
      // Verificar si el mensaje ya existe
      const { data: existingMsg } = await supabaseSystemUIAdmin
        .from('uchat_messages')
        .select('id')
        .eq('message_id', uchatMessage.id)
        .single();

      if (existingMsg) {
        return; // Mensaje ya existe
      }

      // Insertar nuevo mensaje
      const messageData = {
        message_id: uchatMessage.id,
        conversation_id: conversationId,
        sender_type: this.mapSenderType(uchatMessage.sender?.type),
        sender_id: uchatMessage.sender?.id,
        sender_name: uchatMessage.sender?.name,
        message_type: uchatMessage.type || 'text',
        content: uchatMessage.content,
        media_url: uchatMessage.media?.url,
        media_type: uchatMessage.media?.type,
        media_size: uchatMessage.media?.size,
        is_read: false,
        created_at: uchatMessage.timestamp || new Date().toISOString()
      };

      const { error: insertError } = await supabaseSystemUIAdmin
        .from('uchat_messages')
        .insert(messageData);

      if (insertError) {
        console.error(`❌ Error insertando mensaje:`, insertError);
      }
    } catch (error) {
      console.error('❌ Error en syncMessage:', error);
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private mapUChatStatus(uchatStatus: string): string {
    switch (uchatStatus?.toLowerCase()) {
      case 'open':
      case 'active':
        return 'active';
      case 'closed':
      case 'resolved':
        return 'closed';
      case 'assigned':
        return 'transferred';
      default:
        return 'active';
    }
  }

  private mapSenderType(uchatSenderType: string): 'customer' | 'bot' | 'agent' {
    switch (uchatSenderType?.toLowerCase()) {
      case 'user':
      case 'customer':
        return 'customer';
      case 'bot':
      case 'system':
        return 'bot';
      case 'agent':
      case 'operator':
        return 'agent';
      default:
        return 'customer';
    }
  }

  // ============================================
  // MÉTODO PRINCIPAL DE SINCRONIZACIÓN
  // ============================================

  async fullSync(): Promise<{ success: boolean; conversations: number; messages: number; error?: string }> {
    try {
      console.log('🚀 Iniciando sincronización completa con UChat...');

      // 1. Sincronizar conversaciones
      const convResult = await this.syncConversationsFromUChat();
      
      if (!convResult.success) {
        return {
          success: false,
          conversations: 0,
          messages: 0,
          error: convResult.error
        };
      }

      // 2. Sincronizar mensajes para cada conversación
      const { data: localConversations } = await supabaseSystemUIAdmin
        .from('uchat_conversations')
        .select('conversation_id')
        .limit(10); // Limitar para evitar sobrecarga

      let totalMessages = 0;

      if (localConversations) {
        for (const conv of localConversations) {
          try {
            const messageCount = await this.syncMessagesForConversation(conv.conversation_id);
            totalMessages += messageCount;
          } catch (error) {
            console.error(`❌ Error sincronizando mensajes para ${conv.conversation_id}:`, error);
          }
        }
      }

      console.log('\n🎉 Sincronización completa exitosa!');
      console.log(`📊 Resultado: ${convResult.count} conversaciones, ${totalMessages} mensajes`);

      return {
        success: true,
        conversations: convResult.count,
        messages: totalMessages
      };

    } catch (error) {
      console.error('❌ Error en sincronización completa:', error);
      return {
        success: false,
        conversations: 0,
        messages: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

export const uchatSyncService = new UChatSyncService();
