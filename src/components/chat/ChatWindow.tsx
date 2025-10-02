import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Phone, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  Download,
  Image as ImageIcon,
  FileText,
  Video,
  Mic,
  MapPin,
  UserCheck,
  MessageSquare,
  Bot
} from 'lucide-react';
import { uchatService, type UChatConversation, type UChatMessage } from '../../services/uchatService';

interface ChatWindowProps {
  conversation: UChatConversation;
  onClose: () => void;
  onConversationUpdate?: (conversation: UChatConversation) => void;
  className?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  conversation, 
  onClose, 
  onConversationUpdate,
  className = '' 
}) => {
  const [messages, setMessages] = useState<UChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [prospect, setProspect] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    loadProspectInfo();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await uchatService.getMessages(conversation.id);
      setMessages(data);
      
      // Marcar mensajes como leídos
      await uchatService.markConversationMessagesAsRead(conversation.id);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProspectInfo = async () => {
    try {
      const prospectData = await uchatService.findProspectByPhone(conversation.customer_phone);
      setProspect(prospectData);
    } catch (error) {
      console.error('Error cargando información del prospecto:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      // Crear mensaje local inmediatamente para UX
      const tempMessage: UChatMessage = {
        id: `temp-${Date.now()}`,
        message_id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        sender_type: 'agent',
        sender_name: 'Agente',
        message_type: 'text',
        content: newMessage,
        is_read: true,
        metadata: {},
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      // Enviar mensaje a través de UChat API
      const response = await uchatService.sendMessage(
        conversation.bot_id, 
        conversation.conversation_id, 
        newMessage
      );

      if (response.success) {
        // Crear mensaje en la base de datos
        await uchatService.createMessage({
          message_id: response.data?.id || `msg-${Date.now()}`,
          conversation_id: conversation.id,
          sender_type: 'agent',
          sender_name: 'Agente',
          message_type: 'text',
          content: newMessage,
          is_read: true,
          metadata: {}
        });

        // Recargar mensajes para obtener el mensaje real
        await loadMessages();
      } else {
        // Remover mensaje temporal si falló
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        console.error('Error enviando mensaje:', response.error);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
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

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Aquí iría la lógica para subir archivos
      console.log('Archivo seleccionado:', file);
    }
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'customer': return <User className="w-5 h-5" />;
      case 'bot': return <Bot className="w-5 h-5" />;
      case 'agent': return <UserCheck className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
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

  const renderMessage = (message: UChatMessage, index: number) => {
    const isCustomer = message.sender_type === 'customer';
    const isBot = message.sender_type === 'bot';
    const showDate = index === 0 || 
      formatDate(message.created_at) !== formatDate(messages[index - 1]?.created_at);

    return (
      <div key={message.id}>
        {/* Separador de fecha */}
        {showDate && (
          <div className="flex justify-center my-4">
            <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
              {formatDate(message.created_at)}
            </span>
          </div>
        )}

        {/* Mensaje */}
        <div className={`flex items-start space-x-3 mb-4 ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            isCustomer 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : isBot
                ? 'bg-gradient-to-br from-green-500 to-teal-600'
                : 'bg-gradient-to-br from-gray-500 to-gray-700'
          }`}>
            {getSenderIcon(message.sender_type)}
          </div>

          {/* Contenido del mensaje */}
          <div className={`max-w-xs lg:max-w-md ${isCustomer ? 'text-left' : 'text-right'}`}>
            {/* Nombre del remitente */}
            <div className={`text-xs text-gray-500 mb-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
              {message.sender_name || (isCustomer ? 'Cliente' : isBot ? 'Bot' : 'Agente')}
            </div>

            {/* Burbuja del mensaje */}
            <div className={`relative px-4 py-2 rounded-2xl ${
              isCustomer 
                ? 'bg-gray-100 text-gray-900' 
                : isBot
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white'
            }`}>
              {/* Indicador de tipo de mensaje */}
              {message.message_type !== 'text' && (
                <div className="flex items-center space-x-1 mb-2 opacity-75">
                  {getMessageIcon(message.message_type)}
                  <span className="text-xs capitalize">{message.message_type}</span>
                </div>
              )}

              {/* Contenido */}
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}

              {/* Media */}
              {message.media_url && (
                <div className="mt-2">
                  {message.message_type === 'image' ? (
                    <img 
                      src={message.media_url} 
                      alt="Imagen compartida"
                      className="max-w-full h-auto rounded-lg"
                    />
                  ) : (
                    <a 
                      href={message.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 p-2 bg-black bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-xs">Descargar archivo</span>
                    </a>
                  )}
                </div>
              )}

              {/* Hora */}
              <div className={`text-xs mt-1 ${
                isCustomer ? 'text-gray-500' : 'text-white text-opacity-75'
              }`}>
                {formatTime(message.created_at)}
                {!isCustomer && (
                  <span className="ml-1">
                    {message.is_read ? (
                      <CheckCircle2 className="w-3 h-3 inline" />
                    ) : (
                      <Clock className="w-3 h-3 inline" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          {/* Avatar del cliente */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {conversation.customer_name 
              ? conversation.customer_name.charAt(0).toUpperCase()
              : <User className="w-6 h-6" />
            }
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.customer_name || 'Cliente sin nombre'}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{conversation.customer_phone}</span>
              {conversation.handoff_enabled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Transferida
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Información del prospecto */}
      {prospect && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Información del Prospecto</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                {prospect.nombre_completo && (
                  <div><strong>Nombre:</strong> {prospect.nombre_completo}</div>
                )}
                {prospect.edad && (
                  <div><strong>Edad:</strong> {prospect.edad}</div>
                )}
                {prospect.ciudad_residencia && (
                  <div><strong>Ciudad:</strong> {prospect.ciudad_residencia}</div>
                )}
                {prospect.etapa && (
                  <div><strong>Etapa:</strong> {prospect.etapa}</div>
                )}
                {prospect.destino_preferencia && (
                  <div><strong>Destino:</strong> {prospect.destino_preferencia.join(', ')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay mensajes en esta conversación</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-end space-x-2">
          <button
            onClick={handleFileUpload}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />
      </div>
    </div>
  );
};

export default ChatWindow;
