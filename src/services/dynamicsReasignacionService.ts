/**
 * ============================================
 * SERVICIO DE REASIGNACIÓN VÍA N8N/DYNAMICS
 * ============================================
 *
 * Este servicio maneja la reasignación de prospectos enviando
 * solicitudes via Edge Function → N8N → Dynamics CRM.
 * 
 * Edge Function: ${VITE_EDGE_FUNCTIONS_URL}/functions/v1/dynamics-reasignar-proxy
 * 
 * ⚠️ IMPORTANTE:
 * - Este servicio SOLO envía solicitudes al webhook de N8N
 * - El workflow de N8N es el ÚNICO responsable de actualizar la BD
 * - NO se hace ninguna actualización local desde el frontend
 * - Permisos: admin, administrador_operativo, coordinador, coordinador_calidad
 * 
 * 🔒 SEGURIDAD (Actualizado 2026-01-07):
 * - Las credenciales se obtienen de BD (SystemUI → api_auth_tokens)
 * - NO hardcodear tokens en código
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { coordinacionService } from './coordinacionService';
import { credentialsService } from './credentialsService';
import toast from 'react-hot-toast';
import { formatExecutiveDisplayName } from '../utils/nameFormatter';

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
    // Legacy endpoints (backward compatibility - no auth):
    legacy_auth: 'https://primary-dev-d75a.up.railway.app/webhook/auth_server',
    legacy_verify: 'https://primary-dev-d75a.up.railway.app/webhook/verify_user',
    token: creds.token || import.meta.env.VITE_N8N_DYNAMICS_TOKEN || ''
  };
  return cachedReasignacionCredentials;
}

// Timeout para el webhook (140 segundos - el proceso de Dynamics puede ser muy tardado)
const WEBHOOK_TIMEOUT_MS = 140000;

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
   * IMPORTANTE: El workflow de N8N es el único responsable de actualizar la BD.
   * Este servicio SOLO envía la solicitud al webhook, NO actualiza nada localmente.
   * 
   * @param request - Datos de la reasignación
   * @returns Resultado de la operación
   */
  async reasignarProspecto(request: ReasignacionRequest): Promise<ReasignacionResponse> {
    try {
      // Enviar solicitud al webhook de N8N - el workflow se encarga de todo
      const webhookResponse = await this.enviarWebhook(request);
      
      if (!webhookResponse.success) {
        return webhookResponse;
      }
      
      // El webhook fue exitoso - el workflow de N8N ya actualizó la BD
      return {
        success: true,
        message: 'Prospecto reasignado exitosamente',
        details: {
          prospecto_id: request.prospecto_id,
          ejecutivo_id: request.nuevo_ejecutivo_id,
          coordinacion_id: request.nueva_coordinacion_id,
          dynamics_updated: true
        }
      };

    } catch (error) {
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
    } catch (err) {
      console.warn('[DynamicsReasignacion] Error obteniendo datos nuevo ejecutivo:', err);
    }

    // Obtener datos de la nueva coordinación
    let nuevaCoordinacion: { nombre?: string; codigo?: string } | null = null;
    try {
      nuevaCoordinacion = await coordinacionService.getCoordinacionById(nuevaCoordinacionId);
    } catch (err) {
      console.warn('[DynamicsReasignacion] Error obteniendo datos nueva coordinación:', err);
    }

    // Obtener datos del usuario que reasigna (role_name ya está incluido en user_profiles_v2)
    let reasignadoPor: { full_name?: string; email?: string; role_name?: string } | null = null;
    try {
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('full_name, email, role_name')
        .eq('id', reasignadoPorId)
        .maybeSingle();
      
      if (!error && data) {
        reasignadoPor = {
          full_name: data.full_name,
          email: data.email,
          role_name: data.role_name || undefined
        };
      }
    } catch (err) {
      console.warn('[DynamicsReasignacion] Error obteniendo datos usuario reasignador:', err);
    }

    return {
      prospecto_id: prospectoId,
      nuevo_ejecutivo_id: nuevoEjecutivoId,
      nueva_coordinacion_id: nuevaCoordinacionId,
      ejecutivo_anterior_id: prospecto?.ejecutivo_id || null,
      coordinacion_anterior_id: prospecto?.coordinacion_id || null,
      reasignado_por_id: reasignadoPorId,
      reasignado_por_nombre: formatExecutiveDisplayName(reasignadoPor?.full_name) || undefined,
      reasignado_por_email: reasignadoPor?.email || undefined,
      reasignado_por_rol: reasignadoPor?.role_name || undefined,
      motivo: motivo,
      // Datos del prospecto
      id_dynamics: prospecto?.id_dynamics || null,
      nombre_prospecto: prospecto?.nombre_completo || prospecto?.nombre_whatsapp || null,
      whatsapp_prospecto: prospecto?.whatsapp || null,
      email_prospecto: prospecto?.email || null,
      // Datos del nuevo ejecutivo
      nuevo_ejecutivo_nombre: formatExecutiveDisplayName(nuevoEjecutivo?.full_name || nuevoEjecutivo?.nombre_completo) || null,
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
      // Usar Edge Function en lugar de webhook directo
      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/dynamics-reasignar-proxy`;
      
      const payload = {
        prospecto_id: request.prospecto_id,
        nuevo_ejecutivo_id: request.nuevo_ejecutivo_id,
        nueva_coordinacion_id: request.nueva_coordinacion_id,
        user_id: request.reasignado_por_id,
        user_email: request.reasignado_por_email,
        motivo: request.motivo || 'cambio desde UI'
      };

      // Crear AbortController para el timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      try {
        // Obtener JWT del usuario autenticado para la Edge Function
        // ⚠️ IMPORTANTE: Usar supabaseSystemUI porque ahí está la sesión de auth
        const { data: { session } } = await supabaseSystemUI!.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No hay sesión de usuario activa');
        }
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        // Limpiar timeout si la respuesta llegó
        clearTimeout(timeoutId);

        if (response.ok) {
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

}

// Exportar instancia singleton
export const dynamicsReasignacionService = new DynamicsReasignacionService();
export default dynamicsReasignacionService;

