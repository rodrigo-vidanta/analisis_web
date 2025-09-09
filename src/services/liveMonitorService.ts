// ============================================
// SERVICIO PARA LIVE MONITOR
// Gestión de prospectos, agentes y transferencias
// ============================================

import { analysisSupabase } from '../config/analysisSupabase';

// Tipos
export interface Prospect {
  id: string;
  nombre_completo: string | null;
  nombre_whatsapp: string;
  whatsapp: string;
  etapa: string;
  temperatura_prospecto?: 'frio' | 'tibio' | 'caliente';
  checkpoint_transferencia?: string;
  agente_asignado?: string;
  status_transferencia?: 'pendiente' | 'transferida' | 'completada';
  updated_at: string;
  observaciones?: string;
  tamano_grupo?: number;
  destino_preferencia?: string[];
  feedback_agente?: string;
  resultado_transferencia?: string;
  fecha_transferencia?: string;
  llamada_activa?: boolean;
}

export interface Agent {
  id: string;
  agent_name: string;
  agent_email: string;
  is_active: boolean;
  total_calls_handled: number;
  current_position?: number;
  last_call_time?: string;
}

export interface FeedbackData {
  prospect_id: string;
  agent_email: string;
  resultado: 'exitosa' | 'perdida' | 'problemas_tecnicos';
  comentarios: string;
  comentarios_ia?: string;
}

class LiveMonitorService {
  
  // ============================================
  // GESTIÓN DE PROSPECTOS
  // ============================================
  
  /**
   * Obtener prospectos activos
   */
  async getActiveProspects(): Promise<Prospect[]> {
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .not('etapa', 'is', null)
        .neq('etapa', 'Finalizado')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error obteniendo prospectos activos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getActiveProspects:', error);
      return [];
    }
  }

  /**
   * Obtener prospecto por ID
   */
  async getProspectById(id: string): Promise<Prospect | null> {
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo prospecto:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en getProspectById:', error);
      return null;
    }
  }

  /**
   * Actualizar temperatura de prospecto
   */
  async updateProspectTemperature(id: string, temperatura: 'frio' | 'tibio' | 'caliente'): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('prospectos')
        .update({ 
          temperatura_prospecto: temperatura,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando temperatura:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('💥 Error en updateProspectTemperature:', error);
      return false;
    }
  }

  // ============================================
  // GESTIÓN DE AGENTES
  // ============================================

  /**
   * Obtener agentes activos
   */
  async getActiveAgents(): Promise<Agent[]> {
    // Por ahora usar datos demo hasta que se cree la tabla
    const agentsDemo: Agent[] = [
      { id: '1', agent_name: 'Carlos Mendoza', agent_email: 'carlos.mendoza@grupovidanta.com', is_active: true, total_calls_handled: 15 },
      { id: '2', agent_name: 'Ana Gutiérrez', agent_email: 'ana.gutierrez@grupovidanta.com', is_active: true, total_calls_handled: 12 },
      { id: '3', agent_name: 'Roberto Silva', agent_email: 'roberto.silva@grupovidanta.com', is_active: true, total_calls_handled: 18 },
      { id: '4', agent_name: 'María López', agent_email: 'maria.lopez@grupovidanta.com', is_active: true, total_calls_handled: 9 },
      { id: '5', agent_name: 'Diego Ramírez', agent_email: 'diego.ramirez@grupovidanta.com', is_active: true, total_calls_handled: 21 }
    ];

    return agentsDemo;
  }

  /**
   * Seleccionar próximo agente aleatoriamente
   */
  async selectNextAgent(): Promise<Agent | null> {
    try {
      const agents = await this.getActiveAgents();
      const activeAgents = agents.filter(agent => agent.is_active);
      
      if (activeAgents.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * activeAgents.length);
      return activeAgents[randomIndex];
    } catch (error) {
      console.error('💥 Error en selectNextAgent:', error);
      return null;
    }
  }

  // ============================================
  // GESTIÓN DE TRANSFERENCIAS
  // ============================================

  /**
   * Marcar prospecto como transferido
   */
  async markAsTransferred(prospectId: string, agentEmail: string, checkpoint: string): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('prospectos')
        .update({
          status_transferencia: 'transferida',
          agente_asignado: agentEmail,
          fecha_transferencia: new Date().toISOString(),
          checkpoint_transferencia: checkpoint,
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectId);

      if (error) {
        console.error('❌ Error marcando como transferido:', error);
        return false;
      }

      console.log('✅ Prospecto marcado como transferido');
      return true;
    } catch (error) {
      console.error('💥 Error en markAsTransferred:', error);
      return false;
    }
  }

  /**
   * Guardar feedback del agente
   */
  async saveFeedback(feedbackData: FeedbackData): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('prospectos')
        .update({
          feedback_agente: feedbackData.comentarios,
          resultado_transferencia: feedbackData.resultado,
          comentarios_ia: feedbackData.comentarios_ia,
          fecha_feedback: new Date().toISOString(),
          agente_feedback_id: feedbackData.agent_email,
          status_transferencia: 'completada',
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackData.prospect_id);

      if (error) {
        console.error('❌ Error guardando feedback:', error);
        return false;
      }

      console.log('✅ Feedback guardado exitosamente');
      return true;
    } catch (error) {
      console.error('💥 Error en saveFeedback:', error);
      return false;
    }
  }

  /**
   * Obtener historial de transferencias (últimas 24 horas)
   */
  async getTransferHistory(): Promise<Prospect[]> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('status_transferencia', 'completada')
        .gte('fecha_transferencia', yesterday.toISOString())
        .order('fecha_transferencia', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error obteniendo historial:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getTransferHistory:', error);
      return [];
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Mapear etapa a checkpoint
   */
  mapEtapaToCheckpoint(etapa: string): string {
    const mapping: Record<string, string> = {
      'Validando si es miembro': 'saludo_continuacion',
      'En seguimiento': 'conexion_emocional',
      'Interesado': 'introduccion_paraiso',
      'Negociando': 'presentacion_oferta',
      'Procesando pago': 'proceso_pago'
    };

    return mapping[etapa] || 'saludo_continuacion';
  }

  /**
   * Obtener temperatura basada en etapa y observaciones
   */
  inferTemperature(prospect: Prospect): 'frio' | 'tibio' | 'caliente' {
    if (prospect.temperatura_prospecto) {
      return prospect.temperatura_prospecto;
    }

    // Inferir basado en etapa
    switch (prospect.etapa) {
      case 'Interesado':
      case 'Negociando':
        return 'caliente';
      case 'En seguimiento':
        return 'tibio';
      default:
        return 'frio';
    }
  }

  /**
   * Formatear tiempo transcurrido
   */
  getTimeElapsed(updatedAt: string): string {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  }
}

// Exportar instancia singleton
export const liveMonitorService = new LiveMonitorService();
export default liveMonitorService;
