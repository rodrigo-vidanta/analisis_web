import { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../config/pqncSupabase';

export interface ThemeConfig {
  theme_name: string;
  display_name: string;
  description: string;
  theme_config: any;
  is_active: boolean;
}

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar tema activo desde la base de datos
  const loadActiveTheme = async () => {
    try {
      // Cargar configuración de tema activo
      const { data: themeConfig, error: configError } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'app_theme')
        .single();

      if (configError) {
        console.log('No theme config found, using default');
        setCurrentTheme('default');
      } else {
        const activeThemeName = themeConfig.config_value?.active_theme || 'default';
        setCurrentTheme(activeThemeName);
        
        // Aplicar tema al documento
        applyThemeToDocument(activeThemeName);
      }

      // Cargar temas disponibles
      const { data: themes, error: themesError } = await supabase
        .from('app_themes')
        .select('theme_name, display_name, description, theme_config, is_active')
        .order('display_name');

      if (!themesError && themes) {
        setAvailableThemes(themes);
      }

    } catch (error) {
      console.error('Error loading theme:', error);
      setCurrentTheme('default');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar tema al documento
  const applyThemeToDocument = (themeName: string) => {
    // Remover todos los temas existentes
    document.documentElement.removeAttribute('data-theme');
    
    // Aplicar nuevo tema si no es default
    if (themeName !== 'default') {
      document.documentElement.setAttribute('data-theme', themeName);
    }
  };

  // Cambiar tema
  const changeTheme = async (themeName: string) => {
    try {
      setCurrentTheme(themeName);
      applyThemeToDocument(themeName);
      
      // Guardar en base de datos
      await supabase.rpc('update_system_config', {
        p_config_key: 'app_theme',
        p_new_value: { 
          active_theme: themeName,
          allow_user_theme_selection: false
        }
      });

    } catch (error) {
      console.error('Error changing theme:', error);
    }
  };

  // Obtener clases CSS según el tema activo
  const getThemeClasses = () => {
    const isLinear = currentTheme === 'linear_theme';
    
    return {
      // Cards
      card: isLinear ? 'linear-card' : 'modern-card',
      
      // Botones
      button: isLinear ? 'linear-button' : 'btn-modern',
      buttonPrimary: isLinear ? 'linear-button linear-button-primary' : 'btn-modern bg-blue-500 hover:bg-blue-600 text-white',
      
      // Sidebar - Ajustado para modo claro menos brillante
      sidebar: isLinear ? 'linear-sidebar' : 'bg-slate-50 dark:bg-slate-800',
      
      // Backgrounds - Ajustado para modo claro menos brillante (WCAG compliant)
      background: isLinear 
        ? 'bg-slate-100 dark:bg-slate-900' 
        : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800',
      
      // Text colors
      textPrimary: isLinear 
        ? 'text-slate-900 dark:text-slate-50' 
        : 'text-slate-900 dark:text-white',
      textSecondary: isLinear 
        ? 'text-slate-500 dark:text-slate-400' 
        : 'text-slate-600 dark:text-slate-400',
      
      // Borders
      border: isLinear 
        ? 'border-slate-200 dark:border-slate-700' 
        : 'border-slate-200 dark:border-slate-700'
    };
  };

  useEffect(() => {
    loadActiveTheme();
    
    // Escuchar cambios de tema desde SystemPreferences
    const handleThemeChange = () => {
      loadActiveTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  return {
    currentTheme,
    availableThemes,
    loading,
    changeTheme,
    getThemeClasses,
    isLinearTheme: currentTheme === 'linear_theme'
  };
};

export default useTheme;
