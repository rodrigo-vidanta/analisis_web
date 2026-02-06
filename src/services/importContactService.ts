/**
 * ============================================
 * SERVICIO DE IMPORTACIÓN DE CONTACTOS CRM
 * ============================================
 * 
 * Maneja la importación de contactos desde Dynamics CRM
 * al sistema mediante edge function y N8N webhook.
 * 
 * 🔗 Edge Function: import-contact-proxy
 * 🔗 Webhook: https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm
 * 🔐 Auth: livechat_auth (LIVECHAT_AUTH secret en edge function)
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { getAuthTokenOrThrow } from '../utils/authToken';

// ============================================
// INTERFACES
// ============================================

export interface ImportContactPayload {
  // Datos del ejecutivo que solicita
  ejecutivo_nombre: string;
  ejecutivo_id: string;
  coordinacion_id: string;
  fecha_solicitud: string;
  // Datos del lead de Dynamics (completos)
  lead_dynamics: {
    LeadID: string;
    Nombre: string;
    Email: string;
    EstadoCivil: string | null;
    Ocupacion: string | null;
    Pais: string | null;
    EntidadFederativa: string | null;
    Coordinacion: string | null;
    CoordinacionID: string | null;
    Propietario: string | null;
    OwnerID: string | null;
    FechaUltimaLlamada: string | null;
    Calificacion: string | null;
  };
  // Datos adicionales para el webhook
  telefono: string;
  nombre_completo: string;
  id_dynamics: string;  // Duplicado del LeadID para compatibilidad
}

// Respuesta del webhook (viene en array)
export interface WebhookImportResponse {
  success: boolean;
  prospecto_id: string;
  es_nuevo: boolean;
  message: string;
  data: {
    id: string;
    nombre_completo: string;
    etapa: string;
    origen: string;
    ejecutivo_id: string;
    ejecutivo_nombre: string;
    coordinacion_id: string;
  };
}

export interface ImportContactResponse {
  success: boolean;
  message: string;
  prospecto_id?: string;
  conversacion_id?: string;
  error?: string;
  statusCode?: number;
}

// ============================================
// CLASE DE SERVICIO
// ============================================

class ImportContactService {
  private readonly EDGE_FUNCTION_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL;

  /**
   * Normaliza número de teléfono a 10 dígitos
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-10);
  }

  /**
   * Importa un contacto de Dynamics CRM al sistema
   */
  async importContact(payload: ImportContactPayload): Promise<ImportContactResponse> {
    try {
      // Obtener JWT token (enviado pero no validado por Edge Function por ahora)
      const authToken = await getAuthTokenOrThrow().catch(() => '');

      const url = `${this.EDGE_FUNCTION_URL}/functions/v1/import-contact-proxy`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload)
      });

      const statusCode = response.status;

      // Manejar códigos de estado HTTP
      if (statusCode === 401) {
        return {
          success: false,
          message: 'Error de autenticación',
          error: 'Token de autenticación inválido o expirado',
          statusCode: 401
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        
        // Intentar parsear el error como JSON para obtener mensaje descriptivo
        let errorMessage = `HTTP ${statusCode}: ${errorText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // Usar errorText tal cual
        }
        
        return {
          success: false,
          message: errorMessage,
          error: errorMessage,
          statusCode
        };
      }

      // Leer respuesta como texto primero
      const responseText = await response.text();

      // Intentar parsear como JSON
      let result: WebhookImportResponse[] | WebhookImportResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          message: 'Error al procesar la respuesta del servidor',
          error: `Error de parsing: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`,
          statusCode: 500
        };
      }

      // Normalizar a array si viene como objeto
      const resultArray = Array.isArray(result) ? result : [result];

      // Verificar que haya al menos un elemento
      if (resultArray.length === 0) {
        return {
          success: false,
          message: 'Respuesta inválida del servidor',
          error: 'No se recibieron datos',
          statusCode: 500
        };
      }

      const firstResult = resultArray[0];

      // Verificar si la importación fue exitosa
      if (!firstResult.success) {
        return {
          success: false,
          message: firstResult.message || 'Error al importar el contacto',
          error: 'El webhook reportó un error',
          statusCode: 400
        };
      }

      // Si no hay prospecto_id, buscar por teléfono
      let prospectoId = firstResult.prospecto_id || firstResult.data?.id;
      
      if (!prospectoId) {
        // Esperar 2 segundos para que el backend procese el insert
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const normalizedPhone = this.normalizePhone(payload.telefono);
        
        // Buscar el prospecto recién creado por whatsapp (campo correcto)
        // Buscar también por id_dynamics como respaldo
        const { data: prospecto, error: searchError } = await analysisSupabase
          .from('prospectos')
          .select('id, whatsapp, telefono_principal, id_dynamics')
          .or(`whatsapp.eq.${normalizedPhone},telefono_principal.eq.${normalizedPhone},id_dynamics.eq.${payload.id_dynamics}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (prospecto) {
          prospectoId = prospecto.id;
        }
      }

      // Buscar la conversación asociada al prospecto
      let conversacionId = '';
      
      if (prospectoId) {
        const { data: conversacion } = await analysisSupabase
          .from('conversaciones_whatsapp')
          .select('id')
          .eq('prospecto_id', prospectoId)
          .maybeSingle();
        
        conversacionId = conversacion?.id || '';
      }

      return {
        success: true,
        message: firstResult.message || 'Prospecto importado correctamente',
        prospecto_id: prospectoId,
        conversacion_id: conversacionId,
        statusCode: 200
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al importar el contacto',
        error: error instanceof Error ? error.message : 'Error desconocido',
        statusCode: 500
      };
    }
  }

  /**
   * Valida que el payload tenga todos los campos requeridos
   */
  validatePayload(payload: Partial<ImportContactPayload>): boolean {
    const requiredFields: (keyof ImportContactPayload)[] = [
      'ejecutivo_nombre',
      'ejecutivo_id',
      'coordinacion_id',
      'fecha_solicitud',
      'lead_id',
      'telefono',
      'nombre_completo'
    ];

    return requiredFields.every(field => payload[field] !== undefined && payload[field] !== '');
  }
}

// ============================================
// EXPORTAR INSTANCIA SINGLETON
// ============================================

export const importContactService = new ImportContactService();
export default importContactService;
