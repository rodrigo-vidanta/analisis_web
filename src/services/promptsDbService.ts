import { supabaseSystemUIAdmin, type PromptVersion, type WorkflowMetrics, type PromptChangeLog } from '../config/supabaseSystemUI';

class PromptsDbService {
  
  // Guardar nueva versión de prompt
  async savePromptVersion(promptData: Omit<PromptVersion, 'id' | 'created_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('prompt_versions')
        .insert([{
          ...promptData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, id: data.id };
    } catch (error) {
      console.error('Error guardando versión de prompt:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener versiones de un prompt específico
  async getPromptVersions(workflowId: string, nodeId: string): Promise<{ success: boolean; versions?: PromptVersion[]; error?: string }> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('prompt_versions')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('node_id', nodeId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return { success: true, versions: data };
    } catch (error) {
      console.error('Error obteniendo versiones:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener versión activa de un prompt
  async getActivePromptVersion(workflowId: string, nodeId: string): Promise<{ success: boolean; version?: PromptVersion; error?: string }> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('prompt_versions')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('node_id', nodeId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return { success: true, version: data };
    } catch (error) {
      console.error('Error obteniendo versión activa:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Activar una versión específica
  async activatePromptVersion(versionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Primero obtener la versión a activar
      const { data: versionToActivate, error: getError } = await supabaseSystemUIAdmin
        .from('prompt_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (getError) throw getError;

      // Desactivar todas las versiones del mismo prompt
      const { error: deactivateError } = await supabaseSystemUIAdmin
        .from('prompt_versions')
        .update({ is_active: false })
        .eq('workflow_id', versionToActivate.workflow_id)
        .eq('node_id', versionToActivate.node_id);

      if (deactivateError) throw deactivateError;

      // Activar la versión seleccionada
      const { error: activateError } = await supabaseSystemUIAdmin
        .from('prompt_versions')
        .update({ is_active: true })
        .eq('id', versionId);

      if (activateError) throw activateError;

      // Registrar el cambio
      await this.logPromptChange({
        prompt_version_id: versionId,
        change_type: 'activate',
        change_description: `Versión ${versionToActivate.version_number} activada`,
        changed_by: userId,
        changed_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error activando versión:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener métricas de workflows
  async getWorkflowMetrics(workflowIds: string[]): Promise<{ success: boolean; metrics?: WorkflowMetrics[]; error?: string }> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('workflow_metrics')
        .select('*')
        .in('workflow_id', workflowIds)
        .order('last_execution', { ascending: false });

      if (error) throw error;

      return { success: true, metrics: data };
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Actualizar métricas de un workflow
  async updateWorkflowMetrics(metrics: Omit<WorkflowMetrics, 'id'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseSystemUIAdmin
        .from('workflow_metrics')
        .upsert([{
          ...metrics,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error actualizando métricas:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Registrar cambio en el log
  async logPromptChange(changeData: Omit<PromptChangeLog, 'id'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseSystemUIAdmin
        .from('prompt_change_log')
        .insert([changeData]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error registrando cambio:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener historial de cambios
  async getPromptChangeLog(promptVersionId?: string, limit: number = 50): Promise<{ success: boolean; changes?: PromptChangeLog[]; error?: string }> {
    try {
      let query = supabaseSystemUIAdmin
        .from('prompt_change_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (promptVersionId) {
        query = query.eq('prompt_version_id', promptVersionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, changes: data };
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Calcular score de rendimiento basado en métricas
  calculatePerformanceScore(successRate: number, totalExecutions: number, avgExecutionTime?: number): number {
    let score = 0;

    // Score base por tasa de éxito (0-70 puntos)
    score += (successRate / 100) * 70;

    // Bonus por volumen de ejecuciones (0-20 puntos)
    if (totalExecutions >= 100) score += 20;
    else if (totalExecutions >= 50) score += 15;
    else if (totalExecutions >= 20) score += 10;
    else if (totalExecutions >= 10) score += 5;

    // Bonus/penalización por tiempo de ejecución (0-10 puntos)
    if (avgExecutionTime) {
      if (avgExecutionTime < 5000) score += 10; // Menos de 5 segundos
      else if (avgExecutionTime < 10000) score += 5; // Menos de 10 segundos
      else if (avgExecutionTime > 30000) score -= 5; // Más de 30 segundos
    }

    return Math.min(Math.max(score, 0), 100); // Limitar entre 0-100
  }
}

export const promptsDbService = new PromptsDbService();
export default promptsDbService;
