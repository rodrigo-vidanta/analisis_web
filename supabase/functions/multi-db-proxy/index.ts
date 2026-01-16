/**
 * ============================================
 * EDGE FUNCTION: MULTI-DB PROXY
 * ============================================
 * 
 * Proxy seguro para consultas a múltiples bases de datos:
 * - PQNC_QA (hmmfuhqgvsehkizlfzga) - Feedback, Bookmarks, Llamadas PQNC
 * - LOGMONITOR (dffuwdzybhypxfzrmdcz) - Sistema de Logs
 * 
 * Las service_keys NO están en el bundle del frontend.
 * Están almacenadas en los SECRETS de esta Edge Function.
 * 
 * SECRETS REQUERIDOS (configurar en Supabase Dashboard):
 * - PQNC_QA_SERVICE_KEY
 * - LOGMONITOR_SERVICE_KEY
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 15 Enero 2026
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// URLs de las bases de datos
const DB_URLS: Record<string, string> = {
  'PQNC_QA': 'https://hmmfuhqgvsehkizlfzga.supabase.co',
  'LOGMONITOR': 'https://dffuwdzybhypxfzrmdcz.supabase.co',
};

// Tablas permitidas por base de datos
const ALLOWED_TABLES: Record<string, string[]> = {
  'PQNC_QA': [
    'calls',
    'call_segments',
    'call_feedback',
    'call_bookmarks',
    'bookmarks',
    'user_bookmarks',
    'call_results',
    'call_analysis',
    'agent_performance',
    'auth_users',
  ],
  'LOGMONITOR': [
    'error_log',
    'ui_error_log_status',
    'ui_error_log_annotations',
    'ui_error_log_tags',
    'ui_error_log_ai_analysis',
  ],
};

// Operaciones permitidas
type Operation = 'select' | 'insert' | 'update' | 'delete';

interface ProxyRequest {
  database: 'PQNC_QA' | 'LOGMONITOR';
  operation: Operation;
  table: string;
  select?: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  order?: string;
  limit?: number;
  single?: boolean;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body
    const body: ProxyRequest = await req.json();
    const { database, operation, table, select, data, filters, order, limit, single } = body;

    // Validar database
    if (!database || !DB_URLS[database]) {
      return new Response(
        JSON.stringify({ error: `Database inválida: ${database}. Válidas: ${Object.keys(DB_URLS).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar tabla
    const allowedTables = ALLOWED_TABLES[database] || [];
    if (!allowedTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Tabla '${table}' no permitida para ${database}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar operación
    const validOps: Operation[] = ['select', 'insert', 'update', 'delete'];
    if (!validOps.includes(operation)) {
      return new Response(
        JSON.stringify({ error: `Operación inválida: ${operation}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener service key del secret correspondiente
    const serviceKeyEnvName = `${database}_SERVICE_KEY`;
    const serviceKey = Deno.env.get(serviceKeyEnvName);

    if (!serviceKey) {
      console.error(`Secret ${serviceKeyEnvName} no configurado`);
      return new Response(
        JSON.stringify({ error: `Credenciales no configuradas para ${database}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase con service_key
    const supabase = createClient(DB_URLS[database], serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Ejecutar operación
    let query;
    
    switch (operation) {
      case 'select': {
        query = supabase.from(table).select(select || '*');
        
        // Aplicar filtros
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (typeof value === 'object' && value !== null) {
              // Filtros complejos: { column: { op: 'gt', value: 10 } }
              const filterObj = value as { op: string; value: unknown };
              switch (filterObj.op) {
                case 'eq': query = query.eq(key, filterObj.value); break;
                case 'neq': query = query.neq(key, filterObj.value); break;
                case 'gt': query = query.gt(key, filterObj.value); break;
                case 'gte': query = query.gte(key, filterObj.value); break;
                case 'lt': query = query.lt(key, filterObj.value); break;
                case 'lte': query = query.lte(key, filterObj.value); break;
                case 'like': query = query.like(key, filterObj.value as string); break;
                case 'ilike': query = query.ilike(key, filterObj.value as string); break;
                case 'in': query = query.in(key, filterObj.value as unknown[]); break;
                case 'is': query = query.is(key, filterObj.value); break;
              }
            } else {
              // Filtro simple: { column: value } => eq
              query = query.eq(key, value);
            }
          }
        }
        
        // Ordenamiento
        if (order) {
          const [column, direction] = order.split('.');
          query = query.order(column, { ascending: direction !== 'desc' });
        }
        
        // Límite
        if (limit) {
          query = query.limit(limit);
        }
        
        break;
      }
      
      case 'insert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Se requiere "data" para insert' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        query = supabase.from(table).insert(data).select();
        break;
      }
      
      case 'update': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Se requiere "data" para update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!filters || Object.keys(filters).length === 0) {
          return new Response(
            JSON.stringify({ error: 'Se requieren "filters" para update (seguridad)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        query = supabase.from(table).update(data);
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
        query = query.select();
        break;
      }
      
      case 'delete': {
        if (!filters || Object.keys(filters).length === 0) {
          return new Response(
            JSON.stringify({ error: 'Se requieren "filters" para delete (seguridad)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        query = supabase.from(table).delete();
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
        query = query.select();
        break;
      }
    }

    // Ejecutar query
    let result;
    if (single) {
      result = await query.single();
    } else {
      result = await query;
    }

    // Retornar resultado
    return new Response(
      JSON.stringify({
        data: result.data,
        error: result.error?.message || null,
        count: result.count,
      }),
      { 
        status: result.error ? 400 : 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en multi-db-proxy:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
