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

// NOTA: No usamos bcrypt - Supabase Auth Admin API maneja el hashing internamente

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
// VALIDACIÓN DE CONTRASEÑA (Supabase Auth Policy)
// ============================================
// Política: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 especial
function validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener al menos un número')
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial (!@#$%^&*)')
  }
  
  return { valid: errors.length === 0, errors }
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
  'changePassword',
  'assignUserToGroup',
  'removeUserFromGroup',
  'getUserGroups'
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
        const { email, password } = params
        if (!password || !email) {
          return new Response(
            JSON.stringify({ error: 'email and password required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar usando Supabase Auth nativo
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password
        })

        if (authError || !authData?.user) {
          result = { valid: false, error: 'Credenciales inválidas' }
          break
        }

        // Obtener ID del usuario en auth_users
        const { data: userData } = await supabase
          .from('auth_users')
          .select('id, is_active')
          .eq('email', email.toLowerCase())
          .single()

        if (userData && !userData.is_active) {
          result = { valid: false, error: 'Usuario inactivo' }
          break
        }

        result = { valid: true, userId: userData?.id, authUserId: authData.user.id }
        break
      }

      // ============================================
      // ASSIGN USER TO GROUP
      // ============================================
      case 'assignUserToGroup': {
        const { userId, groupId, isPrimary, assignedBy, notes } = params
        if (!userId || !groupId) {
          return new Response(
            JSON.stringify({ error: 'userId and groupId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Si es primary, desmarcar otros grupos como primary
        if (isPrimary) {
          await supabase
            .from('user_permission_groups')
            .update({ is_primary: false })
            .eq('user_id', userId)
        }

        const { data, error } = await supabase
          .from('user_permission_groups')
          .upsert({
            user_id: userId,
            group_id: groupId,
            is_primary: isPrimary || false,
            assigned_by: assignedBy || null,
            notes: notes || null,
            assigned_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,group_id'
          })
          .select()
          .single()

        if (error) throw error
        result = { success: true, data }
        break
      }

      // ============================================
      // REMOVE USER FROM GROUP
      // ============================================
      case 'removeUserFromGroup': {
        const { userId, groupId } = params
        if (!userId || !groupId) {
          return new Response(
            JSON.stringify({ error: 'userId and groupId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('user_permission_groups')
          .delete()
          .eq('user_id', userId)
          .eq('group_id', groupId)

        if (error) throw error
        result = { success: true }
        break
      }

      // ============================================
      // GET USER GROUPS
      // ============================================
      case 'getUserGroups': {
        const { userId } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('user_permission_groups')
          .select('*, permission_groups(*)')
          .eq('user_id', userId)

        if (error) throw error
        result = { data }
        break
      }

      // ============================================
      // CHANGE PASSWORD
      // ============================================
      case 'changePassword': {
        const { userId, newPassword } = params
        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: 'userId and newPassword required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validar complejidad de contraseña
        const passwordValidation = validatePasswordComplexity(newPassword)
        if (!passwordValidation.valid) {
          return new Response(
            JSON.stringify({ 
              error: 'La contraseña no cumple con los requisitos de seguridad',
              validationErrors: passwordValidation.errors,
              success: false 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Obtener email del usuario de auth_users
        const { data: userData, error: userDataError } = await supabase
          .from('auth_users')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (userDataError || !userData) {
          return new Response(
            JSON.stringify({ error: 'Usuario no encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Buscar usuario en auth.users por email
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === userData.email.toLowerCase())
        
        if (authUser) {
          // Actualizar contraseña en Supabase Auth
          const { error: authError } = await supabase.auth.admin.updateUserById(
            authUser.id,
            { password: newPassword }
          )
          if (authError) {
            console.error('Error actualizando Supabase Auth:', authError)
            throw authError
          }
          console.log(`✅ Contraseña actualizada en Supabase Auth para ${userData.email}`)
        } else {
          // Usuario no existe en auth.users - CREARLO
          console.log(`📝 Creando usuario ${userData.email} en Supabase Auth...`)
          const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: newPassword,
            email_confirm: true,
            user_metadata: {
              auth_users_id: userId,
              full_name: userData.full_name || userData.email.split('@')[0]
            }
          })
          if (createError) {
            console.error('Error creando usuario en Supabase Auth:', createError)
            throw createError
          }
          console.log(`✅ Usuario creado en Supabase Auth: ${newAuthUser?.user?.id}`)
        }

        // 2. Actualizar metadatos en auth_users (tabla custom)
        const { error: updateError } = await supabase
          .from('auth_users')
          .update({ 
            updated_at: new Date().toISOString(),
            password_changed_at: new Date().toISOString(),
            must_change_password: false
          })
          .eq('id', userId)

        if (updateError) {
          console.warn('Error actualizando auth_users:', updateError)
        }
        
        console.log(`✅ Contraseña cambiada para usuario ${userId} en Supabase Auth`)
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
