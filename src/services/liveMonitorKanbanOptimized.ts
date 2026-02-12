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
      
      // IDs ya incluidos en la vista (evita queries extra en liveActivityStore)
      ejecutivo_id: (optimizedCall as Record<string, unknown>).ejecutivo_id as string | undefined,
      coordinacion_id: (optimizedCall as Record<string, unknown>).coordinacion_id as string | undefined,

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
      
      // Log de estadísticas de auto-clasificación (silencioso)
      const reclasificadas = optimizedCalls.filter(c => c.call_status_bd !== c.call_status_inteligente);
      
      // Clasificar llamadas usando la auto-clasificación de la vista con nueva lógica mejorada
      const active: KanbanCallOptimized[] = [];
      const transferred: KanbanCallOptimized[] = [];
      const attended: KanbanCallOptimized[] = []; // Nueva: Atendida / no Transferida
      const failed: KanbanCallOptimized[] = [];
      
      // Función helper para extraer razon_finalizacion
      const getRazonFinalizacion = (call: KanbanCallOptimized): string | null => {
        return call.razon_finalizacion || null;
      };

      // Función helper para determinar si tiene grabación
      const hasRecording = (call: KanbanCallOptimized): boolean => {
        return !!(call.audio_ruta_bucket && call.audio_ruta_bucket.length > 0);
      };

      // Razones de finalización que indican transferencia
      const TRANSFER_REASONS = [
        'assistant-forwarded-call',
        'call.ringing.hook-executed-transfer'
      ];

      // Razones de finalización que indican pérdida/no contestada
      const FAILED_REASONS = [
        'customer-did-not-answer',
        'customer-busy',
        'assistant-not-found',
        'assistant-not-valid',
        'assistant-not-provided',
        'assistant-join-timed-out',
        'twilio-failed-to-connect-call',
        'vonage-failed-to-connect-call',
        'vonage-rejected',
        'voicemail'
      ];
      
      allCalls.forEach(call => {
        const razonFinalizacion = getRazonFinalizacion(call);
        const hasRecordingValue = hasRecording(call);
        const duration = call.duracion_segundos || 0;
        const hasFeedback = call.tiene_feedback === true;
        const estadoInteligente = call.call_status;
        const estadoBD = call.call_status_bd;
        
        // REGLA 1: Si tiene grabación, la llamada YA TERMINÓ
        if (hasRecordingValue) {
          // REGLA 1.1: Transferidas
          if (razonFinalizacion && TRANSFER_REASONS.some(reason => razonFinalizacion.includes(reason))) {
            if (!hasFeedback) {
              transferred.push(call);
            }
            return;
          }
          
          // REGLA 1.2: Duración < 30 segundos → Fallida
          if (duration < 30) {
            if (!hasFeedback) {
              failed.push(call);
            }
            return;
          }
          
          // REGLA 1.3: Duración >= 30 segundos pero NO transferida → Atendida
          if (duration >= 30) {
            if (razonFinalizacion === 'customer-ended-call' || 
                razonFinalizacion === 'assistant-ended-call' ||
                razonFinalizacion === 'assistant-ended-call-after-message-spoken' ||
                razonFinalizacion === 'assistant-ended-call-with-hangup-task' ||
                razonFinalizacion === 'assistant-said-end-call-phrase' ||
                !razonFinalizacion) {
              if (!hasFeedback) {
                attended.push(call);
              }
              return;
            }
            
            if (!TRANSFER_REASONS.some(r => razonFinalizacion?.includes(r)) &&
                !FAILED_REASONS.some(r => razonFinalizacion?.includes(r))) {
              if (!hasFeedback) {
                attended.push(call);
              }
              return;
            }
          }
        }
        
        // REGLA 2: Clasificación por estado inteligente
        switch (estadoInteligente) {
          case 'activa':
            // Solo si NO tiene grabación, NO tiene razón, y NO tiene duración
            // ADEMÁS: Verificar que no sean muy antiguas (más de 15 minutos sin actividad = perdida)
            if (!hasRecordingValue && !razonFinalizacion && duration === 0) {
              // Verificar tiempo transcurrido
              const minutosTranscurridos = call.minutos_transcurridos || 0;
              
              // Si la llamada tiene más de 15 minutos sin grabación ni duración → perdida
              if (minutosTranscurridos > 15) {
                if (!hasFeedback) {
                  failed.push(call);
                }
              } else {
                active.push(call);
              }
            }
            break;
            
          case 'transferida':
            if (!hasFeedback) {
              transferred.push(call);
            }
            break;
            
          case 'finalizada':
            // Si tiene grabación y duración >= 30 seg y NO es transferida → atendida
            if (hasRecordingValue && duration >= 30 && 
                (!razonFinalizacion || !TRANSFER_REASONS.some(r => razonFinalizacion.includes(r)))) {
              if (!hasFeedback) {
                attended.push(call);
              }
            }
            break;
            
          case 'perdida':
            if (!hasFeedback) {
              failed.push(call);
            }
            break;
            
          default:
            // Estado desconocido - verificar call_status_bd como fallback
            if (estadoBD === 'activa' && !hasRecordingValue && !razonFinalizacion && duration === 0) {
              // Verificar tiempo transcurrido también en fallback
              const minutosTranscurridos = call.minutos_transcurridos || 0;
              if (minutosTranscurridos > 15) {
                if (!hasFeedback) {
                  failed.push(call);
                }
              } else {
                active.push(call);
              }
            } else if (!hasFeedback) {
              failed.push(call);
            }
        }
      });
      
      return {
        active,
        transferred,
        attended,
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
        attended: [],
        failed: [],
        all: [],
        stats: { total: 0, reclasificadas: 0 }
      };
    }
  }
  
}

// Exportar instancia singleton
export const liveMonitorKanbanOptimized = new LiveMonitorKanbanOptimizedService();
export default liveMonitorKanbanOptimized;
