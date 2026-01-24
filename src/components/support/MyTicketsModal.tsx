// ============================================
// MIS TICKETS MODAL - DISEÑO MODERNO v2
// ============================================
// Lista vertical compacta + área de lectura amplia

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService, type SupportTicket, type TicketComment, type TicketStatus } from '../../services/ticketService';
import toast from 'react-hot-toast';

// ============================================
// CONFIGURACIÓN
// ============================================

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; dot: string }> = {
  abierto: { label: 'Abierto', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', dot: 'bg-blue-500' },
  en_progreso: { label: 'En Progreso', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500' },
  pendiente_info: { label: 'Esperando', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', dot: 'bg-purple-500' },
  resuelto: { label: 'Resuelto', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500' },
  cerrado: { label: 'Cerrado', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', dot: 'bg-gray-400' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', dot: 'bg-red-500' }
};

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketRead?: (ticketId: string) => void;
}

const MyTicketsModal: React.FC<MyTicketsModalProps> = ({ isOpen, onClose, onTicketRead }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<(SupportTicket & { 
    hasNewBadge: boolean; 
    hasMessageBadge: boolean;
    unreadCount: number;
  })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    if (isOpen && user) loadTickets();
  }, [isOpen, user]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ============================================
  // FUNCIONES
  // ============================================

  const loadTickets = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { tickets: data } = await ticketService.getTicketsWithBadges(user.id);
      setTickets(data);
    } catch {
      toast.error('Error al cargar tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async (ticketId: string) => {
    const { comments: data } = await ticketService.getTicketComments(ticketId);
    setComments(data);
  };

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadComments(ticket.id);
    
    // ✅ NUEVO: Marcar como visto
    if (user?.id) {
      await ticketService.markTicketAsViewed(ticket.id, user.id);
      // Recargar tickets para actualizar badges
      await loadTickets();
    }
    
    if (onTicketRead) onTicketRead(ticket.id);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedTicket || !user) return;
    setIsSubmitting(true);
    try {
      const { error } = await ticketService.addComment(
        selectedTicket.id, user.id, user.full_name || user.email, user.role_name, newComment.trim(), false
      );
      if (error) {
        toast.error('Error al enviar');
      } else {
        toast.success('Mensaje enviado');
        setNewComment('');
        await loadComments(selectedTicket.id);
      }
    } catch {
      toast.error('Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 5) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  const formatFull = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ============================================
  // FILTRADO
  // ============================================

  const filteredTickets = tickets.filter(t => {
    // Excluir cerrados/resueltos/cancelados por defecto
    if (filter === 'active' && ['resuelto', 'cerrado', 'cancelado'].includes(t.status)) return false;
    // Búsqueda
    if (search) {
      const s = search.toLowerCase();
      return t.ticket_number.toLowerCase().includes(s) || t.title.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    active: tickets.filter(t => !['resuelto', 'cerrado', 'cancelado'].includes(t.status)).length,
    resolved: tickets.filter(t => t.status === 'resuelto').length,
    total: tickets.length
  };

  if (!isOpen) return null;

  // ============================================
  // RENDER
  // ============================================

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* HEADER */}
          <div className="flex-shrink-0 px-6 py-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg shadow-blue-500/25">
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mis Tickets</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.active} activo{stats.active !== 1 ? 's' : ''} · {stats.resolved} resuelto{stats.resolved !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* CONTENIDO */}
          <div className="flex-1 flex overflow-hidden">
            {/* Panel Izquierdo - Lista */}
            <div className="w-[360px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-800/20">
              {/* Filtros modernos */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
                {/* Barra de búsqueda */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar tickets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                {/* Filtros rápidos */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('active')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      filter === 'active'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    Activos ({stats.active})
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      filter === 'all'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    Todos ({stats.total})
                  </button>
                </div>
              </div>

              {/* Lista de tickets */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108" />
                    </svg>
                    <p className="text-sm">Sin tickets</p>
                    <p className="text-xs mt-1">Usa el botón de soporte para crear uno</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={`w-full p-4 text-left transition-all hover:bg-white dark:hover:bg-gray-800 ${
                          selectedTicket?.id === ticket.id ? 'bg-white dark:bg-gray-800 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${STATUS_CONFIG[ticket.status].dot} ${ticket.status === 'abierto' ? 'animate-pulse' : ''}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{ticket.ticket_number}</span>
                              
                              {/* ✅ NUEVO: Badge "Nuevo" */}
                              {ticket.hasNewBadge && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500 text-white animate-pulse">
                                  NUEVO
                                </span>
                              )}
                              
                              {/* ✅ NUEVO: Badge "Mensaje" */}
                              {!ticket.hasNewBadge && ticket.hasMessageBadge && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500 text-white flex items-center gap-1">
                                  💬 {ticket.unreadCount}
                                </span>
                              )}
                              
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                ticket.type === 'reporte_falla' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                              }`}>
                                {ticket.type === 'reporte_falla' ? 'BUG' : 'REQ'}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{ticket.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].color}`}>
                                {STATUS_CONFIG[ticket.status].label}
                              </span>
                              <span className="text-[10px] text-gray-400">{formatDate(ticket.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel Derecho - Detalle */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
              {selectedTicket ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Header del ticket */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedTicket.type === 'reporte_falla' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          {selectedTicket.type === 'reporte_falla'
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                          }
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-blue-600">{selectedTicket.ticket_number}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${STATUS_CONFIG[selectedTicket.status].bg} ${STATUS_CONFIG[selectedTicket.status].color}`}>
                            {STATUS_CONFIG[selectedTicket.status].label}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTicket.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">Creado: {formatFull(selectedTicket.created_at)}</p>
                      </div>
                    </div>

                    {/* Info cards */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Prioridad</p>
                        <p className={`text-sm font-semibold ${
                          selectedTicket.priority === 'urgente' ? 'text-red-600' :
                          selectedTicket.priority === 'alta' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {selectedTicket.priority?.charAt(0).toUpperCase() + selectedTicket.priority?.slice(1) || 'Normal'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tipo</p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{selectedTicket.type === 'reporte_falla' ? 'Reporte de Falla' : 'Requerimiento'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Módulo</p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{selectedTicket.current_module || 'General'}</p>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</span>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 mb-6">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    {/* Screenshot */}
                    {selectedTicket.screenshot_url && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Captura</span>
                        </div>
                        <img src={selectedTicket.screenshot_url} alt="Screenshot" className="rounded-xl border border-gray-200 dark:border-gray-700 max-h-48 cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => setImagePreview(selectedTicket.screenshot_url || null)} />
                      </div>
                    )}

                    {/* Conversación */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversación ({comments.length})</span>
                    </div>
                    <div className="space-y-3">
                      {comments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Sin mensajes aún</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className={`p-3 rounded-xl ${
                            c.user_id === user?.id 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 ml-6' 
                              : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 mr-6'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {c.user_name}
                                {c.user_id !== user?.id && <span className="text-[9px] text-gray-400 ml-1">(Soporte)</span>}
                              </span>
                              <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{c.content}</p>
                          </div>
                        ))
                      )}
                      <div ref={commentsEndRef} />
                    </div>
                  </div>

                  {/* Input de comentario */}
                  {!['cerrado', 'cancelado', 'resuelto'].includes(selectedTicket.status) && (
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="flex gap-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Escribe un mensaje..."
                          rows={2}
                          className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl resize-none dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment();
                            }
                          }}
                        />
                        <motion.button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || isSubmitting}
                          className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-50 flex items-center justify-center shadow-lg shadow-blue-500/25"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                        </motion.button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">Enter para enviar · Shift+Enter nueva línea</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108" />
                    </svg>
                    <p className="text-sm font-medium">Selecciona un ticket</p>
                    <p className="text-xs mt-1">para ver los detalles</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Modal de visualización de imagen
  const imageModal = imagePreview && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]"
      onClick={() => setImagePreview(null)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setImagePreview(null)}
          className="absolute -top-12 right-0 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={imagePreview}
          alt="Vista previa"
          className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
        />
        <p className="text-center text-white/60 text-sm mt-3">Click fuera de la imagen para cerrar</p>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {imagePreview && createPortal(imageModal, document.body)}
    </>
  );
};

export default MyTicketsModal;
