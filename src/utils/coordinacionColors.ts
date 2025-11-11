/**
 * Utilidad para obtener colores por coordinación
 * Cada coordinación tiene un color único para identificación visual
 */

export interface CoordinacionColor {
  bg: string;
  text: string;
  border: string;
  badge: string;
}

const COORDINACION_COLORS: Record<string, CoordinacionColor> = {
  'VEN': {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-500'
  },
  'I360': {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-500'
  },
  'MVP': {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-500'
  },
  'COBACA': {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-500'
  },
  'BOOM': {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    badge: 'bg-pink-500'
  }
};

/**
 * Obtiene los colores para una coordinación por su código
 */
export function getCoordinacionColor(codigo: string | null | undefined): CoordinacionColor {
  if (!codigo) {
    return {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
      badge: 'bg-gray-500'
    };
  }
  
  return COORDINACION_COLORS[codigo.toUpperCase()] || {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
    badge: 'bg-gray-500'
  };
}

/**
 * Obtiene el color del badge para una coordinación
 */
export function getCoordinacionBadgeColor(codigo: string | null | undefined): string {
  return getCoordinacionColor(codigo).badge;
}

