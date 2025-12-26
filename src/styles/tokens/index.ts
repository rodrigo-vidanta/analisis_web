/**
 * ============================================
 * TOKENS DE DISEÑO CORPORATIVO
 * PQNC QA AI Platform - 2025
 * ============================================
 * 
 * Punto de entrada principal para todos los tokens de diseño.
 * Exporta colores, gradientes, animaciones, espaciado y formas.
 * 
 * Uso:
 * import { COLORS, GRADIENTS, ANIMATIONS } from '@/styles/tokens';
 */

// Importar todos los tokens
import COLORS, { 
  NEUTRAL_COLORS, 
  PRIMARY_COLORS, 
  ACCENT_COLORS,
  SUCCESS_COLORS,
  WARNING_COLORS,
  ERROR_COLORS,
  INFO_COLORS,
  TWILIGHT_COLORS,
  withOpacity,
  type ColorShade,
  type PrimaryShade,
  type AccentShade,
  type StateShade,
} from './colors';

import GRADIENTS, {
  TWILIGHT_GRADIENTS,
  DARK_GRADIENTS,
  MODULE_GRADIENTS,
  getModuleGradient,
  createGradient,
  type GradientKey,
  type ModuleKey,
  type GradientVariant,
  type ThemeMode,
} from './gradients';

import ANIMATIONS, {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  SPRING_PHYSICS,
  FADE_IN,
  SCALE_IN,
  SLIDE_UP,
  SLIDE_DOWN,
  SLIDE_LEFT,
  SLIDE_RIGHT,
  SPRING_POP,
  COLLAPSE,
  SMOOTH_TRANSITION,
  FAST_TRANSITION,
  SPRING_TRANSITION,
  MODAL_TRANSITION,
  BACKDROP_VARIANTS,
  BACKDROP_TRANSITION,
  LIST_CONTAINER,
  LIST_ITEM,
  createStagger,
  createTransition,
  createButtonVariants,
  createCardVariants,
  type AnimationDuration,
  type AnimationEasing,
  type SpringPhysics,
  type AnimationVariant,
} from './animations';

import SPACING_CONFIG, {
  SPACING,
  SPACING_ALIASES,
  RADIUS,
  SHADOWS,
  DARK_SHADOWS,
  ICON_SIZES,
  BORDERS,
  Z_INDEX,
  getSpacing,
  getShadow,
  type SpacingSize,
  type SpacingAlias,
  type RadiusSize,
  type ShadowSize,
  type IconSize,
  type BorderSize,
  type ZIndexLayer,
} from './spacing';

// ============================================
// OBJETO PRINCIPAL DE TOKENS
// ============================================

const DESIGN_TOKENS = {
  colors: COLORS,
  gradients: GRADIENTS,
  animations: ANIMATIONS,
  spacing: SPACING_CONFIG,
} as const;

// ============================================
// EXPORTACIONES
// ============================================

// Exportar objeto principal
export default DESIGN_TOKENS;

// Exportar categorías principales
export { COLORS, GRADIENTS, ANIMATIONS, SPACING_CONFIG };

// Exportar colores individuales
export {
  NEUTRAL_COLORS,
  PRIMARY_COLORS,
  ACCENT_COLORS,
  SUCCESS_COLORS,
  WARNING_COLORS,
  ERROR_COLORS,
  INFO_COLORS,
  TWILIGHT_COLORS,
  withOpacity,
};

// Exportar gradientes
export {
  TWILIGHT_GRADIENTS,
  DARK_GRADIENTS,
  MODULE_GRADIENTS,
  getModuleGradient,
  createGradient,
};

// Exportar animaciones
export {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  SPRING_PHYSICS,
  FADE_IN,
  SCALE_IN,
  SLIDE_UP,
  SLIDE_DOWN,
  SLIDE_LEFT,
  SLIDE_RIGHT,
  SPRING_POP,
  COLLAPSE,
  SMOOTH_TRANSITION,
  FAST_TRANSITION,
  SPRING_TRANSITION,
  MODAL_TRANSITION,
  BACKDROP_VARIANTS,
  BACKDROP_TRANSITION,
  LIST_CONTAINER,
  LIST_ITEM,
  createStagger,
  createTransition,
  createButtonVariants,
  createCardVariants,
};

// Exportar espaciado y formas
export {
  SPACING,
  SPACING_ALIASES,
  RADIUS,
  SHADOWS,
  DARK_SHADOWS,
  ICON_SIZES,
  BORDERS,
  Z_INDEX,
  getSpacing,
  getShadow,
};

// Exportar tipos
export type {
  ColorShade,
  PrimaryShade,
  AccentShade,
  StateShade,
  GradientKey,
  ModuleKey,
  GradientVariant,
  ThemeMode,
  AnimationDuration,
  AnimationEasing,
  SpringPhysics,
  AnimationVariant,
  SpacingSize,
  SpacingAlias,
  RadiusSize,
  ShadowSize,
  IconSize,
  BorderSize,
  ZIndexLayer,
};

// ============================================
// VERSIÓN DEL SISTEMA DE DISEÑO
// ============================================

export const DESIGN_SYSTEM_VERSION = '2.0.0';
export const DESIGN_SYSTEM_DATE = '2025-01-26';

