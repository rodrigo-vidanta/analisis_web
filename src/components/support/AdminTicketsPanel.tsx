// ============================================
// PANEL DE ADMINISTRACIÓN DE TICKETS - REDISEÑO PROFESIONAL
// ============================================
// Dashboard completo con estadísticas, filtros y gestión avanzada
// Diseño tipo CRM profesional

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService, type SupportTicket, type TicketComment, type TicketHistory, type TicketStatus, type TicketPriority } from '../../services/ticketService';
import toast from 'react-hot-toast';

// Configuración de estados
const STATUS_CONFIG: Record<TicketStatus, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  dotColor: string;
  gradient: string;
}> = {
  abierto: { 
    label: 'Nuevo', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
    borderColor: 'border-blue-200 dark:border-blue-800',
    dotColor: 'bg-blue-500',
    gradient: 'from-blue-500 to-cyan-500'
  },
  en_progreso: { 
    label: 'En Progreso', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-50 dark:bg-amber-900/20', 
    borderColor: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-500'
  },
  pendiente_info: { 
    label: 'Pendiente', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-50 dark:bg-purple-900/20', 
    borderColor: 'border-purple-200 dark:border-purple-800',
    dotColor: 'bg-purple-500',
    gradient: 'from-purple-500 to-pink-500'
  },
  resuelto: { 
    label: 'Resuelto', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', 
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-teal-500'
  },
  cerrado: { 
    label: 'Cerrado', 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-800', 
    borderColor: 'border-gray-200 dark:border-gray-700',
    dotColor: 'bg-gray-400',
    gradient: 'from-gray-500 to-gray-600'
  },
  cancelado: { 
    label: 'Cancelado', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-50 dark:bg-red-900/20', 
    borderColor: 'border-red-200 dark:border-red-800',
    dotColor: 'bg-red-500',
    gradient: 'from-red-500 to-rose-500'
  }
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  baja: { label: 'Baja', color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
  normal: { label: 'Normal', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  alta: { label: 'Alta', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  urgente: { label: 'Urgente', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' }
};

interface AdminTicketsPanelProps {
  className?: string;
  onNotificationCountChange?: (count: number) => void;
}

const AdminTicketsPanel: React.FC<AdminTicketsPanelProps> = ({ className, onNotificationCountChange }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<(SupportTicket & { 
    hasNewBadge: boolean; 
    hasMessageBadge: boolean;
    unreadCount: number;
  })[]>([]);
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
  const channelRef = React.useRef<any>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'reporte_falla' | 'requerimiento'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'technical'>('details');

  // Cargar conteo de notificaciones
  const loadNotificationCount = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await ticketService.getUnreadNotificationCount(user.id);
    if (onNotificationCountChange) onNotificationCountChange(count);
  }, [user?.id, onNotificationCountChange]);

  // Cargar tickets
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!user?.id) return;
      
      const { tickets: data, error } = await ticketService.getTicketsWithBadges(user.id);
      if (error) {
        toast.error('Error al cargar tickets');
      } else {
        // Aplicar filtros manualmente
        const filtered = data.filter(t => {
          if (statusFilter !== 'all' && t.status !== statusFilter) return false;
          if (typeFilter !== 'all' && t.type !== typeFilter) return false;
          return true;
        });
        setTickets(filtered);
      }

      const { stats: statsData } = await ticketService.getTicketStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, user?.id]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Suscribirse a notificaciones
  useEffect(() => {
    if (!user?.id) return;
    loadNotificationCount();
    channelRef.current = ticketService.subscribeToNotifications(user.id, () => {
      loadNotificationCount();
      loadTickets();
    });
    return () => {
      if (channelRef.current) ticketService.unsubscribeFromNotifications(channelRef.current);
    };
  }, [user?.id, loadNotificationCount, loadTickets]);

  // Cargar detalles del ticket
  const loadTicketDetails = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setActiveTab('details');
    
    // ✅ NUEVO: Marcar como visto
    if (user?.id) {
      await ticketService.markTicketAsViewed(ticket.id, user.id);
      // Recargar para actualizar badges
      loadTickets();
      loadNotificationCount();
    }
    
    const [commentsResult, historyResult] = await Promise.all([
      ticketService.getTicketComments(ticket.id),
      ticketService.getTicketHistory(ticket.id)
    ]);
    setComments(commentsResult.comments);
    setHistory(historyResult.history);
  };

  // Cambiar estado
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket || !user) return;
    setIsSubmitting(true);
    try {
      const { success, error } = await ticketService.updateTicketStatus(
        selectedTicket.id, newStatus, user.id, user.full_name || user.email
      );
      if (success) {
        toast.success(`Estado actualizado a ${STATUS_CONFIG[newStatus].label}`);
        setSelectedTicket({ ...selectedTicket, status: newStatus });
        loadTickets();
        const { history: newHistory } = await ticketService.getTicketHistory(selectedTicket.id);
        setHistory(newHistory);
      } else {
        toast.error(error || 'Error al cambiar estado');
      }
    } catch (error) {
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
        selectedTicket.id, user.id, user.full_name || user.email, user.role_name, newComment.trim(), isInternalComment
      );
      if (error) {
        toast.error('Error al enviar');
      } else {
        toast.success(isInternalComment ? 'Nota interna agregada' : 'Respuesta enviada');
        setNewComment('');
        setIsInternalComment(false);
        const { comments: newComments } = await ticketService.getTicketComments(selectedTicket.id);
        setComments(newComments);
        
        // ✅ NUEVO: Auto-cambio a "en_progreso" si está "abierto" y admin comenta
        if (!isInternalComment && selectedTicket.status === 'abierto') {
          await ticketService.updateTicketStatus(
            selectedTicket.id, 
            'en_progreso', 
            user.id, 
            user.full_name || user.email, 
            'Auto-cambio al enviar respuesta'
          );
          setSelectedTicket({ ...selectedTicket, status: 'en_progreso' });
          toast.success('Ticket movido a En Progreso', { icon: '🔄' });
        }
        
        loadTickets();
      }
    } catch (error) {
      toast.error('Error al enviar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar tickets
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
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return mins < 5 ? 'Ahora' : `${mins}m`;
      }
      return `${hours}h`;
    }
    if (days === 1) return 'Ayer';
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  // Calcular totales
  const activeCount = stats.abierto + stats.en_progreso + stats.pendiente_info;
  const totalCount = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 ${className}`}>
      {/* Header Dashboard */}
      <div className="p-6 bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              Centro de Soporte
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{totalCount} tickets totales · {activeCount} activos</p>
          </div>
          <motion.button
            onClick={loadTickets}
            className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(Object.entries(STATUS_CONFIG) as [TicketStatus, typeof STATUS_CONFIG[TicketStatus]][]).map(([status, config]) => (
            <motion.button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`relative p-4 rounded-2xl text-left transition-all overflow-hidden group ${
                statusFilter === status 
                  ? `${config.bgColor} ${config.color} ${config.borderColor} border-2` 
                  : `bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400`
              }`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {statusFilter === status && (
                <div className="absolute inset-0 bg-white/10" />
              )}
              <div className="relative">
                <p className={`text-3xl font-bold ${statusFilter === status ? 'text-white' : config.color}`}>
                  {stats[status]}
                </p>
                <p className={`text-xs font-medium mt-1 ${
                  statusFilter === status ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {config.label}
                </p>
              </div>
              {stats[status] > 0 && status === 'abierto' && statusFilter !== status && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 mt-5">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número, título o usuario..."
              className="w-full pl-12 pr-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-800 dark:text-white cursor-pointer"
          >
            <option value="all">📋 Todos</option>
            <option value="reporte_falla">Fallas</option>
            <option value="requerimiento">Requerimientos</option>
          </select>
          {(statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearchTerm(''); }}
              className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-xl transition-colors"
            >
              Limpiar filtros
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de tickets */}
        <div className={`${selectedTicket ? 'hidden lg:flex lg:w-[400px] lg:flex-shrink-0' : 'w-full'} flex-col border-r border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/30`}>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-indigo-100 dark:border-indigo-900 rounded-full" />
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <p className="mt-4 text-gray-500">Cargando...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No hay tickets</p>
                <p className="text-sm text-gray-400 mt-1">Ajusta los filtros o espera nuevos tickets</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredTickets.map((ticket, index) => (
                  <motion.button
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => loadTicketDetails(ticket)}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all ${
                      selectedTicket?.id === ticket.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[ticket.status].dotColor} flex-shrink-0 mt-1.5 ${
                        ticket.status === 'abierto' ? 'animate-pulse' : ''
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {ticket.ticket_number}
                          </span>
                          
                          {/* ✅ NUEVO: Badge "Nuevo" */}
                          {ticket.hasNewBadge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white animate-pulse">
                              NUEVO
                            </span>
                          )}
                          
                          {/* ✅ NUEVO: Badge "Mensaje" */}
                          {!ticket.hasNewBadge && ticket.hasMessageBadge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1">
                              💬 {ticket.unreadCount}
                            </span>
                          )}
                          
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ticket.type === 'reporte_falla' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600' 
                              : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                          }`}>
                            {ticket.type === 'reporte_falla' ? 'BUG' : 'REQ'}
                          </span>
                          {ticket.priority === 'urgente' && (
                            <span className="text-red-500 text-xs">⚡</span>
                          )}
                        </div>
                        <h4 className="font-medium text-sm text-gray-800 dark:text-white truncate">
                          {ticket.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {ticket.reporter_name || ticket.reporter_email?.split('@')[0]}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs text-gray-400">
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalle del ticket */}
        <AnimatePresence mode="wait">
          {selectedTicket && (
            <motion.div 
              key={selectedTicket.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800/50"
            >
              {/* Header del detalle */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedTicket.ticket_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_CONFIG[selectedTicket.status].bgColor} ${STATUS_CONFIG[selectedTicket.status].color} ${STATUS_CONFIG[selectedTicket.status].borderColor} border`}>
                          {STATUS_CONFIG[selectedTicket.status].label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${PRIORITY_CONFIG[selectedTicket.priority].color}`}>
                          {PRIORITY_CONFIG[selectedTicket.priority].label}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatFullDate(selectedTicket.created_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {selectedTicket.title}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Status changer */}
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    disabled={isSubmitting}
                    className={`px-4 py-2 text-sm font-medium rounded-xl border-2 cursor-pointer transition-all ${STATUS_CONFIG[selectedTicket.status].bgColor} ${STATUS_CONFIG[selectedTicket.status].borderColor} ${STATUS_CONFIG[selectedTicket.status].color} focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  >
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <option key={status} value={status}>{config.label}</option>
                    ))}
                  </select>
                </div>

                {/* Reporter info */}
                <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm">
                    {selectedTicket.reporter_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 dark:text-white truncate">
                      {selectedTicket.reporter_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {selectedTicket.reporter_email} · {selectedTicket.reporter_role}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatFullDate(selectedTicket.created_at)}
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mt-4 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                  {[
                    { id: 'details', label: 'Detalles' },
                    { id: 'history', label: 'Historial' },
                    { id: 'technical', label: 'Técnico' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab.id 
                          ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                <AnimatePresence mode="wait">
                  {activeTab === 'details' && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5"
                    >
                      {/* Descripción */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Descripción</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {selectedTicket.description}
                        </p>
                      </div>

                      {/* Información del Log (si viene de log) */}
                      {selectedTicket.log_id && selectedTicket.form_data?.source === 'log_monitor' && (
                        <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-2xl border-2 border-orange-200 dark:border-orange-800">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Creado desde Log del Sistema
                            </h4>
                            <span className="text-[10px] px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full font-bold">
                              LOG ID: {selectedTicket.log_id.substring(0, 8)}
                            </span>
                          </div>
                          <div className="grid gap-2">
                            {selectedTicket.form_data?.ambiente && (
                              <div className="flex items-start gap-3 text-sm">
                                <span className="text-orange-600 dark:text-orange-400 font-medium min-w-[120px]">Ambiente:</span>
                                <span className="text-orange-800 dark:text-orange-200 font-mono text-xs">{selectedTicket.form_data.ambiente}</span>
                              </div>
                            )}
                            {selectedTicket.form_data?.log_timestamp && (
                              <div className="flex items-start gap-3 text-sm">
                                <span className="text-orange-600 dark:text-orange-400 font-medium min-w-[120px]">Timestamp:</span>
                                <span className="text-orange-800 dark:text-orange-200 font-mono text-xs">
                                  {new Date(selectedTicket.form_data.log_timestamp).toLocaleString('es-MX')}
                                </span>
                              </div>
                            )}
                            {selectedTicket.form_data?.workflow_id && (
                              <div className="flex items-start gap-3 text-sm">
                                <span className="text-orange-600 dark:text-orange-400 font-medium min-w-[120px]">Workflow ID:</span>
                                <span className="text-orange-800 dark:text-orange-200 font-mono text-xs">{selectedTicket.form_data.workflow_id}</span>
                              </div>
                            )}
                            {selectedTicket.form_data?.execution_id && (
                              <div className="flex items-start gap-3 text-sm">
                                <span className="text-orange-600 dark:text-orange-400 font-medium min-w-[120px]">Execution ID:</span>
                                <span className="text-orange-800 dark:text-orange-200 font-mono text-xs">{selectedTicket.form_data.execution_id}</span>
                              </div>
                            )}
                            {selectedTicket.form_data?.mensaje_completo && (
                              <div className="mt-2">
                                <span className="text-orange-600 dark:text-orange-400 font-medium text-sm block mb-2">Mensaje Completo:</span>
                                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-orange-200 dark:border-orange-800 max-h-32 overflow-y-auto scrollbar-thin">
                                  <pre className="text-xs text-orange-900 dark:text-orange-100 whitespace-pre-wrap font-mono">
                                    {typeof selectedTicket.form_data.mensaje_completo === 'string' 
                                      ? selectedTicket.form_data.mensaje_completo 
                                      : JSON.stringify(selectedTicket.form_data.mensaje_completo, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Screenshot */}
                      {(selectedTicket.screenshot_url || selectedTicket.screenshot_base64) && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Captura</h4>
                          <img 
                            src={selectedTicket.screenshot_url || selectedTicket.screenshot_base64 || ''} 
                            alt="Captura" 
                            className="rounded-xl border-2 border-gray-200 dark:border-gray-700 max-h-48 w-auto cursor-zoom-in hover:opacity-90"
                            onClick={() => window.open(selectedTicket.screenshot_url || selectedTicket.screenshot_base64 || '', '_blank')}
                          />
                        </div>
                      )}

                      {/* Form Data */}
                      {selectedTicket.form_data && Object.keys(selectedTicket.form_data).length > 0 && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Datos del Formulario</h4>
                          <div className="grid gap-2">
                            {Object.entries(selectedTicket.form_data).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-3 text-sm">
                                <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">{key}:</span>
                                <span className="text-gray-700 dark:text-gray-300">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Conversación */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                          Conversación ({comments.length})
                        </h4>
                        <div className="space-y-3">
                          {comments.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-4 text-center">Sin comentarios</p>
                          ) : (
                            comments.map((comment) => (
                              <div 
                                key={comment.id}
                                className={`p-4 rounded-2xl ${
                                  comment.is_internal 
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800' 
                                    : comment.user_id === selectedTicket.reporter_id
                                      ? 'bg-gray-100 dark:bg-gray-700/50'
                                      : 'bg-indigo-50 dark:bg-indigo-900/20'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{comment.user_name}</span>
                                    {comment.is_internal && (
                                      <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-[10px] font-bold rounded-full">INTERNO</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{comment.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'history' && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {history.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Sin historial</p>
                      ) : (
                        <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
                          {history.map((entry) => (
                            <div key={entry.id} className="relative">
                              <div className="absolute -left-[29px] w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800" />
                              <div className="pl-4">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium">{entry.user_name}</span> cambió <span className="font-medium">{entry.action}</span>
                                  {entry.old_value && entry.new_value && (
                                    <> de <span className="text-red-500 line-through">{entry.old_value}</span> a <span className="text-emerald-500">{entry.new_value}</span></>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">{formatFullDate(entry.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'technical' && (
                    <motion.div
                      key="technical"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {selectedTicket.session_details ? (
                        <pre className="p-4 bg-gray-900 text-emerald-400 rounded-2xl text-xs overflow-x-auto font-mono">
                          {JSON.stringify(selectedTicket.session_details, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-8">Sin datos técnicos</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                    />
                    <span className={`transition-colors ${isInternalComment ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                      🔒 Nota interna (solo admins)
                    </span>
                  </label>
                </div>
                <div className="flex items-end gap-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isInternalComment ? "Agregar nota interna..." : "Responder al usuario..."}
                    className={`flex-1 px-4 py-3 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 resize-none transition-all dark:bg-gray-800 dark:text-white ${
                      isInternalComment 
                        ? 'border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500/20 focus:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' 
                        : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    rows={2}
                  />
                  <motion.button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg ${
                      isInternalComment 
                        ? 'bg-amber-500' 
                        : 'bg-blue-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state cuando no hay ticket seleccionado en desktop */}
        {!selectedTicket && (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900/30">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Selecciona un ticket</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Elige un ticket de la lista para ver sus detalles</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTicketsPanel;
