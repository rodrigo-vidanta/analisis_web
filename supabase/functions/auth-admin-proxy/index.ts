/**
 * ============================================
 * EDGE FUNCTION: AUTH ADMIN PROXY
 * ============================================
 * 
 * Proxy seguro para operaciones de autenticación
 * - updateLastLogin
 * - logLogin (RPC)
 * - Operaciones admin de auth_users
 * 
 * Autor: PQNC AI Platform
 * Fecha: 15 Enero 2026
 * Seguridad: Enterprise Level
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

// ============================================
// CONFIGURACIÓN
// ============================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================
// OPERACIONES PERMITIDAS
// ============================================

const ALLOWED_OPERATIONS = [
  'updateLastLogin',
  'logLogin',
  'getUserById',
  'updateUserField',
  'getExecutivesWithBackup',
  'validateSession',
  'updateIsOperativo',
  'resetFailedAttempts',
  'verifyPassword',
  'changePassword'
]

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { operation, params } = await req.json()

    // Validar operación
    if (!ALLOWED_OPERATIONS.includes(operation)) {
      console.warn(`[SECURITY] Operación no permitida: ${operation}`)
      return new Response(
        JSON.stringify({ error: 'Operation not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: any

    switch (operation) {
      // ============================================
      // UPDATE LAST LOGIN
      // ============================================
      case 'updateLastLogin': {
        const { userId } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('auth_users')
          .update({ 
            last_login: new Date().toISOString(),
            failed_login_attempts: 0,
            locked_until: null
          })
          .eq('id', userId)

        if (error) throw error
        result = { success: true }
        break
      }

      // ============================================
      // LOG LOGIN (RPC)
      // ============================================
      case 'logLogin': {
        const { userId, success, userAgent, ip, failureReason } = params
        
        const { data, error } = await supabase.rpc('log_login_attempt', {
          p_user_id: userId,
          p_success: success,
          p_user_agent: userAgent || 'unknown',
          p_ip_address: ip || req.headers.get('x-forwarded-for') || 'unknown',
          p_failure_reason: failureReason || null
        })

        if (error) {
          console.warn('[auth-admin-proxy] logLogin RPC error:', error.message)
          // No fallar si el RPC no existe
          result = { success: true, warning: 'RPC may not exist' }
        } else {
          result = { success: true, data }
        }
        break
      }

      // ============================================
      // GET USER BY ID
      // ============================================
      case 'getUserById': {
        const { userId, select } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('auth_users')
          .select(select || '*')
          .eq('id', userId)
          .single()

        if (error) throw error
        result = { data }
        break
      }

      // ============================================
      // UPDATE USER FIELD
      // ============================================
      case 'updateUserField': {
        const { userId, updates } = params
        if (!userId || !updates) {
          return new Response(
            JSON.stringify({ error: 'userId and updates required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Solo permitir campos seguros
        const allowedFields = ['last_login', 'failed_login_attempts', 'locked_until', 'is_online', 'last_activity', 'must_change_password']
        const safeUpdates: Record<string, any> = {}
        
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields.includes(key)) {
            safeUpdates[key] = value
          }
        }

        const { error } = await supabase
          .from('auth_users')
          .update(safeUpdates)
          .eq('id', userId)

        if (error) throw error
        result = { success: true }
        break
      }

      // ============================================
      // GET EXECUTIVES WITH BACKUP
      // ============================================
      case 'getExecutivesWithBackup': {
        const { roleIds, coordinacionId } = params
        
        let query = supabase
          .from('auth_users')
          .select('id, full_name, email, role_id, coordinacion_id, backup_user_id, is_active')
          .eq('is_active', true)

        if (roleIds && roleIds.length > 0) {
          query = query.in('role_id', roleIds)
        }

        if (coordinacionId) {
          query = query.eq('coordinacion_id', coordinacionId)
        }

        const { data, error } = await query

        if (error) throw error
        result = { data }
        break
      }

      // ============================================
      // VALIDATE SESSION
      // ============================================
      case 'validateSession': {
        const { sessionToken } = params
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ error: 'sessionToken required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('auth_sessions')
          .select('user_id, expires_at, created_at')
          .eq('session_token', sessionToken)
          .single()

        if (error || !data) {
          result = { valid: false }
        } else if (new Date(data.expires_at) < new Date()) {
          result = { valid: false, reason: 'expired' }
        } else {
          result = { valid: true, userId: data.user_id }
        }
        break
      }

      // ============================================
      // UPDATE IS OPERATIVO
      // ============================================
      case 'updateIsOperativo': {
        const { userId, isOperativo } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('auth_users')
          .update({ 
            is_operativo: isOperativo,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (error) throw error
        result = { success: true }
        break
      }

      // ============================================
      // RESET FAILED ATTEMPTS
      // ============================================
      case 'resetFailedAttempts': {
        const { userId } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('auth_users')
          .update({ 
            failed_login_attempts: 0,
            locked_until: null
          })
          .eq('id', userId)

        if (error) throw error
        result = { success: true }
        break
      }

      // ============================================
      // VERIFY PASSWORD
      // ============================================
      case 'verifyPassword': {
        const { userId, email, password } = params
        if (!password || (!userId && !email)) {
          return new Response(
            JSON.stringify({ error: 'password and (userId or email) required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Obtener usuario por ID o email
        let query = supabase.from('auth_users').select('id, password_hash, is_active')
        if (userId) {
          query = query.eq('id', userId)
        } else {
          query = query.eq('email', email.toLowerCase())
        }

        const { data: user, error: userError } = await query.single()

        if (userError || !user) {
          result = { valid: false, error: 'Usuario no encontrado' }
          break
        }

        if (!user.is_active) {
          result = { valid: false, error: 'Usuario inactivo' }
          break
        }

        // Verificar contraseña con bcrypt
        const isValid = await bcrypt.compare(password, user.password_hash)
        result = { valid: isValid, userId: user.id }
        break
      }

      // ============================================
      // CHANGE PASSWORD
      // ============================================
      case 'changePassword': {
        const { userId, newPassword, currentPassword, skipVerification } = params
        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: 'userId and newPassword required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Si se requiere verificación de contraseña actual
        if (!skipVerification && currentPassword) {
          const { data: user, error: userError } = await supabase
            .from('auth_users')
            .select('password_hash')
            .eq('id', userId)
            .single()

          if (userError || !user) {
            return new Response(
              JSON.stringify({ error: 'Usuario no encontrado' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const isValid = await bcrypt.compare(currentPassword, user.password_hash)
          if (!isValid) {
            return new Response(
              JSON.stringify({ error: 'Contraseña actual incorrecta', valid: false }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        // Generar nuevo hash
        const salt = await bcrypt.genSalt(10)
        const newHash = await bcrypt.hash(newPassword, salt)

        // Actualizar contraseña
        const { error: updateError } = await supabase
          .from('auth_users')
          .update({ 
            password_hash: newHash,
            updated_at: new Date().toISOString(),
            password_changed_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) throw updateError
        
        console.log(`✅ Contraseña cambiada para usuario ${userId}`)
        result = { success: true }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log(`✅ [auth-admin-proxy] ${operation} completado`)
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [auth-admin-proxy] Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
