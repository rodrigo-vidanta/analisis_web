// ============================================
// PANEL DE ADMINISTRACIÓN DE TICKETS
// ============================================
// Para administradores: ver, gestionar y responder tickets

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService, type SupportTicket, type TicketComment, type TicketHistory, type TicketStatus, type TicketPriority } from '../../services/ticketService';
import toast from 'react-hot-toast';

// Configuración de estados
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  abierto: { label: 'Abierto', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: '🔵' },
  en_progreso: { label: 'En Progreso', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: '🟡' },
  pendiente_info: { label: 'Pendiente Info', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: '🟣' },
  resuelto: { label: 'Resuelto', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: '🟢' },
  cerrado: { label: 'Cerrado', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-700', icon: '⚫' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: '🔴' }
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  baja: { label: 'Baja', color: 'text-slate-600 bg-slate-100' },
  normal: { label: 'Normal', color: 'text-blue-600 bg-blue-100' },
  alta: { label: 'Alta', color: 'text-orange-600 bg-orange-100' },
  urgente: { label: 'Urgente', color: 'text-red-600 bg-red-100' }
};

interface AdminTicketsPanelProps {
  className?: string;
  onNotificationCountChange?: (count: number) => void;
}

const AdminTicketsPanel: React.FC<AdminTicketsPanelProps> = ({ className, onNotificationCountChange }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<Record<TicketStatus, number>>({
    abierto: 0, en_progreso: 0, pendiente_info: 0, resuelto: 0, cerrado: 0, cancelado: 0
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const channelRef = React.useRef<any>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'reporte_falla' | 'requerimiento'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar conteo de notificaciones
  const loadNotificationCount = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await ticketService.getUnreadNotificationCount(user.id);
    setNotificationCount(count);
    if (onNotificationCountChange) {
      onNotificationCountChange(count);
    }
  }, [user?.id, onNotificationCountChange]);

  // Cargar tickets
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }
      if (typeFilter !== 'all') {
        filters.type = typeFilter;
      }

      const { tickets: data, error } = await ticketService.getAllTickets(filters);
      if (error) {
        toast.error('Error al cargar tickets');
      } else {
        setTickets(data);
      }

      // Cargar estadísticas
      const { stats: statsData } = await ticketService.getTicketStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Suscribirse a notificaciones en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    loadNotificationCount();

    channelRef.current = ticketService.subscribeToNotifications(user.id, () => {
      setNotificationCount(prev => {
        const newCount = prev + 1;
        if (onNotificationCountChange) {
          onNotificationCountChange(newCount);
        }
        return newCount;
      });
      // Recargar tickets cuando llega una nueva notificación
      loadTickets();
    });

    return () => {
      if (channelRef.current) {
        ticketService.unsubscribeFromNotifications(channelRef.current);
      }
    };
  }, [user?.id, loadNotificationCount, loadTickets, onNotificationCountChange]);

  // Cargar detalles del ticket seleccionado
  const loadTicketDetails = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    
    // Marcar notificaciones de este ticket como leídas
    if (user?.id) {
      await ticketService.markTicketNotificationsAsRead(user.id, ticket.id);
      loadNotificationCount();
    }
    
    const [commentsResult, historyResult] = await Promise.all([
      ticketService.getTicketComments(ticket.id),
      ticketService.getTicketHistory(ticket.id)
    ]);
    
    setComments(commentsResult.comments);
    setHistory(historyResult.history);
  };

  // Cambiar estado del ticket
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket || !user) return;
    
    setIsSubmitting(true);
    try {
      const { success, error } = await ticketService.updateTicketStatus(
        selectedTicket.id,
        newStatus,
        user.id,
        user.full_name || user.email
      );

      if (success) {
        toast.success(`Estado cambiado a ${STATUS_CONFIG[newStatus].label}`);
        // Actualizar ticket local
        setSelectedTicket({ ...selectedTicket, status: newStatus });
        loadTickets();
        // Recargar historial
        const { history: newHistory } = await ticketService.getTicketHistory(selectedTicket.id);
        setHistory(newHistory);
      } else {
        toast.error(error || 'Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Error al cambiar estado');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enviar comentario
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedTicket || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await ticketService.addComment(
        selectedTicket.id,
        user.id,
        user.full_name || user.email,
        user.role_name,
        newComment.trim(),
        isInternalComment
      );

      if (error) {
        toast.error('Error al enviar comentario');
      } else {
        toast.success(isInternalComment ? 'Nota interna agregada' : 'Respuesta enviada');
        setNewComment('');
        setIsInternalComment(false);
        // Recargar comentarios
        const { comments: newComments } = await ticketService.getTicketComments(selectedTicket.id);
        setComments(newComments);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Error al enviar comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar tickets por búsqueda
  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ticket.ticket_number.toLowerCase().includes(search) ||
      ticket.title.toLowerCase().includes(search) ||
      ticket.reporter_name?.toLowerCase().includes(search) ||
      ticket.reporter_email?.toLowerCase().includes(search)
    );
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

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header con estadísticas */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Gestión de Tickets</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tickets.length} tickets en total
            </p>
          </div>
          <button
            onClick={loadTickets}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Actualizar"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {(Object.entries(STATUS_CONFIG) as [TicketStatus, typeof STATUS_CONFIG[TicketStatus]][]).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`p-2 rounded-lg text-center transition-all ${
                statusFilter === status 
                  ? 'ring-2 ring-blue-500' 
                  : ''
              } ${config.bgColor}`}
            >
              <p className={`text-lg font-bold ${config.color}`}>{stats[status]}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{config.label}</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center space-x-3 mt-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número, título o usuario..."
              className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Todos los tipos</option>
            <option value="reporte_falla">Fallas</option>
            <option value="requerimiento">Requerimientos</option>
          </select>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de tickets */}
        <div className={`${selectedTicket ? 'hidden md:flex md:w-1/3' : 'w-full'} flex-col border-r border-slate-200 dark:border-slate-700 overflow-hidden`}>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No hay tickets</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => loadTicketDetails(ticket)}
                    className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                            {ticket.ticket_number}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            ticket.status === 'abierto' ? 'bg-blue-500' :
                            ticket.status === 'en_progreso' ? 'bg-amber-500' :
                            ticket.status === 'pendiente_info' ? 'bg-purple-500' :
                            ticket.status === 'resuelto' ? 'bg-green-500' :
                            'bg-slate-400'
                          }`} />
                        </div>
                        <h4 className="font-medium text-sm text-slate-800 dark:text-white truncate">
                          {ticket.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {ticket.reporter_name || ticket.reporter_email}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ticket.type === 'reporte_falla' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {ticket.type === 'reporte_falla' ? 'Falla' : 'Req'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalle del ticket */}
        {selectedTicket && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header del detalle */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-semibold">
                        {selectedTicket.ticket_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedTicket.status].bgColor} ${STATUS_CONFIG[selectedTicket.status].color}`}>
                        {STATUS_CONFIG[selectedTicket.status].label}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 dark:text-white mt-1">
                      {selectedTicket.title}
                    </h3>
                  </div>
                </div>
                
                {/* Cambiar estado */}
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <option key={status} value={status}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contenido del detalle */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info del reportador */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {selectedTicket.reporter_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {selectedTicket.reporter_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedTicket.reporter_email} • {selectedTicket.reporter_role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Descripción</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Screenshot */}
              {(selectedTicket.screenshot_url || selectedTicket.screenshot_base64) && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Captura</h4>
                  <img 
                    src={selectedTicket.screenshot_url || selectedTicket.screenshot_base64 || ''} 
                    alt="Captura" 
                    className="rounded-lg border border-slate-200 dark:border-slate-700 max-h-48 w-auto cursor-pointer hover:opacity-90"
                    onClick={() => window.open(selectedTicket.screenshot_url || selectedTicket.screenshot_base64 || '', '_blank')}
                  />
                </div>
              )}

              {/* Datos del formulario */}
              {selectedTicket.form_data && Object.keys(selectedTicket.form_data).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Datos del Formulario</h4>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    {Object.entries(selectedTicket.form_data).map(([key, value]) => (
                      <div key={key} className="flex text-sm">
                        <span className="text-slate-500 dark:text-slate-400 min-w-[120px]">{key}:</span>
                        <span className="text-slate-700 dark:text-slate-300">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detalles técnicos */}
              {selectedTicket.session_details && (
                <details className="text-sm">
                  <summary className="text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                    Detalles técnicos
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-32">
                    {JSON.stringify(selectedTicket.session_details, null, 2)}
                  </pre>
                </details>
              )}

              {/* Historial */}
              {history.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Historial</h4>
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex items-start space-x-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-slate-700 dark:text-slate-300">{entry.user_name}</span>
                          <span className="text-slate-500 dark:text-slate-400"> cambió </span>
                          <span className="text-slate-700 dark:text-slate-300">{entry.action}</span>
                          {entry.old_value && entry.new_value && (
                            <>
                              <span className="text-slate-500 dark:text-slate-400"> de </span>
                              <span className="text-red-500">{entry.old_value}</span>
                              <span className="text-slate-500 dark:text-slate-400"> a </span>
                              <span className="text-green-500">{entry.new_value}</span>
                            </>
                          )}
                          <span className="text-xs text-slate-400 ml-2">
                            {formatDate(entry.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comentarios */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Conversación ({comments.length})
                </h4>
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div 
                      key={comment.id}
                      className={`p-3 rounded-lg ${
                        comment.is_internal 
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' 
                          : comment.user_id === user?.id 
                            ? 'bg-blue-50 dark:bg-blue-900/20 ml-4' 
                            : 'bg-slate-50 dark:bg-slate-800 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {comment.user_name}
                          </span>
                          {comment.is_internal && (
                            <span className="px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                              Interno
                            </span>
                          )}
                        </div>
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
              </div>
            </div>

            {/* Input de comentario */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-2 mb-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-slate-600 dark:text-slate-400">Nota interna (no visible para el usuario)</span>
                </label>
              </div>
              <div className="flex items-end space-x-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={isInternalComment ? "Agregar nota interna..." : "Responder al usuario..."}
                  className={`flex-1 px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 resize-none h-16 dark:bg-slate-800 dark:text-white ${
                    isInternalComment 
                      ? 'border-yellow-300 focus:ring-yellow-500/20 focus:border-yellow-500' 
                      : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                />
                <motion.button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className={`px-4 py-2.5 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isInternalComment ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTicketsPanel;
