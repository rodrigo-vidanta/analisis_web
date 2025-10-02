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

const LiveChatPerfectFinal: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationBlocks, setConversationBlocks] = useState<ConversationBlock[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Estado de distribución de columnas (guardado en localStorage)
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('livechat-column-widths');
    return saved ? JSON.parse(saved) : { conversations: 320, blocks: 280, chat: 'auto' };
  });

  // Estado del sidebar (para ajustar posición)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Detectar si el sidebar está colapsado basándose en el ancho de la ventana
    return window.innerWidth < 1024 || localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Referencias para scroll y redimensionamiento
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const resizeRef1 = useRef<HTMLDivElement>(null);
  const resizeRef2 = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0
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
    // SCROLL AL FINAL para mostrar últimos mensajes
    scrollToBottom();
  }, [allMessages]);

  useEffect(() => {
    // Guardar distribución de columnas en localStorage
    localStorage.setItem('livechat-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    // Detectar cambios en el sidebar
    const handleResize = () => {
      const collapsed = window.innerWidth < 1024 || localStorage.getItem('sidebar-collapsed') === 'true';
      setSidebarCollapsed(collapsed);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // MÉTODOS DE REDIMENSIONAMIENTO
  // ============================================

  const handleMouseDown = (e: React.MouseEvent, resizeType: 'conversations' | 'blocks') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidths = { ...columnWidths };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = e.clientX - startX;

      if (resizeType === 'conversations') {
        const newConversationsWidth = Math.max(250, Math.min(500, startWidths.conversations + deltaX));
        setColumnWidths({
          ...columnWidths,
          conversations: newConversationsWidth
        });
      } else if (resizeType === 'blocks') {
        const newBlocksWidth = Math.max(200, Math.min(400, startWidths.blocks + deltaX));
        setColumnWidths({
          ...columnWidths,
          blocks: newBlocksWidth
        });
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

      setMetrics({
        totalConversations,
        activeConversations
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
        .order('created_at', { ascending: true }); // Orden cronológico

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
    if (messagesScrollRef.current) {
      // SCROLL AL FINAL para mostrar últimos mensajes
      setTimeout(() => {
        if (messagesScrollRef.current) {
          messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
        }
      }, 100);
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
  // RENDERIZADO PRINCIPAL - ALTURA FIJA TOTAL DE PANTALLA
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
        height: '100vh', // ALTURA TOTAL DE PANTALLA
        width: '100%',
        display: 'flex',
        overflow: 'hidden', // SIN SCROLL GLOBAL
        position: 'fixed', // FIJO EN PANTALLA
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: '120px', // Espacio para pestañas fijas
        paddingLeft: sidebarCollapsed ? '64px' : '256px', // Espacio para sidebar (colapsado o expandido)
        paddingBottom: '64px' // Espacio para footer
      }}
    >
      {/* Columna 1: Lista de Conversaciones - ALTURA FIJA TOTAL */}
      <div 
        className="border-r border-slate-200 bg-white"
        style={{ 
          width: `${columnWidths.conversations}px`,
          height: '100%', // ALTURA FIJA TOTAL
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header fijo */}
        <div 
          className="p-4 border-b border-slate-100 bg-white"
          style={{ 
            flexShrink: 0,
            height: '200px'
          }}
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

        {/* Lista de conversaciones - SCROLL INDEPENDIENTE */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin'
          }}
          onWheel={(e) => {
            // PREVENIR scroll global
            e.stopPropagation();
            const target = e.currentTarget;
            const { scrollTop, scrollHeight, clientHeight } = target;
            
            if ((e.deltaY < 0 && scrollTop === 0) || 
                (e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight)) {
              e.preventDefault();
            }
          }}
        >
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-slate-50 cursor-pointer transition-all duration-200 ${
                selectedConversation?.id === conversation.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm'
                  : 'hover:bg-slate-25'
              }`}
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
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

      {/* Divisor redimensionable 1 */}
      <div 
        ref={resizeRef1}
        className="w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize flex items-center justify-center group"
        style={{ 
          height: '100%',
          flexShrink: 0,
          zIndex: 10
        }}
        onMouseDown={(e) => handleMouseDown(e, 'conversations')}
      >
        <div className="w-1 h-8 bg-slate-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>

      {/* Columna 2: Bloques de Conversación - ALTURA FIJA TOTAL */}
      {selectedConversation && (
        <div 
          className="border-r border-slate-200 bg-white"
          style={{ 
            width: `${columnWidths.blocks}px`,
            height: '100%', // ALTURA FIJA TOTAL
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header fijo */}
          <div 
            className="p-4 border-b border-slate-100 bg-white"
            style={{ 
              flexShrink: 0,
              height: '80px'
            }}
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Bloques por Día</h3>
            <p className="text-xs text-slate-500">{selectedConversation.customer_name}</p>
          </div>

          {/* Lista de bloques - SCROLL INDEPENDIENTE */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{ 
              overscrollBehavior: 'contain',
              scrollbarWidth: 'thin'
            }}
            onWheel={(e) => {
              // PREVENIR scroll global
              e.stopPropagation();
              const target = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = target;
              
              if ((e.deltaY < 0 && scrollTop === 0) || 
                  (e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight)) {
                e.preventDefault();
              }
            }}
          >
            {conversationBlocks.map((block) => (
              <div
                key={block.date}
                className="p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-25 transition-all duration-200"
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

        {/* Divisor redimensionable 2 */}
        <div 
          ref={resizeRef2}
          className="w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize flex items-center justify-center group"
          style={{ 
            height: '100%',
            flexShrink: 0,
            zIndex: 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'blocks')}
        >
          <div className="w-1 h-8 bg-slate-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}

      {/* Columna 3: Ventana de Chat - ALTURA FIJA TOTAL */}
      {selectedConversation ? (
        <div 
          className="bg-white"
          style={{ 
            flex: 1,
            height: '100%', // ALTURA FIJA TOTAL
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Header del chat fijo */}
          <div 
            className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100"
            style={{ 
              flexShrink: 0,
              height: '80px',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
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

          {/* Área de mensajes - SCROLL INDEPENDIENTE */}
          <div 
            ref={messagesScrollRef}
            className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-25 to-white"
            style={{ 
              overscrollBehavior: 'contain',
              scrollbarWidth: 'thin',
              paddingBottom: '100px' // Espacio para input fijo
            }}
            onWheel={(e) => {
              // PREVENIR scroll global
              e.stopPropagation();
              const target = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = target;
              
              if ((e.deltaY < 0 && scrollTop === 0) || 
                  (e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight)) {
                e.preventDefault();
              }
            }}
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
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
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

          {/* Input de mensaje COMPLETAMENTE FIJO EN PANTALLA */}
          <div 
            className="p-4 border-t border-slate-200 bg-white"
            style={{ 
              position: 'fixed',
              bottom: '64px', // Encima del footer
              left: `${(sidebarCollapsed ? 64 : 256) + columnWidths.conversations + (selectedConversation ? columnWidths.blocks + 2 : 0)}px`, // Después de sidebar + columnas
              right: 0,
              height: '80px',
              zIndex: 20,
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
                  style={{ minHeight: '44px', maxHeight: '44px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="flex-1 flex items-center justify-center text-slate-500 bg-white"
          style={{ overflow: 'hidden' }}
        >
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

export default LiveChatPerfectFinal;
