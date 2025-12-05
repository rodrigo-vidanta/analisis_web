/**
 * Widget de Últimas Conversaciones
 * Basado en LiveChatCanvas - muestra conversaciones asignadas según permisos
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ChevronRight, Loader2, X, Flag, Pause } from 'lucide-react';
import { supabaseSystemUI } from '../../../config/supabaseSystemUI';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { uchatService, type UChatConversation } from '../../../services/uchatService';
import { permissionsService } from '../../../services/permissionsService';
import { coordinacionService } from '../../../services/coordinacionService';
import { prospectsService } from '../../../services/prospectsService';
import { useAppStore } from '../../../stores/appStore';
import { useAuth } from '../../../contexts/AuthContext';
import { AssignmentBadge } from '../../analysis/AssignmentBadge';
import { MultimediaMessage, needsBubble } from '../../chat/MultimediaMessage';
import { ProspectoSidebar } from '../../prospectos/ProspectosManager';
import { CallDetailModalSidebar } from '../../chat/CallDetailModalSidebar';
import { createPortal } from 'react-dom';
import { notificationSoundService } from '../../../services/notificationSoundService';
import { systemNotificationService } from '../../../services/systemNotificationService';
import { botPauseService } from '../../../services/botPauseService';
import { getAvatarGradient } from '../../../utils/avatarGradient';

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
  const prospectosDataRef = useRef<Map<string, any>>(new Map());
  const coordinacionesMapRef = useRef<Map<string, any>>(new Map());
  const ejecutivosMapRef = useRef<Map<string, any>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProspectoIdForSidebar, setSelectedProspectoIdForSidebar] = useState<string | null>(null);
  const [selectedProspectoForSidebar, setSelectedProspectoForSidebar] = useState<any | null>(null);
  const isOpeningSidebarRef = useRef(false);
  // Estados para el modal de detalle de llamada
  const [callDetailModalOpen, setCallDetailModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; alt: string } | null>(null);
  const [botPauseStatus, setBotPauseStatus] = useState<{[uchatId: string]: {
    isPaused: boolean;
    pausedUntil: Date | null;
    pausedBy: string;
    duration: number | null;
  }}>({});
  const [imageUrlsCache, setImageUrlsCache] = useState<Record<string, string>>({});
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
  const [prospectosDataVersion, setProspectosDataVersion] = useState(0); // Para forzar re-render cuando cambia el Map
  
  // Función helper para generar URL de imagen (reutiliza lógica de MultimediaMessage)
  const generateImageUrl = async (adjunto: any): Promise<string | null> => {
    const filename = adjunto.filename || adjunto.archivo;
    const bucket = adjunto.bucket || 'whatsapp-media';
    
    if (!filename) return null;
    
    const cacheKey = `${bucket}/${filename}`;
    
    // Verificar cache local primero
    const cached = localStorage.getItem(`media_${cacheKey}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (parsed.url && parsed.timestamp && (now - parsed.timestamp) < 25 * 60 * 1000) {
          return parsed.url;
        }
      } catch (e) {
        localStorage.removeItem(`media_${cacheKey}`);
      }
    }
    
    // Generar nueva URL
    try {
      const response = await fetch('https://function-bun-dev-6d8e.up.railway.app/generar-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': '93fbcfc4-ccc9-4023-b820-86ef98f10122'
        },
        body: JSON.stringify({
          filename: filename,
          bucket: bucket,
          expirationMinutes: 30
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const url = data[0]?.url || data.url;
      
      if (url) {
        localStorage.setItem(`media_${cacheKey}`, JSON.stringify({
          url,
          timestamp: Date.now()
        }));
      }
      
      return url || null;
    } catch (error) {
      // Silenciar errores
      return null;
    }
  };

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
    // Limpiar después de que la animación termine
    setTimeout(() => {
      setSelectedProspectoIdForSidebar(null);
      setSelectedProspectoForSidebar(null);
    }, 300);
  }, []);

  // Usar la función utilitaria para obtener iniciales (mantener compatibilidad)
  const getInitials = (name: string | undefined | null): string => {
    return getAvatarGradient(name).initials;
  };

  // Cargar estado de pausa del bot y suscripción realtime (igual que LiveChatCanvas)
  useEffect(() => {
    let pauseChannel: any = null;
    
    const loadBotPauseStatus = async () => {
      try {
        const activePausesFromDB = await botPauseService.getAllActivePauses();
        const dbPauses: any = {};
        
        activePausesFromDB.forEach(pause => {
          dbPauses[pause.uchat_id] = {
            isPaused: pause.is_paused,
            pausedUntil: pause.paused_until ? new Date(pause.paused_until) : null,
            pausedBy: pause.paused_by,
            duration: pause.duration_minutes
          };
        });

        // Crear un nuevo objeto para asegurar que React detecte el cambio
        setBotPauseStatus({ ...dbPauses });
      } catch (error) {
        // Silenciar errores
      }
    };

    loadBotPauseStatus();
    
    // Suscripción realtime a cambios en bot_pause_status
    // Usar un nombre de canal único pero estable
    const channelName = `bot-pause-status-dashboard-${user?.id || 'anonymous'}`;
    pauseChannel = supabaseSystemUI
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bot_pause_status'
        },
        async (payload) => {
          // Recargar estado completo desde BD cuando hay cambios
          try {
            const newPauses = await botPauseService.getAllActivePauses();
            const dbPauses: any = {};
            
            newPauses.forEach(pause => {
              dbPauses[pause.uchat_id] = {
                isPaused: pause.is_paused,
                pausedUntil: pause.paused_until ? new Date(pause.paused_until) : null,
                pausedBy: pause.paused_by,
                duration: pause.duration_minutes
              };
            });
            
            // Actualizar estado solo si realmente cambió
            setBotPauseStatus(prev => {
              const prevKeys = Object.keys(prev).sort().join(',');
              const newKeys = Object.keys(dbPauses).sort().join(',');
              
              if (prevKeys !== newKeys) {
                return { ...dbPauses };
              }
              
              // Comparar valores
              let hasChanges = false;
              for (const key of Object.keys(dbPauses)) {
                const prevStatus = prev[key];
                const newStatus = dbPauses[key];
                if (!prevStatus || 
                    prevStatus.isPaused !== newStatus.isPaused ||
                    (prevStatus.pausedUntil?.getTime() !== newStatus.pausedUntil?.getTime())) {
                  hasChanges = true;
                  break;
                }
              }
              
              // También verificar si se eliminó alguna pausa
              for (const key of Object.keys(prev)) {
                if (!dbPauses[key]) {
                  hasChanges = true;
                  break;
                }
              }
              
              return hasChanges ? { ...dbPauses } : prev;
            });
          } catch (error) {
            // Silenciar errores
          }
        }
      )
      .subscribe();
    
    // Timer para actualizar contador cada segundo y recargar estado cada 5 segundos
    // Esto funciona como fallback si realtime no funciona
    let reloadCounter = 0;
    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      
      // Cada 5 segundos, recargar estado completo desde BD (fallback para realtime)
      reloadCounter++;
      if (reloadCounter >= 5) {
        reloadCounter = 0;
        botPauseService.getAllActivePauses().then(newPauses => {
          const dbPauses: any = {};
          newPauses.forEach(pause => {
            dbPauses[pause.uchat_id] = {
              isPaused: pause.is_paused,
              pausedUntil: pause.paused_until ? new Date(pause.paused_until) : null,
              pausedBy: pause.paused_by,
              duration: pause.duration_minutes
            };
          });
          
          setBotPauseStatus(prev => {
            const prevKeys = Object.keys(prev).sort().join(',');
            const newKeys = Object.keys(dbPauses).sort().join(',');
            
            if (prevKeys !== newKeys) {
              return { ...dbPauses };
            }
            
            let hasChanges = false;
            for (const key of Object.keys(dbPauses)) {
              const prevStatus = prev[key];
              const newStatus = dbPauses[key];
              if (!prevStatus || 
                  prevStatus.isPaused !== newStatus.isPaused ||
                  prevStatus.pausedUntil?.getTime() !== newStatus.pausedUntil?.getTime()) {
                hasChanges = true;
                break;
              }
            }
            
          if (hasChanges) {
            return { ...dbPauses };
          }
            
            return prev;
          });
        }).catch(() => {
          // Silenciar errores de polling
        });
      }
      
      // Limpiar pausas expiradas cada segundo
      startTransition(() => {
        setBotPauseStatus(prev => {
          const updated = { ...prev };
          let hasChanges = false;
          
          Object.entries(updated).forEach(([uchatId, status]) => {
            if (status.isPaused && status.pausedUntil) {
              const pausedUntilTime = status.pausedUntil instanceof Date 
                ? status.pausedUntil.getTime() 
                : new Date(status.pausedUntil).getTime();
              
              if (currentTime > pausedUntilTime + 2000) {
                delete updated[uchatId];
                hasChanges = true;
              }
            }
          });
          
          return hasChanges ? { ...updated } : prev;
        });
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (pauseChannel) {
        try {
          pauseChannel.unsubscribe();
        } catch (e) {
          // Ignorar errores al desconectar
        }
      }
    };
  }, [user?.id]);
  
  // Recargar estado de pausa cuando cambia la conversación seleccionada
  useEffect(() => {
    if (selectedConversation) {
      const loadPauseForConversation = async () => {
        const uchatId = selectedConversation.metadata?.id_uchat || 
          selectedConversation.id_uchat || 
          selectedConversation.conversation_id || 
          selectedConversation.id;
        
        if (uchatId) {
          const pauseStatus = await botPauseService.getPauseStatus(uchatId);
          if (pauseStatus) {
            setBotPauseStatus(prev => ({
              ...prev,
              [uchatId]: {
                isPaused: pauseStatus.is_paused,
                pausedUntil: pauseStatus.paused_until ? new Date(pauseStatus.paused_until) : null,
                pausedBy: pauseStatus.paused_by,
                duration: pauseStatus.duration_minutes
              }
            }));
          }
        }
      };
      
      loadPauseForConversation();
    }
  }, [selectedConversation]);

  // Actualizar ref cuando cambian las conversaciones
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

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
        if (realtimeChannelRef.current.prospectos) {
          try {
            realtimeChannelRef.current.prospectos.unsubscribe();
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

  // Ref para canal de mensajes de la conversación seleccionada
  const messagesChannelRef = useRef<any>(null);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      
      // Limpiar canal anterior si existe
      if (messagesChannelRef.current) {
        try {
          messagesChannelRef.current.unsubscribe();
        } catch (e) {}
        messagesChannelRef.current = null;
      }

      // Suscripción realtime específica para mensajes de esta conversación
      const conversationId = selectedConversation.id;
      const prospectId = selectedConversation.prospect_id || selectedConversation.prospecto_id;
      
      if (prospectId) {
        // Suscripción para mensajes_whatsapp
        const whatsappMessagesChannel = analysisSupabase
          .channel(`mensajes-whatsapp-conversation-${prospectId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'mensajes_whatsapp',
              filter: `prospecto_id=eq.${prospectId}`
            },
            (payload) => {
              const newMessage = payload.new as any;
              // Recargar mensajes cuando llega uno nuevo
              loadMessages(selectedConversation);
              
              // Reproducir sonido si es del cliente
              if (newMessage.rol === 'Prospecto' && newMessage.id && !processedMessagesRef.current.has(newMessage.id)) {
                processedMessagesRef.current.add(newMessage.id);
                notificationSoundService.playNotification('message');
                
                // Mostrar notificación del sistema
                const customerName = newMessage.nombre_contacto || newMessage.customer_name || 'Cliente';
                const messagePreview = newMessage.mensaje || newMessage.message || '';
                systemNotificationService.showMessageNotification({
                  customerName,
                  messagePreview,
                  conversationId: selectedConversation?.id,
                  prospectId: selectedConversation?.prospect_id
                });
              }
            }
          )
          .subscribe();
        
        messagesChannelRef.current = whatsappMessagesChannel;
      } else if (conversationId) {
        // Suscripción para uchat_messages
        const uchatMessagesChannel = supabaseSystemUI
          .channel(`uchat-messages-conversation-${conversationId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'uchat_messages',
              filter: `conversation_id=eq.${conversationId}`
            },
            (payload) => {
              const newMessage = payload.new as any;
              // Recargar mensajes cuando llega uno nuevo
              loadMessages(selectedConversation);
              
              // Reproducir sonido si es del cliente
              if (newMessage.sender_type === 'customer' && newMessage.id && !processedMessagesRef.current.has(newMessage.id)) {
                processedMessagesRef.current.add(newMessage.id);
                notificationSoundService.playNotification('message');
                
                // Mostrar notificación del sistema
                const customerName = newMessage.sender_name || 'Cliente';
                const messagePreview = newMessage.content || newMessage.text || '';
                systemNotificationService.showMessageNotification({
                  customerName,
                  messagePreview,
                  conversationId: newMessage.conversation_id,
                  prospectId: selectedConversation?.prospect_id
                });
              }
            }
          )
          .subscribe();
        
        messagesChannelRef.current = uchatMessagesChannel;
      }

      return () => {
        if (messagesChannelRef.current) {
          try {
            messagesChannelRef.current.unsubscribe();
          } catch (e) {}
          messagesChannelRef.current = null;
        }
      };
    } else {
      // Limpiar canal cuando no hay conversación seleccionada
      if (messagesChannelRef.current) {
        try {
          messagesChannelRef.current.unsubscribe();
        } catch (e) {}
        messagesChannelRef.current = null;
      }
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar URLs de imágenes del bot cuando cambian los mensajes
  useEffect(() => {
    const loadBotImageUrls = async () => {
      const botMessages = messages.filter(msg => msg.sender_type === 'bot' && msg.adjuntos);
      
      for (const msg of botMessages) {
        let adjuntos = null;
        if (msg.adjuntos) {
          try {
            adjuntos = typeof msg.adjuntos === 'string' 
              ? JSON.parse(msg.adjuntos) 
              : msg.adjuntos;
          } catch (e) {
            continue;
          }
        }
        
        if (!adjuntos || !Array.isArray(adjuntos)) continue;
        
        const imageAdjuntos = adjuntos.filter((adj: any) => {
          const filename = adj.filename || adj.archivo || '';
          const tipo = (adj.tipo || '').toLowerCase();
          return tipo.includes('imagen') || tipo.includes('image') || 
                 filename.match(/\.(jpg|jpeg|png|bmp|svg|webp|gif)$/i);
        });
        
        for (const adjunto of imageAdjuntos) {
          const filename = adjunto.filename || adjunto.archivo;
          const bucket = adjunto.bucket || 'whatsapp-media';
          const cacheKey = `${bucket}/${filename}`;
          
          if (!imageUrlsCache[cacheKey] && !imageLoadingStates[cacheKey] && filename) {
            setImageLoadingStates(prev => ({ ...prev, [cacheKey]: true }));
            const url = await generateImageUrl(adjunto);
            if (url) {
              setImageUrlsCache(prev => ({ ...prev, [cacheKey]: url }));
            }
            setImageLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
          }
        }
      }
    };
    
    loadBotImageUrls();
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
          startTransition(() => {
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
                // Si no existe y tiene last_message_at reciente, añadirla al top 15
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
          startTransition(() => {
            setConversations(prev => {
              const exists = prev.find(c => c.id === newConv.id);
              if (exists) return prev;
              
              const updated = [...prev, newConv as UChatConversation]
                .sort((a, b) => {
                  const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                               a.updated_at ? new Date(a.updated_at).getTime() : 0;
                  const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                               b.updated_at ? new Date(b.updated_at).getTime() : 0;
                  return dateB - dateA;
                });
              return updated.slice(0, 15);
            });
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
            
            // Mostrar notificación del sistema
            const customerName = newMessage.sender_name || 'Cliente';
            const messagePreview = newMessage.content || newMessage.text || '';
            systemNotificationService.showMessageNotification({
              customerName,
              messagePreview,
              conversationId: newMessage.conversation_id
            });
          }
          
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            loadMessages(selectedConversation);
          }
          
          if (newMessage.conversation_id) {
            // Incrementar contador de no leídos si el mensaje es del cliente
            const isFromCustomer = newMessage.sender_type === 'customer';
            startTransition(() => {
              setConversations(prev => {
                const existingIndex = prev.findIndex(c => c.id === newMessage.conversation_id);
                
                if (existingIndex !== -1) {
                  // La conversación ya está en la lista, actualizarla
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
                } else {
                  // La conversación no está en la lista, cargarla y añadirla al top 15
                  (async () => {
                    try {
                      // Cargar la conversación desde uchat
                      const convData = await uchatService.getConversations({
                        userId: userId || '',
                        limit: 100
                      });
                      
                      const newConv = convData.find(c => c.id === newMessage.conversation_id);
                      if (newConv) {
                        // Enriquecer con datos de prospecto
                        const prospectoData = newConv.prospect_id ? prospectosDataRef.current.get(newConv.prospect_id) : null;
                        const coordinacionId = prospectoData?.coordinacion_id;
                        const ejecutivoId = prospectoData?.ejecutivo_id;
                        const coordinacionInfo = coordinacionId ? coordinacionesMapRef.current.get(coordinacionId) : null;
                        const ejecutivoInfo = ejecutivoId ? ejecutivosMapRef.current.get(ejecutivoId) : null;
                        
                        const enrichedConv: UChatConversation = {
                          ...newConv,
                          prospecto_id: newConv.prospect_id,
                          customer_name: newConv.customer_name || newConv.customer_phone,
                          customer_phone: newConv.customer_phone,
                          last_message_at: newMessage.created_at,
                          updated_at: newMessage.created_at,
                          message_count: (newConv.message_count || 0) + 1,
                          unread_count: isFromCustomer ? 1 : 0,
                          mensajes_no_leidos: isFromCustomer ? 1 : 0,
                          metadata: {
                            ...newConv.metadata,
                            id_uchat: newConv.metadata?.id_uchat || newConv.id_uchat || newConv.conversation_id,
                            coordinacion_id: coordinacionId,
                            coordinacion_codigo: coordinacionInfo?.codigo,
                            coordinacion_nombre: coordinacionInfo?.nombre,
                            ejecutivo_id: ejecutivoId,
                            ejecutivo_nombre: ejecutivoInfo?.full_name,
                            ejecutivo_email: ejecutivoInfo?.email
                          }
                        };
                        
                        startTransition(() => {
                          setConversations(prev => {
                            const exists = prev.find(c => c.id === enrichedConv.id);
                            if (exists) return prev;
                            
                            const updated = [enrichedConv, ...prev].sort((a, b) => {
                              const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                                           a.updated_at ? new Date(a.updated_at).getTime() : 0;
                              const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                                           b.updated_at ? new Date(b.updated_at).getTime() : 0;
                              return dateB - dateA;
                            });
                            return updated.slice(0, 15);
                          });
                        });
                      }
                    } catch (error) {
                      // Silenciar errores
                    }
                  })();
                  
                  // Retornar lista actual mientras carga
                  return prev;
                }
              });
            });
          }
        }
      )
      .subscribe();

    // Canal para cambios en prospectos (requiere_atencion_humana, motivo_handoff, nombre)
    const prospectosChannel = analysisSupabase
      .channel(`prospectos-dashboard-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospectos'
        },
        (payload) => {
          const updatedProspecto = payload.new as any;
          const oldProspecto = payload.old as any;
          const prospectoId = updatedProspecto.id;
          
          // Actualizar requiere_atencion_humana y motivo_handoff en el Map
          const requiereAtencionChanged = oldProspecto?.requiere_atencion_humana !== updatedProspecto.requiere_atencion_humana;
          const motivoHandoffChanged = oldProspecto?.motivo_handoff !== updatedProspecto.motivo_handoff;
          
          if (requiereAtencionChanged || motivoHandoffChanged || updatedProspecto.nombre_completo || updatedProspecto.nombre_whatsapp) {
            startTransition(() => {
              // Actualizar el Map de prospectos
              setProspectosData(prev => {
                const updated = new Map(prev);
                const existing = updated.get(prospectoId);
                if (existing) {
                  updated.set(prospectoId, {
                    ...existing,
                    requiere_atencion_humana: updatedProspecto.requiere_atencion_humana || false,
                    motivo_handoff: updatedProspecto.motivo_handoff || null,
                    nombre_completo: updatedProspecto.nombre_completo || existing.nombre_completo,
                    nombre_whatsapp: updatedProspecto.nombre_whatsapp || existing.nombre_whatsapp
                  });
                } else {
                  // Si no existe, añadirlo con los datos básicos
                  updated.set(prospectoId, {
                    id: prospectoId,
                    requiere_atencion_humana: updatedProspecto.requiere_atencion_humana || false,
                    motivo_handoff: updatedProspecto.motivo_handoff || null,
                    nombre_completo: updatedProspecto.nombre_completo,
                    nombre_whatsapp: updatedProspecto.nombre_whatsapp,
                    coordinacion_id: updatedProspecto.coordinacion_id,
                    ejecutivo_id: updatedProspecto.ejecutivo_id
                  });
                }
                // Actualizar también el ref
                prospectosDataRef.current = updated;
                // Incrementar versión para forzar re-render
                setProspectosDataVersion(prev => prev + 1);
                return updated;
              });
              
              // Actualizar las conversaciones que corresponden a este prospecto
              // Esto fuerza un re-render con los nuevos datos del prospecto
              setConversations(prev => {
                return prev.map(conv => {
                  const matchesProspect = conv.prospect_id === prospectoId || conv.prospecto_id === prospectoId;
                  if (matchesProspect) {
                    // Crear un nuevo objeto de conversación para forzar re-render
                    return {
                      ...conv,
                      // Actualizar customer_name si cambió el nombre
                      customer_name: updatedProspecto.nombre_completo || updatedProspecto.nombre_whatsapp || conv.customer_name,
                      nombre_contacto: updatedProspecto.nombre_completo || updatedProspecto.nombre_whatsapp || conv.nombre_contacto
                    };
                  }
                  return conv;
                });
              });
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
            
            // Mostrar notificación del sistema
            const customerName = newMessage.nombre_contacto || newMessage.customer_name || 'Cliente';
            const messagePreview = newMessage.mensaje || newMessage.message || '';
            systemNotificationService.showMessageNotification({
              customerName,
              messagePreview,
              prospectId: newMessage.prospecto_id
            });
          }
          
          if (selectedConversation && selectedConversation.prospect_id === newMessage.prospecto_id) {
            loadMessages(selectedConversation);
          }
          
          startTransition(() => {
            setConversations(prev => {
              const existingIndex = prev.findIndex(c => {
                const matchesProspect = c.prospect_id === newMessage.prospecto_id;
                const matchesPhone = c.customer_phone && newMessage.prospecto_id && 
                  (c.customer_phone.includes(newMessage.prospecto_id) || 
                   c.metadata?.prospect_id === newMessage.prospecto_id);
                return matchesProspect || matchesPhone;
              });
              
              if (existingIndex !== -1) {
                // La conversación ya está en la lista, actualizarla
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
                return updated.slice(0, 15);
              } else {
                // La conversación no está en la lista, cargarla y añadirla al top 15
                (async () => {
                  try {
                    // Cargar la conversación desde RPC
                    const { data: rpcData } = await analysisSupabase.rpc('get_conversations_ordered');
                    if (!rpcData) return;
                    
                    const newConvData = rpcData.find((c: any) => c.prospecto_id === newMessage.prospecto_id);
                    if (!newConvData) return;
                    
                    // Enriquecer con datos de prospecto
                    const prospectoData = newConvData.prospecto_id ? prospectosDataRef.current.get(newConvData.prospecto_id) : null;
                    const coordinacionId = prospectoData?.coordinacion_id;
                    const ejecutivoId = prospectoData?.ejecutivo_id;
                    const coordinacionInfo = coordinacionId ? coordinacionesMapRef.current.get(coordinacionId) : null;
                    const ejecutivoInfo = ejecutivoId ? ejecutivosMapRef.current.get(ejecutivoId) : null;
                    
                    const enrichedConv: UChatConversation = {
                      id: newConvData.prospecto_id,
                      conversation_id: newConvData.prospecto_id,
                      prospect_id: newConvData.prospecto_id,
                      prospecto_id: newConvData.prospecto_id,
                      customer_name: newConvData.nombre_contacto || newConvData.numero_telefono,
                      customer_phone: newConvData.numero_telefono,
                      status: newConvData.estado_prospecto || 'active',
                      last_message_at: messageTimestamp,
                      message_count: (newConvData.mensajes_totales || 0) + 1,
                      unread_count: newMessage.rol === 'Prospecto' ? 1 : 0,
                      mensajes_no_leidos: newMessage.rol === 'Prospecto' ? 1 : 0,
                      updated_at: messageTimestamp,
                      id_uchat: prospectoData?.id_uchat || newConvData.id_uchat,
                      metadata: {
                        prospect_id: newConvData.prospecto_id,
                        id_uchat: prospectoData?.id_uchat || newConvData.id_uchat,
                        coordinacion_id: coordinacionId,
                        coordinacion_codigo: coordinacionInfo?.codigo,
                        coordinacion_nombre: coordinacionInfo?.nombre,
                        ejecutivo_id: ejecutivoId,
                        ejecutivo_nombre: ejecutivoInfo?.full_name,
                        ejecutivo_email: ejecutivoInfo?.email
                      }
                    };
                    
                    startTransition(() => {
                      setConversations(prev => {
                        const exists = prev.find(c => c.prospect_id === enrichedConv.prospect_id || c.prospecto_id === enrichedConv.prospecto_id);
                        if (exists) return prev;
                        
                        const updated = [enrichedConv, ...prev].sort((a, b) => {
                          const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 
                                       a.updated_at ? new Date(a.updated_at).getTime() : 0;
                          const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 
                                       b.updated_at ? new Date(b.updated_at).getTime() : 0;
                          return dateB - dateA;
                        });
                        return updated.slice(0, 15);
                      });
                    });
                  } catch (error) {
                    // Silenciar errores
                  }
                })();
                
                // Retornar lista actual mientras carga
                return prev;
              }
            });
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = { uchat: uchatChannel, whatsapp: whatsappChannel, prospectos: prospectosChannel };
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
          limit: 15
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
              .select('id, coordinacion_id, ejecutivo_id, requiere_atencion_humana, motivo_handoff, nombre_completo, nombre_whatsapp, id_uchat')
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
      // Actualizar refs también
      prospectosDataRef.current = prospectosDataMap;
      coordinacionesMapRef.current = coordinacionesMapData;
      ejecutivosMapRef.current = ejecutivosMapData;

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
            // Asegurar que id_uchat esté en metadata (prioridad: metadata existente > id_uchat directo > conversation_id)
            id_uchat: conv.metadata?.id_uchat || conv.id_uchat || conv.conversation_id,
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
        
        // Obtener id_uchat: prioridad: prospectoData.id_uchat > c.id_uchat
        const idUchat = prospectoData?.id_uchat || c.id_uchat;

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
          id_uchat: idUchat, // Agregar id_uchat directamente también
          metadata: {
            prospect_id: c.prospecto_id,
            id_uchat: idUchat, // Usar el id_uchat del prospecto si está disponible
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
                  
                  // Obtener uchatId - este es el ID que se usa para guardar en bot_pause_status
                  // Prioridad: metadata.id_uchat > id_uchat > conversation_id > id
                  const uchatId = conv.metadata?.id_uchat || 
                    conv.id_uchat || 
                    conv.conversation_id || 
                    conv.id;
                  
                  // Verificar si el bot está pausado para esta conversación
                  // Buscar directamente por uchat_id (que es como se guarda en la BD)
                  const pauseStatus = uchatId ? botPauseStatus[uchatId] : null;
                  
                  const isBotPaused = pauseStatus?.isPaused && (
                    pauseStatus.pausedUntil === null || 
                    pauseStatus.pausedUntil > new Date()
                  );
                  
                  // Crear una key única que incluya el estado de pausa y requiere_atencion para forzar re-render cuando cambia
                  const pauseKey = isBotPaused ? `paused-${pauseStatus?.pausedUntil?.getTime() || 'indefinite'}` : 'active';
                  const requiereAtencionKey = requiereAtencion ? 'requiere-atencion' : 'normal';
                  const uniqueKey = `${conv.id || conv.prospecto_id || `conv-${index}`}-${pauseKey}-${requiereAtencionKey}-v${prospectosDataVersion}`;
                  
                  return (
                    <div
                      key={uniqueKey}
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
                        {/* Avatar con iniciales o icono de pausa con animación sutil */}
                        {isBotPaused ? (
                          <motion.div
                            key={`paused-${uchatId}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                          >
                            <Pause className="w-4 h-4 text-white" fill="white" />
                          </motion.div>
                        ) : (
                          (() => {
                            const { gradientClass, initials } = getAvatarGradient(conv.customer_name || conv.customer_phone);
                            return (
                              <motion.div
                                key={`active-${uchatId}`}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className={`w-8 h-8 rounded-full ${gradientClass} flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white`}
                              >
                                {initials}
                              </motion.div>
                            );
                          })()
                        )}
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
                  </div>
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
              {/* Avatar con iniciales o icono de pausa - clickeable para abrir sidebar */}
              {(() => {
                // Obtener uchatId una sola vez
                const uchatId = selectedConversation.metadata?.id_uchat || 
                  selectedConversation.id_uchat || 
                  selectedConversation.conversation_id || 
                  selectedConversation.id;
                
                // Verificar si el bot está pausado para esta conversación
                // Acceso directo a botPauseStatus para que React detecte cambios
                const pauseStatus = uchatId ? botPauseStatus[uchatId] : null;
                const isBotPaused = pauseStatus?.isPaused && (
                  pauseStatus.pausedUntil === null || 
                  pauseStatus.pausedUntil > new Date()
                );
                
                const handleAvatarClick = (e: React.MouseEvent) => {
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
                  
                  // Verificar permisos antes de cargar el prospecto
                  if (!user?.id) {
                    alert('Debes estar autenticado para ver los detalles del prospecto');
                    isOpeningSidebarRef.current = false;
                    return;
                  }
                  
                  permissionsService.canUserAccessProspect(user.id, prospectId).then((permissionCheck) => {
                    if (!permissionCheck.canAccess) {
                      alert(permissionCheck.reason || 'No tienes permiso para acceder a este prospecto');
                      isOpeningSidebarRef.current = false;
                      return;
                    }
                    
                    // Si tiene permisos, cargar el prospecto completo antes de abrir el sidebar
                    prospectsService.getProspectById(prospectId, user.id).then((prospecto) => {
                      if (prospecto) {
                        setSelectedProspectoForSidebar(prospecto);
                        setSelectedProspectoIdForSidebar(prospectId);
                        requestAnimationFrame(() => {
                          setSidebarOpen(true);
                          isOpeningSidebarRef.current = false;
                        });
                      } else {
                        isOpeningSidebarRef.current = false;
                      }
                    }).catch(() => {
                      isOpeningSidebarRef.current = false;
                    });
                  }).catch(() => {
                    alert('Error al verificar permisos');
                    isOpeningSidebarRef.current = false;
                  });
                };
                
                // Mostrar icono de pausa si el bot está pausado
                if (isBotPaused) {
                  return (
                    <motion.div
                      key={`paused-${uchatId}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={handleAvatarClick}
                    >
                      <Pause className="w-4 h-4 text-white" fill="white" />
                    </motion.div>
                  );
                }
                
                // Avatar normal con iniciales (usando gradiente dinámico)
                const { gradientClass, initials } = getAvatarGradient(selectedConversation.customer_name || selectedConversation.customer_phone);
                return (
                  <motion.div
                    key={`active-${uchatId}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`w-8 h-8 rounded-full ${gradientClass} flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={handleAvatarClick}
                  >
                    {initials}
                  </motion.div>
                );
              })()}
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
                  
                  // Verificar permisos antes de cargar el prospecto
                  if (!user?.id) {
                    alert('Debes estar autenticado para ver los detalles del prospecto');
                    isOpeningSidebarRef.current = false;
                    return;
                  }
                  
                  permissionsService.canUserAccessProspect(user.id, prospectId).then((permissionCheck) => {
                    if (!permissionCheck.canAccess) {
                      alert(permissionCheck.reason || 'No tienes permiso para acceder a este prospecto');
                      isOpeningSidebarRef.current = false;
                      return;
                    }
                    
                    // Si tiene permisos, cargar el prospecto completo antes de abrir el sidebar
                    prospectsService.getProspectById(prospectId, user.id).then((prospecto) => {
                      if (prospecto) {
                        setSelectedProspectoForSidebar(prospecto);
                        setSelectedProspectoIdForSidebar(prospectId);
                        requestAnimationFrame(() => {
                          setSidebarOpen(true);
                          isOpeningSidebarRef.current = false;
                        });
                      } else {
                        isOpeningSidebarRef.current = false;
                      }
                    }).catch(() => {
                      isOpeningSidebarRef.current = false;
                    });
                  }).catch(() => {
                    alert('Error al verificar permisos');
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
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {messages.map((msg, index) => {
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

              // Determinar si necesita globo
              const hasContent = msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0;
              const hasAdjuntos = adjuntos && Array.isArray(adjuntos) && adjuntos.length > 0;
              
              // Para el bot: separar imágenes de otros adjuntos
              const imageAdjuntos = isBot && hasAdjuntos 
                ? adjuntos.filter((adj: any) => {
                    const filename = adj.filename || adj.archivo || '';
                    const tipo = (adj.tipo || '').toLowerCase();
                    return tipo.includes('imagen') || tipo.includes('image') || 
                           filename.match(/\.(jpg|jpeg|png|bmp|svg|webp|gif)$/i);
                  })
                : [];
              const nonImageAdjuntos = isBot && hasAdjuntos
                ? adjuntos.filter((adj: any) => {
                    const filename = adj.filename || adj.archivo || '';
                    const tipo = (adj.tipo || '').toLowerCase();
                    return !(tipo.includes('imagen') || tipo.includes('image') || 
                           filename.match(/\.(jpg|jpeg|png|bmp|svg|webp|gif)$/i));
                  })
                : adjuntos;
              
              const hasImages = imageAdjuntos.length > 0;
              const hasNonImageAdjuntos = nonImageAdjuntos && Array.isArray(nonImageAdjuntos) && nonImageAdjuntos.length > 0;
              
              // Para bot con imágenes: no necesita globo para las imágenes, pero sí para el texto
              const shouldHaveBubble = isBot && hasImages
                ? hasContent // Solo texto necesita globo
                : hasContent || !hasAdjuntos || (hasAdjuntos && needsBubble(adjuntos));

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={`flex items-end gap-2 ${isCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  {/* Avatar izquierda - Cliente */}
                  {isCustomer && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-white shadow-md bg-gradient-to-br from-slate-400 to-slate-500"
                      title={selectedConversation?.customer_name || 'Cliente'}
                    >
                      {selectedConversation?.customer_name?.charAt(0).toUpperCase() || 
                       selectedConversation?.customer_phone?.charAt(0).toUpperCase() || 'C'}
                    </div>
                  )}
                  
                  {/* Contenedor del mensaje */}
                  <div className={`max-w-[75%] ${isCustomer ? '' : ''}`}>
                    {/* Nombre del remitente */}
                    <div className={`text-[10px] text-gray-400 dark:text-gray-500 mb-0.5 px-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                      {isCustomer 
                        ? 'Cliente'
                        : isBot 
                          ? 'Bot Vidanta'
                          : (msg.sender_user_name || msg.sender_name || 'Agente')
                      }
                    </div>
                    
                    {/* CASO ESPECIAL: Bot con imágenes agrupadas */}
                    {isBot && hasImages && (
                      <div className="space-y-2">
                        {/* Globo con imágenes en grid */}
                        <div className="relative">
                          {/* Pico del globo - Bot (derecha) */}
                          <div className="absolute -right-2 bottom-2 w-3 h-3 overflow-hidden">
                            <div className="absolute transform rotate-45 bg-cyan-600 w-3 h-3" 
                                 style={{ right: '4px', top: '-2px' }} />
                          </div>
                          
                          {/* Globo principal con imágenes */}
                          <div className="relative px-2 py-2 shadow-sm backdrop-blur-sm bg-gradient-to-br from-blue-600/95 to-cyan-600/95 rounded-2xl rounded-br-md shadow-md">
                            {/* Grid de imágenes - usa ancho completo del globo */}
                            <div className="grid grid-cols-2 gap-1.5 w-full">
                              {imageAdjuntos.map((adjunto: any, imgIndex: number) => {
                                const filename = adjunto.filename || adjunto.archivo;
                                const bucket = adjunto.bucket || 'whatsapp-media';
                                const cacheKey = `${bucket}/${filename}`;
                                const imageUrl = imageUrlsCache[cacheKey];
                                const isLoading = imageLoadingStates[cacheKey];
                                
                                return (
                                  <div 
                                    key={imgIndex} 
                                    className="relative group aspect-square overflow-hidden rounded-lg bg-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => {
                                      if (imageUrl) {
                                        setSelectedImageModal({
                                          url: imageUrl,
                                          alt: adjunto.descripcion || `Imagen ${imgIndex + 1}`
                                        });
                                      }
                                    }}
                                  >
                                    {isLoading ? (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                                      </div>
                                    ) : imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={adjunto.descripcion || `Imagen ${imgIndex + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
                                        Error
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Timestamp */}
                            <div className="text-[10px] mt-2 text-white/70 text-right">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Texto en globo separado (si existe) */}
                        {hasContent && msg.content && (
                          <div className="relative">
                            {/* Pico del globo - Bot (derecha) */}
                            <div className="absolute -right-2 bottom-2 w-3 h-3 overflow-hidden">
                              <div className="absolute transform rotate-45 bg-cyan-600 w-3 h-3" 
                                   style={{ right: '4px', top: '-2px' }} />
                            </div>
                            
                            {/* Globo de texto */}
                            <div className="relative px-3 py-2 shadow-sm backdrop-blur-sm bg-gradient-to-br from-blue-600/95 to-cyan-600/95 text-white rounded-2xl rounded-br-md shadow-md">
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.content.replace(/\\n/g, '\n')}
                              </div>
                              
                              {/* Timestamp */}
                              <div className="text-[10px] mt-1 text-white/70 text-right">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Otros adjuntos no-imagen (si existen) */}
                        {hasNonImageAdjuntos && (
                          <MultimediaMessage 
                            adjuntos={nonImageAdjuntos}
                            hasTextContent={false}
                            isFromCustomer={false}
                            isVisible={true}
                          />
                        )}
                      </div>
                    )}
                    
                    {/* CASO NORMAL: Todos los demás mensajes */}
                    {!(isBot && hasImages) && (
                      <>
                        {/* Burbuja del mensaje con pico */}
                        {(shouldHaveBubble || isAgent) ? (
                          <div className="relative">
                            {/* Pico del globo - Cliente (izquierda) */}
                            {isCustomer && (
                              <div className="absolute -left-2 bottom-2 w-3 h-3 overflow-hidden">
                                <div className="absolute transform rotate-45 bg-white dark:bg-slate-600 w-3 h-3 border-l border-b border-gray-200/50 dark:border-slate-500/50" 
                                     style={{ left: '4px', top: '-2px' }} />
                              </div>
                            )}
                            
                            {/* Pico del globo - Bot/Agente (derecha) */}
                            {!isCustomer && (
                              <div className="absolute -right-2 bottom-2 w-3 h-3 overflow-hidden">
                                <div className={`absolute transform rotate-45 w-3 h-3 ${
                                  isBot 
                                    ? 'bg-cyan-600' 
                                    : 'bg-purple-600'
                                }`} 
                                     style={{ right: '4px', top: '-2px' }} />
                              </div>
                            )}
                            
                            {/* Globo principal */}
                            <div
                              className={`relative px-3 py-2 shadow-sm backdrop-blur-sm ${
                                isCustomer
                                  ? 'bg-white/95 dark:bg-slate-600/95 border border-gray-200/50 dark:border-slate-500/50 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-md'
                                  : isBot
                                    ? 'bg-gradient-to-br from-blue-600/95 to-cyan-600/95 text-white rounded-2xl rounded-br-md shadow-md'
                                    : 'bg-gradient-to-br from-violet-600/95 to-purple-600/95 text-white rounded-2xl rounded-br-md shadow-md'
                              }`}
                            >
                              {hasContent && msg.content && (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {msg.content.replace(/\\n/g, '\n')}
                                </div>
                              )}
                              
                              {isAgent && !hasContent && !hasAdjuntos && (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap opacity-50">{' '}</div>
                              )}
                              
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
                              
                              {/* Timestamp */}
                              <div className={`text-[10px] mt-1 ${
                                isCustomer 
                                  ? 'text-gray-400 dark:text-gray-500' 
                                  : 'text-white/70'
                              } ${isCustomer ? 'text-left' : 'text-right'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* SIN GLOBO: Stickers y audios */
                          <div className="flex flex-col">
                            {hasAdjuntos && (
                              <MultimediaMessage 
                                adjuntos={adjuntos}
                                hasTextContent={false}
                                isFromCustomer={isCustomer}
                                isVisible={true}
                              />
                            )}
                            <div className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Avatar derecha - Bot/Agente */}
                  {!isCustomer && (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-white shadow-md ${
                        isBot 
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-600' 
                          : 'bg-gradient-to-br from-violet-500 to-purple-600'
                      }`}
                      title={isBot ? 'Bot Vidanta' : (msg.sender_user_name || msg.sender_name || 'Agente')}
                    >
                      {isBot 
                        ? 'B'
                        : (() => {
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
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Botón para ir a la conversación - con animación */}
          <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
            <motion.button
              onClick={handleNavigateToConversation}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 group"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </motion.div>
              <span className="text-sm font-medium">Ir a la conversación</span>
              <motion.div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            </motion.button>
          </div>
        </>
      )}

      {/* Sidebar de Prospecto - Solo renderizar si hay prospecto seleccionado */}
      {selectedProspectoForSidebar && (
        <ProspectoSidebar
          key={`conversaciones-widget-${selectedProspectoIdForSidebar}`}
          prospecto={selectedProspectoForSidebar}
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          onNavigateToLiveChat={(prospectoId) => {
            setSidebarOpen(false);
            setAppMode('live-chat');
            localStorage.setItem('livechat-prospect-id', prospectoId);
          }}
          onOpenCallDetail={(callId: string) => {
            setSelectedCallId(callId);
            setCallDetailModalOpen(true);
          }}
        />
      )}

      {/* Sidebar de Detalle de Llamada */}
      {createPortal(
        <CallDetailModalSidebar
          callId={selectedCallId}
          isOpen={callDetailModalOpen}
          onClose={() => {
            setCallDetailModalOpen(false);
            setSelectedCallId(null);
          }}
          allCallsWithAnalysis={[]}
          onProspectClick={(prospectId) => {
            // Abrir sidebar del prospecto si está disponible
            // El sidebar se maneja en otro lugar del componente
          }}
        />,
        document.body
      )}

      {/* Modal simple para imágenes */}
      <AnimatePresence>
        {selectedImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImageModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] w-full"
            >
              <button
                onClick={() => setSelectedImageModal(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedImageModal.url}
                alt={selectedImageModal.alt}
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
