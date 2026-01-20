/**
 * ============================================
 * SERVICIO OPTIMIZADO - MÓDULO LIVE MONITOR
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_LIVEMONITOR.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_LIVEMONITOR.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_LIVEMONITOR.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ============================================
// SERVICIO OPTIMIZADO PARA LIVE MONITOR
// Utiliza la nueva vista live_monitor_view
// MEJORA 2026-01-20: Verificación de conexión antes de queries
// ============================================

import { analysisSupabase } from '../config/analysisSupabase';
import { isNetworkOnline } from '../hooks/useNetworkStatus';

// Interfaz para los datos optimizados de la vista
export interface LiveMonitorViewData {
  // IDs principales
  call_id: string;
  prospecto_id: string;
  
  // Estados
  call_status_inteligente: 'activa' | 'perdida' | 'transferida' | 'finalizada';
  call_status_bd: 'activa' | 'perdida' | 'transferida' | 'finalizada' | 'colgada' | 'exitosa';
  
  // Datos temporales
  fecha_llamada: string;
  duracion_segundos: number;
  minutos_transcurridos: number;
  
  // Progreso VAPI
  checkpoint_venta_actual?: string;
  razon_finalizacion?: string;
  
  // URLs de control
  monitor_url?: string;
  control_url?: string;
  call_sid?: string;
  provider?: string;
  account_sid?: string;
  
  // Datos de venta
  nivel_interes?: any;
  es_venta_exitosa?: boolean;
  probabilidad_cierre?: number;
  costo_total?: number;
  precio_ofertado?: any;
  propuesta_economica_ofrecida?: number;
  habitacion_ofertada?: string;
  resort_ofertado?: string;
  principales_objeciones?: string;
  
  // Audio
  audio_ruta_bucket?: string;
  resumen_llamada?: string;
  conversacion_completa?: any;
  
  // Datos del prospecto (ya incluidos via JOIN)
  nombre_completo?: string;
  nombre_whatsapp: string;
  whatsapp: string;
  telefono_principal?: string;
  email?: string;
  ciudad_residencia?: string;
  estado_civil?: string;
  edad?: number;
  etapa_prospecto?: string;
  
  // Composición familiar
  composicion_familiar_numero?: number;
  
  // Preferencias
  destino_preferencia?: string[];
  preferencia_vacaciones?: string[];
  numero_noches?: number;
  mes_preferencia?: string;
  viaja_con?: string;
  cantidad_menores?: number;
  
  // Seguimiento
  observaciones?: string;
  asesor_asignado?: string;
  campana_origen?: string;
  interes_principal?: string;
  
  // Feedback
  tiene_feedback?: boolean;
  feedback_resultado?: string;
  feedback_comentarios?: string;
  feedback_user_email?: string;
  feedback_fecha?: string;
  
  // Timestamps
  last_event_at?: string;
  ended_at?: string;
  prospecto_created_at: string;
  prospecto_updated_at: string;
  
  // Datos VAPI (JSON)
  datos_proceso?: any;
  datos_llamada?: any;
  datos_objeciones?: any;
  
  // Metadata
  id_uchat?: string;
  id_airtable?: string;
  crm_data?: any;
}

class LiveMonitorOptimizedService {
  
  /**
   * Obtener datos desde la vista optimizada
   * YA NO necesita JOIN manual - todo está pre-calculado
   * MEJORA 2026-01-20: Verificar conexión antes de consultar
   */
  async getOptimizedCalls(limit: number = 200): Promise<LiveMonitorViewData[]> {
    // Verificar conexión antes de consultar
    if (!isNetworkOnline()) {
      // Retornar silenciosamente sin loguear error
      return [];
    }

    try {
      // Cargar desde vista optimizada
      // Estrategia: Primero obtener llamadas activas, luego las más recientes
      
      // 1. Obtener todas las llamadas activas (sin límite)
      // Buscar tanto por call_status_inteligente como call_status_bd para asegurar detección
      const { data: activeCalls, error: activeError } = await analysisSupabase
        .from('live_monitor_view')
        .select('*')
        .or('call_status_inteligente.eq.activa,call_status_bd.eq.activa')
        .order('fecha_llamada', { ascending: false });
      
      if (activeError) {
        console.error('❌ Error cargando llamadas activas:', activeError);
      }
      
      // 2. Obtener llamadas recientes (no activas) para completar el límite
      const remainingLimit = limit - (activeCalls?.length || 0);
      let recentCalls: LiveMonitorViewData[] = [];
      
      if (remainingLimit > 0) {
        const { data: recentData, error: recentError } = await analysisSupabase
          .from('live_monitor_view')
          .select('*')
          .neq('call_status_inteligente', 'activa')
          .order('fecha_llamada', { ascending: false })
          .limit(remainingLimit);
        
        if (recentError) {
          console.error('❌ Error cargando llamadas recientes:', recentError);
        } else {
          recentCalls = recentData || [];
        }
      }
      
      // 3. Combinar: activas primero, luego recientes
      const data = [...(activeCalls || []), ...recentCalls];
      
      // Logs de diagnóstico
      const estadosInteligentes: Record<string, number> = {};
      const estadosBD: Record<string, number> = {};
      let reclasificadas = 0;
      
      data.forEach(call => {
        // Contar estados inteligentes
        const statusInt = call.call_status_inteligente || 'sin_estado';
        estadosInteligentes[statusInt] = (estadosInteligentes[statusInt] || 0) + 1;
        
        // Contar estados de BD
        const statusBD = call.call_status_bd || 'sin_estado';
        estadosBD[statusBD] = (estadosBD[statusBD] || 0) + 1;
        
        // Contar reclasificaciones
        if (call.call_status_bd !== call.call_status_inteligente) {
          reclasificadas++;
        }
      });
      
      // Estadísticas de clasificación inteligente
      
      return data;
    } catch (error) {
      console.error('💥 Error en getOptimizedCalls:', error);
      return [];
    }
  }
  
  /**
   * Obtener solo llamadas activas reales (según clasificación inteligente)
   */
  async getActiveCalls(): Promise<LiveMonitorViewData[]> {
    try {
      const { data, error } = await analysisSupabase
        .from('live_monitor_view')
        .select('*')
        .eq('call_status_inteligente', 'activa')
        .order('fecha_llamada', { ascending: false });
      
      if (error) {
        console.error('❌ Error obteniendo llamadas activas:', error);
        return [];
      }
      
      // Llamadas activas cargadas
      return data;
    } catch (error) {
      console.error('💥 Error en getActiveCalls optimizado:', error);
      return [];
    }
  }
  
  /**
   * Obtener llamadas por estado inteligente
   */
  async getCallsByStatus(status: 'activa' | 'perdida' | 'transferida' | 'finalizada'): Promise<LiveMonitorViewData[]> {
    try {
      const { data, error } = await analysisSupabase
        .from('live_monitor_view')
        .select('*')
        .eq('call_status_inteligente', status)
        .order('fecha_llamada', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error(`❌ Error obteniendo llamadas ${status}:`, error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error(`💥 Error en getCallsByStatus(${status}):`, error);
      return [];
    }
  }
  
  /**
   * Suscripción a cambios en tiempo real usando la vista
   * Nota: Puede requerir configuración adicional en Supabase
   */
  async subscribeToChanges(
    onInsert?: (call: LiveMonitorViewData) => void,
    onUpdate?: (call: LiveMonitorViewData) => void,
    onDelete?: (callId: string) => void
  ) {
    try {
      // Configurando suscripción Realtime (silencioso)
      
      // Intentar suscripción a la vista
      let channel;
      try {
        channel = analysisSupabase
          .channel('live_monitor_optimized')
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'live_monitor_view' 
            },
            (payload) => {
              // Cambio detectado en vista (silencioso)
              
              if (payload.eventType === 'INSERT' && onInsert) {
                onInsert(payload.new as LiveMonitorViewData);
              } else if (payload.eventType === 'UPDATE' && onUpdate) {
                onUpdate(payload.new as LiveMonitorViewData);
              } else if (payload.eventType === 'DELETE' && onDelete) {
                onDelete(payload.old?.call_id);
              }
            }
          )
          .subscribe((status) => {
            // Suscripción activa (silencioso)
          });
      } catch (viewError) {
        // Realtime en vista no disponible, usando tablas base (no crítico)
        
        // Fallback: suscribirse a las tablas base
        channel = analysisSupabase
          .channel('live_monitor_fallback')
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'llamadas_ventas' 
            },
            async (payload) => {
              // Cambio en llamadas_ventas (silencioso)
              
              // Recargar datos de la vista cuando cambien las tablas base
              if (payload.new?.call_id) {
                const { data } = await analysisSupabase
                  .from('live_monitor_view')
                  .select('*')
                  .eq('call_id', payload.new.call_id)
                  .single();
                
                if (data && onUpdate) {
                  onUpdate(data);
                }
              }
            }
          )
          .subscribe((status) => {
            // Suscripción fallback activa (silencioso)
          });
      }
      
      return channel;
    } catch (error) {
      console.error('💥 Error configurando suscripción optimizada:', error);
      return null;
    }
  }
  
  /**
   * Estadísticas rápidas desde la vista
   */
  async getQuickStats() {
    try {
      const { data, error } = await analysisSupabase
        .from('live_monitor_view')
        .select(`
          call_status_inteligente,
          call_status_bd,
          checkpoint_venta_actual,
          minutos_transcurridos
        `);
      
      if (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return null;
      }
      
      const stats = {
        total: data.length,
        activas: data.filter(c => c.call_status_inteligente === 'activa').length,
        perdidas: data.filter(c => c.call_status_inteligente === 'perdida').length,
        transferidas: data.filter(c => c.call_status_inteligente === 'transferida').length,
        finalizadas: data.filter(c => c.call_status_inteligente === 'finalizada').length,
        reclasificadas: data.filter(c => c.call_status_bd !== c.call_status_inteligente).length,
        checkpoints: {}
      };
      
      // Contar por checkpoint
      data.forEach(call => {
        const checkpoint = call.checkpoint_venta_actual || 'sin_checkpoint';
        stats.checkpoints[checkpoint] = (stats.checkpoints[checkpoint] || 0) + 1;
      });
      
      // Estadísticas calculadas (silencioso)
      return stats;
    } catch (error) {
      console.error('💥 Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
export const liveMonitorOptimizedService = new LiveMonitorOptimizedService();
export default liveMonitorOptimizedService;
