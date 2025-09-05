// ============================================
// CONTEXTO DE AUTENTICACIÓN PARA REACT
// ============================================

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, type User, type Permission, type AuthState, type LoginCredentials } from '../services/authService';

// Tipos para el contexto
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  canAccessModule: (module: string, subModule?: string) => boolean;
  canAccessSubModule: (subModule: 'natalia' | 'pqnc') => boolean;
  checkAnalysisPermissions: () => Promise<{natalia: boolean, pqnc: boolean}>;
  getModulePermissions: (module: string) => Permission[];
  getFirstAvailableModule: () => 'constructor' | 'plantillas' | 'analisis' | 'admin' | null;
  refreshUser: () => Promise<void>;
}

// Crear contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props del provider
interface AuthProviderProps {
  children: ReactNode;
}

// ============================================
// PROVIDER DE AUTENTICACIÓN
// ============================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Inicializar autenticación al cargar la aplicación
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const state = await authService.initialize();
      setAuthState(state);
    } catch (error) {
      console.error('Error initializing auth:', error);
      setAuthState({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: 'Error al inicializar autenticación'
      });
    }
  };

  // Función de login
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const state = await authService.login(credentials);
      setAuthState(state);
      return state.isAuthenticated;
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Error en el login'
      }));
      return false;
    }
  };

  // Función de logout
  const logout = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.logout();
      setAuthState({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Forzar logout local aunque falle el servidor
      setAuthState({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  };

  // Verificar permisos
  const hasPermission = (permissionName: string): boolean => {
    return authService.hasPermission(permissionName);
  };

  // Verificar acceso a módulos
  const canAccessModule = (module: string, subModule?: string): boolean => {
    return authService.canAccessModule(module, subModule);
  };

  // Verificar acceso a sub-módulos de análisis
  const canAccessSubModule = (subModule: 'natalia' | 'pqnc'): boolean => {
    if (!authState.user) return false;
    
    // Admins tienen acceso completo
    if (authState.user.role_name === 'admin') return true;
    
    // Developers no tienen acceso a análisis
    if (authState.user.role_name === 'developer') return false;
    
    // Evaluators necesitan sub-permisos específicos
    if (authState.user.role_name === 'evaluator') {
      // Esta lógica se implementará desde el servidor
      // Por ahora, permitir acceso mientras se implementa la verificación
      return authService.canAccessSubModule ? authService.canAccessSubModule(subModule) : true;
    }
    
    return false;
  };

  // Verificar permisos específicos de análisis usando RPC
  const checkAnalysisPermissions = async (): Promise<{natalia: boolean, pqnc: boolean}> => {
    if (!authState.user) return { natalia: false, pqnc: false };
    
    // Admins tienen acceso total
    if (authState.user.role_name === 'admin') return { natalia: true, pqnc: true };
    
    // Developers no tienen acceso
    if (authState.user.role_name === 'developer') return { natalia: false, pqnc: false };
    
    // Evaluators - verificar con RPC
    if (authState.user.role_name === 'evaluator') {
      try {
        const { pqncSupabase } = await import('../config/pqncSupabase');
        const { data, error } = await pqncSupabase.rpc('get_evaluator_analysis_config', {
          p_target_user_id: authState.user.id
        });

        if (error) {
          console.error('Error checking analysis permissions:', error);
          return { natalia: false, pqnc: false };
        }

        if (data && data.length > 0) {
          const config = data[0];
          return { 
            natalia: config.has_natalia_access || false, 
            pqnc: config.has_pqnc_access || false 
          };
        }
      } catch (err) {
        console.error('Error in checkAnalysisPermissions:', err);
      }
    }
    
    return { natalia: false, pqnc: false };
  };

  // Obtener permisos de módulo
  const getModulePermissions = (module: string): Permission[] => {
    return authService.getModulePermissions(module);
  };

  // Obtener primer módulo disponible para el usuario
  const getFirstAvailableModule = (): 'constructor' | 'plantillas' | 'analisis' | 'admin' | null => {
    if (!authState.user) return null;

    // Orden de prioridad de módulos
    const moduleOrder: Array<'constructor' | 'plantillas' | 'analisis' | 'admin'> = ['plantillas', 'analisis', 'constructor', 'admin'];
    
    for (const module of moduleOrder) {
      if (module === 'admin' && authState.user.role_name === 'admin') {
        return module;
      } else if (module !== 'admin' && canAccessModule(module)) {
        return module;
      }
    }
    
    return null;
  };

  // Refrescar datos del usuario
  const refreshUser = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const state = await authService.initialize();
      setAuthState(state);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Error al refrescar datos del usuario'
      }));
    }
  };

  // Valor del contexto
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    hasPermission,
    canAccessModule,
    canAccessSubModule,
    checkAnalysisPermissions,
    getModulePermissions,
    getFirstAvailableModule,
    refreshUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// HOOK PERSONALIZADO PARA USAR EL CONTEXTO
// ============================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// ============================================
// HOC PARA PROTEGER RUTAS
// ============================================

interface ProtectedRouteProps {
  children: ReactNode;
  requirePermission?: string;
  requireModule?: string;
  requireSubModule?: string;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requirePermission,
  requireModule,
  requireSubModule,
  fallback
}) => {
  const { isAuthenticated, isLoading, hasPermission, canAccessModule } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Verificar si está autenticado
  if (!isAuthenticated) {
    return fallback || <LoginRequired />;
  }

  // Verificar permisos específicos
  if (requirePermission && !hasPermission(requirePermission)) {
    return fallback || <AccessDenied permission={requirePermission} />;
  }

  // Verificar acceso a módulos
  if (requireModule && !canAccessModule(requireModule, requireSubModule)) {
    return fallback || <AccessDenied module={requireModule} subModule={requireSubModule} />;
  }

  return <>{children}</>;
};

// ============================================
// COMPONENTES DE FALLBACK
// ============================================

const LoginRequired: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Autenticación Requerida
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Debes iniciar sesión para acceder a esta página.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Ir al Login
      </button>
    </div>
  </div>
);

interface AccessDeniedProps {
  permission?: string;
  module?: string;
  subModule?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ permission, module, subModule }) => {
  const { getFirstAvailableModule } = useAuth();
  
  const handleRedirect = () => {
    const firstModule = getFirstAvailableModule();
    if (firstModule) {
      // Usar event para comunicar el cambio de módulo
      window.dispatchEvent(new CustomEvent('redirectToModule', { detail: firstModule }));
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Acceso Denegado
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          No tienes permisos para acceder a{' '}
          {permission && `la función: ${permission}`}
          {module && `el módulo: ${module}`}
          {subModule && ` > ${subModule}`}
        </p>
        <button
          onClick={handleRedirect}
          className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          Ir al módulo principal
        </button>
      </div>
    </div>
  );
};

// ============================================
// HOOKS DE UTILIDAD
// ============================================

// Hook para verificar si el usuario es admin
export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  return user?.role_name === 'admin';
};

// Hook para verificar múltiples permisos
export const useHasAnyPermission = (permissions: string[]): boolean => {
  const { hasPermission } = useAuth();
  return permissions.some(permission => hasPermission(permission));
};

// Hook para verificar si puede acceder a múltiples módulos
export const useCanAccessAnyModule = (modules: Array<{ module: string; subModule?: string }>): boolean => {
  const { canAccessModule } = useAuth();
  return modules.some(({ module, subModule }) => canAccessModule(module, subModule));
};

export default AuthContext;
