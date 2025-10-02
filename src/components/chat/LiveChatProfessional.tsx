import React, { useState, useEffect } from 'react';
import { 
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  Sidebar,
  ConversationList,
  Conversation,
  Avatar,
  ConversationHeader,
  MessageSeparator
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { Search, Calendar, ChevronRight } from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface ChatConversation {
  id: string;
  conversation_id: string;
  customer_phone: string;
  customer_name: string;
  customer_email?: string;
  status: string;
  message_count: number;
  priority: string;
  last_message_at: string;
  metadata: any;
  created_at: string;
}

interface ChatMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_name?: string;
  content?: string;
  is_read: boolean;
  created_at: string;
}

interface ConversationBlock {
  date: string;
  message_count: number;
  first_message_time: string;
  last_message_time: string;
  messages: ChatMessage[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const LiveChatProfessional: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [conversationBlocks, setConversationBlocks] = useState<ConversationBlock[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessagesAndBlocks(selectedConversation.id);
    }
  }, [selectedConversation]);

  // ============================================
  // MÉTODOS DE CARGA
  // ============================================

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando conversaciones reales...');
      
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error:', error);
        setConversations([]);
        return;
      }

      console.log('✅ Conversaciones REALES cargadas:', data.length);
      setConversations(data || []);
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesAndBlocks = async (conversationId: string) => {
    try {
      console.log('🔄 Cargando mensajes para conversación...');
      
      const { data: messages, error } = await supabaseSystemUI
        .from('uchat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error cargando mensajes:', error);
        setAllMessages([]);
        setConversationBlocks([]);
        return;
      }

      console.log(`✅ ${messages.length} mensajes REALES cargados`);
      setAllMessages(messages || []);

      // Agrupar mensajes en bloques de 24 horas
      const blocks = groupMessagesByDay(messages || []);
      setConversationBlocks(blocks);

      // Marcar mensajes como leídos
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('❌ Error en loadMessagesAndBlocks:', error);
    }
  };

  const groupMessagesByDay = (messages: ChatMessage[]): ConversationBlock[] => {
    const blocks: { [date: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toISOString().split('T')[0];
      if (!blocks[date]) {
        blocks[date] = [];
      }
      blocks[date].push(message);
    });

    return Object.entries(blocks)
      .map(([date, msgs]) => ({
        date,
        message_count: msgs.length,
        first_message_time: msgs[0].created_at,
        last_message_time: msgs[msgs.length - 1].created_at,
        messages: msgs
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabaseSystemUI
        .from('uchat_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('is_read', false);
    } catch (error) {
      console.error('❌ Error marcando como leído:', error);
    }
  };

  // ============================================
  // MÉTODOS DE ENVÍO
  // ============================================

  const handleSendMessage = async (innerHtml: string, textContent: string) => {
    if (!textContent.trim() || !selectedConversation) return;

    try {
      console.log('📤 Enviando mensaje REAL:', textContent);
      
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .insert({
          message_id: `agent_${Date.now()}`,
          conversation_id: selectedConversation.id,
          sender_type: 'agent',
          sender_name: 'Agente',
          content: textContent,
          is_read: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando mensaje:', error);
      } else {
        console.log('✅ Mensaje REAL creado');
        
        // Recargar mensajes
        await loadMessagesAndBlocks(selectedConversation.id);
        
        // Actualizar contador de mensajes
        await supabaseSystemUI
          .from('uchat_conversations')
          .update({ 
            message_count: selectedConversation.message_count + 1,
            last_message_at: new Date().toISOString()
          })
          .eq('id', selectedConversation.id);

        await loadConversations();
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
    }
  };

  // ============================================
  // MÉTODOS DE UI
  // ============================================

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const filteredConversations = conversations.filter(conv => 
    !searchTerm || 
    conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer_phone.includes(searchTerm)
  );

  // ============================================
  // RENDERIZADO PRINCIPAL
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Cargando conversaciones reales...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <MainContainer responsive>
        {/* Sidebar con conversaciones */}
        <Sidebar position="left" scrollable={false}>
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Conversaciones</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
          
          <ConversationList scrollable>
            {filteredConversations.map((conversation) => (
              <Conversation
                key={conversation.id}
                name={conversation.customer_name}
                lastSenderName={conversation.metadata?.etapa || 'Sin etapa'}
                info={`${conversation.message_count} mensajes • ${formatTimeAgo(conversation.last_message_at)}`}
                active={selectedConversation?.id === conversation.id}
                onClick={() => setSelectedConversation(conversation)}
              >
                <Avatar 
                  name={conversation.customer_name} 
                  size="md"
                />
              </Conversation>
            ))}
          </ConversationList>
        </Sidebar>

        {/* Sidebar con bloques por día */}
        {selectedConversation && (
          <Sidebar position="left" scrollable={false}>
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Bloques por Día</h3>
              <p className="text-xs text-slate-500">{selectedConversation.customer_name}</p>
            </div>
            
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
              {conversationBlocks.map((block) => (
                <div
                  key={block.date}
                  className="p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-25 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {formatDate(block.date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {block.message_count} mensajes
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </Sidebar>
        )}

        {/* Área de chat principal */}
        {selectedConversation ? (
          <ChatContainer>
            <ConversationHeader>
              <ConversationHeader.Back />
              <Avatar 
                name={selectedConversation.customer_name} 
                size="md"
              />
              <ConversationHeader.Content 
                userName={selectedConversation.customer_name}
                info={`${selectedConversation.customer_phone} • ${selectedConversation.metadata?.etapa}`}
              />
            </ConversationHeader>
            
            <MessageList scrollBehavior="smooth">
              {allMessages.map((message, index) => {
                const isCustomer = message.sender_type === 'customer';
                const isBot = message.sender_type === 'bot';
                const showDate = index === 0 || 
                  new Date(message.created_at).toDateString() !== new Date(allMessages[index - 1]?.created_at).toDateString();

                return (
                  <React.Fragment key={message.id}>
                    {showDate && (
                      <MessageSeparator 
                        content={formatDate(message.created_at)}
                      />
                    )}
                    <Message
                      model={{
                        message: message.content || '',
                        sentTime: new Date(message.created_at).toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }),
                        sender: message.sender_name || (isCustomer ? 'Cliente' : isBot ? 'Bot Vidanta' : 'Agente'),
                        direction: isCustomer ? 'incoming' : 'outgoing',
                        position: 'single'
                      }}
                    >
                      <Avatar 
                        name={message.sender_name || (isCustomer ? selectedConversation.customer_name : isBot ? 'Bot' : 'Agente')} 
                        size="sm"
                      />
                    </Message>
                  </React.Fragment>
                );
              })}
            </MessageList>
            
            <MessageInput 
              placeholder="Escribe un mensaje..." 
              onSend={handleSendMessage}
              attachButton={false}
            />
          </ChatContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 opacity-50 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Selecciona una conversación</h3>
              <p className="text-sm">Elige una conversación para ver el historial completo</p>
            </div>
          </div>
        )}
      </MainContainer>
    </div>
  );
};

export default LiveChatProfessional;
