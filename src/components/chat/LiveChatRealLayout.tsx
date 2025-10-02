import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Calendar, 
  Clock, 
  User,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';

// ============================================
// INTERFACES PARA EL LAYOUT REAL
// ============================================

interface UChatActiveConversation {
  uchat_id: string;
  customer_name: string;
  customer_phone: string;
  last_message_time: string;
  status: 'active' | 'pending' | 'closed';
  unread_count: number;
}

interface ProspectData {
  id: string;
  prospect_id: string;
  uchat_id: string;
  nombre_completo: string;
  whatsapp: string;
  email?: string;
  etapa: string;
  // Otros campos de prospectos
}

interface ConversationBlock {
  date: string;
  message_count: number;
  conversacion_id: string;
  first_message_time: string;
  last_message_time: string;
}

interface WhatsAppMessage {
  id: string;
  prospect_id: string;
  conversacion_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  content: string;
  timestamp: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document';
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface LiveChatRealLayoutProps {
  className?: string;
}

const LiveChatRealLayout: React.FC<LiveChatRealLayoutProps> = ({ className = '' }) => {
  const [activeConversations, setActiveConversations] = useState<UChatActiveConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<UChatActiveConversation | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectData | null>(null);
  const [conversationBlocks, setConversationBlocks] = useState<ConversationBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ConversationBlock | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadActiveConversationsFromUChat();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadProspectData(selectedConversation.uchat_id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedProspect) {
      loadConversationBlocks(selectedProspect.prospect_id);
    }
  }, [selectedProspect]);

  useEffect(() => {
    if (selectedBlock && selectedProspect) {
      loadMessagesForBlock(selectedProspect.prospect_id, selectedBlock.conversacion_id);
    }
  }, [selectedBlock, selectedProspect]);

  // ============================================
  // MÉTODOS DE CARGA DE DATOS
  // ============================================

  const loadActiveConversationsFromUChat = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando conversaciones activas de UChat...');
      
      // TODO: Implementar llamada real a UChat API
      // Por ahora, datos de ejemplo basados en tu dashboard
      const mockActiveConversations: UChatActiveConversation[] = [
        {
          uchat_id: 'rodrigo_mora_uchat_id',
          customer_name: 'Rodrigo mora',
          customer_phone: '+5213315127354',
          last_message_time: '2025-10-02T02:39:00Z',
          status: 'active',
          unread_count: 1
        },
        {
          uchat_id: 'leo_san_uchat_id',
          customer_name: 'leo san',
          customer_phone: '+5213315127355',
          last_message_time: '2025-10-01T22:01:00Z',
          status: 'active',
          unread_count: 0
        },
        {
          uchat_id: 'francisco_hernandez_uchat_id',
          customer_name: 'Francisco Hernandez',
          customer_phone: '+5213315127356',
          last_message_time: '2025-10-01T00:45:00Z',
          status: 'active',
          unread_count: 0
        }
      ];

      setActiveConversations(mockActiveConversations);
      console.log(`✅ ${mockActiveConversations.length} conversaciones activas cargadas`);
    } catch (error) {
      console.error('❌ Error cargando conversaciones de UChat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProspectData = async (uchatId: string) => {
    try {
      console.log('🔍 Buscando prospecto por uchat_id:', uchatId);
      
      // TODO: Implementar búsqueda real en tabla prospectos (pqnc_ia)
      // Simulación basada en la estructura que mencionaste
      const mockProspectData: ProspectData = {
        id: 'prospect_' + uchatId,
        prospect_id: 'prospect_id_' + uchatId,
        uchat_id: uchatId,
        nombre_completo: selectedConversation?.customer_name || 'Cliente',
        whatsapp: selectedConversation?.customer_phone || '',
        email: 'cliente@email.com',
        etapa: 'Interesado'
      };

      setSelectedProspect(mockProspectData);
      console.log('✅ Prospecto encontrado:', mockProspectData.nombre_completo);
    } catch (error) {
      console.error('❌ Error buscando prospecto:', error);
    }
  };

  const loadConversationBlocks = async (prospectId: string) => {
    try {
      console.log('📅 Cargando bloques de conversación para prospect_id:', prospectId);
      
      // TODO: Implementar búsqueda real en mensajes_whatsapp y conversaciones_whatsapp
      // Simulación de bloques de 24 horas
      const mockBlocks: ConversationBlock[] = [
        {
          date: '2025-10-02',
          message_count: 5,
          conversacion_id: 'conv_20251002',
          first_message_time: '2025-10-02T02:30:00Z',
          last_message_time: '2025-10-02T02:39:00Z'
        },
        {
          date: '2025-10-01',
          message_count: 8,
          conversacion_id: 'conv_20251001',
          first_message_time: '2025-10-01T21:45:00Z',
          last_message_time: '2025-10-01T22:01:00Z'
        },
        {
          date: '2025-09-30',
          message_count: 12,
          conversacion_id: 'conv_20250930',
          first_message_time: '2025-09-30T23:30:00Z',
          last_message_time: '2025-09-30T23:52:00Z'
        }
      ];

      setConversationBlocks(mockBlocks);
      // Seleccionar el bloque más reciente por defecto
      if (mockBlocks.length > 0) {
        setSelectedBlock(mockBlocks[0]);
      }
      console.log(`✅ ${mockBlocks.length} bloques de conversación cargados`);
    } catch (error) {
      console.error('❌ Error cargando bloques:', error);
    }
  };

  const loadMessagesForBlock = async (prospectId: string, conversacionId: string) => {
    try {
      console.log('💬 Cargando mensajes para bloque:', conversacionId);
      
      // TODO: Implementar carga real de mensajes desde conversaciones_whatsapp
      // Simulación de mensajes
      const mockMessages: WhatsAppMessage[] = [
        {
          id: 'msg_1',
          prospect_id: prospectId,
          conversacion_id: conversacionId,
          sender_type: 'customer',
          content: 'Hola, me interesa información sobre Vidanta',
          timestamp: '2025-10-02T02:30:00Z',
          message_type: 'text'
        },
        {
          id: 'msg_2',
          prospect_id: prospectId,
          conversacion_id: conversacionId,
          sender_type: 'bot',
          content: 'Si en algún momento cambia de opinión o tiene curiosidad por conocer algo, estaré aquí. Que tenga excelente día! 🌟',
          timestamp: '2025-10-02T02:39:00Z',
          message_type: 'text'
        }
      ];

      setMessages(mockMessages);
      console.log(`✅ ${mockMessages.length} mensajes cargados para el bloque`);
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error);
    }
  };

  // ============================================
  // UTILIDADES
  // ============================================

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

  const scrollToBlock = (blockDate: string) => {
    // TODO: Implementar scroll automático al bloque seleccionado
    console.log('📍 Scroll automático a bloque:', blockDate);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Cargando conversaciones de UChat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full bg-white ${className}`}>
      {/* Columna 1: Lista de Conversaciones Activas */}
      <div className="w-1/3 border-r border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Conversaciones Activas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          {activeConversations.map((conversation) => (
            <div
              key={conversation.uchat_id}
              onClick={() => setSelectedConversation(conversation)}
              className={`p-4 border-b border-slate-50 cursor-pointer transition-colors ${
                selectedConversation?.uchat_id === conversation.uchat_id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'hover:bg-slate-25'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {conversation.customer_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-slate-900 truncate">
                      {conversation.customer_name}
                    </h3>
                    {conversation.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-1">{conversation.customer_phone}</p>
                  
                  <div className="flex items-center text-xs text-slate-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(conversation.last_message_time)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna 2: Bloques de Conversación (24h) */}
      {selectedConversation && (
        <div className="w-1/4 border-r border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Historial por Días</h3>
            <p className="text-xs text-slate-500">{selectedProspect?.nombre_completo}</p>
          </div>

          <div className="overflow-y-auto">
            {conversationBlocks.map((block) => (
              <div
                key={block.conversacion_id}
                onClick={() => {
                  setSelectedBlock(block);
                  scrollToBlock(block.date);
                }}
                className={`p-3 border-b border-slate-50 cursor-pointer transition-colors ${
                  selectedBlock?.conversacion_id === block.conversacion_id
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
      )}

      {/* Columna 3: Ventana de Chat */}
      {selectedConversation && selectedBlock ? (
        <div className="flex-1 flex flex-col">
          {/* Header del chat */}
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-slate-600">
                  {selectedConversation.customer_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedConversation.customer_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedConversation.customer_phone} • {formatDate(selectedBlock.date)}
                </p>
              </div>
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay mensajes en este bloque</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'customer' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender_type === 'customer'
                      ? 'bg-slate-100 text-slate-900'
                      : message.sender_type === 'bot'
                        ? 'bg-blue-50 text-blue-900 border border-blue-100'
                        : 'bg-slate-900 text-white'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <div className={`text-xs mt-1 ${
                      message.sender_type === 'customer' ? 'text-slate-500' : 
                      message.sender_type === 'bot' ? 'text-blue-600' : 'text-slate-300'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input de mensaje */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
              <button className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors">
                Enviar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Selecciona una conversación</h3>
            <p className="text-sm">Elige una conversación para ver el historial completo</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatRealLayout;
