/**
 * ============================================
 * SERVICIO DE AUTOMATIZACIÓN DE ASIGNACIONES
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este servicio maneja la asignación automática de prospectos
 * 2. Se ejecuta cuando se crean nuevos prospectos o cuando obtienen ID CRM
 * 3. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { assignmentService } from './assignmentService';

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class AutomationService {
  
  /**
   * Procesa asignación automática para un nuevo prospecto
   * Se debe llamar cuando se crea un nuevo prospecto
   */
  async processNewProspect(prospectId: string): Promise<void> {
    try {
      // Verificar si ya tiene asignación
      const assignment = await assignmentService.getProspectAssignment(prospectId);
      if (assignment) {
        return; // Ya tiene asignación
      }

      // Asignar automáticamente a coordinación
      const result = await assignmentService.assignProspectToCoordinacion(prospectId);
      
      if (!result.success) {
        console.error('Error asignando prospecto a coordinación:', result.error);
      }
    } catch (error) {
      console.error('Error procesando nuevo prospecto:', error);
    }
  }

  /**
   * Procesa asignación automática cuando un prospecto obtiene ID CRM
   * Se debe llamar cuando se actualiza id_dynamics
   */
  async processProspectWithCRM(prospectId: string, idDynamics?: string): Promise<void> {
    try {
      // Verificar si tiene ID CRM
      if (!idDynamics) {
        const { data: prospecto } = await analysisSupabase
          .from('prospectos')
          .select('id_dynamics')
          .eq('id', prospectId)
          .single();

        if (!prospecto?.id_dynamics) {
          return; // No tiene ID CRM aún
        }
        idDynamics = prospecto.id_dynamics;
      }

      // Verificar si ya tiene ejecutivo asignado
      const assignment = await assignmentService.getProspectAssignment(prospectId);
      if (assignment?.ejecutivo_id) {
        return; // Ya tiene ejecutivo asignado
      }

      // Asignar automáticamente a ejecutivo
      const result = await assignmentService.checkAndAssignProspectWithCRM(prospectId, idDynamics);
      
      if (!result.success) {
        console.error('Error asignando prospecto a ejecutivo:', result.error);
      }
    } catch (error) {
      console.error('Error procesando prospecto con CRM:', error);
    }
  }

  /**
   * Procesa asignación automática para una nueva llamada
   * Se debe llamar cuando se crea una nueva llamada
   */
  async processNewCall(callId: string, prospectId: string): Promise<void> {
    try {
      // Obtener asignación del prospecto
      const assignment = await assignmentService.getProspectAssignment(prospectId);
      
      if (assignment) {
        // Sincronizar coordinacion_id y ejecutivo_id en la llamada
        await analysisSupabase
          .from('llamadas_ventas')
          .update({
            coordinacion_id: assignment.coordinacion_id,
            ejecutivo_id: assignment.ejecutivo_id || null,
          })
          .eq('call_id', callId);
      } else {
        // Si el prospecto no tiene asignación, asignarlo primero
        await this.processNewProspect(prospectId);
        
        // Luego sincronizar la llamada
        const updatedAssignment = await assignmentService.getProspectAssignment(prospectId);
        if (updatedAssignment) {
          await analysisSupabase
            .from('llamadas_ventas')
            .update({
              coordinacion_id: updatedAssignment.coordinacion_id,
              ejecutivo_id: updatedAssignment.ejecutivo_id || null,
            })
            .eq('call_id', callId);
        }
      }
    } catch (error) {
      console.error('Error procesando nueva llamada:', error);
    }
  }

  /**
   * Procesa asignación automática para una nueva conversación
   * Se debe llamar cuando se crea una nueva conversación de chat
   */
  async processNewConversation(conversationId: string, prospectId?: string): Promise<void> {
    try {
      if (!prospectId) {
        return; // No hay prospecto asociado
      }

      // Obtener asignación del prospecto
      const assignment = await assignmentService.getProspectAssignment(prospectId);
      
      if (assignment) {
        // Sincronizar coordinacion_id y ejecutivo_id en la conversación
        const { supabaseSystemUIAdmin } = await import('../config/supabaseSystemUI');
        await supabaseSystemUIAdmin
          .from('uchat_conversations')
          .update({
            coordinacion_id: assignment.coordinacion_id,
            ejecutivo_id: assignment.ejecutivo_id || null,
          })
          .eq('id', conversationId);
      } else {
        // Si el prospecto no tiene asignación, asignarlo primero
        await this.processNewProspect(prospectId);
        
        // Luego sincronizar la conversación
        const updatedAssignment = await assignmentService.getProspectAssignment(prospectId);
        if (updatedAssignment) {
          const { supabaseSystemUIAdmin } = await import('../config/supabaseSystemUI');
          await supabaseSystemUIAdmin
            .from('uchat_conversations')
            .update({
              coordinacion_id: updatedAssignment.coordinacion_id,
              ejecutivo_id: updatedAssignment.ejecutivo_id || null,
            })
            .eq('id', conversationId);
        }
      }
    } catch (error) {
      console.error('Error procesando nueva conversación:', error);
    }
  }
}

// Exportar instancia singleton
export const automationService = new AutomationService();
export default automationService;

