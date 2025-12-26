/**
 * ============================================
 * TOKENS DE ANIMACIONES CORPORATIVAS
 * PQNC QA AI Platform - 2025
 * ============================================
 * 
 * Biblioteca única de animaciones con Framer Motion.
 * Física y timing consistentes en toda la plataforma.
 */

import type { Variants } from 'framer-motion';

// Tipo Transition custom (Framer Motion no lo exporta directamente)
export type Transition = {
  duration?: number;
  delay?: number;
  ease?: number[] | string;
  type?: 'tween' | 'spring' | 'inertia';
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
  [key: string]: any;
};

// ============================================
// DURACIONES ESTANDARIZADAS
// ============================================

export const ANIMATION_DURATIONS = {
  instant: 0.1,   // Micro-interactions (toggle, checkbox)
  fast: 0.2,      // Hover effects, tooltips
  normal: 0.3,    // Transiciones generales, modales
  slow: 0.4,      // Sidebars, drawers grandes
} as const;

// ============================================
// EASINGS CORPORATIVOS
// ============================================

export const ANIMATION_EASINGS = {
  // Suave y natural - uso general
  smooth: [0.16, 1, 0.3, 1] as [number, number, number, number],
  
  // Bounce sutil - elementos destacados
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  
  // Entrada/salida rápida - modales, overlays
  sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

// ============================================
// SPRING PHYSICS HOMOLOGADA
// ============================================

export const SPRING_PHYSICS = {
  // Suave - elementos delicados (badges, pills)
  soft: { 
    type: 'spring' as const,
    stiffness: 150, 
    damping: 20 
  },
  
  // Normal - uso general (botones, cards)
  normal: { 
    type: 'spring' as const,
    stiffness: 200, 
    damping: 25 
  },
  
  // Rígido - elementos pesados (modales, sidebars)
  stiff: { 
    type: 'spring' as const,
    stiffness: 300, 
    damping: 30 
  },
} as const;

// ============================================
// VARIANTES PREDEFINIDAS DE FRAMER MOTION
// ============================================

/**
 * Fade in/out simple
 */
export const FADE_IN: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Scale in/out con fade (para modales)
 */
export const SCALE_IN: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

/**
 * Slide up con fade (para tooltips, notifications)
 */
export const SLIDE_UP: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

/**
 * Slide down con fade (para dropdowns)
 */
export const SLIDE_DOWN: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/**
 * Slide from left (para sidebars)
 */
export const SLIDE_LEFT: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/**
 * Slide from right (para sidebars)
 */
export const SLIDE_RIGHT: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/**
 * Spring pop (para botones, iconos)
 */
export const SPRING_POP: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
};

/**
 * Collapse vertical (para acordeones)
 */
export const COLLAPSE: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

// ============================================
// TRANSICIONES PREDEFINIDAS
// ============================================

/**
 * Transición suave estándar
 */
export const SMOOTH_TRANSITION: Transition = {
  duration: ANIMATION_DURATIONS.normal,
  ease: ANIMATION_EASINGS.smooth,
};

/**
 * Transición rápida
 */
export const FAST_TRANSITION: Transition = {
  duration: ANIMATION_DURATIONS.fast,
  ease: ANIMATION_EASINGS.smooth,
};

/**
 * Transición con spring normal
 */
export const SPRING_TRANSITION: Transition = SPRING_PHYSICS.normal;

/**
 * Transición para modales (scale + smooth)
 */
export const MODAL_TRANSITION: Transition = {
  duration: ANIMATION_DURATIONS.normal,
  ease: ANIMATION_EASINGS.sharp,
};

// ============================================
// UTILIDADES DE ANIMACIÓN
// ============================================

/**
 * Crea un stagger escalonado para listas
 * @param index - Índice del elemento en la lista
 * @param baseDelay - Delay base antes del primer elemento
 * @param increment - Incremento de delay entre elementos
 */
export const createStagger = (
  index: number,
  baseDelay: number = 0.05,
  increment: number = 0.03
): Transition => ({
  delay: baseDelay + (index * increment),
  duration: ANIMATION_DURATIONS.fast,
  ease: ANIMATION_EASINGS.smooth,
});

/**
 * Crea una transición personalizada
 * @param duration - Duración en segundos
 * @param ease - Easing a usar
 */
export const createTransition = (
  duration: keyof typeof ANIMATION_DURATIONS = 'normal',
  ease: keyof typeof ANIMATION_EASINGS = 'smooth'
): Transition => ({
  duration: ANIMATION_DURATIONS[duration],
  ease: ANIMATION_EASINGS[ease],
});

/**
 * Crea variantes de hover/tap para botones
 */
export const createButtonVariants = () => ({
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
});

/**
 * Crea variantes de hover para cards
 */
export const createCardVariants = () => ({
  hover: { 
    y: -2,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.10), 0 4px 8px rgba(0, 0, 0, 0.05)'
  },
});

// ============================================
// ANIMACIONES DE BACKDROP (Fondo de modales)
// ============================================

export const BACKDROP_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const BACKDROP_TRANSITION: Transition = {
  duration: ANIMATION_DURATIONS.fast,
};

// ============================================
// ANIMACIONES PARA LISTAS
// ============================================

/**
 * Container para lista con stagger
 */
export const LIST_CONTAINER: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0 },
};

/**
 * Item de lista con slide up
 */
export const LIST_ITEM: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: FAST_TRANSITION,
  },
  exit: { opacity: 0, y: 10 },
};

// ============================================
// TIPOS PARA TYPESCRIPT
// ============================================

export type AnimationDuration = keyof typeof ANIMATION_DURATIONS;
export type AnimationEasing = keyof typeof ANIMATION_EASINGS;
export type SpringPhysics = keyof typeof SPRING_PHYSICS;
export type AnimationVariant = 
  | 'fadeIn'
  | 'scaleIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'springPop'
  | 'collapse';

export default {
  durations: ANIMATION_DURATIONS,
  easings: ANIMATION_EASINGS,
  spring: SPRING_PHYSICS,
  variants: {
    fadeIn: FADE_IN,
    scaleIn: SCALE_IN,
    slideUp: SLIDE_UP,
    slideDown: SLIDE_DOWN,
    slideLeft: SLIDE_LEFT,
    slideRight: SLIDE_RIGHT,
    springPop: SPRING_POP,
    collapse: COLLAPSE,
  },
  transitions: {
    smooth: SMOOTH_TRANSITION,
    fast: FAST_TRANSITION,
    spring: SPRING_TRANSITION,
    modal: MODAL_TRANSITION,
  },
};

