import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { errorLogService, type LogServerConfig } from '../../services/errorLogService';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import toast from 'react-hot-toast';
import LogDashboard from './LogDashboard';
import UChatErrorLogs from './UChatErrorLogs';

type LogServerTab = 'dashboard' | 'uchat-errors' | 'log-server';

const LogServerManager: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useEffectivePermissions();
  const [activeTab, setActiveTab] = useState<LogServerTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<LogServerConfig | null>(null);
  const [config, setConfig] = useState<LogServerConfig>({
    webhook_url: import.meta.env.VITE_N8N_ERROR_LOG_URL || '',
    webhook_auth_token: '', // Token gestionado en backend, no en frontend
    enabled: true,
    rate_limit: 300,
    rate_limit_window: 1
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const loadedConfig = await errorLogService.loadConfig();
      if (loadedConfig) {
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      toast.success('Cambios descartados');
    } else {
      loadConfig();
    }
  };

  const hasChanges = () => {
    if (!originalConfig) return false;
    return (
      config.webhook_url !== originalConfig.webhook_url ||
      config.enabled !== originalConfig.enabled ||
      config.rate_limit !== originalConfig.rate_limit ||
      config.rate_limit_window !== originalConfig.rate_limit_window
    );
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Solo administradores pueden modificar la configuración');
      return;
    }

    try {
      setSaving(true);

      // Validar URL del webhook
      if (config.webhook_url && !isValidUrl(config.webhook_url)) {
        toast.error('URL del webhook inválida');
        return;
      }

      // Validar límites
      if (config.rate_limit < 1 || config.rate_limit > 10000) {
        toast.error('El límite de errores debe estar entre 1 y 10000');
        return;
      }

      if (config.rate_limit_window < 1 || config.rate_limit_window > 60) {
        toast.error('La ventana de tiempo debe estar entre 1 y 60 minutos');
        return;
      }

      const success = await errorLogService.saveConfig(config, user?.id);
      if (success) {
        toast.success('Configuración guardada correctamente');
        // Actualizar configuración original con los nuevos valores
        setOriginalConfig({ ...config });
      } else {
        toast.error('Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleTestWebhook = async () => {
    if (!config.webhook_url || !isValidUrl(config.webhook_url)) {
      toast.error('URL del webhook inválida');
      return;
    }

    try {
      const testError = {
        error_id: `test-${Date.now()}`,
        error_type: 'TEST_ERROR',
        message: 'Este es un error de prueba desde el módulo de administración',
        module: 'log-server-manager',
        component: 'LogServerManager',
        function: 'handleTestWebhook',
        severity: 'low' as const,
        category: 'testing',
        timestamp: new Date().toISOString(),
        environment: 'development' as const,
        details: {
          test: true,
          user: user?.email || 'unknown'
        }
      };

      // Preparar headers con autenticación
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (config.webhook_auth_token) {
        headers['Authorization'] = `Bearer ${config.webhook_auth_token}`;
      }

      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testError),
      });

      if (response.ok) {
        toast.success('✅ Webhook funcionando correctamente');
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error');
        toast.error(`Webhook respondió con error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error(`Error al probar webhook: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const tabs = [
    {
      id: 'dashboard' as LogServerTab,
      name: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Visualizar y gestionar logs de errores'
    },
    {
      id: 'uchat-errors' as LogServerTab,
      name: 'UChat Errors',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      description: 'Errores de entrega WhatsApp (UChat)'
    },
    {
      id: 'log-server' as LogServerTab,
      name: 'Configuración',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Configurar servidor de logs y webhooks'
    }
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Solo administradores pueden acceder a este módulo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
        </div>

        {/* Navegación por pestañas */}
        <div className="mb-8">
          <div className="sm:hidden">
            <label htmlFor="tabs" className="sr-only">
              Seleccionar pestaña
            </label>
            <select
              id="tabs"
              name="tabs"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as LogServerTab)}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
                  >
                    <div className={`mr-3 ${
                      activeTab === tab.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500'
                    }`}>
                      {tab.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          {activeTab === 'dashboard' && (
            <LogDashboard onBackToConfig={() => setActiveTab('log-server')} />
          )}
          {activeTab === 'uchat-errors' && (
            <UChatErrorLogs />
          )}
          {activeTab === 'log-server' && (
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cargando configuración...</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Sección: Configuración del Webhook */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Configuración del Webhook
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span>URL del Webhook</span>
                      </label>
                      <input
                        type="url"
                        value={config.webhook_url}
                        onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="https://example.com/webhook/error-log"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        URL donde se enviarán los errores críticos del sistema
                      </p>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Token de Autenticación (Bearer Token)</span>
                      </label>
                      <input
                        type="password"
                        value={config.webhook_auth_token || ''}
                        onChange={(e) => setConfig({ ...config, webhook_auth_token: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 font-mono text-xs"
                        placeholder="Bearer token para autenticación del webhook"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Token de autorización que se enviará en el header Authorization
                      </p>
                      <div className="mt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleTestWebhook}
                          disabled={!config.webhook_url || !isValidUrl(config.webhook_url)}
                          className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          Probar Webhook
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Sección: Estado del Sistema */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Estado del Sistema
                      </h4>
                    </div>

                    <label className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all duration-200 group">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                          config.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                        }`}>
                          <motion.div
                            animate={{ x: config.enabled ? 24 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                            Sistema de Logging Activo
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {config.enabled ? 'Los errores se están enviando al webhook' : 'Los errores no se están enviando'}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                        className="sr-only"
                        aria-label="Activar o desactivar sistema de logging"
                      />
                    </label>
                  </motion.div>

                  {/* Sección: Rate Limiting */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Rate Limiting
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Límite de Errores</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={config.rate_limit}
                          onChange={(e) => setConfig({ ...config, rate_limit: parseInt(e.target.value) || 300 })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="300"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Número máximo de errores antes de pausar el envío
                        </p>
                      </div>

                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Ventana de Tiempo (minutos)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={config.rate_limit_window}
                          onChange={(e) => setConfig({ ...config, rate_limit_window: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="1"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Ventana de tiempo para contar los errores
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Nota:</strong> Si el mismo error se repite más de{' '}
                        <strong>{config.rate_limit}</strong> veces en{' '}
                        <strong>{config.rate_limit_window}</strong> minuto{config.rate_limit_window !== 1 ? 's' : ''},
                        el sistema pausará automáticamente el envío de ese error específico.
                      </p>
                    </div>
                  </motion.div>

                  {/* Botones de acción */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancel}
                      disabled={loading || saving || !hasChanges()}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSave}
                      disabled={loading || saving || !hasChanges()}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
                    >
                      {saving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Guardando...
                        </span>
                      ) : (
                        'Guardar Configuración'
                      )}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogServerManager;

