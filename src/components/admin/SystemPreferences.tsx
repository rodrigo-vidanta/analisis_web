/**
 * ============================================
 * PREFERENCIAS DEL SISTEMA - MÓDULO PQNC HUMANS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/admin/README_PQNC_HUMANS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/admin/README_PQNC_HUMANS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/admin/CHANGELOG_PQNC_HUMANS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../../config/pqncSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { systemConfigEvents } from '../../utils/systemConfigEvents';

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

// Nota: tipos reservados para futuras ampliaciones de preferencias
// (se omiten variables no usadas para evitar warnings)

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
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSystemConfig();
  }, []);

  // Función para limpiar y configurar solo los temas principales
  const cleanupAndSetupThemes = async () => {
    try {
      // 1. Eliminar todos los temas excepto default y linear_theme
      await supabase
        .from('app_themes')
        .delete()
        .not('theme_name', 'in', '(default,linear_theme)');

      // 2. Crear/actualizar tema por defecto (Tema Corporativo)
      await supabase
        .from('app_themes')
        .upsert({
          theme_name: 'default',
          display_name: 'Tema Corporativo',
          description: 'Estilo corporativo con gradientes y paleta institucional homologada',
          theme_config: {
            primary: "rgb(59, 130, 246)",
            secondary: "rgb(129, 140, 248)", 
            accent: "rgb(236, 72, 153)",
            success: "rgb(34, 197, 94)",
            warning: "rgb(245, 158, 11)",
            error: "rgb(239, 68, 68)"
          },
          is_active: true
        }, { onConflict: 'theme_name' });

      // 3. Crear/actualizar tema Estudio (Linear)
      await supabase
        .from('app_themes')
        .upsert({
          theme_name: 'linear_theme',
          display_name: 'Tema Estudio',
          description: 'Estilo minimalista tipo Estudio con superficies limpias y animaciones sutiles',
          theme_config: {
            primary: "rgb(99, 102, 241)",
            secondary: "rgb(129, 140, 248)",
            accent: "rgb(156, 163, 175)",
            success: "rgb(34, 197, 94)",
            warning: "rgb(245, 158, 11)",
            error: "rgb(239, 68, 68)"
          },
          is_active: false
        }, { onConflict: 'theme_name' });
        
      console.log('✅ Temas limpiados y configurados: Corporativo + Linear');
    } catch (error) {
      console.error('Error configurando temas:', error);
    }
  };

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
        // Aplicar favicon si existe
        if (brandingData.config_value?.favicon_url) {
          updateFavicon(brandingData.config_value.favicon_url);
        }
      }

      // Limpiar y configurar temas
      await cleanupAndSetupThemes();

      // Cargar temas disponibles
      const { data: themesData, error: themesError } = await supabase
        .from('app_themes')
        .select('*')
        .order('display_name');

      if (themesError) throw themesError;
      setThemes(themesData || []);

      // Cargar tema activo
      const { data: themeConfigData } = await supabase
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

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        setFaviconFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setFaviconPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Por favor selecciona un archivo de imagen válido (SVG, PNG, JPG)');
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
      let faviconUrl = brandingConfig.favicon_url;

      // Si hay un nuevo logo, subirlo primero
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('system-assets')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('system-assets')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      // Si hay un nuevo favicon, subirlo
      if (faviconFile) {
        const fileExt = faviconFile.name.split('.').pop();
        const fileName = `favicon-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('system-assets')
          .upload(fileName, faviconFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('system-assets')
          .getPublicUrl(fileName);

        faviconUrl = publicUrl;
      }

      // Actualizar configuración de branding
      const updatedBranding = {
        ...brandingConfig,
        logo_url: logoUrl,
        favicon_url: faviconUrl
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
      setFaviconFile(null);
      setFaviconPreview(null);
      setSuccess('Configuración de marca actualizada exitosamente');
      
      // Aplicar favicon inmediatamente si se actualizó
      if (faviconUrl) {
        updateFavicon(faviconUrl);
      }
      
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
      
      // Disparar evento de cambio de tema
      window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme: selectedTheme.theme_name } 
      }));

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

          <div className="border-t border-gray-200 dark:border-gray-600 my-6"></div>

          {/* Favicon actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Favicon Actual
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-600">
                {brandingConfig.favicon_url ? (
                  <img 
                    src={brandingConfig.favicon_url} 
                    alt="Favicon actual" 
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-400">N/A</span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Icono de pestaña del navegador
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Recomendado: SVG o PNG 32x32px
                </p>
              </div>
            </div>
          </div>

          {/* Subir nuevo favicon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nuevo Favicon (SVG/PNG)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/svg+xml,image/png,image/x-icon,image/jpeg"
                onChange={handleFaviconChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {faviconPreview && (
                <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg p-1 flex items-center justify-center">
                  <img 
                    src={faviconPreview} 
                    alt="Preview Favicon" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 my-6"></div>

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
          Elige entre dos estilos de diseño para toda la aplicación. Cada tema mantiene compatibilidad con modo claro/oscuro.
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
                  className="w-6 h-6 rounded shadow-sm"
                  style={{ backgroundColor: theme.theme_config?.primary || '#6366f1' }}
                ></div>
                <div 
                  className="w-6 h-6 rounded shadow-sm"
                  style={{ backgroundColor: theme.theme_config?.secondary || '#818cf8' }}
                ></div>
                <div 
                  className="w-6 h-6 rounded shadow-sm"
                  style={{ backgroundColor: theme.theme_config?.accent || '#9ca3af' }}
                ></div>
                <div 
                  className="w-6 h-6 rounded shadow-sm"
                  style={{ backgroundColor: theme.theme_config?.success || '#22c55e' }}
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
