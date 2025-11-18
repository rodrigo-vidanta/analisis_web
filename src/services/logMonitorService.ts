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
  supabaseLogMonitorAdmin,
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

// URL del proxy Edge Function para análisis de IA (evita problemas de CORS)
// Proyecto: Log Monitor (dffuwdzybhypxfzrmdcz)
const AI_ANALYSIS_PROXY_URL = 'https://dffuwdzybhypxfzrmdcz.supabase.co/functions/v1/error-analisis-proxy';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTgxNTksImV4cCI6MjA3NTQzNDE1OX0.dduh8ZV_vxWcC3u63DGjPG0U5DDjBpZTs3yjT3clkRc';

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
      const {
        limit = 50,
        offset = 0,
        orderBy = 'timestamp',
        orderDirection = 'desc'
      } = options;

      // Construir query base - usar admin client para evitar problemas de RLS con tablas UI
      let query = supabaseLogMonitorAdmin
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
          ui_error_log_ai_analysis (status)
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

        return {
          ...log,
          ui_is_read: uiStatus?.is_read || false,
          ui_is_archived: uiStatus?.is_archived || false,
          ui_priority: uiStatus?.priority || 'medium',
          ui_tags: tags,
          has_ai_analysis: hasAnalysis
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
      const { data: existingStatus, error: checkError } = await supabaseLogMonitorAdmin
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
        const { error } = await supabaseLogMonitorAdmin
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
        const { error } = await supabaseLogMonitorAdmin
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
      const { error } = await supabaseLogMonitorAdmin
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
      const { error } = await supabaseLogMonitorAdmin
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
      const { data: existingStatus, error: checkError } = await supabaseLogMonitorAdmin
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
        const { error } = await supabaseLogMonitorAdmin
          .from('ui_error_log_status')
          .update(updateData)
          .eq('error_log_id', logId);

        if (error) {
          console.error('Error updating archive status:', error);
          return false;
        }
      } else {
        const { error } = await supabaseLogMonitorAdmin
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
      const { data: existingStatus, error: checkError } = await supabaseLogMonitorAdmin
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
        const { error } = await supabaseLogMonitorAdmin
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
        const { error } = await supabaseLogMonitorAdmin
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
      const { data, error } = await supabaseLogMonitorAdmin
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
      // Usar admin client para evitar problemas de RLS
      const { data, error } = await supabaseLogMonitorAdmin
        .from('ui_error_log_annotations')
        .select('*')
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
      const { error } = await supabaseLogMonitorAdmin
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
      const { data, error } = await supabaseLogMonitorAdmin
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
      // Usar admin client para evitar problemas de RLS
      const { data, error } = await supabaseLogMonitorAdmin
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
      const { error } = await supabaseLogMonitorAdmin
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
   */
  async requestAIAnalysis(request: AIAnalysisRequest): Promise<UIErrorLogAIAnalysis | null> {
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

      // Verificar si ya existe un análisis para este error_log_id
      const { data: existingAnalysis, error: checkError } = await supabaseLogMonitorAdmin
        .from('ui_error_log_ai_analysis')
        .select('*')
        .eq('error_log_id', request.error_log_id)
        .maybeSingle();

      let analysisRecord: UIErrorLogAIAnalysis | null = null;

      if (existingAnalysis) {
        // Si ya existe un análisis completado, retornarlo
        if (existingAnalysis.status === 'completed') {
          console.log('Análisis ya existe y está completado, retornando análisis existente');
          return existingAnalysis as UIErrorLogAIAnalysis;
        }
        
        // Si está pendiente o fallido, usar el registro existente y actualizar su estado
        analysisRecord = existingAnalysis as UIErrorLogAIAnalysis;
        console.log('Análisis existente encontrado, reutilizando registro:', analysisRecord.id);
        
        // Actualizar a estado pendiente si estaba fallido
        if (analysisRecord.status === 'failed') {
          const { data: updated, error: updateError } = await supabaseLogMonitorAdmin
            .from('ui_error_log_ai_analysis')
            .update({
              status: 'pending',
              error_message: null
            })
            .eq('id', analysisRecord.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Error updating existing analysis:', updateError);
            return null;
          }
          
          analysisRecord = updated as UIErrorLogAIAnalysis;
        }
      } else {
        // Crear nuevo registro de análisis pendiente
        const { data: newRecord, error: insertError } = await supabaseLogMonitorAdmin
          .from('ui_error_log_ai_analysis')
          .insert({
            error_log_id: request.error_log_id,
            status: 'pending',
            analysis_text: '',
            analysis_summary: '',
            confidence_score: 0,
            tokens_used: 0,
            model_used: 'webhook'
          })
          .select()
          .single();

        if (insertError) {
          // Si el error es de duplicado, intentar obtener el registro existente
          if (insertError.code === '23505') {
            console.log('Registro duplicado detectado, obteniendo registro existente...');
            const { data: duplicateRecord } = await supabaseLogMonitorAdmin
              .from('ui_error_log_ai_analysis')
              .select('*')
              .eq('error_log_id', request.error_log_id)
              .single();
            
            if (duplicateRecord) {
              analysisRecord = duplicateRecord as UIErrorLogAIAnalysis;
              // Si está completado, retornarlo directamente
              if (analysisRecord.status === 'completed') {
                return analysisRecord;
              }
            } else {
              console.error('Error creating analysis record:', insertError);
              return null;
            }
          } else {
            console.error('Error creating analysis record:', insertError);
            return null;
          }
        } else {
          analysisRecord = newRecord as UIErrorLogAIAnalysis;
        }
      }

      // Preparar payload para el webhook
      const webhookPayload = {
        analysis_id: analysisRecord.id,
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

        // Extraer datos del análisis
        const analysis = webhookResponse.analysis;
        const metadata = webhookResponse.metadata || {};

        // Actualizar registro con el análisis recibido
        const { data: updatedAnalysis, error: updateError } = await supabaseLogMonitorAdmin
          .from('ui_error_log_ai_analysis')
          .update({
            analysis_text: analysis.analysis_text || '',
            analysis_summary: analysis.analysis_summary || '',
            suggested_fix: analysis.suggested_fix || null,
            confidence_score: analysis.confidence_score || 50,
            tokens_used: metadata.tokens_used || 0,
            model_used: metadata.model_used || 'webhook',
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', analysisRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating analysis:', updateError);
          return null;
        }

        return updatedAnalysis as UIErrorLogAIAnalysis;
      } catch (apiError) {
        // Marcar como fallido
        await supabaseLogMonitorAdmin
          .from('ui_error_log_ai_analysis')
          .update({
            status: 'failed',
            error_message: apiError instanceof Error ? apiError.message : 'Error desconocido'
          })
          .eq('id', analysisRecord.id);

        throw apiError;
      }
    } catch (error) {
      console.error('Error in requestAIAnalysis:', error);
      return null;
    }
  }

  /**
   * Obtener análisis de IA de un log
   */
  async getAIAnalysis(logId: string): Promise<UIErrorLogAIAnalysis | null> {
    try {
      // Usar admin client para evitar problemas de RLS
      // Usar maybeSingle para evitar errores cuando no hay análisis
      const { data, error } = await supabaseLogMonitorAdmin
        .from('ui_error_log_ai_analysis')
        .select('*')
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
  async getStats(): Promise<LogStats> {
    try {
      // Obtener todos los logs con estado UI (usar admin client para evitar problemas de RLS)
      const { data: logs, error } = await supabaseLogMonitorAdmin
        .from('error_log')
        .select(`
          *,
          ui_error_log_status (
            is_read,
            is_archived,
            priority
          )
        `);

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

      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

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

        // Errores recientes
        const logDate = new Date(log.timestamp);
        if (logDate >= oneDayAgo) {
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

