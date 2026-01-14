/**
// DEBUG: Solo logs en desarrollo
const DEBUG = import.meta.env.DEV;

 * ============================================
 * SERVICIO DE REASIGNACIÓN VÍA N8N/DYNAMICS
 * ============================================
 *
 * Este servicio maneja la reasignación de prospectos enviando
 * solicitudes al webhook de N8N que se comunica con Dynamics CRM.
 * 
 * URL Webhook: https://primary-dev-d75a.up.railway.app/webhook/reasignar-prospecto
 * 
 * ⚠️ IMPORTANTE:
 * - La reasignación ahora se hace vía webhook, NO directamente en BD
 * - Solo se actualiza localmente después de recibir 200 del webhook
 * - Permisos: admin, administrador_operativo, coordinador, coordinador_calidad
 * 
 * 🔒 SEGURIDAD (Actualizado 2026-01-07):
 * - Las credenciales se obtienen de BD (SystemUI → api_auth_tokens)
 * - NO hardcodear tokens en código
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import { coordinacionService } from './coordinacionService';
import { credentialsService } from './credentialsService';
import toast from 'react-hot-toast';

// ============================================
// CONFIGURACIÓN
// ============================================

// Cache de credenciales (se carga dinámicamente)
let cachedReasignacionCredentials: { url: string; token: string } | null = null;

// Función para obtener credenciales de forma segura
async function getReasignacionCredentials(): Promise<{ url: string; token: string }> {
  if (cachedReasignacionCredentials) return cachedReasignacionCredentials;
  
  const creds = await credentialsService.getDynamicsWebhookCredentials();
  cachedReasignacionCredentials = {
    url: creds.reasignarUrl || import.meta.env.VITE_N8N_REASIGNAR_LEAD_DYNAMICS_URL || 'https://primary-dev-d75a.up.railway.app/webhook/reasignar-prospecto',
    token: creds.token || import.meta.env.VITE_N8N_DYNAMICS_TOKEN || ''
  };
  return cachedReasignacionCredentials;
}

// Timeout para el webhook (120 segundos / 2 minutos - el proceso de Dynamics puede ser muy tardado)
const WEBHOOK_TIMEOUT_MS = 120000;

// ============================================
// INTERFACES
// ============================================

export interface ReasignacionRequest {
  prospecto_id: string;
  nuevo_ejecutivo_id: string;
  nueva_coordinacion_id: string;
  ejecutivo_anterior_id?: string | null;
  coordinacion_anterior_id?: string | null;
  reasignado_por_id: string;
  reasignado_por_nombre?: string;
  reasignado_por_email?: string;
  reasignado_por_rol?: string;
  motivo?: string;
  // Datos del prospecto para Dynamics
  id_dynamics?: string | null;
  nombre_prospecto?: string | null;
  whatsapp_prospecto?: string | null;
  email_prospecto?: string | null;
  // Datos del nuevo ejecutivo para Dynamics
  nuevo_ejecutivo_nombre?: string | null;
  nuevo_ejecutivo_email?: string | null;
  nueva_coordinacion_nombre?: string | null;
  nueva_coordinacion_codigo?: string | null;
}

export interface ReasignacionResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: {
    prospecto_id: string;
    ejecutivo_id: string;
    coordinacion_id: string;
    dynamics_updated?: boolean;
    local_updated?: boolean;
  };
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class DynamicsReasignacionService {
  
  /**
   * Reasigna un prospecto a un nuevo ejecutivo vía webhook N8N/Dynamics
   * 
   * @param request - Datos de la reasignación
   * @returns Resultado de la operación
   */
  async reasignarProspecto(request: ReasignacionRequest): Promise<ReasignacionResponse> {
    DEBUG && console.log('🔄 [DynamicsReasignacion] Iniciando reasignación vía webhook:', {
      prospecto_id: request.prospecto_id,
      nuevo_ejecutivo_id: request.nuevo_ejecutivo_id,
      nueva_coordinacion_id: request.nueva_coordinacion_id,
      id_dynamics: request.id_dynamics
    });

    try {
      // 1. Enviar solicitud al webhook de N8N
      const webhookResponse = await this.enviarWebhook(request);
      
      if (!webhookResponse.success) {
        console.error('❌ [DynamicsReasignacion] Webhook retornó error:', webhookResponse.error);
        return webhookResponse;
      }

      DEBUG && console.log('✅ [DynamicsReasignacion] Webhook respondió exitosamente');

      // 2. Si el webhook fue exitoso, actualizar localmente
      const localUpdateResult = await this.actualizarLocalmente(request);
      
      if (!localUpdateResult.success) {
        console.warn('⚠️ [DynamicsReasignacion] Error actualizando localmente:', localUpdateResult.error);
        // Aún así consideramos éxito porque Dynamics se actualizó
        return {
          success: true,
          message: 'Reasignación completada en Dynamics, pero hubo un error actualizando localmente',
          details: {
            prospecto_id: request.prospecto_id,
            ejecutivo_id: request.nuevo_ejecutivo_id,
            coordinacion_id: request.nueva_coordinacion_id,
            dynamics_updated: true,
            local_updated: false
          }
        };
      }

      DEBUG && console.log('✅ [DynamicsReasignacion] Reasignación completada exitosamente');
      
      return {
        success: true,
        message: 'Prospecto reasignado exitosamente',
        details: {
          prospecto_id: request.prospecto_id,
          ejecutivo_id: request.nuevo_ejecutivo_id,
          coordinacion_id: request.nueva_coordinacion_id,
          dynamics_updated: true,
          local_updated: true
        }
      };

    } catch (error) {
      console.error('❌ [DynamicsReasignacion] Error inesperado:', error);
      return {
        success: false,
        message: 'Error al reasignar prospecto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Enriquece los datos de reasignación con información de coordinación y ejecutivo
   */
  async enriquecerDatosReasignacion(
    prospectoId: string,
    nuevoEjecutivoId: string,
    nuevaCoordinacionId: string,
    reasignadoPorId: string,
    motivo?: string
  ): Promise<ReasignacionRequest> {
    // Obtener datos del prospecto
    const { data: prospecto } = await analysisSupabase
      .from('prospectos')
      .select('id_dynamics, nombre_completo, nombre_whatsapp, whatsapp, email, ejecutivo_id, coordinacion_id')
      .eq('id', prospectoId)
      .single();

    // Obtener datos del nuevo ejecutivo
    let nuevoEjecutivo: { full_name?: string; nombre_completo?: string; email?: string } | null = null;
    try {
      nuevoEjecutivo = await coordinacionService.getEjecutivoById(nuevoEjecutivoId);
    } catch (error) {
      console.warn('Error obteniendo datos del nuevo ejecutivo:', error);
    }

    // Obtener datos de la nueva coordinación
    let nuevaCoordinacion: { nombre?: string; codigo?: string } | null = null;
    try {
      nuevaCoordinacion = await coordinacionService.getCoordinacionById(nuevaCoordinacionId);
    } catch (error) {
      console.warn('Error obteniendo datos de la nueva coordinación:', error);
    }

    // Obtener datos del usuario que reasigna (incluyendo rol desde auth_roles)
    let reasignadoPor: { full_name?: string; email?: string; role_name?: string } | null = null;
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select(`
          full_name, 
          email, 
          role_id,
          auth_roles:role_id (
            name
          )
        `)
        .eq('id', reasignadoPorId)
        .maybeSingle();
      
      if (error) {
        console.warn('Error obteniendo datos del usuario que reasigna:', error.message);
      } else if (data) {
        // Extraer el nombre del rol desde el join
        const roleName = Array.isArray(data.auth_roles) 
          ? data.auth_roles[0]?.name 
          : (data.auth_roles as any)?.name;
        
        reasignadoPor = {
          full_name: data.full_name,
          email: data.email,
          role_name: roleName || undefined
        };
      }
    } catch (error) {
      console.warn('Error obteniendo datos del usuario que reasigna:', error);
    }

    return {
      prospecto_id: prospectoId,
      nuevo_ejecutivo_id: nuevoEjecutivoId,
      nueva_coordinacion_id: nuevaCoordinacionId,
      ejecutivo_anterior_id: prospecto?.ejecutivo_id || null,
      coordinacion_anterior_id: prospecto?.coordinacion_id || null,
      reasignado_por_id: reasignadoPorId,
      reasignado_por_nombre: reasignadoPor?.full_name || undefined,
      reasignado_por_email: reasignadoPor?.email || undefined,
      reasignado_por_rol: reasignadoPor?.role_name || undefined,
      motivo: motivo,
      // Datos del prospecto
      id_dynamics: prospecto?.id_dynamics || null,
      nombre_prospecto: prospecto?.nombre_completo || prospecto?.nombre_whatsapp || null,
      whatsapp_prospecto: prospecto?.whatsapp || null,
      email_prospecto: prospecto?.email || null,
      // Datos del nuevo ejecutivo
      nuevo_ejecutivo_nombre: nuevoEjecutivo?.full_name || nuevoEjecutivo?.nombre_completo || null,
      nuevo_ejecutivo_email: nuevoEjecutivo?.email || null,
      nueva_coordinacion_nombre: nuevaCoordinacion?.nombre || null,
      nueva_coordinacion_codigo: nuevaCoordinacion?.codigo || null
    };
  }

  /**
   * Envía la solicitud al webhook de N8N
   * Incluye timeout de 120 segundos (2 min) porque el proceso de Dynamics es muy tardado
   * Solo muestra notificación cuando el webhook responde (éxito o error)
   */
  private async enviarWebhook(request: ReasignacionRequest): Promise<ReasignacionResponse> {
    try {
      // Obtener credenciales de forma segura desde BD
      const { url, token } = await getReasignacionCredentials();
      
      DEBUG && console.log('📤 [DynamicsReasignacion] Enviando al webhook:', url);
      DEBUG && console.log(`⏱️ [DynamicsReasignacion] Timeout configurado: ${WEBHOOK_TIMEOUT_MS / 1000} segundos`);
      
      const payload = {
        prospecto_id: request.prospecto_id,
        nuevo_ejecutivo_id: request.nuevo_ejecutivo_id,
        user_id: request.reasignado_por_id,
        user_email: request.reasignado_por_email,
        motivo: 'cambio desde UI'
      };

      DEBUG && console.log('📋 [DynamicsReasignacion] Payload completo:', JSON.stringify(payload, null, 2));

      // Crear AbortController para el timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Dynamics-Token': token
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        // Limpiar timeout si la respuesta llegó
        clearTimeout(timeoutId);

        if (response.ok) {
          DEBUG && console.log('✅ [DynamicsReasignacion] Webhook respondió con 200');
          
          // Intentar leer el body de respuesta
          let responseData = null;
          try {
            responseData = await response.json();
          } catch {
            // Si no hay JSON, está bien
          }

          // Mostrar toast de éxito
          toast.success(
            `✅ Reasignación sincronizada con Dynamics\n→ ${request.nuevo_ejecutivo_nombre || 'Ejecutivo'}`,
            {
              duration: 5000,
              style: {
                background: '#10B981',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
              },
              iconTheme: {
                primary: 'white',
                secondary: '#10B981',
              },
            }
          );

          return {
            success: true,
            message: 'Webhook procesado exitosamente',
            details: responseData
          };
        } else {
          const errorText = await response.text();
          console.error('❌ [DynamicsReasignacion] Webhook respondió con error:', response.status, errorText);
          
          // Mostrar toast de error
          toast.error(
            `❌ Error al sincronizar con Dynamics\nCódigo: ${response.status}`,
            {
              duration: 8000,
              style: {
                background: '#EF4444',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
              },
            }
          );
          
          return {
            success: false,
            message: `Error del webhook: ${response.status}`,
            error: errorText || `HTTP ${response.status}`
          };
        }
      } catch (fetchError) {
        // Limpiar timeout
        clearTimeout(timeoutId);
        
        // Verificar si fue un timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('⏱️ [DynamicsReasignacion] Timeout - El webhook no respondió en 120 segundos');
          
          toast.error(
            `⏱️ Timeout: Dynamics no respondió en 2 minutos\nLa reasignación puede haberse completado. Verifica en Dynamics.`,
            {
              duration: 10000,
              style: {
                background: '#F59E0B',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
              },
            }
          );

          return {
            success: false,
            message: 'Timeout: El webhook no respondió en 2 minutos',
            error: 'TIMEOUT'
          };
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ [DynamicsReasignacion] Error de red al llamar webhook:', error);
      
      // Mostrar toast de error de conexión
      toast.error(
        `❌ Error de conexión con Dynamics\n${error instanceof Error ? error.message : 'Error de red'}`,
        {
          duration: 8000,
          style: {
            background: '#EF4444',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
          },
        }
      );

      return {
        success: false,
        message: 'Error de conexión al webhook',
        error: error instanceof Error ? error.message : 'Error de red'
      };
    }
  }

  /**
   * Actualiza los datos localmente después de una reasignación exitosa en Dynamics
   */
  private async actualizarLocalmente(request: ReasignacionRequest): Promise<ReasignacionResponse> {
    try {
      const now = new Date().toISOString();

      // Obtener nombre del nuevo ejecutivo para asesor_asignado
      let ejecutivoNombre: string | null = null;
      if (request.nuevo_ejecutivo_nombre) {
        ejecutivoNombre = request.nuevo_ejecutivo_nombre;
      } else {
        try {
          const ejecutivo = await coordinacionService.getEjecutivoById(request.nuevo_ejecutivo_id);
          if (ejecutivo) {
            ejecutivoNombre = ejecutivo.full_name || ejecutivo.nombre_completo || ejecutivo.nombre || null;
          }
        } catch (error) {
          console.warn('No se pudo obtener nombre del ejecutivo:', error);
        }
      }

      // 1. Actualizar tabla prospectos (base analysis)
      const updateData: Record<string, any> = {
        ejecutivo_id: request.nuevo_ejecutivo_id,
        coordinacion_id: request.nueva_coordinacion_id,
        assignment_date: now,
        updated_at: now
      };

      if (ejecutivoNombre) {
        updateData.asesor_asignado = ejecutivoNombre;
      }

      const { error: prospectoError } = await analysisSupabase
        .from('prospectos')
        .update(updateData)
        .eq('id', request.prospecto_id);

      if (prospectoError) {
        throw prospectoError;
      }

      // 2. Actualizar o crear registro en prospect_assignments (system_ui)
      const { data: existingAssignment } = await supabaseSystemUIAdmin
        .from('prospect_assignments')
        .select('id')
        .eq('prospect_id', request.prospecto_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingAssignment) {
        // Actualizar asignación existente
        await supabaseSystemUIAdmin
          .from('prospect_assignments')
          .update({
            coordinacion_id: request.nueva_coordinacion_id,
            ejecutivo_id: request.nuevo_ejecutivo_id,
            assigned_by: request.reasignado_por_id,
            assignment_type: 'manual',
            assignment_reason: request.motivo || 'Reasignación vía Dynamics',
            updated_at: now
          })
          .eq('id', existingAssignment.id);
      } else {
        // Crear nueva asignación
        await supabaseSystemUIAdmin
          .from('prospect_assignments')
          .insert({
            prospect_id: request.prospecto_id,
            coordinacion_id: request.nueva_coordinacion_id,
            ejecutivo_id: request.nuevo_ejecutivo_id,
            assigned_by: request.reasignado_por_id,
            assignment_type: 'manual',
            assignment_reason: request.motivo || 'Reasignación vía Dynamics',
            is_active: true
          });
      }

      // 3. Registrar en logs de asignación (no crítico)
      try {
        await supabaseSystemUIAdmin
          .from('assignment_logs')
          .insert({
            prospect_id: request.prospecto_id,
            coordinacion_id: request.nueva_coordinacion_id,
            ejecutivo_id: request.nuevo_ejecutivo_id,
            action: 'reassigned_via_dynamics',
            assigned_by: request.reasignado_por_id,
            reason: request.motivo || 'Reasignación vía webhook Dynamics'
          });
      } catch (logError) {
        console.warn('Error registrando log (no crítico):', logError);
      }

      DEBUG && console.log('✅ [DynamicsReasignacion] Actualización local completada');
      
      return {
        success: true,
        message: 'Datos actualizados localmente'
      };

    } catch (error) {
      console.error('❌ [DynamicsReasignacion] Error en actualización local:', error);
      return {
        success: false,
        message: 'Error actualizando datos locales',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar instancia singleton
export const dynamicsReasignacionService = new DynamicsReasignacionService();
export default dynamicsReasignacionService;

