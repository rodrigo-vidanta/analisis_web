/**
 * Widget de Últimas Conversaciones
 * Basado en LiveChatCanvas - muestra conversaciones asignadas según permisos
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, ChevronRight, Loader2, X, Flag } from 'lucide-react';
import { supabaseSystemUI } from '../../../config/supabaseSystemUI';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { uchatService, type UChatConversation } from '../../../services/uchatService';
import { permissionsService } from '../../../services/permissionsService';
import { coordinacionService } from '../../../services/coordinacionService';
import { useAppStore } from '../../../stores/appStore';
import { useAuth } from '../../../contexts/AuthContext';
import { AssignmentBadge } from '../../analysis/AssignmentBadge';
import { MultimediaMessage } from '../../chat/MultimediaMessage';

interface Message {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_name?: string;
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

  useEffect(() => {
    console.log('🔄 [ConversacionesWidget] useEffect ejecutado, userId:', userId);
    
    if (!userId) {
      console.log('⚠️ [ConversacionesWidget] No hay userId, no se cargan conversaciones');
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
              return updated.slice(0, 10);
            } else {
              const updated = [...prev, updatedConv as UChatConversation]
                .sort((a, b) => {
                  const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                               a.updated_at ? new Date(a.updated_at).getTime() : 0;
                  const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                               b.updated_at ? new Date(b.updated_at).getTime() : 0;
                  return dateB - dateA;
                });
              return updated.slice(0, 10);
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
              return updated.slice(0, 10);
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
      console.log('⚠️ [ConversacionesWidget] No hay userId, no se cargan conversaciones');
      setLoading(false);
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 [ConversacionesWidget] Cargando conversaciones para userId:', userId);
      
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

      console.log('✅ [ConversacionesWidget] UChat conversaciones:', uchatConversationsRaw?.length || 0);
      console.log('✅ [ConversacionesWidget] WhatsApp conversaciones (RPC):', rpcDataResult.data?.length || 0);

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
      
      // Tomar las 10 más recientes
      const top10 = sorted.slice(0, 10);
      console.log('📊 [ConversacionesWidget] Top 10 conversaciones seleccionadas:', top10.length);
      setConversations(top10 as UChatConversation[]);

    } catch (error: any) {
      console.error('❌ [ConversacionesWidget] Error cargando conversaciones:', error);
      if (error?.status === 401 || error?.code === 'PGRST301') {
        console.warn('⚠️ [ConversacionesWidget] Error de permisos al cargar conversaciones');
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

        const adaptedMessages: Message[] = (messagesData || []).map((msg: any) => ({
          id: msg.id,
          message_id: `real_${msg.id}`,
          conversation_id: conversation.id,
          sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
          sender_name: msg.rol || 'Desconocido',
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
      console.error('Error cargando mensajes:', error);
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
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
              conversations.map((conv, index) => {
                const prospectData = conv.prospect_id ? prospectosData.get(conv.prospect_id) : null;
                const requiereAtencion = prospectData?.requiere_atencion_humana || false;
                const unreadCount = Number(conv.unread_count ?? conv.mensajes_no_leidos ?? 0);
                const hasUnread = unreadCount > 0;
                
                return (
                  <motion.div
                    key={conv.id || conv.prospecto_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
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
              })
            )}
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
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

              return (
                <div
                  key={msg.id}
                  className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] ${isCustomer ? 'order-2 ml-2' : 'order-1 mr-2'}`}>
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        isCustomer
                          ? 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
                          : isBot
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-900 dark:bg-gray-800 text-white'
                      }`}
                    >
                      {msg.content && (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}
                      
                      {/* Multimedia - imágenes pequeñas sin click */}
                      {adjuntos && Array.isArray(adjuntos) && adjuntos.length > 0 && (
                        <div className="mt-2 [&_img]:max-w-[150px] [&_img]:max-h-[150px] [&_img]:cursor-default [&_img]:pointer-events-none [&_img]:hover:opacity-100 [&_img]:hover:scale-100 [&_p]:hidden [&_span]:hidden">
                          <MultimediaMessage 
                            adjuntos={adjuntos}
                            hasTextContent={!!msg.content}
                            isFromCustomer={isCustomer}
                            isVisible={true}
                          />
                        </div>
                      )}
                      
                      <div className={`text-xs opacity-75 mt-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white ${
                      isCustomer ? 'order-1 bg-gradient-to-br from-gray-400 to-gray-600' : 
                      isBot ? 'order-2 bg-gradient-to-br from-blue-500 to-blue-700' : 
                      'order-2 bg-gradient-to-br from-gray-800 to-gray-900'
                    }`}
                  >
                    {isCustomer 
                      ? (selectedConversation?.customer_name?.charAt(0).toUpperCase() || 'C')
                      : isBot 
                        ? 'B'
                        : 'A'
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
    </div>
  );
};
