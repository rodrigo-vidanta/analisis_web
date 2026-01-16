/**
 * ============================================
 * SERVICIO DE AUTENTICACIÓN - MÓDULO PQNC HUMANS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/admin/README_PQNC_HUMANS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/admin/README_PQNC_HUMANS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/admin/CHANGELOG_PQNC_HUMANS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================

import { supabaseSystemUI as supabase, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import { errorLogService } from './errorLogService';
import { loginLogService } from './loginLogService';

// Tipos de datos para autenticación
export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  position?: string;
  organization: string;
  role_name: string;
  role_display_name: string;
  is_active: boolean;
  is_operativo?: boolean; // Estado operativo/no operativo para ejecutivos
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  must_change_password?: boolean;
  id_colaborador?: string;
  id_dynamics?: string;
  coordinacion_id?: string; // ID de coordinación para ejecutivos
  coordinaciones_ids?: string[]; // IDs de coordinaciones para coordinadores y supervisores
}

export interface Permission {
  permission_name: string;
  module: string;
  sub_module?: string;
  description: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// CLASE DE SERVICIO DE AUTENTICACIÓN
// ============================================

class AuthService {
  private currentUser: User | null = null;
  private userPermissions: Permission[] = [];
  private sessionToken: string | null = null;

  // Inicializar servicio verificando sesión existente
  async initialize(): Promise<AuthState> {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.sessionToken = token;
        const isValid = await this.validateSession(token);
        if (isValid) {
          await this.loadUserData();
        } else {
          this.clearSession();
        }
      }
      
      return {
        user: this.currentUser,
        permissions: this.userPermissions,
        isAuthenticated: !!this.currentUser,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Error initializing auth service:', error);
      this.clearSession();
      return {
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: 'Error al inicializar sesión'
      };
    }
  }

  // Autenticar usuario con email y contraseña
  async login(credentials: LoginCredentials): Promise<AuthState> {
    try {
      // Normalizar email a minúsculas para comparación case-insensitive
      const normalizedEmail = credentials.email.trim().toLowerCase();
      
      // Primero verificar el estado del usuario directamente desde la tabla
      // Usar ilike para comparación case-insensitive
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id, email, password_hash, is_active, failed_login_attempts, locked_until')
        .ilike('email', normalizedEmail)
        .single();

      // Si el usuario existe, verificar bloqueo ANTES de autenticar
      if (userData && !userError) {
        // Verificar si la cuenta está bloqueada
        if (userData.locked_until && new Date(userData.locked_until) > new Date()) {
          const lockedUntil = new Date(userData.locked_until).toLocaleString('es-ES');
          throw new Error(`ACCOUNT_LOCKED: Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos. Contacta al administrador. Bloqueado hasta: ${lockedUntil}`);
        }

        // Si estaba bloqueado pero ya pasó el tiempo, desbloquear
        if (userData.locked_until && new Date(userData.locked_until) <= new Date()) {
          await supabase
            .from('auth_users')
            .update({ failed_login_attempts: 0, locked_until: null })
            .eq('id', userData.id);
        }
      }

      // Ahora intentar autenticar usando la función RPC
      // Pasar email normalizado a minúsculas para comparación case-insensitive
      const { data: authResult, error: authError } = await supabase
        .rpc('authenticate_user', {
          user_email: normalizedEmail,
          user_password: credentials.password
        });

      if (authError) {
        throw new Error(authError?.message || 'Error de autenticación');
      }

      if (!authResult || authResult.length === 0) {
        // Si la función RPC no retorna datos, verificar manualmente el estado después del intento
        // Usar email normalizado para comparación case-insensitive
        const { data: updatedUserData } = await supabase
          .from('auth_users')
          .select('failed_login_attempts, locked_until')
          .ilike('email', normalizedEmail)
          .single();

        if (updatedUserData) {
          const failedAttempts = updatedUserData.failed_login_attempts || 0;
          const isLocked = updatedUserData.locked_until && new Date(updatedUserData.locked_until) > new Date();
          
          if (isLocked) {
            const lockedUntil = new Date(updatedUserData.locked_until).toLocaleString('es-ES');
            throw new Error(`ACCOUNT_LOCKED: Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos. Contacta al administrador. Bloqueado hasta: ${lockedUntil}`);
          }
          
          if (failedAttempts >= 3) {
            throw new Error(`CREDENTIALS_INVALID_WARNING: Credenciales inválidas. Te quedan ${4 - failedAttempts} intento(s) antes del bloqueo.`);
          }
        }
        
        throw new Error('Credenciales inválidas');
      }

      // La función retorna un array, tomar el primer resultado
      const authData = authResult[0];
      
      // Verificar si la cuenta está bloqueada (puede venir de la función o verificar manualmente)
      let accountLocked = false;
      let failedAttempts = 0;
      let lockedUntil: string | null = null;

      if (authData.account_locked !== undefined) {
        accountLocked = authData.account_locked === true || authData.account_locked === 'true';
        failedAttempts = authData.failed_attempts || 0;
        lockedUntil = authData.locked_until || null;
      } else {
        // Si la función no retorna estos campos, obtenerlos manualmente
        const { data: currentUserData } = await supabase
          .from('auth_users')
          .select('failed_login_attempts, locked_until')
          .ilike('email', normalizedEmail)
          .single();

        if (currentUserData) {
          failedAttempts = currentUserData.failed_login_attempts || 0;
          accountLocked = currentUserData.locked_until && new Date(currentUserData.locked_until) > new Date();
          lockedUntil = currentUserData.locked_until;
        }
      }
      
      if (accountLocked || (lockedUntil && new Date(lockedUntil) > new Date())) {
        const lockedUntilFormatted = lockedUntil 
          ? new Date(lockedUntil).toLocaleString('es-ES')
          : '30 minutos';
        throw new Error(`ACCOUNT_LOCKED: Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos. Contacta al administrador. Bloqueado hasta: ${lockedUntilFormatted}`);
      }
      
      if (!authData.is_valid || !authData.user_id) {
        if (failedAttempts >= 3) {
          throw new Error(`CREDENTIALS_INVALID_WARNING: Credenciales inválidas. Te quedan ${4 - failedAttempts} intento(s) antes del bloqueo.`);
        }
        throw new Error('Credenciales inválidas');
      }

      // Crear sesión
      const sessionToken = await this.createSession(authData.user_id);
      this.sessionToken = sessionToken;
      
      // Cargar datos del usuario
      await this.loadUserData();
      
      // Actualizar último login
      await this.updateLastLogin(authData.user_id);

      // Si es ejecutivo, restaurar backup y actualizar is_operativo a true al hacer login
      if (this.currentUser && this.currentUser.role_name === 'ejecutivo') {
        try {
          // ⚡ OPTIMIZACIÓN: Usar caché de permissionsService para evitar queries repetidas
          // Verificar si este ejecutivo tiene un backup asignado (has_backup = true)
          // Solo remover backup si este ejecutivo es el que tenía el backup asignado
          const { permissionsService } = await import('./permissionsService');
          
          // Pre-cargar datos de backup para este ejecutivo usando el servicio con caché
          await permissionsService.preloadBackupData([authData.user_id]);
          
          // Obtener datos del caché
          const cacheKey = authData.user_id;
          const cached = permissionsService.backupCache?.get(cacheKey);
          const ejecutivoData = cached?.data;
          
          if (ejecutivoData && ejecutivoData.has_backup === true) {
            // Remover backup y restaurar teléfono original
            const { backupService } = await import('./backupService');
            await backupService.removeBackup(authData.user_id);
          }

          // Actualizar is_operativo a true (para todos los ejecutivos que hacen login)
          const { error: updateError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .update({ 
              is_operativo: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', authData.user_id);
          
          if (updateError) {
            console.error('Error actualizando is_operativo en login:', updateError);
          } else {
            // Actualizar el objeto currentUser para reflejar el cambio
            this.currentUser = {
              ...this.currentUser,
              is_operativo: true
            } as User;
          }
        } catch (error) {
          console.error('Error restaurando ejecutivo en login:', error);
          // No lanzar error, solo loguear - el login debe continuar
        }
      }

      // Registrar login exitoso en logs
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Sesión válida por 24 horas
      await loginLogService.logLogin({
        user_id: authData.user_id,
        email: credentials.email,
        session_token: sessionToken,
        login_status: 'success',
        expires_at: expiresAt.toISOString()
      }).catch(err => console.error('Error logging successful login:', err));

      // Guardar token en localStorage
      localStorage.setItem('auth_token', sessionToken);

      // Notificar a otras sesiones del mismo usuario que deben cerrar (broadcast instantáneo)
      try {
        const channel = supabase.channel(`session-invalidation-${authData.user_id}`);
        await channel.send({
          type: 'broadcast',
          event: 'session_replaced',
          payload: { 
            newSessionToken: sessionToken,
            timestamp: new Date().toISOString()
          }
        });
        await supabase.removeChannel(channel);
      } catch (broadcastError) {
        // Silenciar - el polling de respaldo detectará la sesión invalidada
      }

      return {
        user: this.currentUser,
        permissions: this.userPermissions,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Registrar login fallido en logs
      const errorMessage = error instanceof Error ? error.message : 'Error de autenticación';
      await loginLogService.logLogin({
        email: credentials.email,
        login_status: 'failed',
        failure_reason: errorMessage
      }).catch(err => console.error('Error logging failed login:', err));
      
      // Log error crítico
      errorLogService.logError(error, {
        module: 'auth',
        component: 'AuthService',
        function: 'login',
        severity: 'critico',
        category: 'autenticacion',
        userEmail: credentials.email, // Incluir email del usuario en el contexto
        details: {
          email: credentials.email,
          error_type: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      }).catch(() => {}); // No queremos que errores de logging afecten el flujo principal
      
      return {
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      };
    }
  }

  // Cerrar sesión
  async logout(backupId?: string): Promise<void> {
    try {
      // Si es ejecutivo o supervisor, manejar backup y actualizar is_operativo
      const isEjecutivoOrSupervisor = this.currentUser && 
        (this.currentUser.role_name === 'ejecutivo' || this.currentUser.role_name === 'supervisor');
      
      if (isEjecutivoOrSupervisor) {
        try {
          // Si se proporciona un backupId válido (string no vacío), asignar backup
          if (backupId && typeof backupId === 'string' && backupId.trim() !== '') {
            const { backupService } = await import('./backupService');
            const result = await backupService.assignBackup(this.currentUser!.id, backupId);
            if (!result.success) {
              console.error('Error asignando backup:', result.error);
              // Continuar con el logout aunque falle la asignación de backup
            }
          }

          // Actualizar is_operativo a false
          const { error: updateError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .update({ 
              is_operativo: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', this.currentUser!.id);
          
          if (updateError) {
            throw updateError;
          }
        } catch (error) {
          console.error(`Error actualizando ${this.currentUser?.role_name} en logout:`, error);
          // Continuar con el logout aunque falle la actualización
        }
      }

      if (this.sessionToken) {
        // Eliminar sesión de la base de datos
        await supabase
          .from('auth_sessions')
          .delete()
          .eq('session_token', this.sessionToken);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.clearSession();
    }
  }

  // Verificar si el usuario tiene un permiso específico
  hasPermission(permissionName: string): boolean {
    return this.userPermissions.some(p => p.permission_name === permissionName);
  }

  // Verificar si el usuario puede acceder a un módulo
  canAccessModule(module: string, subModule?: string): boolean {
    if (!this.currentUser) return false;
    
    const role = this.currentUser.role_name;
    
    // Lógica específica por módulo con nuevos roles
    switch (module) {
      case 'analisis':
        // Admin: acceso completo
        // Administrador Operativo: NO tiene acceso
        // Coordinador: acceso a análisis de su coordinación
        // Ejecutivo: acceso a análisis de sus prospectos
        // Evaluator, Developer: acceso completo
        // Dirección: NO tiene acceso
        if (role === 'direccion' || role === 'administrador_operativo') return false;
        return ['admin', 'evaluator', 'developer', 'coordinador', 'ejecutivo'].includes(role);
      
      case 'ai-models':
        // Solo productor, admin y developer
        if (role === 'direccion') return false;
        return ['productor', 'admin', 'developer'].includes(role);
      
      case 'live-chat':
        // Admin: acceso completo
        // Administrador Operativo: solo lectura (ver todos, no puede enviar mensajes/imágenes/programar llamadas)
        // Coordinador: acceso a su coordinación, puede enviar mensajes/imágenes/programar llamadas
        // Ejecutivo: acceso solo a sus prospectos, puede enviar mensajes/imágenes
        // Supervisor: acceso a su coordinación, puede VER pero NO puede reasignar
        // Dirección: NO tiene acceso
        if (role === 'direccion') return false;
        return ['admin', 'administrador_operativo', 'coordinador', 'supervisor', 'ejecutivo', 'evaluator', 'developer'].includes(role);
      
      case 'live-monitor':
        // Admin: acceso completo
        // Administrador Operativo: acceso a todos los prospectos
        // Coordinador: acceso solo a su coordinación
        // Supervisor: acceso a su coordinación, puede VER todos los prospectos
        // Ejecutivo: acceso solo a sus prospectos
        // Evaluator, Developer: acceso completo
        // Dirección: NO tiene acceso
        if (role === 'direccion') return false;
        return ['admin', 'administrador_operativo', 'coordinador', 'supervisor', 'ejecutivo', 'evaluator', 'developer'].includes(role);
      
      case 'prospectos':
        // Admin: acceso completo
        // Administrador Operativo: puede ver todos, cambiar coordinación (con razón documentada)
        // Coordinador: acceso a su coordinación, puede reasignar entre ejecutivos/coordinadores de su coordinación
        // Supervisor: acceso a su coordinación, puede VER todos los prospectos pero NO puede reasignar
        // Ejecutivo: acceso solo a sus prospectos, NO puede cambiar propietario
        // Dirección: NO tiene acceso
        if (role === 'direccion') return false;
        return ['admin', 'administrador_operativo', 'coordinador', 'supervisor', 'ejecutivo', 'evaluator', 'developer'].includes(role);
      
      case 'scheduled-calls':
        // Admin: acceso completo
        // Administrador Operativo: puede ver todas las llamadas programadas
        // Coordinador: puede ver llamadas de su coordinación
        // Supervisor: puede ver llamadas de su coordinación
        // Ejecutivo: puede ver llamadas de sus prospectos
        // Dirección: NO tiene acceso
        if (role === 'direccion') return false;
        return ['admin', 'administrador_operativo', 'coordinador', 'supervisor', 'ejecutivo'].includes(role);
      
      case 'direccion':
        // Dirección: acceso completo para direccion y admin
        // También para administrador_operativo, coordinador y ejecutivo según requerimientos
        return ['direccion', 'admin', 'administrador_operativo', 'coordinador', 'ejecutivo'].includes(role);
      
      case 'admin':
        // Admin: acceso completo
        // Administrador Operativo: solo gestión de usuarios y coordinaciones
        // Coordinador: solo gestión de ejecutivos de su coordinación
        // Otros: NO tienen acceso
        return ['admin', 'administrador_operativo', 'coordinador'].includes(role);
      
      case 'log-server':
        // Solo admin
        return role === 'admin';
      
      case 'aws-manager':
        // Solo admin y developer
        return ['admin', 'developer'].includes(role);
      
      default:
        // Si el usuario tiene rol direccion, solo puede acceder al módulo direccion
        if (role === 'direccion') {
          return false;
        }
        
        // Admin tiene acceso completo
        if (role === 'admin') return true;
        
        // Developer puede acceder a todo excepto admin
        if (role === 'developer') {
          return module !== 'admin';
        }
        
        // Para otros roles, usar verificación de permisos si existe
        if (subModule) {
          return this.userPermissions.some(
            p => p.module === module && p.sub_module === subModule
          );
        }
        return this.userPermissions.some(p => p.module === module);
    }
  }

  // Verificar acceso específico a sub-módulos de análisis
  canAccessSubModule(subModule: 'natalia' | 'pqnc'): boolean {
    if (!this.currentUser) return false;
    
    // Admins tienen acceso total
    if (this.currentUser.role_name === 'admin') return true;
    
    // Developers no tienen acceso a análisis
    if (this.currentUser.role_name === 'developer') return false;
    
    // Evaluators necesitan permisos específicos - usar RPC function
    if (this.currentUser.role_name === 'evaluator') {
      // Por ahora retornar true para evaluadores mientras verificamos RPC
      // TODO: Implementar verificación asíncrona con RPC
      return true;
    }
    
    return false;
  }

  // Obtener permisos del usuario para un módulo específico
  getModulePermissions(module: string): Permission[] {
    return this.userPermissions.filter(p => p.module === module);
  }

  // Obtener usuario actual
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Obtener todos los permisos del usuario
  getUserPermissions(): Permission[] {
    return this.userPermissions;
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.sessionToken;
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  private async createSession(userId: string): Promise<string> {
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Sesión válida por 24 horas

    // INVALIDAR sesiones anteriores del mismo usuario (solo 1 sesión activa permitida)
    const { error: deleteError, count } = await supabase
      .from('auth_sessions')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.warn('⚠️ Error eliminando sesiones anteriores:', deleteError);
      // No lanzar error, continuar con la creación de la nueva sesión
    }

    const { error } = await supabase
      .from('auth_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      });

    if (error) {
      throw new Error('Error creando sesión');
    }

    return sessionToken;
  }

  private async validateSession(token: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('auth_sessions')
        .select('user_id, expires_at')
        .eq('session_token', token)
        .maybeSingle();

      if (error) {
        console.error('Error validando sesión:', error);
        return false;
      }

      if (!data) {
        // Sesión no existe (fue eliminada o nunca existió)
        return false;
      }

      // Verificar si la sesión no ha expirado
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (now > expiresAt) {
        // Sesión expirada, eliminarla
        await supabase
          .from('auth_sessions')
          .delete()
          .eq('session_token', token);
        return false;
      }

      // Actualizar actividad
      await supabase
        .from('auth_sessions')
        .update({ last_activity: now.toISOString() })
        .eq('session_token', token);

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  private async loadUserData(): Promise<void> {
    if (!this.sessionToken) {
      throw new Error('No session token available');
    }

    // Obtener ID de usuario desde la sesión
    const { data: sessionData, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('user_id')
      .eq('session_token', this.sessionToken)
      .maybeSingle();

    if (sessionError) {
      console.error('Error obteniendo sesión:', sessionError);
      throw new Error('Error de sesión');
    }

    if (!sessionData) {
      throw new Error('Sesión inválida o expirada');
    }

    // Cargar datos del usuario desde la vista y tabla directa para campos adicionales
    const { data: userData, error: userError } = await supabase
      .from('auth_user_profiles')
      .select('*')
      .eq('id', sessionData.user_id)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    // Cargar campos adicionales desde auth_users directamente
    const { data: additionalData } = await supabase
      .from('auth_users')
      .select('must_change_password, id_colaborador, id_dynamics, is_operativo, coordinacion_id')
      .eq('id', sessionData.user_id)
      .single();

    // Para coordinadores y supervisores, cargar sus coordinaciones desde auth_user_coordinaciones
    // Migrado de coordinador_coordinaciones → auth_user_coordinaciones (2025-12-29)
    let coordinacionesIds: string[] | undefined;
    if (userData.role_name === 'coordinador' || userData.role_name === 'supervisor') {
      try {
        const { data: coordinacionesData } = await supabase
          .from('auth_user_coordinaciones')
          .select('coordinacion_id')
          .eq('user_id', sessionData.user_id);
        
        if (coordinacionesData && coordinacionesData.length > 0) {
          coordinacionesIds = coordinacionesData.map(c => c.coordinacion_id);
        }
      } catch (coordError) {
        console.warn('Error cargando coordinaciones del usuario:', coordError);
      }
    }

    // Combinar datos
    this.currentUser = {
      ...userData,
      must_change_password: additionalData?.must_change_password || false,
      id_colaborador: additionalData?.id_colaborador,
      id_dynamics: additionalData?.id_dynamics,
      is_operativo: additionalData?.is_operativo !== undefined ? additionalData.is_operativo : true, // Por defecto true si no está definido
      coordinacion_id: additionalData?.coordinacion_id,
      coordinaciones_ids: coordinacionesIds,
    } as User;

    // Cargar permisos del usuario
    // Nota: En System_UI, auth_user_permissions tiene permission_name, module, sub_module
    // La descripción se puede obtener después si es necesario
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('auth_user_permissions')
      .select('permission_name, module, sub_module')
      .eq('user_id', sessionData.user_id);

    if (permissionsError) {
      console.error('Error loading permissions:', permissionsError);
      this.userPermissions = [];
    } else {
      this.userPermissions = permissionsData.map(p => ({
        permission_name: p.permission_name,
        module: p.module,
        sub_module: p.sub_module,
        description: '' // Se puede cargar después si es necesario
      }));
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    // Usar Edge Function auth-admin-proxy para evitar exponer service_role_key
    try {
      const { updateLastLogin: updateLastLoginProxy } = await import('./authAdminProxyService');
      const success = await updateLastLoginProxy(userId);
      if (!success) {
        console.warn('updateLastLogin: Edge Function retornó false');
      }
    } catch (error) {
      console.error('Error actualizando last_login via proxy:', error);
    }
  }

  private clearSession(): void {
    this.currentUser = null;
    this.userPermissions = [];
    this.sessionToken = null;
    localStorage.removeItem('auth_token');
  }

  private generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async getClientIP(): Promise<string> {
    try {
      // En desarrollo, retorna localhost
      if (window.location.hostname === 'localhost') {
        return '127.0.0.1';
      }
      
      // Intentar obtener IP real del cliente
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '0.0.0.0';
    } catch {
      return '0.0.0.0';
    }
  }
}

// ============================================
// FUNCIÓN SQL PARA AUTENTICACIÓN
// ============================================

export const authenticationFunction = `
-- Función para autenticar usuario
CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(user_id UUID, is_valid BOOLEAN) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Buscar usuario por email
    SELECT id, password_hash, is_active, failed_login_attempts, locked_until
    INTO user_record
    FROM users 
    WHERE email = user_email;
    
    -- Verificar si el usuario existe
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Verificar si el usuario está activo
    IF NOT user_record.is_active THEN
        RETURN QUERY SELECT NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Verificar si la cuenta está bloqueada
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN QUERY SELECT NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Verificar contraseña
    IF verify_password(user_password, user_record.password_hash) THEN
        -- Contraseña correcta: limpiar intentos fallidos
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT user_record.id, TRUE;
    ELSE
        -- Contraseña incorrecta: incrementar intentos fallidos
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
                WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
                ELSE NULL 
            END
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT NULL::UUID, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

// Exportar instancia singleton del servicio
export const authService = new AuthService();
export default authService;
