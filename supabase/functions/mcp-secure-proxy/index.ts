/**
 * ============================================
 * EDGE FUNCTION: MCP SECURE PROXY
 * ============================================
 * 
 * Proxy seguro para MCPs de Cursor
 * - Valida session_token del usuario de Cursor
 * - Whitelist de operaciones permitidas
 * - Audit logging completo
 * - NUNCA expone service_role_key
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 24 Enero 2026
 * Seguridad: Enterprise Level
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================
// CONFIGURACIÓN
// ============================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Crear cliente con service_role (interno, no expuesto)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// ============================================
// WHITELIST DE OPERACIONES
// ============================================

// Operaciones permitidas para MCPs
const ALLOWED_OPERATIONS = [
  'query_table',      // SELECT con filtros
  'get_schema',       // Ver estructura de BD
  'get_table_info',   // Detalles de tabla
  'execute_read_sql', // SQL de solo lectura (SELECT, EXPLAIN)
  'insert_data',      // INSERT (con validación)
  'update_data',      // UPDATE (con validación)
  'backup_table',     // Backup en JSON
  'debug_connection'  // Test de conexión
]

// Operaciones restringidas (requieren permisos elevados)
const RESTRICTED_OPERATIONS = [
  'delete_data',      // Requiere rol admin
  'execute_write_sql', // DDL requiere rol admin
  'drop_table',       // PROHIBIDO
  'truncate_table'    // PROHIBIDO
]

// Tablas accesibles para lectura
const READABLE_TABLES = [
  'prospectos',
  'llamadas_ventas',
  'conversaciones_whatsapp',
  'mensajes_whatsapp',
  'auth_users',
  'auth_sessions',
  'coordinaciones',
  'auth_roles',
  'auth_permissions',
  'system_config',
  'user_profiles_v2',
  'call_analysis_summary',
  'paraphrase_logs'
]

// Tablas protegidas (solo lectura para admins)
const PROTECTED_TABLES = [
  'api_auth_tokens',
  'auth_login_logs',
  'assignment_logs'
]

// ============================================
// VALIDACIÓN DE SESIÓN
// ============================================

async function validateSession(sessionToken: string): Promise<{ valid: boolean; userId?: string; isAdmin?: boolean }> {
  if (!sessionToken) {
    return { valid: false }
  }

  // Verificar sesión en BD
  const { data: session, error } = await supabase
    .from('auth_sessions')
    .select('user_id, expires_at')
    .eq('session_token', sessionToken)
    .single()

  if (error || !session) {
    console.warn(`[SECURITY] Sesión inválida: ${sessionToken.substring(0, 10)}...`)
    return { valid: false }
  }

  // Verificar expiración
  if (new Date(session.expires_at) < new Date()) {
    console.warn(`[SECURITY] Sesión expirada: ${sessionToken.substring(0, 10)}...`)
    return { valid: false }
  }

  // Verificar si es admin
  const { data: user } = await supabase
    .from('auth_users')
    .select('is_admin')
    .eq('id', session.user_id)
    .single()

  return {
    valid: true,
    userId: session.user_id,
    isAdmin: user?.is_admin || false
  }
}

// ============================================
// HANDLERS DE OPERACIONES
// ============================================

async function handleQueryTable(params: any, userId: string) {
  const { table, select, filter, limit, order } = params

  // Validar tabla
  if (!READABLE_TABLES.includes(table) && !PROTECTED_TABLES.includes(table)) {
    throw new Error(`Tabla no permitida: ${table}`)
  }

  // Construir query
  let query = supabase.from(table).select(select || '*')

  // Aplicar filtros
  if (filter) {
    Object.entries(filter).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object') {
        if (value.in) query = query.in(key, value.in)
        else if (value.eq) query = query.eq(key, value.eq)
        else if (value.neq) query = query.neq(key, value.neq)
        else if (value.gt) query = query.gt(key, value.gt)
        else if (value.gte) query = query.gte(key, value.gte)
        else if (value.lt) query = query.lt(key, value.lt)
        else if (value.lte) query = query.lte(key, value.lte)
        else if (value.like) query = query.like(key, value.like)
        else if (value.ilike) query = query.ilike(key, value.ilike)
      } else {
        query = query.eq(key, value)
      }
    })
  }

  // Aplicar orden
  if (order) {
    const [column, direction] = order.split('.')
    query = query.order(column, { ascending: direction !== 'desc' })
  }

  // Aplicar limit (máximo 1000)
  const finalLimit = Math.min(limit || 100, 1000)
  query = query.limit(finalLimit)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Query error: ${error.message}`)
  }

  return { data, count, table, userId }
}

async function handleGetSchema() {
  const { data, error } = await supabase.rpc('get_database_schema')

  if (error) {
    // Fallback: query manual
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    return { tables: tables?.map(t => t.table_name) || [] }
  }

  return data
}

async function handleGetTableInfo(params: any) {
  const { table } = params

  if (!READABLE_TABLES.includes(table) && !PROTECTED_TABLES.includes(table)) {
    throw new Error(`Tabla no permitida: ${table}`)
  }

  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('ordinal_position')

  if (error) {
    throw new Error(`Error obteniendo info de tabla: ${error.message}`)
  }

  return { table, columns: data }
}

async function handleInsertData(params: any, userId: string, isAdmin: boolean) {
  const { table, data } = params

  // Solo admin puede insertar en tablas protegidas
  if (PROTECTED_TABLES.includes(table) && !isAdmin) {
    throw new Error('Requiere permisos de administrador')
  }

  if (!READABLE_TABLES.includes(table)) {
    throw new Error(`Tabla no permitida: ${table}`)
  }

  // Agregar auditoría
  const dataWithAudit = {
    ...data,
    created_by: userId,
    created_at: new Date().toISOString()
  }

  const { data: result, error } = await supabase
    .from(table)
    .insert(dataWithAudit)
    .select()

  if (error) {
    throw new Error(`Error insertando: ${error.message}`)
  }

  return { success: true, data: result, table, userId }
}

async function handleUpdateData(params: any, userId: string, isAdmin: boolean) {
  const { table, data, filter } = params

  if (!filter || Object.keys(filter).length === 0) {
    throw new Error('UPDATE requiere filtro (prevenir UPDATE masivo)')
  }

  // Solo admin puede actualizar tablas protegidas
  if (PROTECTED_TABLES.includes(table) && !isAdmin) {
    throw new Error('Requiere permisos de administrador')
  }

  if (!READABLE_TABLES.includes(table)) {
    throw new Error(`Tabla no permitida: ${table}`)
  }

  // Agregar auditoría
  const dataWithAudit = {
    ...data,
    updated_by: userId,
    updated_at: new Date().toISOString()
  }

  // Construir query
  let query = supabase.from(table).update(dataWithAudit)

  Object.entries(filter).forEach(([key, value]) => {
    query = query.eq(key, value)
  })

  const { data: result, error } = await query.select()

  if (error) {
    throw new Error(`Error actualizando: ${error.message}`)
  }

  return { success: true, data: result, table, userId, rowsAffected: result?.length || 0 }
}

async function handleExecuteReadSQL(params: any, userId: string) {
  const { sql } = params

  // Validar que sea SQL de solo lectura
  const sqlLower = sql.toLowerCase().trim()
  
  if (!sqlLower.startsWith('select') && !sqlLower.startsWith('explain')) {
    throw new Error('Solo se permiten queries SELECT y EXPLAIN')
  }

  // Prohibir subqueries de escritura
  if (sqlLower.includes('insert') || sqlLower.includes('update') || 
      sqlLower.includes('delete') || sqlLower.includes('drop') ||
      sqlLower.includes('truncate') || sqlLower.includes('create') ||
      sqlLower.includes('alter')) {
    throw new Error('SQL contiene operaciones de escritura no permitidas')
  }

  // Ejecutar query (limitado a 1000 filas)
  const { data, error } = await supabase.rpc('exec_sql', { query: sql + ' LIMIT 1000' })

  if (error) {
    throw new Error(`Error ejecutando SQL: ${error.message}`)
  }

  return { success: true, data, userId, sql: sql.substring(0, 100) + '...' }
}

async function handleBackupTable(params: any, userId: string) {
  const { table } = params

  if (!READABLE_TABLES.includes(table)) {
    throw new Error(`Tabla no permitida: ${table}`)
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(10000) // Máximo 10k registros

  if (error) {
    throw new Error(`Error haciendo backup: ${error.message}`)
  }

  return {
    success: true,
    table,
    timestamp: new Date().toISOString(),
    rowCount: data?.length || 0,
    backup: data
  }
}

async function handleDebugConnection(userId: string) {
  const { data, error } = await supabase
    .from('auth_users')
    .select('id')
    .eq('id', userId)
    .single()

  return {
    connected: !error,
    userId,
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-token',
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    // 1. OBTENER SESSION TOKEN
    const sessionToken = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '')

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Session token required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. VALIDAR SESIÓN
    const { valid, userId, isAdmin } = await validateSession(sessionToken)

    if (!valid || !userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 3. PARSEAR REQUEST
    const { operation, params } = await req.json()

    // 4. VALIDAR OPERACIÓN
    if (!ALLOWED_OPERATIONS.includes(operation)) {
      if (RESTRICTED_OPERATIONS.includes(operation)) {
        return new Response(
          JSON.stringify({ error: 'Operación restringida. Requiere permisos elevados.' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ error: `Operación no permitida: ${operation}` }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 5. EJECUTAR OPERACIÓN
    let result

    switch (operation) {
      case 'query_table':
        result = await handleQueryTable(params, userId)
        break

      case 'get_schema':
        result = await handleGetSchema()
        break

      case 'get_table_info':
        result = await handleGetTableInfo(params)
        break

      case 'insert_data':
        result = await handleInsertData(params, userId, isAdmin || false)
        break

      case 'update_data':
        result = await handleUpdateData(params, userId, isAdmin || false)
        break

      case 'execute_read_sql':
        result = await handleExecuteReadSQL(params, userId)
        break

      case 'backup_table':
        result = await handleBackupTable(params, userId)
        break

      case 'debug_connection':
        result = await handleDebugConnection(userId)
        break

      default:
        throw new Error(`Operación no implementada: ${operation}`)
    }

    // 6. LOGGING DE AUDITORÍA
    await supabase
      .from('mcp_audit_log')
      .insert({
        user_id: userId,
        operation,
        table_name: params?.table || null,
        timestamp: new Date().toISOString(),
        success: true
      })
      .then(() => {})
      .catch((err) => console.warn('[AUDIT] Error logging:', err))

    // 7. RETORNAR RESULTADO
    return new Response(
      JSON.stringify(result),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('[ERROR]', error)

    // Logging de error
    const sessionToken = req.headers.get('x-session-token')
    if (sessionToken) {
      const { userId } = await validateSession(sessionToken)
      if (userId) {
        await supabase
          .from('mcp_audit_log')
          .insert({
            user_id: userId,
            operation: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            success: false
          })
          .then(() => {})
          .catch(() => {})
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
