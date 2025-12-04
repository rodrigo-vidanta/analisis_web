/**
 * Generador de gradientes para avatares basado en iniciales
 * Crea combinaciones consistentes y discretas usando la paleta de colores del proyecto
 */

/**
 * Obtiene las iniciales de un nombre
 */
export const getInitials = (name: string | undefined | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Array de clases de gradiente completas predefinidas (30 combinaciones)
// Color 1 (from): Paleta verde-teal-cyan-azul (de la imagen)
// Color 2 (to): Paleta lilas, rosas-lilas, azules-fríos
// Intercalando entre gradientes lineales y radiales para mayor variedad visual
// Tailwind necesita clases completas en tiempo de compilación
const GRADIENT_CLASSES = [
  // Teal a Violet/Lila - LINEALES
  'bg-gradient-to-br from-teal-500 to-violet-500',
  'bg-gradient-to-r from-teal-500 to-violet-500',
  'bg-gradient-to-bl from-teal-500 to-violet-500',
  'bg-gradient-to-b from-teal-500 to-violet-500',
  'bg-gradient-to-tr from-teal-500 to-violet-500',
  // Teal a Violet/Lila - RADIALES (sin centro)
  'bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-teal-500 to-violet-500',
  'bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-teal-500 to-violet-500',
  'bg-gradient-to-br from-teal-600 to-violet-600',
  'bg-gradient-to-r from-teal-600 to-violet-600',
  
  // Cyan a Purple - LINEALES
  'bg-gradient-to-br from-cyan-500 to-purple-500',
  'bg-gradient-to-r from-cyan-500 to-purple-500',
  'bg-gradient-to-bl from-cyan-500 to-purple-500',
  'bg-gradient-to-b from-cyan-500 to-purple-500',
  'bg-gradient-to-tr from-cyan-500 to-purple-500',
  // Cyan a Purple - RADIALES (sin centro)
  'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-500 to-purple-500',
  'bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500 to-purple-500',
  'bg-gradient-to-br from-cyan-600 to-purple-600',
  'bg-gradient-to-r from-cyan-600 to-purple-600',
  
  // Blue a Pink - LINEALES
  'bg-gradient-to-br from-blue-500 to-pink-500',
  'bg-gradient-to-r from-blue-500 to-pink-500',
  'bg-gradient-to-bl from-blue-500 to-pink-500',
  'bg-gradient-to-b from-blue-500 to-pink-500',
  'bg-gradient-to-tr from-blue-500 to-pink-500',
  // Blue a Pink - RADIALES (sin centro)
  'bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500 to-pink-500',
  'bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-blue-500 to-pink-500',
  'bg-gradient-to-br from-blue-600 to-pink-600',
  'bg-gradient-to-r from-blue-600 to-pink-600',
  
  // Emerald a Indigo - LINEALES
  'bg-gradient-to-br from-emerald-500 to-indigo-500',
  'bg-gradient-to-r from-emerald-500 to-indigo-500',
  'bg-gradient-to-bl from-emerald-500 to-indigo-500',
  'bg-gradient-to-b from-emerald-500 to-indigo-500',
  'bg-gradient-to-tr from-emerald-500 to-indigo-500',
  // Emerald a Indigo - RADIALES (sin centro)
  'bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-500 to-indigo-500',
  'bg-gradient-to-br from-emerald-600 to-indigo-600',
];

/**
 * Genera un gradiente consistente basado en las iniciales
 * @param name - Nombre completo o iniciales
 * @returns Objeto con las clases de Tailwind para el gradiente
 */
export const getAvatarGradient = (name: string | undefined | null): {
  gradientClass: string;
  initials: string;
} => {
  const initials = getInitials(name);
  
  // Si solo hay una letra, duplicarla para tener dos caracteres
  const firstChar = initials[0] || '?';
  const secondChar = initials[1] || firstChar;
  
  // Convertir caracteres a índices (A-Z = 0-25)
  const firstIndex = firstChar.charCodeAt(0) - 65; // A=0, B=1, etc.
  const secondIndex = secondChar.charCodeAt(0) - 65;
  
  // Si no es una letra válida, usar índice 0
  const validFirstIndex = (firstIndex >= 0 && firstIndex <= 25) ? firstIndex : 0;
  const validSecondIndex = (secondIndex >= 0 && secondIndex <= 25) ? secondIndex : 0;
  
  // Combinar índices para obtener una posición única en el array de gradientes
  // Usar módulo para asegurar que siempre esté en rango
  const gradientIndex = (validFirstIndex * 26 + validSecondIndex) % GRADIENT_CLASSES.length;
  
  return {
    gradientClass: GRADIENT_CLASSES[gradientIndex],
    initials: initials
  };
};

