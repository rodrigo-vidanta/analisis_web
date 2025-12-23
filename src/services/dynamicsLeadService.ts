/**
 * ============================================
 * SERVICIO DE CONSULTA DE LEADS EN DYNAMICS CRM
 * ============================================
 *
 * Este servicio consulta información de leads en Dynamics CRM
 * a través del webhook de N8N.
 *
 * URL Webhook: https://primary-dev-d75a.up.railway.app/webhook/lead-info
 *
 * Tipos de búsqueda soportados:
 * - Por ID de Dynamics (id_dynamics)
 * - Por email
 * - Por teléfono (10 dígitos)
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const N8N_GET_LEAD_DYNAMICS_URL =
  import.meta.env.VITE_N8N_GET_LEAD_DYNAMICS_URL ||
  'https://primary-dev-d75a.up.railway.app/webhook/lead-info';

const N8N_DYNAMICS_TOKEN =
  import.meta.env.VITE_N8N_DYNAMICS_TOKEN ||
  'sAEhQEoCV51Vf0xIiLyrBGJK8OJjRHA1BxHwa2K2ObT2jMC9qtXVVbYX8cRoKYiLmKQfl41l9IWQ79c4GXoqIpgVePyOvDtwWrZJ6Qv1iU8tWd6vxqqhaaG6qG1DrIzjHyJ69pbv2C1lRjMIqSqYGo0wGhPXSMK2EauyWWIBA';

// Timeout para el webhook (30 segundos)
const WEBHOOK_TIMEOUT_MS = 30000;

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

    console.log(`🔍 [DynamicsLead] Buscando lead por ${searchType}:`, request);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      // Construir payload según el tipo de búsqueda
      const payload: Record<string, string> = {};
      if (request.id_dynamics) {
        payload.id_dynamics = request.id_dynamics;
      } else if (request.email) {
        payload.email = request.email;
      } else if (request.phone) {
        // Asegurar que el teléfono tenga 10 dígitos
        payload.phone = request.phone.replace(/\D/g, '').slice(-10);
      }

      const response = await fetch(N8N_GET_LEAD_DYNAMICS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${N8N_DYNAMICS_TOKEN}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DynamicsLead] Error en webhook:', response.status, errorText);
        return {
          success: false,
          data: null,
          error: `Error ${response.status}: ${errorText || 'Error al consultar Dynamics'}`,
          searchType,
        };
      }

      const data = await response.json();
      console.log('✅ [DynamicsLead] Respuesta recibida:', data);

      // El webhook devuelve un array, tomamos el primer elemento
      const leadData = Array.isArray(data) ? data[0] : data;

      if (!leadData || !leadData.LeadID) {
        return {
          success: true,
          data: null,
          error: 'Lead no encontrado en Dynamics',
          searchType,
        };
      }

      return {
        success: true,
        data: leadData as DynamicsLeadInfo,
        searchType,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('⏱️ [DynamicsLead] Timeout al consultar Dynamics');
        return {
          success: false,
          data: null,
          error: 'Timeout: Dynamics no respondió en 30 segundos',
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
    const localCoord = this.normalizeValue(localCoordName);
    const dynamicsCoord = this.normalizeValue(dynamicsCoordName);
    
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
   * Obtiene el color del badge según la calificación de Dynamics
   */
  getCalificacionColor(calificacion: string): string {
    const mapping: Record<string, string> = {
      'Q Premium': 'from-purple-500 to-pink-500',
      'Q Standard': 'from-blue-500 to-cyan-500',
      'Hot Lead': 'from-red-500 to-orange-500',
      'Warm Lead': 'from-yellow-500 to-amber-500',
      'Cold Lead': 'from-gray-500 to-slate-500',
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

