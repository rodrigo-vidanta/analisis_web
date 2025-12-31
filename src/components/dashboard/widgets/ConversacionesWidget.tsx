/**
 * Widget de Últimas Conversaciones
 * Basado en LiveChatCanvas - muestra conversaciones asignadas según permisos
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ChevronRight, Loader2, X, Flag, Pause, Play, Bot, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import BotPauseButton from '../../chat/BotPauseButton';
import { supabaseSystemUI } from '../../../config/supabaseSystemUI';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { uchatService, type UChatConversation } from '../../../services/uchatService';
import { permissionsService } from '../../../services/permissionsService';
import { coordinacionService } from '../../../services/coordinacionService';
import { prospectsService } from '../../../services/prospectsService';
import { useAppStore } from '../../../stores/appStore';
import { useAuth } from '../../../contexts/AuthContext';
import { useEffectivePermissions } from '../../../hooks/useEffectivePermissions';
import { AssignmentBadge } from '../../analysis/AssignmentBadge';
import { BackupBadgeWrapper } from '../../shared/BackupBadgeWrapper';
import { MultimediaMessage, needsBubble } from '../../chat/MultimediaMessage';
import { ProspectoLabelBadges } from '../../shared/ProspectoLabelBadges';
import { whatsappLabelsService, type ConversationLabel } from '../../../services/whatsappLabelsService';
import { ProspectoSidebar } from '../../prospectos/ProspectosManager';
import { CallDetailModalSidebar } from '../../chat/CallDetailModalSidebar';
import { createPortal } from 'react-dom';
import { notificationSoundService } from '../../../services/notificationSoundService';
import { systemNotificationService } from '../../../services/systemNotificationService';
import { botPauseService } from '../../../services/botPauseService';
import { getAvatarGradient } from '../../../utils/avatarGradient';
import { getApiToken } from '../../../services/apiTokensService';

interface Message {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent' | 'template'; // ✅ Agregado 'template'
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
  const { isAdmin, isAdminOperativo } = useEffectivePermissions();
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
  const ejecutivosIdsParaFiltrarRef = useRef<string[]>([]); // Cache de IDs de ejecutivos para filtros
  const coordinacionesFilterRef = useRef<string[] | null>(null); // Cache de coordinaciones para filtros
  const ejecutivoFilterRef = useRef<string | null>(null); // Cache de ejecutivo filter
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
  const [prospectoLabels, setProspectoLabels] = useState<Record<string, ConversationLabel[]>>({});
  
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

  // Función helper para verificar si una conversación puede ser vista por el usuario actual
  const canViewConversation = useCallback(async (conversation: any): Promise<boolean> => {
    if (!userId) return false;
    
    // Administradores y administradores operativos pueden ver todas las conversaciones
    if (isAdmin || isAdminOperativo) {
      return true;
    }
    
    const prospectId = conversation.prospect_id || conversation.prospecto_id || conversation.metadata?.prospect_id;
    
    // Si no hay prospect_id, solo administradores pueden verla (ya retornamos true arriba)
    // Para ejecutivos y coordinadores, si no hay prospect_id, no pueden verla
    if (!prospectId) {
      // Coordinadores pueden ver conversaciones sin prospecto si están en su coordinación
      // Pero esto requiere verificación adicional que no tenemos aquí
      // Por ahora, excluir conversaciones sin prospect_id para ejecutivos
      if (user?.role_name === 'ejecutivo') {
        console.log(`🚫 [canViewConversation] Ejecutivo ${userId}: Conversación sin prospect_id, denegando acceso`);
        return false;
      }
      // Para coordinadores, necesitaríamos verificar la coordinación de otra manera
      // Por ahora, también excluir
      return false;
    }
    
    // Para ejecutivos, verificación temprana: verificar directamente en el mapa de prospectos
    if (user?.role_name === 'ejecutivo') {
      const prospectoData = prospectosDataRef.current.get(prospectId);
      
      // Si el prospecto no está en el mapa, intentar cargarlo
      if (!prospectoData) {
        try {
          const { data } = await analysisSupabase
            .from('prospectos')
            .select('id, ejecutivo_id, coordinacion_id')
            .eq('id', prospectId)
            .maybeSingle();
          
          if (!data) {
            console.log(`🚫 [canViewConversation] Ejecutivo ${userId}: Prospecto ${prospectId} no encontrado en BD, denegando acceso`);
            return false;
          }
          
          // Verificar si tiene ejecutivo_id asignado
          if (!data.ejecutivo_id) {
            console.log(`🚫 [canViewConversation] Ejecutivo ${userId}: Prospecto ${prospectId} sin ejecutivo_id asignado, denegando acceso`);
            return false;
          }
          
          // Verificar que el ejecutivo_id coincida con el ejecutivo actual o sus backups
          const ejecutivosIdsParaFiltrar = ejecutivosIdsParaFiltrarRef.current;
          if (!ejecutivosIdsParaFiltrar.includes(data.ejecutivo_id)) {
            return false;
          }
          
          // Actualizar el mapa para futuras consultas
          prospectosDataRef.current.set(prospectId, data);
          
          // Si el ejecutivo_id coincide, el ejecutivo tiene acceso
          return true;
        } catch (error) {
          console.error(`❌ [canViewConversation] Error cargando prospecto ${prospectId}:`, error);
          return false;
        }
      } else {
        // Prospecto está en el mapa, verificar ejecutivo_id
        if (!prospectoData.ejecutivo_id) {
          console.log(`🚫 [canViewConversation] Ejecutivo ${userId}: Prospecto ${prospectId} sin ejecutivo_id en mapa, denegando acceso`);
          return false;
        }
        
        // Verificar que el ejecutivo_id coincida con el ejecutivo actual o sus backups
        const ejecutivosIdsParaFiltrar = ejecutivosIdsParaFiltrarRef.current;
        if (!ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
          return false;
        }
        
        // Si el ejecutivo_id coincide, el ejecutivo tiene acceso
        return true;
      }
    }
    
    // Para coordinadores y otros roles, usar el servicio de permisos
    try {
      const permissionCheck = await permissionsService.canUserAccessProspect(userId, prospectId);
      return permissionCheck.canAccess;
    } catch (error) {
      console.error('Error verificando permisos de conversación:', error);
      return false;
    }
  }, [userId, user?.role_name]);

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
        async (payload) => {
          const updatedConv = payload.new as any;
          
          // Verificar permisos antes de agregar/actualizar (solo si no es admin)
          if (user?.role_name !== 'admin' && user?.role_name !== 'administrador_operativo') {
            const hasPermission = await canViewConversation(updatedConv);
            if (!hasPermission) {
              // Si no tiene permisos, remover de la lista si existe
              startTransition(() => {
                setConversations(prev => prev.filter(c => c.id !== updatedConv.id));
              });
              return;
            }
          }
          
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
        async (payload) => {
          const newConv = payload.new as any;
          
          // Verificar permisos antes de agregar (solo si no es admin)
          if (user?.role_name !== 'admin' && user?.role_name !== 'administrador_operativo') {
            const hasPermission = await canViewConversation(newConv);
            if (!hasPermission) {
              return; // No agregar si no tiene permisos
            }
          }
          
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
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Verificar permisos antes de procesar el mensaje (solo si no es admin)
          if (user?.role_name !== 'admin' && user?.role_name !== 'administrador_operativo') {
            const prospectId = newMessage.prospect_id || newMessage.prospecto_id;
            if (prospectId) {
              const hasPermission = await canViewConversation({ prospect_id: prospectId, prospecto_id: prospectId });
              if (!hasPermission) {
                // Si no tiene permisos, no procesar el mensaje
                return;
              }
            }
          }
          
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
                        // Verificar permisos antes de agregar (solo si no es admin)
                        if (user?.role_name !== 'admin' && user?.role_name !== 'administrador_operativo') {
                          const hasPermission = await canViewConversation(newConv);
                          if (!hasPermission) {
                            return; // No agregar si no tiene permisos
                          }
                        }
                        
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
        async (payload) => {
          const updatedProspecto = payload.new as any;
          const oldProspecto = payload.old as any;
          const prospectoId = updatedProspecto.id;
          
          // Verificar si cambió el ejecutivo_id o coordinacion_id (puede afectar permisos)
          const ejecutivoChanged = oldProspecto?.ejecutivo_id !== updatedProspecto.ejecutivo_id;
          const coordinacionChanged = oldProspecto?.coordinacion_id !== updatedProspecto.coordinacion_id;
          
          // Si cambió la asignación, verificar permisos (solo si no es admin)
          if ((ejecutivoChanged || coordinacionChanged) && user?.role_name !== 'admin' && user?.role_name !== 'administrador_operativo') {
            const isInList = conversationsRef.current.some(c => 
              c.prospect_id === prospectoId || c.prospecto_id === prospectoId
            );
            const hasPermission = await canViewConversation({ 
              prospect_id: prospectoId, 
              prospecto_id: prospectoId,
              ejecutivo_id: updatedProspecto.ejecutivo_id,
              coordinacion_id: updatedProspecto.coordinacion_id
            });
            
            if (!hasPermission && isInList) {
              // ❌ Ya no tiene permisos - remover conversación de la lista
              startTransition(() => {
                setConversations(prev => prev.filter(c => 
                  c.prospect_id !== prospectoId && c.prospecto_id !== prospectoId
                ));
              });
            } else if (hasPermission && !isInList) {
              // ✅ Ahora tiene permisos y no estaba en la lista - cargar y agregar
              try {
                // Cargar el último mensaje para esta conversación
                const { data: mensajes } = await analysisSupabase
                  .from('mensajes_whatsapp')
                  .select('*')
                  .eq('prospecto_id', prospectoId)
                  .order('fecha_hora', { ascending: false })
                  .limit(1);
                
                if (mensajes && mensajes.length > 0) {
                  const ultimoMensaje = mensajes[0];
                  const prospectoData = prospectosDataRef.current.get(prospectoId);
                  const coordinacionId = updatedProspecto.coordinacion_id || prospectoData?.coordinacion_id;
                  const ejecutivoId = updatedProspecto.ejecutivo_id || prospectoData?.ejecutivo_id;
                  const coordinacionInfo = coordinacionId ? coordinacionesMapRef.current.get(coordinacionId) : null;
                  const ejecutivoInfo = ejecutivoId ? ejecutivosMapRef.current.get(ejecutivoId) : null;
                  
                  const newConversation: UChatConversation = {
                    id: prospectoId,
                    prospecto_id: prospectoId,
                    prospect_id: prospectoId,
                    customer_name: updatedProspecto.nombre_completo || updatedProspecto.nombre_whatsapp || ultimoMensaje.nombre_contacto || 'Sin nombre',
                    nombre_contacto: updatedProspecto.nombre_completo || updatedProspecto.nombre_whatsapp || ultimoMensaje.nombre_contacto,
                    customer_phone: ultimoMensaje.numero_telefono,
                    last_message: ultimoMensaje.mensaje || '',
                    last_message_at: ultimoMensaje.fecha_hora,
                    updated_at: ultimoMensaje.fecha_hora,
                    unread_count: ultimoMensaje.rol === 'Prospecto' ? 1 : 0,
                    mensajes_no_leidos: ultimoMensaje.rol === 'Prospecto' ? 1 : 0,
                    message_count: 1,
                    source: 'whatsapp' as const,
                    coordinacion_id: coordinacionId,
                    ejecutivo_id: ejecutivoId,
                    coordinacion_nombre: coordinacionInfo?.nombre || undefined,
                    ejecutivo_nombre: ejecutivoInfo?.nombre || undefined
                  };
                  
                  startTransition(() => {
                    setConversations(prev => {
                      // Verificar que no exista ya
                      if (prev.some(c => c.prospect_id === prospectoId || c.prospecto_id === prospectoId)) {
                        return prev;
                      }
                      // Agregar y ordenar por fecha
                      const updated = [...prev, newConversation].sort((a, b) => {
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
                console.warn('Error cargando conversación de prospecto recién asignado:', error);
              }
            }
          }
          
          // Actualizar requiere_atencion_humana y motivo_handoff en el Map
          const requiereAtencionChanged = oldProspecto?.requiere_atencion_humana !== updatedProspecto.requiere_atencion_humana;
          const motivoHandoffChanged = oldProspecto?.motivo_handoff !== updatedProspecto.motivo_handoff;
          
          if (requiereAtencionChanged || motivoHandoffChanged || updatedProspecto.nombre_completo || updatedProspecto.nombre_whatsapp || ejecutivoChanged || coordinacionChanged) {
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
                    nombre_whatsapp: updatedProspecto.nombre_whatsapp || existing.nombre_whatsapp,
                    coordinacion_id: updatedProspecto.coordinacion_id,
                    ejecutivo_id: updatedProspecto.ejecutivo_id
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
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Verificar permisos antes de procesar el mensaje (solo si no es admin)
          if (user?.role_name !== 'admin' && user?.role_name !== 'administrador_operativo') {
            if (newMessage.prospecto_id) {
              const hasPermission = await canViewConversation({ prospect_id: newMessage.prospecto_id, prospecto_id: newMessage.prospecto_id });
              if (!hasPermission) {
                // Si no tiene permisos, no procesar el mensaje
                return;
              }
            }
          }
          
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
                    
                    // Verificar permisos antes de agregar (solo si no es admin)
                    if (user?.role_name !== 'admin' && user?.role_name !== 'administrador_operativo') {
                      const hasPermission = await canViewConversation({ prospect_id: newConvData.prospecto_id, prospecto_id: newConvData.prospecto_id });
                      if (!hasPermission) {
                        return; // No agregar si no tiene permisos
                      }
                    }
                    
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

      // ============================================
      // OPTIMIZACIÓN CRÍTICA: Carga en dos pasos para enriquecimiento de datos
      // ============================================
      // PROBLEMA ORIGINAL:
      // Los IDs de coordinaciones y ejecutivos se recolectaban dentro del Promise.all()
      // pero los otros Promises se ejecutaban en paralelo antes de que se completaran
      // las modificaciones a los Sets, dejándolos vacíos cuando se pasaban a las funciones.
      //
      // SOLUCIÓN:
      // Dividir la carga en dos pasos secuenciales:
      // 1. Primero cargar prospectos y recolectar coordinacion_ids y ejecutivo_ids
      // 2. Luego cargar coordinaciones y ejecutivos en batch con esos IDs
      // Esto asegura que los mapas estén correctamente poblados antes de enriquecer.
      // ============================================

      // Recolectar IDs de prospectos de ambas fuentes (uchat + WhatsApp RPC)
      const prospectoIds = new Set<string>();
      const coordinacionIds = new Set<string>();
      const ejecutivoIds = new Set<string>();

      // Recolectar IDs de conversaciones de uchat
      uchatConversationsRaw.forEach(conv => {
        if (conv.prospect_id) prospectoIds.add(conv.prospect_id);
      });
      
      // Recolectar IDs de conversaciones de WhatsApp (RPC)
      const rpcData = rpcDataResult.data || [];
      rpcData.forEach((c: any) => {
        if (c.prospecto_id) prospectoIds.add(c.prospecto_id);
      });

      // ============================================
      // PASO 1: Cargar prospectos primero para recolectar coordinacion_ids y ejecutivo_ids
      // ============================================
      // Este paso es crítico porque necesitamos los IDs de coordinaciones y ejecutivos
      // que están almacenados en los prospectos antes de poder cargar sus datos completos.
      // IMPORTANTE: Dividir en batches para evitar error 400 por URL demasiado larga
      const BATCH_SIZE = 100; // Máximo de IDs por query para evitar límite de URL
      const prospectoIdsArray = Array.from(prospectoIds);
      
      const loadProspectosInBatches = async (ids: string[]): Promise<Map<string, any>> => {
        const map = new Map();
        
        // Dividir IDs en batches
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          
          try {
            const { data, error } = await analysisSupabase
              .from('prospectos')
              .select('id, coordinacion_id, ejecutivo_id, requiere_atencion_humana, motivo_handoff, nombre_completo, nombre_whatsapp, id_uchat')
              .in('id', batch);
            
            if (error) {
              console.error(`❌ [ConversacionesWidget] Error cargando prospectos batch ${i / BATCH_SIZE + 1}:`, error);
              continue;
            }
            
            (data || []).forEach(p => {
              map.set(p.id, p);
              if (p.coordinacion_id) coordinacionIds.add(p.coordinacion_id);
              if (p.ejecutivo_id) ejecutivoIds.add(p.ejecutivo_id);
            });
          } catch (err) {
            console.error(`❌ [ConversacionesWidget] Error en batch ${i / BATCH_SIZE + 1}:`, err);
          }
        }
        
        return map;
      };
      
      const prospectosDataMap = prospectoIdsArray.length > 0
        ? await loadProspectosInBatches(prospectoIdsArray)
            .then(map => {
              
              // Debug: verificar si el prospecto problemático está en el mapa
              if (ejecutivoFilter) {
                const problemProspectId = '97c8bd6f-235e-41b5-981d-42a61880442f';
                if (prospectoIds.has(problemProspectId)) {
                  const problemProspect = map.get(problemProspectId);
                  const ejecutivosIdsParaFiltrar = ejecutivosIdsParaFiltrarRef.current;
                  const tieneEjecutivoId = !!problemProspect?.ejecutivo_id;
                  const ejecutivoIdCoincide = problemProspect?.ejecutivo_id && ejecutivosIdsParaFiltrar.includes(problemProspect.ejecutivo_id);
                  
                  console.log(`🔍 [ConversacionesWidget] Prospecto problemático ${problemProspectId}:`, {
                    encontrado: !!problemProspect,
                    ejecutivo_id: problemProspect?.ejecutivo_id,
                    coordinacion_id: problemProspect?.coordinacion_id,
                    ejecutivoFilter,
                    ejecutivosIdsParaFiltrar,
                    tieneEjecutivoId,
                    ejecutivoIdCoincide,
                    deberiaVerlo: tieneEjecutivoId && ejecutivoIdCoincide
                  });
                  
                  // Verificar también con el servicio de permisos
                  if (problemProspect) {
                    permissionsService.canUserAccessProspect(ejecutivoFilter, problemProspectId)
                      .then(result => {
                        console.log(`🔍 [ConversacionesWidget] Permiso del servicio para ${problemProspectId}:`, result);
                      })
                      .catch(err => {
                        console.error(`❌ [ConversacionesWidget] Error verificando permiso:`, err);
                      });
                  }
                }
              }
              
              return map;
            })
            .catch((error) => {
              console.error('❌ [ConversacionesWidget] Error en catch cargando prospectos:', error);
              return new Map();
            })
        : new Map();

      // ============================================
      // PASO 2: Cargar coordinaciones y ejecutivos en batch (ahora que tenemos los IDs)
      // ============================================
      // En este punto, los Sets coordinacionIds y ejecutivoIds ya están poblados
      // con todos los IDs únicos recolectados del paso anterior.
      // Ahora podemos cargar los datos completos en paralelo de forma eficiente.
      const [coordinacionesMapData, ejecutivosMapData] = await Promise.all([
        coordinacionIds.size > 0
          ? coordinacionService.getCoordinacionesByIds(Array.from(coordinacionIds))
          : Promise.resolve(new Map()),
        ejecutivoIds.size > 0
          ? coordinacionService.getEjecutivosByIds(Array.from(ejecutivoIds))
          : Promise.resolve(new Map())
      ]);

      // Actualizar estados y refs con los datos cargados
      setProspectosData(prospectosDataMap);
      setCoordinacionesMap(coordinacionesMapData);
      setEjecutivosMap(ejecutivosMapData);
      // Actualizar refs también para acceso desde otros handlers
      prospectosDataRef.current = prospectosDataMap;
      coordinacionesMapRef.current = coordinacionesMapData;
      ejecutivosMapRef.current = ejecutivosMapData;

      // ============================================
      // ENRIQUECIMIENTO: Usar los mapas poblados para enriquecer conversaciones
      // ============================================
      // Ahora que los mapas están correctamente poblados, podemos enriquecer
      // las conversaciones con los datos de coordinación y ejecutivo asignado.
      
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
      // Si es ejecutivo, obtener IDs de ejecutivos donde es backup (una sola vez)
      let ejecutivosIdsParaFiltrar: string[] = [];
      if (ejecutivoFilter) {
        ejecutivosIdsParaFiltrar = [ejecutivoFilter]; // Sus propios prospectos
        
        // Obtener IDs de ejecutivos donde este ejecutivo es backup
        try {
          const { supabaseSystemUIAdmin } = await import('../../../config/supabaseSystemUI');
          const { data: ejecutivosConBackup } = await supabaseSystemUIAdmin
            .from('auth_users')
            .select('id')
            .eq('backup_id', ejecutivoFilter)
            .eq('has_backup', true);
          
          if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
            ejecutivosIdsParaFiltrar.push(...ejecutivosConBackup.map(e => e.id));
            console.log(`✅ Ejecutivo ${ejecutivoFilter} puede ver conversaciones de ${ejecutivosConBackup.length} ejecutivos como backup`);
          }
        } catch (error) {
          console.error('Error obteniendo ejecutivos donde es backup:', error);
        }
      }
      
      // Actualizar refs de filtros después de calcular ejecutivosIdsParaFiltrar
      ejecutivoFilterRef.current = ejecutivoFilter;
      coordinacionesFilterRef.current = coordinacionesFilter;
      ejecutivosIdsParaFiltrarRef.current = ejecutivosIdsParaFiltrar;

      let filteredUchat: any[] = [];
      let filteredWhatsapp: any[] = [];

      // Admin y Administrador Operativo: sin filtros, ver todas las conversaciones
      if (!coordinacionesFilter && !ejecutivoFilter) {
        filteredUchat = uchatConversations;
        filteredWhatsapp = whatsappConversations;
      } else {
        // Filtrar según permisos (incluyendo backups)
        for (const conv of uchatConversations) {
          // Ejecutivos: solo conversaciones con prospect_id asignado
          if (!conv.prospect_id) {
            // Si no tiene prospect_id, solo coordinadores y administradores pueden verla
            if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              // Coordinador: puede ver conversaciones sin prospecto si están en su coordinación
              // Pero necesitamos verificar la coordinación de otra manera
              // Por ahora, excluir conversaciones sin prospect_id para todos excepto admins
              continue;
            }
            continue;
          }
          
          const prospectoData = prospectosDataMap.get(conv.prospect_id);
          
          if (ejecutivoFilter) {
            // Ejecutivo: SOLO prospectos con ejecutivo_id asignado (no null) que coincida con él o sus backups
            // CRÍTICO: También debe pertenecer a su coordinación
            if (!prospectoData) {
              // Prospecto no encontrado en el mapa, excluir
              console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${conv.prospect_id} no encontrado en mapa, excluyendo`);
              continue;
            }
            
            // Validación estricta: debe tener ejecutivo_id asignado (no null, no undefined)
            if (!prospectoData.ejecutivo_id) {
              // Prospecto sin ejecutivo asignado, ejecutivo NO puede verlo
              console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${conv.prospect_id} sin ejecutivo_id asignado, excluyendo`);
              continue;
            }
            
            // CRÍTICO: Verificar que pertenezca a la coordinación del ejecutivo
            if (!prospectoData.coordinacion_id || !coordinacionesFilter || !coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
              // Prospecto no pertenece a la coordinación del ejecutivo, excluir
              console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${conv.prospect_id} coordinacion_id ${prospectoData.coordinacion_id} no coincide con coordinaciones del ejecutivo, excluyendo`);
              continue;
            }
            
            // Verificar que el ejecutivo_id coincida con el ejecutivo actual o sus backups
            // Si coincide y pertenece a su coordinación, el ejecutivo tiene acceso
            if (ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
              filteredUchat.push(conv);
            }
          } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
            // Coordinador: solo prospectos asignados a su coordinación
            if (prospectoData?.coordinacion_id && coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
              filteredUchat.push(conv);
            }
          }
        }

        for (const conv of whatsappConversations) {
          // Ejecutivos: solo conversaciones con prospecto_id asignado
          if (!conv.prospecto_id) {
            // Si no tiene prospecto_id, solo coordinadores y administradores pueden verla
            if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              // Coordinador: puede ver conversaciones sin prospecto si están en su coordinación
              // Pero necesitamos verificar la coordinación de otra manera
              // Por ahora, excluir conversaciones sin prospecto_id para todos excepto admins
              continue;
            }
            continue;
          }
          
          const prospectoData = prospectosDataMap.get(conv.prospecto_id);
          
          if (ejecutivoFilter) {
            // Ejecutivo: SOLO prospectos con ejecutivo_id asignado (no null) que coincida con él o sus backups
            // CRÍTICO: También debe pertenecer a su coordinación
            if (!prospectoData) {
              // Prospecto no encontrado en el mapa, excluir
              console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${conv.prospecto_id} no encontrado en mapa, excluyendo`);
              continue;
            }
            
            // Validación estricta: debe tener ejecutivo_id asignado (no null, no undefined)
            if (!prospectoData.ejecutivo_id) {
              // Prospecto sin ejecutivo asignado, ejecutivo NO puede verlo
              console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${conv.prospecto_id} sin ejecutivo_id asignado, excluyendo`);
              continue;
            }
            
            // CRÍTICO: Verificar que pertenezca a la coordinación del ejecutivo
            if (!prospectoData.coordinacion_id || !coordinacionesFilter || !coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
              // Prospecto no pertenece a la coordinación del ejecutivo, excluir
              console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${conv.prospecto_id} coordinacion_id ${prospectoData.coordinacion_id} no coincide con coordinaciones del ejecutivo, excluyendo`);
              continue;
            }
            
            // Verificar que el ejecutivo_id coincida con el ejecutivo actual o sus backups
            // Si coincide y pertenece a su coordinación, el ejecutivo tiene acceso
            if (ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
              filteredWhatsapp.push(conv);
            }
          } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
            // Coordinador: solo prospectos asignados a su coordinación
            if (prospectoData?.coordinacion_id && coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
              filteredWhatsapp.push(conv);
            }
          }
        }
      }

      // Combinar y eliminar duplicados
      let allConversations = [...filteredUchat, ...filteredWhatsapp];
      
      // Filtrado adicional para ejecutivos: asegurar que todas las conversaciones tengan ejecutivo_id asignado
      // CRÍTICO: También verificar que pertenezcan a la coordinación del ejecutivo
      if (ejecutivoFilter) {
        allConversations = allConversations.filter(conv => {
          const prospectId = conv.prospect_id || conv.prospecto_id;
          if (!prospectId) {
            console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Conversación sin prospect_id, excluyendo`);
            return false;
          }
          
          const prospectoData = prospectosDataMap.get(prospectId);
          if (!prospectoData) {
            console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${prospectId} no encontrado en mapa final, excluyendo`);
            return false;
          }
          
          if (!prospectoData.ejecutivo_id) {
            console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${prospectId} sin ejecutivo_id en filtrado final, excluyendo`);
            return false;
          }
          
          // CRÍTICO: Verificar que pertenezca a la coordinación del ejecutivo
          if (!prospectoData.coordinacion_id || !coordinacionesFilter || !coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
            console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${prospectId} coordinacion_id ${prospectoData.coordinacion_id} no coincide con coordinaciones del ejecutivo en filtrado final, excluyendo`);
            return false;
          }
          
          if (!ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
            console.log(`🚫 [ConversacionesWidget] Ejecutivo ${ejecutivoFilter}: Prospecto ${prospectId} ejecutivo_id ${prospectoData.ejecutivo_id} no coincide en filtrado final, excluyendo`);
            return false;
          }
          
          return true;
        });
      }
      
      const uniqueConversations = allConversations.filter((conv, index, self) =>
        index === self.findIndex(c => (c.id || c.prospecto_id) === (conv.id || conv.prospecto_id))
      );

      // Debug logs para administradores
      if (isAdmin || isAdminOperativo) {
        console.log('🔍 [ConversacionesWidget] Debug Admin:', {
          uchatConversationsRaw: uchatConversationsRaw.length,
          rpcData: rpcData.length,
          uchatConversations: uchatConversations.length,
          whatsappConversations: whatsappConversations.length,
          filteredUchat: filteredUchat.length,
          filteredWhatsapp: filteredWhatsapp.length,
          allConversations: allConversations.length,
          uniqueConversations: uniqueConversations.length,
          coordinacionesFilter,
          ejecutivoFilter
        });
      }

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
      
      // Cargar etiquetas en paralelo (sin bloquear UI)
      const prospectoIdsForLabels = top15
        .map((c: any) => c.prospect_id)
        .filter(Boolean) as string[];
      
      if (prospectoIdsForLabels.length > 0) {
        whatsappLabelsService.getBatchProspectosLabels(prospectoIdsForLabels)
          .then(labelsMap => setProspectoLabels(labelsMap))
          .catch(err => console.error('Error cargando etiquetas en widget:', err));
      }

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
        // ✅ CARGAR MENSAJES Y PLANTILLAS EN PARALELO (igual que LiveChatCanvas)
        const messagesPromise = analysisSupabase
          .from('mensajes_whatsapp')
          .select('*')
          .eq('prospecto_id', conversation.prospect_id)
          .order('fecha_hora', { ascending: true });

        // ✅ USAR TABLA CORRECTA: whatsapp_template_sends (no logs)
        const templateSendsPromise = analysisSupabase
          .from('whatsapp_template_sends')
          .select('mensaje_id, triggered_by_user')
          .eq('prospecto_id', conversation.prospect_id)
          .eq('status', 'SENT');

        const [messagesResult, templateSendsResult] = await Promise.all([messagesPromise, templateSendsPromise]);

        const { data: messagesData, error } = messagesResult;
        const { data: templateSends } = templateSendsResult;

        if (error) throw error;

        // ✅ CREAR MAP DE PLANTILLAS (igual que LiveChatCanvas)
        const templateMessageMap = new Map<string, { triggered_by_user: string | null }>(
          (templateSends || []).map((ts: any) => [
            ts.mensaje_id, 
            { triggered_by_user: ts.triggered_by_user }
          ])
        );
        const templateMessageIds = new Set(templateMessageMap.keys());

        console.log('📄 [ConversacionesWidget] Template sends encontrados:', templateSends?.length || 0);
        if (templateSends && templateSends.length > 0) {
          console.log('📄 [ConversacionesWidget] Template sends detalle:', templateSends);
        }
        console.log('📄 [ConversacionesWidget] Template message IDs:', Array.from(templateMessageIds));

        // ✅ OBTENER IDS DE USUARIOS: mensajes normales Y plantillas (igual que LiveChatCanvas)
        const senderIds = (messagesData || [])
          .filter((msg: any) => msg.id_sender)
          .map((msg: any) => msg.id_sender);
        
        // Agregar IDs de usuarios que enviaron plantillas
        const templateUserIds = Array.from(templateMessageMap.values())
          .filter(v => v.triggered_by_user)
          .map(v => v.triggered_by_user as string);
        
        const allUserIds = [...new Set([...senderIds, ...templateUserIds])];
        
        console.log('👥 [ConversacionesWidget] IDs de usuarios a buscar:', allUserIds);
        console.log('📄 [ConversacionesWidget] Template user IDs:', templateUserIds);
        
        const senderNamesMap: Record<string, string> = {};
        if (allUserIds.length > 0) {
          try {
            // ✅ USAR supabaseSystemUI porque auth_users está en System UI DB
            const { data: usersData, error: usersError } = await supabaseSystemUI
              .from('auth_users')
              .select('id, full_name, first_name, last_name')
              .in('id', allUserIds);
            
            console.log('👥 [ConversacionesWidget] Usuarios encontrados:', usersData?.map(u => ({ id: u.id, name: u.full_name })));
            
            if (usersError) {
              console.error('❌ Error en query auth_users:', usersError);
            }
            
            if (usersData) {
              usersData.forEach(user => {
                senderNamesMap[user.id] = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
              });
            }
            
            console.log('📝 [ConversacionesWidget] Sender names map:', senderNamesMap);
            
            // Verificar si faltan usuarios
            const foundIds = new Set(usersData?.map(u => u.id) || []);
            const missingIds = allUserIds.filter(id => !foundIds.has(id));
            if (missingIds.length > 0) {
              console.warn('⚠️ Usuarios no encontrados en auth_users:', missingIds);
            }
          } catch (error) {
            console.error('❌ Error obteniendo nombres de usuarios:', error);
          }
        }

        // ✅ MAPEAR MENSAJES CON DETECCIÓN DE PLANTILLAS (igual que LiveChatCanvas)
        const adaptedMessages: Message[] = (messagesData || []).map((msg: any) => {
          // Determinar si es mensaje de plantilla (por tabla o por rol)
          const isTemplateMessage = templateMessageIds.has(msg.id) || msg.rol === 'Plantilla';
          const templateInfo = templateMessageMap.get(msg.id);
          
          // Determinar sender_type
          let senderType: 'customer' | 'bot' | 'agent' | 'template' = 'agent';
          if (msg.rol === 'Prospecto') {
            senderType = 'customer';
          } else if (isTemplateMessage) {
            senderType = 'template';
          } else if (msg.rol === 'AI') {
            senderType = 'bot';
          }
          
          // Obtener nombre del usuario que envió (id_sender o triggered_by_user para plantillas)
          let senderUserName: string | undefined;
          if (msg.id_sender) {
            senderUserName = senderNamesMap[msg.id_sender];
          } else if (isTemplateMessage && templateInfo?.triggered_by_user) {
            senderUserName = senderNamesMap[templateInfo.triggered_by_user];
          }
          
          return {
            id: msg.id,
            message_id: `real_${msg.id}`,
            conversation_id: conversation.id,
            sender_type: senderType,
            sender_name: isTemplateMessage ? 'Plantilla' : (msg.rol || 'Desconocido'),
            id_sender: msg.id_sender || (templateInfo?.triggered_by_user) || undefined,
            sender_user_name: senderUserName,
            content: msg.mensaje,
            is_read: msg.leido ?? true,
            created_at: msg.fecha_hora,
            adjuntos: msg.adjuntos
          };
        });

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

  // Función para pausar el bot
  const pauseBot = async (uchatId: string, durationMinutes: number | null, force: boolean = false): Promise<boolean> => {
    try {
      if (!force) {
        const existingPause = await botPauseService.getPauseStatus(uchatId);
        if (existingPause && existingPause.is_paused && existingPause.paused_until) {
          const pausedUntil = new Date(existingPause.paused_until);
          const now = new Date();
          if (pausedUntil > now) {
            return true;
          }
        }
      }

      const ttlSec = durationMinutes === null 
        ? 30 * 24 * 60 * 60
        : Math.max(0, Math.floor(durationMinutes * 60));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      try {
        const authToken = await getApiToken('pause_bot_auth');
        const resp = await fetch('https://primary-dev-d75a.up.railway.app/webhook/pause_bot', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            'livechat_auth': authToken
          },
          body: JSON.stringify({ uchat_id: uchatId, ttl: ttlSec }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.status === 200) {
          // Éxito
        } else if (resp.status === 400) {
          const errorText = await resp.text().catch(() => 'Error desconocido al pausar el bot');
          toast.error('No se pudo pausar el bot. Por favor, intenta nuevamente.', {
            duration: 4000,
            icon: '⏸️'
          });
          return false;
        } else {
          const errorText = await resp.text().catch(() => 'Error desconocido');
          toast.error('Error al pausar el bot. Por favor, intenta nuevamente.', {
            duration: 4000,
            icon: '⏸️'
          });
          return false;
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          toast.error('El servidor no respondió a tiempo. Por favor, intenta nuevamente.', {
            duration: 4000,
            icon: '⏱️'
          });
        } else {
          toast.error('Error de conexión al pausar el bot. Por favor, verifica tu conexión.', {
            duration: 4000,
            icon: '🔌'
          });
        }
        return false;
      }

      const pausedUntil = durationMinutes === null
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + ttlSec * 1000);
      
      await botPauseService.savePauseStatus(uchatId, durationMinutes, 'agent');
      
      const pauseData = {
        isPaused: true,
        pausedUntil,
        pausedBy: 'agent',
        duration: durationMinutes
      };

      setBotPauseStatus(prev => ({
        ...prev,
        [uchatId]: pauseData
      }));

      const allPauseStatus = JSON.parse(localStorage.getItem('bot-pause-status') || '{}');
      allPauseStatus[uchatId] = {
        ...pauseData,
        pausedUntil: pausedUntil.toISOString()
      };
      localStorage.setItem('bot-pause-status', JSON.stringify(allPauseStatus));

      return true;
    } catch (error) {
      return false;
    }
  };

  // Función para reactivar el bot
  const resumeBot = async (uchatId: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      try {
        const authToken = await getApiToken('pause_bot_auth');
        const resp = await fetch('https://primary-dev-d75a.up.railway.app/webhook/pause_bot', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            'livechat_auth': authToken
          },
          body: JSON.stringify({ uchat_id: uchatId, ttl: 0 }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (resp.status === 200) {
          // Éxito
        } else if (resp.status === 400) {
          const errorText = await resp.text().catch(() => 'Error desconocido al reactivar el bot');
          toast.error('No se pudo reactivar el bot. Por favor, intenta nuevamente.', {
            duration: 4000,
            icon: '▶️'
          });
          return false;
        } else {
          const errorText = await resp.text().catch(() => 'Error desconocido');
          toast.error('Error al reactivar el bot. Por favor, intenta nuevamente.', {
            duration: 4000,
            icon: '▶️'
          });
          return false;
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          toast.error('El servidor no respondió a tiempo. Por favor, intenta nuevamente.', {
            duration: 4000,
            icon: '⏱️'
          });
        } else {
          toast.error('Error de conexión al reactivar el bot. Por favor, verifica tu conexión.', {
            duration: 4000,
            icon: '🔌'
          });
        }
        return false;
      }

      await botPauseService.resumeBot(uchatId);

      setBotPauseStatus(prev => {
        const updated = { ...prev };
        updated[uchatId] = {
          isPaused: false,
          pausedUntil: null,
          pausedBy: '',
          duration: null
        };
        return updated;
      });

      const allPauseStatus = JSON.parse(localStorage.getItem('bot-pause-status') || '{}');
      allPauseStatus[uchatId] = {
        isPaused: false,
        pausedUntil: null,
        pausedBy: '',
        duration: null
      };
      localStorage.setItem('bot-pause-status', JSON.stringify(allPauseStatus));

      return true;
    } catch (error) {
      return false;
    }
  };

  // Función para actualizar requiere_atencion_humana
  const updateRequiereAtencionHumana = async (prospectoId: string, value: boolean): Promise<boolean> => {
    try {
      const updateData: { requiere_atencion_humana: boolean; motivo_handoff?: null } = {
        requiere_atencion_humana: value
      };
      
      if (!value) {
        updateData.motivo_handoff = null;
      }

      const { error } = await analysisSupabase
        .from('prospectos')
        .update(updateData)
        .eq('id', prospectoId);

      if (error) {
        toast.error('Error al actualizar el estado de atención');
        return false;
      }

      // Actualizar el Map local
      setProspectosData(prev => {
        const updated = new Map(prev);
        const existing = updated.get(prospectoId);
        if (existing) {
          updated.set(prospectoId, {
            ...existing,
            requiere_atencion_humana: value,
            motivo_handoff: value ? existing.motivo_handoff : null
          });
        }
        prospectosDataRef.current = updated;
        setProspectosDataVersion(prev => prev + 1);
        return updated;
      });

      return true;
    } catch (error) {
      toast.error('Error al actualizar el estado de atención');
      return false;
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
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {conv.customer_name || conv.customer_phone || 'Sin nombre'}
                              </p>
                              {user?.id && conv.metadata?.ejecutivo_id && (
                                <BackupBadgeWrapper
                                  currentUserId={user.id}
                                  prospectoEjecutivoId={conv.metadata.ejecutivo_id}
                                  variant="compact"
                                />
                              )}
                            </div>
                            {/* Etiquetas de Coordinación y Ejecutivo - A la derecha del nombre */}
                            {(conv.metadata?.coordinacion_codigo || conv.metadata?.ejecutivo_nombre) && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {conv.metadata?.coordinacion_codigo && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 whitespace-nowrap">
                                    {conv.metadata.coordinacion_codigo}
                                  </span>
                                )}
                                {conv.metadata?.ejecutivo_nombre && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                                    {(() => {
                                      const nombre = conv.metadata.ejecutivo_nombre || '';
                                      const partes = nombre.trim().split(/\s+/);
                                      const primerNombre = partes[0] || '';
                                      const primerApellido = partes[1] || '';
                                      return primerApellido ? `${primerNombre} ${primerApellido}` : primerNombre;
                                    })()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Badges de etiquetas WhatsApp */}
                          {conv.prospect_id && prospectoLabels[conv.prospect_id] && (
                            <div className="mb-1">
                              <ProspectoLabelBadges 
                                labels={prospectoLabels[conv.prospect_id]} 
                                size="sm"
                              />
                            </div>
                          )}
                          
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
              const isTemplate = msg.sender_type === 'template';
              
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
                        : isTemplate
                          ? (msg.sender_user_name || msg.sender_name || 'Agente')
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
                        {/* Etiqueta de Plantilla encima del globo */}
                        {isTemplate && (
                          <div className="flex items-center justify-end gap-1.5 mb-1">
                            <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Plantilla enviada por: {(() => {
                                const fullName = msg.sender_user_name || '';
                                if (!fullName) return 'Usuario';
                                const parts = fullName.trim().split(/\s+/);
                                if (parts.length >= 2) {
                                  return `${parts[0]} ${parts[1]}`;
                                }
                                return parts[0] || 'Usuario';
                              })()}
                            </span>
                          </div>
                        )}

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
                            
                            {/* Pico del globo - Bot/Agente/Plantilla (derecha) */}
                            {!isCustomer && (
                              <div className="absolute -right-2 bottom-2 w-3 h-3 overflow-hidden">
                                <div className={`absolute transform rotate-45 w-3 h-3 ${
                                  isTemplate
                                    ? 'bg-teal-500'
                                    : isBot 
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
                                  : isTemplate
                                    ? 'bg-gradient-to-br from-emerald-500/95 to-teal-500/95 text-white rounded-2xl rounded-br-md shadow-md border border-emerald-400/30'
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
                  
                  {/* Avatar derecha - Bot/Agente/Plantilla */}
                  {!isCustomer && (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                        msg.sender_type === 'template'
                          ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                          : isBot 
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-600' 
                          : 'bg-gradient-to-br from-violet-500 to-purple-600'
                      }`}
                      title={
                        msg.sender_type === 'template' 
                          ? 'Mensaje de Plantilla' 
                          : isBot 
                            ? 'Bot Vidanta' 
                            : (msg.sender_user_name || msg.sender_name || 'Agente')
                      }
                    >
                      {msg.sender_type === 'template' ? (
                        <FileText className="w-4 h-4 text-white" />
                      ) : isBot ? (
                        <Bot className="w-4 h-4 text-white" />
                      ) : (
                        <span className="text-xs font-semibold text-white">
                          {(() => {
                            if (msg.sender_user_name) {
                              const parts = msg.sender_user_name.trim().split(' ');
                              if (parts.length >= 2) {
                                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                              }
                              return msg.sender_user_name.substring(0, 2).toUpperCase();
                            }
                            return (msg.sender_name?.charAt(0).toUpperCase() || 'A');
                          })()}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Botones de acción - divididos en 3 partes */}
          <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="grid grid-cols-3 gap-2 items-stretch">
              {/* Botón 1: Ir a la conversación */}
              <motion.button
                onClick={handleNavigateToConversation}
                className="w-full px-3 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-1.5 group"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                title="Ir a la conversación"
              >
                <Send className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Ir</span>
              </motion.button>

              {/* Botón 2: Pausar/Reactivar Bot */}
              {selectedConversation && (() => {
                const uchatId = selectedConversation.metadata?.id_uchat || 
                  selectedConversation.id_uchat || 
                  selectedConversation.conversation_id || 
                  selectedConversation.id;
                const pauseStatus = uchatId ? botPauseStatus[uchatId] : null;
                const isBotPaused = pauseStatus?.isPaused && (
                  pauseStatus.pausedUntil === null || 
                  pauseStatus.pausedUntil > new Date()
                );
                const timeRemaining = pauseStatus?.pausedUntil 
                  ? Math.max(0, Math.floor((pauseStatus.pausedUntil.getTime() - Date.now()) / 1000))
                  : null;

                return (
                  <BotPauseButton
                    uchatId={uchatId}
                    isPaused={isBotPaused}
                    timeRemaining={timeRemaining}
                    onPause={pauseBot}
                    onResume={resumeBot}
                    showUpward={true}
                    fullWidth={true}
                  />
                );
              })()}

              {/* Botón 3: Toggle Requiere Atención Humana */}
              {selectedConversation?.prospect_id && (() => {
                const prospectData = prospectosData.get(selectedConversation.prospect_id);
                const requiereAtencion = prospectData?.requiere_atencion_humana || false;
                
                return (
                  <motion.button
                    onClick={async () => {
                      await updateRequiereAtencionHumana(
                        selectedConversation.prospect_id!,
                        !requiereAtencion
                      );
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-1.5 group ${
                      requiereAtencion
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    title={requiereAtencion ? "Desactivar requiere atención" : "Activar requiere atención"}
                  >
                    <Flag className={`w-4 h-4 ${requiereAtencion ? '' : 'opacity-50'}`} />
                    <span className="text-xs font-medium hidden sm:inline">
                      {requiereAtencion ? 'At.' : 'At.'}
                    </span>
                  </motion.button>
                );
              })()}
            </div>
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
