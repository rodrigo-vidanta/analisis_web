/**
 * ============================================
 * SERVICIO DE AUTOMATIZACIÓN DE ASIGNACIONES
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este servicio maneja la asignación automática de prospectos
 * 2. Se ejecuta cuando se crean nuevos prospectos o cuando obtienen ID CRM
 * 3. Incluye notificaciones automáticas para coordinadores y ejecutivos
 * 4. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { assignmentService } from './assignmentService';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { createClient } from '@supabase/supabase-js';

// Cliente para notificaciones usando PQNC_AI (service_role)
const NOTIFICATIONS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const NOTIFICATIONS_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4Njc4NywiZXhwIjoyMDY4MjYyNzg3fQ.oyKsFpO_8ulE_m877kpDoxF-htfenoXjq0_GrFThrwI';

const notificationsClient = createClient(NOTIFICATIONS_SUPABASE_URL, NOTIFICATIONS_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class AutomationService {
  
  /**
   * Crea notificaciones para coordinadores de una coordinación
   */
  private async notifyCoordinadores(
    prospectId: string,
    coordinacionId: string,
    nombreProspecto: string
  ): Promise<void> {
    try {
      // Obtener coordinadores operativos de esta coordinación (excluyendo calidad)
      const { data: coordinadores } = await supabaseSystemUI
        .from('auth_users')
        .select(`
          id, 
          full_name,
          auth_roles!inner(name)
        `)
        .eq('coordinacion_id', coordinacionId)
        .eq('auth_roles.name', 'coordinador')
        .eq('is_active', true)
        .eq('is_operativo', true);

      if (!coordinadores || coordinadores.length === 0) return;

      // Filtrar coordinadores de calidad
      const { data: userGroups } = await supabaseSystemUI
        .from('user_permission_groups')
        .select('user_id, group:group_id(name)')
        .in('user_id', coordinadores.map(c => c.id));

      const calidadUserIds = userGroups
        ?.filter((ug: any) => ug.group?.name?.toLowerCase().includes('calidad'))
        .map((ug: any) => ug.user_id) || [];

      const coordinadoresOperativos = coordinadores.filter(c => !calidadUserIds.includes(c.id));

      // Crear notificaciones
      for (const coord of coordinadoresOperativos) {
        await notificationsClient.from('user_notifications').insert({
          user_id: coord.id,
          type: 'nuevo_prospecto',
          title: 'Nuevo prospecto interesado',
          message: `${nombreProspecto} esta esperando atencion`,
          metadata: {
            prospecto_id: prospectId,
            prospecto_nombre: nombreProspecto,
            action_url: `/live-chat?prospecto=${prospectId}`
          }
        });
      }
    } catch (error) {
      console.error('Error notificando coordinadores:', error);
    }
  }

  /**
   * Crea notificación para un ejecutivo asignado
   */
  private async notifyEjecutivo(
    prospectId: string,
    ejecutivoId: string,
    nombreProspecto: string
  ): Promise<void> {
    try {
      await notificationsClient.from('user_notifications').insert({
        user_id: ejecutivoId,
        type: 'prospecto_asignado',
        title: 'Nuevo prospecto asignado',
        message: `${nombreProspecto} te fue asignado`,
        metadata: {
          prospecto_id: prospectId,
          prospecto_nombre: nombreProspecto,
          action_url: `/live-chat?prospecto=${prospectId}`
        }
      });
    } catch (error) {
      console.error('Error notificando ejecutivo:', error);
    }
  }

  /**
   * Obtiene el nombre del prospecto para notificaciones
   */
  private async getProspectoNombre(prospectId: string): Promise<string> {
    try {
      const { data } = await analysisSupabase
        .from('prospectos')
        .select('nombre_completo, nombre_whatsapp')
        .eq('id', prospectId)
        .single();

      return data?.nombre_completo || data?.nombre_whatsapp || 'WhatsApp';
    } catch {
      return 'WhatsApp';
    }
  }

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
      
      if (result.success && result.coordinacion_id) {
        // Notificar a coordinadores de la coordinación asignada
        const nombreProspecto = await this.getProspectoNombre(prospectId);
        await this.notifyCoordinadores(prospectId, result.coordinacion_id, nombreProspecto);
      } else if (!result.success) {
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
      
      if (result.success && result.ejecutivo_id) {
        // Notificar al ejecutivo asignado
        const nombreProspecto = await this.getProspectoNombre(prospectId);
        await this.notifyEjecutivo(prospectId, result.ejecutivo_id, nombreProspecto);
      } else if (!result.success) {
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

