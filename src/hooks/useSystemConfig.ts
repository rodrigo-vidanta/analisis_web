import { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../config/pqncSupabase';
import { systemConfigEvents } from '../utils/systemConfigEvents';

interface SystemConfig {
  app_branding?: {
    app_name?: string;
    company_name?: string;
    logo_url?: string;
    favicon_url?: string;
    login_description?: string;
    header_description?: string;
  };
  app_theme?: {
    active_theme?: string;
    allow_user_theme_selection?: boolean;
    custom_css?: string;
  };
}

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig>({});
  const [loading, setLoading] = useState(true);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      
      // Obtener configuración de branding
      const { data: brandingData } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'app_branding')
        .single();

      // Obtener configuración de tema
      const { data: themeData } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'app_theme')
        .single();

      const newConfig: SystemConfig = {};
      
      if (brandingData?.config_value) {
        newConfig.app_branding = brandingData.config_value;
      }
      
      if (themeData?.config_value) {
        newConfig.app_theme = themeData.config_value;
      }

      // Aplicar tema al documento
      const activeTheme = newConfig.app_theme?.active_theme;
      if (activeTheme && activeTheme !== 'default') {
        document.documentElement.setAttribute('data-theme', activeTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      setConfig(newConfig);
    } catch (error) {
      console.error('Error loading system config:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshConfig = () => {
    loadSystemConfig();
  };

  useEffect(() => {
    loadSystemConfig();

    // Agregar listener para actualizaciones
    const handleConfigUpdate = () => {
      loadSystemConfig();
    };

    systemConfigEvents.addListener(handleConfigUpdate);

    return () => {
      systemConfigEvents.removeListener(handleConfigUpdate);
    };
  }, []);

  return {
    config,
    loading,
    refreshConfig
  };
};

export default useSystemConfig;
