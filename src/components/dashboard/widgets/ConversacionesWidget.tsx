/**
 * Widget de Últimas Conversaciones
 * Basado en LiveChatCanvas - muestra conversaciones asignadas según permisos
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ChevronRight, Loader2, X, Flag } from 'lucide-react';
import { supabaseSystemUI } from '../../../config/supabaseSystemUI';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { uchatService, type UChatConversation } from '../../../services/uchatService';
import { permissionsService } from '../../../services/permissionsService';
import { coordinacionService } from '../../../services/coordinacionService';
import { useAppStore } from '../../../stores/appStore';
import { useAuth } from '../../../contexts/AuthContext';
import { AssignmentBadge } from '../../analysis/AssignmentBadge';
import { MultimediaMessage, needsBubble } from '../../chat/MultimediaMessage';
import { ProspectoSidebar } from '../../scheduled-calls/ProspectoSidebar';
import { notificationSoundService } from '../../../services/notificationSoundService';

interface Message {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_name?: string;
  id_sender?: string; // ID del usuario que envió el mensaje
  sender_user_name?: string; // Nombre completo del usuario que envió el mensaje
  content?: string;
  is_read: boolean;
  created_at: string;
  adjuntos?: any; // Para multimedia
}

interface ConversacionesWidgetProps {
  userId?: string;
}

export const ConversacionesWidget: React.FC<ConversacionesWidgetProps> = ({ userId }) => {
  const { user } = useAuth();
  const { setAppMode } = useAppStore();
  const [conversations, setConversations] = useState<UChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<UChatConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prospectosData, setProspectosData] = useState<Map<string, any>>(new Map());
  const [coordinacionesMap, setCoordinacionesMap] = useState<Map<string, any>>(new Map());
  const [ejecutivosMap, setEjecutivosMap] = useState<Map<string, any>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<any>(null);
  const conversationsRef = useRef<UChatConversation[]>([]);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProspectoIdForSidebar, setSelectedProspectoIdForSidebar] = useState<string | null>(null);
  const isOpeningSidebarRef = useRef(false);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
    // Limpiar después de que la animación termine
    setTimeout(() => {
      setSelectedProspectoIdForSidebar(null);
    }, 300);
  }, []);

  const getInitials = (name: string | undefined | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadConversations();
    setupRealtime();

    return () => {
      if (realtimeChannelRef.current) {
        if (realtimeChannelRef.current.uchat) {
          try {
            realtimeChannelRef.current.uchat.unsubscribe();
          } catch (e) {}
        }
        if (realtimeChannelRef.current.whatsapp) {
          try {
            realtimeChannelRef.current.whatsapp.unsubscribe();
          } catch (e) {}
        }
      }
    };
  }, [userId]);

  useEffect(() => {
    // Escuchar evento para abrir conversación desde ProspectosNuevosWidget
    const handleOpenProspectConversation = async (event: CustomEvent) => {
      const { prospectId } = event.detail;
      if (!prospectId) return;

      // Usar un pequeño delay para asegurar que el ref esté actualizado
      await new Promise(resolve => setTimeout(resolve, 50));

      // Buscar si la conversación está en el top 15 usando el ref actualizado
      const conversation = conversationsRef.current.find(
        c => c.prospect_id === prospectId || c.prospecto_id === prospectId
      );

      if (conversation) {
        // Está en el top 15, abrirla en el widget
        setSelectedConversation(conversation);
        // NO disparar evento de redirección
      } else {
        // No está en el top 15, disparar evento para redirigir
        window.dispatchEvent(new CustomEvent('conversation-not-in-top', { 
          detail: { prospectId } 
        }));
      }
    };

    window.addEventListener('open-prospect-conversation', handleOpenProspectConversation as EventListener);

    return () => {
      window.removeEventListener('open-prospect-conversation', handleOpenProspectConversation as EventListener);
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupRealtime = () => {
    // Limpiar canales anteriores si existen
    if (realtimeChannelRef.current) {
      if (realtimeChannelRef.current.uchat) {
        try {
          realtimeChannelRef.current.uchat.unsubscribe();
        } catch (e) {}
      }
      if (realtimeChannelRef.current.whatsapp) {
        try {
          realtimeChannelRef.current.whatsapp.unsubscribe();
        } catch (e) {}
      }
    }

    // Canal para uchat_conversations y uchat_messages
    const uchatChannel = supabaseSystemUI
      .channel(`conversaciones-uchat-dashboard-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'uchat_conversations'
        },
        (payload) => {
          const updatedConv = payload.new as any;
          setConversations(prev => {
            const exists = prev.find(c => c.id === updatedConv.id);
            if (exists) {
              const updated = prev.map(c => 
                c.id === updatedConv.id ? { ...c, ...updatedConv } : c
              ).sort((a, b) => {
                const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                             a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                             b.updated_at ? new Date(b.updated_at).getTime() : 0;
                return dateB - dateA;
              });
              return updated.slice(0, 15);
            } else {
              const updated = [...prev, updatedConv as UChatConversation]
                .sort((a, b) => {
                  const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                               a.updated_at ? new Date(a.updated_at).getTime() : 0;
                  const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                               b.updated_at ? new Date(b.updated_at).getTime() : 0;
                  return dateB - dateA;
                });
              return updated.slice(0, 15);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uchat_conversations'
        },
        (payload) => {
          const newConv = payload.new as any;
          setConversations(prev => {
            const updated = [...prev, newConv as UChatConversation]
              .sort((a, b) => {
                const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                             a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                             b.updated_at ? new Date(b.updated_at).getTime() : 0;
                return dateB - dateA;
              });
            return updated.slice(0, 10);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uchat_messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Reproducir sonido solo si el mensaje es del cliente y no ha sido procesado antes
          if (newMessage.sender_type === 'customer' && newMessage.id && !processedMessagesRef.current.has(newMessage.id)) {
            processedMessagesRef.current.add(newMessage.id);
            notificationSoundService.playNotification('message');
          }
          
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            loadMessages(selectedConversation);
          }
          
          if (newMessage.conversation_id) {
            // Incrementar contador de no leídos si el mensaje es del cliente
            const isFromCustomer = newMessage.sender_type === 'customer';
            setConversations(prev => {
              const updated = prev.map(c => {
                if (c.id === newMessage.conversation_id) {
                  const currentUnread = Number(c.unread_count ?? c.mensajes_no_leidos ?? 0);
                  return {
                    ...c,
                    last_message_at: newMessage.created_at,
                    updated_at: newMessage.created_at,
                    message_count: (c.message_count || 0) + 1,
                    unread_count: isFromCustomer ? currentUnread + 1 : currentUnread,
                    mensajes_no_leidos: isFromCustomer ? currentUnread + 1 : currentUnread
                  };
                }
                return c;
              }).sort((a, b) => {
                const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                             a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                             b.updated_at ? new Date(b.updated_at).getTime() : 0;
                return dateB - dateA;
              });
              return updated.slice(0, 15);
            });
          }
        }
      )
      .subscribe();

    // Canal para mensajes_whatsapp (igual que LiveChatCanvas)
    const whatsappChannel = analysisSupabase
      .channel(`mensajes-whatsapp-dashboard-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_whatsapp'
        },
        (payload) => {
          const newMessage = payload.new as any;
          const messageTimestamp = newMessage.fecha_hora || new Date().toISOString();
          const messageId = newMessage.id || `${newMessage.prospecto_id}-${messageTimestamp}`;
          
          // Reproducir sonido solo si el mensaje es del cliente/prospecto y no ha sido procesado antes
          if (newMessage.rol === 'Prospecto' && !processedMessagesRef.current.has(messageId)) {
            processedMessagesRef.current.add(messageId);
            notificationSoundService.playNotification('message');
          }
          
          if (selectedConversation && selectedConversation.prospect_id === newMessage.prospecto_id) {
            loadMessages(selectedConversation);
          }
          
          setConversations(prev => {
            const updated = prev.map(c => {
              const matchesProspect = c.prospect_id === newMessage.prospecto_id;
              const matchesPhone = c.customer_phone && newMessage.prospecto_id && 
                (c.customer_phone.includes(newMessage.prospecto_id) || 
                 c.metadata?.prospect_id === newMessage.prospecto_id);
              
              if (matchesProspect || matchesPhone) {
                // Incrementar contador de no leídos si el mensaje es del cliente
                const isFromCustomer = newMessage.rol === 'Prospecto';
                const currentUnread = Number(c.unread_count ?? c.mensajes_no_leidos ?? 0);
                return {
                  ...c,
                  last_message_at: messageTimestamp,
                  updated_at: messageTimestamp,
                  message_count: (c.message_count || 0) + 1,
                  unread_count: isFromCustomer ? currentUnread + 1 : currentUnread,
                  mensajes_no_leidos: isFromCustomer ? currentUnread + 1 : currentUnread
                };
              }
              return c;
            }).sort((a, b) => {
              const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                           a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                           b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return dateB - dateA;
            });
            return updated.slice(0, 10);
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = { uchat: uchatChannel, whatsapp: whatsappChannel };
  };

  const loadConversations = async () => {
    if (!userId) {
      setLoading(false);
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      
      // OPTIMIZACIÓN: Cargar ambas fuentes en paralelo (igual que LiveChatCanvas)
      const [uchatConversationsRaw, rpcDataResult] = await Promise.all([
        uchatService.getConversations({
          userId: userId,
          limit: 50
        }),
        analysisSupabase.rpc('get_conversations_ordered')
          .then(({ data, error }) => ({ data, error }))
          .catch(() => ({ data: null, error: null }))
      ]);

      // Obtener filtros de permisos
      const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
      const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);

      // Recolectar IDs de prospectos
      const prospectoIds = new Set<string>();
      const coordinacionIds = new Set<string>();
      const ejecutivoIds = new Set<string>();

      uchatConversationsRaw.forEach(conv => {
        if (conv.prospect_id) prospectoIds.add(conv.prospect_id);
      });
      const rpcData = rpcDataResult.data || [];
      rpcData.forEach((c: any) => {
        if (c.prospecto_id) prospectoIds.add(c.prospecto_id);
      });

      // Cargar datos en batch (igual que LiveChatCanvas)
      const [prospectosDataMap, coordinacionesMapData, ejecutivosMapData] = await Promise.all([
        prospectoIds.size > 0
          ? analysisSupabase
              .from('prospectos')
              .select('id, coordinacion_id, ejecutivo_id, requiere_atencion_humana, motivo_handoff, nombre_completo, nombre_whatsapp')
              .in('id', Array.from(prospectoIds))
              .then(({ data }) => {
                const map = new Map();
                (data || []).forEach(p => {
                  map.set(p.id, p);
                  if (p.coordinacion_id) coordinacionIds.add(p.coordinacion_id);
                  if (p.ejecutivo_id) ejecutivoIds.add(p.ejecutivo_id);
                });
                return map;
              })
              .catch(() => new Map())
          : Promise.resolve(new Map()),
        coordinacionIds.size > 0
          ? coordinacionService.getCoordinacionesByIds(Array.from(coordinacionIds))
          : Promise.resolve(new Map()),
        ejecutivoIds.size > 0
          ? coordinacionService.getEjecutivosByIds(Array.from(ejecutivoIds))
          : Promise.resolve(new Map())
      ]);

      setProspectosData(prospectosDataMap);
      setCoordinacionesMap(coordinacionesMapData);
      setEjecutivosMap(ejecutivosMapData);

      // Adaptar conversaciones de uchat
      const uchatConversations: any[] = uchatConversationsRaw.map(conv => {
        const prospectoData = conv.prospect_id ? prospectosDataMap.get(conv.prospect_id) : null;
        const coordinacionId = prospectoData?.coordinacion_id;
        const ejecutivoId = prospectoData?.ejecutivo_id;
        const coordinacionInfo = coordinacionId ? coordinacionesMapData.get(coordinacionId) : null;
        const ejecutivoInfo = ejecutivoId ? ejecutivosMapData.get(ejecutivoId) : null;

        return {
          ...conv,
          prospecto_id: conv.prospect_id,
          customer_name: conv.customer_name || conv.customer_phone,
          customer_phone: conv.customer_phone,
          metadata: {
            ...conv.metadata,
            coordinacion_id: coordinacionId,
            coordinacion_codigo: coordinacionInfo?.codigo,
            coordinacion_nombre: coordinacionInfo?.nombre,
            ejecutivo_id: ejecutivoId,
            ejecutivo_nombre: ejecutivoInfo?.full_name,
            ejecutivo_email: ejecutivoInfo?.email
          }
        };
      });

      // Adaptar conversaciones de WhatsApp (RPC)
      const whatsappConversations: any[] = rpcData.map((c: any) => {
        const prospectoData = c.prospecto_id ? prospectosDataMap.get(c.prospecto_id) : null;
        const coordinacionId = prospectoData?.coordinacion_id;
        const ejecutivoId = prospectoData?.ejecutivo_id;
        const coordinacionInfo = coordinacionId ? coordinacionesMapData.get(coordinacionId) : null;
        const ejecutivoInfo = ejecutivoId ? ejecutivosMapData.get(ejecutivoId) : null;

        return {
          id: c.prospecto_id,
          conversation_id: c.prospecto_id,
          prospect_id: c.prospecto_id,
          prospecto_id: c.prospecto_id,
          customer_name: c.nombre_contacto || c.numero_telefono,
          customer_phone: c.numero_telefono,
          status: c.estado_prospecto || 'active',
          last_message_at: c.fecha_ultimo_mensaje,
          message_count: c.mensajes_totales || 0,
          unread_count: c.mensajes_no_leidos || 0,
          updated_at: c.fecha_ultimo_mensaje,
          metadata: {
            prospect_id: c.prospecto_id,
            id_uchat: c.id_uchat,
            coordinacion_id: coordinacionId,
            coordinacion_codigo: coordinacionInfo?.codigo,
            coordinacion_nombre: coordinacionInfo?.nombre,
            ejecutivo_id: ejecutivoId,
            ejecutivo_nombre: ejecutivoInfo?.full_name,
            ejecutivo_email: ejecutivoInfo?.email
          }
        };
      });

      // Aplicar filtros de permisos
      let filteredUchat: any[] = [];
      let filteredWhatsapp: any[] = [];

      if (!coordinacionesFilter && !ejecutivoFilter) {
        // Admin: sin filtros
        filteredUchat = uchatConversations;
        filteredWhatsapp = whatsappConversations;
      } else {
        // Filtrar según permisos
        for (const conv of uchatConversations) {
          if (conv.prospect_id) {
            const prospectoData = prospectosDataMap.get(conv.prospect_id);
            if (ejecutivoFilter) {
              if (prospectoData?.ejecutivo_id === ejecutivoFilter) {
                filteredUchat.push(conv);
              }
            } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              if (prospectoData?.coordinacion_id && coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
                filteredUchat.push(conv);
              }
            }
          }
        }

        for (const conv of whatsappConversations) {
          if (conv.prospecto_id) {
            const prospectoData = prospectosDataMap.get(conv.prospecto_id);
            if (ejecutivoFilter) {
              if (prospectoData?.ejecutivo_id === ejecutivoFilter) {
                filteredWhatsapp.push(conv);
              }
            } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              if (prospectoData?.coordinacion_id && coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
                filteredWhatsapp.push(conv);
              }
            }
          }
        }
      }

      // Combinar y eliminar duplicados
      const allConversations = [...filteredUchat, ...filteredWhatsapp];
      const uniqueConversations = allConversations.filter((conv, index, self) =>
        index === self.findIndex(c => (c.id || c.prospecto_id) === (conv.id || conv.prospecto_id))
      );

      // Ordenar por última actividad (más recientes primero)
      const sorted = uniqueConversations.sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                     a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                     b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      });
      
      // Tomar las 15 más recientes
      const top15 = sorted.slice(0, 15);
      conversationsRef.current = top15 as UChatConversation[];
      
      // Marcar todos los mensajes iniciales como procesados para evitar sonidos en carga inicial
      if (isInitialLoadRef.current) {
        top15.forEach(conv => {
          if (conv.id) processedMessagesRef.current.add(conv.id);
        });
        isInitialLoadRef.current = false;
      }
      
      setConversations(top15 as UChatConversation[]);

    } catch (error: any) {
      if (error?.status === 401 || error?.code === 'PGRST301') {
        // Error de permisos - silenciar
      }
      setConversations([]);
      setProspectosData(new Map());
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversation: UChatConversation) => {
    try {
      // Si tiene prospect_id, cargar desde mensajes_whatsapp (igual que LiveChatCanvas)
      if (conversation.prospect_id) {
        const { data: messagesData, error } = await analysisSupabase
          .from('mensajes_whatsapp')
          .select('*')
          .eq('prospecto_id', conversation.prospect_id)
          .order('fecha_hora', { ascending: true });

        if (error) throw error;

        // Obtener nombres de usuarios para mensajes con id_sender (igual que LiveChatCanvas)
        const senderIds = (messagesData || [])
          .filter((msg: any) => msg.id_sender)
          .map((msg: any) => msg.id_sender);
        
        const senderNamesMap: Record<string, string> = {};
        if (senderIds.length > 0) {
          try {
            const { data: usersData } = await supabaseSystemUI
              .from('auth_users')
              .select('id, full_name, first_name, last_name')
              .in('id', senderIds);
            
            if (usersData) {
              usersData.forEach(user => {
                senderNamesMap[user.id] = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
              });
            }
          } catch (error) {
          }
        }

        const adaptedMessages: Message[] = (messagesData || []).map((msg: any) => ({
          id: msg.id,
          message_id: `real_${msg.id}`,
          conversation_id: conversation.id,
          sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
          sender_name: msg.rol || 'Desconocido',
          id_sender: msg.id_sender || undefined,
          sender_user_name: msg.id_sender ? senderNamesMap[msg.id_sender] : undefined,
          content: msg.mensaje,
          is_read: msg.leido ?? true,
          created_at: msg.fecha_hora,
          adjuntos: msg.adjuntos // Incluir adjuntos multimedia
        }));

        setMessages(adaptedMessages);
      } else {
        // Fallback: cargar desde uchat_messages
        const { data, error } = await supabaseSystemUI
          .from('uchat_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      }
    } catch (error) {
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavigateToConversation = () => {
    if (!selectedConversation) return;
    
    // Redirigir al módulo de livechat con la conversación seleccionada
    setAppMode('live-chat');
    if (selectedConversation.prospect_id) {
      localStorage.setItem('livechat-prospect-id', selectedConversation.prospect_id);
    } else {
      localStorage.setItem('selected-conversation-id', selectedConversation.id);
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {!selectedConversation ? (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                Últimas Conversaciones
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {conversations.length}
              </span>
            </div>
          </div>

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
            <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No hay conversaciones
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {conversations.map((conv, index) => {
                  const prospectData = conv.prospect_id ? prospectosData.get(conv.prospect_id) : null;
                  const requiereAtencion = prospectData?.requiere_atencion_humana || false;
                  const unreadCount = Number(conv.unread_count ?? conv.mensajes_no_leidos ?? 0);
                  const hasUnread = unreadCount > 0;
                  
                  return (
                    <motion.div
                      key={conv.id || conv.prospecto_id || `conv-${index}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ 
                        layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.2 },
                        y: { duration: 0.2 }
                      }}
                      onClick={async () => {
                      // Marcar como leído al hacer clic
                      if (conv.prospect_id) {
                        // Marcar mensajes de WhatsApp como leídos
                        await analysisSupabase
                          .from('mensajes_whatsapp')
                          .update({ leido: true })
                          .eq('prospecto_id', conv.prospect_id)
                          .eq('leido', false)
                          .then(() => {
                            // Actualizar contador local
                            setConversations(prev => prev.map(c => 
                              c.id === conv.id || c.prospect_id === conv.prospect_id
                                ? { ...c, unread_count: 0, mensajes_no_leidos: 0 }
                                : c
                            ));
                          });
                      }
                      setSelectedConversation(conv);
                    }}
                    className={`relative p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-200 dark:border-gray-600 ${
                      hasUnread ? 'border-l-4 border-l-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        {/* Avatar con iniciales */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white">
                          {getInitials(conv.customer_name || conv.customer_phone)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {conv.customer_name || conv.customer_phone || 'Sin nombre'}
                            </p>
                          </div>
                        {conv.last_message_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(conv.last_message_at)}
                          </p>
                        )}
                        {conv.message_count !== undefined && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {conv.message_count} mensajes
                          </p>
                        )}
                        {/* Información de asignación - Mostrar según rol */}
                        {(user?.role_name === 'admin' || user?.role_name === 'coordinador') && (
                          <div className="mt-1.5">
                            <AssignmentBadge
                              call={{
                                coordinacion_codigo: conv.metadata?.coordinacion_codigo,
                                coordinacion_nombre: conv.metadata?.coordinacion_nombre,
                                ejecutivo_id: conv.metadata?.ejecutivo_id,
                                ejecutivo_nombre: conv.metadata?.ejecutivo_nombre,
                                ejecutivo_email: conv.metadata?.ejecutivo_email
                              } as any}
                              variant="compact"
                            />
                          </div>
                        )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {/* Flag de requiere atención - Alineado a la derecha */}
                        {requiereAtencion && (
                          <Flag className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />
                        )}
                        {/* Indicador de mensajes no leídos */}
                        {hasUnread && (
                          <div className="bg-green-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {Math.min(unreadCount, 99)}
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Header con botón de cerrar */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
              </button>
              {/* Avatar con iniciales - clickeable para abrir sidebar */}
              <div 
                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  const prospectId = selectedConversation.prospect_id || selectedConversation.prospecto_id;
                  
                  e.stopPropagation();
                  if (!prospectId) return;
                  
                  // Prevenir múltiples ejecuciones simultáneas
                  if (isOpeningSidebarRef.current) {
                    return;
                  }
                  
                  // Si ya está abierto con el mismo prospecto, no hacer nada
                  if (sidebarOpen && selectedProspectoIdForSidebar === prospectId) {
                    return;
                  }
                  
                  isOpeningSidebarRef.current = true;
                  
                  // Establecer el prospecto primero, luego abrir (igual que ProspectosManager)
                  setSelectedProspectoIdForSidebar(prospectId);
                  requestAnimationFrame(() => {
                    setSidebarOpen(true);
                    isOpeningSidebarRef.current = false;
                  });
                }}
              >
                {getInitials(selectedConversation.customer_name || selectedConversation.customer_phone)}
              </div>
              {/* Nombre clickeable */}
              <h3 
                className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                onClick={(e) => {
                  const prospectId = selectedConversation.prospect_id || selectedConversation.prospecto_id;
                  
                  e.stopPropagation();
                  if (!prospectId) return;
                  
                  // Prevenir múltiples ejecuciones simultáneas
                  if (isOpeningSidebarRef.current) {
                    return;
                  }
                  
                  // Si ya está abierto con el mismo prospecto, no hacer nada
                  if (sidebarOpen && selectedProspectoIdForSidebar === prospectId) {
                    return;
                  }
                  
                  isOpeningSidebarRef.current = true;
                  
                  // Establecer el prospecto primero, luego abrir (igual que ProspectosManager)
                  setSelectedProspectoIdForSidebar(prospectId);
                  requestAnimationFrame(() => {
                    setSidebarOpen(true);
                    isOpeningSidebarRef.current = false;
                  });
                }}
              >
                {selectedConversation.customer_name || selectedConversation.customer_phone}
              </h3>
            </div>
            <button
              onClick={() => setSelectedConversation(null)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
            {messages.map((msg) => {
              const isCustomer = msg.sender_type === 'customer';
              const isBot = msg.sender_type === 'bot';
              const isAgent = msg.sender_type === 'agent';
              
              // Parsear adjuntos si existen
              let adjuntos = null;
              if (msg.adjuntos) {
                try {
                  adjuntos = typeof msg.adjuntos === 'string' 
                    ? JSON.parse(msg.adjuntos) 
                    : msg.adjuntos;
                } catch (e) {
                  // Ignorar errores de parsing
                }
              }

              // Determinar si necesita globo (false para stickers y audios)
              const hasContent = msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0;
              const hasAdjuntos = adjuntos && Array.isArray(adjuntos) && adjuntos.length > 0;
              // Mostrar globo si hay contenido O si no hay adjuntos O si los adjuntos necesitan globo
              // Si hay contenido, SIEMPRE mostrar globo
              const shouldHaveBubble = hasContent || !hasAdjuntos || (hasAdjuntos && needsBubble(adjuntos));
              

              return (
                <div
                  key={msg.id}
                  className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} mb-4`}
                >
                  {/* Mensaje */}
                  <div className={`max-w-[80%] ${isCustomer ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
                    {/* Nombre del remitente */}
                    <div className={`text-xs text-gray-500 dark:text-gray-400 mb-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                      {isCustomer 
                        ? 'Cliente'
                        : isBot 
                          ? 'Bot Vidanta'
                          : (msg.sender_user_name || msg.sender_name || 'Agente')
                      }
                    </div>
                    
                    {/* Burbuja del mensaje - SIEMPRE mostrar globo cuando hay contenido o es agente */}
                    {(shouldHaveBubble || isAgent) ? (
                      <div
                        className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                          isCustomer
                            ? 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
                            : isBot
                              ? 'bg-blue-500 dark:bg-blue-600 text-white'
                              : 'bg-purple-700 dark:bg-purple-800 text-white'
                        }`}
                      >
                        {hasContent && (
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content.replace(/\\n/g, '\n')}
                          </div>
                        )}
                        
                        {/* Si es agente y no hay contenido, mostrar algo para que el globo sea visible */}
                        {isAgent && !hasContent && !hasAdjuntos && (
                          <div className="text-sm leading-relaxed whitespace-pre-wrap opacity-50">
                            {' '}
                          </div>
                        )}
                        
                        {/* Multimedia con globo */}
                        {hasAdjuntos && (
                          <div className={hasContent ? 'mt-2' : ''}>
                            <MultimediaMessage 
                              adjuntos={adjuntos}
                              hasTextContent={hasContent}
                              isFromCustomer={isCustomer}
                              isVisible={true}
                            />
                          </div>
                        )}
                        
                        {/* Timestamp - siempre visible */}
                        <div className={`text-xs opacity-75 mt-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ) : (
                      /* SIN GLOBO: Stickers y audios solamente (estilo WhatsApp) */
                      <div className="flex flex-col">
                        {hasAdjuntos && (
                          <MultimediaMessage 
                            adjuntos={adjuntos}
                            hasTextContent={false}
                            isFromCustomer={isCustomer}
                            isVisible={true}
                          />
                        )}
                        {/* Timestamp pequeño debajo */}
                        <div className={`text-xs text-gray-400 dark:text-gray-500 mt-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Avatar - solo uno, después del mensaje */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white shadow-sm ${
                      isCustomer 
                        ? 'order-1 bg-gradient-to-br from-gray-400 to-gray-600' 
                        : isBot 
                          ? 'order-2 bg-gradient-to-br from-blue-500 to-blue-700' 
                          : 'order-2 bg-gradient-to-br from-gray-800 to-gray-900'
                    }`}
                    title={isCustomer 
                      ? (selectedConversation?.customer_name || 'Cliente')
                      : isBot 
                        ? 'Bot Vidanta'
                        : (msg.sender_user_name || msg.sender_name || 'Agente')
                    }
                  >
                    {isCustomer 
                      ? (selectedConversation?.customer_name?.charAt(0).toUpperCase() || 
                         selectedConversation?.customer_phone?.charAt(0).toUpperCase() || 
                         'C')
                      : isBot 
                        ? 'B'
                        : (() => {
                            // Si hay sender_user_name, usar ese nombre para las iniciales
                            if (msg.sender_user_name) {
                              const parts = msg.sender_user_name.trim().split(' ');
                              if (parts.length >= 2) {
                                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                              }
                              return msg.sender_user_name.substring(0, 2).toUpperCase();
                            }
                            return (msg.sender_name?.charAt(0).toUpperCase() || 'A');
                          })()
                    }
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Botón para ir a la conversación */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleNavigateToConversation}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="text-sm font-medium">Ir a la conversación</span>
            </button>
          </div>
        </>
      )}

      {/* Sidebar de Prospecto - Solo renderizar si hay prospecto seleccionado */}
      {selectedProspectoIdForSidebar && (
        <ProspectoSidebar
          key={`conversaciones-widget-${selectedProspectoIdForSidebar}`}
          prospectoId={selectedProspectoIdForSidebar}
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          onNavigateToLiveChat={(prospectoId) => {
            setSidebarOpen(false);
            setAppMode('live-chat');
            localStorage.setItem('livechat-prospect-id', prospectoId);
          }}
        />
      )}
    </div>
  );
};
