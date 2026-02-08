/**
 * ============================================
 * VENTANA DE CHAT INDIVIDUAL - LIVE CHAT
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

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  User,
  Phone,
  Clock,
  Check,
  CheckCheck,
  Bot
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

interface RealMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_name?: string;
  content?: string;
  is_read: boolean;
  created_at: string;
}

interface RealConversation {
  id: string;
  conversation_id: string;
  customer_phone: string;
  customer_name: string;
  customer_email?: string;
  status: string;
  message_count: number;
  metadata: any;
  last_message_at: string;
}

interface ChatWindowRealProps {
  conversation: RealConversation;
  onClose: () => void;
  className?: string;
}

const ChatWindowReal: React.FC<ChatWindowRealProps> = ({ 
  conversation, 
  onClose, 
  className = '' 
}) => {
  const [messages, setMessages] = useState<RealMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando mensajes REALES para:', conversation.customer_name);
      
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error cargando mensajes:', error);
        setMessages([]);
        return;
      }

      console.log(`✅ ${data.length} mensajes REALES cargados para ${conversation.customer_name}`);
      setMessages(data || []);
      
      // Marcar mensajes como leídos
      await markMessagesAsRead();
    } catch (error) {
      console.error('❌ Error en loadMessages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const { error } = await supabaseSystemUI
        .from('uchat_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversation.id)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error marcando como leído:', error);
      }
    } catch (error) {
      console.error('❌ Error en markMessagesAsRead:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      console.log('📤 Enviando mensaje REAL:', newMessage);
      
      // Crear mensaje temporal para UX inmediata
      const tempMessage: RealMessage = {
        id: `temp-${Date.now()}`,
        message_id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        sender_type: 'agent',
        sender_name: 'Agente',
        content: newMessage,
        is_read: true,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      // Crear mensaje real en la base de datos
      const { data, error } = await supabaseSystemUI
        .from('uchat_messages')
        .insert({
          message_id: `agent_${Date.now()}`,
          conversation_id: conversation.id,
          sender_type: 'agent',
          sender_name: 'Agente',
          content: newMessage,
          is_read: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando mensaje:', error);
        // Remover mensaje temporal si falló
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      } else {
        console.log('✅ Mensaje REAL creado');
        // Reemplazar mensaje temporal con el real
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
        
        // Actualizar contador de mensajes
        await supabaseSystemUI
          .from('uchat_conversations')
          .update({ 
            message_count: conversation.message_count + 1,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversation.id);
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      // Remover mensaje temporal si falló
      setMessages(prev => prev.filter(m => m.id.startsWith('temp-')));
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
      hour12: false
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
      return date.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'short',
        timeZone: 'America/Mexico_City'
      });
    }
  };

  const renderMessage = (message: RealMessage, index: number) => {
    const isCustomer = message.sender_type === 'customer';
    const isBot = message.sender_type === 'bot';
    const showDate = index === 0 || 
      formatDate(message.created_at) !== formatDate(messages[index - 1]?.created_at);

    return (
      <div key={message.id}>
        {/* Separador de fecha */}
        {showDate && (
          <div className="flex justify-center my-6">
            <span className="px-3 py-1 text-xs text-gray-500 bg-gray-50 rounded-full">
              {formatDate(message.created_at)}
            </span>
          </div>
        )}

        {/* Mensaje */}
        <div className={`flex mb-4 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-xs lg:max-w-md ${isCustomer ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
            
            {/* Nombre del remitente */}
            <div className={`text-xs text-gray-500 mb-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
              {message.sender_name || (isCustomer ? 'Cliente' : isBot ? 'Bot Vidanta' : 'Agente')}
            </div>

            {/* Burbuja del mensaje */}
            <div className={`relative px-4 py-2 rounded-2xl ${
              isCustomer 
                ? 'bg-gray-100 text-gray-900' 
                : isBot
                  ? 'bg-blue-50 text-blue-900 border border-blue-100'
                  : 'bg-gray-900 text-white'
            }`}>
              {/* Contenido */}
              {message.content && (
                <p className="text-sm leading-relaxed">
                  {message.content}
                </p>
              )}

              {/* Hora y estado */}
              <div className={`flex items-center justify-end mt-1 space-x-1 ${
                isCustomer || isBot ? 'text-gray-500' : 'text-gray-300'
              }`}>
                <span className="text-xs">
                  {formatTime(message.created_at)}
                </span>
                {!isCustomer && !isBot && (
                  <div className="text-xs">
                    {message.is_read ? (
                      <CheckCheck className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isCustomer ? 'order-1' : 'order-2'
          } ${
            isCustomer 
              ? 'bg-gray-200 text-gray-600' 
              : isBot
                ? 'bg-gradient-to-br from-blue-500 to-cyan-600'
                : 'bg-gradient-to-br from-violet-500 to-purple-600'
          }`}>
            {isCustomer ? (
              <span className="text-xs font-medium">
                {conversation.customer_name?.charAt(0).toUpperCase() || 'C'}
              </span>
            ) : isBot ? (
              <Bot className="w-4 h-4 text-white" />
            ) : (
              <span className="text-xs font-medium text-white">A</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white border-l border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            {conversation.customer_name 
              ? <span className="text-sm font-medium text-gray-600">
                  {conversation.customer_name.charAt(0).toUpperCase()}
                </span>
              : <User className="w-5 h-5 text-gray-400" />
            }
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {conversation.customer_name || 'Cliente sin nombre'}
            </h3>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Phone className="w-3 h-3" />
              <span>{conversation.customer_phone}</span>
              <span className="text-blue-600 font-medium">
                {conversation.metadata?.etapa || 'Sin etapa'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm">No hay mensajes en esta conversación</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 resize-none"
              style={{ minHeight: '36px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  );
};

export default ChatWindowReal;
