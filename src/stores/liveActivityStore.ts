/**
 * ============================================
 * STORE PANEL LATERAL - ZUSTAND
 * ============================================
 * 
 * Maneja el estado global del Panel Lateral que muestra
 * llamadas activas en tiempo real.
 * 
 * Características:
 * - Sincronización con llamadas activas via realtime
 * - Control de panel expandido/colapsado
 * - Transcripción en vivo
 * - Preferencias persistidas en BD
 */

import { create } from 'zustand';
import { analysisSupabase } from '../config/analysisSupabase';
import { liveMonitorKanbanOptimized } from '../services/liveMonitorKanbanOptimized';
import { userUIPreferencesService } from '../services/userUIPreferencesService';
import type { LiveCallData } from '../services/liveMonitorService';

// Tipo para entrada de transcripción
export interface TranscriptEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  secondsFromStart?: number;
}

// Tipo extendido para llamadas del widget
export interface WidgetCallData extends LiveCallData {
  checkpoint_venta_actual?: string;
  composicion_familiar_numero?: number;
  destino_preferido?: string;
  preferencia_vacaciones?: string[];
  numero_noches?: number;
  mes_preferencia?: string;
  propuesta_economica_ofrecida?: number;
  habitacion_ofertada?: string;
  resort_ofertado?: string;
  principales_objeciones?: string;
  resumen_llamada?: string;
  conversacion_completa?: TranscriptEntry[];
  estado_civil?: string;
  telefono_principal?: string;
}

interface LiveActivityState {
  // Llamadas activas para el widget
  widgetCalls: WidgetCallData[];
  
  // Llamada expandida (null = ninguna)
  expandedCallId: string | null;
  
  // Estado del widget
  isWidgetEnabled: boolean;
  isWidgetVisible: boolean;
  isLoading: boolean;
  
  // Transcripción en vivo por llamada
  liveTranscriptions: Record<string, TranscriptEntry[]>;
  
  // IDs de llamadas que ya reprodujeron sonido (evitar duplicados)
  notifiedCallIds: Set<string>;
  
  // Suscripción activa
  realtimeChannel: any | null;
  
  // Usuario actual
  currentUserId: string | null;
  currentUserRole: string | null;
  
  // Acciones
  initialize: (userId: string, roleName: string) => Promise<void>;
  cleanup: () => void;
  setWidgetCalls: (calls: WidgetCallData[]) => void;
  addCall: (call: WidgetCallData) => void;
  updateCall: (callId: string, updates: Partial<WidgetCallData>) => void;
  removeCall: (callId: string) => void;
  expandCall: (callId: string) => void;
  collapseCall: () => void;
  toggleWidget: (enabled: boolean) => Promise<void>;
  setWidgetVisible: (visible: boolean) => void;
  updateTranscription: (callId: string, entries: TranscriptEntry[]) => void;
  markCallNotified: (callId: string) => void;
  hasCallBeenNotified: (callId: string) => boolean;
  loadActiveCalls: () => Promise<void>;
}

// Audio de notificación (reusar del notification store)
let notificationAudio: HTMLAudioElement | null = null;

const initAudio = () => {
  if (!notificationAudio && typeof window !== 'undefined') {
    notificationAudio = new Audio('/sounds/notification.mp3');
    notificationAudio.volume = 0.7;
    notificationAudio.preload = 'auto';
  }
};

const playNotificationSound = () => {
  try {
    initAudio();
    if (notificationAudio) {
      notificationAudio.currentTime = 0;
      notificationAudio.volume = 0.7;
      notificationAudio.play().catch(() => {
        // Audio bloqueado por política del navegador
      });
    }
  } catch (error) {
    // Ignorar errores de audio
  }
};

