import { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import ProjectSelector from './ProjectSelector';
import LoginScreen from './LoginScreen';
import IndividualAgentWizard from './IndividualAgentWizard';
import AdminDashboard from './AdminDashboard';
import AnalysisDashboard from './analysis/AnalysisDashboard';
import AdminDashboardTabs from './admin/AdminDashboardTabs';
import { useAuth, ProtectedRoute } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';

function MainApp() {
  const { user, isLoading, isAuthenticated, getFirstAvailableModule } = useAuth();
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

  // Manejar tema oscuro
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setLocalDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode || localDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode, localDarkMode]);

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
    if (appMode === 'constructor') {
      toggleDarkMode();
    } else {
      setLocalDarkMode(!localDarkMode);
    }
  };

  // Función para manejar cambio de modo
  const handleModeChange = (mode: 'constructor' | 'plantillas' | 'analisis' | 'admin') => {
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
      case 'analisis':
        return (
          <ProtectedRoute requireModule="analisis">
            <AnalysisDashboard />
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode || localDarkMode ? 'dark' : ''
    }`}>
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
        <Header
          currentStep={currentStep}
          progress={progress}
          progressText={getProgressText()}
          darkMode={darkMode || localDarkMode}
          appMode={appMode}
          onToggleDarkMode={handleToggleDarkMode}
          onReset={resetApp}
          onModeChange={handleModeChange}
        />
        <main className="relative flex-1">
          {renderContent()}
        </main>
        <Footer />
      </div>
    </div>
  );
}


export default MainApp;
