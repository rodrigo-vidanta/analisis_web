import { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../config/pqncSupabase';

export interface ThemeConfig {
  theme_name: string;
  display_name: string;
  description: string;
  color_palette: any;
  is_active: boolean;
}

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar tema activo desde la base de datos
  const loadActiveTheme = async () => {
    try {
      // Usar tema por defecto (system_config no disponible)
      console.log('🎨 Usando tema por defecto (system_config no disponible)');
      setCurrentTheme('default');
      
      // Aplicar tema al documento
      applyThemeToDocument('default');

      // Usar temas por defecto (app_themes no disponible)
      setAvailableThemes([
        {
          theme_name: 'default',
          display_name: 'Tema Por Defecto',
          description: 'Tema oscuro por defecto',
          color_palette: {},
          is_active: true
        }
      ]);

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
          allow_user_theme_selection: true
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
      
      // Sidebar
      sidebar: isLinear ? 'linear-sidebar' : 'bg-white dark:bg-slate-800',
      
      // Backgrounds
      background: isLinear 
        ? 'bg-slate-50 dark:bg-slate-900' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
      
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
