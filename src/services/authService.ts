// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================

import { pqncSupabase as supabase } from '../config/pqncSupabase';

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
  email_verified: boolean;
  last_login?: string;
  created_at: string;
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
      // Verificar credenciales usando función SQL personalizada
      const { data: authResult, error: authError } = await supabase
        .rpc('authenticate_user', {
          user_email: credentials.email,
          user_password: credentials.password
        });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(authError?.message || 'Error de autenticación');
      }

      if (!authResult || authResult.length === 0) {
        throw new Error('Credenciales inválidas');
      }

      // La función retorna un array, tomar el primer resultado
      const authData = authResult[0];
      
      if (!authData.is_valid || !authData.user_id) {
        throw new Error('Credenciales inválidas');
      }

      // Crear sesión
      const sessionToken = await this.createSession(authData.user_id);
      this.sessionToken = sessionToken;
      
      // Cargar datos del usuario
      await this.loadUserData();
      
      // Actualizar último login
      await this.updateLastLogin(authData.user_id);

      // Guardar token en localStorage
      localStorage.setItem('auth_token', sessionToken);

      return {
        user: this.currentUser,
        permissions: this.userPermissions,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error de autenticación'
      };
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
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
    
    // Lógica específica por módulo ya que userPermissions está vacío
    switch (module) {
      case 'constructor':
        // Admin y Developer pueden acceder al constructor
        return ['admin', 'developer'].includes(this.currentUser.role_name);
      
      case 'plantillas':
        // Solo Admin y Developer pueden ver plantillas
        return ['admin', 'developer'].includes(this.currentUser.role_name);
      
      case 'analisis':
        // Solo Admin y Evaluator pueden ver análisis
        return ['admin', 'evaluator'].includes(this.currentUser.role_name);
      
      case 'academia':
        // Academia disponible para todos los roles autenticados
        return true;
      
      default:
        // Para otros módulos, usar verificación de permisos si existe
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
        .single();

      if (error || !data) {
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
      .single();

    if (sessionError || !sessionData) {
      throw new Error('Sesión inválida');
    }

    // Cargar datos del usuario desde la vista
    const { data: userData, error: userError } = await supabase
      .from('auth_user_profiles')
      .select('*')
      .eq('id', sessionData.user_id)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    this.currentUser = userData as User;

    // Cargar permisos del usuario
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('auth_user_permissions')
      .select('permission_name, module, sub_module, permission_description')
      .eq('user_id', sessionData.user_id);

    if (permissionsError) {
      console.error('Error loading permissions:', permissionsError);
      this.userPermissions = [];
    } else {
      this.userPermissions = permissionsData.map(p => ({
        permission_name: p.permission_name,
        module: p.module,
        sub_module: p.sub_module,
        description: p.permission_description
      }));
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await supabase
      .from('auth_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
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
