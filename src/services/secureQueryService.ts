/**
 * ============================================
 * SERVICIO DE QUERIES SEGURAS
 * ============================================
 * 
 * Reemplaza acceso directo a Supabase con anon_key
 * Usa Edge Function que valida session y usa service_role
 * 
 * Autor: Darig Samuel Rosales Robledo  
 * Fecha: 15 Enero 2026
 * Seguridad: Enterprise Level
 */

const EDGE_FUNCTION_URL = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const EDGE_FUNCTION_ANON_KEY = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

interface SecureQueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  order?: string; // "column.desc" o "column.asc"
  limit?: number;
  offset?: number;
}

interface SecureQueryResponse<T = any> {
  data: T[] | null;
  count?: number;
  error?: string;
}

/**
 * Ejecuta query segura a través de Edge Function
 */
export async function secureQuery<T = any>(
  options: SecureQueryOptions
): Promise<SecureQueryResponse<T>> {
  try {
    // Obtener session_token de localStorage
    const sessionToken = localStorage.getItem('auth_token');
    
    if (!sessionToken) {
      throw new Error('No hay sesión activa');
    }

    // Llamar a Edge Function
    const response = await fetch(
      `${EDGE_FUNCTION_URL}/functions/v1/secure-query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDGE_FUNCTION_ANON_KEY}`,
          'x-session-token': sessionToken
        },
        body: JSON.stringify(options)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[SecureQuery] Error:', error);
      return { data: null, error: error.error || error.message };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[SecureQuery] Exception:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Helper: Convertir de sintaxis Supabase a SecureQuery
 */
export class SecureQueryBuilder<T = any> {
  private options: SecureQueryOptions;

  constructor(table: string) {
    this.options = { table, filters: {} };
  }

  select(columns: string = '*') {
    this.options.select = columns;
    return this;
  }

  eq(column: string, value: any) {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[column] = { eq: value };
    return this;
  }

  in(column: string, values: any[]) {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[column] = { in: values };
    return this;
  }

  ilike(column: string, pattern: string) {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[column] = { ilike: pattern };
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.options.order = `${column}.${direction}`;
    return this;
  }

  limit(count: number) {
    this.options.limit = count;
    return this;
  }

  range(from: number, to: number) {
    this.options.offset = from;
    this.options.limit = to - from + 1;
    return this;
  }

  async execute(): Promise<SecureQueryResponse<T>> {
    return secureQuery<T>(this.options);
  }

  gt(column: string, value: any) {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[column] = { gt: value };
    return this;
  }

  gte(column: string, value: any) {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[column] = { gte: value };
    return this;
  }

  lt(column: string, value: any) {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[column] = { lt: value };
    return this;
  }

  lte(column: string, value: any) {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[column] = { lte: value };
    return this;
  }

  single() {
    this.options.limit = 1;
    return {
      then: async (onfulfilled?: any, onrejected?: any) => {
        const result = await this.execute();
        const singleResult = {
          data: result.data?.[0] || null,
          error: result.error || null
        };
        return onfulfilled ? onfulfilled(singleResult) : singleResult;
      }
    };
  }

  maybeSingle() {
    this.options.limit = 1;
    return {
      then: async (onfulfilled?: any, onrejected?: any) => {
        const result = await this.execute();
        const singleResult = {
          data: result.data?.[0] || null,
          error: result.error || null
        };
        return onfulfilled ? onfulfilled(singleResult) : singleResult;
      }
    };
  }

  // Compatibilidad con sintaxis de Supabase
  then(
    onfulfilled?: ((value: SecureQueryResponse<T>) => any) | null,
    onrejected?: ((reason: any) => any) | null
  ): Promise<any> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

/**
 * Cliente seguro compatible con sintaxis de Supabase
 */
export const secureSupabase = {
  from: <T = any>(table: string) => new SecureQueryBuilder<T>(table),
  
  // Stub para .channel() (Realtime no soportado aún)
  channel: (name: string) => ({
    on: () => ({ subscribe: () => ({}) }),
    subscribe: () => ({}),
    unsubscribe: () => Promise.resolve({})
  }),
  
  // Stub para .rpc() (llamadas RPC no soportadas aún)
  rpc: async (fnName: string, params?: any) => {
    console.warn('[SecureSupabase] RPC not supported yet:', fnName);
    return { data: null, error: 'RPC not implemented in secure mode' };
  }
};

/**
 * Función helper para migración gradual
 * Reemplaza: analysisSupabase.from('table')
 * Por: secureFrom('table')
 */
export function secureFrom<T = any>(table: string) {
  return new SecureQueryBuilder<T>(table);
}
