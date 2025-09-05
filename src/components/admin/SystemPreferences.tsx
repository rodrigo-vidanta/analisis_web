import React, { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../../config/pqncSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { systemConfigEvents } from '../../utils/systemConfigEvents';

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  config_type: string;
  display_name: string;
  description: string;
}

interface AppTheme {
  id: string;
  theme_name: string;
  display_name: string;
  description: string;
  theme_config: any;
  is_active: boolean;
  is_default: boolean;
}

const SystemPreferences: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para configuraciones
  const [brandingConfig, setBrandingConfig] = useState<any>({});
  const [themes, setThemes] = useState<AppTheme[]>([]);
  const [activeTheme, setActiveTheme] = useState<string>('default');
  
  // Estados para forms
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      
      // Cargar configuración de branding
      const { data: brandingData, error: brandingError } = await supabase
        .from('system_config')
        .select('*')
        .eq('config_key', 'app_branding')
        .single();

      if (brandingError && brandingError.code !== 'PGRST116') {
        throw brandingError;
      }

      if (brandingData) {
        setBrandingConfig(brandingData.config_value);
      }

      // Cargar temas disponibles
      const { data: themesData, error: themesError } = await supabase
        .from('app_themes')
        .select('*')
        .order('display_name');

      if (themesError) throw themesError;
      setThemes(themesData || []);

      // Cargar tema activo
      const { data: themeConfigData, error: themeConfigError } = await supabase
        .from('system_config')
        .select('*')
        .eq('config_key', 'app_theme')
        .single();

      if (themeConfigData) {
        setActiveTheme(themeConfigData.config_value.active_theme);
      }

    } catch (err: any) {
      console.error('Error loading system config:', err);
      setError('Error al cargar configuración del sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setLogoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Por favor selecciona un archivo de imagen válido');
      }
    }
  };

  const handleBrandingSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let logoUrl = brandingConfig.logo_url;

      // Si hay un nuevo logo, subirlo primero
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('system-assets')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('system-assets')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      // Actualizar configuración de branding
      const updatedBranding = {
        ...brandingConfig,
        logo_url: logoUrl
      };

      const { error } = await supabase.rpc('update_system_config', {
        p_config_key: 'app_branding',
        p_new_value: updatedBranding,
        p_updated_by_user: user?.id
      });

      if (error) throw error;

      setBrandingConfig(updatedBranding);
      setLogoFile(null);
      setLogoPreview(null);
      setSuccess('Configuración de marca actualizada exitosamente');
      
      // Notificar actualización global
      systemConfigEvents.notifyUpdate();

    } catch (err: any) {
      console.error('Error saving branding config:', err);
      setError('Error al guardar configuración de marca');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedTheme = themes.find(t => t.id === themeId);
      if (!selectedTheme) throw new Error('Tema no encontrado');

      // Actualizar configuración de tema
      const { error } = await supabase.rpc('update_system_config', {
        p_config_key: 'app_theme',
        p_new_value: { 
          active_theme: selectedTheme.theme_name,
          allow_user_theme_selection: false,
          custom_css: ''
        },
        p_updated_by_user: user?.id
      });

      if (error) throw error;

      // Actualizar estado del tema activo en la tabla
      // Primero desactivar todos los temas
      await supabase
        .from('app_themes')
        .update({ is_active: false })
        .neq('id', themeId);

      // Luego activar solo el tema seleccionado
      await supabase
        .from('app_themes')
        .update({ is_active: true })
        .eq('id', themeId);

      // Actualizar estado local inmediatamente
      setThemes(prevThemes => 
        prevThemes.map(theme => ({
          ...theme,
          is_active: theme.id === themeId
        }))
      );
      
      setActiveTheme(selectedTheme.theme_name);
      setSuccess('Tema actualizado exitosamente');
      
      // Notificar actualización global
      systemConfigEvents.notifyUpdate();

      // Recargar la página para aplicar el nuevo tema
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Error updating theme:', err);
      setError('Error al actualizar tema');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Preferencias del Sistema
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configura la apariencia y branding de la aplicación
        </p>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Configuración de Branding */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🎨 Configuración de Marca
        </h3>
        
        <form onSubmit={handleBrandingSave} className="space-y-6">
          {/* Logo actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo Actual
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                {brandingConfig.logo_url ? (
                  <img 
                    src={brandingConfig.logo_url} 
                    alt="Logo actual" 
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Logo actual de la aplicación
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Recomendado: PNG transparente, 64x64px
                </p>
              </div>
            </div>
          </div>

          {/* Subir nuevo logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nuevo Logo (PNG)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {logoPreview && (
                <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg p-1">
                  <img 
                    src={logoPreview} 
                    alt="Preview" 
                    className="w-full h-full object-contain rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Nombre de la aplicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de la Aplicación
            </label>
            <input
              type="text"
              value={brandingConfig.app_name || ''}
              onChange={(e) => setBrandingConfig({
                ...brandingConfig,
                app_name: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="VAPI Builder"
            />
          </div>

          {/* Descripción de login */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción en Página de Login
            </label>
            <textarea
              value={brandingConfig.login_description || ''}
              onChange={(e) => setBrandingConfig({
                ...brandingConfig,
                login_description: e.target.value
              })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Inicia sesión con tus credenciales corporativas"
            />
          </div>

          {/* Descripción del header */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción del Header
            </label>
            <input
              type="text"
              value={brandingConfig.header_description || ''}
              onChange={(e) => setBrandingConfig({
                ...brandingConfig,
                header_description: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Construcción de agentes inteligentes"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración de Marca'}
          </button>
        </form>
      </div>

      {/* Configuración de Temas */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🎨 Temas de la Aplicación
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Selecciona un tema para cambiar la paleta de colores de toda la aplicación. Los modos claro/oscuro se mantienen independientes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const isThemeActive = activeTheme === theme.theme_name;
            return (
              <div
                key={theme.id}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  isThemeActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                onClick={() => handleThemeChange(theme.id)}
              >
                {/* Indicador de tema activo */}
                {isThemeActive && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-blue-500 text-white rounded-full p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}

              {/* Preview de colores */}
              <div className="flex space-x-1 mb-3">
                <div 
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.theme_config.primary }}
                ></div>
                <div 
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.theme_config.secondary }}
                ></div>
                <div 
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.theme_config.accent }}
                ></div>
                <div 
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.theme_config.success }}
                ></div>
              </div>

              {/* Información del tema */}
              <h4 className="font-medium text-gray-900 dark:text-white">
                {theme.display_name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {theme.description}
              </p>

              {/* Estado */}
              <div className="mt-3">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  isThemeActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                }`}>
                  {isThemeActive ? 'Activo' : 'Disponible'}
                </span>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SystemPreferences;
