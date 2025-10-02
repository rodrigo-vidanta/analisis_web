import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Phone,
  Clock,
  User,
  MessageSquare,
  Circle,
  Send,
  X,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

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

const LiveChatStreamPro: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [conversationBlocks, setConversationBlocks] = useState<ConversationBlock[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Referencias para scroll
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0,
    transferredConversations: 0,
    closedConversations: 0,
    handoffRate: 0
  });

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    loadConversations();
    loadMetrics();
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

  const loadMetrics = async () => {
    try {
      const { data: conversations } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*');

      const totalConversations = conversations?.length || 0;
      const activeConversations = conversations?.filter(c => c.status === 'active').length || 0;
      const transferredConversations = conversations?.filter(c => c.status === 'transferred').length || 0;
      const closedConversations = conversations?.filter(c => c.status === 'closed').length || 0;

      setMetrics({
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0
      });
    } catch (error) {
      console.error('Error cargando métricas:', error);
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

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !selectedConversation) return;

    try {
      console.log('📤 Enviando mensaje REAL:', message);
      
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .insert({
          message_id: `agent_${Date.now()}`,
          conversation_id: selectedConversation.id,
          sender_type: 'agent',
          sender_name: 'Agente',
          content: message,
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

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active': 
        return <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>;
      case 'transferred': 
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      case 'closed': 
        return <div className="w-2 h-2 bg-slate-400 rounded-full"></div>;
      default: 
        return <div className="w-2 h-2 bg-slate-300 rounded-full"></div>;
    }
  };

  const filteredConversations = conversations.filter(conv => 
    !searchTerm || 
    conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer_phone.includes(searchTerm)
  );

  // ============================================
  // RENDERIZADO PRINCIPAL - ALTURA FIJA CON CSS GRID
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
    <div 
      className="bg-white"
      style={{ 
        height: '100%',
        display: 'grid',
        gridTemplateColumns: selectedConversation ? '320px 280px 1fr' : '320px 1fr',
        gridTemplateRows: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Columna 1: Lista de Conversaciones - ALTURA FIJA */}
      <div 
        className="border-r border-slate-200 bg-white"
        style={{ 
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          overflow: 'hidden'
        }}
      >
        {/* Header fijo - NO SCROLL */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Conversaciones</h1>
              <p className="text-xs text-slate-500">Datos reales de UChat</p>
            </div>
            <button 
              onClick={loadConversations}
              className="text-xs px-2 py-1 text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
            >
              Actualizar
            </button>
          </div>

          <div className="relative">
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

        {/* Lista de conversaciones - SOLO ESTA ÁREA TIENE SCROLL */}
        <div 
          className="overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-slate-50 cursor-pointer transition-colors ${
                selectedConversation?.id === conversation.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'hover:bg-slate-25'
              }`}
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {conversation.customer_name?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {conversation.customer_name}
                    </h3>
                    {getStatusIndicator(conversation.status)}
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-1">{conversation.customer_phone}</p>
                  <p className="text-xs text-blue-600 font-medium mb-2">{conversation.metadata?.etapa}</p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{conversation.message_count} mensajes</span>
                    <span>{formatTimeAgo(conversation.last_message_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna 2: Bloques de Conversación - ALTURA FIJA */}
      {selectedConversation && (
        <div 
          className="border-r border-slate-200 bg-white"
          style={{ 
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
            overflow: 'hidden'
          }}
        >
          {/* Header fijo - NO SCROLL */}
          <div className="p-4 border-b border-slate-100 bg-white">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Bloques por Día</h3>
            <p className="text-xs text-slate-500">{selectedConversation.customer_name}</p>
          </div>

          {/* Lista de bloques - SOLO ESTA ÁREA TIENE SCROLL */}
          <div 
            className="overflow-y-auto"
            style={{ overscrollBehavior: 'contain' }}
          >
            {conversationBlocks.map((block) => (
              <div
                key={block.date}
                className="p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-25 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900">
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
        </div>
      )}

      {/* Columna 3: Ventana de Chat - ALTURA FIJA */}
      {selectedConversation ? (
        <div 
          className="bg-white"
          style={{ 
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            overflow: 'hidden'
          }}
        >
          {/* Header del chat fijo - NO SCROLL */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {selectedConversation.customer_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedConversation.customer_name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{selectedConversation.customer_phone}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {selectedConversation.metadata?.etapa}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedConversation(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Área de mensajes - SOLO ESTA ÁREA TIENE SCROLL */}
          <div 
            className="overflow-y-auto p-6 bg-gradient-to-b from-slate-25 to-white"
            style={{ overscrollBehavior: 'contain' }}
          >
            {allMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No hay mensajes</h3>
                  <p className="text-sm">Esta conversación aún no tiene mensajes</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {allMessages.map((message, index) => {
                  const isCustomer = message.sender_type === 'customer';
                  const isBot = message.sender_type === 'bot';
                  const showDate = index === 0 || 
                    formatDate(message.created_at) !== formatDate(allMessages[index - 1]?.created_at);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex justify-center my-6">
                          <span className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full shadow-sm">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-md ${isCustomer ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
                          
                          <div className={`text-xs text-slate-500 mb-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                            {message.sender_name || (isCustomer ? 'Cliente' : isBot ? 'Bot Vidanta' : 'Agente')}
                          </div>

                          <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                            isCustomer 
                              ? 'bg-white border border-slate-200 text-slate-900' 
                              : isBot
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-900 text-white'
                          }`}>
                            {message.content && (
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content.replace(/\\n/g, '\n')}
                              </div>
                            )}

                            <div className={`text-xs mt-2 ${
                              isCustomer ? 'text-slate-400' : 'text-white text-opacity-75'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCustomer ? 'order-1' : 'order-2'
                        } ${
                          isCustomer 
                            ? 'bg-gradient-to-br from-slate-400 to-slate-600' 
                            : isBot
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                              : 'bg-gradient-to-br from-slate-800 to-slate-900'
                        }`}>
                          <span className="text-xs font-semibold text-white">
                            {isCustomer 
                              ? (selectedConversation?.customer_name?.charAt(0).toUpperCase() || 'C')
                              : isBot 
                                ? 'B'
                                : 'A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input de mensaje fijo - NO SCROLL */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const target = e.target as HTMLTextAreaElement;
                      if (target.value.trim()) {
                        handleSendMessage(target.value);
                        target.value = '';
                      }
                    }
                  }}
                />
              </div>

              <button
                onClick={() => {
                  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                  if (textarea?.value.trim()) {
                    handleSendMessage(textarea.value);
                    textarea.value = '';
                  }
                }}
                className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Selecciona una conversación</h3>
            <p className="text-sm text-slate-600">Elige una conversación para ver el historial completo</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatStreamPro;
