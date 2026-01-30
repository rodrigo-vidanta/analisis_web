/**
 * ============================================
 * SERVICIO DE CONVERSACIONES OPTIMIZADO
 * ============================================
 * 
 * Utiliza la vista materializada mv_conversaciones_dashboard
 * para cargar conversaciones de forma más eficiente.
 * 
 * Versión: 1.0.0
 * Fecha: 2026-01-14
 * 
 * Changelog:
 * - v1.0.0: Implementación inicial con vista materializada
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { botPauseService } from './botPauseService';
import { whatsappLabelsService, type ConversationLabel } from './whatsappLabelsService';

// Feature flag para habilitar la optimización
export const USE_OPTIMIZED_VIEW = import.meta.env.VITE_USE_OPTIMIZED_LIVECHAT === 'true';

// Interfaz que coincide con la estructura de la vista
export interface DashboardConversation {
  prospecto_id: string;
  nombre_contacto: string | null;
  nombre_whatsapp: string | null;
  numero_telefono: string | null;
  whatsapp_raw: string | null;
  etapa: string | null;
  etapa_id: string | null; // ✅ AGREGADO: FK a tabla etapas
  requiere_atencion_humana: boolean;
  motivo_handoff: string | null;
  id_dynamics: string | null;
  id_uchat: string | null;
  fecha_creacion: string;
  email: string | null;
  titulo: string | null;
  coordinacion_id: string | null;
  coordinacion_codigo: string | null;
  coordinacion_nombre: string | null;
  ejecutivo_id: string | null;
  ejecutivo_nombre: string | null;
  ejecutivo_email: string | null;
  fecha_ultimo_mensaje: string;
  mensajes_totales: number;
  mensajes_no_leidos: number;
  ultimo_mensaje_preview: string | null;
  llamada_activa_id: string | null;
  tiene_llamada_activa: boolean;
}

// Interfaz para datos complementarios (de System UI)
export interface ComplementaryData {
  botPauseStatus: Map<string, {
    isPaused: boolean;
    pausedUntil: Date | null;
    pausedBy: string;
    duration: number | null;
  }>;
  labels: Record<string, ConversationLabel[]>;
}

// Parámetros de filtro
export interface ConversationFilters {
  userId?: string;
  isAdmin?: boolean;
  ejecutivoIds?: string[];
  coordinacionIds?: string[];
  limit?: number;
  offset?: number;
}

class OptimizedConversationsService {
  /**
   * Carga conversaciones desde la vista materializada con filtros de permisos
   */
  async loadConversations(filters: ConversationFilters): Promise<DashboardConversation[]> {
    try {
      const { data, error } = await analysisSupabase.rpc('get_dashboard_conversations', {
        p_user_id: filters.userId || null,
        p_is_admin: filters.isAdmin || false,
        p_ejecutivo_ids: filters.ejecutivoIds && filters.ejecutivoIds.length > 0 
          ? filters.ejecutivoIds 
          : null,
        p_coordinacion_ids: filters.coordinacionIds && filters.coordinacionIds.length > 0 
          ? filters.coordinacionIds 
          : null,
        p_limit: filters.limit || 200,
        p_offset: filters.offset || 0,
      });

      if (error) {
        console.error('❌ [OptimizedConversations] Error loading conversations:', error);
        throw error;
      }

      return (data || []) as DashboardConversation[];
    } catch (error) {
      console.error('❌ [OptimizedConversations] Exception:', error);
      throw error;
    }
  }

  /**
   * Carga datos complementarios de System UI (bot pause status y labels)
   */
  async loadComplementaryData(prospectoIds: string[], userId: string): Promise<ComplementaryData> {
    const [activePauses, labelsData] = await Promise.all([
      // Cargar estados de pausa activos
      botPauseService.getAllActivePauses().catch(() => []),
      // Cargar etiquetas para los prospectos
      prospectoIds.length > 0
        ? whatsappLabelsService.getBatchProspectoLabels(prospectoIds, userId).catch(() => ({}))
        : Promise.resolve({} as Record<string, ConversationLabel[]>),
    ]);

    // Convertir pauses a Map
    const botPauseMap = new Map<string, {
      isPaused: boolean;
      pausedUntil: Date | null;
      pausedBy: string;
      duration: number | null;
    }>();

    activePauses.forEach((pause) => {
      botPauseMap.set(pause.uchat_id, {
        isPaused: pause.is_paused,
        pausedUntil: pause.paused_until ? new Date(pause.paused_until) : null,
        pausedBy: pause.paused_by,
        duration: pause.duration_minutes,
      });
    });

    return {
      botPauseStatus: botPauseMap,
      labels: labelsData,
    };
  }

  /**
   * Obtiene el conteo total de conversaciones según permisos
   */
  async getConversationsCount(filters: ConversationFilters): Promise<number> {
    try {
      // Si es admin, contar todo
      if (filters.isAdmin) {
        const { data, error } = await analysisSupabase.rpc('get_conversations_count');
        if (error) throw error;
        return data || 0;
      }

      // Para otros roles, hacer conteo filtrado
      // Por ahora usar el RPC estándar, luego optimizar con RPC específico
      const { data, error } = await analysisSupabase.rpc('get_conversations_count');
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('❌ [OptimizedConversations] Error counting:', error);
      return 0;
    }
  }

  /**
   * Refresca la vista materializada (solo para admins)
   */
  async refreshView(): Promise<boolean> {
    try {
      const { error } = await analysisSupabase.rpc('exec_sql', {
        sql_query: 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard'
      });

      if (error) {
        console.error('❌ [OptimizedConversations] Error refreshing view:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [OptimizedConversations] Exception refreshing view:', error);
      return false;
    }
  }

  /**
   * Convierte DashboardConversation al formato Conversation usado en el componente
   */
  convertToConversationFormat(conv: DashboardConversation): any {
    return {
      id: conv.prospecto_id,
      prospecto_id: conv.prospecto_id,
      conversation_id: conv.id_uchat, // ID de UChat para API
      customer_name: conv.nombre_contacto || conv.nombre_whatsapp || conv.numero_telefono || 'Sin nombre',
      customer_phone: conv.numero_telefono,
      numero_telefono: conv.numero_telefono,
      status: 'active',
      last_message_at: conv.fecha_ultimo_mensaje,
      updated_at: conv.fecha_ultimo_mensaje,
      message_count: conv.mensajes_totales,
      unread_count: conv.mensajes_no_leidos,
      mensajes_no_leidos: conv.mensajes_no_leidos,
      id_uchat: conv.id_uchat,
      metadata: {
        prospect_id: conv.prospecto_id,
        id_uchat: conv.id_uchat,
        id_dynamics: conv.id_dynamics,
        etapa: conv.etapa,
        etapa_id: conv.etapa_id, // ✅ AGREGADO: FK a tabla etapas
        coordinacion_id: conv.coordinacion_id,
        coordinacion_codigo: conv.coordinacion_codigo,
        coordinacion_nombre: conv.coordinacion_nombre,
        ejecutivo_id: conv.ejecutivo_id,
        ejecutivo_nombre: conv.ejecutivo_nombre,
        ejecutivo_email: conv.ejecutivo_email,
      },
    };
  }

  /**
   * Crea el Map de prospectosData desde las conversaciones
   */
  buildProspectosDataMap(conversations: DashboardConversation[]): Map<string, any> {
    const map = new Map<string, any>();
    
    conversations.forEach(conv => {
      map.set(conv.prospecto_id, {
        coordinacion_id: conv.coordinacion_id,
        ejecutivo_id: conv.ejecutivo_id,
        id_dynamics: conv.id_dynamics,
        nombre_completo: conv.nombre_contacto,
        nombre_whatsapp: conv.nombre_whatsapp,
        titulo: conv.titulo,
        email: conv.email,
        whatsapp: conv.whatsapp_raw,
        requiere_atencion_humana: conv.requiere_atencion_humana,
        motivo_handoff: conv.motivo_handoff,
        etapa: conv.etapa,
        etapa_id: conv.etapa_id, // ✅ AGREGADO: FK a tabla etapas
      });
    });

    return map;
  }

  /**
   * Crea el Set de prospectos con llamadas activas
   */
  buildActiveCallsSet(conversations: DashboardConversation[]): Set<string> {
    const set = new Set<string>();
    
    conversations.forEach(conv => {
      if (conv.tiene_llamada_activa) {
        set.add(conv.prospecto_id);
      }
    });

    return set;
  }
}

export const optimizedConversationsService = new OptimizedConversationsService();
export default optimizedConversationsService;
