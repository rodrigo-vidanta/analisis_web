/**
 * ============================================
 * EDGE FUNCTION: AUTH ADMIN PROXY
 * ============================================
 * 
 * Proxy seguro para operaciones de autenticación
 * MIGRACIÓN COMPLETADA: 2026-01-20
 * Ahora usa auth.users nativo de Supabase
 * 
 * Autor: PQNC AI Platform
 * Seguridad: Enterprise Level
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
  'getUserGroups',
  'createUser',
  'updateUserMetadata',
  'deleteUser' // Nueva operación
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
      // UPDATE LAST LOGIN (auth.users nativo)
      // ============================================
      case 'updateLastLogin': {
        const { userId } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Actualizar en auth.users via raw_user_meta_data
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        if (!userData?.user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            last_login: new Date().toISOString(),
            failed_login_attempts: 0,
            locked_until: null
          }
        })

        if (updateError) throw updateError
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
          result = { success: true, warning: 'RPC may not exist' }
        } else {
          result = { success: true, data }
        }
        break
      }

      // ============================================
      // GET USER BY ID (auth.users nativo)
      // ============================================
      case 'getUserById': {
        const { userId } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: userData, error } = await supabase.auth.admin.getUserById(userId)
        
        if (error || !userData?.user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Mapear a estructura compatible
        const user = userData.user
        result = { 
          data: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            phone: user.user_metadata?.phone || user.phone,
            role_id: user.user_metadata?.role_id,
            role_name: user.user_metadata?.role_name,
            is_active: user.user_metadata?.is_active ?? true,
            is_operativo: user.user_metadata?.is_operativo ?? false,
            is_ejecutivo: user.user_metadata?.is_ejecutivo ?? false,
            is_coordinator: user.user_metadata?.is_coordinator ?? false,
            id_dynamics: user.user_metadata?.id_dynamics,
            coordinacion_id: user.user_metadata?.coordinacion_id,
            last_login: user.user_metadata?.last_login || user.last_sign_in_at,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
        break
      }

      // ============================================
      // UPDATE USER FIELD (auth.users nativo)
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

        // Obtener metadata actual
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        if (!userData?.user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            ...safeUpdates
          }
        })

        if (updateError) throw updateError
        result = { success: true }
        break
      }

      // ============================================
      // GET EXECUTIVES WITH BACKUP (auth.users nativo via view)
      // ============================================
      case 'getExecutivesWithBackup': {
        const { roleIds, coordinacionId } = params
        
        // Usar la vista user_profiles_v2 que lee de auth.users
        let query = supabase
          .from('user_profiles_v2')
          .select('id, full_name, email, role_id, coordinacion_id, is_active, is_ejecutivo')
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
      // VALIDATE SESSION (auth.users nativo)
      // ============================================
      case 'validateSession': {
        const { sessionToken } = params
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ error: 'sessionToken required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Para sesiones de Supabase Auth nativo
        const { data: { user }, error } = await supabase.auth.getUser(sessionToken)
        
        if (error || !user) {
          result = { valid: false, reason: 'invalid_token' }
        } else {
          result = { valid: true, userId: user.id }
        }
        break
      }

      // ============================================
      // UPDATE IS OPERATIVO (auth.users nativo)
      // ============================================
      case 'updateIsOperativo': {
        const { userId, isOperativo } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Obtener metadata actual
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        if (!userData?.user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // REGLA: Solo puede ser operativo si tiene id_dynamics
        const currentIdDynamics = userData.user.user_metadata?.id_dynamics
        const finalIsOperativo = currentIdDynamics ? isOperativo : false

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            is_operativo: finalIsOperativo,
            updated_at: new Date().toISOString()
          }
        })

        if (updateError) throw updateError
        result = { success: true, is_operativo: finalIsOperativo }
        break
      }

      // ============================================
      // RESET FAILED ATTEMPTS (auth.users nativo)
      // ============================================
      case 'resetFailedAttempts': {
        const { userId } = params
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        if (!userData?.user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            failed_login_attempts: 0,
            locked_until: null
          }
        })

        if (updateError) throw updateError
        result = { success: true }
        break
      }

      // ============================================
      // VERIFY PASSWORD (Supabase Auth nativo)
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

        // Verificar si está activo
        const isActive = authData.user.user_metadata?.is_active ?? true
        if (!isActive) {
          result = { valid: false, error: 'Usuario inactivo' }
          break
        }

        result = { valid: true, userId: authData.user.id }
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
      // CHANGE PASSWORD (Supabase Auth nativo)
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

        // Actualizar contraseña directamente en auth.users
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        if (!userData?.user) {
          return new Response(
            JSON.stringify({ error: 'Usuario no encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: authError } = await supabase.auth.admin.updateUserById(userId, { 
          password: newPassword 
        })
        
        if (authError) {
          console.error('Error actualizando contraseña:', authError)
          throw authError
        }

        // Actualizar metadata
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            password_changed_at: new Date().toISOString(),
            must_change_password: false
          }
        })
        
        console.log(`✅ Contraseña cambiada para usuario ${userId}`)
        result = { success: true }
        break
      }

      // ============================================
      // CREATE USER (Supabase Auth Nativo)
      // ============================================
      case 'createUser': {
        const { 
          email, 
          password, 
          fullName, 
          roleId, 
          phone,
          idDynamics = null,
          isActive = true,
          isOperativo = false,
          isCoordinator = false,
          isEjecutivo = false,
          coordinacionId = null
        } = params
        
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'email and password required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validar complejidad de contraseña
        const passwordValidation = validatePasswordComplexity(password)
        if (!passwordValidation.valid) {
          return new Response(
            JSON.stringify({ 
              error: 'Contraseña no cumple política de seguridad', 
              details: passwordValidation.errors 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar si el email ya existe
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        
        if (existingUser) {
          return new Response(
            JSON.stringify({ 
              error: 'El email ya está registrado en el sistema',
              existingUserId: existingUser.id
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Obtener nombre del rol
        let roleName = 'ejecutivo'
        if (roleId) {
          const { data: roleData } = await supabase
            .from('auth_roles')
            .select('name')
            .eq('id', roleId)
            .single()
          if (roleData) {
            roleName = roleData.name
          }
        }

        // REGLA: Solo es operativo si tiene id_dynamics
        const finalIsOperativo = idDynamics ? isOperativo : false
        
        const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
          email: email.toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || email.split('@')[0],
            first_name: fullName?.split(' ')[0] || email.split('@')[0],
            last_name: fullName?.split(' ').slice(1).join(' ') || '',
            role_id: roleId || null,
            role_name: roleName,
            phone: phone || null,
            id_dynamics: idDynamics || null,
            is_active: isActive,
            is_operativo: finalIsOperativo,
            is_coordinator: isCoordinator || roleName === 'coordinador',
            is_ejecutivo: isEjecutivo || roleName === 'ejecutivo',
            coordinacion_id: coordinacionId,
            created_via: 'auth-admin-proxy',
            created_at: new Date().toISOString()
          }
        })

        if (createError) {
          console.error('Error creando usuario:', createError)
          throw createError
        }

        console.log(`✅ Usuario creado: ${newAuthUser?.user?.id}`)
        result = { 
          success: true, 
          userId: newAuthUser?.user?.id,
          email: newAuthUser?.user?.email,
          message: `Usuario ${email} creado exitosamente`
        }
        break
      }

      // ============================================
      // UPDATE USER METADATA (Supabase Auth Nativo)
      // ============================================
      case 'updateUserMetadata': {
        const { userId, metadata } = params
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!metadata || typeof metadata !== 'object') {
          return new Response(
            JSON.stringify({ error: 'metadata object required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Obtener metadata actual
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        if (!userData?.user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // REGLA: Si se intenta poner is_operativo sin id_dynamics, corregir
        const currentIdDynamics = userData.user.user_metadata?.id_dynamics
        const newIdDynamics = metadata.id_dynamics
        
        if (metadata.is_operativo === true && !newIdDynamics && !currentIdDynamics) {
          metadata.is_operativo = false
          console.warn(`⚠️ Corrigiendo is_operativo a false para usuario ${userId} sin id_dynamics`)
        }

        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { 
            user_metadata: {
              ...userData.user.user_metadata,
              ...metadata,
              updated_at: new Date().toISOString()
            }
          }
        )

        if (updateError) {
          console.error('Error actualizando metadata:', updateError)
          throw updateError
        }

        console.log(`✅ Metadata actualizado para usuario ${userId}`)
        result = { 
          success: true, 
          userId,
          metadata: updatedUser?.user?.user_metadata,
          message: 'Metadata actualizado exitosamente'
        }
        break
      }

      // ============================================
      // DELETE USER (Supabase Auth Nativo)
      // ============================================
      case 'deleteUser': {
        const { userId, softDelete = true } = params
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (softDelete) {
          // Soft delete: marcar como inactivo
          const { data: userData } = await supabase.auth.admin.getUserById(userId)
          if (!userData?.user) {
            return new Response(
              JSON.stringify({ error: 'User not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...userData.user.user_metadata,
              is_active: false,
              deleted_at: new Date().toISOString(),
              deleted_via: 'auth-admin-proxy'
            }
          })
          
          result = { success: true, message: 'Usuario desactivado (soft delete)' }
        } else {
          // Hard delete: eliminar permanentemente
          const { error } = await supabase.auth.admin.deleteUser(userId)
          if (error) throw error
          result = { success: true, message: 'Usuario eliminado permanentemente' }
        }
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
