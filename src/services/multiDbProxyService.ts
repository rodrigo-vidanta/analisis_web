/**
 * ============================================
 * SERVICIO MULTI-DB PROXY
 * ============================================
 * 
 * Cliente para la Edge Function multi-db-proxy
 * Permite consultas seguras a PQNC_QA y LOGMONITOR
 * sin exponer service_keys en el frontend.
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 15 Enero 2026
 * Actualizado: 16 Enero 2026 (agregado JWT authentication)
 */

import { getValidAccessToken, triggerSessionExpired } from '../utils/authenticatedFetch';

// URL de la Edge Function (en PQNC_AI)
const EDGE_FUNCTIONS_URL = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';

/**
 * Obtiene el JWT del usuario autenticado con refresh proactivo
 * Usa getValidAccessToken que refresca si <60s de expirar
 */
async function getAuthToken(): Promise<string | null> {
  return getValidAccessToken();
}

export type DatabaseName = 'PQNC_QA' | 'LOGMONITOR';
export type Operation = 'select' | 'insert' | 'update' | 'delete';

export interface FilterOperator {
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

export interface ProxyRequest {
  database: DatabaseName;
  operation: Operation;
  table: string;
  select?: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown | FilterOperator>;
  order?: string;
  limit?: number;
  single?: boolean;
}

export interface ProxyResponse<T = unknown> {
  data: T | null;
  error: string | null;
  count?: number;
}

/**
 * Ejecuta una operación en una base de datos externa de forma segura
 */
async function executeProxy<T = unknown>(request: ProxyRequest): Promise<ProxyResponse<T>> {
  try {
    // Obtener JWT del usuario autenticado
    const authToken = await getAuthToken();
    
    if (!authToken) {
      return { 
        data: null, 
        error: 'Authentication required. Please login.' 
      };
    }

    const response = await fetch(
      `${EDGE_FUNCTIONS_URL}/functions/v1/multi-db-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`, // Usar JWT del usuario, no anon_key
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error de conexión' }));
      if (response.status === 401) {
        triggerSessionExpired('Sesión expirada en MultiDbProxy');
      }
      return { data: null, error: errorData.error || `HTTP ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    console.error('[MultiDbProxy] Error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ============================================
// CLIENTE PQNC_QA
// ============================================

export const pqncQaProxy = {
  /**
   * SELECT de tabla
   */
  async select<T = unknown>(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, unknown | FilterOperator>;
      order?: string;
      limit?: number;
      single?: boolean;
    } = {}
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'PQNC_QA',
      operation: 'select',
      table,
      ...options,
    });
  },

  /**
   * INSERT en tabla
   */
  async insert<T = unknown>(
    table: string,
    data: Record<string, unknown>
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'PQNC_QA',
      operation: 'insert',
      table,
      data,
    });
  },

  /**
   * UPDATE en tabla
   */
  async update<T = unknown>(
    table: string,
    data: Record<string, unknown>,
    filters: Record<string, unknown>
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'PQNC_QA',
      operation: 'update',
      table,
      data,
      filters,
    });
  },

  /**
   * DELETE en tabla
   */
  async delete<T = unknown>(
    table: string,
    filters: Record<string, unknown>
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'PQNC_QA',
      operation: 'delete',
      table,
      filters,
    });
  },
};

// ============================================
// CLIENTE LOGMONITOR
// ============================================

export const logMonitorProxy = {
  /**
   * SELECT de tabla
   */
  async select<T = unknown>(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, unknown | FilterOperator>;
      order?: string;
      limit?: number;
      single?: boolean;
    } = {}
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'LOGMONITOR',
      operation: 'select',
      table,
      ...options,
    });
  },

  /**
   * INSERT en tabla
   */
  async insert<T = unknown>(
    table: string,
    data: Record<string, unknown>
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'LOGMONITOR',
      operation: 'insert',
      table,
      data,
    });
  },

  /**
   * UPDATE en tabla
   */
  async update<T = unknown>(
    table: string,
    data: Record<string, unknown>,
    filters: Record<string, unknown>
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'LOGMONITOR',
      operation: 'update',
      table,
      data,
      filters,
    });
  },

  /**
   * DELETE en tabla
   */
  async delete<T = unknown>(
    table: string,
    filters: Record<string, unknown>
  ): Promise<ProxyResponse<T>> {
    return executeProxy<T>({
      database: 'LOGMONITOR',
      operation: 'delete',
      table,
      filters,
    });
  },
};

// ============================================
// EXPORTACIONES
// ============================================

export default {
  pqncQa: pqncQaProxy,
  logMonitor: logMonitorProxy,
  execute: executeProxy,
};
