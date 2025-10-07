import React, { useState, createContext, useContext } from 'react';
import { Moon, Sun, Monitor, BarChart3, Network, Server, Database, Cloud, Settings, Activity, Terminal } from 'lucide-react';
import './aws-manager.css';

// Lazy load components to avoid circular dependencies
const AWSOverview = React.lazy(() => import('./AWSOverview'));
const InteractiveArchitectureDiagram = React.lazy(() => import('./InteractiveArchitectureDiagram'));
const AWSArchitectureDiagram = React.lazy(() => import('./AWSArchitectureDiagram'));
const AWSServiceFlow = React.lazy(() => import('./AWSServiceFlow'));
const AWSConsole = React.lazy(() => import('./AWSConsole'));
const AWSAdvancedConsole = React.lazy(() => import('./AWSAdvancedConsole'));
const AWSRealTimeMonitor = React.lazy(() => import('./AWSRealTimeMonitor'));
const AWSMigrationController = React.lazy(() => import('./AWSMigrationController'));

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useAWSTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAWSTheme must be used within a ThemeProvider');
  }
  return context;
};

interface AWSManagerProps {
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const AWSManager: React.FC<AWSManagerProps> = ({ 
  darkMode = false, 
  onToggleDarkMode 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState<Theme>(darkMode ? 'dark' : 'light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    onToggleDarkMode?.();
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'architecture', label: 'Arquitectura', icon: Network },
    { id: 'diagram', label: 'Diagrama Visual', icon: Cloud },
    { id: 'flow', label: 'Flujo de Servicios', icon: Monitor },
    { id: 'console', label: 'Consola AWS', icon: Server },
    { id: 'advanced', label: 'Consola Avanzada', icon: Terminal },
    { id: 'monitor', label: 'Monitoreo', icon: Activity },
    { id: 'migration', label: 'Migración', icon: Settings },
  ];

  const renderContent = () => {
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        {(() => {
          switch (activeTab) {
            case 'overview':
              return <AWSOverview />;
            case 'architecture':
              return <InteractiveArchitectureDiagram />;
            case 'diagram':
              return <AWSArchitectureDiagram />;
            case 'flow':
              return <AWSServiceFlow />;
            case 'console':
              return <AWSConsole />;
            case 'advanced':
              return <AWSAdvancedConsole />;
            case 'monitor':
              return <AWSRealTimeMonitor />;
            case 'migration':
              return <AWSMigrationController />;
            default:
              return <AWSOverview />;
          }
        })()}
      </React.Suspense>
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`aws-manager min-h-screen ${darkMode ? 'dark' : ''}`} data-theme={theme}>
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/20 dark:border-slate-700/20 sticky top-0 z-40">
          <div className="px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              {/* Título */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Cloud className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                      AWS Manager
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Gestión de Infraestructura en la Nube
                    </p>
                  </div>
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center space-x-3">
                {/* Indicadores de estado */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-slate-600 dark:text-slate-400">AWS us-west-2</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Database size={14} className="text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">RDS Online</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Server size={14} className="text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">ECS Running</span>
                  </div>
                </div>
                
                {/* Toggle tema */}
                <button 
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                  onClick={toggleTheme}
                  title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación de pestañas */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="px-6 lg:px-8">
            <nav className="flex space-x-8 -mb-px">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <IconComponent size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Contenido principal */}
        <main className="flex-1 bg-slate-50 dark:bg-slate-800">
          <div className="px-6 lg:px-8 py-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default AWSManager;
