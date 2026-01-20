// ============================================
// MODAL DE MIS TICKETS
// ============================================
// Lista de tickets del usuario con estados y detalles

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService, type SupportTicket, type TicketComment, type TicketStatus } from '../../services/ticketService';
import toast from 'react-hot-toast';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketRead?: (ticketId: string) => void;
}

// Configuración de estados
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  abierto: { label: 'Abierto', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: '🔵' },
  en_progreso: { label: 'En Progreso', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: '🟡' },
  pendiente_info: { label: 'Pendiente Info', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: '🟣' },
  resuelto: { label: 'Resuelto', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: '🟢' },
  cerrado: { label: 'Cerrado', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-700', icon: '⚫' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: '🔴' }
};

const MyTicketsModal: React.FC<MyTicketsModalProps> = ({ isOpen, onClose, onTicketRead }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Cargar tickets
  useEffect(() => {
    if (isOpen && user) {
      loadTickets();
    }
  }, [isOpen, user]);

  const loadTickets = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { tickets: data, error } = await ticketService.getMyTickets(user.id);
      if (error) {
        toast.error('Error al cargar tickets');
      } else {
        setTickets(data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar comentarios de un ticket
  const loadComments = async (ticketId: string) => {
    try {
      const { comments: data, error } = await ticketService.getTicketComments(ticketId);
      if (!error) {
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Seleccionar ticket para ver detalles
  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadComments(ticket.id);
    
    // Notificar que el ticket fue leído (para resetear contador)
    if (onTicketRead) {
      onTicketRead(ticket.id);
    }
  };

  // Volver a la lista
  const handleBackToList = () => {
    setSelectedTicket(null);
    setComments([]);
    setNewComment('');
  };

  // Enviar comentario
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedTicket || !user) return;

    setIsSubmittingComment(true);
    try {
      const { error } = await ticketService.addComment(
        selectedTicket.id,
        user.id,
        user.full_name || user.email,
        user.role_name,
        newComment.trim(),
        false
      );

      if (error) {
        toast.error('Error al enviar comentario');
      } else {
        toast.success('Comentario enviado');
        setNewComment('');
        await loadComments(selectedTicket.id);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Error al enviar comentario');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'open') {
      return ['abierto', 'en_progreso', 'pendiente_info'].includes(ticket.status);
    }
    if (filter === 'closed') {
      return ['resuelto', 'cerrado', 'cancelado'].includes(ticket.status);
    }
    return true;
  });

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{ zIndex: 100000, margin: 'auto' }}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedTicket && (
                  <button
                    onClick={handleBackToList}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedTicket ? selectedTicket.ticket_number : 'Mis Tickets'}
                  </h2>
                  <p className="text-sm text-slate-300">
                    {selectedTicket ? selectedTicket.title : `${tickets.length} tickets registrados`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-hidden">
            {!selectedTicket ? (
              // Lista de tickets
              <div className="h-full flex flex-col">
                {/* Filtros */}
                <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2">
                  {(['all', 'open', 'closed'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filter === f
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {f === 'all' ? 'Todos' : f === 'open' ? 'Abiertos' : 'Cerrados'}
                    </button>
                  ))}
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">No tienes tickets registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTickets.map((ticket) => (
                        <motion.button
                          key={ticket.id}
                          onClick={() => handleSelectTicket(ticket)}
                          className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group"
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                                  {ticket.ticket_number}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[ticket.status].bgColor} ${STATUS_CONFIG[ticket.status].color}`}>
                                  {STATUS_CONFIG[ticket.status].label}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  ticket.type === 'reporte_falla' 
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600' 
                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                                }`}>
                                  {ticket.type === 'reporte_falla' ? 'Falla' : 'Requerimiento'}
                                </span>
                              </div>
                              <h4 className="font-medium text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {ticket.title}
                              </h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                                {ticket.description}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                Creado: {formatDate(ticket.created_at)}
                              </p>
                            </div>
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Detalle del ticket
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Estado y prioridad */}
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedTicket.status].bgColor} ${STATUS_CONFIG[selectedTicket.status].color}`}>
                      {STATUS_CONFIG[selectedTicket.status].icon} {STATUS_CONFIG[selectedTicket.status].label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedTicket.priority === 'urgente' ? 'bg-red-100 text-red-600' :
                      selectedTicket.priority === 'alta' ? 'bg-orange-100 text-orange-600' :
                      selectedTicket.priority === 'normal' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      Prioridad: {selectedTicket.priority}
                    </span>
                  </div>

                  {/* Descripción */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Descripción</h4>
                    <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>

                  {/* Screenshot */}
                  {(selectedTicket.screenshot_url || selectedTicket.screenshot_base64) && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Captura de Pantalla</h4>
                      <img 
                        src={selectedTicket.screenshot_url || selectedTicket.screenshot_base64 || ''} 
                        alt="Captura" 
                        className="rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 w-auto cursor-pointer hover:opacity-90"
                        onClick={() => window.open(selectedTicket.screenshot_url || selectedTicket.screenshot_base64 || '', '_blank')}
                      />
                    </div>
                  )}

                  {/* Información adicional */}
                  {selectedTicket.form_data && Object.keys(selectedTicket.form_data).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Información del Formulario</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                        {Object.entries(selectedTicket.form_data).map(([key, value]) => (
                          <div key={key} className="flex">
                            <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[150px]">{key}:</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comentarios */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Conversación ({comments.length})
                    </h4>
                    
                    {comments.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                        Sin comentarios aún
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div 
                            key={comment.id}
                            className={`p-3 rounded-xl ${
                              comment.user_id === user?.id 
                                ? 'bg-blue-50 dark:bg-blue-900/20 ml-8' 
                                : 'bg-slate-50 dark:bg-slate-800 mr-8'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {comment.user_name || 'Usuario'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {comment.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Input de comentario */}
                {['abierto', 'en_progreso', 'pendiente_info'].includes(selectedTicket.status) && (
                  <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Escribe un comentario..."
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white resize-none h-20"
                        />
                      </div>
                      <motion.button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isSubmittingComment ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default MyTicketsModal;
