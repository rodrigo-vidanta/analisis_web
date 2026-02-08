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
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Palette, 
  Image, 
  Type, 
  Upload,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { analysisSupabase as supabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { systemConfigEvents } from '../../utils/systemConfigEvents';
import { LOGO_CATALOG, type LogoType, getSuggestedLogo, isLogoAvailable } from '../logos/LogoCatalog';

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
  const [selectedLogo, setSelectedLogo] = useState<LogoType>('default');
  
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

      // Cargar logo seleccionado
      const { data: logoConfigData } = await supabase
        .from('system_config')
        .select('*')
        .eq('config_key', 'selected_logo')
        .single();

      if (logoConfigData && logoConfigData.config_value?.logo_type) {
        setSelectedLogo(logoConfigData.config_value.logo_type as LogoType);
      } else {
        // Si no hay configuración, sugerir logo según fecha
        const suggested = getSuggestedLogo();
        setSelectedLogo(suggested);
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

  // Tabs de navegación
  const [activeSection, setActiveSection] = useState<'branding' | 'themes'>('branding');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Cargando preferencias...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header minimalista */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Preferencias
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Apariencia y branding del sistema
              </p>
            </div>
          </div>

          {/* Métricas inline */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Tema: <span className="font-medium text-gray-900 dark:text-white">{themes.find(t => t.theme_name === activeTheme)?.display_name || 'Default'}</span>
              </span>
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={loadSystemConfig}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notificaciones flotantes */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
              error 
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{error || success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs de navegación */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveSection('branding')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeSection === 'branding'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Image className="w-4 h-4" />
          Branding
        </button>
        <button
          onClick={() => setActiveSection('themes')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeSection === 'themes'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Palette className="w-4 h-4" />
          Temas
        </button>
      </div>

      {/* Contenido según tab activo */}
      <AnimatePresence mode="wait">
        {activeSection === 'branding' ? (
          <motion.div
            key="branding"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            <form onSubmit={handleBrandingSave}>
              {/* Sección: Imágenes */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Imágenes
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo */}
                  <div className="group">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                        ) : brandingConfig.logo_url ? (
                          <img src={brandingConfig.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Image className="w-6 h-6 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Logo</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG transparente, 64×64px</p>
                        <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700">
                          <Upload className="w-3 h-3" />
                          Cambiar
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Favicon */}
                  <div className="group">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                      <div className="flex-shrink-0 w-14 h-14 bg-gray-100 dark:bg-gray-600 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-500 overflow-hidden">
                        {faviconPreview ? (
                          <img src={faviconPreview} alt="Preview" className="w-8 h-8 object-contain" />
                        ) : brandingConfig.favicon_url ? (
                          <img src={brandingConfig.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Favicon</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SVG o PNG, 32×32px</p>
                        <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700">
                          <Upload className="w-3 h-3" />
                          Cambiar
                          <input type="file" accept="image/svg+xml,image/png,image/x-icon" onChange={handleFaviconChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Logos Personalizados (Estilo Google Doodles) */}
              <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Logos Personalizados
                  </h3>
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Selecciona el logo del sidebar. Los logos de temporada incluyen animaciones especiales.
                </p>

                {/* Grid de logos estilo Google (interactivos con preview) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.values(LOGO_CATALOG).map((logo) => {
                    const isSelected = selectedLogo === logo.id;
                    const available = !logo.isSeasonallogo || isLogoAvailable(logo.id);
                    const suggested = getSuggestedLogo() === logo.id;
                    const LogoPreviewComponent = logo.component;

                    return (
                      <div key={logo.id} className="relative">
                        <motion.button
                          type="button"
                          onClick={() => setSelectedLogo(logo.id)}
                          disabled={!available}
                          className={`w-full relative p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-primary-500 dark:border-primary-400 bg-white dark:bg-neutral-800 shadow-lg shadow-primary-500/20'
                              : available
                              ? 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                              : 'border-neutral-100 dark:border-neutral-800 opacity-50 cursor-not-allowed bg-neutral-50 dark:bg-neutral-900'
                          }`}
                          whileHover={available ? { scale: 1.02, y: -2 } : undefined}
                          whileTap={available ? { scale: 0.98 } : undefined}
                        >
                          {/* Badge de seleccionado */}
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg z-10">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}

                          {/* Badge de sugerido */}
                          {suggested && !isSelected && available && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-warning-500 rounded-full flex items-center justify-center shadow-lg animate-pulse z-10">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          )}

                          {/* Preview interactivo del logo */}
                          <div className="h-16 flex items-center justify-center mb-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg overflow-visible relative">
                            {available ? (
                              <div className="scale-75 transform-gpu pointer-events-auto">
                                <LogoPreviewComponent 
                                  onClick={(e: any) => {
                                    e?.stopPropagation?.();
                                  }} 
                                  isCollapsed={false}
                                />
                              </div>
                            ) : (
                              <img 
                                src={logo.preview} 
                                alt={logo.name}
                                className="max-h-12 max-w-full object-contain opacity-30"
                              />
                            )}
                          </div>

                          {/* Nombre */}
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                            {logo.name}
                          </h4>

                          {/* Descripción */}
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                            {logo.description}
                          </p>

                          {/* Badges */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {logo.isSeasonallogo && available && (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-accent-500/10 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 rounded-full text-xs font-medium border border-accent-200 dark:border-accent-700">
                                <Sparkles className="w-3 h-3" />
                                Temporada
                              </div>
                            )}

                            {!available && (
                              <div className="inline-flex items-center px-2 py-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full text-xs font-medium">
                                No disponible
                              </div>
                            )}
                          </div>
                        </motion.button>

                        {/* Hint de interactividad */}
                        {available && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-center italic">
                            Click en el logo para ver animación
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Botón para guardar logo seleccionado */}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setSaving(true);
                        await supabase.rpc('update_system_config', {
                          p_config_key: 'selected_logo',
                          p_new_value: { logo_type: selectedLogo }
                        });
                        setSuccess('Logo actualizado correctamente');
                        // Disparar evento para que Sidebar se actualice
                        window.dispatchEvent(new CustomEvent('logo-changed', { detail: { logoType: selectedLogo } }));
                      } catch (error) {
                        console.error('Error guardando logo:', error);
                        setError('Error al guardar logo');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Guardando...
                      </>
                    ) : (
                      'Aplicar Logo'
                    )}
                  </button>
                </div>
              </div>

              {/* Sección: Textos */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Type className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Textos
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Nombre de la app */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Nombre de la Aplicación
                    </label>
                    <input
                      type="text"
                      value={brandingConfig.app_name || ''}
                      onChange={(e) => setBrandingConfig({ ...brandingConfig, app_name: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                      placeholder="VAPI Builder"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Descripción Header */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Descripción del Header
                      </label>
                      <input
                        type="text"
                        value={brandingConfig.header_description || ''}
                        onChange={(e) => setBrandingConfig({ ...brandingConfig, header_description: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                        placeholder="Construcción de agentes inteligentes"
                      />
                    </div>

                    {/* Descripción Login */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Descripción en Login
                      </label>
                      <input
                        type="text"
                        value={brandingConfig.login_description || ''}
                        onChange={(e) => setBrandingConfig({ ...brandingConfig, login_description: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                        placeholder="Inicia sesión con tus credenciales"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer con botón guardar */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-700 dark:bg-gray-600 rounded-xl hover:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="themes"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            {/* Header de sección */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecciona un tema para cambiar la apariencia de toda la aplicación.
              </p>
            </div>

            {/* Lista de temas */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {themes.map((theme) => {
                const isThemeActive = activeTheme === theme.theme_name;
                return (
                  <motion.div
                    key={theme.id}
                    onClick={() => !isThemeActive && handleThemeChange(theme.id)}
                    className={`group flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors ${
                      isThemeActive 
                        ? 'bg-emerald-50 dark:bg-emerald-900/10' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                    whileHover={{ x: isThemeActive ? 0 : 4 }}
                    whileTap={{ scale: isThemeActive ? 1 : 0.99 }}
                  >
                    {/* Paleta de colores */}
                    <div className="flex-shrink-0 flex -space-x-1">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                        style={{ backgroundColor: theme.theme_config?.primary || '#6366f1' }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                        style={{ backgroundColor: theme.theme_config?.secondary || '#818cf8' }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                        style={{ backgroundColor: theme.theme_config?.accent || '#9ca3af' }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {theme.display_name}
                        </span>
                        {isThemeActive && (
                          <span className="px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {theme.description}
                      </p>
                    </div>

                    {/* Indicador */}
                    {isThemeActive ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Nota */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
              Los temas son compatibles con modo claro y oscuro. La página se recargará al cambiar de tema.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SystemPreferences;
