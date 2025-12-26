/**
 * ============================================
 * COMPONENTE BASE: BADGE
 * ============================================
 * 
 * Badge homologado con el sistema de diseño corporativo.
 * Usa tokens de diseño para colores y formas.
 * 
 * Variantes (por estado):
 * - default: Badge neutral
 * - primary: Badge primario
 * - success: Badge de éxito
 * - warning: Badge de advertencia
 * - error: Badge de error
 * - info: Badge informativo
 * 
 * Tamaños:
 * - sm: Pequeño (inline text)
 * - md: Normal (default)
 * - lg: Grande (destacado)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { 
  SPRING_POP,
  SPRING_PHYSICS,
  RADIUS,
} from '../../styles/tokens';

// ============================================
// TIPOS
// ============================================

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean; // Mostrar punto indicador
  removable?: boolean; // Mostrar botón de cerrar
  onRemove?: () => void;
  children: React.ReactNode;
}

// ============================================
// ESTILOS BASE
// ============================================

const baseStyles = `
  inline-flex items-center justify-center
  font-medium whitespace-nowrap
  transition-all duration-200
`;

// Estilos por variante
const variantStyles: Record<BadgeVariant, string> = {
  default: `
    bg-neutral-100 dark:bg-neutral-800
    text-neutral-700 dark:text-neutral-300
    border border-neutral-300 dark:border-neutral-600
  `,
  primary: `
    bg-primary-100 dark:bg-primary-900/30
    text-primary-700 dark:text-primary-300
    border border-primary-300 dark:border-primary-600
  `,
  success: `
    bg-success-100 dark:bg-success-900/30
    text-success-700 dark:text-success-300
    border border-success-300 dark:border-success-600
  `,
  warning: `
    bg-warning-100 dark:bg-warning-900/30
    text-warning-700 dark:text-warning-300
    border border-warning-300 dark:border-warning-600
  `,
  error: `
    bg-error-100 dark:bg-error-900/30
    text-error-700 dark:text-error-300
    border border-error-300 dark:border-error-600
  `,
  info: `
    bg-info-100 dark:bg-info-900/30
    text-info-700 dark:text-info-300
    border border-info-300 dark:border-info-600
  `,
};

// Estilos de dot por variante
const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-500',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
};

// Estilos por tamaño
const sizeStyles: Record<BadgeSize, { container: string; text: string; dot: string; icon: string }> = {
  sm: {
    container: 'px-2 py-0.5 gap-1',
    text: 'text-xs',
    dot: 'w-1.5 h-1.5',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2.5 py-1 gap-1.5',
    text: 'text-sm',
    dot: 'w-2 h-2',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-3 py-1.5 gap-2',
    text: 'text-sm',
    dot: 'w-2.5 h-2.5',
    icon: 'w-4 h-4',
  },
};

// ============================================
// COMPONENTE
// ============================================

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      removable = false,
      onRemove,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const styles = sizeStyles[size];

    // Combinar clases
    const badgeClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${styles.container}
      ${styles.text}
      rounded-full
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <motion.span
        ref={ref}
        className={badgeClasses}
        initial="initial"
        animate="animate"
        variants={SPRING_POP}
        transition={SPRING_PHYSICS.soft}
        {...props}
      >
        {/* Punto indicador */}
        {dot && (
          <span 
            className={`
              ${styles.dot} 
              ${dotStyles[variant]} 
              rounded-full 
              flex-shrink-0
            `}
          />
        )}

        {/* Contenido */}
        <span className="flex-1">
          {children}
        </span>

        {/* Botón de remover */}
        {removable && onRemove && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={`
              flex-shrink-0 
              hover:bg-black/10 dark:hover:bg-white/10 
              rounded-full 
              p-0.5
              transition-colors
            `}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className={styles.icon} />
          </motion.button>
        )}
      </motion.span>
    );
  }
);

Badge.displayName = 'Badge';

// ============================================
// VARIANTES PREDEFINIDAS
// ============================================

export const PrimaryBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="primary" {...props} />
);

export const SuccessBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="success" {...props} />
);

export const WarningBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="warning" {...props} />
);

export const ErrorBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="error" {...props} />
);

export const InfoBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="info" {...props} />
);

// Badge con dot (helper común)
export const DotBadge: React.FC<Omit<BadgeProps, 'dot'>> = (props) => (
  <Badge dot {...props} />
);

export default Badge;

