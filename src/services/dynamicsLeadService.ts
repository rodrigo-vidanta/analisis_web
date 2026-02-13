/**
 * ============================================
 * SERVICIO DE CONSULTA DE LEADS EN DYNAMICS CRM
 * ============================================
 *
 * Este servicio consulta información de leads en Dynamics CRM
 * a través de Edge Function → N8N.
 *
 * Edge Function: ${VITE_EDGE_FUNCTIONS_URL}/functions/v1/dynamics-lead-proxy
 *
 * Tipos de búsqueda soportados:
 * - Por ID de Dynamics (id_dynamics)
 * - Por email
 * - Por teléfono (10 dígitos)
 * 
 * 🔒 SEGURIDAD (Actualizado 2026-01-07):
 * - Las credenciales se obtienen de BD (SystemUI → api_auth_tokens)
 * - NO hardcodear tokens en código
 */

import { credentialsService } from './credentialsService';
import { analysisSupabase } from '../config/analysisSupabase';
import { getValidAccessToken, triggerSessionExpired } from '../utils/authenticatedFetch';

// ============================================
// CONFIGURACIÓN
// ============================================

// Cache de credenciales (se carga dinámicamente)
let cachedCredentials: { url: string; token: string } | null = null;

// Función para limpiar el cache (útil cuando se actualizan credenciales)
export function clearDynamicsCredentialsCache() {
  cachedCredentials = null;
  // También limpiar el cache del servicio de credenciales
  credentialsService.clearCache();
  // Log sin datos sensibles
  if (import.meta.env.DEV) {
    console.log('🔄 [DynamicsLead] Cache de credenciales limpiado');
  }
}

// Función para obtener credenciales de forma segura
async function getDynamicsCredentials(): Promise<{ url: string; token: string }> {
  // Si el cache tiene valores válidos (no vacíos), usarlo
  if (cachedCredentials && cachedCredentials.token && cachedCredentials.token.trim() !== '' && cachedCredentials.url) {
    return cachedCredentials;
  }
  
  // Limpiar cache si tiene valores inválidos
  if (cachedCredentials && (!cachedCredentials.token || cachedCredentials.token.trim() === '')) {
    cachedCredentials = null;
  }
  
  // Limpiar cache del servicio de credenciales para forzar recarga de BD
  credentialsService.clearCache();
  
  // Obtener credenciales desde BD
  const creds = await credentialsService.getDynamicsWebhookCredentials();
  
  // Verificar que las credenciales sean válidas
  const token = creds.token || import.meta.env.VITE_N8N_DYNAMICS_TOKEN || '';
  // Legacy auth endpoints (kept for backward compatibility)
  const legacyEndpoints = {
    auth: 'https://primary-dev-d75a.up.railway.app/webhook/auth_server',
    verify: 'https://primary-dev-d75a.up.railway.app/webhook/verify_user'
  };
  
  const url = creds.getLeadUrl || 'https://primary-dev-d75a.up.railway.app/webhook/lead-info';
  // Old auth validation endpoint (no longer used but kept for reference):
  const AUTH_SERVER_LEGACY = 'https://primary-dev-d75a.up.railway.app/webhook/auth_server';
  
  // Solo guardar en cache si el token es válido
  if (token && token.trim() !== '') {
    cachedCredentials = { url, token };
  } else {
    cachedCredentials = null;
    console.error('❌ [DynamicsLead] Token no encontrado. Verifica credenciales en Administración > API Auth Tokens (módulo: Dynamics, key: TOKEN)');
  }
  
  return { url, token };
}

// Timeout para el webhook (90 segundos - 1:30 minutos)
const WEBHOOK_TIMEOUT_MS = 90000;

// ============================================
// INTERFACES
// ============================================

export interface DynamicsLeadInfo {
  LeadID: string;
  Nombre: string;
  Email: string;
  EstadoCivil: string;
  Ocupacion: string;
  Pais: string;
  EntidadFederativa: string;
  Coordinacion: string;
  CoordinacionID: string;
  Propietario: string;
  OwnerID: string;
  FechaUltimaLlamada: string | null;
  Calificacion: string;
}

