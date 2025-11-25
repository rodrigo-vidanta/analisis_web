/**
 * ============================================
 * SERVICIO KANBAN OPTIMIZADO - MÓDULO LIVE MONITOR
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
// SERVICIO OPTIMIZADO PARA LIVE MONITOR KANBAN
// Adapta la vista optimizada al formato esperado por el componente
// ============================================

import { liveMonitorOptimizedService, type LiveMonitorViewData } from './liveMonitorOptimizedService';
import { analysisSupabase } from '../config/analysisSupabase';
import type { LiveCallData } from './liveMonitorService';

// Interfaz para compatibilidad con el componente existente
interface KanbanCallOptimized extends LiveCallData {
  checkpoint_venta_actual?: string;
  composicion_familiar_numero?: number;
  destino_preferido?: string;
  preferencia_vacaciones?: string[];
  numero_noches?: number;
  mes_preferencia?: string;
  edad?: number;
  propuesta_economica_ofrecida?: number;
  habitacion_ofertada?: string;
  resort_ofertado?: string;
  principales_objeciones?: string;
  resumen_llamada?: string;
  conversacion_completa?: any;
  
  // Campos adicionales de la vista optimizada
  call_status_bd?: string;
  razon_finalizacion?: string;
  minutos_transcurridos?: number;
}

class LiveMonitorKanbanOptimizedService {
  
  /**
   * Convierte datos de la vista optimizada al formato esperado por el componente
   */
  private mapOptimizedToKanban(optimizedCall: LiveMonitorViewData): KanbanCallOptimized {
    return {
      // IDs principales
      call_id: optimizedCall.call_id,
      prospecto_id: optimizedCall.prospecto_id,
      
      // Estados (usar el inteligente como principal)
      call_status: optimizedCall.call_status_inteligente, // ¡Auto-clasificado!
      call_status_bd: optimizedCall.call_status_bd, // Estado original para referencia
      
      // Datos de la llamada
      fecha_llamada: optimizedCall.fecha_llamada,
      duracion_segundos: optimizedCall.duracion_segundos,
      nivel_interes: optimizedCall.nivel_interes,
      datos_llamada: optimizedCall.datos_llamada,
      datos_proceso: optimizedCall.datos_proceso,
      audio_ruta_bucket: optimizedCall.audio_ruta_bucket,
      
      // URLs de control
      monitor_url: optimizedCall.monitor_url,
      control_url: optimizedCall.control_url,
      call_sid: optimizedCall.call_sid,
      provider: optimizedCall.provider,
      account_sid: optimizedCall.account_sid,
      
      // Datos del prospecto (ya incluidos en la vista)
      nombre_completo: optimizedCall.nombre_completo,
      nombre_whatsapp: optimizedCall.nombre_whatsapp,
      whatsapp: optimizedCall.whatsapp,
      telefono_principal: optimizedCall.telefono_principal,
      email: optimizedCall.email,
      ciudad_residencia: optimizedCall.ciudad_residencia,
      estado_civil: optimizedCall.estado_civil,
      edad: optimizedCall.edad,
      etapa: optimizedCall.etapa_prospecto,
      observaciones: optimizedCall.observaciones,
      
      // Composición y preferencias (ya unificadas)
      tamano_grupo: optimizedCall.composicion_familiar_numero,
      destino_preferencia: optimizedCall.destino_preferencia,
      viaja_con: optimizedCall.viaja_con,
      cantidad_menores: optimizedCall.cantidad_menores,
      
      // Campos VAPI dinámicos
      checkpoint_venta_actual: optimizedCall.checkpoint_venta_actual,
      composicion_familiar_numero: optimizedCall.composicion_familiar_numero,
      destino_preferido: optimizedCall.destino_preferencia?.[0], // Primer elemento del array
      preferencia_vacaciones: optimizedCall.preferencia_vacaciones,
      numero_noches: optimizedCall.numero_noches,
      mes_preferencia: optimizedCall.mes_preferencia,
      propuesta_economica_ofrecida: optimizedCall.propuesta_economica_ofrecida,
      habitacion_ofertada: optimizedCall.habitacion_ofertada,
      resort_ofertado: optimizedCall.resort_ofertado,
      principales_objeciones: optimizedCall.principales_objeciones,
      resumen_llamada: optimizedCall.resumen_llamada,
      conversacion_completa: optimizedCall.conversacion_completa,
      
      // Feedback
      tiene_feedback: optimizedCall.tiene_feedback,
      feedback_resultado: optimizedCall.feedback_resultado,
      feedback_comentarios: optimizedCall.feedback_comentarios,
      feedback_user_email: optimizedCall.feedback_user_email,
      feedback_fecha: optimizedCall.feedback_fecha,
      
      // Timestamps
      updated_at: optimizedCall.prospecto_updated_at,
      
      // Campos adicionales de la vista optimizada
      minutos_transcurridos: optimizedCall.minutos_transcurridos,
      razon_finalizacion: optimizedCall.razon_finalizacion,
      
      // Campos de compatibilidad
      temperatura_prospecto: undefined,
      es_venta_exitosa: optimizedCall.es_venta_exitosa,
      precio_ofertado: optimizedCall.precio_ofertado,
      tipo_llamada: undefined,
      oferta_presentada: undefined,
      requiere_seguimiento: undefined,
      costo_total: optimizedCall.costo_total,
      probabilidad_cierre: optimizedCall.probabilidad_cierre
    };
  }
  
  /**
   * Obtener llamadas clasificadas automáticamente por la vista optimizada
   */
  async getClassifiedCalls() {
    try {
      // Cargando desde vista optimizada
      
      const optimizedCalls = await liveMonitorOptimizedService.getOptimizedCalls();
      const allCalls = optimizedCalls.map(call => this.mapOptimizedToKanban(call));
      
      console.log(`📊 Total llamadas cargadas: ${allCalls.length}`);
      
      // Log de estadísticas de auto-clasificación (silencioso)
      const reclasificadas = optimizedCalls.filter(c => c.call_status_bd !== c.call_status_inteligente);
      
      // Clasificar llamadas usando la auto-clasificación de la vista (¡Sin lógica manual!)
      const active: KanbanCallOptimized[] = [];
      const transferred: KanbanCallOptimized[] = [];
      const finished: KanbanCallOptimized[] = []; // Finalizadas exitosas
      const failed: KanbanCallOptimized[] = [];
      
      allCalls.forEach(call => {
        // 🚀 [OPTIMIZED] CLASIFICACIÓN SIMPLIFICADA - La vista ya hizo el trabajo pesado
        // Usar call_status_inteligente de la vista, no call_status del mapeo
        
        const estadoInteligente = call.call_status; // Este ya viene mapeado desde call_status_inteligente
        const estadoBD = call.call_status_bd;
        
        switch (estadoInteligente) {
          case 'activa':
            active.push(call);
            console.log(`✅ Llamada activa detectada: ${call.call_id} (BD: ${estadoBD}, Inteligente: ${estadoInteligente})`);
            break;
            
          case 'transferida':
            transferred.push(call);
            break;
            
          case 'finalizada':
            finished.push(call);
            break;
            
          case 'perdida':
            failed.push(call);
            break;
            
          // Mapear estados legacy al nuevo sistema
          case 'colgada':
          case 'exitosa':
            finished.push(call);
            break;
            
          default:
            // Estado desconocido - verificar call_status_bd como fallback
            if (call.call_status_bd === 'activa') {
              active.push(call);
            } else {
              failed.push(call);
            }
        }
      });
      
      // Clasificación completada
      console.log(`📊 Clasificación: ${active.length} activas, ${transferred.length} transferidas, ${failed.length} fallidas`);
      
      return {
        active,
        transferred: transferred.concat(finished), // Combinar transferidas + finalizadas para compatibilidad
        finished: [], // Vacío - se usa transferred
        failed,
        all: allCalls,
        stats: {
          total: allCalls.length,
          reclasificadas: reclasificadas.length
        }
      };
      
    } catch (error) {
      console.error('💥 Error en getClassifiedCalls optimizado:', error);
      return {
        active: [],
        transferred: [],
        finished: [],
        failed: [],
        all: [],
        stats: { total: 0, reclasificadas: 0 }
      };
    }
  }
  
  /**
   * Configurar suscripción realtime optimizada
   * Si falla, retorna null y el componente usará solo polling
   */
  async subscribeToChanges(onCallsUpdate: (calls: any) => void) {
    try {
      // Intentar suscribirse a cambios en la tabla base (INSERT y UPDATE)
      // Si hay sobrecarga de conexiones, simplemente retornar null y usar solo polling
      const channel = analysisSupabase
        .channel(`kanban_optimized_realtime_${Date.now()}`) // Canal único para evitar conflictos
        // INSERT: nuevas llamadas deben aparecer inmediatamente
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'llamadas_ventas' 
          },
          async (payload) => {
            // Nueva llamada detectada - recargar inmediatamente
            console.log('🔔 Realtime INSERT detectado en llamadas_ventas:', payload.new?.call_id);
            const classifiedCalls = await this.getClassifiedCalls();
            onCallsUpdate(classifiedCalls);
          }
        )
        // UPDATE: cambios de estado, checkpoint, etc.
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'llamadas_ventas' 
          },
          async (payload) => {
            // Cambio detectado en llamadas_ventas - recargar para obtener clasificación actualizada
            const newCall = payload.new as any;
            const oldCall = payload.old as any;
            if (newCall?.call_status === 'activa' || (oldCall?.call_status !== 'activa' && newCall?.call_status === 'activa')) {
              console.log('🔔 Realtime UPDATE detectado - Llamada activa:', newCall?.call_id);
            }
            const classifiedCalls = await this.getClassifiedCalls();
            onCallsUpdate(classifiedCalls);
          }
        )
        // DELETE: llamadas eliminadas
        .on(
          'postgres_changes',
          { 
            event: 'DELETE', 
            schema: 'public', 
            table: 'llamadas_ventas' 
          },
          async (payload) => {
            // Llamada eliminada - recargar para actualizar listas
            const classifiedCalls = await this.getClassifiedCalls();
            onCallsUpdate(classifiedCalls);
          }
        )
        // UPDATE en prospectos: puede afectar datos de la vista
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'prospectos' 
          },
          async (payload) => {
            // Cambio en prospecto - recargar para actualizar datos del prospecto en la vista
            const classifiedCalls = await this.getClassifiedCalls();
            onCallsUpdate(classifiedCalls);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Suscripción Realtime optimizada activa - Detectando cambios en llamadas_ventas y prospectos');
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            console.warn('⚠️ Realtime no disponible (sobrecarga o error). Usando solo polling cada 3 segundos.');
            // No hacer nada - el polling se encargará de detectar cambios
            return null;
          } else {
            console.log('⚠️ Estado de suscripción Realtime:', status);
          }
        });
      
      // Esperar un momento para verificar si la suscripción se establece correctamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar el estado del canal
      if (channel.state === 'closed' || channel.state === 'errored') {
        console.warn('⚠️ Canal Realtime cerrado o con error. Usando solo polling.');
        return null;
      }
      
      return channel;
    } catch (error) {
      console.warn('⚠️ Error configurando Realtime (usando solo polling):', error);
      // No es crítico - el polling se encargará de detectar cambios
      return null;
    }
  }
  
  /**
   * Obtener estadísticas rápidas
   */
  async getQuickStats() {
    const stats = await liveMonitorOptimizedService.getQuickStats();
    return {
      ...stats,
      source: 'vista_optimizada'
    };
  }
}

// Exportar instancia singleton
export const liveMonitorKanbanOptimized = new LiveMonitorKanbanOptimizedService();
export default liveMonitorKanbanOptimized;
