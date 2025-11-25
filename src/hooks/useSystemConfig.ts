import { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../config/pqncSupabase';
import { systemConfigEvents } from '../utils/systemConfigEvents';

/**
 * Actualiza el favicon en el documento HTML
 * Elimina los favicons existentes y crea nuevos elementos link
 */
const updateFavicon = (faviconUrl: string) => {
  // Obtener el tipo de archivo desde la URL
  const isSvg = faviconUrl.toLowerCase().includes('.svg') || faviconUrl.toLowerCase().includes('svg+xml');
  const isIco = faviconUrl.toLowerCase().includes('.ico');
  
  // Eliminar todos los favicons existentes
  const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
  existingLinks.forEach(link => link.remove());

  // Crear nuevo link para favicon principal
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = isSvg ? 'image/svg+xml' : isIco ? 'image/x-icon' : 'image/png';
  link.href = faviconUrl;
  document.head.appendChild(link);

  // Crear también shortcut icon para compatibilidad
  const shortcutLink = document.createElement('link');
  shortcutLink.rel = 'shortcut icon';
  shortcutLink.type = isSvg ? 'image/svg+xml' : isIco ? 'image/x-icon' : 'image/png';
  shortcutLink.href = faviconUrl;
  document.head.appendChild(shortcutLink);

  // Forzar recarga del favicon agregando timestamp (para evitar caché)
  const timestamp = new Date().getTime();
  link.href = `${faviconUrl}?t=${timestamp}`;
  shortcutLink.href = `${faviconUrl}?t=${timestamp}`;
};

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

      // Aplicar favicon al documento
      const faviconUrl = newConfig.app_branding?.favicon_url;
      if (faviconUrl) {
        updateFavicon(faviconUrl);
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
