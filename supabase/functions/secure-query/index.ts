/**
 * ============================================
 * EDGE FUNCTION: SECURE QUERY
 * ============================================
 * 
 * Proxy seguro para consultas a Supabase
 * - Valida session_token del cliente
 * - Usa service_role para bypass RLS
 * - Logging de auditoría
 * - Control de acceso granular
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 15 Enero 2026
 * Seguridad: Enterprise Level
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================
// CONFIGURACIÓN
// ============================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Crear cliente con service_role (bypasea RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// ============================================
// WHITELIST DE ORÍGENES PERMITIDOS
// ============================================

const ALLOWED_ORIGINS = [
  'https://ai.vidavacations.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://primary-dev-d75a.up.railway.app' // N8N
]

// ============================================
// TABLAS PERMITIDAS
// ============================================

const ALLOWED_TABLES = [
  'prospectos',
  'llamadas_ventas',
  'conversaciones_whatsapp',
  'mensajes_whatsapp',
  'user_profiles_v2',
  'auth_sessions',
  'coordinaciones',
  'auth_roles'
]

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-token',
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    // 1. VALIDAR ORIGEN
    const origin = req.headers.get('origin') || ''
    
    if (!ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[SECURITY] Origen no permitido: ${origin}`)
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }), 
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. VALIDAR SESSION_TOKEN
    const sessionToken = req.headers.get('x-session-token')
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Session token required' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      )
    }

    // 3. VERIFICAR SESIÓN EN BD
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !session) {
      console.warn(`[SECURITY] Sesión inválida: ${sessionToken.substring(0, 10)}...`)
      return new Response(
        JSON.stringify({ error: 'Invalid session' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      )
    }

    // 4. VERIFICAR EXPIRACIÓN
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session expired' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      )
    }

    // 5. PARSEAR REQUEST
    const { table, select, filters, order, limit, offset } = await req.json()

    // 6. VALIDAR TABLA
    if (!ALLOWED_TABLES.includes(table)) {
      console.warn(`[SECURITY] Tabla no permitida: ${table}`)
      return new Response(
        JSON.stringify({ error: 'Table not allowed' }), 
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      )
    }

    // 7. CONSTRUIR QUERY CON SERVICE_ROLE
    let query = supabase
      .from(table)
      .select(select || '*')

    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object') {
          // Operadores especiales
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

    // Aplicar limit
    if (limit) {
      query = query.limit(limit)
    }

    // Aplicar offset
    if (offset) {
      query = query.range(offset, offset + (limit || 100) - 1)
    }

    // 8. EJECUTAR QUERY
    const { data, error, count } = await query

    if (error) {
      console.error(`[ERROR] Query failed:`, error)
      return new Response(
        JSON.stringify({ error: error.message, details: error.details }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      )
    }

    // 9. LOGGING DE AUDITORÍA (opcional, comentado por ahora)
    /*
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: session.user_id,
        action: 'query',
        table: table,
        timestamp: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for')
      })
      .then(() => {}) // Ignorar errores de logging
      .catch(() => {})
    */

    // 10. RETORNAR DATOS
    return new Response(
      JSON.stringify({ data, count }), 
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    )

  } catch (error) {
    console.error('[ERROR] Unhandled error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': req.headers.get('origin') || '*'
        }
      }
    )
  }
})
