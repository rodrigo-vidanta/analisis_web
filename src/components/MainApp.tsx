import { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import ProjectSelector from './ProjectSelector';
import LoginScreen from './LoginScreen';
import IndividualAgentWizard from './IndividualAgentWizard';
import AdminDashboard from './AdminDashboard';
import AgentStudio from './AgentStudio';
import AnalysisDashboard from './analysis/AnalysisDashboard';
import LiveMonitorKanban from './analysis/LiveMonitorKanban';
import AdminDashboardTabs from './admin/AdminDashboardTabs';
import { useAuth, ProtectedRoute } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
// Componentes Linear
import LinearLayout from './linear/LinearLayout';
import LinearLiveMonitor from './linear/LinearLiveMonitor';
// Academia
import AcademiaDashboard from './academia/AcademiaDashboard';
// Academia Game
import SalesWarriorGame from './academia-game/SalesWarriorGame';

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

  const { user, isLoading, isAuthenticated, getFirstAvailableModule } = authData;
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
  const [localDarkMode, setLocalDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Por defecto abierto
  
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

  // Manejar tema oscuro - detectar preferencia del sistema
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    console.log('🎨 Detectando preferencia de tema:', { savedTheme, systemPrefersDark });
    
    // Prioridad: 1) Tema guardado, 2) Preferencia del sistema
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setLocalDarkMode(shouldBeDark);
    
    // También actualizar el store global para constructor
    if (shouldBeDark !== darkMode) {
      toggleDarkMode();
    }
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    console.log(`🎨 Tema inicial aplicado: ${shouldBeDark ? 'Oscuro' : 'Claro'}`);
  }, []);

  useEffect(() => {
    // Para constructor, usar darkMode del store
    // Para otros módulos, usar localDarkMode
    const shouldBeDark = appMode === 'constructor' ? darkMode : localDarkMode;
    
    console.log('🔄 Aplicando tema:', { appMode, darkMode, localDarkMode, shouldBeDark });
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode, localDarkMode, appMode]);

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
      // Solo redirigir automáticamente en el login inicial, no cuando el usuario selecciona constructor manualmente
      const firstModule = getFirstAvailableModule();
      if (firstModule && firstModule !== 'constructor' && appMode === 'constructor') {
        setAppMode(firstModule);
      }
      setHasInitializedRedirect(true);
    }
  }, [isAuthenticated, user, hasInitializedRedirect, getFirstAvailableModule, setAppMode, appMode]);

  const handleToggleDarkMode = () => {
    console.log('🌙 Cambiando tema desde:', { darkMode, localDarkMode, appMode });
    
    if (appMode === 'constructor') {
      // En constructor, usar el store global y sincronizar local
      toggleDarkMode();
      setLocalDarkMode(!darkMode);
      console.log('🔄 Constructor: toggleDarkMode del store + sync local');
    } else {
      // En otros módulos, cambiar solo estado local
      const newDarkMode = !localDarkMode;
      setLocalDarkMode(newDarkMode);
      console.log(`🔄 Otros módulos: localDarkMode = ${newDarkMode}`);
    }
  };

  // Función para manejar cambio de modo
  const handleModeChange = (mode: 'constructor' | 'plantillas' | 'analisis' | 'admin' | 'academia' | 'academia-game') => {
    setAppMode(mode);
    // Resetear steps cuando cambies de modo para evitar problemas
    if (mode !== 'constructor') {
      setCurrentStep(1);
    }
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

  // Función para renderizar contenido según el modo
  const renderContent = () => {
    switch (appMode) {
      case 'plantillas':
        return (
          <ProtectedRoute requireModule="plantillas">
            <AdminDashboard />
          </ProtectedRoute>
        );
      case 'agent-studio':
        return (
          user?.role_name === 'admin' || user?.role_name === 'developer' ? (
            <AgentStudio />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Acceso Denegado
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Solo administradores y desarrolladores pueden acceder al Agent Studio
                </p>
              </div>
            </div>
          )
        );
      case 'natalia':
        return (
          <ProtectedRoute requireModule="analisis" requireSubModule="natalia">
            <AnalysisDashboard forceMode="natalia" />
          </ProtectedRoute>
        );
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
      case 'academia':
        return (
          <ProtectedRoute requireModule="academia">
            <AcademiaDashboard />
          </ProtectedRoute>
        );
      case 'academia-game':
        return (
          <ProtectedRoute requireModule="academia-game">
            <SalesWarriorGame />
          </ProtectedRoute>
        );
      case 'admin':
        return (
          user?.role_name === 'admin' ? (
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
      case 'constructor':
      default:
        return (
          <ProtectedRoute requireModule="constructor">
            {currentStep === 0 ? (
              <ProjectSelector 
                onNext={setCurrentStep}
                onProjectTypeChange={setProjectType}
              />
            ) : (
              <IndividualAgentWizard 
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                projectType={projectType || 'individual'}
                onNext={() => setCurrentStep(currentStep + 1)}
                onPrevious={() => setCurrentStep(Math.max(1, currentStep - 1))}
              />
            )}
          </ProtectedRoute>
        );
    }
  };

  const themeClasses = getThemeClasses();

  // Si el tema Linear está activo, usar layout completamente diferente
  if (isLinearTheme) {
    return (
      <div className={`${(appMode === 'constructor' ? darkMode : localDarkMode) ? 'dark' : ''}`}>
        <LinearLayout
          darkMode={appMode === 'constructor' ? darkMode : localDarkMode}
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
      (appMode === 'constructor' ? darkMode : localDarkMode) ? 'dark' : ''
    }`}>
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
            darkMode={appMode === 'constructor' ? darkMode : localDarkMode}
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
