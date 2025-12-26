/**
 * ============================================
 * COMPONENTE BASE: BUTTON
 * ============================================
 * 
 * Botón homologado con el sistema de diseño corporativo.
 * Usa tokens de diseño para colores, animaciones y formas.
 * 
 * Variantes:
 * - primary: Botón principal con gradiente
 * - secondary: Botón secundario con fondo neutral
 * - ghost: Botón transparente con hover
 * - danger: Botón de acción destructiva
 * 
 * Tamaños:
 * - sm: Pequeño (botones inline, badges)
 * - md: Normal (default)
 * - lg: Grande (CTAs principales)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { 
  GRADIENTS, 
  COLORS, 
  RADIUS, 
  SHADOWS,
  createButtonVariants,
  ANIMATION_DURATIONS,
} from '../../styles/tokens';

// ============================================
// TIPOS
// ============================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

// ============================================
// ESTILOS BASE
// ============================================

const baseStyles = `
  inline-flex items-center justify-center
  font-medium transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  relative overflow-hidden
`;

// Estilos por variante
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    text-white
    bg-gradient-to-r from-primary-500 to-primary-600
    hover:from-primary-600 hover:to-primary-700
    focus:ring-primary-500/50
    shadow-sm hover:shadow-md
  `,
  secondary: `
    text-neutral-700 dark:text-neutral-200
    bg-neutral-100 dark:bg-neutral-800
    hover:bg-neutral-200 dark:hover:bg-neutral-700
    border border-neutral-300 dark:border-neutral-600
    focus:ring-neutral-500/50
  `,
  ghost: `
    text-neutral-700 dark:text-neutral-200
    hover:bg-neutral-100 dark:hover:bg-neutral-800
    focus:ring-neutral-500/50
  `,
  danger: `
    text-white
    bg-error-500
    hover:bg-error-600
    focus:ring-error-500/50
    shadow-sm hover:shadow-md
  `,
  success: `
    text-white
    bg-success-500
    hover:bg-success-600
    focus:ring-success-500/50
    shadow-sm hover:shadow-md
  `,
  warning: `
    text-white
    bg-warning-500
    hover:bg-warning-600
    focus:ring-warning-500/50
    shadow-sm hover:shadow-md
  `,
};

// Estilos por tamaño
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

// ============================================
// COMPONENTE
// ============================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    // Combinar clases
    const buttonClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    // Variantes de animación
    const buttonVariants = createButtonVariants();

    return (
      <motion.button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        variants={buttonVariants}
        whileHover={!disabled && !loading ? 'hover' : undefined}
        whileTap={!disabled && !loading ? 'tap' : undefined}
        {...props}
      >
        {/* Icono izquierdo */}
        {icon && iconPosition === 'left' && !loading && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}

        {/* Spinner de carga */}
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        )}

        {/* Texto del botón */}
        <span className="flex-1">
          {children}
        </span>

        {/* Icono derecho */}
        {icon && iconPosition === 'right' && !loading && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}

        {/* Efecto de shimmer en hover (solo primary) */}
        {variant === 'primary' && !disabled && !loading && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// ============================================
// VARIANTES PREDEFINIDAS (Helpers)
// ============================================

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
);

export const SuccessButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="success" {...props} />
);

export const WarningButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="warning" {...props} />
);

export default Button;

