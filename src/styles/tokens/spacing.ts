/**
 * ============================================
 * TOKENS DE ESPACIADO Y FORMAS
 * PQNC QA AI Platform - 2025
 * ============================================
 * 
 * Sistema de espaciado basado en múltiplos de 4px
 * y formas estandarizadas para toda la plataforma.
 */

// ============================================
// ESPACIADO (múltiplos de 4px)
// ============================================

export const SPACING = {
  0: '0px',
  1: '4px',     // xs
  2: '8px',     // sm
  3: '12px',    // md
  4: '16px',    // lg
  5: '20px',    // xl
  6: '24px',    // 2xl
  8: '32px',    // 3xl
  10: '40px',   // 4xl
  12: '48px',   // 5xl
  16: '64px',   // 6xl
  20: '80px',   // 7xl
  24: '96px',   // 8xl
} as const;

// Aliases para facilitar uso
export const SPACING_ALIASES = {
  xs: SPACING[1],
  sm: SPACING[2],
  md: SPACING[3],
  lg: SPACING[4],
  xl: SPACING[5],
  '2xl': SPACING[6],
  '3xl': SPACING[8],
  '4xl': SPACING[10],
  '5xl': SPACING[12],
  '6xl': SPACING[16],
  '7xl': SPACING[20],
  '8xl': SPACING[24],
} as const;

// ============================================
// BORDER RADIUS (esquinas redondeadas)
// ============================================

export const RADIUS = {
  none: '0px',
  sm: '8px',      // Badges, botones pequeños
  md: '12px',     // Cards, inputs, botones normales
  lg: '16px',     // Modales, sidebars
  xl: '20px',     // Elementos destacados
  '2xl': '24px',  // Solo para elementos especiales
  full: '9999px', // Avatares, pills
} as const;

// ============================================
// SHADOWS (sombras estandarizadas)
// ============================================

export const SHADOWS = {
  // Extra small - elementos sutiles
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  
  // Small - elementos normales
  sm: '0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03)',
  
  // Medium - elementos elevados
  md: '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
  
  // Large - elementos destacados
  lg: '0 8px 16px rgba(0, 0, 0, 0.10), 0 4px 8px rgba(0, 0, 0, 0.05)',
  
  // Extra large - modales principales
  xl: '0 16px 32px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
} as const;

// Sombras para dark mode (más pronunciadas)
export const DARK_SHADOWS = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.15)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.20), 0 1px 2px rgba(0, 0, 0, 0.10)',
  md: '0 4px 8px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.30), 0 4px 8px rgba(0, 0, 0, 0.20)',
  xl: '0 16px 32px rgba(0, 0, 0, 0.35), 0 8px 16px rgba(0, 0, 0, 0.25)',
} as const;

// ============================================
// TAMAÑOS DE ICONOS
// ============================================

export const ICON_SIZES = {
  sm: 16,   // Inline text, badges
  md: 20,   // Botones, navegación (default)
  lg: 24,   // Headers, destacados
  xl: 32,   // Solo para avatares/logos pequeños
  '2xl': 48,  // Avatares medianos
  '3xl': 64,  // Logos, avatares grandes
} as const;

// ============================================
// BORDERS (grosores)
// ============================================

export const BORDERS = {
  none: '0px',
  thin: '1px',     // Uso general (default)
  medium: '2px',   // Elementos destacados
  thick: '3px',    // Muy poco común
} as const;

// ============================================
// Z-INDEX (capas de apilamiento)
// ============================================

export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  max: 9999,
} as const;

// ============================================
// UTILIDADES
// ============================================

/**
 * Obtiene un valor de spacing
 * @param size - Tamaño del spacing (0-24 o alias)
 */
export const getSpacing = (size: keyof typeof SPACING | keyof typeof SPACING_ALIASES): string => {
  if (size in SPACING) {
    return SPACING[size as keyof typeof SPACING];
  }
  if (size in SPACING_ALIASES) {
    return SPACING_ALIASES[size as keyof typeof SPACING_ALIASES];
  }
  return SPACING[4]; // default lg
};

/**
 * Obtiene el shadow apropiado según el tema
 * @param size - Tamaño del shadow
 * @param isDark - Si es dark mode
 */
export const getShadow = (
  size: keyof typeof SHADOWS,
  isDark: boolean = false
): string => {
  return isDark ? DARK_SHADOWS[size] : SHADOWS[size];
};

/**
 * Tipos para TypeScript
 */
export type SpacingSize = keyof typeof SPACING;
export type SpacingAlias = keyof typeof SPACING_ALIASES;
export type RadiusSize = keyof typeof RADIUS;
export type ShadowSize = keyof typeof SHADOWS;
export type IconSize = keyof typeof ICON_SIZES;
export type BorderSize = keyof typeof BORDERS;
export type ZIndexLayer = keyof typeof Z_INDEX;

export default {
  spacing: SPACING,
  spacingAliases: SPACING_ALIASES,
  radius: RADIUS,
  shadows: SHADOWS,
  darkShadows: DARK_SHADOWS,
  iconSizes: ICON_SIZES,
  borders: BORDERS,
  zIndex: Z_INDEX,
};

