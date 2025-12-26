/**
 * ============================================
 * TOKENS DE GRADIENTES CORPORATIVOS
 * PQNC QA AI Platform - 2025
 * ============================================
 * 
 * Solo 6 gradientes autorizados para toda la plataforma.
 * Reduce de 680+ gradientes a un sistema consistente.
 */

// ============================================
// GRADIENTES CORPORATIVOS (Light/Dark Mode)
// ============================================

export const GRADIENTS = {
  // Primario (Indigo suave)
  primary: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
  
  // Acento (Purple sutil)
  accent: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
  
  // Success (Emerald profesional)
  success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  
  // Warning (Amber contenido)
  warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  
  // Info (Blue moderado)
  info: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
  
  // Neutral (Grises elegantes)
  neutral: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
} as const;

// ============================================
// GRADIENTES PARA TEMA TWILIGHT
// ============================================

export const TWILIGHT_GRADIENTS = {
  // Primario (Indigo más oscuro)
  primary: 'linear-gradient(135deg, #3949ab 0%, #5e72e4 100%)',
  
  // Acento (Purple más oscuro)
  accent: 'linear-gradient(135deg, #8e44ad 0%, #a569bd 100%)',
  
  // Neutral (Grises oscuros)
  neutral: 'linear-gradient(135deg, #2d3748 0%, #3a4556 100%)',
} as const;

// ============================================
// GRADIENTES PARA DARK MODE
// ============================================

export const DARK_GRADIENTS = {
  // Primario (Indigo brillante para contraste)
  primary: 'linear-gradient(135deg, #818cf8 0%, #a5b4fc 100%)',
  
  // Acento (Purple brillante)
  accent: 'linear-gradient(135deg, #c084fc 0%, #d8b4fe 100%)',
  
  // Neutral (Grises muy oscuros)
  neutral: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
} as const;

// ============================================
// MAPEO DE GRADIENTES POR MÓDULO
// ============================================

/**
 * Define qué gradiente debe usar cada módulo de la plataforma
 * para mantener consistencia visual
 */
export const MODULE_GRADIENTS = {
  dashboard: {
    primary: GRADIENTS.primary,
    secondary: GRADIENTS.neutral,
  },
  liveChat: {
    primary: GRADIENTS.info,
    secondary: GRADIENTS.primary,
  },
  liveMonitor: {
    primary: GRADIENTS.success,
    secondary: GRADIENTS.info,
  },
  analysisIA: {
    primary: GRADIENTS.accent,
    secondary: GRADIENTS.primary,
  },
  prospectos: {
    primary: GRADIENTS.info,
    secondary: GRADIENTS.success,
  },
  scheduled: {
    primary: GRADIENTS.warning,
    secondary: GRADIENTS.primary,
  },
  whatsapp: {
    primary: GRADIENTS.success,
    secondary: GRADIENTS.neutral,
  },
  admin: {
    primary: GRADIENTS.accent,
    secondary: GRADIENTS.neutral,
  },
  aws: {
    primary: GRADIENTS.warning,
    secondary: GRADIENTS.info,
  },
} as const;

// ============================================
// UTILIDADES DE GRADIENTES
// ============================================

/**
 * Obtiene el gradiente apropiado para un módulo
 * @param module - Nombre del módulo
 * @param variant - 'primary' o 'secondary'
 * @param theme - 'light', 'dark', o 'twilight'
 */
export const getModuleGradient = (
  module: keyof typeof MODULE_GRADIENTS,
  variant: 'primary' | 'secondary' = 'primary',
  theme: 'light' | 'dark' | 'twilight' = 'light'
): string => {
  // Para dark mode, usar gradientes más brillantes
  if (theme === 'dark') {
    if (variant === 'primary') {
      return DARK_GRADIENTS.primary;
    }
    return DARK_GRADIENTS.neutral;
  }
  
  // Para twilight, usar gradientes intermedios
  if (theme === 'twilight') {
    if (variant === 'primary') {
      return TWILIGHT_GRADIENTS.primary;
    }
    return TWILIGHT_GRADIENTS.neutral;
  }
  
  // Para light mode, usar gradientes corporativos
  return MODULE_GRADIENTS[module][variant];
};

/**
 * Crea un gradiente personalizado con los colores corporativos
 * @param from - Color inicial (hex)
 * @param to - Color final (hex)
 * @param angle - Ángulo del gradiente (default 135deg)
 */
export const createGradient = (
  from: string,
  to: string,
  angle: number = 135
): string => {
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
};

/**
 * Tipos para TypeScript
 */
export type GradientKey = keyof typeof GRADIENTS;
export type ModuleKey = keyof typeof MODULE_GRADIENTS;
export type GradientVariant = 'primary' | 'secondary';
export type ThemeMode = 'light' | 'dark' | 'twilight';

export default GRADIENTS;

