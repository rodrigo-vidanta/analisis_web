/**
 * Modal de Mensajería para Administradores
 * Muestra mensajes de password_reset_request, user_unblock_request, etc.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Unlock, AlertCircle, CheckCircle, Archive, Filter } from 'lucide-react';
import { adminMessagesService, type AdminMessage } from '../../services/adminMessagesService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AdminMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientRole: string;
}

const AdminMessagesModal: React.FC<AdminMessagesModalProps> = ({
  isOpen,
  onClose,
  recipientRole
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'read' | 'resolved'>('all');
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, filter, recipientRole]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const filters: any = { recipient_role: recipientRole };
      if (filter !== 'all') {
        filters.status = filter;
      }
      const data = await adminMessagesService.getMessages(filters);
      setMessages(data);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (message: AdminMessage) => {
    if (!user?.id) return;
    
    if (message.status === 'pending') {
      const success = await adminMessagesService.markAsRead(message.id, user.id);
      if (success) {
        toast.success('Mensaje marcado como leído');
        loadMessages();
        if (selectedMessage?.id === message.id) {
          setSelectedMessage({ ...message, status: 'read', read_at: new Date().toISOString(), read_by: user.id });
        }
      }
    }
  };

  const handleResolve = async (messageId: string) => {
    if (!user?.id) return;
    
    setResolving(messageId);
    try {
      // Obtener el mensaje completo para verificar si es un user_unblock_request
      const message = messages.find(m => m.id === messageId);
      
      // Resolver el mensaje
      const success = await adminMessagesService.resolveMessage(messageId, user.id, resolveNote || undefined);
      
      if (success) {
        // Si es un mensaje de desbloqueo, también desbloquear al usuario
        if (message?.category === 'user_unblock_request' && message.sender_email) {
          console.log('🔓 Desbloqueando usuario:', message.sender_email);
          const unlockSuccess = await adminMessagesService.unlockUser(message.sender_email);
          if (unlockSuccess) {
            toast.success('Mensaje resuelto y usuario desbloqueado');
          } else {
            toast.success('Mensaje resuelto, pero hubo un error al desbloquear el usuario');
          }
        } else {
          toast.success('Mensaje resuelto');
        }
        
        setResolveNote('');
        setSelectedMessage(null);
        loadMessages();
      } else {
        toast.error('Error al resolver mensaje');
      }
    } catch (error) {
      console.error('Error resolviendo mensaje:', error);
      toast.error('Error al resolver mensaje');
    } finally {
      setResolving(null);
    }
  };

  const handleArchive = async (messageId: string) => {
    const success = await adminMessagesService.archiveMessage(messageId);
    if (success) {
      toast.success('Mensaje archivado');
      setSelectedMessage(null);
      loadMessages();
    } else {
      toast.error('Error al archivar mensaje');
    }
  };

  const getCategoryIcon = (category: AdminMessage['category']) => {
    switch (category) {
      case 'password_reset_request':
        return <Lock className="w-5 h-5" />;
      case 'user_unblock_request':
        return <Unlock className="w-5 h-5" />;
      case 'system_alert':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Mail className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: AdminMessage['category']) => {
    switch (category) {
      case 'password_reset_request':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'user_unblock_request':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'system_alert':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getPriorityColor = (priority: AdminMessage['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-400';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          style={{ 
            zIndex: 100000,
            margin: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Mensajes de Administración
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Filtros */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {(['all', 'pending', 'read', 'resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'read' ? 'Leídos' : 'Resueltos'}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-hidden flex">
            {/* Lista de mensajes */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando mensajes...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-6 text-center">
                  <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay mensajes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {messages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (message.status === 'pending') {
                          handleMarkAsRead(message);
                        }
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        selectedMessage?.id === message.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getCategoryColor(message.category)}`}>
                          {getCategoryIcon(message.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {message.title}
                            </h3>
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(message.priority)} flex-shrink-0 ml-2`} />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                            {message.sender_email || 'Sistema'}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              message.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : message.status === 'read'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {message.status === 'pending' ? 'Pendiente' : message.status === 'read' ? 'Leído' : 'Resuelto'}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(message.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detalle del mensaje */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedMessage ? (
                <div className="space-y-6">
                  {/* Header del mensaje */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(selectedMessage.category)}`}>
                          {getCategoryIcon(selectedMessage.category)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedMessage.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedMessage.sender_email || 'Sistema'} • {new Date(selectedMessage.created_at).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-lg ${getPriorityColor(selectedMessage.priority)} text-white text-xs font-medium`}>
                        {selectedMessage.priority === 'urgent' ? 'Urgente' : selectedMessage.priority === 'high' ? 'Alta' : selectedMessage.priority === 'normal' ? 'Normal' : 'Baja'}
                      </div>
                    </div>
                  </div>

                  {/* Contenido del mensaje */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {/* Metadata adicional */}
                  {selectedMessage.metadata && Object.keys(selectedMessage.metadata).length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Información Adicional</h4>
                      <div className="space-y-1">
                        {Object.entries(selectedMessage.metadata).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nota de resolución */}
                  {selectedMessage.resolved_note && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Nota de Resolución</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedMessage.resolved_note}</p>
                    </div>
                  )}

                  {/* Acciones */}
                  {selectedMessage.status !== 'resolved' && selectedMessage.status !== 'archived' && (
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                      {selectedMessage.status === 'pending' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nota de resolución (opcional)
                          </label>
                          <textarea
                            value={resolveNote}
                            onChange={(e) => setResolveNote(e.target.value)}
                            className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                            rows={3}
                            placeholder="Agregar una nota sobre cómo se resolvió..."
                          />
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleResolve(selectedMessage.id)}
                          disabled={resolving === selectedMessage.id}
                          className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {resolving === selectedMessage.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Resolviendo...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>Resolver</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleArchive(selectedMessage.id)}
                          className="px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <Archive className="w-4 h-4" />
                          <span>Archivar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Mail className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Selecciona un mensaje para ver los detalles</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default AdminMessagesModal;

