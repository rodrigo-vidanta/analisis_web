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
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { liveMonitorKanbanOptimized } from '../services/liveMonitorKanbanOptimized';
import { userUIPreferencesService } from '../services/userUIPreferencesService';
import { permissionsService } from '../services/permissionsService';
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
  // Nombre del ejecutivo asignado al prospecto
  ejecutivo_nombre?: string;
  ejecutivo_id?: string;
}

interface LiveActivityState {
  // Llamadas activas para el widget
  widgetCalls: WidgetCallData[];
  
  // Llamada expandida (null = ninguna)
  expandedCallId: string | null;
  
  // Llamadas minimizadas a "cuña" (Set de call_ids)
  minimizedCallIds: Set<string>;
  
  // Llamadas que el usuario abrió manualmente (no se auto-minimizan)
  permanentOpenCallIds: Set<string>;
  
  // Estado del widget
  isWidgetEnabled: boolean;
  isWidgetVisible: boolean;
  isLoading: boolean;
  isLoadingCalls: boolean; // Flag para evitar cargas concurrentes
  
  // Transcripción en vivo por llamada
  liveTranscriptions: Record<string, TranscriptEntry[]>;
  
  // IDs de llamadas que ya reprodujeron sonido (evitar duplicados)
  notifiedCallIds: Set<string>;
  
  // IDs de llamadas zombie ya reportadas (evitar logs repetitivos)
  reportedZombieIds: Set<string>;
  
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
  minimizeCall: (callId: string) => void;
  restoreCall: (callId: string) => void;
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
  minimizedCallIds: new Set<string>(),
  permanentOpenCallIds: new Set<string>(),
  isWidgetEnabled: false,
  isWidgetVisible: true,
  isLoading: false,
  isLoadingCalls: false,
  liveTranscriptions: {},
  notifiedCallIds: new Set(),
  reportedZombieIds: new Set(),
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
   * Se llama durante logout para evitar requests después de cerrar sesión
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
    
