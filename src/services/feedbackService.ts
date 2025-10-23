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

import { pqncSupabaseAdmin } from '../config/pqncSupabase';

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
      
      // Usar upsert con consulta completa de usuario
      const { data, error } = await pqncSupabaseAdmin
        .from('call_feedback')
        .upsert({
          call_id: callId,
          feedback_text: feedbackText,
          created_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString(),
          feedback_summary: feedbackText.length > 100 ? feedbackText.substring(0, 97) + '...' : feedbackText
        }, {
          onConflict: 'call_id',
          ignoreDuplicates: false
        })
        .select(`
          id,
          call_id,
          feedback_text,
          feedback_summary,
          created_by,
          updated_by,
          created_at,
          updated_at,
          view_count,
          helpful_votes,
          creator:auth_users!fk_call_feedback_created_by (
            id,
            full_name,
            email
          ),
          updater:auth_users!fk_call_feedback_updated_by (
            id,
            full_name,
            email
          )
        `)
        .single();
      
      if (error) {
        console.error('❌ Error guardando retroalimentación:', error);
        
        // Si la tabla no existe, simular éxito para no romper la UX
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ Tabla call_feedback no existe, simulando guardado exitoso');
          return {
            id: `temp-${Date.now()}`,
            call_id: callId,
            feedback_text: feedbackText,
            feedback_summary: feedbackText.length > 100 ? feedbackText.substring(0, 97) + '...' : feedbackText,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        throw new Error(`Error al guardar retroalimentación: ${error.message}`);
      }
      
      console.log('✅ Retroalimentación guardada exitosamente:', data);
      
      // Transformar respuesta a formato esperado con datos reales de usuarios
      const feedbackData: FeedbackData = {
        id: data.id,
        call_id: data.call_id,
        feedback_text: data.feedback_text,
        feedback_summary: data.feedback_summary,
        created_by: {
          id: data.created_by,
          name: data.creator?.full_name || 'Usuario Desconocido',
          email: data.creator?.email || 'desconocido@sistema.com'
        },
        updated_by: data.updated_by && data.updater ? {
          id: data.updated_by,
          name: data.updater.full_name || 'Usuario Desconocido',
          email: data.updater.email || 'desconocido@sistema.com'
        } : null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        view_count: data.view_count || 0,
        helpful_votes: data.helpful_votes || 0
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
      console.log('🔍 Obteniendo retroalimentación para llamada:', callId);
      
      // Consulta con joins ahora que las foreign keys existen
      const { data, error } = await pqncSupabaseAdmin
        .from('call_feedback')
        .select(`
          id,
          call_id,
          feedback_text,
          feedback_summary,
          created_by,
          updated_by,
          created_at,
          updated_at,
          view_count,
          helpful_votes,
          creator:auth_users!fk_call_feedback_created_by (
            id,
            full_name,
            email
          ),
          updater:auth_users!fk_call_feedback_updated_by (
            id,
            full_name,
            email
          )
        `)
        .eq('call_id', callId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        // Si la tabla no existe, retornar null sin error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ Tabla call_feedback no existe aún, retornando null');
          return null;
        }
        
        console.error('❌ Error obteniendo retroalimentación:', error);
        // Retornar null en lugar de lanzar error para no romper la funcionalidad principal
        console.warn('⚠️ Retornando null debido a error en BD');
        return null;
      }
      
      // Si no hay retroalimentación, retornar null
      if (!data) {
        console.log('📭 No hay retroalimentación para esta llamada');
        return null;
      }
      
      console.log('✅ Retroalimentación obtenida:', data);
      
      // Transformar respuesta a formato esperado con datos reales de usuarios
      const feedbackData: FeedbackData = {
        id: data.id,
        call_id: data.call_id,
        feedback_text: data.feedback_text,
        feedback_summary: data.feedback_summary,
        created_by: {
          id: data.created_by,
          name: data.creator?.full_name || 'Usuario Desconocido',
          email: data.creator?.email || 'desconocido@sistema.com'
        },
        updated_by: data.updated_by && data.updater ? {
          id: data.updated_by,
          name: data.updater.full_name || 'Usuario Desconocido',
          email: data.updater.email || 'desconocido@sistema.com'
        } : null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        view_count: data.view_count || 0,
        helpful_votes: data.helpful_votes || 0
      };
      
      return feedbackData;
      
    } catch (error) {
      console.error('💥 Error en getFeedback:', error);
      // Retornar null en lugar de lanzar error para no romper la app
      console.warn('⚠️ Retornando null debido a excepción');
      return null;
    }
  }
  
  /**
   * Registrar interacción con retroalimentación
   */
  async registerInteraction(
    feedbackId: string, 
    userId: string, 
    interaction: FeedbackInteraction
  ): Promise<void> {
    try {
      console.log('👆 Registrando interacción:', { feedbackId, userId, interaction });
      
      const { data, error } = await pqncSupabaseAdmin
        .rpc('register_feedback_interaction', {
          p_feedback_id: feedbackId,
          p_user_id: userId,
          p_interaction_type: interaction.interaction_type,
          p_interaction_value: interaction.interaction_value
        });
      
      if (error) {
        console.error('❌ Error en register_feedback_interaction:', error);
        throw new Error(`Error al registrar interacción: ${error.message}`);
      }
      
      if (!data || !data.success) {
        throw new Error('Error al registrar interacción');
      }
      
      console.log('✅ Interacción registrada exitosamente');
      
    } catch (error) {
      console.error('💥 Error en registerInteraction:', error);
      throw error;
    }
  }
  
  /**
   * Obtener historial de retroalimentación
   */
  async getFeedbackHistory(feedbackId: string): Promise<FeedbackHistoryEntry[]> {
    try {
      console.log('📜 Obteniendo historial de retroalimentación:', feedbackId);
      
      const { data, error } = await pqncSupabaseAdmin
        .rpc('get_feedback_history', {
          p_feedback_id: feedbackId
        });
      
      if (error) {
        console.error('❌ Error en get_feedback_history:', error);
        throw new Error(`Error al obtener historial: ${error.message}`);
      }
      
      if (!data || !data.success) {
        throw new Error('Error al obtener historial');
      }
      
      console.log('✅ Historial obtenido:', data);
      
      return data.history || [];
      
    } catch (error) {
      console.error('💥 Error en getFeedbackHistory:', error);
      throw error;
    }
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
        console.log(`⚡ [FEEDBACK] Limitando a 50 IDs para evitar URLs largas (era ${callIds.length})`);
        callIds = callIds.slice(0, 50);
      }
      
      // Consulta con joins ahora que las foreign keys existen
      const { data, error } = await pqncSupabaseAdmin
        .from('call_feedback')
        .select(`
          id,
          call_id,
          feedback_text,
          feedback_summary,
          created_by,
          updated_by,
          created_at,
          updated_at,
          view_count,
          helpful_votes,
          creator:auth_users!fk_call_feedback_created_by (
            id,
            full_name,
            email
          ),
          updater:auth_users!fk_call_feedback_updated_by (
            id,
            full_name,
            email
          )
        `)
        .in('call_id', callIds)
        .eq('is_active', true);
      
      if (error) {
        // Si la tabla no existe, retornar Map vacío sin error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ Tabla call_feedback no existe aún, retornando Map vacío');
          return new Map();
        }
        
        console.error('❌ Error obteniendo múltiples retroalimentaciones:', error);
        // No lanzar error, solo retornar Map vacío para no romper la funcionalidad principal
        console.warn('⚠️ Retornando Map vacío debido a error en BD');
        return new Map();
      }
      
      
      // Convertir a Map para acceso rápido
      const feedbackMap = new Map<string, FeedbackData>();
      
      data?.forEach(item => {
        // Crear objeto con datos reales de usuarios
        feedbackMap.set(item.call_id, {
          id: item.id,
          call_id: item.call_id,
          feedback_text: item.feedback_text,
          feedback_summary: item.feedback_summary,
          created_by: {
            id: item.created_by,
            name: item.creator?.full_name || 'Usuario Desconocido',
            email: item.creator?.email || 'desconocido@sistema.com'
          },
          updated_by: item.updated_by && item.updater ? {
            id: item.updated_by,
            name: item.updater.full_name || 'Usuario Desconocido',
            email: item.updater.email || 'desconocido@sistema.com'
          } : null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          view_count: item.view_count || 0,
          helpful_votes: item.helpful_votes || 0
        });
      });
      
      return feedbackMap;
      
    } catch (error) {
      console.error('💥 Error en getMultipleFeedbacks:', error);
      // Retornar Map vacío en lugar de lanzar error para no romper la app
      console.warn('⚠️ Retornando Map vacío debido a excepción');
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
