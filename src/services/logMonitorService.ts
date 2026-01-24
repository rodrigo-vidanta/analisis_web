/**
 * ============================================
 * SERVICIO DE GESTIÓN DE LOGS - LOG MONITOR
 * ============================================
 * 
 * Servicio para gestionar logs de errores desde el dashboard:
 * - Obtener logs con filtros avanzados
 * - Marcar como leído/no leído
 * - Añadir anotaciones y etiquetas
 * - Análisis de IA a demanda
 * - Estadísticas y contadores
 */

import {
  supabaseLogMonitor,
  type ErrorLog,
  type UIErrorLogStatus,
  type UIErrorLogAnnotation,
  type UIErrorLogTag,
  type UIErrorLogAIAnalysis,
  type ErrorSeverity,
  type ErrorType,
  type ErrorSubtype,
  type EnvironmentType
} from '../config/supabaseLogMonitor';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';
// SEGURIDAD: Cliente seguro que usa Edge Function cuando service_key no está disponible
import { logMonitorSecureClient } from './logMonitorSecureClient';

// URL del proxy Edge Function para análisis de IA (evita problemas de CORS)
// Proyecto: Log Monitor (dffuwdzybhypxfzrmdcz)
const AI_ANALYSIS_PROXY_URL = import.meta.env.VITE_LOGMONITOR_PROXY_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_LOGMONITOR_SUPABASE_ANON_KEY || '';

export interface LogFilters {
  severity?: ErrorSeverity[];
  tipo?: ErrorType[];
  subtipo?: ErrorSubtype[];
  ambiente?: EnvironmentType[];
  is_read?: boolean;
  is_archived?: boolean;
  priority?: ('low' | 'medium' | 'high' | 'critical')[];
  search?: string; // Búsqueda en mensaje, descripción, etc.
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  tags?: string[]; // Nombres de etiquetas
  has_ai_analysis?: boolean;
}

export interface LogStats {
  total: number;
  unread: number;
  archived: number;
  by_severity: Record<ErrorSeverity, number>;
  by_tipo: Record<ErrorType, number>;
  by_ambiente: Record<EnvironmentType, number>;
  by_priority: Record<'low' | 'medium' | 'high' | 'critical', number>;
  recent_errors: number; // Últimas 24 horas
}

export interface AIAnalysisRequest {
  error_log_id: string;
  include_suggested_fix?: boolean;
}

class LogMonitorService {
  /**
   * Verificar si el cliente de LogMonitor está disponible
   * Ahora siempre retorna true porque tenemos el cliente seguro como fallback
   */
  private isClientAvailable(): boolean {
    // Cliente local disponible O cliente seguro (Edge Function) disponible
    return logMonitorSecureClient.isAvailable();
  }

  /**
   * Obtener el cliente apropiado (siempre seguro en producción)
   */
  private getClient() {
    // Usar cliente seguro (Edge Function) que maneja el proxy automáticamente
    return logMonitorSecureClient;
  }

