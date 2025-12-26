/**
 * ============================================
 * HOOK: useDesignTokens
 * ============================================
 * 
 * Hook personalizado para acceder a los tokens de diseño
 * según el tema actual (light, dark, twilight).
 * 
 * Uso:
 * const { colors, gradients, animations, spacing } = useDesignTokens();
 */

import { useMemo } from 'react';
import { useTheme } from './useTheme';
import {
  COLORS,
  GRADIENTS,
  TWILIGHT_GRADIENTS,
  DARK_GRADIENTS,
  TWILIGHT_COLORS,
  ANIMATIONS,
  SPACING,
  RADIUS,
  SHADOWS,
  DARK_SHADOWS,
  ICON_SIZES,
  getModuleGradient,
  getShadow,
  type ThemeMode,
  type ModuleKey,
} from '../styles/tokens';

interface DesignTokensReturn {
  // Colores según tema actual
  colors: typeof COLORS;
  twilightColors?: typeof TWILIGHT_COLORS;
  
  // Gradientes según tema actual
  gradients: typeof GRADIENTS | typeof TWILIGHT_GRADIENTS | typeof DARK_GRADIENTS;
  
  // Animaciones (iguales para todos los temas)
  animations: typeof ANIMATIONS;
  
  // Espaciado y formas (iguales para todos los temas)
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  shadows: typeof SHADOWS | typeof DARK_SHADOWS;
  iconSizes: typeof ICON_SIZES;
  
  // Utilidades
  getModuleGradient: (module: ModuleKey, variant?: 'primary' | 'secondary') => string;
  isDark: boolean;
  isTwilight: boolean;
  theme: ThemeMode;
}

/**
 * Hook para obtener tokens de diseño según el tema actual
 */
export const useDesignTokens = (): DesignTokensReturn => {
  // Obtener tema actual del hook de tema
  const { currentTheme, isLinearTheme } = useTheme();
  
  // Determinar el modo de tema
  const theme: ThemeMode = useMemo(() => {
    // Verificar si el documento tiene la clase dark
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    // Si tiene data-theme="twilight", es twilight
    const isTwilightMode = document.documentElement.getAttribute('data-theme') === 'twilight';
    
    if (isTwilightMode) return 'twilight';
    if (isDarkMode) return 'dark';
    return 'light';
  }, [currentTheme]);
  
  const isDark = theme === 'dark';
  const isTwilight = theme === 'twilight';
  
  // Seleccionar gradientes según tema
  const gradients = useMemo(() => {
    if (isTwilight) return TWILIGHT_GRADIENTS;
    if (isDark) return DARK_GRADIENTS;
    return GRADIENTS;
  }, [isDark, isTwilight]);
  
  // Seleccionar sombras según tema
  const shadows = useMemo(() => {
    return isDark || isTwilight ? DARK_SHADOWS : SHADOWS;
  }, [isDark, isTwilight]);
  
  // Función para obtener gradiente de módulo
  const getModuleGradientWrapper = useMemo(() => {
    return (module: ModuleKey, variant: 'primary' | 'secondary' = 'primary') => {
      return getModuleGradient(module, variant, theme);
    };
  }, [theme]);
  
  return {
    colors: COLORS,
    twilightColors: isTwilight ? TWILIGHT_COLORS : undefined,
    gradients,
    animations: ANIMATIONS,
    spacing: SPACING,
    radius: RADIUS,
    shadows,
    iconSizes: ICON_SIZES,
    getModuleGradient: getModuleGradientWrapper,
    isDark,
    isTwilight,
    theme,
  };
};

/**
 * Hook simplificado para obtener solo colores
 */
export const useColors = () => {
  const { colors, twilightColors, isDark, isTwilight } = useDesignTokens();
  
  return {
    colors,
    twilightColors,
    isDark,
    isTwilight,
  };
};

/**
 * Hook simplificado para obtener solo gradientes
 */
export const useGradients = () => {
  const { gradients, getModuleGradient, theme } = useDesignTokens();
  
  return {
    gradients,
    getModuleGradient,
    theme,
  };
};

/**
 * Hook simplificado para obtener solo animaciones
 */
export const useAnimations = () => {
  const { animations } = useDesignTokens();
  return animations;
};

/**
 * Hook simplificado para obtener solo espaciado y formas
 */
export const useSpacing = () => {
  const { spacing, radius, shadows, iconSizes } = useDesignTokens();
  
  return {
    spacing,
    radius,
    shadows,
    iconSizes,
  };
};

export default useDesignTokens;

