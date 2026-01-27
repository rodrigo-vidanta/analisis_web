// ============================================
// CONTEXTO DE AUTENTICACIÓN PARA REACT
// ============================================
// 
// ⚠️ MIGRACIÓN 16 Enero 2026:
// - Refactorizado para usar Supabase Auth nativo
// - onAuthStateChange para detectar cambios de sesión
// - Sesiones manejadas automáticamente por Supabase JWT
//

import React, { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { authService, type Permission, type AuthState, type LoginCredentials } from '../services/authService';
import { permissionsService } from '../services/permissionsService';
import { etapasService } from '../services/etapasService';
import LightSpeedTunnel from '../components/LightSpeedTunnel';
import BackupSelectionModal from '../components/auth/BackupSelectionModal';
import { supabaseSystemUI as supabase, supabaseSystemUI } from '../config/supabaseSystemUI';
import { useLiveActivityStore } from '../stores/liveActivityStore';
import toast from 'react-hot-toast';

// Tipos para el contexto
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: (backupId?: string) => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  canAccessModule: (module: string, subModule?: string) => boolean;
  canAccessSubModule: (subModule: 'natalia' | 'pqnc') => boolean;
  canAccessLiveMonitor: () => boolean;
  checkAnalysisPermissions: () => Promise<{natalia: boolean, pqnc: boolean}>;
  getModulePermissions: (module: string) => Permission[];
  getFirstAvailableModule: () => 'natalia' | 'pqnc' | 'live-monitor' | 'admin' | 'ai-models' | 'live-chat' | 'direccion' | 'operative-dashboard' | null;
  refreshUser: () => Promise<void>;
  // Indica si el usuario real (no suplantado) es admin
  isRealAdmin: boolean;
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
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionBroadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const backupRealtimeChannelRef = useRef<any>(null);

  // Inicializar autenticación al cargar la aplicación
  useEffect(() => {
    initializeAuth();
  }, []);

  // ============================================
  // SUSCRIPCIÓN A CAMBIOS DE AUTH (Supabase Auth nativo)
  // ============================================
  useEffect(() => {
    // Suscribirse a cambios de autenticación de Supabase
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        // Log removido para producción
        
        if (event === 'SIGNED_IN' && session) {
          // Usuario acaba de iniciar sesión
          const state = await authService.initialize();
          setAuthState(state);
        } else if (event === 'SIGNED_OUT') {
          // Usuario cerró sesión - limpiar TODO inmediatamente
          
          // 1. Limpiar cache de permisos
          permissionsService.invalidateAllCache();
          
          // 2. Limpiar el store de Live Activity Widget INMEDIATAMENTE
          // para evitar que siga haciendo requests después del logout
          useLiveActivityStore.getState().cleanup();
          
          // 3. Limpiar estado de autenticación
          setAuthState({
            user: null,
            permissions: [],
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token fue refrescado - silencioso
          console.log('🔐 Token refreshed');
        } else if (event === 'USER_UPDATED' && session) {
          // Usuario fue actualizado - recargar datos
          await refreshUser(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refrescar datos del usuario (definir antes de usar en useEffect)
  const refreshUser = async (silent: boolean = false): Promise<void> => {
    try {
      if (!silent) {
        setAuthState(prev => ({ ...prev, isLoading: true }));
      }
      const state = await authService.initialize();
      setAuthState(prev => ({
        ...state,
        isLoading: silent ? prev.isLoading : state.isLoading // Mantener loading si es silencioso
      }));
    } catch (error) {
      console.error('Error refreshing user:', error);
      if (!silent) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Error al refrescar datos del usuario'
        }));
      }
    }
  };

  // Suscripción realtime para detectar cuando se asigna un backup al usuario actual
  useEffect(() => {
    if (!authState.user?.id || !authState.isAuthenticated) {
      // Limpiar suscripción si no hay usuario autenticado
      if (backupRealtimeChannelRef.current) {
        supabaseSystemUI.removeChannel(backupRealtimeChannelRef.current);
        backupRealtimeChannelRef.current = null;
      }
      return;
    }

    // ============================================
    // NOTA: Suscripción realtime DESHABILITADA
    // ============================================
    // La tabla auth_users fue migrada a auth.users (Supabase Auth nativo)
    // Las vistas (user_profiles_v2) no soportan realtime
    // Los cambios de backup se detectan en refreshUser() al hacer login
    // 
    // Mantener el ref para compatibilidad pero sin suscripción activa
    backupRealtimeChannelRef.current = null;

    // Cleanup al desmontar o cambiar de usuario
    return () => {
      if (backupRealtimeChannelRef.current) {
        supabaseSystemUI.removeChannel(backupRealtimeChannelRef.current);
        backupRealtimeChannelRef.current = null;
      }
    };
  }, [authState.user?.id, authState.isAuthenticated]);

  // ============================================
  // NOTA: Verificación de sesión legacy DEPRECADA
  // ============================================
  // Con Supabase Auth nativo, las sesiones se manejan automáticamente:
  // - JWT con refresh automático
  // - onAuthStateChange detecta cambios
  // - No necesitamos auth_sessions custom ni broadcast manual
  //
  // Mantenemos cleanup de refs legacy por compatibilidad
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user?.id) {
      if (sessionBroadcastChannelRef.current) {
        supabase?.removeChannel(sessionBroadcastChannelRef.current);
        sessionBroadcastChannelRef.current = null;
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    }

    return () => {
      if (sessionBroadcastChannelRef.current) {
        supabase?.removeChannel(sessionBroadcastChannelRef.current);
        sessionBroadcastChannelRef.current = null;
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [authState.isAuthenticated, authState.user?.id]);

  // Handler para forzar logout cuando la sesión es invalidada externamente
  const handleForceLogout = (reason: string) => {
    console.log(`🔐 Cerrando sesión automáticamente: ${reason}`);
    
    // Mostrar notificación PRIMERO (antes de desmontar componentes)
    toast('Iniciaste sesión en otro dispositivo', {
      duration: 5000,
      icon: '🔐',
      style: {
        background: '#1f2937',
        color: '#fff',
      }
    });

    // Limpiar canal de broadcast
    if (sessionBroadcastChannelRef.current) {
      supabase.removeChannel(sessionBroadcastChannelRef.current);
      sessionBroadcastChannelRef.current = null;
    }
    
    // Limpiar intervalo de verificación
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }

    // Limpiar localStorage
    localStorage.removeItem('auth_token');
    
    // ⚠️ CRÍTICO: Invalidar caché de permisos
    permissionsService.invalidateAllCache();
    
    // Pequeño delay para que el toast se renderice antes de desmontar
    setTimeout(() => {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        permissions: [],
        error: null
      });
    }, 100);
  };

  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Inicializar auth primero
      const state = await authService.initialize();
      
      setAuthState(state);
      
      // ✅ Solo cargar etapas si hay usuario autenticado
      if (state.isAuthenticated && state.user) {
        etapasService.loadEtapas().catch(err => {
          console.error('⚠️ Error cargando etapas:', err);
          // No bloquear si falla carga de etapas
        });
      }
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
      // Mostrar animación de login
      setShowLoginAnimation(true);
      
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // ⚠️ CRÍTICO: Invalidar caché de permisos ANTES de hacer login
      // para asegurar que se carguen permisos frescos del nuevo usuario
      permissionsService.invalidateAllCache();
      
      const state = await authService.login(credentials);
      
      setAuthState(state);
      
      // ✅ Cargar etapas después de login exitoso
      if (state.isAuthenticated && state.user) {
        etapasService.loadEtapas().catch(err => {
          console.error('⚠️ Error cargando etapas después de login:', err);
        });
      }
      
      if (!state.isAuthenticated) {
        // Si falla el login, ocultar la animación
        setShowLoginAnimation(false);
      }
      
      return state.isAuthenticated;
    } catch (error) {
      console.error('Error en login:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: `Error en el login: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }));
      // Si hay error, ocultar la animación
      setShowLoginAnimation(false);
      return false;
    }
  };

  // Función de logout
  const logout = async (backupId?: string | Event): Promise<void> => {
    // Validar que backupId sea un string válido, no un evento
    const validBackupId = backupId && typeof backupId === 'string' && backupId.trim() !== '' 
      ? backupId 
      : undefined;
    
    // Si es ejecutivo o supervisor y no se proporcionó backupId válido, mostrar modal de backup
    const isEjecutivo = authState.user?.role_name === 'ejecutivo';
    const isSupervisor = authState.user?.role_name === 'supervisor';
    const hasCoordinacion = !!authState.user?.coordinacion_id;
    const hasCoordinacionesIds = authState.user?.coordinaciones_ids && authState.user.coordinaciones_ids.length > 0;
    
    // Mostrar modal de backup si es ejecutivo o supervisor sin backup preseleccionado
    // Ejecutivos usan coordinacion_id, supervisores usan coordinaciones_ids
    const shouldShowBackupModal = !validBackupId && (
      (isEjecutivo && hasCoordinacion) ||
      (isSupervisor && (hasCoordinacion || hasCoordinacionesIds))
    );
    
    if (shouldShowBackupModal) {
      setShowBackupModal(true);
      return;
    }

    // Si se proporcionó backupId válido o no es ejecutivo, proceder con logout normal
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.logout(validBackupId);
      
      // ⚠️ CRÍTICO: Invalidar caché de permisos al cerrar sesión
      permissionsService.invalidateAllCache();
      
      setAuthState({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      setShowBackupModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      
      // ⚠️ CRÍTICO: Invalidar caché de permisos incluso si falla el logout
      permissionsService.invalidateAllCache();
      
      // Forzar logout local aunque falle el servidor
      setAuthState({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      setShowBackupModal(false);
    }
  };

  // Función para manejar la selección de backup
  const handleBackupSelected = async (backupId: string): Promise<void> => {
    setShowBackupModal(false);
    await logout(backupId);
  };

  // Función para manejar la cancelación del modal de backup
  const handleCancelBackupSelection = (): void => {
    console.log('❌ Modal cancelado, cerrando sin hacer logout');
    setShowBackupModal(false);
    // NO hacer logout, solo cerrar el modal y volver a la aplicación
  };

  // Función para logout sin asignar backup (ejecutivo consciente de que sus prospectos no serán visibles)
  const handleLogoutWithoutBackup = async (): Promise<void> => {
    setShowBackupModal(false);
    
    // Hacer logout con un marcador especial que indica "sin backup explícito"
    // El authService.logout se encargará de marcar is_operativo = false
    await authService.logout(undefined);
    
    // Limpiar estado
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      permissions: []
    });
  };

  // Función para manejar el completado de la animación
  const handleLoginAnimationComplete = () => {
    setShowLoginAnimation(false);
  };

  // Verificar permisos
  const hasPermission = (permissionName: string): boolean => {
    return authService.hasPermission(permissionName);
  };

  // Verificar acceso a módulos
  const canAccessModule = (module: string, subModule?: string): boolean => {
    return authService.canAccessModule(module, subModule);
  };

  // Verificar acceso a sub-módulos de análisis usando permisos específicos
  const canAccessSubModule = (subModule: 'natalia' | 'pqnc'): boolean => {
    if (!authState.user) return false;
    
    // Admins tienen acceso completo
    if (authState.user.role_name === 'admin') return true;
    
    // Developers tienen acceso a análisis
    if (authState.user.role_name === 'developer') return true;
    
    // Evaluators: verificar permisos específicos (implementaremos verificación asíncrona)
    if (authState.user.role_name === 'evaluator') {
      // Por ahora, usar la lógica del servicio si existe
      return authService.canAccessSubModule ? authService.canAccessSubModule(subModule) : false;
    }
    
    return false;
  };

  // Estado para permisos de evaluador cargados desde BD
  const [evaluatorPermissions, setEvaluatorPermissions] = useState<{natalia: boolean, pqnc: boolean, live_monitor: boolean} | null>(null);

  // Cargar permisos de evaluador desde BD al login
  useEffect(() => {
    const loadEvaluatorPermissions = async () => {
      if (authState.user?.role_name === 'evaluator') {
        try {
          // TEMPORAL: Usar consulta directa hasta que RPC incluya live_monitor
          // Consultar permisos desde auth_user_permissions directamente
          const { data: userPermissions, error: permError } = await supabase
            .from('auth_user_permissions')
            .select('permission_name, module, sub_module')
            .eq('user_id', authState.user.id);

          if (permError) {
            // Fallback a localStorage
            const permissionsKey = `evaluator_permissions_${authState.user.email}`;
            const savedPermissions = localStorage.getItem(permissionsKey);
            if (savedPermissions) {
              const permData = JSON.parse(savedPermissions);
              setEvaluatorPermissions({
                natalia: permData.natalia_access || false,
                pqnc: permData.pqnc_access || false,
                live_monitor: permData.live_monitor_access || false
              });
            }
          } else {
            // Procesar permisos obtenidos
            const nataliaAccess = userPermissions?.some(p => p.module === 'analisis' && p.sub_module === 'natalia') || false;
            const pqncAccess = userPermissions?.some(p => p.module === 'analisis' && p.sub_module === 'pqnc') || false;
            const liveMonitorAccess = userPermissions?.some(p => 
              (p.module === 'analisis' && p.sub_module === 'live_monitor') || 
              p.permission_name === 'analisis.live_monitor.view' ||
              p.module === 'live_monitor' || 
              p.permission_name === 'live_monitor.access'
            ) || false;
            
            setEvaluatorPermissions({
              natalia: nataliaAccess,
              pqnc: pqncAccess,
              live_monitor: liveMonitorAccess
            });
            
            // Si no tiene permisos en BD, usar localStorage como fallback
            if (!liveMonitorAccess) {
              const permissionsKey = `evaluator_permissions_${authState.user.email}`;
              const savedPermissions = localStorage.getItem(permissionsKey);
              if (savedPermissions) {
                const permData = JSON.parse(savedPermissions);
                setEvaluatorPermissions(prev => ({
                  natalia: prev?.natalia || permData.natalia_access || false,
                  pqnc: prev?.pqnc || permData.pqnc_access || false,
                  live_monitor: permData.live_monitor_access || false
                }));
              }
            }
          }
        } catch (e) {
          // Error silencioso - los permisos se manejan con fallback
        }
      }
    };

    if (authState.user) {
      loadEvaluatorPermissions();
    }
  }, [authState.user]);

  // Verificar acceso a Live Monitor
  const canAccessLiveMonitor = (): boolean => {
    if (!authState.user) {
      return false;
    }
    
    // Admins siempre tienen acceso
    if (authState.user.role_name === 'admin') return true;
    
    // Developers tienen acceso a Live Monitor
    if (authState.user.role_name === 'developer') return true;
    
    
    // Coordinadores tienen acceso a Live Monitor (ven todas las llamadas de su coordinación)
    if (authState.user.role_name === 'coordinador') return true;
    
    // Supervisores tienen acceso a Live Monitor (ven llamadas de su coordinación)
    if (authState.user.role_name === 'supervisor') return true;
    
    // Ejecutivos tienen acceso a Live Monitor (solo ven llamadas de sus prospectos asignados)
    if (authState.user.role_name === 'ejecutivo') return true;
    
    // Evaluators: usar permisos cargados desde BD
    if (authState.user.role_name === 'evaluator') {
      if (evaluatorPermissions) {
        return evaluatorPermissions.live_monitor;
      } else {
        // Fallback temporal a localStorage mientras cargan los permisos
        const permissionsKey = `evaluator_permissions_${authState.user.email}`;
        const savedPermissions = localStorage.getItem(permissionsKey);
        
        if (savedPermissions) {
          try {
            const permData = JSON.parse(savedPermissions);
            return permData.live_monitor_access === true;
          } catch (e) {
            return false;
          }
        }
        
        return false;
      }
    }
    
    // Otros roles no tienen acceso por defecto
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
        const { analysisSupabase } = await import('../config/analysisSupabase');
        const { data, error } = await analysisSupabase.rpc('get_evaluator_analysis_config', {
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
  const getFirstAvailableModule = (): 'natalia' | 'pqnc' | 'live-monitor' | 'admin' | 'ai-models' | 'live-chat' | 'direccion' | 'operative-dashboard' | null => {
    if (!authState.user) return null;

    // Si el usuario tiene rol direccion, solo puede acceder al módulo direccion
    if (authState.user.role_name === 'direccion') {
      return 'direccion';
    }

    // Dashboard Operativo como pantalla de inicio para ejecutivo, coordinador, admin operativo y admin
    if (['ejecutivo', 'coordinador', 'administrador_operativo', 'admin'].includes(authState.user.role_name)) {
      // Verificar que el usuario tenga acceso a al menos uno de los módulos del dashboard
      if (canAccessModule('prospectos') || canAccessModule('live-chat') || canAccessModule('live-monitor')) {
        return 'operative-dashboard';
      }
    }
    
    // AI Models para productor y developer (admin ahora va a operative-dashboard)
    if (['productor', 'developer'].includes(authState.user.role_name)) {
      return 'ai-models';
    }
    
    // Priorizar submódulos específicos de análisis
    if (canAccessModule('analisis') && canAccessSubModule('natalia')) return 'natalia';
    if (canAccessModule('analisis') && canAccessSubModule('pqnc')) return 'pqnc';
    if (canAccessLiveMonitor()) return 'live-monitor';
    
    // Live Chat disponible para todos los usuarios autenticados
    if (canAccessModule('live-chat')) return 'live-chat';
    
    if (authState.user.role_name === 'admin') return 'admin';

    return null;
  };


  // Verificar si el usuario REAL es admin (sin considerar modo ninja)
  const isRealAdmin = authState.user?.role_name === 'admin';

  // Valor del contexto
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    hasPermission,
    canAccessModule,
    canAccessSubModule,
    canAccessLiveMonitor,
    checkAnalysisPermissions,
    getModulePermissions,
    getFirstAvailableModule,
    refreshUser,
    isRealAdmin
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      
      {/* Animación de túnel de velocidad luz a nivel global */}
      <LightSpeedTunnel 
        isVisible={showLoginAnimation} 
        onComplete={handleLoginAnimationComplete}
        type="login"
      />

      {/* Modal de selección de backup para ejecutivos y supervisores */}
      {showBackupModal && (authState.user?.role_name === 'ejecutivo' || authState.user?.role_name === 'supervisor') && (
        <BackupSelectionModal
          isOpen={showBackupModal}
          ejecutivoId={authState.user.id}
          coordinacionId={
            // Para ejecutivos: usar coordinacion_id directamente
            // Para supervisores: usar primera coordinación de coordinaciones_ids, o coordinacion_id como fallback
            authState.user.role_name === 'ejecutivo'
              ? authState.user.coordinacion_id!
              : (authState.user.coordinaciones_ids?.[0] || authState.user.coordinacion_id || '')
          }
          onBackupSelected={handleBackupSelected}
          onCancel={handleCancelBackupSelection}
          onLogoutWithoutBackup={handleLogoutWithoutBackup}
        />
      )}
    </AuthContext.Provider>
  );
};

// ============================================
// HOOK PERSONALIZADO PARA USAR EL CONTEXTO
// ============================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('❌ useAuth llamado fuera de AuthProvider');
    console.trace('Stack trace del error:');
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
  requireLiveMonitor?: boolean;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requirePermission,
  requireModule,
  requireSubModule,
  requireLiveMonitor,
  fallback
}) => {
  const { isAuthenticated, isLoading, hasPermission, canAccessModule, canAccessLiveMonitor } = useAuth();

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

  // Verificar acceso a Live Monitor
  if (requireLiveMonitor && !canAccessLiveMonitor()) {
    return fallback || <AccessDenied module="live-monitor" />;
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

/**
 * Hook para verificar si el usuario es admin
 * @deprecated Usar useEffectivePermissions().isAdmin en su lugar para considerar grupos
 */
export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  // NOTA: Este hook solo verifica el rol base
  // Para permisos efectivos (rol + grupos), usar useEffectivePermissions().isAdmin
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
