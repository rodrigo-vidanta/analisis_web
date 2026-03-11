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
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';
import { liveMonitorKanbanOptimized } from '../services/liveMonitorKanbanOptimized';
import { userUIPreferencesService } from '../services/userUIPreferencesService';
import { permissionsService } from '../services/permissionsService';
import { realtimeHub } from '../services/realtimeHub';
import { audioOutputService } from '../services/audioOutputService';
import type { LiveCallData } from '../services/liveMonitorService';
import { formatExecutiveDisplayName } from '../utils/nameFormatter';

// Tipo para entrada de transcripción
export interface TranscriptEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  secondsFromStart?: number;
}

// Tipo extendido para llamadas del widget
// Estado de transferencia Voice SDK en una llamada
export type VoiceTransferStatus = 'none' | 'incoming' | 'active' | 'disconnected';

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
  // Voice SDK transfer state (transicion de CallCard)
  voiceTransferStatus?: VoiceTransferStatus;
  voiceTransferCallSid?: string;
  // Team transfer fields
  parentCallSid?: string;
  currentHolderId?: string;
  currentHolderName?: string;
  coordinacionId?: string;
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
  // Voice SDK transfer actions
  setVoiceTransfer: (callId: string, status: VoiceTransferStatus, callSid?: string) => void;
  clearVoiceTransfer: (callId: string) => void;
}

