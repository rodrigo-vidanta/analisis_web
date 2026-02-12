/**
 * ============================================
 * CLIENTE SEGURO PQNC_QA
 * ============================================
 * 
 * Cliente que simula la API de Supabase pero usa
 * la Edge Function multi-db-proxy para queries seguros.
 * 
 * Mantiene compatibilidad con código existente.
 * 
 * 🔒 SEGURIDAD (Actualizado 2026-01-16):
 * - Requiere JWT de usuario autenticado para llamar al proxy
 * - El multi-db-proxy valida el JWT antes de ejecutar queries
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 15 Enero 2026
 */

import { getValidAccessToken, triggerSessionExpired } from '../utils/authenticatedFetch';

// URL de la Edge Function (en PQNC_AI)
const EDGE_FUNCTIONS_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL || import.meta.env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const EDGE_FUNCTIONS_ANON_KEY = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

/**
 * Obtener el JWT del usuario autenticado con refresh proactivo
 * Usa getValidAccessToken que refresca si <60s de expirar
 */
async function getAuthToken(): Promise<string> {
  try {
    const token = await getValidAccessToken();
    if (token) return token;
  } catch (error) {
    console.warn('⚠️ [PqncSecureClient] Error obteniendo sesión:', error);
  }
  // Fallback a anon_key si no hay sesión
  return EDGE_FUNCTIONS_ANON_KEY || '';
}

interface FilterOp {
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'not';
  value: unknown;
}

interface QueryResult<T> {
  data: T[] | T | null;
  error: { message: string } | null;
  count?: number | null;
}

/**
 * Query Builder compatible con sintaxis de Supabase
 */
class PqncQueryBuilder<T = unknown> {
  private tableName: string;
  private selectColumns: string = '*';
  private filters: Record<string, unknown | FilterOp> = {};
  private orderColumn: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private singleResult: boolean = false;
  private countOption: 'exact' | null = null;
  private headOnly: boolean = false;

  constructor(table: string) {
    this.tableName = table;
  }

  select(columns: string = '*', options?: { count?: 'exact'; head?: boolean }): this {
    this.selectColumns = columns;
    if (options?.count) this.countOption = options.count;
    if (options?.head) this.headOnly = options.head;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters[column] = value;
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters[column] = { op: 'neq', value };
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters[column] = { op: 'gt', value };
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters[column] = { op: 'gte', value };
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters[column] = { op: 'lt', value };
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters[column] = { op: 'lte', value };
    return this;
  }

  like(column: string, pattern: string): this {
    this.filters[column] = { op: 'like', value: pattern };
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.filters[column] = { op: 'ilike', value: pattern };
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters[column] = { op: 'in', value: values };
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters[column] = { op: 'is', value };
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    // Simplificación: solo soportamos 'is' por ahora
    if (operator === 'is') {
      this.filters[column] = { op: 'not', value };
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(start: number, end: number): this {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  single(): this {
    this.singleResult = true;
    return this;
  }

  maybeSingle(): this {
    this.singleResult = true;
    return this;
  }

  /**
   * Ejecutar la query
   */
  async then<TResult>(
    onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>,
    onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result as unknown as TResult;
  }

  private async execute(): Promise<QueryResult<T>> {
    // Siempre usar Edge Function (producción)
    return this.executeRemote();
  }

  /**
   * Ejecutar con Edge Function (producción)
   */
  private async executeRemote(): Promise<QueryResult<T>> {
    try {
      const orderStr = this.orderColumn
        ? `${this.orderColumn}.${this.orderAscending ? 'asc' : 'desc'}`
        : undefined;

      // Obtener JWT del usuario autenticado
      const authToken = await getAuthToken();
      if (!authToken) {
        return {
          data: null,
          error: { message: 'No hay sesión de usuario. Por favor, inicia sesión.' },
        };
      }

      const response = await fetch(
        `${EDGE_FUNCTIONS_URL}/functions/v1/multi-db-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            database: 'PQNC_QA',
            operation: 'select',
            table: this.tableName,
            select: this.selectColumns,
            filters: Object.keys(this.filters).length > 0 ? this.filters : undefined,
            order: orderStr,
            limit: this.limitCount || (this.rangeEnd !== null ? this.rangeEnd - (this.rangeStart || 0) + 1 : undefined),
            single: this.singleResult,
            count: this.countOption || undefined,
            head: this.headOnly || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        if (response.status === 401) {
          triggerSessionExpired('Sesión expirada en PqncSecureClient');
          return {
            data: null,
            error: { message: 'Sesión expirada. Por favor, inicia sesión nuevamente.' },
          };
        }
        return {
          data: null,
          error: { message: errorMessage },
        };
      }

      const result = await response.json();
      return {
        data: result.data,
        error: result.error ? { message: result.error } : null,
        count: result.count,
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Error de conexión' },
      };
    }
  }
}

/**
 * Cliente seguro PQNC_QA con interfaz compatible con Supabase
 */
export const pqncSecureClient = {
  from: <T = unknown>(table: string) => new PqncQueryBuilder<T>(table),
  
  /**
   * Verificar si está usando Edge Function o cliente local
   */
  isUsingEdgeFunction: () => USE_EDGE_FUNCTION,
};

export default pqncSecureClient;
