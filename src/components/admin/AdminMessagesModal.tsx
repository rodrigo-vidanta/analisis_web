// ============================================
// CENTRO DE ADMINISTRACIÓN - MODAL UNIFICADO v2
// ============================================
// Modal más ancho, filtros modernos, etiquetas dinámicas

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminMessagesService, type AdminMessage } from '../../services/adminMessagesService';
import { ticketService, type SupportTicket, type TicketComment, type TicketStatus, type UserForAssignment, ASSIGNABLE_ROLES, type AssignableRole } from '../../services/ticketService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ============================================
// CONFIGURACIONES
// ============================================

type ActiveSection = 'messages' | 'tickets';

const TICKET_STATUS: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  abierto: { label: 'Nuevo', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  en_progreso: { label: 'En Progreso', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  pendiente_info: { label: 'Pendiente', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  resuelto: { label: 'Resuelto', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  cerrado: { label: 'Cerrado', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
};

interface AdminMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientRole: string;
}

const AdminMessagesModal: React.FC<AdminMessagesModalProps> = ({ isOpen, onClose, recipientRole }) => {
  const { user } = useAuth();
  
  // Navegación
  const [activeSection, setActiveSection] = useState<ActiveSection>('tickets');
  
  // Mensajes
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageFilter, setMessageFilter] = useState<'pending' | 'all'>('pending');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());
  
  // Tickets (con badges persistentes de BD)
  const [tickets, setTickets] = useState<(SupportTicket & { hasNewBadge: boolean; hasMessageBadge: boolean; unreadCount: number })[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'active' | 'mine' | 'all'>('active');
  const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Estados para asignación
  const [showAssignmentPanel, setShowAssignmentPanel] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'role' | 'user'>('role');
  const [selectedRole, setSelectedRole] = useState<AssignableRole | ''>('');
  const [usersForRole, setUsersForRole] = useState<UserForAssignment[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState(false);
  const [assignedUserNames, setAssignedUserNames] = useState<Map<string, string>>(new Map());
  
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ============================================
  // CARGAR DATOS
  // ============================================

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const data = await adminMessagesService.getMessages({ recipient_role: recipientRole });
      setMessages(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [recipientRole]);

  const loadTickets = useCallback(async () => {
    if (!user?.id) return;
    setLoadingTickets(true);
    try {
      const { tickets: data } = await ticketService.getTicketsWithBadges(user.id);
      setTickets(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingTickets(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      loadTickets();
      setReadMessageIds(new Set());
    }
  }, [isOpen, loadMessages, loadTickets]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketComments]);

  // ============================================
  // FILTRADO
  // ============================================

  const filteredMessages = messages.filter(msg => {
    // Filtro por estado
    if (messageFilter === 'pending' && msg.status !== 'pending') return false;
    // Búsqueda
    if (messageSearch) {
      const search = messageSearch.toLowerCase();
      return msg.title.toLowerCase().includes(search) || 
             msg.sender_email?.toLowerCase().includes(search) ||
             msg.message?.toLowerCase().includes(search);
    }
    return true;
  });

  const filteredTickets = tickets.filter(ticket => {
    // Filtro: activos excluye resueltos, cerrados, cancelados
    if (ticketFilter === 'active' && ['resuelto', 'cerrado', 'cancelado'].includes(ticket.status)) return false;
    // Filtro: mis tickets (asignados a mí o a mi rol)
    if (ticketFilter === 'mine') {
      const isAssignedToMe = ticket.assigned_to === user?.id;
      const isAssignedToMyRole = ticket.assigned_to_role === user?.role_name;
      if (!isAssignedToMe && !isAssignedToMyRole) return false;
    }
    // Búsqueda
    if (ticketSearch) {
      const search = ticketSearch.toLowerCase();
      return ticket.ticket_number.toLowerCase().includes(search) ||
             ticket.title.toLowerCase().includes(search) ||
             ticket.reporter_name?.toLowerCase().includes(search) ||
             ticket.reporter_email?.toLowerCase().includes(search);
    }
    return true;
  });
  
  // Contador de mis tickets
  const myTicketsCount = tickets.filter(t => 
    (t.assigned_to === user?.id || t.assigned_to_role === user?.role_name) &&
    !['resuelto', 'cerrado', 'cancelado'].includes(t.status)
  ).length;

  // Contadores
  const pendingMessages = messages.filter(m => m.status === 'pending').length;
  const activeTickets = tickets.filter(t => !['resuelto', 'cerrado', 'cancelado'].includes(t.status)).length;
  const newTickets = tickets.filter(t => t.status === 'abierto').length;

  // ============================================
  // HANDLERS MENSAJES
  // ============================================

  const handleSelectMessage = async (msg: AdminMessage) => {
    setSelectedMessage(msg);
    setReadMessageIds(prev => new Set(prev).add(msg.id));
    if (msg.status === 'pending' && user?.id) {
      await adminMessagesService.markAsRead(msg.id, user.id);
      loadMessages();
    }
  };

  const handleResolve = async () => {
    if (!selectedMessage || !user?.id) return;
    setResolving(true);
    try {
      const ok = await adminMessagesService.resolveMessage(selectedMessage.id, user.id, resolveNote || undefined);
      if (ok) {
        if (selectedMessage.category === 'user_unblock_request' && selectedMessage.sender_email) {
          await adminMessagesService.unlockUser(selectedMessage.sender_email);
          toast.success('Resuelto y usuario desbloqueado');
        } else {
          toast.success('Mensaje resuelto');
        }
        setResolveNote('');
        setSelectedMessage(null);
        loadMessages();
      }
    } catch {
      toast.error('Error al resolver');
    } finally {
      setResolving(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedMessage) return;
    const ok = await adminMessagesService.archiveMessage(selectedMessage.id);
    if (ok) {
      toast.success('Archivado');
      setSelectedMessage(null);
      loadMessages();
    }
  };

  // ============================================
  // HANDLERS TICKETS
  // ============================================

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    if (user?.id) {
      await ticketService.markTicketAsViewed(ticket.id, user.id);
      await ticketService.markTicketNotificationsAsRead(user.id, ticket.id);
    }
    const { comments } = await ticketService.getTicketComments(ticket.id);
    setTicketComments(comments);
    loadTickets();
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedTicket || !user) return;
    try {
      const { success } = await ticketService.updateTicketStatus(
        selectedTicket.id, status, user.id, user.full_name || user.email
      );
      if (success) {
        toast.success(`Estado: ${TICKET_STATUS[status].label}`);
        setSelectedTicket({ ...selectedTicket, status });
        loadTickets();
      }
    } catch {
      toast.error('Error');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedTicket || !user) return;
    setSubmitting(true);
    try {
      await ticketService.addComment(
        selectedTicket.id, user.id, user.full_name || user.email, user.role_name, newComment.trim(), isInternal
      );
      toast.success(isInternal ? 'Nota agregada' : 'Respuesta enviada');
      setNewComment('');
      setIsInternal(false);
      const { comments } = await ticketService.getTicketComments(selectedTicket.id);
      setTicketComments(comments);
    } catch {
      toast.error('Error');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // HANDLERS ASIGNACIÓN
  // ============================================

  const handleLoadUsersForRole = async (role: AssignableRole) => {
    setSelectedRole(role);
    setSelectedUserId('');
    setLoadingUsers(true);
    try {
      const { users } = await ticketService.getUsersByRole(role);
      setUsersForRole(users);
    } catch {
      setUsersForRole([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignToRole = async () => {
    if (!selectedTicket || !selectedRole || !user) return;
    setAssigningTicket(true);
    try {
      const { success, error } = await ticketService.assignTicketToRole(
        selectedTicket.id,
        selectedRole,
        user.id,
        user.full_name || user.email
      );
      if (success) {
        const roleLabel = ASSIGNABLE_ROLES.find(r => r.value === selectedRole)?.label || selectedRole;
        toast.success(`Asignado a: ${roleLabel}`);
        setSelectedTicket({ ...selectedTicket, assigned_to_role: selectedRole, assigned_to: null });
        setShowAssignmentPanel(false);
        loadTickets();
      } else {
        toast.error(error || 'Error al asignar');
      }
    } catch {
      toast.error('Error al asignar');
    } finally {
      setAssigningTicket(false);
    }
  };

  const handleAssignToUser = async () => {
    if (!selectedTicket || !selectedUserId || !user) return;
    setAssigningTicket(true);
    try {
      const { success, error } = await ticketService.assignTicket(
        selectedTicket.id,
        selectedUserId,
        user.id,
        user.full_name || user.email
      );
      if (success) {
        const assignedUser = usersForRole.find(u => u.id === selectedUserId);
        toast.success(`Asignado a: ${assignedUser?.full_name || 'Usuario'}`);
        setSelectedTicket({ ...selectedTicket, assigned_to: selectedUserId, assigned_to_role: null });
        setShowAssignmentPanel(false);
        loadTickets();
        // Cachear nombre del usuario asignado
        if (assignedUser) {
          setAssignedUserNames(prev => new Map(prev).set(selectedUserId, assignedUser.full_name));
        }
      } else {
        toast.error(error || 'Error al asignar');
      }
    } catch {
      toast.error('Error al asignar');
    } finally {
      setAssigningTicket(false);
    }
  };

  const handleUnassign = async () => {
    if (!selectedTicket || !user) return;
    setAssigningTicket(true);
    try {
      const { success, error } = await ticketService.unassignTicket(
        selectedTicket.id,
        user.id,
        user.full_name || user.email
      );
      if (success) {
        toast.success('Asignación removida');
        setSelectedTicket({ ...selectedTicket, assigned_to: null, assigned_to_role: null });
        loadTickets();
      } else {
        toast.error(error || 'Error');
      }
    } catch {
      toast.error('Error');
    } finally {
      setAssigningTicket(false);
    }
  };

  // Cargar nombre de usuario asignado
  useEffect(() => {
    if (selectedTicket?.assigned_to && !assignedUserNames.has(selectedTicket.assigned_to)) {
      ticketService.getAssignedUserName(selectedTicket.assigned_to).then(name => {
        if (name) {
          setAssignedUserNames(prev => new Map(prev).set(selectedTicket.assigned_to!, name));
        }
      });
    }
  }, [selectedTicket?.assigned_to, assignedUserNames]);

  const getAssignmentDisplay = (ticket: SupportTicket) => {
    if (ticket.assigned_to) {
      return assignedUserNames.get(ticket.assigned_to) || 'Cargando...';
    }
    if (ticket.assigned_to_role) {
      return ASSIGNABLE_ROLES.find(r => r.value === ticket.assigned_to_role)?.label || ticket.assigned_to_role;
    }
    return null;
  };

  // ============================================
  // UTILIDADES
  // ============================================

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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Centro de Administración</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {pendingMessages} pendiente{pendingMessages !== 1 ? 's' : ''} · {activeTickets} ticket{activeTickets !== 1 ? 's' : ''} activo{activeTickets !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setActiveSection('tickets'); setSelectedTicket(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeSection === 'tickets'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
                <span>Tickets</span>
                {newTickets > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    activeSection === 'tickets' ? 'bg-white/20' : 'bg-orange-500 text-white'
                  }`}>
                    {newTickets}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveSection('messages'); setSelectedMessage(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeSection === 'messages'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>Mensajes</span>
                {pendingMessages > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    activeSection === 'messages' ? 'bg-white/20' : 'bg-blue-500 text-white'
                  }`}>
                    {pendingMessages}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div className="flex-1 flex overflow-hidden">
            {/* Panel Izquierdo - Lista */}
            <div className="w-[420px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-800/20">
              {/* Filtros modernos */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
                {/* Barra de búsqueda */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={activeSection === 'messages' ? 'Buscar mensajes...' : 'Buscar tickets...'}
                    value={activeSection === 'messages' ? messageSearch : ticketSearch}
                    onChange={(e) => activeSection === 'messages' ? setMessageSearch(e.target.value) : setTicketSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                {/* Filtros rápidos */}
                <div className="flex gap-2">
                  {activeSection === 'messages' ? (
                    <>
                      <button
                        onClick={() => setMessageFilter('pending')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          messageFilter === 'pending'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        Pendientes ({pendingMessages})
                      </button>
                      <button
                        onClick={() => setMessageFilter('all')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          messageFilter === 'all'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        Todos ({messages.length})
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setTicketFilter('active')}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          ticketFilter === 'active'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        Activos ({activeTickets})
                      </button>
                      <button
                        onClick={() => setTicketFilter('mine')}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          ticketFilter === 'mine'
                            ? 'bg-purple-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        Míos ({myTicketsCount})
                      </button>
                      <button
                        onClick={() => setTicketFilter('all')}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          ticketFilter === 'all'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        Todos ({tickets.length})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto">
                {activeSection === 'messages' ? (
                  loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" />
                      </svg>
                      <p className="text-sm">Sin mensajes</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredMessages.map((msg) => {
                        const isNew = msg.status === 'pending' && !readMessageIds.has(msg.id);
                        return (
                          <button
                            key={msg.id}
                            onClick={() => handleSelectMessage(msg)}
                            className={`w-full p-4 text-left transition-all hover:bg-white dark:hover:bg-gray-800 ${
                              selectedMessage?.id === msg.id ? 'bg-white dark:bg-gray-800 border-l-4 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                msg.status === 'pending' ? 'bg-amber-500' : msg.status === 'resolved' ? 'bg-emerald-500' : 'bg-gray-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{msg.title}</h4>
                                  {isNew && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500 text-white rounded uppercase flex-shrink-0">Nuevo</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{msg.sender_email || 'Sistema'}</p>
                                <span className="text-[10px] text-gray-400 mt-1 block">{formatDate(msg.created_at)}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : (
                  loadingTickets ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3" />
                      </svg>
                      <p className="text-sm">Sin tickets</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredTickets.map((ticket) => (
                          <button
                            key={ticket.id}
                            onClick={() => handleSelectTicket(ticket)}
                            className={`w-full p-4 text-left transition-all hover:bg-white dark:hover:bg-gray-800 ${
                              selectedTicket?.id === ticket.id ? 'bg-white dark:bg-gray-800 border-l-4 border-orange-500' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                ticket.status === 'abierto' ? 'bg-blue-500 animate-pulse' :
                                ticket.status === 'en_progreso' ? 'bg-amber-500' :
                                ticket.status === 'pendiente_info' ? 'bg-purple-500' :
                                ticket.status === 'resuelto' ? 'bg-emerald-500' : 'bg-gray-400'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">{ticket.ticket_number}</span>
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                    ticket.type === 'reporte_falla' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                                  }`}>
                                    {ticket.type === 'reporte_falla' ? 'BUG' : 'REQ'}
                                  </span>
                                  {ticket.hasNewBadge && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded uppercase flex-shrink-0 animate-pulse">Nuevo</span>
                                  )}
                                  {!ticket.hasNewBadge && ticket.hasMessageBadge && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500 text-white rounded flex-shrink-0">💬</span>
                                  )}
                                </div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{ticket.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500 truncate">{ticket.reporter_name?.split(' ')[0] || ticket.reporter_email?.split('@')[0]}</span>
                                  <span className="text-[10px] text-gray-400">{formatDate(ticket.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Panel Derecho - Detalle */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
              {activeSection === 'messages' ? (
                selectedMessage ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          selectedMessage.category === 'password_reset_request' ? 'bg-blue-100 text-blue-600' :
                          selectedMessage.category === 'user_unblock_request' ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            {selectedMessage.category === 'password_reset_request' && <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />}
                            {selectedMessage.category === 'user_unblock_request' && <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />}
                            {!['password_reset_request', 'user_unblock_request'].includes(selectedMessage.category) && <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" />}
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedMessage.title}</h3>
                          <p className="text-sm text-gray-500">{selectedMessage.sender_email || 'Sistema'} · {formatDate(selectedMessage.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contenido</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-6">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMessage.message}</p>
                      </div>

                      {selectedMessage.metadata && Object.keys(selectedMessage.metadata).length > 0 && (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Info Adicional</span>
                          </div>
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 mb-6">
                            {Object.entries(selectedMessage.metadata).map(([k, v]) => (
                              <div key={k} className="flex gap-3 text-sm py-1">
                                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{k}:</span>
                                <span className="text-gray-700 dark:text-gray-300">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {selectedMessage.status !== 'resolved' && selectedMessage.status !== 'archived' && (
                      <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <textarea
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          placeholder="Nota de resolución..."
                          className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white resize-none h-16 mb-3"
                        />
                        <div className="flex gap-3">
                          <motion.button onClick={handleResolve} disabled={resolving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl disabled:opacity-50 shadow-lg shadow-emerald-500/25"
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            {resolving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                            <span>Resolver</span>
                          </motion.button>
                          <motion.button onClick={handleArchive} className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Archivar</motion.button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" />
                      </svg>
                      <p className="text-sm">Selecciona un mensaje</p>
                    </div>
                  </div>
                )
              ) : (
                selectedTicket ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            selectedTicket.type === 'reporte_falla' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
                          }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-bold text-orange-600">{selectedTicket.ticket_number}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${TICKET_STATUS[selectedTicket.status].bg} ${TICKET_STATUS[selectedTicket.status].color}`}>
                                {TICKET_STATUS[selectedTicket.status].label}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTicket.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{selectedTicket.reporter_name} · {selectedTicket.reporter_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => setShowAssignmentPanel(!showAssignmentPanel)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                              showAssignmentPanel 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                            <span>Asignar</span>
                          </motion.button>
                          <select value={selectedTicket.status} onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                            className={`px-3 py-2 text-sm font-medium rounded-xl border-2 cursor-pointer ${TICKET_STATUS[selectedTicket.status].bg} ${TICKET_STATUS[selectedTicket.status].color} border-gray-200 dark:border-gray-700 focus:outline-none`}>
                            {Object.entries(TICKET_STATUS).map(([s, c]) => (<option key={s} value={s}>{c.label}</option>))}
                          </select>
                        </div>
                      </div>

                      {/* Panel de Asignación */}
                      <AnimatePresence>
                        {showAssignmentPanel && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 overflow-hidden"
                          >
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Asignar Ticket</span>
                              </div>

                              {/* Info asignación actual */}
                              {(selectedTicket.assigned_to || selectedTicket.assigned_to_role) && (
                                <div className="flex items-center justify-between p-3 mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      Asignado a: <span className="font-medium text-gray-900 dark:text-white">{getAssignmentDisplay(selectedTicket)}</span>
                                    </span>
                                  </div>
                                  <button
                                    onClick={handleUnassign}
                                    disabled={assigningTicket}
                                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                                  >
                                    Quitar asignación
                                  </button>
                                </div>
                              )}

                              {/* Selector tipo de asignación */}
                              <div className="flex gap-2 mb-4">
                                <button
                                  onClick={() => { setAssignmentType('role'); setSelectedRole(''); setUsersForRole([]); setSelectedUserId(''); }}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    assignmentType === 'role'
                                      ? 'bg-blue-500 text-white shadow-md'
                                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                                  }`}
                                >
                                  Por Grupo
                                </button>
                                <button
                                  onClick={() => { setAssignmentType('user'); setSelectedRole(''); setUsersForRole([]); setSelectedUserId(''); }}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    assignmentType === 'user'
                                      ? 'bg-blue-500 text-white shadow-md'
                                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                                  }`}
                                >
                                  Usuario Específico
                                </button>
                              </div>

                              {/* Asignación por Grupo */}
                              {assignmentType === 'role' && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-3 gap-2">
                                    {ASSIGNABLE_ROLES.map(role => (
                                      <button
                                        key={role.value}
                                        onClick={() => setSelectedRole(role.value)}
                                        className={`p-3 rounded-lg text-left transition-all ${
                                          selectedRole === role.value
                                            ? `bg-gradient-to-r ${role.color} text-white shadow-lg`
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-300'
                                        }`}
                                      >
                                        <span className="text-sm font-medium">{role.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                  {selectedRole && (
                                    <motion.button
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      onClick={handleAssignToRole}
                                      disabled={assigningTicket}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50"
                                    >
                                      {assigningTicket ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                      )}
                                      <span>Asignar al grupo</span>
                                    </motion.button>
                                  )}
                                </div>
                              )}

                              {/* Asignación a Usuario */}
                              {assignmentType === 'user' && (
                                <div className="space-y-3">
                                  <select
                                    value={selectedRole}
                                    onChange={(e) => handleLoadUsersForRole(e.target.value as AssignableRole)}
                                    className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                  >
                                    <option value="">Seleccionar grupo...</option>
                                    {ASSIGNABLE_ROLES.map(role => (
                                      <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                  </select>

                                  {loadingUsers && (
                                    <div className="flex items-center justify-center py-4">
                                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  )}

                                  {!loadingUsers && usersForRole.length > 0 && (
                                    <>
                                      <select
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                                      >
                                        <option value="">Seleccionar usuario...</option>
                                        {usersForRole.map(u => (
                                          <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                                        ))}
                                      </select>

                                      {selectedUserId && (
                                        <motion.button
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          onClick={handleAssignToUser}
                                          disabled={assigningTicket}
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50"
                                        >
                                          {assigningTicket ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                          ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                          )}
                                          <span>Asignar usuario</span>
                                        </motion.button>
                                      )}
                                    </>
                                  )}

                                  {!loadingUsers && selectedRole && usersForRole.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-3">No hay usuarios activos en este grupo</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Mostrar asignación actual (fuera del panel) */}
                      {!showAssignmentPanel && (selectedTicket.assigned_to || selectedTicket.assigned_to_role) && (
                        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">
                            Asignado a: <span className="font-medium">{getAssignmentDisplay(selectedTicket)}</span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-red-500 rounded-full" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-6">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                      </div>

                      {selectedTicket.screenshot_url && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Captura</span>
                          </div>
                          <img src={selectedTicket.screenshot_url} alt="Screenshot" className="rounded-xl border border-gray-200 dark:border-gray-700 max-h-48 cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => setImagePreview(selectedTicket.screenshot_url || null)} />
                        </div>
                      )}

                      {/* Metadata del Ticket */}
                      {(selectedTicket.app_version || selectedTicket.current_module || selectedTicket.user_agent || selectedTicket.session_details) && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-5 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Información Técnica</span>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                            {/* Versión y Módulo */}
                            <div className="grid grid-cols-2 gap-4">
                              {selectedTicket.app_version && (
                                <div>
                                  <span className="text-[10px] font-medium text-gray-500 uppercase">Versión</span>
                                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{selectedTicket.app_version}</p>
                                </div>
                              )}
                              {selectedTicket.current_module && (
                                <div>
                                  <span className="text-[10px] font-medium text-gray-500 uppercase">Módulo</span>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTicket.current_module}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* User Agent */}
                            {selectedTicket.user_agent && (
                              <div>
                                <span className="text-[10px] font-medium text-gray-500 uppercase">Navegador</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400 break-all">{selectedTicket.user_agent}</p>
                              </div>
                            )}

                            {/* Prospecto (si aplica) */}
                            {selectedTicket.prospecto_nombre && (
                              <div>
                                <span className="text-[10px] font-medium text-gray-500 uppercase">Prospecto</span>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTicket.prospecto_nombre} <span className="text-xs text-gray-400">({selectedTicket.prospecto_id})</span></p>
                              </div>
                            )}

                            {/* Detalles de Sesión */}
                            {selectedTicket.session_details && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                <span className="text-[10px] font-medium text-gray-500 uppercase block mb-2">Detalles de Sesión</span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {selectedTicket.session_details.screenResolution && (
                                    <div><span className="text-gray-500">Pantalla:</span> <span className="text-gray-700 dark:text-gray-300">{selectedTicket.session_details.screenResolution}</span></div>
                                  )}
                                  {selectedTicket.session_details.viewportSize && (
                                    <div><span className="text-gray-500">Viewport:</span> <span className="text-gray-700 dark:text-gray-300">{selectedTicket.session_details.viewportSize}</span></div>
                                  )}
                                  {selectedTicket.session_details.timezone && (
                                    <div><span className="text-gray-500">Zona:</span> <span className="text-gray-700 dark:text-gray-300">{selectedTicket.session_details.timezone}</span></div>
                                  )}
                                  {selectedTicket.session_details.platform && (
                                    <div><span className="text-gray-500">Plataforma:</span> <span className="text-gray-700 dark:text-gray-300">{selectedTicket.session_details.platform}</span></div>
                                  )}
                                  {selectedTicket.session_details.url && (
                                    <div className="col-span-2"><span className="text-gray-500">URL:</span> <span className="text-gray-700 dark:text-gray-300 break-all">{selectedTicket.session_details.url}</span></div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Console Logs */}
                            {selectedTicket.session_details?.consoleLogs && selectedTicket.session_details.consoleLogs.length > 0 && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                <span className="text-[10px] font-medium text-gray-500 uppercase block mb-2">Console Logs ({selectedTicket.session_details.consoleLogs.length})</span>
                                <div className="max-h-32 overflow-y-auto bg-gray-900 rounded-lg p-2 font-mono text-[11px] space-y-1">
                                  {selectedTicket.session_details.consoleLogs.map((log: { type: string; message: string; timestamp: string }, idx: number) => (
                                    <div key={idx} className={`flex gap-2 ${
                                      log.type === 'error' ? 'text-red-400' : 
                                      log.type === 'warn' ? 'text-yellow-400' : 
                                      log.type === 'info' ? 'text-blue-400' : 'text-gray-300'
                                    }`}>
                                      <span className="text-gray-500 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                      <span className={`flex-shrink-0 uppercase text-[9px] px-1 rounded ${
                                        log.type === 'error' ? 'bg-red-900/50' : 
                                        log.type === 'warn' ? 'bg-yellow-900/50' : 
                                        log.type === 'info' ? 'bg-blue-900/50' : 'bg-gray-800'
                                      }`}>{log.type}</span>
                                      <span className="break-all">{log.message}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversación ({ticketComments.length})</span>
                      </div>
                      <div className="space-y-3">
                        {ticketComments.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">Sin comentarios</p>
                        ) : (
                          ticketComments.map((c) => (
                            <div key={c.id} className={`p-3 rounded-xl ${c.is_internal ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : c.user_id === selectedTicket.reporter_id ? 'bg-gray-100 dark:bg-gray-800' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.user_name} {c.is_internal && <span className="text-[9px] text-yellow-600 ml-1">(Interno)</span>}</span>
                                <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{c.content}</p>
                            </div>
                          ))
                        )}
                        <div ref={commentsEndRef} />
                      </div>
                    </div>

                    <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      {/* Acciones Rápidas de Estado */}
                      {selectedTicket.status !== 'resuelto' && selectedTicket.status !== 'cerrado' && selectedTicket.status !== 'cancelado' && (
                        <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-medium text-gray-500 uppercase">Acciones:</span>
                            <button
                              onClick={() => { handleStatusChange('resuelto'); }}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Resolver
                            </button>
                            <button
                              onClick={() => { handleStatusChange('cerrado'); }}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" /></svg>
                              Cerrar
                            </button>
                            <button
                              onClick={() => { handleStatusChange('cancelado'); }}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Respuestas Rápidas - Envían directamente */}
                      <div className="px-4 pt-2 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <span className="text-[10px] font-medium text-gray-500 uppercase mr-1">Respuestas:</span>
                          {[
                            { text: 'Recibido, lo revisamos' },
                            { text: 'Necesitamos más información' },
                            { text: 'Ya fue corregido' },
                            { text: 'Programado para próximo release' },
                            { text: 'Gracias por reportarlo' },
                          ].map((resp, idx) => (
                            <button
                              key={idx}
                              disabled={submitting}
                              onClick={async () => {
                                if (!selectedTicket || !user || submitting) return;
                                setSubmitting(true);
                                try {
                                  await ticketService.addComment(
                                    selectedTicket.id, user.id, user.full_name || user.email, user.role_name, resp.text, false
                                  );
                                  toast.success('Respuesta enviada');
                                  const { comments } = await ticketService.getTicketComments(selectedTicket.id);
                                  setTicketComments(comments);
                                } catch {
                                  toast.error('Error al enviar');
                                } finally {
                                  setSubmitting(false);
                                }
                              }}
                              className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-50"
                            >
                              {resp.text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Área de Respuesta */}
                      <div className="px-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500" />
                            <span className={isInternal ? 'text-yellow-600 font-medium' : 'text-gray-500'}>Nota interna</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={isInternal ? "Nota interna..." : "Responder..."} rows={2}
                            className={`flex-1 px-3 py-2 text-sm border-2 rounded-xl resize-none dark:bg-gray-800 dark:text-white ${isInternal ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700'}`} />
                          <motion.button onClick={handleSendComment} disabled={!newComment.trim() || submitting}
                            className={`w-11 h-11 rounded-xl text-white disabled:opacity-50 flex items-center justify-center shadow-lg ${isInternal ? 'bg-yellow-500' : 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-blue-500/25'}`}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3" />
                      </svg>
                      <p className="text-sm">Selecciona un ticket</p>
                    </div>
                  </div>
                )
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
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
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

export default AdminMessagesModal;
