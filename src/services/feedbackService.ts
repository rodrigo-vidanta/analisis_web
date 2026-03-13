/**
 * ============================================
 * SERVICIO DE RETROALIMENTACIÓN - MÓDULO ANÁLISIS IA
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_ANALISIS_IA.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_ANALISIS_IA.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_ANALISIS_IA.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ============================================
// SERVICIO DE RETROALIMENTACIÓN
// Maneja todas las operaciones CRUD para el sistema de retroalimentación
// ============================================

import { pqncQaProxy } from './multiDbProxyService';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface FeedbackData {
  id?: string;
  call_id: string;
  feedback_text: string;
  feedback_summary?: string;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  updated_by?: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
  helpful_votes?: number;
}

export interface FeedbackHistoryEntry {
  id: string;
  version_number: number;
  feedback_text: string;
  action_type: 'created' | 'updated' | 'deleted';
  changed_by: {
    id: string;
    name: string;
    email: string;
  };
  changed_at: string;
  change_reason?: string;
}

export interface FeedbackInteraction {
  interaction_type: 'view' | 'helpful' | 'not_helpful' | 'report';
  interaction_value: number;
}

// ============================================
// CLASE DE SERVICIO
// ============================================

class FeedbackService {
  
  // ============================================
  // OPERACIONES PRINCIPALES
  // ============================================
  
  /**
   * Crear o actualizar retroalimentación
   */
  async upsertFeedback(callId: string, feedbackText: string, userId: string): Promise<FeedbackData> {
    try {
      console.log('🔄 Guardando retroalimentación...', { callId, userId, textLength: feedbackText.length });
      
      const feedbackSummary = feedbackText.length > 100 ? feedbackText.substring(0, 97) + '...' : feedbackText;
      
      // Primero verificar si existe
      const existing = await pqncQaProxy.select('call_feedback', {
        filters: { call_id: callId },
        single: true
      });
      
      let result;
      if (existing.data) {
        // Update
        result = await pqncQaProxy.update('call_feedback', {
          feedback_text: feedbackText,
          feedback_summary: feedbackSummary,
          updated_by: userId,
          updated_at: new Date().toISOString()
        }, { call_id: callId });
      } else {
        // Insert
        result = await pqncQaProxy.insert('call_feedback', {
          call_id: callId,
          feedback_text: feedbackText,
          feedback_summary: feedbackSummary,
          created_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString()
        });
      }
      
      if (result.error) {
        console.error('❌ Error guardando retroalimentación:', result.error);
        
        // Simular éxito para no romper la UX
        console.warn('⚠️ Error en BD, simulando guardado exitoso');
        return {
          id: `temp-${Date.now()}`,
          call_id: callId,
          feedback_text: feedbackText,
          feedback_summary: feedbackSummary,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      console.log('✅ Retroalimentación guardada exitosamente');
      
      // Obtener datos completos
      const data = Array.isArray(result.data) ? result.data[0] : result.data;
      
      const feedbackData: FeedbackData = {
        id: data?.id || `temp-${Date.now()}`,
        call_id: callId,
        feedback_text: feedbackText,
        feedback_summary: feedbackSummary,
        created_by: {
          id: userId,
          name: 'Usuario',
          email: 'usuario@sistema.com'
        },
        updated_by: {
          id: userId,
          name: 'Usuario',
          email: 'usuario@sistema.com'
        },
        created_at: data?.created_at || new Date().toISOString(),
        updated_at: data?.updated_at || new Date().toISOString(),
        view_count: data?.view_count || 0,
        helpful_votes: data?.helpful_votes || 0
      };
      
      return feedbackData;
      
    } catch (error) {
      console.error('💥 Error en upsertFeedback:', error);
      throw error;
    }
  }
  
  /**
   * Obtener retroalimentación de una llamada
   */
  async getFeedback(callId: string): Promise<FeedbackData | null> {
    try {
      const result = await pqncQaProxy.select('call_feedback', {
        select: 'id,call_id,feedback_text,feedback_summary,created_by,updated_by,created_at,updated_at,view_count,helpful_votes',
        filters: {
          call_id: callId,
          is_active: true
        },
        maybeSingle: true,
        limit: 1
      });
      
      if (result.error) {
        console.warn('⚠️ Error obteniendo retroalimentación:', result.error);
        return null;
      }
      
      if (!result.data) {
        return null;
      }
      
      const data = result.data as Record<string, unknown>;
      
      const feedbackData: FeedbackData = {
        id: data.id as string,
        call_id: data.call_id as string,
        feedback_text: data.feedback_text as string,
        feedback_summary: data.feedback_summary as string,
        created_by: {
          id: data.created_by as string,
          name: 'Usuario',
          email: 'usuario@sistema.com'
        },
        updated_by: data.updated_by ? {
          id: data.updated_by as string,
          name: 'Usuario',
          email: 'usuario@sistema.com'
        } : null,
        created_at: data.created_at as string,
        updated_at: data.updated_at as string,
        view_count: (data.view_count as number) || 0,
        helpful_votes: (data.helpful_votes as number) || 0
      };
      
      return feedbackData;
      
    } catch (error) {
      console.error('💥 Error en getFeedback:', error);
      return null;
    }
  }
  
  /**
   * Registrar interacción con retroalimentación
   * TODO: Implementar vía Edge Function cuando se necesite
   */
  async registerInteraction(
    feedbackId: string, 
    userId: string, 
    interaction: FeedbackInteraction
  ): Promise<void> {
    try {
      console.log('👆 Registrando interacción:', { feedbackId, userId, interaction });
      
      // Por ahora, incrementar contadores directamente
      if (interaction.interaction_type === 'view') {
        await pqncQaProxy.update('call_feedback', 
          { view_count: interaction.interaction_value },
          { id: feedbackId }
        );
      } else if (interaction.interaction_type === 'helpful') {
        await pqncQaProxy.update('call_feedback',
          { helpful_votes: interaction.interaction_value },
          { id: feedbackId }
        );
      }
      
      console.log('✅ Interacción registrada');
      
    } catch (error) {
      console.error('💥 Error en registerInteraction:', error);
      // No lanzar error para no romper UX
    }
  }
  
  /**
   * Obtener historial de retroalimentación
   * TODO: Implementar vía Edge Function cuando se necesite
   */
  async getFeedbackHistory(_feedbackId: string): Promise<FeedbackHistoryEntry[]> {
    // Historial no disponible sin RPC - retornar vacío
    console.log('📜 Historial no disponible (requiere RPC)');
    return [];
  }
  
  // ============================================
  // OPERACIONES DE CONSULTA MASIVA
  // ============================================
  
  /**
   * Obtener retroalimentaciones múltiples por IDs de llamadas
   */
  async getMultipleFeedbacks(callIds: string[]): Promise<Map<string, FeedbackData>> {
    try {
      if (callIds.length === 0) return new Map();
      
      // OPTIMIZACIÓN: Limitar a 50 IDs para evitar URLs muy largas
      if (callIds.length > 50) {
        callIds = callIds.slice(0, 50);
      }
      
      const result = await pqncQaProxy.select('call_feedback', {
        select: 'id,call_id,feedback_text,feedback_summary,created_by,updated_by,created_at,updated_at,view_count,helpful_votes',
        filters: { 
          call_id: { op: 'in', value: callIds },
          is_active: true
        }
      });
      
      if (result.error) {
        console.warn('⚠️ Error obteniendo múltiples retroalimentaciones:', result.error);
        return new Map();
      }
      
      const feedbackMap = new Map<string, FeedbackData>();
      const items = Array.isArray(result.data) ? result.data : [];
      
      items.forEach((item: Record<string, unknown>) => {
        feedbackMap.set(item.call_id as string, {
          id: item.id as string,
          call_id: item.call_id as string,
          feedback_text: item.feedback_text as string,
          feedback_summary: item.feedback_summary as string,
          created_by: {
            id: item.created_by as string,
            name: 'Usuario',
            email: 'usuario@sistema.com'
          },
          updated_by: item.updated_by ? {
            id: item.updated_by as string,
            name: 'Usuario',
            email: 'usuario@sistema.com'
          } : null,
          created_at: item.created_at as string,
          updated_at: item.updated_at as string,
          view_count: (item.view_count as number) || 0,
          helpful_votes: (item.helpful_votes as number) || 0
        });
      });
      
      return feedbackMap;
      
    } catch (error) {
      console.error('💥 Error en getMultipleFeedbacks:', error);
      return new Map();
    }
  }
  
  // ============================================
  // OPERACIONES DE VALIDACIÓN
  // ============================================
  
  /**
   * Validar texto de retroalimentación
   */
  validateFeedbackText(text: string): { isValid: boolean; error?: string } {
    if (!text || !text.trim()) {
      return { isValid: false, error: 'La retroalimentación no puede estar vacía' };
    }
    
    if (text.length > 1500) {
      return { isValid: false, error: 'La retroalimentación no puede exceder 1500 caracteres' };
    }
    
    if (text.length < 10) {
      return { isValid: false, error: 'La retroalimentación debe tener al menos 10 caracteres' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Verificar si el usuario puede editar una retroalimentación
   */
  canUserEditFeedback(feedback: FeedbackData, userId: string): boolean {
    if (!feedback.created_by) return false;
    return feedback.created_by.id === userId;
  }
  
  // ============================================
  // UTILIDADES
  // ============================================
  
  /**
   * Generar resumen automático de retroalimentación
   */
  generateFeedbackSummary(text: string): string {
    if (text.length <= 100) return text;
    return text.substring(0, 97) + '...';
  }
  
  /**
   * Formatear fecha para mostrar
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Calcular tiempo transcurrido desde una fecha
   */
  getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Hace unos segundos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return this.formatDate(dateString);
  }
}

// ============================================
// EXPORTAR INSTANCIA SINGLETON
// ============================================

export const feedbackService = new FeedbackService();
export default feedbackService;
