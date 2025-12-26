/**
 * ============================================
 * TOKENS DE COLORES CORPORATIVOS
 * PQNC QA AI Platform - 2025
 * ============================================
 * 
 * Sistema unificado de colores para toda la plataforma.
 * Reduce de 680+ gradientes a un sistema consistente de 12 colores base.
 */

// ============================================
// COLORES NEUTRALES (Base Slate)
// ============================================
export const NEUTRAL_COLORS = {
  50: '#f8fafc',   // Backgrounds muy claros
  100: '#f1f5f9',  // Surface claro principal
  200: '#e2e8f0',  // Borders sutiles
  300: '#cbd5e1',  // Borders normales
  400: '#94a3b8',  // Text muted/disabled
  500: '#64748b',  // Text secondary
  600: '#475569',  // Text primary
  700: '#334155',  // Text strong/emphasis
  800: '#1e293b',  // Backgrounds oscuros
  900: '#0f172a',  // Backgrounds dark mode
} as const;

// ============================================
// COLOR PRIMARIO (Indigo Elegante)
// ============================================
export const PRIMARY_COLORS = {
  50: '#eef2ff',   // Backgrounds muy claros
  100: '#e0e7ff',  // Backgrounds claros
  400: '#818cf8',  // Variante suave
  500: '#6366f1',  // COLOR PRINCIPAL
  600: '#4f46e5',  // Hover states
  700: '#4338ca',  // Active/pressed states
} as const;

// ============================================
// COLOR ACENTO (Purple Sutil)
// ============================================
export const ACCENT_COLORS = {
  400: '#c084fc',  // Variante suave
  500: '#a855f7',  // COLOR ACENTO
  600: '#9333ea',  // Hover states
} as const;

// ============================================
// COLORES DE ESTADO
// ============================================

// Success (Emerald Profesional)
export const SUCCESS_COLORS = {
  400: '#34d399',  // Variante suave
  500: '#10b981',  // SUCCESS PRINCIPAL
  600: '#059669',  // Hover states
} as const;

// Warning (Amber Contenido)
export const WARNING_COLORS = {
  400: '#fbbf24',  // Variante suave
  500: '#f59e0b',  // WARNING PRINCIPAL
  600: '#d97706',  // Hover states
} as const;

// Error (Red Moderado)
export const ERROR_COLORS = {
  400: '#f87171',  // Variante suave
  500: '#ef4444',  // ERROR PRINCIPAL
  600: '#dc2626',  // Hover states
} as const;

// Info (Blue Profesional)
export const INFO_COLORS = {
  400: '#60a5fa',  // Variante suave
  500: '#3b82f6',  // INFO PRINCIPAL
  600: '#2563eb',  // Hover states
} as const;

// ============================================
// OBJETO PRINCIPAL DE COLORES
// ============================================
export const COLORS = {
  neutral: NEUTRAL_COLORS,
  primary: PRIMARY_COLORS,
  accent: ACCENT_COLORS,
  success: SUCCESS_COLORS,
  warning: WARNING_COLORS,
  error: ERROR_COLORS,
  info: INFO_COLORS,
} as const;

// ============================================
// COLORES PARA TEMA TWILIGHT (INTERMEDIO)
// ============================================
export const TWILIGHT_COLORS = {
  bg: {
    primary: '#1a202e',    // Fondo principal (más claro que dark)
    secondary: '#232936',  // Surface elevado
    tertiary: '#2d3748',   // Cards, modales
    hover: '#3a4556',      // Hover states
  },
  text: {
    primary: '#e8eaf0',    // Texto principal (menos brillante que white)
    secondary: '#b8bcc8',  // Texto secundario
    muted: '#8a8fa0',      // Texto desactivado
  },
  border: {
    light: '#3a4556',      // Borders suaves
    normal: '#4a556b',     // Borders normales
    strong: '#5a657b',     // Borders destacados
  },
  // Acentos con opacidad para suavidad
  primary: 'rgba(99, 102, 241, 0.9)',
  accent: 'rgba(168, 85, 247, 0.85)',
  success: 'rgba(16, 185, 129, 0.9)',
  warning: 'rgba(245, 158, 11, 0.9)',
  error: 'rgba(239, 68, 68, 0.9)',
  info: 'rgba(59, 130, 246, 0.9)',
} as const;

// ============================================
// UTILIDADES DE COLOR
// ============================================

/**
 * Obtiene el color con opacidad
 * @param color - Color base en formato hex
 * @param opacity - Opacidad de 0 a 1
 */
export const withOpacity = (color: string, opacity: number): string => {
  // Convertir hex a rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Tipos para TypeScript
 */
export type ColorShade = keyof typeof NEUTRAL_COLORS;
export type PrimaryShade = keyof typeof PRIMARY_COLORS;
export type AccentShade = keyof typeof ACCENT_COLORS;
export type StateShade = keyof typeof SUCCESS_COLORS;

export default COLORS;

