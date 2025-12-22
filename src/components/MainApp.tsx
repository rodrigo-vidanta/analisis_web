import { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import ProjectSelector from './ProjectSelector';
import LoginScreen from './LoginScreen';
import IndividualAgentWizard from './IndividualAgentWizard';
import AdminDashboard from './AdminDashboard';
import AnalysisDashboard from './analysis/AnalysisDashboard';
import LiveMonitorKanban from './analysis/LiveMonitorKanban';
import AdminDashboardTabs from './admin/AdminDashboardTabs';
import { useAuth, ProtectedRoute } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { errorLogService } from '../services/errorLogService';
import { useTheme } from '../hooks/useTheme';
import { useEffectivePermissions } from '../hooks/useEffectivePermissions';
// Componentes Linear
import LinearLayout from './linear/LinearLayout';
import LinearLiveMonitor from './linear/LinearLiveMonitor';
// AI Models Manager
import AIModelsManager from './ai-models/AIModelsManager';

// Live Chat
import LiveChatModule from './chat/LiveChatModule';

// Prospectos Manager
import ProspectosManager from './prospectos/ProspectosManager';

// Scheduled Calls Manager
import ScheduledCallsManager from './scheduled-calls/ScheduledCallsManager';

// Operative Dashboard
import { OperativeDashboard } from './dashboard/OperativeDashboard';

// Campaigns Manager
import CampaignsDashboardTabs from './campaigns/CampaignsDashboardTabs';

// Analysis IA Complete
import AnalysisIAComplete from './analysis/AnalysisIAComplete';
// Change Password Modal
import ChangePasswordModal from './auth/ChangePasswordModal';
// Timeline Dirección
import Timeline from './direccion/Timeline';
// Hook de inactividad
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';

function MainApp() {
  // Verificación de seguridad para AuthContext
  let authData;
  try {
    authData = useAuth();
  } catch (error) {
    console.error('❌ Error en useAuth:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-4">
            Error de Autenticación
          </h2>
          <p className="text-red-700 dark:text-red-300">
            Problema con el sistema de autenticación. Recarga la página.
          </p>
        </div>
      </div>
    );
  }

  const { user, isLoading, isAuthenticated, canAccessModule, getFirstAvailableModule } = authData;
  const { 
    currentStep, 
    projectType, 
    darkMode, 
    appMode, 
    setCurrentStep, 
    setProjectType, 
    toggleDarkMode, 
    setAppMode, 
    resetApp 
  } = useAppStore();
  const [localDarkMode, setLocalDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Por defecto abierto
  
  // Permisos efectivos (rol base + grupos asignados)
  const { isAdmin } = useEffectivePermissions();
  
  // Hook para detectar inactividad y hacer logout automático después de 2 horas
  useInactivityTimeout();
  
  // Actualizar el módulo activo en el servicio de logging cuando cambia
  useEffect(() => {
    errorLogService.setActiveModule(appMode);
  }, [appMode]);
  
  // Hook de tema para el rediseño
  const { currentTheme, getThemeClasses, isLinearTheme } = useTheme();

  // Calcular progreso
  const getTotalSteps = () => {
    if (projectType === 'individual') return 8;
    if (projectType === 'squad') return 10;
    return 3; // Steps por defecto
  };

  const progress = getTotalSteps() > 0 ? (currentStep / getTotalSteps()) * 100 : 0;
  
  const getProgressText = () => {
    const totalSteps = getTotalSteps();
    if (currentStep === 0) return 'Selección de proyecto';
    if (currentStep === 1) return 'Configuración inicial';
    if (projectType === 'squad') {
      const currentAgent = Math.ceil(currentStep / 8);
      return `Agente ${currentAgent} - Paso ${currentStep % 8 || 8} de 8`;
    }
    return `Paso ${currentStep} de ${totalSteps}`;
  };

  // Manejar tema oscuro - por defecto oscuro, detectar preferencia guardada
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    
    // Prioridad: 1) Tema guardado explícitamente, 2) Por defecto oscuro
    let shouldBeDark: boolean;
    if (savedTheme === 'dark') {
      shouldBeDark = true;
    } else if (savedTheme === 'light') {
      shouldBeDark = false;
    } else {
      // Si no hay tema guardado, usar modo oscuro por defecto
      shouldBeDark = true;
    }
    
    setLocalDarkMode(shouldBeDark);
    
    // Sincronizar store global
    if (shouldBeDark !== darkMode) {
      toggleDarkMode();
    }
    
    // Aplicar tema al documento inmediatamente (excepto módulo direccion)
    // El módulo direccion maneja su propio tema, así que no aplicamos clase dark aquí
    if (appMode !== 'direccion') {
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Asegurar que direccion no tenga clase dark
      document.documentElement.classList.remove('dark');
    }
    
    // Guardar el tema en localStorage para asegurar persistencia
    localStorage.setItem('theme', shouldBeDark ? 'dark' : 'light');
    
  }, [appMode, darkMode, toggleDarkMode]);

  useEffect(() => {
    // Excluir módulo direccion del sistema de temas global
    if (appMode === 'direccion') {
      // Remover clase dark del documento para que direccion maneje su propio tema
      document.documentElement.classList.remove('dark');
      return;
    }
    
    // Usar localDarkMode para todos los módulos
    const shouldBeDark = localDarkMode;
    
    // Sincronizar tema globalmente entre módulos
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // Sincronizar store global si es necesario
    if (shouldBeDark !== darkMode) {
      toggleDarkMode();
    }
  }, [darkMode, localDarkMode, appMode, toggleDarkMode]);

  // Listener para navegación a Live Chat desde sidebars
  useEffect(() => {
    const handleNavigateToLiveChat = (event: CustomEvent) => {
      const prospectoId = event.detail;
      if (prospectoId) {
        setAppMode('live-chat');
        localStorage.setItem('livechat-prospect-id', prospectoId);
      }
    };

    window.addEventListener('navigate-to-livechat', handleNavigateToLiveChat as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-livechat', handleNavigateToLiveChat as EventListener);
    };
  }, []);

  // Listener para navegación desde notificaciones
  useEffect(() => {
    const handleNavigateToModule = (event: CustomEvent) => {
      const module = event.detail;
      if (module === 'live-chat' || module === 'live-monitor') {
        setAppMode(module);
      }
    };

    window.addEventListener('navigate-to-module', handleNavigateToModule as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-module', handleNavigateToModule as EventListener);
    };
  }, [setAppMode]);

  // Listener para redirecciones desde AccessDenied
  useEffect(() => {
    const handleRedirect = (event: CustomEvent) => {
      const targetModule = event.detail;
      if (targetModule) {
        setAppMode(targetModule);
      }
    };

    window.addEventListener('redirectToModule', handleRedirect as EventListener);
    
    return () => {
      window.removeEventListener('redirectToModule', handleRedirect as EventListener);
    };
  }, [setAppMode]);

  // Redireccionar al primer módulo disponible SOLO después del login inicial
  const [hasInitializedRedirect, setHasInitializedRedirect] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated && user && !hasInitializedRedirect) {
      // Si el usuario tiene rol direccion, redirigir directamente al timeline y forzar el modo
      if (user.role_name === 'direccion') {
        setAppMode('direccion');
        setHasInitializedRedirect(true);
        return;
      }
      
      // Solo redirigir automáticamente en el login inicial
      const firstModule = getFirstAvailableModule();
      if (firstModule) {
        setAppMode(firstModule);
      }
      setHasInitializedRedirect(true);
    }
  }, [isAuthenticated, user, hasInitializedRedirect, getFirstAvailableModule, setAppMode, appMode]);

  // Bloquear cambio de módulo para usuarios con rol direccion
  useEffect(() => {
    if (user?.role_name === 'direccion' && appMode !== 'direccion') {
      setAppMode('direccion');
    }
  }, [user?.role_name, appMode, setAppMode]);

  const handleToggleDarkMode = () => {
    // Excluir módulo direccion del toggle global
    if (appMode === 'direccion') {
      return;
    }
    
    // Cambiar estado local y sincronizar globalmente
    const newDarkMode = !localDarkMode;
    setLocalDarkMode(newDarkMode);
    
    // Sincronizar con store global
    if (newDarkMode !== darkMode) {
      toggleDarkMode();
    }
    
    // Aplicar inmediatamente al documento
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Guardar en localStorage para persistencia entre módulos
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  // Función para manejar cambio de modo
  const handleModeChange = (mode: 'analisis' | 'admin' | 'live-chat' | 'direccion' | 'campaigns') => {
    // Bloquear cambio de módulo para usuarios con rol direccion
    if (user?.role_name === 'direccion' && mode !== 'direccion') {
      return; // No permitir cambiar de módulo
    }
    
    // Si se sale del módulo direccion, restaurar tema global
    if (appMode === 'direccion' && mode !== 'direccion') {
      const savedTheme = localStorage.getItem('theme');
      const shouldBeDark = savedTheme === 'dark' || (savedTheme !== 'light' && true); // Default dark
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      toggleDarkMode();
    }
    
    // Si se entra al módulo direccion, remover clase dark del documento
    if (mode === 'direccion') {
      document.documentElement.classList.remove('dark');
    }
    
    setAppMode(mode);
    setCurrentStep(1);
  };

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4 mx-auto"></div>
          <h2 className="text-white text-xl font-medium">Cargando...</h2>
        </div>
      </div>
    );
  }

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Mostrar modal de cambio de contraseña si es requerido
  if (user?.must_change_password) {
    return (
      <ChangePasswordModal
        userId={user.id}
        onSuccess={async () => {
          // Recargar datos del usuario después de cambiar contraseña
          await authData.refreshUser();
        }}
      />
    );
  }

  // Función para renderizar contenido según el modo
  const renderContent = () => {
    switch (appMode) {
      case 'natalia':
        // Módulo oculto pero código preservado
        return (
          <ProtectedRoute requireModule="analisis" requireSubModule="natalia">
            <AnalysisIAComplete />
          </ProtectedRoute>
        );
        // return null; // Oculto temporalmente
      case 'pqnc':
        return (
          <ProtectedRoute requireModule="analisis" requireSubModule="pqnc">
            <AnalysisDashboard forceMode="pqnc" />
          </ProtectedRoute>
        );
      case 'live-monitor':
        return (
          <ProtectedRoute requireLiveMonitor={true}>
            {isLinearTheme ? <LinearLiveMonitor /> : <LiveMonitorKanban />}
          </ProtectedRoute>
        );
      case 'ai-models':
        return <AIModelsManager />;
      case 'live-chat':
        return (
          <ProtectedRoute requireModule="live-chat">
            <LiveChatModule />
          </ProtectedRoute>
        );
      case 'admin':
        return (
          canAccessModule('admin') ? (
            <AdminDashboardTabs />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Acceso Denegado
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  No tienes permisos para acceder a la administración del sistema
                </p>
              </div>
            </div>
          )
        );
      case 'prospectos':
        return (
          canAccessModule('prospectos') ? (
            <ProspectosManager 
              onNavigateToLiveChat={(prospectoId) => {
                setAppMode('live-chat');
                localStorage.setItem('livechat-prospect-id', prospectoId);
              }}
              onNavigateToNatalia={(callId) => {
                setAppMode('natalia');
                // Pasar callId mediante URL params o localStorage para que Natalia lo capture
                localStorage.setItem('natalia-search-call-id', callId);
                setTimeout(() => {
                  // Trigger search después de que el componente se monte
                  window.dispatchEvent(new CustomEvent('natalia-search-call-id', { detail: callId }));
                }, 500);
              }}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Acceso Denegado
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  No tienes permisos para acceder a Prospectos
                </p>
              </div>
            </div>
          )
        );

      case 'scheduled-calls':
        return (
          canAccessModule('scheduled-calls') ? (
            <ProtectedRoute requireModule="scheduled-calls">
              <ScheduledCallsManager 
                onNavigateToLiveChat={(prospectoId) => {
                  setAppMode('live-chat');
                  localStorage.setItem('livechat-prospect-id', prospectoId);
                }}
              />
            </ProtectedRoute>
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Acceso Denegado
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  No tienes permisos para acceder al módulo de Llamadas Programadas
                </p>
              </div>
            </div>
          )
        );

      case 'direccion':
        // Módulo completamente desacoplado - diseño independiente
        return <Timeline />;

      case 'operative-dashboard':
        return (
          canAccessModule('prospectos') || canAccessModule('live-chat') || canAccessModule('live-monitor') ? (
            <OperativeDashboard />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Acceso Denegado
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  No tienes permisos para acceder al Dashboard Operativo
                </p>
              </div>
            </div>
          )
        );

      case 'campaigns':
        return (
          isAdmin ? (
            <CampaignsDashboardTabs />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Acceso Denegado
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Solo administradores pueden acceder al módulo de Campañas
                </p>
              </div>
            </div>
          )
        );

      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Bienvenido a PQNC AI Platform
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Selecciona un módulo del menú lateral para comenzar
              </p>
            </div>
          </div>
        );
    }
  };

  const themeClasses = getThemeClasses();

  // Si es módulo dirección, renderizar sin layout (completamente desacoplado)
  if (appMode === 'direccion') {
    return (
      <>
        {/* <NotificationListener /> */}
        {renderContent()}
      </>
    );
  }

  // Si el tema Linear está activo, usar layout completamente diferente
  if (isLinearTheme) {
    return (
      <div className={`${localDarkMode ? 'dark' : ''}`}
        data-module={appMode}
      >
        {/* <NotificationListener /> */}
        <LinearLayout
          darkMode={localDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          currentMode={appMode}
        >
          {renderContent()}
        </LinearLayout>
      </div>
    );
  }

  // Layout original para tema corporativo
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      localDarkMode ? 'dark' : ''
    }`} data-module={appMode}>
      {/* <NotificationListener /> */}
      <div className={`min-h-screen ${themeClasses.background} flex transition-all duration-300`}>
        
        {/* Sidebar with theme support */}
        <div className={`${themeClasses.sidebar} transition-all duration-300`}>
          <Sidebar 
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
        
        {/* Contenido principal */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}>
          
          {/* Header simplificado */}
          <Header
            currentStep={currentStep}
            progress={progress}
            progressText={getProgressText()}
            darkMode={localDarkMode}
            appMode={appMode}
            onToggleDarkMode={handleToggleDarkMode}
            onReset={resetApp}
            onModeChange={handleModeChange}
            simplified={true}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          
          {/* Área de contenido con espacio para footer fijo */}
          <main className="relative flex-1 pb-16">
            <div className={isLinearTheme ? 'linear-theme-content' : ''}>
              {renderContent()}
            </div>
          </main>
        </div>
        
        {/* Footer fijo en la parte inferior */}
        <div className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'
        }`}>
          <Footer />
        </div>
      </div>
    </div>
  );
}


export default MainApp;
