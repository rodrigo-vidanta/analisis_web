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
import { coordinacionService, type ProspectAssignment } from './coordinacionService';

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
      console.log('🔍 Iniciando asignación manual:', {
        prospectId,
        coordinacionId,
        ejecutivoId,
        assignedBy,
        reason
      });

      // Actualizar o crear asignación
      const { data: existingAssignment, error: checkError } = await supabaseSystemUIAdmin
        .from('prospect_assignments')
        .select('id')
        .eq('prospect_id', prospectId)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) {
        console.error('Error verificando asignación existente:', checkError);
        throw checkError;
      }

      if (existingAssignment) {
        console.log('📝 Actualizando asignación existente:', existingAssignment.id);
        // Actualizar asignación existente (incluyendo coordinación si cambió)
        const { error: updateError } = await supabaseSystemUIAdmin
          .from('prospect_assignments')
          .update({
            coordinacion_id: coordinacionId, // Actualizar coordinación también
            ejecutivo_id: ejecutivoId,
            assigned_by: assignedBy,
            assignment_type: 'manual',
            assignment_reason: reason || 'Asignación manual',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAssignment.id);

        if (updateError) {
          console.error('Error actualizando asignación:', updateError);
          throw updateError;
        }
        console.log('✅ Asignación actualizada exitosamente');
      } else {
        console.log('➕ Creando nueva asignación');
        // Crear nueva asignación
        const { error: insertError } = await supabaseSystemUIAdmin.from('prospect_assignments').insert({
          prospect_id: prospectId,
          coordinacion_id: coordinacionId,
          ejecutivo_id: ejecutivoId,
          assigned_by: assignedBy,
          assignment_type: 'manual',
          assignment_reason: reason || 'Asignación manual',
        });

        if (insertError) {
          console.error('Error creando asignación:', insertError);
          throw insertError;
        }
        console.log('✅ Asignación creada exitosamente');
      }

      // Registrar en logs (no crítico si falla)
      try {
        await supabaseSystemUIAdmin.from('assignment_logs').insert({
          prospect_id: prospectId,
          coordinacion_id: coordinacionId,
          ejecutivo_id: ejecutivoId,
          action: 'assigned',
          assigned_by: assignedBy,
          reason: reason || 'Asignación manual',
        });
        console.log('✅ Log de asignación registrado');
      } catch (logError) {
        console.warn('⚠️ Error registrando log (no crítico):', logError);
      }

      // Sincronizar con base de análisis (tanto coordinación como ejecutivo)
      // No crítico si falla, solo loguear
      try {
        await Promise.all([
          this.syncProspectoCoordinacion(prospectId, coordinacionId),
          this.syncProspectoEjecutivo(prospectId, ejecutivoId)
        ]);
        console.log('✅ Sincronización con base de análisis completada');
      } catch (syncError) {
        console.warn('⚠️ Error en sincronización (no crítico):', syncError);
        // Continuar aunque falle la sincronización
      }

      return {
        success: true,
        coordinacion_id: coordinacionId,
        ejecutivo_id: ejecutivoId,
        message: 'Prospecto asignado manualmente a ejecutivo',
      };
    } catch (error) {
      console.error('❌ Error asignando prospecto manualmente a ejecutivo:', error);
      return {
        success: false,
        message: 'Error al asignar prospecto manualmente',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Desasigna un ejecutivo de un prospecto (mantiene la coordinación)
   */
  async unassignEjecutivoFromProspect(
    prospectId: string,
    assignedBy: string,
    reason?: string
  ): Promise<AssignmentResult> {
    try {
      // OPTIMIZACIÓN: Consultas en paralelo
      const [prospectoResult, assignmentResult] = await Promise.all([
        // Consulta 1: Verificar en prospectos (fuente de verdad)
        analysisSupabase
          .from('prospectos')
          .select('ejecutivo_id, coordinacion_id')
          .eq('id', prospectId)
          .single(),
        // Consulta 2: Obtener asignación actual en prospect_assignments
        supabaseSystemUIAdmin
          .from('prospect_assignments')
          .select('*')
          .eq('prospect_id', prospectId)
          .eq('is_active', true)
          .maybeSingle()
      ]);

      const { data: prospecto, error: prospectoError } = prospectoResult;
      const { data: assignment, error: assignmentError } = assignmentResult;

      if (prospectoError) {
        // Error silenciado para no exponer información sensible
        return {
          success: false,
          message: 'No se pudo encontrar el prospecto',
          error: prospectoError.message,
        };
      }

      if (!prospecto?.ejecutivo_id) {
        return {
          success: false,
          message: 'Este prospecto no tiene ejecutivo asignado',
        };
      }

      const ejecutivoIdToUnassign = prospecto.ejecutivo_id;
      const coordinacionId = prospecto.coordinacion_id;

      // OPTIMIZACIÓN: Actualizar ambas tablas en paralelo
      const now = new Date().toISOString();
      
      // Preparar actualizaciones
      const updatePromises: Promise<any>[] = [];

      // Actualizar prospect_assignments
      if (assignment) {
        // Actualizar asignación existente
        updatePromises.push(
          supabaseSystemUIAdmin
            .from('prospect_assignments')
            .update({
              ejecutivo_id: null,
              coordinacion_id: coordinacionId || assignment.coordinacion_id,
              updated_at: now,
            })
            .eq('id', assignment.id)
        );
      } else {
        // Buscar cualquier asignación (activa o inactiva) o crear nueva
        const { data: anyAssignment } = await supabaseSystemUIAdmin
          .from('prospect_assignments')
          .select('id')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyAssignment) {
          updatePromises.push(
            supabaseSystemUIAdmin
              .from('prospect_assignments')
              .update({
                coordinacion_id: coordinacionId,
                ejecutivo_id: null,
                is_active: true,
                updated_at: now,
              })
              .eq('id', anyAssignment.id)
          );
        } else {
          updatePromises.push(
            supabaseSystemUIAdmin
              .from('prospect_assignments')
              .insert({
                prospect_id: prospectId,
                coordinacion_id: coordinacionId,
                ejecutivo_id: null,
                is_active: true,
                assigned_at: now,
              })
          );
        }
      }

      // Actualizar prospectos (limpiar tanto ejecutivo_id como asesor_asignado)
      updatePromises.push(
        analysisSupabase
          .from('prospectos')
          .update({
            ejecutivo_id: null,
            asesor_asignado: null,
            assignment_date: now,
          })
          .eq('id', prospectId)
      );

      // Ejecutar actualizaciones en paralelo
      const results = await Promise.all(updatePromises);
      
      // Verificar errores
      for (const result of results) {
        if (result.error) {
          throw result.error;
        }
      }

      // OPTIMIZACIÓN: Registrar log de forma asíncrona (no bloquea la respuesta)
      (async () => {
        try {
          await supabaseSystemUIAdmin
            .from('assignment_logs')
            .insert({
              prospect_id: prospectId,
              coordinacion_id: coordinacionId,
              ejecutivo_id: ejecutivoIdToUnassign,
              action: 'unassigned',
              assigned_by: assignedBy,
              reason: reason || 'Desasignación manual de ejecutivo',
            });
        } catch {
          // Log no crítico, no afecta la respuesta
        }
      })();

      return {
        success: true,
        coordinacion_id: coordinacionId,
        message: 'Ejecutivo desasignado exitosamente',
      };
    } catch (error) {
      // Error silenciado para no exponer información sensible
      return {
        success: false,
        message: 'Error al desasignar ejecutivo',
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
   * Sincroniza ejecutivo_id y asesor_asignado en la tabla prospectos de la base de análisis
   */
  private async syncProspectoEjecutivo(
    prospectId: string,
    ejecutivoId: string
  ): Promise<void> {
    try {
      // Obtener información del ejecutivo para actualizar asesor_asignado
      let ejecutivoNombre: string | null = null;
      try {
        const ejecutivo = await coordinacionService.getEjecutivoById(ejecutivoId);
        if (ejecutivo) {
          ejecutivoNombre = ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || null;
        }
      } catch (error) {
        console.warn('No se pudo obtener nombre del ejecutivo para asesor_asignado:', error);
        // Continuar sin el nombre, solo actualizar ejecutivo_id
      }

      // Actualizar tanto ejecutivo_id como asesor_asignado
      const updateData: any = {
        ejecutivo_id: ejecutivoId,
        assignment_date: new Date().toISOString(),
      };

      // Solo actualizar asesor_asignado si obtuvimos el nombre
      if (ejecutivoNombre) {
        updateData.asesor_asignado = ejecutivoNombre;
      }

      await analysisSupabase
        .from('prospectos')
        .update(updateData)
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