export const useLiveActivityStore = create<LiveActivityState>((set, get) => ({
  // Estado inicial
  widgetCalls: [],
  expandedCallId: null,
  isWidgetEnabled: false,
  isWidgetVisible: true,
  isLoading: false,
  liveTranscriptions: {},
  notifiedCallIds: new Set(),
  realtimeChannel: null,
  currentUserId: null,
  currentUserRole: null,
  
  /**
   * Inicializa el store con el usuario actual
   * Carga preferencias y configura realtime
   */
  initialize: async (userId: string, roleName: string) => {
    set({ currentUserId: userId, currentUserRole: roleName, isLoading: true });
    
    try {
      // Cargar preferencia del widget
      const isEnabled = await userUIPreferencesService.getLiveActivityWidgetEnabled(userId, roleName);
      set({ isWidgetEnabled: isEnabled });
      
      if (isEnabled) {
        // Cargar llamadas activas
        await get().loadActiveCalls();
        
        // Configurar suscripción realtime
        const channel = analysisSupabase
          .channel('live-activity-widget-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'llamadas_ventas'
            },
            (payload) => {
              const { eventType, new: newRecord, old: oldRecord } = payload;
              const state = get();
              
              if (!state.isWidgetEnabled) return;
              
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const callData = newRecord as any;
                
                // Solo procesar llamadas activas
                if (callData.call_status === 'activa') {
                  const existingCall = state.widgetCalls.find(c => c.call_id === callData.call_id);
                  
                  if (existingCall) {
                    // Actualizar llamada existente
                    get().updateCall(callData.call_id, {
                      call_status: callData.call_status,
                      duracion_segundos: callData.duracion_segundos,
                      datos_proceso: callData.datos_proceso,
                      datos_llamada: callData.datos_llamada
                    });
                  } else {
                    // Nueva llamada - recargar para obtener datos completos del prospecto
                    get().loadActiveCalls();
                  }
                } else if (callData.call_status !== 'activa') {
                  // Llamada ya no está activa, remover del widget
                  get().removeCall(callData.call_id);
                }
              }
              
              if (eventType === 'DELETE' && oldRecord) {
                get().removeCall((oldRecord as any).call_id);
              }
            }
          )
          .subscribe();
        
        set({ realtimeChannel: channel });
      }
    } catch (error) {
      console.error('[LiveActivityStore] Error initializing:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  /**
   * Limpia suscripciones y estado
   */
  cleanup: () => {
    const { realtimeChannel } = get();
    
    if (realtimeChannel) {
      try {
        realtimeChannel.unsubscribe();
      } catch (e) {
        // Ignorar errores al desuscribirse
      }
    }
    
    set({
      widgetCalls: [],
      expandedCallId: null,
      liveTranscriptions: {},
      notifiedCallIds: new Set(),
      realtimeChannel: null
    });
  },
  
  /**
   * Carga llamadas activas desde el servicio optimizado
   * Incluye verificación de "llamadas zombies" (activas sin actualizar en mucho tiempo)
   */
  loadActiveCalls: async () => {
    try {
      const classifiedCalls = await liveMonitorKanbanOptimized.getClassifiedCalls();
      let activeCalls = classifiedCalls.active as WidgetCallData[];
      
      // FILTRO DE LLAMADAS ZOMBIES: Remover llamadas "activas" que no se han actualizado
      // en más de 5 minutos - probablemente el webhook de finalización nunca llegó
      const ZOMBIE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos
      const now = Date.now();
      
      activeCalls = activeCalls.filter(call => {
        const updatedAt = call.updated_at ? new Date(call.updated_at).getTime() : 0;
        const timeSinceUpdate = now - updatedAt;
        
        if (timeSinceUpdate > ZOMBIE_THRESHOLD_MS) {
          console.warn(`[LiveActivityStore] Llamada zombie detectada: ${call.call_id} - sin actualizar por ${Math.round(timeSinceUpdate / 60000)} minutos`);
          return false; // Excluir del widget
        }
        return true;
      });
      
      // Detectar nuevas llamadas para notificar
      const state = get();
      const currentCallIds = new Set(state.widgetCalls.map(c => c.call_id));
      
      activeCalls.forEach(call => {
        if (!currentCallIds.has(call.call_id) && !state.hasCallBeenNotified(call.call_id)) {
          // Nueva llamada - reproducir sonido si widget está activo
          if (state.isWidgetEnabled) {
            playNotificationSound();
            get().markCallNotified(call.call_id);
          }
        }
      });
      
      set({ widgetCalls: activeCalls });
    } catch (error) {
      console.error('[LiveActivityStore] Error loading calls:', error);
    }
  },
  
  /**
   * Establece las llamadas del widget
   */
  setWidgetCalls: (calls: WidgetCallData[]) => {
    set({ widgetCalls: calls });
  },
  
  /**
   * Agrega una nueva llamada al widget
   */
  addCall: (call: WidgetCallData) => {
    const state = get();
    
    // Evitar duplicados
    if (state.widgetCalls.some(c => c.call_id === call.call_id)) {
      return;
    }
    
    // Reproducir sonido si no se ha notificado antes
    if (!state.hasCallBeenNotified(call.call_id) && state.isWidgetEnabled) {
      playNotificationSound();
      get().markCallNotified(call.call_id);
    }
    
    set({ widgetCalls: [call, ...state.widgetCalls] });
  },
  
  /**
   * Actualiza una llamada existente
   */
  updateCall: (callId: string, updates: Partial<WidgetCallData>) => {
    set(state => ({
      widgetCalls: state.widgetCalls.map(call =>
        call.call_id === callId ? { ...call, ...updates } : call
      )
    }));
  },
  
  /**
   * Remueve una llamada del widget
   */
  removeCall: (callId: string) => {
    set(state => {
      const newCalls = state.widgetCalls.filter(c => c.call_id !== callId);
      
      // Si la llamada removida estaba expandida, colapsar
      const newExpandedId = state.expandedCallId === callId ? null : state.expandedCallId;
      
      // Limpiar transcripción
      const { [callId]: _, ...restTranscriptions } = state.liveTranscriptions;
      
      return {
        widgetCalls: newCalls,
        expandedCallId: newExpandedId,
        liveTranscriptions: restTranscriptions
      };
    });
  },
  
  /**
   * Expande una llamada para ver detalles
   */
  expandCall: (callId: string) => {
    set({ expandedCallId: callId });
  },
  
  /**
   * Colapsa la llamada expandida
   */
  collapseCall: () => {
    set({ expandedCallId: null });
  },
  
  /**
   * Habilita/deshabilita el widget y persiste en BD
   */
  toggleWidget: async (enabled: boolean) => {
    const { currentUserId, cleanup, initialize, currentUserRole } = get();
    
    set({ isWidgetEnabled: enabled });
    
    if (currentUserId) {
      // Persistir en BD
      await userUIPreferencesService.setLiveActivityWidgetEnabled(currentUserId, enabled);
      
      if (enabled) {
        // Reinicializar si se habilita
        await initialize(currentUserId, currentUserRole || '');
      } else {
        // Limpiar si se deshabilita
        cleanup();
      }
    }
  },
  
  /**
   * Controla la visibilidad temporal del widget (sin persistir)
   */
  setWidgetVisible: (visible: boolean) => {
    set({ isWidgetVisible: visible });
  },
  
  /**
   * Actualiza la transcripción de una llamada
   */
  updateTranscription: (callId: string, entries: TranscriptEntry[]) => {
    set(state => ({
      liveTranscriptions: {
        ...state.liveTranscriptions,
        [callId]: entries
      }
    }));
  },
  
  /**
   * Marca una llamada como notificada
   */
  markCallNotified: (callId: string) => {
    set(state => {
      const newSet = new Set(state.notifiedCallIds);
      newSet.add(callId);
      return { notifiedCallIds: newSet };
    });
  },
  
  /**
   * Verifica si una llamada ya fue notificada
   */
  hasCallBeenNotified: (callId: string) => {
    return get().notifiedCallIds.has(callId);
  }
}));
