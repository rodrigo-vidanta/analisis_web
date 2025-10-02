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
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import ReactMarkdown from 'react-markdown';

// ============================================
// INTERFACES
// ============================================

interface Conversation {
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

interface Message {
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
  messages: Message[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const LiveChatPerfect: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationBlocks, setConversationBlocks] = useState<ConversationBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ConversationBlock | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Estado de distribución de columnas (guardado en localStorage)
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('livechat-column-widths');
    return saved ? JSON.parse(saved) : { conversations: 25, blocks: 20, chat: 55 };
  });

  // Referencias para scroll independiente
  const conversationsScrollRef = useRef<HTMLDivElement>(null);
  const blocksScrollRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);

  useEffect(() => {
    localStorage.setItem('livechat-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // ============================================
  // MANEJO DE REDIMENSIONAMIENTO
  // ============================================

  const handleMouseDown = (e: React.MouseEvent, resizeType: 'conversations' | 'blocks') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidths = { ...columnWidths };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = e.clientX - startX;
      const containerWidth = window.innerWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;

      if (resizeType === 'conversations') {
        const newConversationsWidth = Math.max(15, Math.min(50, startWidths.conversations + deltaPercent));
        const remaining = 100 - newConversationsWidth;
        const newBlocksWidth = Math.max(15, Math.min(35, startWidths.blocks));
        const newChatWidth = remaining - newBlocksWidth;
        
        if (newChatWidth >= 30) {
          setColumnWidths({
            conversations: newConversationsWidth,
            blocks: newBlocksWidth,
            chat: newChatWidth
          });
        }
      } else if (resizeType === 'blocks') {
        const newBlocksWidth = Math.max(15, Math.min(35, startWidths.blocks + deltaPercent));
        const newChatWidth = 100 - startWidths.conversations - newBlocksWidth;
        
        if (newChatWidth >= 30) {
          setColumnWidths({
            conversations: startWidths.conversations,
            blocks: newBlocksWidth,
            chat: newChatWidth
          });
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

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
      console.log('🔄 Cargando mensajes y bloques para conversación...');
      
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
      
      // Seleccionar el bloque más reciente por defecto
      if (blocks.length > 0) {
        setSelectedBlock(blocks[0]);
      }

      // Marcar mensajes como leídos
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('❌ Error en loadMessagesAndBlocks:', error);
    }
  };

  const groupMessagesByDay = (messages: Message[]): ConversationBlock[] => {
    const blocks: { [date: string]: Message[] } = {};
    
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedConversation) return;

    try {
      setSending(true);
      console.log('📤 Enviando mensaje REAL:', newMessage);
      
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        message_id: `temp-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_type: 'agent',
        sender_name: 'Agente',
        content: newMessage,
        is_read: true,
        created_at: new Date().toISOString()
      };

      setAllMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .insert({
          message_id: `agent_${Date.now()}`,
          conversation_id: selectedConversation.id,
          sender_type: 'agent',
          sender_name: 'Agente',
          content: newMessage,
          is_read: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando mensaje:', error);
        setAllMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      } else {
        console.log('✅ Mensaje REAL creado');
        setAllMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
        
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
      setAllMessages(prev => prev.filter(m => m.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================
  // MÉTODOS DE UI
  // ============================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBlock = (block: ConversationBlock) => {
    setSelectedBlock(block);
    const firstMessageOfBlock = allMessages.find(msg => 
      new Date(msg.created_at).toISOString().split('T')[0] === block.date
    );
    
    if (firstMessageOfBlock && messagesScrollRef.current) {
      const messageElement = document.getElementById(`message-${firstMessageOfBlock.id}`);
      if (messageElement) {
        const container = messagesScrollRef.current;
        const containerRect = container.getBoundingClientRect();
        const messageRect = messageElement.getBoundingClientRect();
        const scrollTop = container.scrollTop + messageRect.top - containerRect.top - 20;
        
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
        return <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />;
      case 'transferred': 
        return <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />;
      case 'closed': 
        return <Circle className="w-2 h-2 fill-slate-400 text-slate-400" />;
      default: 
        return <Circle className="w-2 h-2 fill-slate-300 text-slate-300" />;
    }
  };

  const filteredConversations = conversations.filter(conv => 
    !searchTerm || 
    conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer_phone.includes(searchTerm)
  );

  // ============================================
  // RENDERIZADO DE MENSAJES
  // ============================================

  const renderMessage = (message: Message, index: number) => {
    const isCustomer = message.sender_type === 'customer';
    const isBot = message.sender_type === 'bot';
    const showDate = index === 0 || 
      formatDate(message.created_at) !== formatDate(allMessages[index - 1]?.created_at);

    return (
      <div key={message.id} id={`message-${message.id}`}>
        {showDate && (
          <div className="flex justify-center my-6">
            <span className="px-3 py-1 text-xs text-slate-500 bg-slate-50 rounded-full">
              {formatDate(message.created_at)}
            </span>
          </div>
        )}

        <div className={`flex mb-4 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-xs lg:max-w-md ${isCustomer ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
            
            <div className={`text-xs text-slate-500 mb-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
              {message.sender_name || (isCustomer ? 'Cliente' : isBot ? 'Bot Vidanta' : 'Agente')}
            </div>

            <div className={`relative px-4 py-2 rounded-2xl ${
              isCustomer 
                ? 'bg-slate-100 text-slate-900' 
                : isBot
                  ? 'bg-blue-50 text-blue-900 border border-blue-100'
                  : 'bg-slate-900 text-white'
            }`}>
              {message.content && (
                <div className="text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      br: () => <br />
                    }}
                  >
                    {message.content.replace(/\\n/g, '\n')}
                  </ReactMarkdown>
                </div>
              )}

              <div className={`text-xs mt-1 ${
                isCustomer || isBot ? 'text-slate-500' : 'text-slate-300'
              }`}>
                {formatTime(message.created_at)}
              </div>
            </div>
          </div>

          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isCustomer ? 'order-1' : 'order-2'
          } ${
            isCustomer 
              ? 'bg-slate-200 text-slate-600' 
              : isBot
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-800 text-white'
          }`}>
            <span className="text-xs font-medium">
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
  };

  // ============================================
  // RENDERIZADO PRINCIPAL - ALTURA FIJA ABSOLUTA
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
      className="relative bg-white"
      style={{ 
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Columna 1: Lista de Conversaciones - ALTURA FIJA */}
      <div 
        className="absolute top-0 bottom-0 border-r border-slate-200 bg-white"
        style={{ 
          left: 0,
          width: `${columnWidths.conversations}%`
        }}
      >
        {/* Header fijo - NO SCROLL */}
        <div 
          className="absolute top-0 left-0 right-0 p-4 border-b border-slate-100 bg-white"
          style={{ height: '200px' }}
        >
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900">{metrics.totalConversations}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600">{metrics.activeConversations}</div>
              <div className="text-xs text-slate-500">Activas</div>
            </div>
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
          ref={conversationsScrollRef}
          className="absolute left-0 right-0 bottom-0 overflow-y-auto"
          style={{ 
            top: '200px',
            overscrollBehavior: 'contain'
          }}
        >
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-3 border-b border-slate-50 cursor-pointer transition-colors ${
                selectedConversation?.id === conversation.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'hover:bg-slate-25'
              }`}
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-slate-600">
                    {conversation.customer_name?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-slate-900 truncate">
                      {conversation.customer_name}
                    </h3>
                    {getStatusIndicator(conversation.status)}
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-1">{conversation.customer_phone}</p>
                  <p className="text-xs text-blue-600 font-medium mb-1">{conversation.metadata?.etapa}</p>
                  
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

      {/* Divisor redimensionable 1 */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize flex items-center justify-center group z-10"
        style={{ left: `${columnWidths.conversations}%` }}
        onMouseDown={(e) => handleMouseDown(e, 'conversations')}
      >
        <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
      </div>

      {/* Columna 2: Bloques de Conversación - ALTURA FIJA */}
      {selectedConversation && (
        <>
          <div 
            className="absolute top-0 bottom-0 border-r border-slate-200 bg-white"
            style={{ 
              left: `${columnWidths.conversations + 1}%`,
              width: `${columnWidths.blocks}%`
            }}
          >
            {/* Header fijo - NO SCROLL */}
            <div 
              className="absolute top-0 left-0 right-0 p-4 border-b border-slate-100 bg-white"
              style={{ height: '80px' }}
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Bloques por Día</h3>
              <p className="text-xs text-slate-500">{selectedConversation.customer_name}</p>
            </div>

            {/* Lista de bloques - SOLO ESTA ÁREA TIENE SCROLL */}
            <div 
              ref={blocksScrollRef}
              className="absolute left-0 right-0 bottom-0 overflow-y-auto"
              style={{ 
                top: '80px',
                overscrollBehavior: 'contain'
              }}
            >
              {conversationBlocks.map((block) => (
                <div
                  key={block.date}
                  onClick={() => scrollToBlock(block)}
                  className={`p-3 border-b border-slate-50 cursor-pointer transition-colors ${
                    selectedBlock?.date === block.date
                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                      : 'hover:bg-slate-25'
                  }`}
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
          </div>

          {/* Divisor redimensionable 2 */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize flex items-center justify-center group z-10"
            style={{ left: `${columnWidths.conversations + columnWidths.blocks + 1}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'blocks')}
          >
            <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
          </div>
        </>
      )}

      {/* Columna 3: Ventana de Chat - ALTURA FIJA */}
      {selectedConversation ? (
        <div 
          className="absolute top-0 bottom-0 bg-white"
          style={{ 
            left: `${columnWidths.conversations + columnWidths.blocks + 2}%`,
            width: `${columnWidths.chat}%`
          }}
        >
          {/* Header del chat fijo - NO SCROLL */}
          <div 
            className="absolute top-0 left-0 right-0 p-4 border-b border-slate-100 bg-slate-50"
            style={{ height: '80px' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {selectedConversation.customer_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {selectedConversation.customer_name}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <Phone className="w-3 h-3" />
                    <span>{selectedConversation.customer_phone}</span>
                    <span className="text-blue-600 font-medium">
                      {selectedConversation.metadata?.etapa}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedConversation(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Área de mensajes - SOLO ESTA ÁREA TIENE SCROLL */}
          <div 
            ref={messagesScrollRef}
            className="absolute left-0 right-0 overflow-y-auto p-4"
            style={{ 
              top: '80px',
              bottom: '80px', // Espacio para el input fijo
              overscrollBehavior: 'contain'
            }}
          >
            {allMessages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay mensajes en esta conversación</p>
                </div>
              </div>
            ) : (
              allMessages.map((message, index) => renderMessage(message, index))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de mensaje COMPLETAMENTE FIJO - SIEMPRE VISIBLE */}
          <div 
            className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white"
            style={{ height: '80px' }}
          >
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none"
                  style={{ minHeight: '36px', maxHeight: '60px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="absolute top-0 bottom-0 bg-white flex items-center justify-center text-slate-500"
          style={{ 
            left: `${columnWidths.conversations + columnWidths.blocks + 2}%`,
            width: `${columnWidths.chat}%`
          }}
        >
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Selecciona una conversación</h3>
            <p className="text-sm">Elige una conversación para ver el historial completo</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatPerfect;
