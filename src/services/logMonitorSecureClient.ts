/**
 * ============================================
 * CLIENTE SEGURO LOGMONITOR
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

import { supabaseLogMonitorAdmin } from '../config/supabaseLogMonitor';
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
    console.warn('⚠️ [LogMonitorSecureClient] Error obteniendo sesión:', error);
  }
  // Fallback a anon_key si no hay sesión
  return EDGE_FUNCTIONS_ANON_KEY || '';
}

// Determinar si usar Edge Function (producción) o cliente directo (desarrollo)
const USE_EDGE_FUNCTION = !supabaseLogMonitorAdmin;

interface FilterOp {
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'not' | 'contains' | 'containedBy';
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
class LogMonitorQueryBuilder<T = unknown> {
  private tableName: string;
  private selectColumns: string = '*';
  private filters: Record<string, unknown | FilterOp> = {};
  private orFilters: string[] = [];
  private orderColumn: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private singleResult: boolean = false;
  private maybeSingleResult: boolean = false; // Nuevo: permite 0 o 1
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
    if (operator === 'is') {
      this.filters[column] = { op: 'not', value };
    }
    return this;
  }

  contains(column: string, value: unknown): this {
    this.filters[column] = { op: 'contains', value };
    return this;
  }

  containedBy(column: string, value: unknown): this {
    this.filters[column] = { op: 'containedBy', value };
    return this;
  }

  or(conditions: string): this {
    this.orFilters.push(conditions);
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
    this.maybeSingleResult = false;
    return this;
  }

  maybeSingle(): this {
    this.maybeSingleResult = true;
    this.singleResult = false;
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
    // Si hay cliente local disponible, usarlo (desarrollo)
    if (!USE_EDGE_FUNCTION && supabaseLogMonitorAdmin) {
      return this.executeLocal();
    }

    // Usar Edge Function (producción)
    return this.executeRemote();
  }

  /**
   * Ejecutar con cliente local (desarrollo)
   */
  private async executeLocal(): Promise<QueryResult<T>> {
    try {
      let query = supabaseLogMonitorAdmin!
        .from(this.tableName)
        .select(this.selectColumns, {
          count: this.countOption || undefined,
          head: this.headOnly,
        });

      // Aplicar filtros
      for (const [column, filter] of Object.entries(this.filters)) {
        if (typeof filter === 'object' && filter !== null && 'op' in filter) {
          const f = filter as FilterOp;
          switch (f.op) {
            case 'eq': query = query.eq(column, f.value); break;
            case 'neq': query = query.neq(column, f.value); break;
            case 'gt': query = query.gt(column, f.value); break;
            case 'gte': query = query.gte(column, f.value); break;
            case 'lt': query = query.lt(column, f.value); break;
            case 'lte': query = query.lte(column, f.value); break;
            case 'like': query = query.like(column, f.value as string); break;
            case 'ilike': query = query.ilike(column, f.value as string); break;
            case 'in': query = query.in(column, f.value as unknown[]); break;
            case 'is': query = query.is(column, f.value); break;
            case 'not': query = query.not(column, 'is', f.value); break;
            case 'contains': query = query.contains(column, f.value); break;
            case 'containedBy': query = query.containedBy(column, f.value); break;
          }
        } else {
          query = query.eq(column, filter);
        }
      }

      // Aplicar OR filters
      for (const orFilter of this.orFilters) {
        query = query.or(orFilter);
      }

      // Ordenamiento
      if (this.orderColumn) {
        query = query.order(this.orderColumn, { ascending: this.orderAscending });
      }

      // Rango
      if (this.rangeStart !== null && this.rangeEnd !== null) {
        query = query.range(this.rangeStart, this.rangeEnd);
      }

      // Límite
      if (this.limitCount !== null) {
        query = query.limit(this.limitCount);
      }

      // Ejecutar
      let result;
      if (this.maybeSingleResult) {
        result = await query.maybeSingle();
      } else if (this.singleResult) {
        result = await query.single();
      } else {
        result = await query;
      }

      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
        count: result.count,
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Error desconocido' },
      };
    }
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
            database: 'LOGMONITOR',
            operation: 'select',
            table: this.tableName,
            select: this.selectColumns,
            filters: Object.keys(this.filters).length > 0 ? this.filters : undefined,
            order: orderStr,
            limit: this.limitCount || (this.rangeEnd !== null ? this.rangeEnd - (this.rangeStart || 0) + 1 : undefined),
            single: this.singleResult,
            maybeSingle: this.maybeSingleResult,
            count: this.countOption || undefined,
            head: this.headOnly || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        // Mensaje más amigable para errores de autenticación
        if (response.status === 401) {
          triggerSessionExpired('Sesión expirada en LogMonitorSecureClient');
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
 * Insert Builder para operaciones de escritura
 */
class LogMonitorInsertBuilder<T = unknown> {
  private tableName: string;
  private insertData: Record<string, unknown>;

  constructor(table: string, data: Record<string, unknown>) {
    this.tableName = table;
    this.insertData = data;
  }

  select(): this {
    return this;
  }

  single(): this {
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result as unknown as TResult;
  }

  private async execute(): Promise<QueryResult<T>> {
    if (!USE_EDGE_FUNCTION && supabaseLogMonitorAdmin) {
      const result = await supabaseLogMonitorAdmin
        .from(this.tableName)
        .insert(this.insertData)
        .select()
        .single();
      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
      };
    }

    // Usar Edge Function
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        return { data: null, error: { message: 'No hay sesión de usuario' } };
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
            database: 'LOGMONITOR',
            operation: 'insert',
            table: this.tableName,
            data: this.insertData,
          }),
        }
      );

      const result = await response.json();
      return {
        data: result.data?.[0] || result.data,
        error: result.error ? { message: result.error } : null,
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
 * Update Builder para operaciones de actualización
 */
class LogMonitorUpdateBuilder<T = unknown> {
  private tableName: string;
  private updateData: Record<string, unknown>;
  private filters: Record<string, unknown> = {};

  constructor(table: string, data: Record<string, unknown>) {
    this.tableName = table;
    this.updateData = data;
  }

  eq(column: string, value: unknown): this {
    this.filters[column] = value;
    return this;
  }

  select(): this {
    return this;
  }

  single(): this {
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result as unknown as TResult;
  }

  private async execute(): Promise<QueryResult<T>> {
    if (!USE_EDGE_FUNCTION && supabaseLogMonitorAdmin) {
      let query = supabaseLogMonitorAdmin
        .from(this.tableName)
        .update(this.updateData);
      
      for (const [key, value] of Object.entries(this.filters)) {
        query = query.eq(key, value);
      }
      
      const result = await query.select().single();
      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
      };
    }

    // Usar Edge Function
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        return { data: null, error: { message: 'No hay sesión de usuario' } };
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
            database: 'LOGMONITOR',
            operation: 'update',
            table: this.tableName,
            data: this.updateData,
            filters: this.filters,
          }),
        }
      );

      const result = await response.json();
      return {
        data: result.data?.[0] || result.data,
        error: result.error ? { message: result.error } : null,
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
 * Delete Builder para operaciones de eliminación
 */
class LogMonitorDeleteBuilder<T = unknown> {
  private tableName: string;
  private filters: Record<string, unknown> = {};

  constructor(table: string) {
    this.tableName = table;
  }

  eq(column: string, value: unknown): this {
    this.filters[column] = value;
    return this;
  }

  async then<TResult>(
    onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    const result = await this.execute();
    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result as unknown as TResult;
  }

  private async execute(): Promise<QueryResult<T>> {
    if (!USE_EDGE_FUNCTION && supabaseLogMonitorAdmin) {
      let query = supabaseLogMonitorAdmin
        .from(this.tableName)
        .delete();
      
      for (const [key, value] of Object.entries(this.filters)) {
        query = query.eq(key, value);
      }
      
      const result = await query;
      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
      };
    }

    // Usar Edge Function
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        return { data: null, error: { message: 'No hay sesión de usuario' } };
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
            database: 'LOGMONITOR',
            operation: 'delete',
            table: this.tableName,
            filters: this.filters,
          }),
        }
      );

      const result = await response.json();
      return {
        data: result.data,
        error: result.error ? { message: result.error } : null,
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
 * Table Builder que permite encadenar operaciones
 */
class LogMonitorTableBuilder<T = unknown> {
  private tableName: string;

  constructor(table: string) {
    this.tableName = table;
  }

  select(columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    const builder = new LogMonitorQueryBuilder<T>(this.tableName);
    return builder.select(columns, options);
  }

  insert(data: Record<string, unknown>) {
    return new LogMonitorInsertBuilder<T>(this.tableName, data);
  }

  update(data: Record<string, unknown>) {
    return new LogMonitorUpdateBuilder<T>(this.tableName, data);
  }

  delete() {
    return new LogMonitorDeleteBuilder<T>(this.tableName);
  }
}

/**
 * Cliente seguro LogMonitor con interfaz compatible con Supabase
 */
export const logMonitorSecureClient = {
  from: <T = unknown>(table: string) => new LogMonitorTableBuilder<T>(table),
  
  /**
   * Verificar si está usando Edge Function o cliente local
   */
  isUsingEdgeFunction: () => USE_EDGE_FUNCTION,
  
  /**
   * Verificar si el cliente está disponible
   */
  isAvailable: () => true, // Siempre disponible (usa Edge Function como fallback)
};

export default logMonitorSecureClient;
