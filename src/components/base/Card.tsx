/**
 * ============================================
 * COMPONENTE BASE: CARD
 * ============================================
 * 
 * Card homologado con el sistema de diseño corporativo.
 * Usa tokens de diseño para sombras, bordes y animaciones.
 * 
 * Variantes:
 * - default: Card básico con borde sutil
 * - elevated: Card con sombra elevada
 * - outlined: Card con solo borde
 * - gradient: Card con gradiente header
 * 
 * Tamaños de padding:
 * - sm: Compacto
 * - md: Normal (default)
 * - lg: Espacioso
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  SCALE_IN, 
  SMOOTH_TRANSITION,
  createCardVariants,
  RADIUS,
  SHADOWS,
} from '../../styles/tokens';

// ============================================
// TIPOS
// ============================================

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'gradient';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean; // Si tiene hover effect
  gradient?: string; // Gradiente personalizado para header
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

// ============================================
// ESTILOS BASE
// ============================================

const baseStyles = `
  bg-white dark:bg-neutral-800
  border border-neutral-200 dark:border-neutral-700
  transition-all duration-200
`;

// Estilos por variante
const variantStyles: Record<CardVariant, string> = {
  default: `
    shadow-sm
  `,
  elevated: `
    shadow-md hover:shadow-lg
  `,
  outlined: `
    shadow-none
    border-2
  `,
  gradient: `
    shadow-md
    border-t-4 border-t-primary-500
  `,
};

// Estilos de padding por tamaño
const sizeStyles: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const headerSizeStyles: Record<CardSize, string> = {
  sm: 'px-4 py-3',
  md: 'px-6 py-4',
  lg: 'px-8 py-5',
};

// ============================================
// COMPONENTE
// ============================================

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      interactive = false,
      gradient,
      header,
      footer,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    // Combinar clases
    const cardClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      rounded-lg
      ${className}
    `.trim().replace(/\s+/g, ' ');

    // Variantes de animación
    const cardVariants = interactive ? createCardVariants() : undefined;

    return (
      <motion.div
        ref={ref}
        className={cardClasses}
        initial="initial"
        animate="animate"
        variants={SCALE_IN}
        transition={SMOOTH_TRANSITION}
        whileHover={interactive ? cardVariants?.hover : undefined}
        {...props}
      >
        {/* Header con gradiente opcional */}
        {header && (
          <div
            className={`
              ${headerSizeStyles[size]}
              border-b border-neutral-200 dark:border-neutral-700
              -mx-px -mt-px
              rounded-t-lg
            `}
            style={gradient ? { 
              background: gradient,
              color: 'white',
            } : undefined}
          >
            {header}
          </div>
        )}

        {/* Contenido principal */}
        <div className={header || footer ? '' : sizeStyles[size]}>
          {header || footer ? (
            <div className={sizeStyles[size]}>
              {children}
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`
              ${headerSizeStyles[size]}
              border-t border-neutral-200 dark:border-neutral-700
              -mx-px -mb-px
              rounded-b-lg
              bg-neutral-50 dark:bg-neutral-900/50
            `}
          >
            {footer}
          </div>
        )}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// ============================================
// SUB-COMPONENTES
// ============================================

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <h3 
    className={`text-lg font-semibold text-neutral-900 dark:text-white ${className}`} 
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <p 
    className={`text-sm text-neutral-600 dark:text-neutral-400 mt-1 ${className}`} 
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <div className={`mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 ${className}`} {...props}>
    {children}
  </div>
);

// ============================================
// VARIANTES PREDEFINIDAS
// ============================================

export const ElevatedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="elevated" {...props} />
);

export const OutlinedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="outlined" {...props} />
);

export const GradientCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="gradient" {...props} />
);

export default Card;