const playNotificationSound = () => {
  audioOutputService.playOnAllDevices('/sounds/notification.mp3', 0.7).catch(() => {
    // Audio bloqueado por politica del navegador
  });
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
      // Widget siempre habilitado (no hay toggle)
      set({ isWidgetEnabled: true });

      {
        // Cargar llamadas activas
        await get().loadActiveCalls();
        
        // Configurar suscripción realtime via RealtimeHub (1 canal compartido)
        // Debounce para loadActiveCalls - evitar múltiples refetch simultáneos
        let loadActiveCallsTimeout: ReturnType<typeof setTimeout> | null = null;
        const LOAD_DEBOUNCE_MS = 2000;
        // Timers de remoción con grace period (evitan flicker)
        const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
        const REMOVAL_GRACE_MS = 5000; // 5s para confirmar que la llamada realmente terminó

        const debouncedLoadActiveCalls = () => {
          if (loadActiveCallsTimeout) clearTimeout(loadActiveCallsTimeout);
          loadActiveCallsTimeout = setTimeout(() => {
            get().loadActiveCalls();
          }, LOAD_DEBOUNCE_MS);
        };

        const unsubscribe = realtimeHub.subscribe(
          'llamadas_ventas',
          '*',
          (payload) => {
              const eventType = payload.eventType;
              const newRecord = payload.new;
              const oldRecord = payload.old;
              const state = get();

              if (!state.isWidgetEnabled) return;

              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const callData = newRecord as Record<string, unknown>;
                const existingCall = state.widgetCalls.find(c => c.call_id === callData.call_id);

                // Parsear JSON fields (Realtime puede enviarlos como strings)
                // IMPORTANTE: Sin polling, este es el ÚNICO mecanismo de update.
                // Incluir TODOS los campos que cambian durante una llamada activa.
                const parsedUpdates: Record<string, unknown> = {
                  call_status: callData.call_status,
                  duracion_segundos: callData.duracion_segundos,
                  checkpoint_venta_actual: callData.checkpoint_venta_actual,
                  resumen_llamada: callData.resumen_llamada,
                  razon_finalizacion: callData.razon_finalizacion,
                  audio_ruta_bucket: callData.audio_ruta_bucket,
                  nivel_interes: callData.nivel_interes,
                  es_venta_exitosa: callData.es_venta_exitosa,
                };
                // Parsear campos JSON (Realtime puede enviarlos como strings)
                const jsonFields = ['datos_proceso', 'datos_llamada', 'conversacion_completa'] as const;
                for (const field of jsonFields) {
                  if (callData[field] != null) {
                    try {
                      parsedUpdates[field] = typeof callData[field] === 'string'
                        ? JSON.parse(callData[field] as string) : callData[field];
                    } catch { parsedUpdates[field] = callData[field]; }
                  }
                }

                if (existingCall) {
                  // Siempre actualizar incrementalmente (sin refetch completo)
                  get().updateCall(callData.call_id as string, parsedUpdates);

                  if (callData.call_status === 'activa') {
                    // Llamada sigue activa - cancelar cualquier timer de remoción pendiente
                    const existingTimer = removalTimers.get(callData.call_id as string);
                    if (existingTimer) {
                      clearTimeout(existingTimer);
                      removalTimers.delete(callData.call_id as string);
                    }
                  } else {
                    // Llamada ya no activa - remoción con grace period (evita flicker)
                    if (!removalTimers.has(callData.call_id as string)) {
                      const timer = setTimeout(() => {
                        const currentState = get();
                        const callStill = currentState.widgetCalls.find(c => c.call_id === callData.call_id);
                        if (callStill && callStill.call_status !== 'activa') {
                          get().removeCall(callData.call_id as string);
                        }
                        removalTimers.delete(callData.call_id as string);
                      }, REMOVAL_GRACE_MS);
                      removalTimers.set(callData.call_id as string, timer);
                    }
                  }
                } else if (callData.call_status === 'activa') {
                  // Nueva llamada activa - debounced reload para obtener datos del prospecto
                  debouncedLoadActiveCalls();
                }
                // Si no existe y no es activa → ignorar
              }

              if (eventType === 'DELETE' && oldRecord) {
                get().removeCall((oldRecord as Record<string, unknown>).call_id as string);
              }
          }
        );

        // Guardar la función de unsuscribe como canal (para cleanup)
        set({ realtimeChannel: { unsubscribe } });
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
    
    // Limpiar estado (mantener isWidgetEnabled=true para evitar destruir Twilio Device)
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
      let hasFullAccess = false; // Declarar fuera para usar en validación final
      
      if (permissions) {
        const isAdmin = permissions.role === 'admin';
        const isAdminOperativo = permissions.role === 'administrador_operativo';
        const isCoordinadorCalidad = permissions.role === 'coordinador' 
          ? await permissionsService.isCoordinadorCalidad(userId)
          : false;
        
        // Admin, Admin Operativo y Coordinador Calidad ven TODO (sin filtro)
        hasFullAccess = isAdmin || isAdminOperativo || isCoordinadorCalidad;
        
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
            // COORDINADOR/SUPERVISOR: Ve llamadas de sus coordinaciones
            // Filtro directo por coordinacion_id de la llamada (viene del view)
            // ============================================
            const coordSet = new Set(coordinacionesFilter);
            activeCalls = activeCalls.filter(call =>
              call.coordinacion_id && coordSet.has(call.coordinacion_id)
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
      // ejecutivo_id ya viene de la vista (live_monitor_view incluye p.ejecutivo_id)
      // Solo necesitamos 1 query para obtener nombres, NO 3 queries como antes
      // ============================================
      if (activeCalls.length > 0) {
        const ejecutivosIds = [...new Set(activeCalls.map(c => c.ejecutivo_id).filter(Boolean))];

        if (ejecutivosIds.length > 0) {
          const { data: ejecutivosData } = await supabaseSystemUI
            .from('user_profiles_v2')
            .select('id, full_name')
            .in('id', ejecutivosIds);

          if (ejecutivosData && ejecutivosData.length > 0) {
            const ejecutivosMap = new Map<string, string>();
            ejecutivosData.forEach(e => {
              if (e.id && e.full_name) {
                ejecutivosMap.set(e.id, formatExecutiveDisplayName(e.full_name));
              }
            });

            activeCalls = activeCalls.map(call => {
              if (call.ejecutivo_id) {
                return {
                  ...call,
                  ejecutivo_nombre: ejecutivosMap.get(call.ejecutivo_id) || undefined
                };
              }
              return call;
            });
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
      
      // ============================================
      // FIX 2: VALIDACIÓN FINAL DE SEGURIDAD
      // Verificar que cada llamada pertenece a prospectos con permisos
      // ============================================
      if (permissions && !hasFullAccess && activeCalls.length > 0) {
        console.log(`[LiveActivityStore] Ejecutando validación final de seguridad para ${activeCalls.length} llamadas...`);
        
        // Verificar permisos de cada llamada en paralelo
        const verificacionPromises = activeCalls.map(async (call) => {
          if (!call.prospecto_id) {
            console.warn(`[LiveActivityStore] ALERTA: Llamada ${call.call_id} sin prospecto_id`);
            return false;
          }
          
          try {
            const check = await permissionsService.canUserAccessProspect(userId, call.prospecto_id);
            if (!check.canAccess) {
              console.warn(`[LiveActivityStore] 🔒 ALERTA DE SEGURIDAD: Usuario ${userId} no tiene permisos para prospecto ${call.prospecto_id}`, {
                reason: check.reason,
                call_id: call.call_id,
                nombre_completo: call.nombre_completo
              });
            }
            return check.canAccess;
          } catch (err) {
            console.error(`[LiveActivityStore] Error verificando permisos para prospecto ${call.prospecto_id}:`, err);
            // En caso de error, denegar por seguridad
            return false;
          }
        });
        
        const verificacionResultados = await Promise.all(verificacionPromises);
        const llamadasAntesValidacion = activeCalls.length;
        activeCalls = activeCalls.filter((_, index) => verificacionResultados[index]);
        const llamadasDespuesValidacion = activeCalls.length;
        
        if (llamadasAntesValidacion !== llamadasDespuesValidacion) {
          console.warn(`[LiveActivityStore] ⚠️ Validación final bloqueó ${llamadasAntesValidacion - llamadasDespuesValidacion} llamadas sin permisos`);
        } else {
          console.log(`[LiveActivityStore] ✅ Validación final aprobó todas las ${llamadasDespuesValidacion} llamadas`);
        }
      }
      
      set({ widgetCalls: activeCalls });
    } catch (error) {
      // 42501 = permission denied → sesión expirada/logout en progreso, limpiar silenciosamente
      const pgError = error as { code?: string };
      if (pgError?.code === '42501') {
        set({ widgetCalls: [], isLoadingCalls: false });
        return;
      }
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
      // No remover si tiene voice transfer activo (WhatsApp→Client SDK)
      const call = state.widgetCalls.find(c => c.call_id === callId);
      if (call?.voiceTransferStatus && call.voiceTransferStatus !== 'none' && call.voiceTransferStatus !== 'disconnected') {
        return state;
      }

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
  },

  /**
   * Establece el estado de transferencia Voice SDK para una llamada.
   * Vincula una llamada entrante de Twilio Client con su CallCard existente.
   */
  setVoiceTransfer: (callId: string, status: VoiceTransferStatus, callSid?: string) => {
    set(state => ({
      widgetCalls: state.widgetCalls.map(call =>
        call.call_id === callId
          ? { ...call, voiceTransferStatus: status, voiceTransferCallSid: callSid }
          : call
      )
    }));
  },

  /**
   * Limpia el estado de transferencia Voice SDK.
   */
  clearVoiceTransfer: (callId: string) => {
    set(state => ({
      widgetCalls: state.widgetCalls.map(call =>
        call.call_id === callId
          ? { ...call, voiceTransferStatus: 'none' as VoiceTransferStatus, voiceTransferCallSid: undefined }
          : call
      )
    }));
  }
}));