  /**
   * Obtener logs con filtros avanzados
   */
  async getLogs(
    filters: LogFilters = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'timestamp' | 'severity' | 'priority';
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<{ data: ErrorLog[]; count: number }> {
    try {
      // Verificar disponibilidad del cliente
      if (!this.isClientAvailable()) {
        console.warn('⚠️ LogMonitorService: Cliente no disponible - credenciales no configuradas');
        return { data: [], count: 0 };
      }

      const {
        limit = 50,
        offset = 0,
        orderBy = 'timestamp',
        orderDirection = 'desc'
      } = options;

      // Construir query base - usar admin client para evitar problemas de RLS con tablas UI
      let query = this.getClient()
        .from('error_log')
        .select(`
          *,
          ui_error_log_status (
            is_read,
            read_at,
            read_by,
            is_archived,
            archived_at,
            priority
          ),
          ui_error_log_tags (tag_name),
          ui_error_log_annotations (id),
          ui_error_log_ai_analysis (id, status)
        `, { count: 'exact' });

      // Aplicar filtros
      if (filters.severity && filters.severity.length > 0) {
        query = query.in('severidad', filters.severity);
      }

      if (filters.tipo && filters.tipo.length > 0) {
        query = query.in('tipo', filters.tipo);
      }

      if (filters.subtipo && filters.subtipo.length > 0) {
        query = query.in('subtipo', filters.subtipo);
      }

      if (filters.ambiente && filters.ambiente.length > 0) {
        query = query.in('ambiente', filters.ambiente);
      }

      // Nota: Los filtros de UI se aplicarán después de obtener los datos
      // porque requieren join con tablas relacionadas

      if (filters.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }

      // Búsqueda de texto (en mensaje JSONB y descripción)
      if (filters.search) {
        query = query.or(`descripcion.ilike.%${filters.search}%`);
        // La búsqueda en JSONB se hará después en el código
      }

      // Ordenar
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Paginación
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching logs:', error);
        throw error;
      }

      // Obtener tickets asociados a los logs (query separada a PQNC_AI)
      const logIds = (data || []).map((log: any) => log.id);
      let ticketsMap = new Map();
      
      if (logIds.length > 0) {
        try {
          // Procesar en lotes de 100 para evitar URLs demasiado largas
          const batchSize = 100;
          for (let i = 0; i < logIds.length; i += batchSize) {
            const batch = logIds.slice(i, i + batchSize);
            const { data: tickets } = await analysisSupabase
              .from('support_tickets')
              .select('log_id, id, ticket_number, status')
              .in('log_id', batch);
            
            if (tickets) {
              tickets.forEach((ticket: any) => {
                ticketsMap.set(ticket.log_id, ticket);
              });
            }
          }
        } catch (ticketError) {
          console.error('Error fetching tickets:', ticketError);
          // No lanzar error, solo log - los logs se pueden mostrar sin tickets
        }
      }

      // Procesar y filtrar datos
      let processedLogs = (data || []).map((log: any) => {
        const uiStatus = Array.isArray(log.ui_error_log_status) 
          ? log.ui_error_log_status[0] 
          : log.ui_error_log_status;
        
        const tags = Array.isArray(log.ui_error_log_tags) 
          ? log.ui_error_log_tags 
          : [];
        
        const hasAnalysis = Array.isArray(log.ui_error_log_ai_analysis) 
          ? log.ui_error_log_ai_analysis.some((a: any) => a.status === 'completed')
          : false;

        // Información del ticket (desde el map)
        const ticketInfo = ticketsMap.get(log.id);

        return {
          ...log,
          ui_is_read: uiStatus?.is_read || false,
          ui_is_archived: uiStatus?.is_archived || false,
          ui_priority: uiStatus?.priority || 'medium',
          ui_tags: tags,
          has_ai_analysis: hasAnalysis,
          has_ticket: !!ticketInfo,
          ticket_id: ticketInfo?.id,
          ticket_number: ticketInfo?.ticket_number,
          ticket_status: ticketInfo?.status
        };
      });

      // Aplicar filtros de UI
      if (filters.is_read !== undefined) {
        processedLogs = processedLogs.filter((log: any) => log.ui_is_read === filters.is_read);
      }

      if (filters.is_archived !== undefined) {
        processedLogs = processedLogs.filter((log: any) => log.ui_is_archived === filters.is_archived);
      }

      if (filters.priority && filters.priority.length > 0) {
        processedLogs = processedLogs.filter((log: any) => 
          filters.priority!.includes(log.ui_priority)
        );
      }

      if (filters.has_ai_analysis !== undefined) {
        processedLogs = processedLogs.filter((log: any) => 
          log.has_ai_analysis === filters.has_ai_analysis
        );
      }

      // Filtro por etiquetas
      if (filters.tags && filters.tags.length > 0) {
        processedLogs = processedLogs.filter((log: any) => {
          const logTags = log.ui_tags || [];
          return filters.tags!.some(tagName => 
            logTags.some((tag: any) => tag.tag_name === tagName)
          );
        });
      }

      // Búsqueda en mensaje JSONB
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        processedLogs = processedLogs.filter((log: any) => {
          const mensajeStr = typeof log.mensaje === 'string' 
            ? log.mensaje 
            : JSON.stringify(log.mensaje);
          return mensajeStr.toLowerCase().includes(searchLower) ||
                 (log.descripcion && log.descripcion.toLowerCase().includes(searchLower));
        });
      }

      // Aplicar paginación después de filtros
      const paginatedLogs = processedLogs.slice(offset, offset + limit);

      return {
        data: paginatedLogs as ErrorLog[],
        count: processedLogs.length // Contar después de filtros
      };
    } catch (error) {
      console.error('Error in getLogs:', error);
      throw error;
    }
  }

  /**
   * Obtener un log específico por ID
   */
  async getLogById(logId: string): Promise<ErrorLog | null> {
    try {
      const { data, error } = await supabaseLogMonitor
        .from('error_log')
        .select('*')
        .eq('id', logId)
        .single();

      if (error) {
        console.error('Error fetching log:', error);
        return null;
      }

      return data as ErrorLog;
    } catch (error) {
      console.error('Error in getLogById:', error);
      return null;
    }
  }

  /**
   * Marcar log como leído
   */
  async markAsRead(logId: string, userId: string): Promise<boolean> {
    try {
      // Verificar si ya existe un registro de estado (usar maybeSingle para evitar errores si no existe)
      const { data: existingStatus, error: checkError } = await this.getClient()
        .from('ui_error_log_status')
        .select('id')
        .eq('error_log_id', logId)
        .maybeSingle();

      // Si hay error y no es porque no existe, retornar false
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking read status:', checkError);
        return false;
      }

      if (existingStatus) {
        // Actualizar existente
        const { error } = await this.getClient()
          .from('ui_error_log_status')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
            read_by: userId,
            updated_at: new Date().toISOString()
          })
          .eq('error_log_id', logId);

        if (error) {
          console.error('Error updating read status:', error);
          return false;
        }
      } else {
        // Crear nuevo registro
        const { error } = await this.getClient()
          .from('ui_error_log_status')
          .insert({
            error_log_id: logId,
            is_read: true,
            read_at: new Date().toISOString(),
            read_by: userId
          });

        if (error) {
          console.error('Error creating read status:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar múltiples logs como leídos
   */
  async markMultipleAsRead(logIds: string[], userId: string): Promise<boolean> {
    try {
      const updates = logIds.map(logId => ({
        error_log_id: logId,
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: userId,
        updated_at: new Date().toISOString()
      }));

      // Usar upsert para crear o actualizar
      const { error } = await this.getClient()
        .from('ui_error_log_status')
        .upsert(updates, {
          onConflict: 'error_log_id'
        });

      if (error) {
        console.error('Error marking multiple as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markMultipleAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar log como no leído
   */
  async markAsUnread(logId: string): Promise<boolean> {
    try {
      const { error } = await this.getClient()
        .from('ui_error_log_status')
        .update({
          is_read: false,
          read_at: null,
          read_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('error_log_id', logId);

      if (error) {
        console.error('Error marking as unread:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsUnread:', error);
      return false;
    }
  }

  /**
   * Archivar/desarchivar log
   */
  async toggleArchive(logId: string, userId: string, archive: boolean): Promise<boolean> {
    try {
      const updateData: any = {
        is_archived: archive,
        updated_at: new Date().toISOString()
      };

      if (archive) {
        updateData.archived_at = new Date().toISOString();
        updateData.archived_by = userId;
      } else {
        updateData.archived_at = null;
        updateData.archived_by = null;
      }

      // Verificar si existe registro (usar maybeSingle para evitar errores si no existe)
      const { data: existingStatus, error: checkError } = await this.getClient()
        .from('ui_error_log_status')
        .select('id')
        .eq('error_log_id', logId)
        .maybeSingle();

      // Si hay error y no es porque no existe, retornar false
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking archive status:', checkError);
        return false;
      }

      if (existingStatus) {
        const { error } = await this.getClient()
          .from('ui_error_log_status')
          .update(updateData)
          .eq('error_log_id', logId);

        if (error) {
          console.error('Error updating archive status:', error);
          return false;
        }
      } else {
        const { error } = await this.getClient()
          .from('ui_error_log_status')
          .insert({
            error_log_id: logId,
            ...updateData
          });

        if (error) {
          console.error('Error creating archive status:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in toggleArchive:', error);
      return false;
    }
  }

  /**
   * Actualizar prioridad de un log
   */
  async updatePriority(logId: string, priority: 'low' | 'medium' | 'high' | 'critical'): Promise<boolean> {
    try {
      // Verificar si existe registro (usar maybeSingle para evitar errores si no existe)
      const { data: existingStatus, error: checkError } = await this.getClient()
        .from('ui_error_log_status')
        .select('id')
        .eq('error_log_id', logId)
        .maybeSingle();

      // Si hay error y no es porque no existe, retornar false
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking priority status:', checkError);
        return false;
      }

      if (existingStatus) {
        const { error } = await this.getClient()
          .from('ui_error_log_status')
          .update({
            priority,
            updated_at: new Date().toISOString()
          })
          .eq('error_log_id', logId);

        if (error) {
          console.error('Error updating priority:', error);
          return false;
        }
      } else {
        const { error } = await this.getClient()
          .from('ui_error_log_status')
          .insert({
            error_log_id: logId,
            priority
          });

        if (error) {
          console.error('Error creating priority status:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in updatePriority:', error);
      return false;
    }
  }

  /**
   * Añadir anotación a un log
   */
  async addAnnotation(logId: string, annotationText: string, userId: string): Promise<UIErrorLogAnnotation | null> {
    try {
      const { data, error } = await this.getClient()
        .from('ui_error_log_annotations')
        .insert({
          error_log_id: logId,
          annotation_text: annotationText,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding annotation:', error);
        return null;
      }

      return data as UIErrorLogAnnotation;
    } catch (error) {
      console.error('Error in addAnnotation:', error);
      return null;
    }
  }

  /**
   * Obtener anotaciones de un log
   */
  async getAnnotations(logId: string): Promise<UIErrorLogAnnotation[]> {
    try {
      // Usar cliente apropiado (seguro en producción)
      // Incluir created_by en el select (ya debería estar incluido con *)
      const { data, error } = await this.getClient()
        .from('ui_error_log_annotations')
        .select('id, error_log_id, annotation_text, created_by, created_at, updated_at')
        .eq('error_log_id', logId)
        .order('created_at', { ascending: false });

      if (error) {
        // Si es 406 o PGRST116, simplemente retornar array vacío (tabla puede no existir aún)
        if (error.code === 'PGRST116' || error.status === 406) {
          return [];
        }
        console.error('Error fetching annotations:', error);
        return [];
      }

      return (data || []) as UIErrorLogAnnotation[];
    } catch (error) {
      console.error('Error in getAnnotations:', error);
      return [];
    }
  }

  /**
   * Eliminar anotación
   */
  async deleteAnnotation(annotationId: string): Promise<boolean> {
    try {
      const { error } = await this.getClient()
        .from('ui_error_log_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) {
        console.error('Error deleting annotation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAnnotation:', error);
      return false;
    }
  }

  /**
   * Añadir etiqueta a un log
   */
  async addTag(logId: string, tagName: string, tagColor: string | null, userId: string): Promise<UIErrorLogTag | null> {
    try {
      const { data, error } = await this.getClient()
        .from('ui_error_log_tags')
        .insert({
          error_log_id: logId,
          tag_name: tagName,
          tag_color: tagColor,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding tag:', error);
        return null;
      }

      return data as UIErrorLogTag;
    } catch (error) {
      console.error('Error in addTag:', error);
      return null;
    }
  }

  /**
   * Obtener etiquetas de un log
   */
  async getTags(logId: string): Promise<UIErrorLogTag[]> {
    try {
      // Usar cliente apropiado (seguro en producción)
      const { data, error } = await this.getClient()
        .from('ui_error_log_tags')
        .select('*')
        .eq('error_log_id', logId)
        .order('created_at', { ascending: false });

      if (error) {
        // Si es 406 o PGRST116, simplemente retornar array vacío (tabla puede no existir aún)
        if (error.code === 'PGRST116' || error.status === 406) {
          return [];
        }
        console.error('Error fetching tags:', error);
        return [];
      }

      return (data || []) as UIErrorLogTag[];
    } catch (error) {
      console.error('Error in getTags:', error);
      return [];
    }
  }

  /**
   * Obtener todas las etiquetas únicas disponibles
   */
  async getAllAvailableTags(): Promise<string[]> {
    try {
      // Verificar disponibilidad del cliente
      if (!supabaseLogMonitor) {
        console.warn('⚠️ LogMonitorService: Cliente no disponible para getAllAvailableTags');
        return [];
      }

      const { data, error } = await supabaseLogMonitor
        .from('ui_error_log_tags')
        .select('tag_name')
        .order('tag_name', { ascending: true });

      if (error) {
        console.error('Error fetching all tags:', error);
        return [];
      }

      // Obtener valores únicos
      const uniqueTags = [...new Set((data || []).map((tag: any) => tag.tag_name))];
      return uniqueTags;
    } catch (error) {
      console.error('Error in getAllAvailableTags:', error);
      return [];
    }
  }

  /**
   * Eliminar etiqueta
   */
  async removeTag(tagId: string): Promise<boolean> {
    try {
      const { error } = await this.getClient()
        .from('ui_error_log_tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        console.error('Error removing tag:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeTag:', error);
      return false;
    }
  }

  /**
   * Solicitar análisis de IA para un log
   * Retorna el análisis recibido del webhook SIN guardarlo en BD
   * El frontend debe llamar a saveAIAnalysis() para guardarlo manualmente
   * Crea un registro pendiente con requested_by para rastrear quién lo solicitó
   */
  async requestAIAnalysis(request: AIAnalysisRequest & { requested_by?: string }): Promise<{
    analysis: {
      analysis_text: string;
      analysis_summary: string;
      suggested_fix?: string | null;
    };
  } | null> {
    try {
      // Obtener el log completo
      const log = await this.getLogById(request.error_log_id);
      if (!log) {
        throw new Error('Log no encontrado');
      }

      // Cargar tags y anotaciones del log
      const [tags, annotations] = await Promise.all([
        this.getTags(request.error_log_id),
        this.getAnnotations(request.error_log_id)
      ]);

      // Crear registro pendiente con requested_by si se proporciona
      const analysisId = crypto.randomUUID();
      if (request.requested_by) {
        try {
          // Verificar si ya existe un análisis para este error_log_id
          const { data: existingAnalysis } = await this.getClient()
            .from('ui_error_log_ai_analysis')
            .select('*')
            .eq('error_log_id', request.error_log_id)
            .maybeSingle();

          if (existingAnalysis) {
            // Actualizar el registro existente
            await this.getClient()
              .from('ui_error_log_ai_analysis')
              .update({
                requested_by: request.requested_by,
                status: 'pending',
                created_at: new Date().toISOString()
              })
              .eq('id', existingAnalysis.id);
          } else {
            // Crear nuevo registro pendiente
            await this.getClient()
              .from('ui_error_log_ai_analysis')
              .insert({
                error_log_id: request.error_log_id,
                requested_by: request.requested_by,
                analysis_text: '',
                analysis_summary: '',
                status: 'pending',
                confidence_score: 0,
                tokens_used: 0,
                model_used: 'webhook'
              });
          }
        } catch (error) {
          console.warn('Error creando registro pendiente de análisis:', error);
          // Continuar aunque falle, no es crítico
        }
      }

      // Preparar payload para el webhook
      const webhookPayload = {
        analysis_id: analysisId,
        error_log: {
          id: log.id,
          tipo: log.tipo,
          subtipo: log.subtipo,
          severidad: log.severidad,
          ambiente: log.ambiente,
          timestamp: log.timestamp,
          mensaje: typeof log.mensaje === 'string' ? log.mensaje : JSON.stringify(log.mensaje),
          descripcion: log.descripcion || null,
          workflow_id: log.workflow_id || null,
          execution_id: log.execution_id || null,
          prospecto_id: log.prospecto_id || null,
          subcategoria: (log as any).subcategoria || null
        },
        tags: tags.map(tag => ({
          id: tag.id,
          tag_name: tag.tag_name,
          created_at: tag.created_at,
          created_by: tag.created_by
        })),
        annotations: annotations.map(ann => ({
          id: ann.id,
          annotation_text: ann.annotation_text,
          created_at: ann.created_at,
          created_by: ann.created_by,
          updated_at: ann.updated_at
        })),
        include_suggested_fix: request.include_suggested_fix || false,
        requested_at: new Date().toISOString()
      };

      // Llamar al webhook a través del proxy Edge Function (evita CORS)
      try {
        const response = await fetch(AI_ANALYSIS_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(webhookPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Webhook error: ${response.status} - ${errorText}`);
        }

        const webhookResponse = await response.json();

        if (!webhookResponse.success) {
          throw new Error(webhookResponse.error?.message || 'Error en el análisis del webhook');
        }

        // Retornar solo el análisis recibido (formato mínimo)
        // El frontend decidirá si guardarlo o no
        return {
          analysis: {
            analysis_text: webhookResponse.analysis?.analysis_text || '',
            analysis_summary: webhookResponse.analysis?.analysis_summary || '',
            suggested_fix: webhookResponse.analysis?.suggested_fix || null
          }
        };
      } catch (apiError) {
        throw apiError;
      }
    } catch (error) {
      console.error('Error in requestAIAnalysis:', error);
      return null;
    }
  }

  /**
   * Guardar análisis de IA en la base de datos
   * Se llama manualmente desde el frontend después de recibir el análisis del webhook
   * @param userId - ID del usuario que guarda el análisis (opcional, se usa requested_by si existe)
   */
  async saveAIAnalysis(
    errorLogId: string,
    analysis: {
      analysis_text: string;
      analysis_summary: string;
      suggested_fix?: string | null;
    },
    userId?: string
  ): Promise<UIErrorLogAIAnalysis | null> {
    try {
      // Verificar si ya existe un análisis para este error_log_id
      const { data: existingAnalysis } = await this.getClient()
        .from('ui_error_log_ai_analysis')
        .select('*')
        .eq('error_log_id', errorLogId)
        .maybeSingle();

      if (existingAnalysis) {
        // Si ya existe un análisis (completado o pendiente), actualizarlo
        const updateData: any = {
          analysis_text: analysis.analysis_text,
          analysis_summary: analysis.analysis_summary,
          suggested_fix: analysis.suggested_fix || null,
          confidence_score: 50, // Valor por defecto
          tokens_used: 0,
          model_used: 'webhook',
          status: 'completed',
          completed_at: new Date().toISOString()
        };
        
        // Si no tiene requested_by y se proporciona userId, agregarlo
        if (!existingAnalysis.requested_by && userId) {
          updateData.requested_by = userId;
        }
        
        const { data: updated, error: updateError } = await this.getClient()
          .from('ui_error_log_ai_analysis')
          .update(updateData)
          .eq('id', existingAnalysis.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating analysis:', updateError);
          return null;
        }

        return updated as UIErrorLogAIAnalysis;
      } else {
        // Crear nuevo registro
        const insertData: any = {
          error_log_id: errorLogId,
          analysis_text: analysis.analysis_text,
          analysis_summary: analysis.analysis_summary,
          suggested_fix: analysis.suggested_fix || null,
          confidence_score: 50, // Valor por defecto
          tokens_used: 0,
          model_used: 'webhook',
          status: 'completed',
          completed_at: new Date().toISOString()
        };
        
        // Si existe un registro pendiente con requested_by, usarlo
        if (existingAnalysis?.requested_by) {
          insertData.requested_by = existingAnalysis.requested_by;
        } else if (userId) {
          insertData.requested_by = userId;
        }
        
        const { data: newRecord, error: insertError } = await this.getClient()
          .from('ui_error_log_ai_analysis')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Error saving analysis:', insertError);
          return null;
        }

        return newRecord as UIErrorLogAIAnalysis;
      }
    } catch (error) {
      console.error('Error in saveAIAnalysis:', error);
      return null;
    }
  }

  /**
   * Obtener análisis de IA de un log
   */
  async getAIAnalysis(logId: string): Promise<UIErrorLogAIAnalysis | null> {
    try {
      // Usar cliente apropiado (seguro en producción)
      // Usar maybeSingle para evitar errores cuando no hay análisis
      // Incluir requested_by en el select
      const { data, error } = await this.getClient()
        .from('ui_error_log_ai_analysis')
        .select('*, requested_by')
        .eq('error_log_id', logId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Si es 406, PGRST116 o no hay datos, retornar null
        if (error.code === 'PGRST116' || error.status === 406) {
          return null;
        }
        console.error('Error fetching AI analysis:', error);
        return null;
      }

      return data as UIErrorLogAIAnalysis | null;
    } catch (error) {
      console.error('Error in getAIAnalysis:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de logs
   */
  async getStats(filters?: LogFilters): Promise<LogStats> {
    try {
      // Verificar disponibilidad del cliente
      if (!this.isClientAvailable()) {
        console.warn('⚠️ LogMonitorService: Cliente no disponible - credenciales no configuradas');
        return {
          total: 0,
          unread: 0,
          archived: 0,
          by_severity: { baja: 0, media: 0, alta: 0, critica: 0 },
          by_tipo: { mensaje: 0, llamada: 0, ui: 0 },
          by_ambiente: { desarrollo: 0, produccion: 0, preproduccion: 0 },
          by_priority: { low: 0, medium: 0, high: 0, critical: 0 },
          recent_errors: 0
        };
      }

      // Obtener todos los logs con estado UI (usar admin client para evitar problemas de RLS)
      let query = this.getClient()
        .from('error_log')
        .select(`
          *,
          ui_error_log_status (
            is_read,
            is_archived,
            priority
          )
        `);

      // Aplicar filtros de tiempo si están presentes
      if (filters?.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }

      // Aplicar otros filtros básicos si están presentes
      if (filters?.severity && filters.severity.length > 0) {
        query = query.in('severidad', filters.severity);
      }

      if (filters?.tipo && filters.tipo.length > 0) {
        query = query.in('tipo', filters.tipo);
      }

      if (filters?.subtipo && filters.subtipo.length > 0) {
        query = query.in('subtipo', filters.subtipo);
      }

      if (filters?.ambiente && filters.ambiente.length > 0) {
        query = query.in('ambiente', filters.ambiente);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Error fetching stats:', error);
        throw error;
      }

      const logsData = (logs || []).map((log: any) => {
        const uiStatus = Array.isArray(log.ui_error_log_status) 
          ? log.ui_error_log_status[0] 
          : log.ui_error_log_status;
        return {
          ...log,
          ui_is_read: uiStatus?.is_read || false,
          ui_is_archived: uiStatus?.is_archived || false,
          ui_priority: uiStatus?.priority || 'medium'
        };
      }) as any[];

      // Calcular estadísticas
      const stats: LogStats = {
        total: logsData.length,
        unread: logsData.filter(l => !l.ui_is_read).length,
        archived: logsData.filter(l => l.ui_is_archived).length,
        by_severity: {
          baja: 0,
          media: 0,
          alta: 0,
          critica: 0
        },
        by_tipo: {
          mensaje: 0,
          llamada: 0,
          ui: 0
        },
        by_ambiente: {
          desarrollo: 0,
          produccion: 0,
          preproduccion: 0
        },
        by_priority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        recent_errors: 0
      };

      // Calcular fecha de referencia para errores recientes
      // Si hay filtro de tiempo, usar el rango del filtro, sino últimos 24 horas
      let recentErrorsStartDate: Date;
      if (filters?.date_from) {
        recentErrorsStartDate = new Date(filters.date_from);
      } else {
        recentErrorsStartDate = new Date();
        recentErrorsStartDate.setHours(recentErrorsStartDate.getHours() - 24);
      }

      logsData.forEach(log => {
        // Severidad
        if (log.severidad) {
          stats.by_severity[log.severidad as ErrorSeverity] = (stats.by_severity[log.severidad as ErrorSeverity] || 0) + 1;
        }

        // Tipo
        if (log.tipo) {
          stats.by_tipo[log.tipo as ErrorType] = (stats.by_tipo[log.tipo as ErrorType] || 0) + 1;
        }

        // Ambiente
        if (log.ambiente) {
          stats.by_ambiente[log.ambiente as EnvironmentType] = (stats.by_ambiente[log.ambiente as EnvironmentType] || 0) + 1;
        }

        // Prioridad
        if (log.ui_priority) {
          stats.by_priority[log.ui_priority as 'low' | 'medium' | 'high' | 'critical'] = 
            (stats.by_priority[log.ui_priority as 'low' | 'medium' | 'high' | 'critical'] || 0) + 1;
        }

        // Errores recientes (dentro del rango de tiempo seleccionado o últimos 24h)
        const logDate = new Date(log.timestamp);
        if (logDate >= recentErrorsStartDate) {
          stats.recent_errors++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error in getStats:', error);
      throw error;
    }
  }

  /**
   * Obtener información de usuario desde System UI
   */
  async getUserInfo(userId: string): Promise<{ full_name?: string; email?: string } | null> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user info:', error);
        return null;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error in getUserInfo:', error);
      return null;
    }
  }

  /**
   * Obtener logs donde el usuario ha comentado
   */
  async getLogsWithUserAnnotations(userId: string, filters?: LogFilters): Promise<{ data: ErrorLog[]; count: number }> {
    try {
      // Obtener IDs de logs donde el usuario ha comentado
      const { data: annotationLogIds, error: annotationError } = await this.getClient()
        .from('ui_error_log_annotations')
        .select('error_log_id')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (annotationError) {
        console.error('Error fetching annotation log IDs:', annotationError);
        return { data: [], count: 0 };
      }

      const logIds = [...new Set((annotationLogIds || []).map(a => a.error_log_id))];
      
      if (logIds.length === 0) {
        return { data: [], count: 0 };
      }

      // Obtener los logs directamente por IDs usando cliente apropiado
      const { data: logsData, error: logsError } = await this.getClient()
        .from('error_log')
        .select(`
          *,
          ui_error_log_status (
            is_read,
            read_at,
            read_by,
            is_archived,
            archived_at,
            priority
          ),
          ui_error_log_tags (tag_name),
          ui_error_log_annotations (id),
          ui_error_log_ai_analysis (id, status)
        `)
        .in('id', logIds)
        .order('timestamp', { ascending: false });

      if (logsError) {
        console.error('Error fetching logs:', logsError);
        return { data: [], count: 0 };
      }

      // Procesar logs similar a getLogs
      const processedLogs = (logsData || []).map((log: any) => {
        const uiStatus = Array.isArray(log.ui_error_log_status) 
          ? log.ui_error_log_status[0] 
          : log.ui_error_log_status;
        
        const tags = Array.isArray(log.ui_error_log_tags) 
          ? log.ui_error_log_tags 
          : [];
        
        const annotations = Array.isArray(log.ui_error_log_annotations)
          ? log.ui_error_log_annotations
          : [];
        
        const hasAnalysis = Array.isArray(log.ui_error_log_ai_analysis) 
          ? log.ui_error_log_ai_analysis.some((a: any) => a.status === 'completed')
          : false;
        
        const hasAnnotations = annotations.length > 0;

        return {
          ...log,
          ui_is_read: uiStatus?.is_read || false,
          ui_is_archived: uiStatus?.is_archived || false,
          ui_priority: uiStatus?.priority || 'medium',
          ui_tags: tags,
          has_ai_analysis: hasAnalysis,
          has_annotations: hasAnnotations
        };
      });

      // Aplicar filtros adicionales si existen
      let filteredLogs = processedLogs;
      if (filters) {
        if (filters.severity && filters.severity.length > 0) {
          filteredLogs = filteredLogs.filter((log: any) => filters.severity!.includes(log.severidad));
        }
        if (filters.ambiente && filters.ambiente.length > 0) {
          filteredLogs = filteredLogs.filter((log: any) => filters.ambiente!.includes(log.ambiente));
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredLogs = filteredLogs.filter((log: any) => {
            const mensajeStr = typeof log.mensaje === 'string' 
              ? log.mensaje 
              : JSON.stringify(log.mensaje);
            return mensajeStr.toLowerCase().includes(searchLower) ||
                   (log.descripcion && log.descripcion.toLowerCase().includes(searchLower));
          });
        }
      }
      
      return {
        data: filteredLogs as ErrorLog[],
        count: filteredLogs.length
      };
    } catch (error) {
      console.error('Error in getLogsWithUserAnnotations:', error);
      return { data: [], count: 0 };
    }
  }

  /**
   * Obtener logs donde el usuario ha solicitado análisis de IA
   */
  async getLogsWithUserAIAnalysis(userId: string, filters?: LogFilters): Promise<{ data: ErrorLog[]; count: number }> {
    try {
      // Obtener IDs de logs donde el usuario ha solicitado análisis
      const { data: analysisLogIds, error: analysisError } = await this.getClient()
        .from('ui_error_log_ai_analysis')
        .select('error_log_id')
        .eq('requested_by', userId)
        .order('created_at', { ascending: false });

      if (analysisError) {
        console.error('Error fetching analysis log IDs:', analysisError);
        return { data: [], count: 0 };
      }

      const logIds = [...new Set((analysisLogIds || []).map(a => a.error_log_id))];
      
      if (logIds.length === 0) {
        return { data: [], count: 0 };
      }

      // Obtener los logs directamente por IDs usando cliente apropiado
      const { data: logsData, error: logsError } = await this.getClient()
        .from('error_log')
        .select(`
          *,
          ui_error_log_status (
            is_read,
            read_at,
            read_by,
            is_archived,
            archived_at,
            priority
          ),
          ui_error_log_tags (tag_name),
          ui_error_log_annotations (id),
          ui_error_log_ai_analysis (id, status)
        `)
        .in('id', logIds)
        .order('timestamp', { ascending: false });

      if (logsError) {
        console.error('Error fetching logs:', logsError);
        return { data: [], count: 0 };
      }

      // Procesar logs similar a getLogs
      const processedLogs = (logsData || []).map((log: any) => {
        const uiStatus = Array.isArray(log.ui_error_log_status) 
          ? log.ui_error_log_status[0] 
          : log.ui_error_log_status;
        
        const tags = Array.isArray(log.ui_error_log_tags) 
          ? log.ui_error_log_tags 
          : [];
        
        const annotations = Array.isArray(log.ui_error_log_annotations)
          ? log.ui_error_log_annotations
          : [];
        
        const hasAnalysis = Array.isArray(log.ui_error_log_ai_analysis) 
          ? log.ui_error_log_ai_analysis.some((a: any) => a.status === 'completed')
          : false;
        
        const hasAnnotations = annotations.length > 0;

        return {
          ...log,
          ui_is_read: uiStatus?.is_read || false,
          ui_is_archived: uiStatus?.is_archived || false,
          ui_priority: uiStatus?.priority || 'medium',
          ui_tags: tags,
          has_ai_analysis: hasAnalysis,
          has_annotations: hasAnnotations
        };
      });

      // Aplicar filtros adicionales si existen
      let filteredLogs = processedLogs;
      if (filters) {
        if (filters.severity && filters.severity.length > 0) {
          filteredLogs = filteredLogs.filter((log: any) => filters.severity!.includes(log.severidad));
        }
        if (filters.ambiente && filters.ambiente.length > 0) {
          filteredLogs = filteredLogs.filter((log: any) => filters.ambiente!.includes(log.ambiente));
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredLogs = filteredLogs.filter((log: any) => {
            const mensajeStr = typeof log.mensaje === 'string' 
              ? log.mensaje 
              : JSON.stringify(log.mensaje);
            return mensajeStr.toLowerCase().includes(searchLower) ||
                   (log.descripcion && log.descripcion.toLowerCase().includes(searchLower));
          });
        }
      }
      
      return {
        data: filteredLogs as ErrorLog[],
        count: filteredLogs.length
      };
    } catch (error) {
      console.error('Error in getLogsWithUserAIAnalysis:', error);
      return { data: [], count: 0 };
    }
  }

  /**
   * Construir prompt para análisis de IA
   */
  private buildAnalysisPrompt(log: ErrorLog, includeFix: boolean): string {
    const mensajeStr = typeof log.mensaje === 'string' ? log.mensaje : JSON.stringify(log.mensaje, null, 2);
    
    return `Analiza el siguiente error del sistema y proporciona un análisis detallado.

INFORMACIÓN DEL ERROR:
- Tipo: ${log.tipo}
- Subtipo: ${log.subtipo}
- Severidad: ${log.severidad}
- Ambiente: ${log.ambiente}
- Timestamp: ${log.timestamp}
- Descripción: ${log.descripcion || 'N/A'}
- Mensaje: ${mensajeStr}
${log.workflow_id ? `- Workflow ID: ${log.workflow_id}` : ''}
${log.execution_id ? `- Execution ID: ${log.execution_id}` : ''}
${log.prospecto_id ? `- Prospecto ID: ${log.prospecto_id}` : ''}

INSTRUCCIONES:
1. Proporciona un análisis completo del error (máximo 2000 tokens)
2. Incluye un resumen ejecutivo (máximo 200 tokens)
${includeFix ? '3. Sugiere una solución específica (máximo 500 tokens)' : ''}
4. Asigna un nivel de confianza del análisis (0-100)

FORMATO DE RESPUESTA (JSON):
{
  "analysis_text": "Análisis completo del error...",
  "analysis_summary": "Resumen ejecutivo...",
  ${includeFix ? '"suggested_fix": "Solución sugerida...",' : ''}
  "confidence_score": 85
}`;
  }

  /**
   * Parsear respuesta de IA
   */
  private parseAIAnalysis(content: string, includeFix: boolean): {
    analysis_text: string;
    analysis_summary: string;
    suggested_fix?: string;
    confidence_score: number;
  } {
    try {
      // Intentar parsear JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          analysis_text: parsed.analysis_text || content.substring(0, 2000),
          analysis_summary: parsed.analysis_summary || content.substring(0, 200),
          suggested_fix: includeFix ? (parsed.suggested_fix || null) : undefined,
          confidence_score: parsed.confidence_score || 50
        };
      }

      // Si no hay JSON, usar el contenido completo
      return {
        analysis_text: content.substring(0, 2000),
        analysis_summary: content.substring(0, 200),
        suggested_fix: includeFix ? content.substring(200, 700) : undefined,
        confidence_score: 50
      };
    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      return {
        analysis_text: content.substring(0, 2000),
        analysis_summary: content.substring(0, 200),
        confidence_score: 50
      };
    }
  }
}

export const logMonitorService = new LogMonitorService();
export default logMonitorService;