export interface LeadSearchRequest {
  id_dynamics?: string;
  email?: string;
  phone?: string;
  /** ID del prospecto en la tabla local (prospectos.id) */
  id_prospecto?: string;
}

export interface LeadSearchResponse {
  success: boolean;
  data: DynamicsLeadInfo | null;
  error?: string;
  searchType: 'id_dynamics' | 'email' | 'phone';
}

export interface LeadDiscrepancy {
  field: string;
  fieldLabel: string;
  localValue: string | null;
  dynamicsValue: string | null;
  severity: 'info' | 'warning' | 'error';
}

export interface LeadFieldComparison {
  field: string;
  fieldLabel: string;
  localValue: string | null;
  dynamicsValue: string | null;
  isSynced: boolean;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface LeadComparisonResult {
  hasDiscrepancies: boolean;
  discrepancies: LeadDiscrepancy[];
  allFields: LeadFieldComparison[]; // Todos los campos comparados (sync y no sync)
  localData: Record<string, any>;
  dynamicsData: DynamicsLeadInfo | null;
  syncStatus: 'synced' | 'out_of_sync' | 'not_found' | 'error';
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class DynamicsLeadService {
  /**
   * Busca un lead en Dynamics por ID, email o teléfono
   */
  async searchLead(request: LeadSearchRequest): Promise<LeadSearchResponse> {
    const searchType = request.id_dynamics ? 'id_dynamics' : request.email ? 'email' : 'phone';

      // Solo log en desarrollo, sin datos sensibles (email, phone)
      if (import.meta.env.DEV) {
        // Log de búsqueda - silencioso en producción
      }

    try {
      // Usar Edge Function en lugar de webhook directo
      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/dynamics-lead-proxy`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      // Construir payload según el tipo de búsqueda
      const payload: Record<string, string> = {};
      
      // Siempre incluir id_prospecto si está disponible
      if (request.id_prospecto) {
        payload.id_prospecto = request.id_prospecto;
      }
      
      if (request.id_dynamics) {
        payload.id_dynamics = request.id_dynamics;
      } else if (request.email) {
        payload.email = request.email;
      } else if (request.phone) {
        // Asegurar que el teléfono tenga 10 dígitos
        payload.phone = request.phone.replace(/\D/g, '').slice(-10);
      }

      // Obtener JWT con refresh proactivo (refresca si <60s de expirar)
      const accessToken = await getValidAccessToken();

      if (!accessToken) {
        console.error('❌ [DynamicsLead] No hay sesión activa');
        triggerSessionExpired('No hay sesión activa en DynamicsLeadService');
        return {
          success: false,
          data: null,
          error: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
          searchType,
        };
      }

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DynamicsLead] Error en Edge Function:', response.status, errorText);
        
        // Mensaje según código de error
        let errorMessage = `Error ${response.status}: ${errorText || 'Error al consultar Dynamics'}`;
        
        if (response.status === 401) {
          triggerSessionExpired('Sesión expirada en DynamicsLeadService');
          errorMessage = 'Sesión expirada. Por favor, recarga la página e inicia sesión nuevamente.';
        } else if (response.status === 500 && errorText.includes('DYNAMICS_TOKEN')) {
          errorMessage = 'Error: El token de Dynamics no está configurado en los secrets de Edge Functions. Contacta al administrador.';
        }
        
        return {
          success: false,
          data: null,
          error: errorMessage,
          searchType,
        };
      }

      const data = await response.json();
      // Solo log en desarrollo, sin exponer datos del lead
      if (import.meta.env.DEV) {
        // Respuesta recibida - silencioso en producción
      }

      // El webhook devuelve un array, tomamos el primer elemento
      const leadData = Array.isArray(data) ? data[0] : data;

      // El webhook puede retornar LeadID o ID_Dynamics dependiendo del tipo de búsqueda
      const leadId = leadData?.LeadID || leadData?.ID_Dynamics;

      if (!leadData || !leadId) {
        // Verificar si hay algún dato válido (ej: status_crm solamente)
        if (leadData && Object.keys(leadData).length > 0 && leadData.Nombre !== undefined) {
          // Normalizar el campo LeadID si viene como ID_Dynamics
          const normalizedData = {
            ...leadData,
            LeadID: leadId || leadData.ID_Dynamics || '',
          };
          return {
            success: true,
            data: normalizedData as DynamicsLeadInfo,
            searchType,
          };
        }
        return {
          success: true,
          data: null,
          error: 'Lead no encontrado en Dynamics',
          searchType,
        };
      }

      // Normalizar el campo LeadID si viene como ID_Dynamics
      const normalizedData = {
        ...leadData,
        LeadID: leadId,
      };

      return {
        success: true,
        data: normalizedData as DynamicsLeadInfo,
        searchType,
      };
      } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('⏱️ [DynamicsLead] Timeout al consultar Dynamics');
        return {
          success: false,
          data: null,
          error: 'Timeout: Dynamics no respondió en 90 segundos',
          searchType,
        };
      }

      console.error('❌ [DynamicsLead] Error de red:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error de conexión',
        searchType,
      };
    }
  }

  /**
   * Compara datos locales de un prospecto con datos de Dynamics
   * 
   * IMPORTANTE: Para ejecutivo y coordinación, comparamos IDs (no nombres)
   * - ejecutivo_id_dynamics (local) vs OwnerID (Dynamics)
   * - Se muestra el nombre visualmente pero la validación es por ID
   * 
   * Retorna TODOS los campos comparados (sincronizados y con discrepancias)
   */
  compareLeadData(
    localData: Record<string, any>,
    dynamicsData: DynamicsLeadInfo | null
  ): LeadComparisonResult {
    if (!dynamicsData) {
      return {
        hasDiscrepancies: false,
        discrepancies: [],
        allFields: [],
        localData,
        dynamicsData: null,
        syncStatus: 'not_found',
      };
    }

    const discrepancies: LeadDiscrepancy[] = [];
    const allFields: LeadFieldComparison[] = [];

    // ============================================
    // 1. COMPARAR EJECUTIVO POR ID (CRÍTICO)
    // ============================================
    const localEjecutivoIdDynamics = localData.ejecutivo_id_dynamics;
    const dynamicsOwnerID = dynamicsData.OwnerID;
    const localEjecutivoDisplay = localData.ejecutivo_nombre || 'Sin asignar';
    const dynamicsEjecutivoDisplay = dynamicsData.Propietario || 'Sin asignar';

    let ejecutivoSynced = true;
    let ejecutivoSeverity: LeadFieldComparison['severity'] = 'success';

    if (localEjecutivoIdDynamics && dynamicsOwnerID) {
      const normalizedLocalId = this.normalizeUUID(localEjecutivoIdDynamics);
      const normalizedDynamicsId = this.normalizeUUID(dynamicsOwnerID);

      if (normalizedLocalId !== normalizedDynamicsId) {
        ejecutivoSynced = false;
        ejecutivoSeverity = 'error';
        discrepancies.push({
          field: 'ejecutivo_id_dynamics',
          fieldLabel: 'Propietario/Ejecutivo',
          localValue: localEjecutivoDisplay,
          dynamicsValue: dynamicsEjecutivoDisplay,
          severity: 'error',
        });
      }
    } else if (!localEjecutivoIdDynamics && dynamicsOwnerID) {
      ejecutivoSynced = false;
      ejecutivoSeverity = 'warning';
      discrepancies.push({
        field: 'ejecutivo_id_dynamics',
        fieldLabel: 'Propietario/Ejecutivo',
        localValue: `${localEjecutivoDisplay} (Sin ID Dynamics)`,
        dynamicsValue: dynamicsEjecutivoDisplay,
        severity: 'warning',
      });
    }

    allFields.push({
      field: 'ejecutivo',
      fieldLabel: 'Propietario/Ejecutivo',
      localValue: localEjecutivoDisplay,
      dynamicsValue: dynamicsEjecutivoDisplay,
      isSynced: ejecutivoSynced,
      severity: ejecutivoSeverity,
    });

    // ============================================
    // 2. COMPARAR COORDINACIÓN
    // ============================================
    const localCoordName = localData.coordinacion_nombre || '';
    const dynamicsCoordName = dynamicsData.Coordinacion || '';
    // Usar normalización específica para coordinaciones (maneja equivalencias)
    const localCoord = this.normalizeCoordinacion(localCoordName);
    const dynamicsCoord = this.normalizeCoordinacion(dynamicsCoordName);
    
    let coordSynced = localCoord === dynamicsCoord || (!localCoord && !dynamicsCoord);
    let coordSeverity: LeadFieldComparison['severity'] = coordSynced ? 'success' : 'error';

    if (!coordSynced) {
      discrepancies.push({
        field: 'coordinacion_nombre',
        fieldLabel: 'Coordinación',
        localValue: localCoordName || null,
        dynamicsValue: dynamicsCoordName || null,
        severity: 'error',
      });
    }

    allFields.push({
      field: 'coordinacion',
      fieldLabel: 'Coordinación',
      localValue: localCoordName || '—',
      dynamicsValue: dynamicsCoordName || '—',
      isSynced: coordSynced,
      severity: coordSeverity,
    });

    // ============================================
    // 3. COMPARAR EMAIL
    // ============================================
    const localEmailVal = localData.email || '';
    const dynamicsEmailRaw = dynamicsData.Email || '';
    const dynamicsEmailClean = dynamicsEmailRaw.split(';')[0]?.replace(/[<>]/g, '').trim() || '';
    const localEmail = this.normalizeValue(localEmailVal);
    const dynamicsEmail = this.normalizeValue(dynamicsEmailClean);
    
    let emailSynced = localEmail === dynamicsEmail || (!localEmail && !dynamicsEmail);
    let emailSeverity: LeadFieldComparison['severity'] = emailSynced ? 'success' : 'warning';

    if (!emailSynced && localEmail && dynamicsEmail) {
      discrepancies.push({
        field: 'email',
        fieldLabel: 'Email',
        localValue: localEmailVal,
        dynamicsValue: dynamicsEmailClean,
        severity: 'warning',
      });
    }

    allFields.push({
      field: 'email',
      fieldLabel: 'Email',
      localValue: localEmailVal || '—',
      dynamicsValue: dynamicsEmailClean || '—',
      isSynced: emailSynced,
      severity: emailSeverity,
    });

    // ============================================
    // 4. COMPARAR NOMBRE (solo visual, no genera discrepancia)
    // ============================================
    const localNombre = localData.nombre_completo || localData.nombre_whatsapp || '';
    const dynamicsNombre = dynamicsData.Nombre || '';

    allFields.push({
      field: 'nombre',
      fieldLabel: 'Nombre',
      localValue: localNombre || '—',
      dynamicsValue: dynamicsNombre || '—',
      isSynced: true, // Nombres no generan discrepancia (solo diferencias de formato)
      severity: 'success',
    });

    // ============================================
    // 5. CALIFICACIÓN (solo Dynamics)
    // ============================================
    allFields.push({
      field: 'calificacion',
      fieldLabel: 'Calificación CRM',
      localValue: '—',
      dynamicsValue: dynamicsData.Calificacion || '—',
      isSynced: true,
      severity: 'info',
    });

    // ============================================
    // 6. ÚLTIMA LLAMADA (solo Dynamics)
    // ============================================
    allFields.push({
      field: 'ultima_llamada',
      fieldLabel: 'Última Llamada',
      localValue: '—',
      dynamicsValue: this.formatFechaUltimaLlamada(dynamicsData.FechaUltimaLlamada),
      isSynced: true,
      severity: 'info',
    });

    // ============================================
    // 7. PAÍS (solo Dynamics)
    // ============================================
    allFields.push({
      field: 'pais',
      fieldLabel: 'País',
      localValue: '—',
      dynamicsValue: dynamicsData.Pais || '—',
      isSynced: true,
      severity: 'info',
    });

    return {
      hasDiscrepancies: discrepancies.length > 0,
      discrepancies,
      allFields,
      localData,
      dynamicsData,
      syncStatus: discrepancies.length > 0 ? 'out_of_sync' : 'synced',
    };
  }

  /**
   * Normaliza un UUID para comparación
   */
  private normalizeUUID(uuid: string | null | undefined): string {
    if (!uuid) return '';
    return uuid.toLowerCase().trim().replace(/-/g, '');
  }

  /**
   * Normaliza un valor para comparación
   */
  private normalizeValue(value: any): string {
    if (!value) return '';
    return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Normaliza el estado civil de Dynamics al formato local
   */
  private normalizeEstadoCivil(value: string): string {
    const mapping: Record<string, string> = {
      married: 'casado',
      single: 'soltero',
      divorced: 'divorciado',
      widowed: 'viudo',
      'free union': 'unión libre',
    };
    return mapping[value?.toLowerCase()] || value;
  }

  /**
   * Normaliza la coordinación para comparación
   * Mapea nombres equivalentes entre sistemas locales y Dynamics
   */
  private normalizeCoordinacion(value: string): string {
    if (!value) return '';
    
    // Mapa de equivalencias: clave es el valor normalizado, valores son variantes
    const equivalencias: Record<string, string[]> = {
      'cob acapulco': ['cob aca', 'cob acapulco', 'acapulco'],
      'cob cancun': ['cob can', 'cob cancun', 'cancun'],
      'cob cdmx': ['cob cdmx', 'cob mexico', 'cdmx', 'ciudad de mexico'],
      'cob guadalajara': ['cob gdl', 'cob guadalajara', 'guadalajara'],
      'cob monterrey': ['cob mty', 'cob monterrey', 'monterrey'],
      'cob los cabos': ['cob cab', 'cob los cabos', 'los cabos', 'cabos'],
      'cob puerto vallarta': ['cob pv', 'cob puerto vallarta', 'puerto vallarta', 'vallarta'],
      'cob riviera maya': ['cob rm', 'cob riviera maya', 'riviera maya'],
      'cob nuevo vallarta': ['cob nv', 'cob nuevo vallarta', 'nuevo vallarta'],
    };
    
    const normalized = value.toLowerCase().trim();
    
    // Buscar si el valor coincide con alguna variante
    for (const [canonical, variants] of Object.entries(equivalencias)) {
      if (variants.some(v => normalized === v || normalized.includes(v))) {
        return canonical;
      }
    }
    
    // Si no hay equivalencia, devolver el valor normalizado
    return normalized;
  }

  /**
   * Obtiene el color del badge según la calificación de Dynamics
   */
  getCalificacionColor(calificacion: string): string {
    const mapping: Record<string, string> = {
      'Q Premium': 'from-purple-500 to-pink-500',
      'Q Standard': 'from-blue-500 to-cyan-500',
      'Hot Lead': 'from-red-500 to-orange-500',
      'Warm Lead': 'from-yellow-500 to-amber-500',
      'Cold Lead': 'from-gray-500 to-gray-500',
    };
    return mapping[calificacion] || 'from-gray-400 to-gray-500';
  }

  /**
   * Formatea la fecha de última llamada
   */
  formatFechaUltimaLlamada(fecha: string | null): string {
    if (!fecha) return 'Sin registro';

    try {
      const date = new Date(fecha);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;

      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return fecha;
    }
  }
}

// Exportar instancia singleton
export const dynamicsLeadService = new DynamicsLeadService();
export default dynamicsLeadService;

