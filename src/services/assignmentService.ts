/**
 * ============================================
 * SERVICIO DE ASIGNACIONES DE PROSPECTOS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este servicio maneja la asignación automática y manual de prospectos
 * 2. Usa funciones RPC de System_UI para la lógica de asignación
 * 3. Sincroniza asignaciones con la base de análisis cuando es necesario
 * 4. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 */

import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';
import type { ProspectAssignment } from './coordinacionService';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface AssignmentResult {
  success: boolean;
  coordinacion_id?: string;
  ejecutivo_id?: string;
  message: string;
  error?: string;
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class AssignmentService {
  
  // ============================================
  // ASIGNACIÓN AUTOMÁTICA A COORDINACIÓN
  // ============================================

  /**
   * Asigna un prospecto automáticamente a una coordinación
   * Usa round-robin basado en carga de trabajo de las últimas 24 horas
   */
  async assignProspectToCoordinacion(
    prospectId: string,
    assignedBy?: string
  ): Promise<AssignmentResult> {
    try {
      // Llamar función RPC para asignación automática
      const { data, error } = await supabaseSystemUI.rpc(
        'assign_prospect_to_coordinacion',
        {
          p_prospect_id: prospectId,
          p_assigned_by: assignedBy || null,
        }
      );

      if (error) throw error;

      const coordinacionId = data;

      if (!coordinacionId) {
        return {
          success: false,
          message: 'No se pudo asignar el prospecto a ninguna coordinación',
          error: 'No hay coordinaciones activas',
        };
      }

      // Sincronizar con base de análisis
      await this.syncProspectoCoordinacion(prospectId, coordinacionId);

      return {
        success: true,
        coordinacion_id: coordinacionId,
        message: 'Prospecto asignado automáticamente a coordinación',
      };
    } catch (error) {
      console.error('Error asignando prospecto a coordinación:', error);
      return {
        success: false,
        message: 'Error al asignar prospecto',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // ============================================
  // ASIGNACIÓN AUTOMÁTICA A EJECUTIVO
  // ============================================

  /**
   * Asigna un prospecto automáticamente a un ejecutivo de una coordinación
   * Usa round-robin basado en carga de trabajo de las últimas 24 horas
   */
  async assignProspectToEjecutivo(
    prospectId: string,
    coordinacionId: string,
    assignedBy?: string
  ): Promise<AssignmentResult> {
    try {
      // Llamar función RPC para asignación automática
      const { data, error } = await supabaseSystemUI.rpc(
        'assign_prospect_to_ejecutivo',
        {
          p_prospect_id: prospectId,
          p_coordinacion_id: coordinacionId,
          p_assigned_by: assignedBy || null,
        }
      );

      if (error) throw error;

      const ejecutivoId = data;

      if (!ejecutivoId) {
        return {
          success: false,
          message: 'No se pudo asignar el prospecto a ningún ejecutivo',
          error: 'No hay ejecutivos activos en la coordinación',
        };
      }

      // Sincronizar con base de análisis
      await this.syncProspectoEjecutivo(prospectId, ejecutivoId);

      return {
        success: true,
        coordinacion_id: coordinacionId,
        ejecutivo_id: ejecutivoId,
        message: 'Prospecto asignado automáticamente a ejecutivo',
      };
    } catch (error) {
      console.error('Error asignando prospecto a ejecutivo:', error);
      return {
        success: false,
        message: 'Error al asignar prospecto a ejecutivo',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // ============================================
  // VERIFICACIÓN Y ASIGNACIÓN CON ID CRM
  // ============================================

  /**
   * Verifica si un prospecto tiene ID CRM y lo asigna automáticamente a un ejecutivo
   */
  async checkAndAssignProspectWithCRM(
    prospectId: string,
    idDynamics?: string
  ): Promise<AssignmentResult> {
    try {
      // Si no se proporciona id_dynamics, obtenerlo de la base de análisis
      if (!idDynamics) {
        const { data: prospecto, error: prospectError } = await analysisSupabase
          .from('prospectos')
          .select('id_dynamics')
          .eq('id', prospectId)
          .single();

        if (prospectError) throw prospectError;
        idDynamics = prospecto?.id_dynamics;
      }

      // Si no tiene ID CRM, no asignar a ejecutivo
      if (!idDynamics || idDynamics.trim() === '') {
        return {
          success: false,
          message: 'El prospecto no tiene ID CRM, no se asigna a ejecutivo',
        };
      }

      // Llamar función RPC para asignación automática
      const { data: ejecutivoIdResult, error } = await supabaseSystemUI.rpc(
        'check_and_assign_prospect_with_crm',
        {
          p_prospect_id: prospectId,
          p_id_dynamics: idDynamics,
        }
      );

      if (error) throw error;

      const ejecutivoId = ejecutivoIdResult;

      if (!ejecutivoId) {
        return {
          success: false,
          message: 'No se pudo asignar el prospecto a ningún ejecutivo',
        };
      }

      // Obtener coordinación asignada
      const { data: assignment } = await supabaseSystemUI
        .from('prospect_assignments')
        .select('coordinacion_id')
        .eq('prospect_id', prospectId)
        .eq('is_active', true)
        .single();

      // Sincronizar con base de análisis
      if (assignment) {
        await this.syncProspectoEjecutivo(prospectId, ejecutivoId);
      }

      return {
        success: true,
        ejecutivo_id: ejecutivoId,
        coordinacion_id: assignment?.coordinacion_id,
        message: 'Prospecto asignado automáticamente a ejecutivo (ID CRM detectado)',
      };
    } catch (error) {
      console.error('Error verificando y asignando prospecto con CRM:', error);
      return {
        success: false,
        message: 'Error al verificar y asignar prospecto',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // ============================================
  // ASIGNACIÓN MANUAL
  // ============================================

  /**
   * Asigna manualmente un prospecto a una coordinación
   */
  async assignProspectManuallyToCoordinacion(
    prospectId: string,
    coordinacionId: string,
    assignedBy: string,
    reason?: string
  ): Promise<AssignmentResult> {
    try {
      // Desactivar asignaciones anteriores
      await supabaseSystemUIAdmin
        .from('prospect_assignments')
        .update({ is_active: false, unassigned_at: new Date().toISOString() })
        .eq('prospect_id', prospectId)
        .eq('is_active', true);

      // Crear nueva asignación
      const { error } = await supabaseSystemUIAdmin
        .from('prospect_assignments')
        .insert({
          prospect_id: prospectId,
          coordinacion_id: coordinacionId,
          assigned_by: assignedBy,
          assignment_type: 'manual',
          assignment_reason: reason || 'Asignación manual',
        });

      if (error) throw error;

      // Registrar en logs
      await supabaseSystemUIAdmin.from('assignment_logs').insert({
        prospect_id: prospectId,
        coordinacion_id: coordinacionId,
        action: 'assigned',
        assigned_by: assignedBy,
        reason: reason || 'Asignación manual',
      });

      // Sincronizar con base de análisis
      await this.syncProspectoCoordinacion(prospectId, coordinacionId);

      return {
        success: true,
        coordinacion_id: coordinacionId,
        message: 'Prospecto asignado manualmente a coordinación',
      };
    } catch (error) {
      console.error('Error asignando prospecto manualmente:', error);
      return {
        success: false,
        message: 'Error al asignar prospecto manualmente',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Asigna manualmente un prospecto a un ejecutivo
   */
  async assignProspectManuallyToEjecutivo(
    prospectId: string,
    coordinacionId: string,
    ejecutivoId: string,
    assignedBy: string,
    reason?: string
  ): Promise<AssignmentResult> {
    try {
      // Actualizar o crear asignación
      const { data: existingAssignment } = await supabaseSystemUIAdmin
        .from('prospect_assignments')
        .select('id')
        .eq('prospect_id', prospectId)
        .eq('is_active', true)
        .single();

      if (existingAssignment) {
        // Actualizar asignación existente
        await supabaseSystemUIAdmin
          .from('prospect_assignments')
          .update({
            ejecutivo_id: ejecutivoId,
            assigned_by: assignedBy,
            assignment_type: 'manual',
            assignment_reason: reason || 'Asignación manual',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAssignment.id);
      } else {
        // Crear nueva asignación
        await supabaseSystemUIAdmin.from('prospect_assignments').insert({
          prospect_id: prospectId,
          coordinacion_id: coordinacionId,
          ejecutivo_id: ejecutivoId,
          assigned_by: assignedBy,
          assignment_type: 'manual',
          assignment_reason: reason || 'Asignación manual',
        });
      }

      // Registrar en logs
      await supabaseSystemUIAdmin.from('assignment_logs').insert({
        prospect_id: prospectId,
        coordinacion_id: coordinacionId,
        ejecutivo_id: ejecutivoId,
        action: 'assigned',
        assigned_by: assignedBy,
        reason: reason || 'Asignación manual',
      });

      // Sincronizar con base de análisis
      await this.syncProspectoEjecutivo(prospectId, ejecutivoId);

      return {
        success: true,
        coordinacion_id: coordinacionId,
        ejecutivo_id: ejecutivoId,
        message: 'Prospecto asignado manualmente a ejecutivo',
      };
    } catch (error) {
      console.error('Error asignando prospecto manualmente a ejecutivo:', error);
      return {
        success: false,
        message: 'Error al asignar prospecto manualmente',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // ============================================
  // OBTENER ASIGNACIONES
  // ============================================

  /**
   * Obtiene la asignación activa de un prospecto
   */
  async getProspectAssignment(prospectId: string): Promise<ProspectAssignment | null> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('prospect_assignments')
        .select('*')
        .eq('prospect_id', prospectId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error obteniendo asignación:', error);
      return null;
    }
  }

  // ============================================
  // SINCRONIZACIÓN CON BASE DE ANÁLISIS
  // ============================================

  /**
   * Sincroniza coordinacion_id en la tabla prospectos de la base de análisis
   */
  private async syncProspectoCoordinacion(
    prospectId: string,
    coordinacionId: string
  ): Promise<void> {
    try {
      await analysisSupabase
        .from('prospectos')
        .update({
          coordinacion_id: coordinacionId,
          assignment_date: new Date().toISOString(),
        })
        .eq('id', prospectId);
    } catch (error) {
      console.error('Error sincronizando coordinacion_id:', error);
      // No lanzar error, solo loguear
    }
  }

  /**
   * Sincroniza ejecutivo_id en la tabla prospectos de la base de análisis
   */
  private async syncProspectoEjecutivo(
    prospectId: string,
    ejecutivoId: string
  ): Promise<void> {
    try {
      await analysisSupabase
        .from('prospectos')
        .update({
          ejecutivo_id: ejecutivoId,
          assignment_date: new Date().toISOString(),
        })
        .eq('id', prospectId);
    } catch (error) {
      console.error('Error sincronizando ejecutivo_id:', error);
      // No lanzar error, solo loguear
    }
  }
}

// Exportar instancia singleton
export const assignmentService = new AssignmentService();
export default assignmentService;

