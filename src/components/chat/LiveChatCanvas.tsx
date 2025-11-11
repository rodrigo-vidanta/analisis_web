/**
 * ============================================
 * COMPONENTE CANVAS PRINCIPAL - LIVE CHAT
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/chat/README.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/chat/README.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/chat/CHANGELOG_LIVECHAT.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Phone,
  Clock,
  User,
  MessageSquare,
  Circle,
  Send,
  X,
  Calendar,
  ChevronRight,
  GripVertical,
  Paperclip
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { analysisSupabase } from '../../config/analysisSupabase';
import { uchatService } from '../../services/uchatService';
import { permissionsService } from '../../services/permissionsService';
import { automationService } from '../../services/automationService';
import { MultimediaMessage, needsBubble } from './MultimediaMessage';
import { ImageCatalogModal } from './ImageCatalogModal';
import { ParaphraseModal } from './ParaphraseModal';
import { ProspectDetailSidebar } from './ProspectDetailSidebar';
import ModerationService from '../../services/moderationService';
import ParaphraseLogService from '../../services/paraphraseLogService';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useState as useReactState } from 'react';
import { getDisplayName } from '../../utils/conversationNameHelper';
import { motion, AnimatePresence } from 'framer-motion';
import { AssignmentContextMenu } from '../shared/AssignmentContextMenu';
import { AssignmentBadge } from '../analysis/AssignmentBadge';
import { coordinacionService } from '../../services/coordinacionService';

// Utilidades de log (silenciar en producción)
const enableRtDebug = import.meta.env.VITE_ENABLE_RT_DEBUG === 'true';
const logDev = (...args: any[]) => {
};
const lastErrLogRef: { current: Record<string, number> } = { current: {} };
const logErrThrottled = (key: string, ...args: any[]) => {
  const now = Date.now();
  const last = lastErrLogRef.current[key] || 0;
  if (now - last > 15000) { // máx 1 cada 15s por canal
    console.error(...args);
    lastErrLogRef.current[key] = now;
  }
};

// Utilidad para debounce simple (sin dependencias externas)
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
};

// ============================================
// INTERFACES
// ============================================

interface Conversation {
  id: string;
  prospecto_id: string;
  numero_telefono?: string;
  nombre_contacto?: string;
  customer_name?: string;
  customer_phone?: string;
  id_uchat?: string; // ✅ ID de UChat para enviar imágenes
  status?: string;
  estado?: string;
  mensajes_no_leidos?: number;
  unread_count?: number;
  updated_at: string;
  last_message_at?: string;
  message_count?: number;
  ultimo_mensaje_preview?: string;
  ultimo_mensaje_sender?: string;
  fecha_inicio: string;
  summary?: string;
  resultado?: string;
  tipo: string;
  metadata?: any;
}

interface Message {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_name?: string;
  content?: string;
  is_read: boolean;
  created_at: string;
}

interface ConversationBlock {
  date: string;
  message_count: number;
  first_message_time: string;
  last_message_time: string;
  messages: Message[];
}

// ============================================
// COMPONENTE PRINCIPAL - LIENZO CON SECCIONES FIJAS
// ============================================

const LiveChatCanvas: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const selectedConversationRef = useRef<string | null>(null);
  const [conversationBlocks, setConversationBlocks] = useState<ConversationBlock[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [prospectNameById, setProspectNameById] = useState<{ [id: string]: string }>({});
  const [sending, setSending] = useState(false);
  const [sendingToConversation, setSendingToConversation] = useState<string | null>(null);
  const [showImageCatalog, setShowImageCatalog] = useState(false);
  const [showProspectSidebar, setShowProspectSidebar] = useState(false);
  
  // Estado para modal de parafraseo con IA
  const [showParaphraseModal, setShowParaphraseModal] = useState(false);
  const [textToParaphrase, setTextToParaphrase] = useState('');
  
  // Estado para modal de llamada
  const [showCallModal, setShowCallModal] = useState(false);
  const [callContext, setCallContext] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  
  // Estado para bloqueo de moderación
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [warningStats, setWarningStats] = useState<any>(null);

  // Estados para sincronización silenciosa
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [convRealtimeChannel, setConvRealtimeChannel] = useState<any>(null);
  const [uchatRealtimeChannel, setUchatRealtimeChannel] = useState<any>(null);
  const [uchatMessagesRealtimeChannel, setUchatMessagesRealtimeChannel] = useState<any>(null);
  const realtimeRetryRef = useRef<number>(0);
  const convRetryRef = useRef<number>(0);
  const uchatRetryRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectBackoffRef = useRef<number>(0);
  const isSettingUpRef = useRef<boolean>(false); // Flag para evitar múltiples setup simultáneos
  const isUnmountingRef = useRef<boolean>(false); // Flag para detectar unmount (hot reload)

  // Estados para control del bot
  const [botPauseStatus, setBotPauseStatus] = useState<{[uchatId: string]: {
    isPaused: boolean;
    pausedUntil: Date | null;
    pausedBy: string;
    duration: number; // en minutos
  }}>({});

  // Estados para caché de mensajes enviados
  const [cachedMessages, setCachedMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());
  
  // Throttling para actualizaciones masivas
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdatesRef = useRef<any[]>([]);

  // Estado de distribución de columnas (guardado en localStorage)
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('livechat-column-widths');
    return saved ? JSON.parse(saved) : { conversations: 320, blocks: 280 };
  });

  // Estado para menú contextual de asignación
  const [assignmentContextMenu, setAssignmentContextMenu] = useState<{
    prospectId: string;
    coordinacionId?: string;
    ejecutivoId?: string;
    position: { x: number; y: number };
  } | null>(null);

  // Estado del sidebar (para ajustar posición)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Detectar estado real del sidebar desde las clases CSS del contenido principal
    const mainContent = document.querySelector('.flex-1.flex.flex-col');
    if (mainContent && mainContent.classList.contains('lg:ml-16')) {
      return true; // Sidebar colapsado
    }
    return false; // Sidebar expandido por defecto
  });

  // Referencias para scroll y redimensionamiento
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const conversationsScrollRef = useRef<HTMLDivElement>(null);
  const blocksScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef<boolean>(false);
  const reorderTimerRef = useRef<number | null>(null);
  const loadRequestIdRef = useRef<number>(0);
  
  // Ref para evitar llamadas simultáneas a markConversationAsRead
  const markingAsReadRef = useRef<Set<string>>(new Set());
  
  // Ref para debounce timer de scroll
  const scrollDebounceTimerRef = useRef<number | null>(null);

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0,
    transferredConversations: 0,
    closedConversations: 0,
    handoffRate: 0
  });

  const currentMessages = useMemo(() => {
    if (!selectedConversation?.id) return [];
    return messagesByConversation[selectedConversation.id] || [];
  }, [selectedConversation, messagesByConversation]);

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    if (currentMessages.length > 0) {
      const blocks = groupMessagesByDay(currentMessages);
      setConversationBlocks(blocks);
    } else {
      setConversationBlocks([]);
    }
  }, [currentMessages]);

  useEffect(() => {
    isUnmountingRef.current = false; // Resetear flag al montar
    
    const initializeChat = async () => {
      // Inicialización silenciosa
      await loadConversations();
      setupRealtimeSubscription();
    };
    
    initializeChat();
    
    return () => {
      isUnmountingRef.current = true; // Marcar que estamos desmontando (hot reload)
      
      // Cleanup realtime subscriptions usando la función optimizada
      cleanupRealtimeChannels();
      
      // Limpiar timers
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      // ✅ OPTIMIZACIÓN: Limpiar timer de debounce de scroll
      if (scrollDebounceTimerRef.current !== null) {
        clearTimeout(scrollDebounceTimerRef.current);
        scrollDebounceTimerRef.current = null;
      }
      
      // Resetear flags
      isSettingUpRef.current = false;
      reconnectBackoffRef.current = 0;
    };
  }, []); // ✅ Solo ejecutar una vez al montar

  useEffect(() => {
    selectedConversationRef.current = selectedConversation?.id || null;
  }, [selectedConversation]);

  // Debouncing para el searchTerm para evitar filtrado excesivo
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const cleanupRealtimeChannels = useCallback(() => {
    const channels = [
      realtimeChannel,
      convRealtimeChannel,
      uchatRealtimeChannel,
      uchatMessagesRealtimeChannel
    ];
    
    channels.forEach(channel => {
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (error) {
          logDev('⚠️ Error limpiando canal:', error);
        }
      }
    });
    
    setRealtimeChannel(null);
    setConvRealtimeChannel(null);
    setUchatRealtimeChannel(null);
    setUchatMessagesRealtimeChannel(null);
  }, [realtimeChannel, convRealtimeChannel, uchatRealtimeChannel, uchatMessagesRealtimeChannel]);

  const scheduleReconnect = (source: string) => {
    // ✅ PROTECCIÓN: No reconectar si estamos desmontando (hot reload)
    if (isUnmountingRef.current) {
      logDev('🚫 [REALTIME] Ignorando reconexión durante unmount (hot reload)');
      return;
    }
    
    // Evitar múltiples timers concurrentes
    if (reconnectTimerRef.current) {
      logDev('⏸️ [REALTIME] Ya hay una reconexión programada, ignorando...');
      return;
    }
    
    // ✅ PROTECCIÓN: No reconectar si ya estamos configurando una suscripción
    if (isSettingUpRef.current) {
      logDev('⏸️ [REALTIME] Ya hay una suscripción en proceso, ignorando reconexión...');
      return;
    }
    
    // Aumentar delay progresivamente pero con límite máximo de 30 segundos
    const delay = Math.min(1000 * Math.pow(2, reconnectBackoffRef.current), 30000);
    reconnectBackoffRef.current = Math.min(reconnectBackoffRef.current + 1, 5);
    
    logErrThrottled('reconnect', `♻️ Reintentando Realtime (${source}) en ${delay}ms`);
    
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      
      // ✅ Verificar nuevamente antes de reconectar
      if (isUnmountingRef.current || isSettingUpRef.current) {
        logDev('🚫 [REALTIME] Cancelando reconexión (unmount o setup en curso)');
        return;
      }
      
      cleanupRealtimeChannels();
      setupRealtimeSubscription();
    }, delay);
  };

  const setupRealtimeSubscription = () => {
    // ✅ PROTECCIÓN: No configurar si estamos desmontando (hot reload)
    if (isUnmountingRef.current) {
      logDev('🚫 [REALTIME] Ignorando setup durante unmount (hot reload)');
      return;
    }
    
    // ✅ PROTECCIÓN: Evitar múltiples setup simultáneos
    if (isSettingUpRef.current) {
      logDev('⏸️ [REALTIME] Ya hay una suscripción en proceso, ignorando...');
      return;
    }
    
    // ✅ PROTECCIÓN: Si ya hay un canal activo y suscrito, no crear otro
    if (realtimeChannel) {
      try {
        // Verificar si el canal está realmente suscrito
        const channelState = (realtimeChannel as any).state;
        if (channelState === 'joined' || channelState === 'joining') {
          logDev('✅ [REALTIME] Canal ya está activo, no crear duplicado');
          return;
        }
      } catch (e) {
        // Si no podemos verificar el estado, continuar con el cleanup
      }
    }
    
    isSettingUpRef.current = true; // Marcar que estamos configurando
    
    // Limpiar cualquier suscripción anterior para evitar duplicados
    if (realtimeChannel) {
      try {
        realtimeChannel.unsubscribe();
      } catch (e) {
        // Ignorar errores al desuscribir
      }
      setRealtimeChannel(null);
      setConvRealtimeChannel(null);
      setUchatRealtimeChannel(null);
      setUchatMessagesRealtimeChannel(null);
      // Desuscribir otros canales si existen
      try {
        convRealtimeChannel?.unsubscribe();
        uchatRealtimeChannel?.unsubscribe();
        uchatMessagesRealtimeChannel?.unsubscribe();
      } catch (e) {
        // Ignorar errores
      }
    }
    
    // Usar un canal único con timestamp para evitar conflictos
    const channelId = `live-chat-mensajes-whatsapp-v4-${Date.now()}`;
    const newChannel = analysisSupabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', 
          schema: 'public', 
          table: 'mensajes_whatsapp',
        },
        (payload) => {
          
          const newMessagePayload = payload.new as any;

          // Usar el prospecto_id del payload para encontrar la conversación en la UI
          const targetProspectoId = newMessagePayload.prospecto_id;
          if (!targetProspectoId) {
            return;
          }

          // 🔍 DEBUG: Ver si el mensaje es para la conversación activa

          // Crear el objeto de mensaje
          const newMessage: Message = {
            id: newMessagePayload.id,
            message_id: `real_${newMessagePayload.id}`,
            conversation_id: targetProspectoId,
            sender_type: newMessagePayload.rol === 'Prospecto' ? 'customer' : newMessagePayload.rol === 'AI' ? 'bot' : 'agent',
            sender_name: newMessagePayload.rol || 'Desconocido',
            content: newMessagePayload.mensaje,
            is_read: newMessagePayload.leido ?? false,
            created_at: newMessagePayload.fecha_hora,
          };

          const isActiveConversation = selectedConversationRef.current === targetProspectoId;

          // ✅ OPTIMIZACIÓN: Si es la conversación activa, marcar el mensaje como leído inmediatamente
          if (isActiveConversation && !newMessage.is_read) {
            // Marcar como leído en la BD de forma asíncrona (no bloquea)
            setTimeout(() => {
              analysisSupabase
                .from('mensajes_whatsapp')
                .update({ leido: true })
                .eq('id', newMessage.id)
                .then(() => {})
                .catch(() => {}); // Ignorar errores silenciosamente
            }, 0);
            
            // Actualizar el mensaje local
            newMessage.is_read = true;
          }

          // ✅ OPTIMIZACIÓN: Usar startTransition para actualizaciones no críticas
          // Añadir el mensaje a la conversación correcta (crítico - hacer inmediatamente)
          setMessagesByConversation(prev => {
            const current = prev[targetProspectoId] || [];
            // Prevenir duplicados y reemplazar mensajes optimistas
            const withoutOptimistic = current.filter(m => !m.id.startsWith('temp_'));
            if (withoutOptimistic.some(m => m.id === newMessage.id)) {
              return prev;
            }
            
              return {
              ...prev,
              [targetProspectoId]: [...withoutOptimistic, newMessage],
            };
          });

          // Actualizar la lista de conversaciones (no crítico - diferir con startTransition)
          startTransition(() => {
            setConversations(prev => {
            const conversationIndex = prev.findIndex(c => c.id === targetProspectoId || c.prospecto_id === targetProspectoId);
            
            if (conversationIndex === -1) {
              // ✅ Si la conversación no está en la lista, cargar solo esa conversación nueva SIN recargar todo
              logDev('📨 [REALTIME] Conversación nueva detectada, cargando datos del prospecto...');
              
              // ✅ OPTIMIZACIÓN: Diferir carga de conversación nueva (no crítico)
              setTimeout(() => {
                (async () => {
                  try {
                    const { data: convData, error } = await analysisSupabase.rpc('get_conversations_ordered');
                    if (error || !convData) return;
                    
                    // Encontrar la conversación del prospecto en los resultados
                    const newConv = convData.find((c: any) => c.prospecto_id === targetProspectoId);
                    if (!newConv) return;
                    
                    // Adaptar al formato de Conversation
                    const adaptedConv: Conversation = {
                      id: newConv.prospecto_id,
                      prospecto_id: newConv.prospecto_id,
                      nombre_contacto: newConv.nombre_contacto || newConv.numero_telefono,
                      customer_name: newConv.nombre_contacto,
                      status: newConv.estado_prospecto,
                      last_message_at: newConv.fecha_ultimo_mensaje,
                      message_count: newConv.mensajes_totales,
                      unread_count: newConv.mensajes_no_leidos,
                      ultimo_mensaje_preview: newConv.ultimo_mensaje,
                      numero_telefono: newConv.numero_telefono,
                      updated_at: newConv.fecha_ultimo_mensaje,
                      fecha_inicio: newConv.fecha_creacion_prospecto,
                      tipo: 'whatsapp',
                      metadata: { 
                        prospecto_id: newConv.prospecto_id,
                        id_uchat: newConv.id_uchat
                      }
                    };
                    
                    // Agregar la conversación nueva usando startTransition
                    startTransition(() => {
                      setConversations(prevList => {
                        // Verificar si ya fue agregada (evitar duplicados)
                        if (prevList.some(c => c.id === targetProspectoId || c.prospecto_id === targetProspectoId)) {
                          return prevList;
                        }
                        return [adaptedConv, ...prevList];
                      });
                    });
                    
                    logDev('✅ [REALTIME] Conversación nueva agregada sin recargar toda la lista');
                  } catch (error) {
                    console.error('❌ Error cargando conversación nueva:', error);
                  }
                })();
              }, 0);
              
              return prev; // Mantener la lista actual mientras se carga la nueva
            }

            const currentConv = prev[conversationIndex];
            const isFromAgent = newMessage.sender_type === 'agent';


            const updatedConv: Conversation = { 
              ...currentConv, 
              last_message_at: newMessage.created_at, 
              updated_at: newMessage.created_at, // ✅ Actualizar también updated_at para ordenamiento
              ultimo_mensaje_preview: newMessage.content?.substring(0, 100) || '',
              message_count: (currentConv.message_count || 0) + 1,
              // ✅ OPTIMIZACIÓN: Si es la conversación activa, NO incrementar el contador
              unread_count: (!isActiveConversation && !isFromAgent)
                ? (currentConv.unread_count || 0) + 1
                : 0, // Forzar a 0 si está activa
              mensajes_no_leidos: (!isActiveConversation && !isFromAgent)
                ? (currentConv.mensajes_no_leidos || 0) + 1
                : 0 // Forzar a 0 si está activa
            };
            
            
            // ✅ Mover la conversación al principio de la lista (siempre la más reciente arriba)
            const conversationsWithoutUpdated = prev.filter(c => c.id !== targetProspectoId && c.prospecto_id !== targetProspectoId);
            const reorderedList = [updatedConv, ...conversationsWithoutUpdated];
            
            logDev('✅ [REALTIME] Conversación actualizada y movida a posición 1');
            
            return reorderedList;
          });
        });
        }
      )
      // ========================================
      // 🔔 SUSCRIPCIÓN 2: Cambios en tabla PROSPECTOS
      // ========================================
      // Detectar cuando se actualiza el nombre o nombre_whatsapp
      // para refrescar la lista de conversaciones y mostrar el nombre actualizado
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospectos',
          // No usar filter: undefined, mejor especificar explícitamente
        },
        (payload) => {
          const updatedProspecto = payload.new as any;
          const prospectoId = updatedProspecto.id;
          
          // ✅ OPTIMIZACIÓN: Diferir actualización de nombre (no crítico)
          startTransition(() => {
            setConversations(prev => {
              return prev.map(conv => {
                if (conv.prospecto_id === prospectoId) {
                  // ✅ Usar función helper para determinar nombre según priorización
                  const newName = getDisplayName({
                    nombre_completo: updatedProspecto.nombre_completo,
                    nombre_whatsapp: updatedProspecto.nombre_whatsapp,
                    whatsapp: updatedProspecto.whatsapp
                  });
                  
                  return {
                    ...conv,
                    customer_name: newName,
                    nombre_contacto: newName
                  };
                }
                return conv;
              });
            });
          });
        }
      )
      // ========================================
      // 🔔 SUSCRIPCIÓN 3: Nuevas conversaciones (INSERT en mensajes_whatsapp para prospectos nuevos)
      // ========================================
      // Cuando llega un mensaje para un prospecto que no está en la lista,
      // ya se maneja en la suscripción 1 recargando la lista completa
      // Esto asegura que las conversaciones nuevas aparezcan inmediatamente
      .subscribe((status, err) => {
        // ✅ Resetear flag cuando la suscripción se completa (éxito o error)
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isSettingUpRef.current = false;
        }
        
        if (status === 'SUBSCRIBED') {
          logDev('✅ [REALTIME V4] Suscripción activa: mensajes y prospectos');
          // Resetear backoff cuando se suscribe correctamente
          reconnectBackoffRef.current = 0;
        } else if (status === 'CHANNEL_ERROR') {
          const errorMsg = err?.message || String(err || 'unknown');
          
          // Ignorar errores de "mismatch" que son comunes y no críticos
          if (errorMsg.includes('mismatch between server and client bindings')) {
            logDev('⚠️ [REALTIME V4] Warning de mismatch (no crítico), continuando...');
            return;
          }
          
          // Manejo mejorado de errores undefined o de conexión
          if (err === undefined || errorMsg === 'undefined') {
            logErrThrottled('realtime_undefined', '⚠️ [REALTIME V4] Error undefined - posible sobrecarga de conexiones');
            
            // Para errores undefined, esperar más tiempo antes del reconnect
            if (reconnectBackoffRef.current < 2) {
              reconnectBackoffRef.current = 2; // Saltar a 4 segundos mínimo
            }
          } else {
            console.error('❌ [REALTIME V4] Error en el canal:', err);
          }
          
          // Limitar reconexiones si hay muchas conversaciones activas
          const maxConversations = 15;
          if (conversations.length > maxConversations) {
            logErrThrottled('realtime_overload', `⚠️ [REALTIME V4] Demasiadas conversaciones (${conversations.length}), ralentizando reconnect`);
            // Aumentar delay para evitar sobrecarga
            reconnectBackoffRef.current = Math.max(reconnectBackoffRef.current, 3);
          }
          
          scheduleReconnect('channel_error');
        } else if (status === 'TIMED_OUT') {
          logDev('⏱️ [REALTIME V4] Timeout, reintentando...');
          scheduleReconnect('timeout');
        } else if (status === 'CLOSED') {
          logDev('⚠️ [REALTIME V4] Canal cerrado, reintentando...');
          scheduleReconnect('channel_closed');
        }
      });

    setRealtimeChannel(newChannel);
  };

  // Función de throttling para actualizaciones masivas
  const throttledUpdateConversations = useCallback((updateFn: (prev: Conversation[]) => Conversation[]) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const minInterval = conversations.length > 15 ? 1000 : 300; // 1s si hay muchas, 300ms normal
    
    if (timeSinceLastUpdate < minInterval) {
      // Agregar a queue de actualizaciones pendientes
      pendingUpdatesRef.current.push(updateFn);
      
      // Procesar queue después del intervalo mínimo
      setTimeout(() => {
        if (pendingUpdatesRef.current.length > 0) {
          const updates = [...pendingUpdatesRef.current];
          pendingUpdatesRef.current = [];
          
          setConversations(prev => {
            let result = prev;
            updates.forEach(fn => {
              result = fn(result);
            });
            return result;
          });
          
          lastUpdateRef.current = Date.now();
        }
      }, minInterval - timeSinceLastUpdate);
      
      return;
    }
    
    // Actualización inmediata si ha pasado suficiente tiempo
    setConversations(updateFn);
    lastUpdateRef.current = now;
  }, [conversations.length]);

  const handleNewMessageForSorting = (newMessage: any) => {
    
    // Buscar la conversación que corresponde a este mensaje
    const messageProspectoId = newMessage.prospecto_id;
    const messageTimestamp = newMessage.fecha_hora || newMessage.created_at;
    const messageRole = newMessage.rol;
    
    let matchedByProspect = false;
    
    throttledUpdateConversations(prev => {
      const updatedConversations = prev.map(conv => {
        if (conv.prospecto_id === messageProspectoId) {
          matchedByProspect = true;
          return {
            ...conv,
            updated_at: messageTimestamp,
            last_message_at: messageTimestamp,
            message_count: (conv.message_count || 0) + 1,
            ultimo_mensaje_preview: newMessage.mensaje?.substring(0, 100) || '',
            ultimo_mensaje_sender: newMessage.rol || ''
          };
        }
        return conv;
      });

      if (!matchedByProspect) {
        // Fallback: intentar empatar por teléfono o id_uchat del prospecto
        (async () => {
          try {
            const { data: prospecto } = await analysisSupabase
              .from('prospectos')
              .select('whatsapp, id_uchat')
              .eq('id', messageProspectoId)
              .single();
            if (!prospecto) return;

            const phone = (prospecto.whatsapp || '').toString();
            const variations = [
              phone,
              phone.replace('+52', ''),
              phone.startsWith('52') ? phone.substring(2) : `52${phone}`,
              `+52${phone}`,
              `52${phone}`
            ].filter(Boolean);

            setConversations(prev2 => {
              const updated2 = prev2.map(conv => {
                const phoneMatch = variations.some(v =>
                  (conv.customer_phone || '').includes(v) || v.includes(conv.customer_phone || '')
                );
                const uchatMatch = conv.metadata?.id_uchat && prospecto.id_uchat && conv.metadata.id_uchat === prospecto.id_uchat;
                if (phoneMatch || uchatMatch) {
                  return {
                    ...conv,
                    updated_at: messageTimestamp,
                    last_message_at: messageTimestamp,
                    message_count: (conv.message_count || 0) + 1,
                    ultimo_mensaje_preview: newMessage.mensaje?.substring(0, 100) || '',
                    ultimo_mensaje_sender: newMessage.rol || ''
                  };
                }
                return conv;
              });
              return updated2.sort((a, b) =>
                new Date(b.last_message_at || b.updated_at).getTime() - new Date(a.last_message_at || a.updated_at).getTime()
              );
            });
          } catch {}
        })();
      }

      const sortedConversations = updatedConversations.sort((a, b) => 
        new Date(b.last_message_at || b.updated_at).getTime() - new Date(a.last_message_at || a.updated_at).getTime()
      );
      return sortedConversations;
    });

    // Incrementar unread si no es la conversación activa y el mensaje no es del agente
    const activeProspect = selectedConversation?.prospecto_id;
    const isActive = activeProspect && activeProspect === messageProspectoId;
    if (!isActive && messageRole !== 'Vendedor') {
      const targetConv = conversations.find(c => c.prospecto_id === messageProspectoId);
      if (targetConv) {
        setUnreadCounts(prev => ({
          ...prev,
          [targetConv.id]: (prev[targetConv.id] || 0) + 1
        }));
      }
    }
  };

  const handleRealtimeConversationChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        // Nueva conversación
        setConversations(prev => {
          const updated = [newRecord, ...prev];
          return updated.sort((a, b) => 
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        });
        break;
        
      case 'UPDATE':
        // Conversación actualizada (nuevo mensaje)
        setConversations(prev => {
          const updated = prev.map(conv => 
            conv.id === newRecord.id ? newRecord : conv
          );
          return updated.sort((a, b) => 
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        });
        
        // Actualizar unread counts si no es la conversación activa
        if (selectedConversation?.id !== newRecord.id && newRecord.unread_count > 0) {
          setUnreadCounts(prev => ({
            ...prev,
            [newRecord.id]: newRecord.unread_count
          }));
        } else if (selectedConversation?.id === newRecord.id) {
          // Si es la conversación activa, mantener unread_count en 0
          setUnreadCounts(prev => ({
            ...prev,
            [newRecord.id]: 0
          }));
        }
        break;
        
      case 'DELETE':
        // Conversación eliminada
        setConversations(prev => prev.filter(conv => conv.id !== oldRecord.id));
        break;
    }
  };

  // Efecto separado para selección automática después de cargar conversaciones
  useEffect(() => {
    // Verificar si hay un prospecto específico para seleccionar
    const prospectoId = localStorage.getItem('livechat-prospect-id');
    if (prospectoId && conversations.length > 0) {
      localStorage.removeItem('livechat-prospect-id');
      selectConversationByProspectId(prospectoId);
    }
  }, [conversations]); // Se ejecuta cuando las conversaciones cambian

  const selectConversationByProspectId = (prospectoId: string) => {
    // Método 1: Buscar por prospect_id en metadata
    let conversation = conversations.find(conv => 
      conv.metadata?.prospect_id === prospectoId
    );
    
    if (conversation) {
      setSelectedConversation(conversation);
      return;
    }
    
    // Método 2: Buscar por whatsapp del prospecto
    loadProspectoAndFindConversation(prospectoId);
  };

  const loadProspectoAndFindConversation = async (prospectoId: string) => {
    try {
      const { data: prospecto, error } = await analysisSupabase
        .from('prospectos')
        .select('whatsapp, id_uchat')
        .eq('id', prospectoId)
        .single();

      if (error || !prospecto) return;

      // Buscar por whatsapp (customer_phone)
      let conversation = conversations.find(conv => 
        conv.customer_phone === prospecto.whatsapp
      );

      if (conversation) {
        setSelectedConversation(conversation);
        return;
      }

      // Buscar variaciones de teléfono
      const phoneVariations = [
        prospecto.whatsapp,
        prospecto.whatsapp.replace('+52', ''),
        prospecto.whatsapp.replace('52', ''),
        `+52${prospecto.whatsapp}`,
        `52${prospecto.whatsapp}`
      ];

      for (const phoneVar of phoneVariations) {
        conversation = conversations.find(conv => 
          conv.customer_phone === phoneVar || 
          conv.customer_phone.includes(phoneVar) ||
          phoneVar.includes(conv.customer_phone)
        );
        
        if (conversation) {
          setSelectedConversation(conversation);
          return;
        }
      }

      // Buscar por id_uchat
      if (prospecto.id_uchat) {
        conversation = conversations.find(conv => 
          conv.conversation_id === prospecto.id_uchat
        );

        if (conversation) {
          setSelectedConversation(conversation);
          return;
        }
      }

    } catch (error) {
      // Silencioso
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessagesAndBlocks(selectedConversation.id, selectedConversation.prospecto_id);
      // Marcar como leída al seleccionar
      markConversationAsRead(selectedConversation.prospecto_id);
    }
  }, [selectedConversation?.id]);

  const markConversationAsRead = async (prospectoId: string) => {
    if (!prospectoId) return;
    
    // ✅ OPTIMIZACIÓN: Evitar llamadas simultáneas para la misma conversación
    if (markingAsReadRef.current.has(prospectoId)) {
      return; // Ya hay una llamada en progreso para esta conversación
    }
    
    markingAsReadRef.current.add(prospectoId);
    
    try {
      // Usar RPC para bypass RLS y marcar mensajes como leídos
      const { data, error } = await analysisSupabase
        .rpc('mark_messages_as_read', { p_prospecto_id: prospectoId });

      if (error) {
        console.error('❌ [MARK READ] Error en RPC:', error);
        throw error;
      }
      
      const result = data as { success: boolean; messages_marked: number; error?: string };
      
      if (!result.success) {
        console.error('❌ [MARK READ] RPC falló:', result.error);
        return;
      }
      
      const messagesMarked = result.messages_marked;
      
      // Actualizar el contador en la lista de conversaciones a 0
      setConversations(prev => {
        const updated = prev.map(c => 
          c.id === prospectoId 
            ? { ...c, unread_count: 0, mensajes_no_leidos: 0 } 
            : c
        );
        return updated;
      });
      
      // Actualizar TODOS los mensajes locales para reflejar que están leídos
      setMessagesByConversation(prev => {
        const messages = prev[prospectoId];
        if (!messages || messages.length === 0) {
          return prev;
        }
        
        const updatedMessages = messages.map(msg => ({
          ...msg,
          is_read: true
        }));
        
        
        return {
          ...prev,
          [prospectoId]: updatedMessages
        };
      });
      
      
    } catch (error) {
      console.error('❌ [MARK READ] Error:', error);
    } finally {
      // ✅ LIMPIAR: Remover el flag de procesamiento
      markingAsReadRef.current.delete(prospectoId);
    }
  };

  const incrementUnreadCount = async (conversationId: string, increment: number = 1) => {
    // Solo incrementar si NO es la conversación activa
    if (selectedConversation?.id === conversationId) return;

    // Actualizar en base de datos
    const { data: currentConv } = await supabaseSystemUI
      .from('uchat_conversations')
      .select('unread_count')
      .eq('id', conversationId)
      .single();

    const newUnreadCount = (currentConv?.unread_count || 0) + increment;

    await supabaseSystemUI
      .from('uchat_conversations')
      .update({ unread_count: newUnreadCount })
      .eq('id', conversationId);

    // Actualizar estado local
    setUnreadCounts(prev => ({
      ...prev,
      [conversationId]: newUnreadCount
    }));
  };

  useEffect(() => {
    // Auto-scroll solo si el usuario no está escribiendo ni se desplazó manualmente
    const activeElement = document.activeElement as HTMLElement | null;
    const isTyping = !!activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    if (!isTyping && !userScrolledAwayRef.current) {
    scrollToBottom();
    }
  }, [currentMessages]);

  useEffect(() => {
    // Guardar distribución de columnas en localStorage
    localStorage.setItem('livechat-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    // Detectar cambios en el sidebar observando las clases CSS del contenido principal
    const detectSidebarState = () => {
      const mainContent = document.querySelector('.flex-1.flex.flex-col');
      if (mainContent) {
        const isCollapsed = mainContent.classList.contains('lg:ml-16');
        setSidebarCollapsed(isCollapsed);
      }
    };

    // Observar cambios en las clases del contenido principal
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          detectSidebarState();
        }
      });
    });

    // Buscar el contenido principal y observarlo
    const mainContent = document.querySelector('.flex-1.flex.flex-col');
    if (mainContent) {
      observer.observe(mainContent, { 
        attributes: true, 
        attributeFilter: ['class']
      });
    }

    // Verificar estado inicial
    detectSidebarState();

    // También observar cambios en el tamaño de ventana
    const handleResize = () => {
      detectSidebarState();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Polling optimizado para mensajes de conversación activa (3 segundos)
    const messagesInterval = setInterval(async () => {
      if (selectedConversation && !sending) {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA'
        );
        
        if (!isTyping) {
          await syncMessagesForOpenConversation();
        }
      }
    }, 3000);

    return () => clearInterval(messagesInterval);
  }, [selectedConversation, sending]);

  // Marcar como leído cuando la pestaña vuelve a foco o se hace visible
  useEffect(() => {
    const onFocus = () => {
      if (selectedConversationRef.current && !userScrolledAwayRef.current) {
        markConversationAsRead(selectedConversationRef.current);
      }
    };
    const onVisibility = () => {
      if (!document.hidden && selectedConversationRef.current && !userScrolledAwayRef.current) {
        markConversationAsRead(selectedConversationRef.current);
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    // Polling deshabilitado temporalmente para debugging
    // const conversationsInterval = setInterval(async () => {
    //   if (!sending && !syncInProgress) {
    //     // Cargar conversaciones sin setLoading para evitar parpadeos
    //     await loadConversationsQuiet();
    //   }
    // }, 5000);

    // return () => clearInterval(conversationsInterval);
  }, [sending, syncInProgress]);

  const parseHistoricMessages = (summary: string, conversationId: string) => {
    try {
      // El summary puede contener mensajes históricos en formato JSON o texto
      const historicMessages = [];
      
      if (summary.includes('[') && summary.includes(']')) {
        // Si es JSON array
        const parsed = JSON.parse(summary);
        parsed.forEach((msg: any, index: number) => {
          historicMessages.push({
            id: `historic_${conversationId}_${index}`,
            message_id: `historic_${conversationId}_${index}`,
            conversation_id: conversationId,
            sender_type: msg.rol === 'Prospecto' ? 'customer' : 'bot',
            sender_name: msg.rol === 'Prospecto' ? 'Prospecto' : 'AI',
            content: msg.mensaje || msg.content || msg,
            is_read: true,
            created_at: msg.fecha_hora || msg.timestamp || new Date().toISOString()
          });
        });
      } else {
        // Si es texto plano, crear un mensaje único
        historicMessages.push({
          id: `historic_${conversationId}_summary`,
          message_id: `historic_${conversationId}_summary`,
          conversation_id: conversationId,
          sender_type: 'bot',
          sender_name: 'Sistema',
          content: summary,
          is_read: true,
          created_at: new Date().toISOString()
        });
      }
      
      return historicMessages;
    } catch (error) {
      console.error('❌ Error parseando summary:', error);
      return [];
    }
  };

  const loadConversationsFromMessages = async () => {
    try {
      
      // Obtener todos los prospecto_id únicos que tienen mensajes
      const { data: uniqueProspectos, error: prospectoError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('prospecto_id')
        .not('prospecto_id', 'is', null);

      if (prospectoError) {
        console.error('❌ Error obteniendo prospectos:', prospectoError);
        return;
      }

      // Crear Set para prospecto_id únicos
      const prospectoIds = [...new Set(uniqueProspectos?.map(p => p.prospecto_id) || [])];

      const conversations = [];

      // Para cada prospecto, crear una conversación
      for (const prospectoId of prospectoIds) {
        // Obtener último mensaje del prospecto
        const { data: lastMessage } = await analysisSupabase
          .from('mensajes_whatsapp')
          .select('*')
          .eq('prospecto_id', prospectoId)
          .order('fecha_hora', { ascending: false })
          .limit(1)
          .single();

        // Obtener información del prospecto incluyendo id_uchat
        const { data: prospecto } = await analysisSupabase
          .from('prospectos')
          .select('nombre_completo, whatsapp, id_uchat')
          .eq('id', prospectoId)
          .single();

        // Contar mensajes totales
        const { count } = await analysisSupabase
          .from('mensajes_whatsapp')
          .select('*', { count: 'exact', head: true })
          .eq('prospecto_id', prospectoId);

      if (lastMessage) {
          conversations.push({
            id: lastMessage.conversacion_id || prospectoId, // Usar conversacion_id o prospecto_id como fallback
            prospecto_id: prospectoId,
            nombre_contacto: prospecto?.nombre_completo || 'Sin nombre',
            customer_name: prospecto?.nombre_completo || 'Sin nombre', // ✅ Agregar para UI
            customer_phone: prospecto?.whatsapp || '',
            numero_telefono: prospecto?.whatsapp || '',
          estado: 'activa',
          status: 'active',
          mensajes_no_leidos: 0,
          unread_count: 0,
          updated_at: lastMessage.fecha_hora,
          last_message_at: lastMessage.fecha_hora,
            ultimo_mensaje_preview: lastMessage.mensaje?.substring(0, 100) || '',
            ultimo_mensaje_sender: lastMessage.rol || '',
            fecha_inicio: lastMessage.fecha_hora,
          tipo: 'INBOUND',
          message_count: count || 0,
            // Agregar metadata para compatibilidad
            metadata: {
              id_uchat: prospecto?.id_uchat || ''
            }
          });
        }
      }

      // Ordenar por último mensaje (last_message_at si existe, si no updated_at)
      conversations.sort((a, b) => 
        new Date(b.last_message_at || b.updated_at).getTime() - new Date(a.last_message_at || a.updated_at).getTime()
      );
      
      setConversations(conversations);

      // Inicializar unread_counts
      const unreadMap: { [key: string]: number } = {};
      conversations.forEach(conv => {
        unreadMap[conv.id] = Number(conv.unread_count ?? conv.mensajes_no_leidos ?? 0);
      });
      setUnreadCounts(unreadMap);

    } catch (error) {
      console.error('❌ Error en loadConversationsFromMessages:', error);
    }
  };

  const loadConversationsQuiet = async () => {
    try {
      // Usar servicio con filtros de permisos
      const data = await uchatService.getConversations({
        userId: user?.id, // Pasar userId para aplicar filtros de permisos
        limit: 100
      });

      if (!data) return;

      // Actualizar solo si hay cambios reales (evitar parpadeos)
      setConversations(prevConversations => {
        if (JSON.stringify(prevConversations) === JSON.stringify(data)) {
          return prevConversations; // No hay cambios, no re-render
        }
        return data || [];
      });
      
      // Actualizar unread_counts solo si hay cambios
      if (data) {
        setUnreadCounts(prevUnread => {
          const newUnreadMap: { [key: string]: number } = {};
          data.forEach(conv => {
            newUnreadMap[conv.id] = conv.unread_count || 0;
          });
          
          // Solo actualizar si hay diferencias
          if (JSON.stringify(prevUnread) !== JSON.stringify(newUnreadMap)) {
            return newUnreadMap;
          }
          return prevUnread;
        });
      }
    } catch (error) {
      // Silencioso
    }
  };


  useEffect(() => {
    // Cargar estado de pausa desde localStorage al iniciar
    const loadBotPauseStatus = () => {
      const savedPauseStatus = localStorage.getItem('bot-pause-status');
      if (savedPauseStatus) {
        try {
          const parsed = JSON.parse(savedPauseStatus);
          const currentTime = new Date();
          
        // Filtrar pausas que ya expiraron
        const activePauses: any = {};
        Object.entries(parsed).forEach(([uchatId, status]: [string, any]) => {
          if (status.pausedUntil) {
            const pausedUntilTime = new Date(status.pausedUntil).getTime();
            const timeRemaining = pausedUntilTime - currentTime.getTime();
            
            
            if (timeRemaining > 0) {
              activePauses[uchatId] = {
                ...status,
                pausedUntil: new Date(status.pausedUntil)
              };
            } else {
            }
          }
        });
        
        setBotPauseStatus(activePauses);
        } catch (error) {
          console.error('❌ Error cargando estado de pausa:', error);
        }
      }
    };

    loadBotPauseStatus();
  }, []);

  useEffect(() => {
    // Timer para actualizar contador cada segundo
    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      
      setBotPauseStatus(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.entries(updated).forEach(([uchatId, status]) => {
          if (status.isPaused && status.pausedUntil) {
            const pausedUntilTime = status.pausedUntil instanceof Date 
              ? status.pausedUntil.getTime() 
              : new Date(status.pausedUntil).getTime();
            
            // Solo reactivar si realmente ha expirado (con margen de 2 segundos)
            if (currentTime > pausedUntilTime + 2000) {
              delete updated[uchatId];
              hasChanges = true;
            }
          }
        });
        
        if (hasChanges) {
          // Actualizar localStorage
          const storageData = Object.fromEntries(
            Object.entries(updated).map(([id, status]) => [
              id, 
              { 
                ...status, 
                pausedUntil: status.pausedUntil instanceof Date 
                  ? status.pausedUntil.toISOString() 
                  : status.pausedUntil 
              }
            ])
          );
          localStorage.setItem('bot-pause-status', JSON.stringify(storageData));
        }
        
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================
  // MÉTODOS DE REDIMENSIONAMIENTO
  // ============================================

  const handleMouseDown = (e: React.MouseEvent, resizeType: 'conversations' | 'blocks') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidths = { ...columnWidths };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = e.clientX - startX;

      if (resizeType === 'conversations') {
        const newWidth = Math.max(250, Math.min(500, startWidths.conversations + deltaX));
        setColumnWidths({
          ...columnWidths,
          conversations: newWidth
        });
      } else if (resizeType === 'blocks') {
        const newWidth = Math.max(200, Math.min(400, startWidths.blocks + deltaX));
        setColumnWidths({
          ...columnWidths,
          blocks: newWidth
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ============================================
  // MÉTODOS DE CARGA
  // ============================================

  const loadConversations = async (searchTerm = '') => {
      setLoading(true);
    try {
      // Usar uchatService.getConversations que aplica filtros de permisos automáticamente
      // Esto asegura que coordinadores vean todas las conversaciones de su coordinación
      const uchatConversationsRaw = await uchatService.getConversations({
        userId: user?.id, // Pasar userId para aplicar filtros de permisos
        limit: 100
      });

      // Enriquecer conversaciones con datos de coordinación y ejecutivo
      const uchatConversations = await Promise.all(
        uchatConversationsRaw.map(async (conv) => {
          let coordinacionInfo = null;
          let ejecutivoInfo = null;

          if (conv.coordinacion_id) {
            try {
              coordinacionInfo = await coordinacionService.getCoordinacionById(conv.coordinacion_id);
            } catch (error) {
              console.warn('Error obteniendo coordinación:', error);
            }
          }

          if (conv.ejecutivo_id) {
            try {
              ejecutivoInfo = await coordinacionService.getEjecutivoById(conv.ejecutivo_id);
            } catch (error) {
              console.warn('Error obteniendo ejecutivo:', error);
            }
          }

          return {
            ...conv,
            metadata: {
              ...conv.metadata,
              coordinacion_id: conv.coordinacion_id,
              coordinacion_codigo: coordinacionInfo?.codigo,
              coordinacion_nombre: coordinacionInfo?.nombre,
              ejecutivo_id: conv.ejecutivo_id,
              ejecutivo_nombre: ejecutivoInfo?.full_name,
              ejecutivo_email: ejecutivoInfo?.email
            }
          };
        })
      );

      // También obtener conversaciones desde mensajes_whatsapp para conversaciones sin uchat_conversations
      // pero aplicar filtros de permisos
      let whatsappConversations: Conversation[] = [];
      
      try {
        const { data: rpcData, error: rpcError } = await analysisSupabase.rpc('get_conversations_ordered');
        
        if (!rpcError && rpcData) {
          // Adaptar los datos al formato que espera la UI y enriquecer con asignación
          const adaptedConversations: Conversation[] = await Promise.all(
            rpcData.map(async (c: any) => {
              let coordinacionInfo = null;
              let ejecutivoInfo = null;

              // Obtener datos de asignación del prospecto
              if (c.prospecto_id) {
                try {
                  const { data: prospecto } = await analysisSupabase
                    .from('prospectos')
                    .select('coordinacion_id, ejecutivo_id')
                    .eq('id', c.prospecto_id)
                    .single();

                  if (prospecto?.coordinacion_id) {
                    coordinacionInfo = await coordinacionService.getCoordinacionById(prospecto.coordinacion_id);
                  }

                  if (prospecto?.ejecutivo_id) {
                    ejecutivoInfo = await coordinacionService.getEjecutivoById(prospecto.ejecutivo_id);
                  }
                } catch (error) {
                  console.warn('Error obteniendo asignación del prospecto:', error);
                }
              }

              return {
                id: c.prospecto_id,
                prospecto_id: c.prospecto_id,
                nombre_contacto: c.nombre_contacto || c.numero_telefono,
                customer_name: c.nombre_contacto,
                status: c.estado_prospecto,
                last_message_at: c.fecha_ultimo_mensaje,
                message_count: c.mensajes_totales,
                unread_count: c.mensajes_no_leidos,
                ultimo_mensaje_preview: c.ultimo_mensaje,
                numero_telefono: c.numero_telefono,
                updated_at: c.fecha_ultimo_mensaje,
                fecha_inicio: c.fecha_creacion_prospecto,
                tipo: 'whatsapp',
                metadata: { 
                  prospecto_id: c.prospecto_id,
                  id_uchat: c.id_uchat,
                  coordinacion_id: coordinacionInfo?.id,
                  coordinacion_codigo: coordinacionInfo?.codigo,
                  coordinacion_nombre: coordinacionInfo?.nombre,
                  ejecutivo_id: ejecutivoInfo?.id,
                  ejecutivo_nombre: ejecutivoInfo?.full_name,
                  ejecutivo_email: ejecutivoInfo?.email
                }
              };
            })
          );
          
          // Aplicar filtros de permisos para conversaciones de WhatsApp
          if (user?.id) {
            for (const conv of adaptedConversations) {
              if (conv.prospecto_id) {
                const canAccess = await permissionsService.canUserAccessProspect(user.id, conv.prospecto_id);
                if (canAccess.canAccess) {
                  whatsappConversations.push(conv);
                }
              }
            }
          } else {
            whatsappConversations = adaptedConversations;
          }
        }
      } catch (rpcError) {
        console.warn('⚠️ Error obteniendo conversaciones desde RPC, continuando solo con uchat:', rpcError);
      }

      // Combinar conversaciones de uchat y whatsapp, eliminando duplicados
      const allConversations = [...uchatConversations, ...whatsappConversations];
      const uniqueConversations = allConversations.filter((conv, index, self) =>
        index === self.findIndex(c => c.id === conv.id)
      );

      // Ordenar por última actualización
      uniqueConversations.sort((a, b) => {
        const dateA = new Date(a.last_message_at || a.updated_at || 0).getTime();
        const dateB = new Date(b.last_message_at || b.updated_at || 0).getTime();
        return dateB - dateA;
      });

      // Filtrado por búsqueda en el cliente
      let filtered = uniqueConversations;
      if (searchTerm) {
        filtered = filtered.filter(c => 
          c.nombre_contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.numero_telefono?.includes(searchTerm)
        );
      }

      setConversations(filtered);

    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      // Usar las conversaciones ya cargadas y filtradas por permisos
      // Estas ya están filtradas según el rol del usuario en loadConversations
      const filteredConvs = filteredConversations.length > 0 ? filteredConversations : conversations;
      
      // Contar conversaciones filtradas
      const totalConversations = filteredConvs.length;
      
      // Contar conversaciones activas (basado en status o estado)
      const activeConversations = filteredConvs.filter(c => 
        c.status === 'active' || c.estado === 'activa'
      ).length;
      
      // Contar conversaciones transferidas
      const transferredConversations = filteredConvs.filter(c => 
        c.status === 'transferred' || c.estado === 'transferida'
      ).length;
      
      // Contar conversaciones cerradas
      const closedConversations = filteredConvs.filter(c => 
        c.status === 'closed' || c.estado === 'finalizada'
      ).length;
      
      // Calcular total de no leídos desde las conversaciones filtradas
      const totalUnread = filteredConvs.reduce((acc, c) => {
        return acc + Number(c.mensajes_no_leidos ?? c.unread_count ?? 0);
      }, 0);
      
      setMetrics({
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0
      });
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  };

  const loadMessagesAndBlocks = async (conversationId: string, prospectoId: string | undefined) => {
    try {
      // El conversationId de la UI es el prospecto_id. Usamos este para la consulta.
      const queryId = conversationId; 

      const { data: conversationMessages, error: messagesError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', queryId) // CORREGIDO: Usar prospecto_id
        .order('fecha_hora', { ascending: true });

      let adaptedMessages: Message[] = [];
      if (conversationMessages) {
        adaptedMessages = conversationMessages.map(msg => ({
          id: msg.id,
          message_id: `real_${msg.id}`,
          conversation_id: conversationId,
          sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
          sender_name: msg.rol || 'Desconocido',
          content: msg.mensaje,
          is_read: msg.leido ?? true,
          created_at: msg.fecha_hora,
          adjuntos: msg.adjuntos, // ✅ Incluir adjuntos multimedia
        } as any));
      } else {
      }

      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: adaptedMessages,
      }));

      // La marcación de "leído" debería ocurrir en la tabla de origen (mensajes_whatsapp) si es necesario.
      // Por ahora, lo dejamos fuera para evitar más complejidad.
      // await markMessagesAsRead(conversationId); 

    } catch (error) {
      console.error('❌ Error en loadMessagesAndBlocks (analysisSupabase):', error);
    }
  };

  const groupMessagesByDay = (messages: Message[]): ConversationBlock[] => {
    const blocks: { [date: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at || message.fecha_hora).toISOString().split('T')[0];
      if (!blocks[date]) {
        blocks[date] = [];
      }
      blocks[date].push(message);
    });

    return Object.entries(blocks)
      .map(([date, msgs]) => ({
        date,
        message_count: msgs.length,
        first_message_time: msgs[0].created_at,
        last_message_time: msgs[msgs.length - 1].created_at,
        messages: msgs
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await uchatService.markConversationMessagesAsRead(conversationId);
      // Opcional: Actualizar el estado local para reflejar el cambio inmediatamente
      setMessagesByConversation(prev => {
        const current = prev[conversationId] || [];
        const updated = current.map(msg =>
          msg.conversation_id === conversationId && !msg.is_read
            ? { ...msg, is_read: true }
            : msg
        );
        return { ...prev, [conversationId]: updated };
      });
    } catch (error) {
      console.error('❌ Error al marcar mensajes como leídos:', error);
    }
  };

  // ============================================
  // MÉTODOS DE SINCRONIZACIÓN REAL
  // ============================================

  const performSilentSync = async () => {
    if (syncInProgress) return;

    try {
      setSyncInProgress(true);

      await syncNewConversations();
      await syncNewMessages();

      setLastSyncTime(new Date());
    } catch (error) {
      console.error('❌ Error en sincronización silenciosa:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  const syncNewConversations = async () => {
    try {
      
      // Usar cliente importado único

      // 1. Obtener prospectos activos con id_uchat
      const { data: activeProspects, error: prospectsError } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_whatsapp, whatsapp, id_uchat, etapa, updated_at, email')
        .not('id_uchat', 'is', null)
        .in('etapa', ['Interesado', 'Validando si es miembro', 'Primer contacto'])
        .order('updated_at', { ascending: false });

      if (prospectsError || !activeProspects) {
        console.error('❌ Error obteniendo prospectos:', prospectsError);
        return;
      }

      // 2. Verificar cuáles ya existen en uchat_conversations
      const uchatIds = activeProspects.map(p => p.id_uchat);
      const { data: existingConversations, error: existingError } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('conversation_id')
        .in('conversation_id', uchatIds);

      if (existingError) {
        console.error('❌ Error verificando conversaciones existentes:', existingError);
        return;
      }

      const existingIds = existingConversations.map(c => c.conversation_id);
      const newProspects = activeProspects.filter(p => !existingIds.includes(p.id_uchat));

      if (newProspects.length === 0) {
        return; // No hay nuevas conversaciones
      }


      // 3. Obtener bot por defecto
      const { data: bot, error: botError } = await supabaseSystemUI
        .from('uchat_bots')
        .select('id')
        .limit(1)
        .single();

      if (botError || !bot) {
        console.error('❌ Error obteniendo bot:', botError);
        return;
      }

      // 4. Crear nuevas conversaciones
      const newConversations = newProspects.map(prospect => ({
        conversation_id: prospect.id_uchat,
        bot_id: bot.id,
        customer_phone: prospect.whatsapp,
        customer_name: prospect.nombre_whatsapp || 'Cliente sin nombre',
        customer_email: prospect.email,
        status: 'active',
        message_count: 0,
        priority: 'medium',
        last_message_at: prospect.updated_at,
        platform: 'whatsapp',
        handoff_enabled: false,
        metadata: {
          source: 'uchat_real_sync',
          prospect_id: prospect.id,
          etapa: prospect.etapa,
          id_uchat: prospect.id_uchat
        }
      }));

      const { data: insertedConversations, error: insertError } = await supabaseSystemUI
        .from('uchat_conversations')
        .insert(newConversations)
        .select();

      if (insertError) {
        console.error('❌ Error insertando conversaciones:', insertError);
        return;
      }


      // 5. Sincronizar mensajes para cada nueva conversación
      for (const conv of insertedConversations) {
        await syncMessagesForConversation(conv.id, conv.metadata.prospect_id);
        
        // Procesar asignación automática para nuevos prospectos
        if (conv.metadata.prospect_id) {
          await automationService.processNewProspect(conv.metadata.prospect_id);
          
          // Procesar asignación automática para nueva conversación
          await automationService.processNewConversation(conv.id, conv.metadata.prospect_id);
        }
      }

      // 6. Actualizar estado SILENCIOSAMENTE
      setConversations(prev => {
        const updated = [...prev, ...insertedConversations].sort((a, b) => 
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );
        return updated;
      });

    } catch (error) {
      console.error('❌ Error en syncNewConversations:', error);
    }
  };

  const syncNewMessages = async () => {
    try {
      // Sincronizar mensajes para TODAS las conversaciones, no solo la seleccionada
      await syncAllConversationsMessages();
    } catch (error) {
      console.error('❌ Error en syncNewMessages:', error);
    }
  };

  const syncAllConversationsMessages = async () => {
    // Sincronizar mensajes para todas las conversaciones y actualizar unread_count
    for (const conversation of conversations) {
      if (conversation.metadata?.prospect_id) {
        await syncMessagesForConversationWithUnread(conversation);
      }
    }
  };

  const syncMessagesForConversationWithUnread = async (conversation: Conversation) => {
    try {
      const prospectId = conversation.metadata?.prospect_id;
      if (!prospectId) return;

      // Usar cliente importado único

      // Obtener mensajes nuevos desde lastSyncTime
      const { data: newMessages, error: messagesError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .gte('fecha_hora', lastSyncTime.toISOString())
        .order('fecha_hora', { ascending: true });

      if (messagesError || !newMessages || newMessages.length === 0) {
        return; // No hay mensajes nuevos
      }


      // Filtrar mensajes que ya existen
      const existingMessageIds = currentMessages.map(m => m.message_id);
      const messagesToInsert = newMessages
        .filter(msg => !existingMessageIds.includes(`real_${msg.id}`))
        .map(msg => ({
          message_id: `real_${msg.id}`,
          conversation_id: selectedConversation.id,
          sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
          sender_name: msg.rol === 'Prospecto' ? 'Prospecto' : 'AI',
          content: msg.mensaje,
          is_read: true,
          created_at: msg.fecha_hora
        }));

      if (messagesToInsert.length === 0) {
        return; // No hay mensajes realmente nuevos
      }

      // Insertar nuevos mensajes
      const { error: insertError } = await supabaseSystemUI
        .from('uchat_messages')
        .insert(messagesToInsert);

      if (insertError) {
        console.error('❌ Error insertando mensajes:', insertError);
        return;
      }


      // Actualizar estado SILENCIOSAMENTE
      setMessagesByConversation(prev => {
        const current = prev[selectedConversation.id] || [];
        const updated = [...current, ...messagesToInsert].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return { ...prev, [selectedConversation.id]: updated };
      });

      // Actualizar contador de mensajes
      await supabaseSystemUI
        .from('uchat_conversations')
        .update({ 
          message_count: selectedConversation.message_count + messagesToInsert.length,
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('❌ Error en syncNewMessages:', error);
    }
  };

  const syncMessagesForConversation = async (conversationId: string, prospectId: string) => {
    try {
      // Usar cliente importado único

      // Obtener mensajes recientes (últimos 10)
      const { data: recentMessages, error: messagesError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .order('fecha_hora', { ascending: true })
        .limit(10);

      if (messagesError || !recentMessages) {
        console.error('❌ Error obteniendo mensajes para conversación:', messagesError);
        return;
      }

      if (recentMessages.length === 0) return;

      const messagesToInsert = recentMessages.map(msg => ({
        message_id: `real_${msg.id}`,
        conversation_id: conversationId,
        sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
        sender_name: msg.rol === 'Prospecto' ? 'Prospecto' : 'AI',
        content: msg.mensaje,
        is_read: true,
        created_at: msg.fecha_hora
      }));

      const { error: insertError } = await supabaseSystemUI
        .from('uchat_messages')
        .insert(messagesToInsert);

      if (!insertError) {
        
        // Actualizar contador y timestamp
        await supabaseSystemUI
          .from('uchat_conversations')
          .update({ 
            message_count: messagesToInsert.length,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }

    } catch (error) {
      console.error('❌ Error en syncMessagesForConversation:', error);
    }
  };

  const syncMessagesForOpenConversation = async () => {
    if (!selectedConversation || syncInProgress) return;

    try {
      const prospectId = selectedConversation.metadata?.prospect_id;
      if (!prospectId) return;


      // Obtener mensajes recientes (últimas 2 horas)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data: recentMessages, error: messagesError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .gte('fecha_hora', twoHoursAgo)
        .order('fecha_hora', { ascending: true });

      if (messagesError || !recentMessages) {
        return;
      }

      // Verificar mensajes que ya existen en la base de datos
      const { data: existingMessages, error: existingError } = await supabaseSystemUI
        .from('uchat_messages')
        .select('message_id')
        .eq('conversation_id', selectedConversation.id);

      if (existingError) {
        console.error('❌ Error verificando mensajes existentes:', existingError);
        return;
      }

      const existingMessageIds = existingMessages.map(m => m.message_id);
      const messagesToInsert = recentMessages
        .filter(msg => !existingMessageIds.includes(`real_${msg.id}`))
        .map(msg => ({
          message_id: `real_${msg.id}`,
          conversation_id: selectedConversation.id,
          sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
          sender_name: msg.rol === 'Prospecto' ? 'Prospecto' : 'AI',
          content: msg.mensaje,
          is_read: true,
          created_at: msg.fecha_hora
        }));

      if (messagesToInsert.length === 0) {
        return; // No hay mensajes nuevos
      }

      // Insertar nuevos mensajes con manejo de duplicados
      const { error: insertError } = await supabaseSystemUI
        .from('uchat_messages')
        .upsert(messagesToInsert, { 
          onConflict: 'message_id',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('❌ Error insertando mensajes nuevos:', insertError);
        return;
      }


      // Limpiar caché para mensajes que ahora están en BD
      messagesToInsert.forEach(realMessage => {
        cleanupCacheForRealMessage(realMessage);
      });

      // Actualizar estado SILENCIOSAMENTE
      setMessagesByConversation(prev => {
        const current = prev[selectedConversation.id] || [];
        const updated = [...current, ...messagesToInsert].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return { ...prev, [selectedConversation.id]: updated };
      });

      // Actualizar contador y timestamp si hay nuevos mensajes
      if (messagesToInsert.length > 0) {
        const newTimestamp = new Date().toISOString();
        
        // Actualizar en base de datos
        await supabaseSystemUI
          .from('uchat_conversations')
          .update({ 
            message_count: selectedConversation.message_count + messagesToInsert.length,
            last_message_at: newTimestamp,
            // No incrementar unread_count porque el usuario está viendo esta conversación
            unread_count: 0
          })
          .eq('id', selectedConversation.id);

        // Actualizar estado local
      setSelectedConversation(prev => prev ? {
        ...prev,
          message_count: prev.message_count + messagesToInsert.length,
          last_message_at: newTimestamp
      } : null);

        // Reordenar conversaciones localmente
        setConversations(prevConversations => {
        const updated = prevConversations.map(conv => 
          conv.id === selectedConversation.id 
            ? { 
                ...conv, 
                message_count: (conv.message_count || 0) + messagesToInsert.length, 
                last_message_at: newTimestamp,
                updated_at: newTimestamp
              }
            : conv
        );
          
          return updated.sort((a, b) => 
            new Date(b.last_message_at || b.updated_at).getTime() - new Date(a.last_message_at || a.updated_at).getTime()
          );
        });
      }

      // El webhook se encargará de actualizar la BD, y el listener de realtime
      // reemplazará este mensaje temporal por el real.

      // PERO AHORA, guardamos directamente en la BD correcta.
      const { error: saveError } = await analysisSupabase.from('mensajes_whatsapp').insert({
        mensaje: optimisticMessage.content,
        rol: 'Vendedor', // o el rol del agente
        intencion: 'Respuesta_agente',
        sentimiento: 'Neutro',
        prospecto_id: selectedConversation.metadata?.prospect_id,
        conversacion_id: selectedConversation.id,
        fecha_hora: optimisticMessage.created_at,
        adjuntos: '[]'
      });

      if (saveError) {
        throw new Error(`Error guardando mensaje en mensajes_whatsapp: ${saveError.message}`);
      } else {
        // El listener de realtime se encargará de actualizar la UI desde la BD.
      }

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      // Si falla, marcar el mensaje optimista como fallido
      setMessagesByConversation(prev => {
        const updatedMessages = (prev[selectedConversation.id] || []).map(msg =>
          msg.id === tempId ? { ...msg, sender_name: 'Error' } : msg
        );
        return { ...prev, [selectedConversation.id]: updatedMessages };
      });
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // MÉTODOS DE CONTROL DEL BOT
  // ============================================

  const pauseBot = async (uchatId: string, durationMinutes: number): Promise<boolean> => {
    try {
      
      const ttlSec = Math.max(0, Math.floor(durationMinutes * 60));
      const resp = await fetch('https://primary-dev-d75a.up.railway.app/webhook/pause_bot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json',
          'livechat_auth': '2025_livechat_auth'
        },
        body: JSON.stringify({ uchat_id: uchatId, ttl: ttlSec })
      });
      if (resp.status !== 200 && resp.status !== 201) {
        const txt = await resp.text().catch(() => '');
        console.error('❌ Error pause_bot webhook:', txt);
        return false;
      }

      const pausedUntil = new Date(Date.now() + ttlSec * 1000);
      
      // Guardar estado en localStorage para persistencia
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

      // Persistir en localStorage
      const allPauseStatus = JSON.parse(localStorage.getItem('bot-pause-status') || '{}');
      allPauseStatus[uchatId] = {
        ...pauseData,
        pausedUntil: pausedUntil.toISOString()
      };
      localStorage.setItem('bot-pause-status', JSON.stringify(allPauseStatus));

      return true;
    } catch (error) {
      console.error('❌ Error pausando bot:', error);
      return false;
    }
  };

  // Función para iniciar llamada manual
  const handleInitiateCall = async () => {
    if (!selectedConversation) {
      alert('No hay conversación seleccionada');
      return;
    }

    setIsCalling(true);
    
    try {
      // Usar la misma lógica que el header para obtener uchatId
      const uchatId = selectedConversation.metadata?.id_uchat || selectedConversation.id_uchat || selectedConversation.id;
      
      // 1. Pausar el bot por 15 minutos
      await pauseBot(uchatId, 15);
      
      // 2. Recopilar datos útiles de la conversación en cache
      const conversationData = {
        uchat_id: uchatId,
        conversation_id: selectedConversation.id,
        prospecto_id: selectedConversation.prospecto_id,
        customer_name: selectedConversation.customer_name || selectedConversation.nombre_contacto,
        customer_phone: selectedConversation.customer_phone || selectedConversation.numero_telefono,
        last_message_at: selectedConversation.last_message_at,
        message_count: selectedConversation.message_count,
        summary: selectedConversation.summary,
        resultado: selectedConversation.resultado,
        tipo: selectedConversation.tipo,
        metadata: selectedConversation.metadata,
        // Contexto adicional proporcionado por el usuario
        context: callContext.trim() || null,
        // Agente que inició la llamada
        agent_email: user?.email || 'unknown',
        agent_name: (user as any)?.user_metadata?.full_name || user?.email || 'unknown',
        // Timestamp
        initiated_at: new Date().toISOString()
      };

      // 3. Enviar al webhook
      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/trigger-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(conversationData)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error desconocido');
        throw new Error(`Error en webhook: ${response.status} - ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));
      
      console.log('✅ [CALL] Llamada iniciada exitosamente:', result);
      
      // Esperar 5 segundos antes de cerrar el modal para mostrar la animación de éxito
      setTimeout(() => {
        setShowCallModal(false);
        setCallContext('');
        setIsCalling(false);
      }, 5000);
      
    } catch (error) {
      console.error('❌ [CALL] Error iniciando llamada:', error);
      setIsCalling(false);
      alert(`Error al iniciar la llamada: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const resumeBot = async (uchatId: string): Promise<boolean> => {
    try {
      
      const resp = await fetch('https://primary-dev-d75a.up.railway.app/webhook/pause_bot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json',
          'livechat_auth': '2025_livechat_auth'
        },
        body: JSON.stringify({ uchat_id: uchatId, ttl: 0 })
      });
      if (resp.status !== 200 && resp.status !== 201) {
        const txt = await resp.text().catch(() => '');
        console.error('❌ Error pause_bot webhook (resume):', txt);
        return false;
      }

      setBotPauseStatus(prev => ({
        ...prev,
        [uchatId]: {
          isPaused: false,
          pausedUntil: null,
          pausedBy: '',
          duration: 0
        }
      }));

      // Actualizar localStorage
      const allPauseStatus = JSON.parse(localStorage.getItem('bot-pause-status') || '{}');
      delete allPauseStatus[uchatId];
      localStorage.setItem('bot-pause-status', JSON.stringify(allPauseStatus));

      return true;
    } catch (error) {
      console.error('❌ Error reactivando bot:', error);
      return false;
    }
  };

  const getBotPauseTimeRemaining = (uchatId: string): number => {
    const status = botPauseStatus[uchatId];
    if (!status || !status.isPaused || !status.pausedUntil) return 0;
    
    const now = new Date().getTime();
    const pausedUntilTime = status.pausedUntil instanceof Date 
      ? status.pausedUntil.getTime() 
      : new Date(status.pausedUntil).getTime();
    
    const remaining = Math.max(0, pausedUntilTime - now);
    
    return Math.floor(remaining / 1000); // segundos restantes
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // ============================================
  // MÉTODOS DE CACHÉ DE MENSAJES
  // ============================================

  const combinedMessages = useMemo((): Message[] => {
    const realMessages = currentMessages.filter(msg => !msg.message_id?.startsWith('cache_'));
    const validCachedMessages = cachedMessages.filter(msg => {
      if (msg.conversation_id !== selectedConversation?.id) return false;
      return !realMessages.some(realMsg => 
        realMsg.content === msg.content && 
        Math.abs(new Date(realMsg.created_at).getTime() - new Date(msg.created_at).getTime()) < 60000
      );
    });
    return [...realMessages, ...validCachedMessages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [currentMessages, cachedMessages, selectedConversation?.id]);

  const addMessageToCache = (message: Message) => {
    setCachedMessages(prev => [...prev, message]);
    setPendingMessages(prev => new Set([...prev, message.message_id]));
    
    // Limpiar caché después de 5 minutos (por si el mensaje no llega desde BD)
    setTimeout(() => {
      setCachedMessages(prev => prev.filter(m => m.message_id !== message.message_id));
      setPendingMessages(prev => {
        const updated = new Set(prev);
        updated.delete(message.message_id);
        return updated;
      });
    }, 5 * 60 * 1000);
  };

  const cleanupCacheForRealMessage = (realMessage: Message) => {
    // Limpiar mensajes en caché que coincidan con el mensaje real
    setCachedMessages(prev => prev.filter(cachedMsg => {
      const isSameMessage = cachedMsg.content === realMessage.content && 
        Math.abs(new Date(cachedMsg.created_at).getTime() - new Date(realMessage.created_at).getTime()) < 60000;
      
      if (isSameMessage) {
        setPendingMessages(prevPending => {
          const updated = new Set(prevPending);
          updated.delete(cachedMsg.message_id);
          return updated;
        });
      }
      
      return !isSameMessage;
    }));
  };

  // ============================================
  // MÉTODOS DE ENVÍO
  // ============================================

  const sendMessageToUChat = async (message: string, uchatId: string): Promise<boolean> => {
    try {
      
      const webhookUrl = 'https://primary-dev-d75a.up.railway.app/webhook/send-message';
      const payload = {
        message: message,
        uchat_id: uchatId,
        type: 'text',
        ttl: 180
      };
      
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'livechat_auth': '2025_livechat_auth'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 200 || response.status === 201) {
        const data = await response.json();
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Error del webhook:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error enviando a UChat webhook:', error);
      return false;
    }
  };

  // Verificar bloqueo del usuario al cargar (usa contador optimizado)
  useEffect(() => {
    const checkUserBlocked = async () => {
      if (!user?.id) {
        setIsUserBlocked(false);
        return;
      }

      try {
        const counter = await ParaphraseLogService.getUserWarningCounter(user.id);
        const blocked = counter?.is_blocked || false;
        setIsUserBlocked(blocked);
        
        if (blocked && counter) {
          setWarningStats({
            total_warnings: counter.total_warnings,
            warnings_last_30_days: counter.warnings_last_30_days,
            warnings_last_7_days: counter.warnings_last_7_days,
            last_warning_at: counter.last_warning_at,
            is_blocked: counter.is_blocked
          });
        }
      } catch (error) {
        console.error('❌ Error verificando bloqueo:', error);
        // En caso de error, permitir el envío (fail-open)
      }
    };

    checkUserBlocked();
  }, [user?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Verificar si el usuario está bloqueado (usa contador optimizado)
    if (user?.id) {
      const blocked = await ParaphraseLogService.isUserBlocked(user.id);
      if (blocked) {
        setIsUserBlocked(true);
        const counter = await ParaphraseLogService.getUserWarningCounter(user.id);
        if (counter) {
          setWarningStats({
            total_warnings: counter.total_warnings,
            warnings_last_30_days: counter.warnings_last_30_days,
            warnings_last_7_days: counter.warnings_last_7_days,
            last_warning_at: counter.last_warning_at,
            is_blocked: counter.is_blocked
          });
        }
        // Mostrar alerta (no abrir modal de parafraseo)
        return;
      }
    }

    // Abrir modal de parafraseo con IA
    setTextToParaphrase(newMessage);
    setShowParaphraseModal(true);
  };

  // Función real para enviar el mensaje (después del parafraseo)
  const sendMessageWithText = async (messageText: string) => {
    if (!messageText.trim() || !selectedConversation) return;

    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const conversationId = selectedConversation.id;
    const messageContent = messageText;
      const uchatId = selectedConversation.metadata?.id_uchat;

    // Validar que tenemos el uchat_id necesario
    if (!uchatId) {
      console.error('❌ No se encontró id_uchat para esta conversación');
      setSending(false);
      return;
    }

    const optimisticMessage: Message = {
      id: tempId,
      message_id: tempId,
      conversation_id: conversationId,
      sender_type: 'agent',
      sender_name: 'Agente',
      content: messageContent,
      is_read: true,
      created_at: new Date().toISOString(),
    };

    // 1. Añadir mensaje optimista a la UI (cache temporal)
    setMessagesByConversation(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage],
    }));

    setNewMessage('');
    scrollToBottom('smooth');

    try {
      // 2. PRIMERO: Pausar el bot (siempre se ejecuta)
      await pauseBot(uchatId, 15);
      
      // 3. SEGUNDO: Enviar mensaje al webhook de UChat
      // n8n lo procesará y lo guardará en la base de datos
      const success = await sendMessageToUChat(messageContent, uchatId);
      
      if (!success) {
        throw new Error('El webhook de UChat no respondió correctamente');
      }
      

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      
      // Si falla, marcar el mensaje optimista como fallido en la UI
      setMessagesByConversation(prev => {
        const updatedMessages = (prev[conversationId] || []).map(msg =>
          msg.id === tempId ? { ...msg, sender_name: '❌ Error al enviar' } : msg
        );
        return { ...prev, [conversationId]: updatedMessages };
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================
  // MÉTODOS DE UI
  // ============================================

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesScrollRef.current) {
      // SCROLL AL FINAL para mostrar últimos mensajes
      setTimeout(() => {
        if (messagesScrollRef.current) {
          messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // Marcar cuando el usuario se desplaza manualmente para no forzar auto-scroll
  // ✅ OPTIMIZACIÓN: Debounce agregado para evitar llamadas excesivas durante scroll
  const handleMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledAwayRef.current = distanceFromBottom > 120; // umbral 120px
    
    // ✅ OPTIMIZACIÓN: Limpiar timer anterior si existe
    if (scrollDebounceTimerRef.current !== null) {
      clearTimeout(scrollDebounceTimerRef.current);
    }
    
    // ✅ OPTIMIZACIÓN: Debounce de 400ms para agrupar eventos de scroll
    scrollDebounceTimerRef.current = window.setTimeout(() => {
      // Si el usuario está cerca del fondo y hay conversación activa, marcar leído
      if (!userScrolledAwayRef.current && selectedConversationRef.current) {
        // ✅ OPTIMIZACIÓN: Eliminada llamada redundante a markMessagesAsRead
        // markConversationAsRead ya actualiza todos los mensajes localmente
        markConversationAsRead(selectedConversationRef.current);
      }
      scrollDebounceTimerRef.current = null;
    }, 400);
  }, []);

  const scrollToDateInMessages = (targetDate: string) => {
    if (!messagesScrollRef.current || !selectedConversation) return;

    // targetDate viene en formato ISO (YYYY-MM-DD) desde conversationBlocks
    const targetDateISO = targetDate;
    const messages = combinedMessages || [];
    
    // Encontrar el primer mensaje que pertenece a esa fecha
    const targetMessage = messages.find(message => {
      const messageDate = new Date(message.created_at).toISOString().split('T')[0];
      return messageDate === targetDateISO;
    });

    if (!targetMessage) {
      console.warn('No se encontró mensaje para la fecha:', targetDateISO);
      return;
    }

    // Esperar un momento para que el DOM se actualice si es necesario
    setTimeout(() => {
      if (!messagesScrollRef.current) return;
      
      // Buscar el elemento del mensaje usando data-message-id
      const targetElement = messagesScrollRef.current.querySelector(`[data-message-id="${targetMessage.id}"]`);

      if (targetElement) {
        // Con column-reverse, scrollIntoView funciona pero necesitamos ajustar
        // Usar scrollIntoView con block: 'start' para posicionar el mensaje arriba
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        
        // Agregar un highlight temporal para indicar que se hizo scroll
        targetElement.classList.add('highlight-scroll');
        setTimeout(() => {
          targetElement?.classList.remove('highlight-scroll');
        }, 2000);
      } else {
        // Fallback: buscar el header de fecha y hacer scroll
        const formattedTargetDate = formatDate(targetMessage.created_at);
        const dateHeader = messagesScrollRef.current.querySelector(`[data-date="${formattedTargetDate}"]`);
        
        if (dateHeader) {
          dateHeader.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }
    }, 100);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const isWithin24HourWindow = (conversation: Conversation | null): boolean => {
    if (!conversation) return false;
    
    // Buscar el último mensaje del USUARIO (no del bot/agente)
    const messages = messagesByConversation[conversation.id] || [];
    const lastUserMessage = messages
      .filter(m => m.sender_type === 'customer')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    if (!lastUserMessage) return false;
    
    const lastMessageDate = new Date(lastUserMessage.created_at);
    const now = new Date();
    const hoursSinceLastMessage = (now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastMessage < 24;
  };

  const getHoursSinceLastUserMessage = (conversation: Conversation | null): number => {
    if (!conversation) return 99;
    
    const messages = messagesByConversation[conversation.id] || [];
    const lastUserMessage = messages
      .filter(m => m.sender_type === 'customer')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    if (!lastUserMessage) return 99;
    
    const lastMessageDate = new Date(lastUserMessage.created_at);
    const now = new Date();
    return (now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60);
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active': 
        return <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />;
      case 'transferred': 
        return <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />;
      case 'closed': 
        return <Circle className="w-2 h-2 fill-slate-400 text-slate-400" />;
      default: 
        return <Circle className="w-2 h-2 fill-slate-300 text-slate-300" />;
    }
  };

  // Filtrado optimizado con useMemo y manejo seguro de strings
  const filteredConversations = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return conversations;
    
    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    
    try {
      return conversations.filter(conv => {
        // Manejo seguro de strings con fallbacks
        const customerName = conv.customer_name || conv.nombre_contacto || '';
        const customerPhone = conv.customer_phone || conv.telefono || '';
        const customerEmail = conv.customer_email || conv.email || '';
        
        return (
          customerName.toLowerCase().includes(searchLower) ||
          customerPhone.includes(searchLower) ||
          customerEmail.toLowerCase().includes(searchLower)
        );
      });
    } catch (error) {
      console.error('❌ Error filtrando conversaciones:', error);
      return conversations; // Retornar todas las conversaciones en caso de error
    }
  }, [conversations, debouncedSearchTerm]);

  // Total no leídos - calcular desde conversaciones filtradas según permisos
  const totalUnread = useMemo(() => {
    // Usar las conversaciones filtradas (ya aplican permisos)
    const filteredConvs = filteredConversations.length > 0 ? filteredConversations : conversations;
    
    // Si tenemos conversaciones con mensajes_no_leidos, usar esos
    const serverSum = filteredConvs.reduce((acc, c) => {
      // Las conversaciones de get_conversations_ordered tienen mensajes_no_leidos
      return acc + Number(c.mensajes_no_leidos ?? c.unread_count ?? 0);
    }, 0);
    
    // Si no hay datos del servidor, usar contadores locales (solo para conversaciones filtradas)
    const localSum = filteredConvs.reduce((acc, c) => {
      return acc + Number(unreadCounts[c.id] ?? 0);
    }, 0);
    
    return serverSum > 0 ? serverSum : localSum;
  }, [unreadCounts, conversations, filteredConversations]);

  // Actualizar métricas cuando cambien las conversaciones filtradas
  useEffect(() => {
    loadMetrics();
  }, [filteredConversations, conversations]);

  // ============================================
  // CÁLCULOS DE LAYOUT - LIENZO CON SECCIONES FIJAS
  // ============================================

  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const headerHeight = 120; // Altura del menú fijo (pestañas)
  const footerHeight = 64;  // Altura del footer fijo
  const availableHeight = `calc(100vh - ${headerHeight + footerHeight}px)`;
  const leftOffset = sidebarWidth;
  
  // Calcular ancho ajustado para la primera columna cuando el sidebar está colapsado
  const sidebarSpaceGained = sidebarCollapsed ? (256 - 64) : 0; // 192px de espacio extra
  const adjustedConversationsWidth = columnWidths.conversations + sidebarSpaceGained;

  // ============================================
  // RENDERIZADO PRINCIPAL - LIENZO ESTRUCTURADO
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-slate-200 dark:border-gray-600 border-t-slate-600 dark:border-t-gray-400 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 dark:text-gray-400">Cargando conversaciones reales...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-gray-900"
      style={{ 
        position: 'fixed',
        top: `${headerHeight}px`, // Debajo del menú fijo
        left: `${leftOffset}px`,  // Después del sidebar
        right: 0,
        bottom: `${footerHeight}px`, // Encima del footer fijo
        overflow: 'hidden', // SIN SCROLL GLOBAL
        display: 'flex'
      }}
    >
      {/* SECCIÓN 1: Lista de Conversaciones - CAJA INDEPENDIENTE */}
      <div 
        className="bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700"
        style={{ 
          width: `${adjustedConversationsWidth}px`,
          height: '100%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header fijo de la caja */}
        <div 
          className="p-4 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800"
          style={{ 
            flexShrink: 0,
            height: '200px'
          }}
        >
            <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Conversaciones</h1>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Datos reales de UChat • Sidebar: {sidebarCollapsed ? 'Colapsado (+192px)' : 'Expandido'}
                {syncInProgress && <span className="text-blue-600 dark:text-blue-400"> • Sincronizando...</span>}
              </p>
            </div>
            <div className="flex items-center text-xs text-slate-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              Tiempo real activo
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900 dark:text-white">{filteredConversations.length > 0 ? filteredConversations.length : conversations.length}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{metrics.activeConversations}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Activas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{totalUnread}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">No leídos</div>
            </div>
          </div>

          <div className="relative">
            <label htmlFor="livechat-search-input" className="sr-only">
              Buscar conversaciones
            </label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
            <input
              id="livechat-search-input"
              name="livechat-search"
              type="search"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-gray-500"
            />
          </div>
        </div>

        {/* Área de scroll INDIVIDUAL de la caja */}
        <div 
          ref={conversationsScrollRef}
          className="flex-1 overflow-y-auto"
          style={{ 
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin'
          }}
          onWheel={(e) => {
            // PREVENIR scroll global
            e.stopPropagation();
          }}
        >
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-slate-50 dark:border-gray-700 cursor-pointer transition-all duration-200 ${
                selectedConversation?.id === conversation.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 shadow-sm'
                  : 'hover:bg-slate-25 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => {
                setSelectedConversation(conversation);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (user?.role_name === 'coordinador' || user?.role_name === 'admin') {
                  const prospectId = conversation.prospecto_id || conversation.id;
                  setAssignmentContextMenu({
                    prospectId,
                    coordinacionId: conversation.metadata?.coordinacion_id,
                    ejecutivoId: conversation.metadata?.ejecutivo_id,
                    position: { x: e.clientX, y: e.clientY }
                  });
                }
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {conversation.customer_name?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {conversation.customer_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* Indicador de mensajes no leídos */}
                      {(Number(conversation.unread_count ?? unreadCounts[conversation.id] ?? conversation.mensajes_no_leidos ?? 0)) > 0 && (
                        <div className="bg-green-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {Math.min(Number(conversation.unread_count ?? unreadCounts[conversation.id] ?? conversation.mensajes_no_leidos ?? 0), 99)}
                        </div>
                      )}
                    {getStatusIndicator(conversation.status)}
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{conversation.customer_phone}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">{conversation.metadata?.etapa}</p>
                  
                  {/* Información de asignación */}
                  {(conversation.metadata?.coordinacion_codigo || conversation.metadata?.ejecutivo_nombre) && (
                    <div className="mb-2">
                      <AssignmentBadge
                        call={{
                          coordinacion_codigo: conversation.metadata?.coordinacion_codigo,
                          coordinacion_nombre: conversation.metadata?.coordinacion_nombre,
                          ejecutivo_nombre: conversation.metadata?.ejecutivo_nombre,
                          ejecutivo_email: conversation.metadata?.ejecutivo_email
                        } as any}
                        variant="compact"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-500">
                    <span>{Number(conversation.message_count ?? 0)} mensajes</span>
                    <span>{formatTimeAgo(conversation.last_message_at || conversation.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menú contextual de asignación */}
      {assignmentContextMenu && (
        <AssignmentContextMenu
          prospectId={assignmentContextMenu.prospectId}
          coordinacionId={assignmentContextMenu.coordinacionId}
          ejecutivoId={assignmentContextMenu.ejecutivoId}
          isOpen={!!assignmentContextMenu}
          position={assignmentContextMenu.position}
          onClose={() => setAssignmentContextMenu(null)}
          onAssignmentComplete={() => {
            loadConversations();
            setAssignmentContextMenu(null);
          }}
        />
      )}

      {/* DIVISOR REDIMENSIONABLE 1 */}
      <div 
        className="w-1 bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 cursor-col-resize flex items-center justify-center group"
        style={{ 
          height: '100%',
          flexShrink: 0,
          zIndex: 10
        }}
        onMouseDown={(e) => handleMouseDown(e, 'conversations')}
      >
        <GripVertical className="w-3 h-3 text-slate-400 dark:text-gray-400 group-hover:text-slate-600 dark:group-hover:text-gray-300" />
      </div>

      {/* SECCIÓN 2: Bloques de Conversación - CAJA INDEPENDIENTE */}
      {selectedConversation && (
        <>
          <div 
            className="bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700"
            style={{ 
              width: `${columnWidths.blocks}px`,
              height: '100%',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header fijo de la caja */}
            <div 
              className="p-4 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800"
              style={{ 
                flexShrink: 0,
                height: '80px'
              }}
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Bloques por Día</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">{selectedConversation.customer_name}</p>
            </div>

            {/* Área de scroll INDIVIDUAL de la caja */}
            <div 
              ref={blocksScrollRef}
              className="flex-1 overflow-y-auto"
              style={{ 
                overscrollBehavior: 'contain',
                scrollbarWidth: 'thin'
              }}
              onWheel={(e) => {
                // PREVENIR scroll global
                e.stopPropagation();
              }}
            >
              {conversationBlocks.map((block) => (
                <div
                  key={block.date}
                  className="p-4 border-b border-slate-50 dark:border-gray-700 cursor-pointer hover:bg-slate-25 dark:hover:bg-gray-700/50 transition-all duration-200"
                  onClick={() => scrollToDateInMessages(block.date)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(block.date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {block.message_count} mensajes
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIVISOR REDIMENSIONABLE 2 */}
          <div 
            className="w-1 bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 cursor-col-resize flex items-center justify-center group"
            style={{ 
              height: '100%',
              flexShrink: 0,
              zIndex: 10
            }}
            onMouseDown={(e) => handleMouseDown(e, 'blocks')}
          >
            <GripVertical className="w-3 h-3 text-slate-400 dark:text-gray-400 group-hover:text-slate-600 dark:group-hover:text-gray-300" />
          </div>
        </>
      )}

      {/* SECCIÓN 3: Ventana de Chat - GRUPO (Mensajes + Input) */}
      {selectedConversation ? (
        <div 
          className="bg-white dark:bg-gray-800 flex-1"
          style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header fijo del chat */}
          <div 
            className="p-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-700"
            style={{ 
              flexShrink: 0,
              height: '80px'
            }}
          >
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors"
                onClick={() => setShowProspectSidebar(true)}
                title="Click para ver detalles del prospecto"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {selectedConversation.customer_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedConversation.customer_name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-gray-300">
                    <Phone className="w-4 h-4" />
                    <span>{selectedConversation.customer_phone}</span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      {selectedConversation.metadata?.etapa}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controles del Bot */}
              <div className="flex items-center space-x-3">
                {(() => {
                  // Obtener uchatId de manera consistente (mismo que en handleInitiateCall)
                  const uchatId = selectedConversation.metadata?.id_uchat || selectedConversation.id_uchat || selectedConversation.id;
                  const status = botPauseStatus[uchatId];
                  const timeRemaining = getBotPauseTimeRemaining(uchatId);
                  
                  if (status?.isPaused && timeRemaining > 0) {
                    return (
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                          Bot pausado: {formatTimeRemaining(timeRemaining)}
                        </span>
                        <button
                          onClick={() => resumeBot(uchatId)}
                          className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 animate-pulse shadow-lg"
                        >
                          Reactivar IA
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => pauseBot(uchatId, 5)}
                          className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                        >
                          5m
                        </button>
                        <button
                          onClick={() => pauseBot(uchatId, 15)}
                          className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          15m
                        </button>
                        <button
                          onClick={() => pauseBot(uchatId, 30)}
                          className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          30m
                        </button>
                        <button
                          onClick={() => pauseBot(uchatId, 60)}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        >
                          1h
                        </button>
                      </div>
                    );
                  }
                })()}

                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Área de mensajes - SCROLL INDIVIDUAL (hacia arriba desde abajo) */}
          <div 
            ref={messagesScrollRef}
            className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-25 to-white dark:from-gray-800 dark:to-gray-900"
            style={{ 
              overscrollBehavior: 'contain',
              scrollbarWidth: 'thin',
              display: 'flex',
              flexDirection: 'column-reverse' // MOSTRAR DESDE ABAJO
            }}
            onWheel={(e) => {
              e.stopPropagation();
              handleMessagesScroll();
            }}
            onScroll={handleMessagesScroll}
          >
            <style>{`
              .highlight-scroll {
                animation: highlightPulse 2s ease-in-out;
                background-color: rgba(59, 130, 246, 0.1) !important;
                border-radius: 0.5rem;
                transition: background-color 0.3s ease;
              }
              @keyframes highlightPulse {
                0% { background-color: rgba(59, 130, 246, 0.3); }
                50% { background-color: rgba(59, 130, 246, 0.2); }
                100% { background-color: rgba(59, 130, 246, 0.05); }
              }
            `}</style>
            {combinedMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No hay mensajes</h3>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Esta conversación aún no tiene mensajes</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column' }}>
                {combinedMessages.map((message, index) => {
                  const isCustomer = message.sender_type === 'customer';
                  const isBot = message.sender_type === 'bot';
                  const showDate = index === 0 || 
                    formatDate(message.created_at) !== formatDate(combinedMessages[index - 1]?.created_at);

                  return (
                    <div key={message.id} data-message-id={message.id}>
                      {showDate && (
                        <div 
                          className="flex justify-center my-6"
                          data-date={formatDate(message.created_at)}
                        >
                          <span className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-full shadow-sm">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-md ${isCustomer ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
                          
                          {(() => {
                            // Parsear adjuntos si existen
                            const adjuntos = (message as any).adjuntos 
                              ? JSON.parse(
                                  typeof (message as any).adjuntos === 'string' 
                                    ? (message as any).adjuntos 
                                    : JSON.stringify((message as any).adjuntos)
                                )
                              : null;

                            // Determinar si necesita globo (false para stickers y audios)
                            const shouldHaveBubble = !adjuntos || needsBubble(adjuntos) || message.content;

                            if (shouldHaveBubble) {
                              // CON GLOBO: Texto, imágenes, videos, documentos
                              return (
                          <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                            isCustomer 
                              ? 'bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-900 dark:text-white' 
                              : isBot
                                ? 'bg-blue-500 dark:bg-blue-600 text-white'
                                : message.message_id.startsWith('cache_')
                                  ? 'bg-slate-700 dark:bg-gray-700 text-white border-2 border-dashed border-slate-400 dark:border-gray-500'
                                  : 'bg-slate-900 dark:bg-gray-800 text-white'
                          }`}>
                            {message.content && (
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content.replace(/\\n/g, '\n')}
                              </div>
                            )}

                                  {/* Multimedia con globo */}
                                  {adjuntos && adjuntos.length > 0 && (
                                    <MultimediaMessage 
                                      adjuntos={adjuntos}
                                      hasTextContent={!!message.content}
                                    />
                                  )}
                                  
                                  <div className="text-right text-xs opacity-75 mt-1 flex items-center justify-end space-x-2">
                                    {message.id.startsWith('temp_') && (
                                      <span className="italic">
                                        {message.sender_name === 'Error' ? 'Error al enviar' : 'Enviando...'}
                                      </span>
                                    )}
                                    <span>
                                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                            </div>
                          </div>
                              );
                            } else {
                              // SIN GLOBO: Stickers y audios solamente (estilo WhatsApp)
                              return (
                                <div className="flex flex-col">
                                  {adjuntos && adjuntos.length > 0 && (
                                    <MultimediaMessage 
                                      adjuntos={adjuntos}
                                      hasTextContent={false}
                                    />
                                  )}
                                  {/* Timestamp pequeño debajo */}
                                  <div className={`text-xs text-slate-400 dark:text-gray-500 mt-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                          isCustomer ? 'order-1' : 'order-2'
                        } ${
                          isCustomer 
                            ? 'bg-gradient-to-br from-slate-400 to-slate-600' 
                            : isBot
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                              : 'bg-gradient-to-br from-slate-800 to-slate-900'
                        }`}>
                          <span className="text-xs font-semibold text-white">
                            {isCustomer 
                              ? (selectedConversation?.customer_name?.charAt(0).toUpperCase() || 'C')
                              : isBot 
                                ? 'B'
                                : 'A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input FIJO - Separado del historial pero en el mismo grupo */}
          <div 
            className="p-4 border-t border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            style={{ 
              flexShrink: 0,
              height: '80px'
            }}
          >
            {!isWithin24HourWindow(selectedConversation) ? (
              // VENTANA DE 24 HORAS EXPIRADA - Mostrar restricción de WhatsApp
              <div className="flex items-center justify-center h-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50 px-4">
                <div className="flex items-center space-x-3 text-amber-800 dark:text-amber-200">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      Ventana de mensajería cerrada
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      Han pasado {Math.floor(getHoursSinceLastUserMessage(selectedConversation))}h desde el último mensaje del usuario. WhatsApp Business API solo permite responder dentro de las 24 horas siguientes.
                    </p>
                  </div>
                </div>
              </div>
            ) : isUserBlocked ? (
              // USUARIO BLOQUEADO - Mostrar alerta de moderación
              <div className="flex items-center justify-center h-full bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl border-2 border-red-500 dark:border-red-600 px-4 animate-pulse">
                <div className="flex items-center space-x-3 text-red-900 dark:text-red-100">
                  <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      ⚠️ Envío bloqueado
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      3+ warnings de moderación alcanzados. Contacta a un administrador.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // VENTANA ACTIVA - Mostrar input normal
            <div className="flex items-center space-x-2">
              {/* Botón Adjuntar */}
              <button
                onClick={() => setShowImageCatalog(true)}
                className="p-3 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                title="Adjuntar imagen"
                style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Botón Llamada */}
              <button
                onClick={() => setShowCallModal(true)}
                className="p-3 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                title="Iniciar llamada"
                style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Phone className="w-5 h-5" />
              </button>

              <div className="flex-1 relative">
                <label htmlFor="livechat-message-input" className="sr-only">
                  Escribe un mensaje
                </label>
                <textarea
                  id="livechat-message-input"
                  name="livechat-message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  autoComplete="off"
                  className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none shadow-sm"
                  style={{ height: '44px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending || isUserBlocked}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-800">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Selecciona una conversación</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400">Elige una conversación para ver el historial completo</p>
          </div>
        </div>
      )}
      
      {/* Modal de Catálogo de Imágenes */}
      <ImageCatalogModal
        isOpen={showImageCatalog}
        onClose={() => setShowImageCatalog(false)}
        onSendImage={async (imageData) => {
          // Este callback ya maneja el envío en el modal
          console.log('Imagen enviada:', imageData);
        }}
        selectedConversation={selectedConversation}
        onImageSent={(imageUrl, caption) => {
          // UI optimista: Mostrar imagen inmediatamente como "enviando"
          if (!selectedConversation) return;
          
          const tempId = `temp_${Date.now()}`;
          const conversationId = selectedConversation.id;

          const optimisticMessage: Message = {
            id: tempId,
            message_id: tempId,
            conversation_id: conversationId,
            sender_type: 'agent',
            sender_name: 'Agente',
            content: caption || '',
            is_read: true,
            created_at: new Date().toISOString(),
          };

          // Agregar adjunto como estructura temporal
          (optimisticMessage as any).adjuntos = [{
            archivo: imageUrl,
            tipo: 'Imagen',
            filename: imageUrl.split('/').pop(),
            bucket: 'temp'
          }];

          // Añadir mensaje optimista a la UI
          setMessagesByConversation(prev => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] || []), optimisticMessage],
          }));

          scrollToBottom('smooth');

          // 🔄 REFRESH SILENCIOSO después de 16 segundos
          // (promedio de ejecución n8n = 15s + 1s buffer)
          setTimeout(async () => {
            try {
              // Solo refrescar si seguimos en la misma conversación
              if (selectedConversation?.id === conversationId) {
                
                // Recargar mensajes desde la base de datos
                await loadMessagesAndBlocks(conversationId, selectedConversation.prospecto_id);
                
                // Scroll suave al final para mostrar la imagen real
                setTimeout(() => scrollToBottom('smooth'), 300);
              }
            } catch (error) {
              console.error('❌ Error en refresh silencioso después de enviar imagen:', error);
            }
          }, 16000); // 16 segundos
        }}
      />

      {/* Modal de Parafraseo con IA */}
      <ParaphraseModal
        isOpen={showParaphraseModal}
        originalText={textToParaphrase}
        context="input_livechat"
        onSelect={(paraphrasedText) => {
          setShowParaphraseModal(false);
          sendMessageWithText(paraphrasedText);
        }}
        onCancel={() => {
          setShowParaphraseModal(false);
        }}
      />

      {/* Modal de Llamada Manual */}
      <AnimatePresence>
        {showCallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => {
              if (!isCalling) {
                setShowCallModal(false);
                setCallContext('');
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <motion.h3
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
                    >
                      <Phone className="w-6 h-6 text-green-500" />
                      Iniciar Llamada
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                    >
                      El bot será pausado por 15 minutos
                    </motion.p>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => {
                      if (!isCalling) {
                        setShowCallModal(false);
                        setCallContext('');
                      }
                    }}
                    disabled={isCalling}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="space-y-6">
                  {/* Sección: Enviarle contexto al agente de IA */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Enviarle contexto al agente de IA
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <MessageSquare className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <span>Contexto adicional (opcional)</span>
                      </label>
                      <textarea
                        value={callContext}
                        onChange={(e) => {
                          if (e.target.value.length <= 300) {
                            setCallContext(e.target.value);
                          }
                        }}
                        placeholder="Escribe información adicional que el agente de IA debe conocer..."
                        rows={4}
                        maxLength={300}
                        disabled={isCalling}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Opcional - Máximo 300 caracteres
                        </span>
                        <span className={`text-xs font-medium ${
                          callContext.length > 280 
                            ? 'text-orange-500' 
                            : callContext.length > 250 
                              ? 'text-yellow-500' 
                              : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {callContext.length}/300
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Botón grande de llamada */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center pt-4"
                  >
                    <motion.button
                      whileHover={!isCalling ? { scale: 1.02 } : {}}
                      whileTap={!isCalling ? { scale: 0.98 } : {}}
                      animate={isCalling ? {
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          "0 10px 25px -5px rgba(34, 197, 94, 0.25)",
                          "0 20px 40px -5px rgba(34, 197, 94, 0.4)",
                          "0 10px 25px -5px rgba(34, 197, 94, 0.25)"
                        ]
                      } : {}}
                      transition={isCalling ? {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      } : {}}
                      onClick={handleInitiateCall}
                      disabled={isCalling}
                      className={`w-full py-4 px-6 text-base font-medium text-white rounded-xl disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 ${
                        isCalling
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-2xl shadow-green-500/50'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25'
                      }`}
                    >
                      {isCalling ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <motion.span
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          >
                            Llamada iniciada exitosamente...
                          </motion.span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-5 h-5" />
                          <span>Iniciar Llamada</span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar de Detalles del Prospecto - Renderizado con Portal */}
      {selectedConversation && createPortal(
        <ProspectDetailSidebar
          isOpen={showProspectSidebar}
          onClose={() => setShowProspectSidebar(false)}
          prospectoId={selectedConversation.prospecto_id}
        />,
        document.body
      )}
    </div>
  );
};

export default LiveChatCanvas;