    // Limpiar TODO incluyendo userId para prevenir requests después del logout
    set({
      widgetCalls: [],
      expandedCallId: null,
      liveTranscriptions: {},
      notifiedCallIds: new Set(),
      reportedZombieIds: new Set(),
      realtimeChannel: null,
      isLoadingCalls: false,
      currentUserId: null,
      currentUserRole: null,
      isWidgetEnabled: false
    });
  },
  
  /**
   * Carga llamadas activas desde el servicio optimizado
   * Incluye:
   * - Filtrado por permisos del usuario (igual que LiveMonitorKanban)
   * - Verificación de "llamadas zombies" (activas sin actualizar en mucho tiempo)
   */
  loadActiveCalls: async () => {
    const state = get();
    
    // Evitar cargas concurrentes
    if (state.isLoadingCalls) {
      return;
    }
    
    // Verificar que tenemos userId
    const userId = state.currentUserId;
    if (!userId) {
      return;
    }

    // Verificar que hay sesión activa antes de hacer queries
    const { data: { session } } = await supabaseSystemUI!.auth.getSession();
    if (!session) {
      // Sin sesión activa, limpiar y no intentar cargar
      set({ 
        widgetCalls: [],
        isLoadingCalls: false 
      });
      return;
    }
    
    set({ isLoadingCalls: true });
    
    try {
      const classifiedCalls = await liveMonitorKanbanOptimized.getClassifiedCalls();
      let activeCalls = classifiedCalls.active as WidgetCallData[];
      
      // ============================================
      // FILTRADO POR PERMISOS DEL USUARIO
      // Replica la lógica de LiveMonitorKanban
      // ============================================
      
      const permissions = await permissionsService.getUserPermissions(userId);
      
      if (permissions) {
        const isAdmin = permissions.role === 'admin';
        const isAdminOperativo = permissions.role === 'administrador_operativo';
        const isCoordinadorCalidad = permissions.role === 'coordinador' 
          ? await permissionsService.isCoordinadorCalidad(userId)
          : false;
        
        // Admin, Admin Operativo y Coordinador Calidad ven TODO (sin filtro)
        const hasFullAccess = isAdmin || isAdminOperativo || isCoordinadorCalidad;
        
        if (!hasFullAccess) {
          // Obtener filtros específicos del usuario
          const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
          const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
          
          if (ejecutivoFilter) {
            // ============================================
            // EJECUTIVO: Solo ve llamadas de SUS prospectos
            // + prospectos de ejecutivos donde es BACKUP
            // ============================================
            
            // Obtener IDs de ejecutivos donde este usuario es backup
            // Usar auth_user_profiles (vista sin RLS)
            const { data: ejecutivosConBackup } = await supabaseSystemUI
              .from('user_profiles_v2')
              .select('id')
              .eq('backup_id', ejecutivoFilter)
              .eq('has_backup', true);
            
            const ejecutivosIds = [ejecutivoFilter];
            if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
              ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
            }
            
            // Obtener IDs de prospectos asignados a estos ejecutivos
            const { data: prospectosAsignados } = await analysisSupabase
              .from('prospectos')
              .select('id')
              .in('ejecutivo_id', ejecutivosIds);
            
            const prospectosIds = new Set(prospectosAsignados?.map(p => p.id) || []);
            
            // Filtrar llamadas: solo las de prospectos asignados
            activeCalls = activeCalls.filter(call => 
              call.prospecto_id && prospectosIds.has(call.prospecto_id)
            );
            
          } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
            // ============================================
            // COORDINADOR/SUPERVISOR: Ve llamadas de prospectos
            // en sus coordinaciones asignadas
            // ============================================
            
            // Obtener IDs de prospectos en las coordinaciones del usuario
            const { data: prospectosCoordinacion } = await analysisSupabase
              .from('prospectos')
              .select('id')
              .in('coordinacion_id', coordinacionesFilter);
            
            const prospectosIds = new Set(prospectosCoordinacion?.map(p => p.id) || []);
            
            // Filtrar llamadas: solo las de prospectos en sus coordinaciones
            activeCalls = activeCalls.filter(call => 
              call.prospecto_id && prospectosIds.has(call.prospecto_id)
            );
          }
        }
      }
      
      // ============================================
      // FILTRO DE LLAMADAS ZOMBIES
      // ============================================
      const ZOMBIE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutos
      const NEW_CALL_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutos de gracia
      const now = Date.now();
      
      const currentReportedZombies = get().reportedZombieIds;
      const newReportedZombies = new Set(currentReportedZombies);
      
      activeCalls = activeCalls.filter(call => {
        const createdAt = call.created_at ? new Date(call.created_at).getTime() : now;
        const updatedAt = call.updated_at ? new Date(call.updated_at).getTime() : createdAt;
        const timeSinceCreation = now - createdAt;
        const timeSinceUpdate = now - updatedAt;
        
        // Si la llamada es reciente (menos de 10 min de creada), no aplicar filtro zombie
        if (timeSinceCreation < NEW_CALL_GRACE_PERIOD_MS) {
          return true;
        }
        
        // Para llamadas antiguas, verificar si está zombie
        if (timeSinceUpdate > ZOMBIE_THRESHOLD_MS) {
          if (!currentReportedZombies.has(call.call_id)) {
            console.warn(`[LiveActivityStore] Llamada zombie detectada: ${call.call_id} - sin actualizar por ${Math.round(timeSinceUpdate / 60000)} minutos`);
            newReportedZombies.add(call.call_id);
          }
          return false;
        }
        return true;
      });
      
      // Actualizar set de zombies reportados si cambió
      if (newReportedZombies.size !== currentReportedZombies.size) {
        set({ reportedZombieIds: newReportedZombies });
      }
      
      // ============================================
      // ENRIQUECER CON NOMBRE DEL EJECUTIVO
      // ============================================
      if (activeCalls.length > 0) {
        // Obtener IDs únicos de prospectos
        const prospectosIds = [...new Set(activeCalls.map(c => c.prospecto_id).filter(Boolean))];
        
        if (prospectosIds.length > 0) {
          // Obtener ejecutivo_id de cada prospecto
          const { data: prospectosData } = await analysisSupabase
            .from('prospectos')
            .select('id, ejecutivo_id')
            .in('id', prospectosIds);
          
          if (prospectosData && prospectosData.length > 0) {
            // Obtener IDs únicos de ejecutivos
            const ejecutivosIds = [...new Set(prospectosData.map(p => p.ejecutivo_id).filter(Boolean))];
            
            if (ejecutivosIds.length > 0) {
              // Obtener nombres de ejecutivos usando vista sin RLS
              const { data: ejecutivosData } = await supabaseSystemUI
                .from('user_profiles_v2')
                .select('id, full_name')
                .in('id', ejecutivosIds);
              
              // Crear mapa de ejecutivo_id -> nombre
              const ejecutivosMap = new Map<string, string>();
              ejecutivosData?.forEach(e => {
                if (e.id && e.full_name) {
                  ejecutivosMap.set(e.id, e.full_name);
                }
              });
              
              // Crear mapa de prospecto_id -> ejecutivo_id
              const prospectoEjecutivoMap = new Map<string, string>();
              prospectosData.forEach(p => {
                if (p.id && p.ejecutivo_id) {
                  prospectoEjecutivoMap.set(p.id, p.ejecutivo_id);
                }
              });
              
              // Enriquecer llamadas con nombre del ejecutivo
              activeCalls = activeCalls.map(call => {
                if (call.prospecto_id) {
                  const ejecutivoId = prospectoEjecutivoMap.get(call.prospecto_id);
                  if (ejecutivoId) {
                    return {
                      ...call,
                      ejecutivo_id: ejecutivoId,
                      ejecutivo_nombre: ejecutivosMap.get(ejecutivoId) || undefined
                    };
                  }
                }
                return call;
              });
            }
          }
        }
      }
      
      // Detectar nuevas llamadas para notificar
      const currentState = get();
      const currentCallIds = new Set(currentState.widgetCalls.map(c => c.call_id));
      
      activeCalls.forEach(call => {
        if (!currentCallIds.has(call.call_id) && !currentState.hasCallBeenNotified(call.call_id)) {
          // Nueva llamada - reproducir sonido si widget está activo
          if (currentState.isWidgetEnabled) {
            playNotificationSound();
            get().markCallNotified(call.call_id);
          }
        }
      });
      
      set({ widgetCalls: activeCalls });
    } catch (error) {
      console.error('[LiveActivityStore] Error loading calls:', error);
    } finally {
      set({ isLoadingCalls: false });
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
   * Minimiza una llamada a "cuña" en el borde
   */
  minimizeCall: (callId: string) => {
    const state = get();
    const newMinimized = new Set(state.minimizedCallIds);
    newMinimized.add(callId);
    set({ minimizedCallIds: newMinimized });
  },
  
  /**
   * Restaura una llamada minimizada (la marca como permanente)
   */
  restoreCall: (callId: string) => {
    const state = get();
    const newMinimized = new Set(state.minimizedCallIds);
    const newPermanent = new Set(state.permanentOpenCallIds);
    newMinimized.delete(callId);
    newPermanent.add(callId); // Marcar como permanentemente abierta
    set({ 
      minimizedCallIds: newMinimized,
      permanentOpenCallIds: newPermanent
    });
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
