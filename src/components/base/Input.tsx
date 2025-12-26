/**
 * ============================================
 * COMPONENTE BASE: INPUT
 * ============================================
 * 
 * Input homologado con el sistema de diseño corporativo.
 * Usa tokens de diseño para colores, formas y validaciones.
 * 
 * Características:
 * - Validación visual (success, error, warning)
 * - Iconos left/right
 * - Helper text y error messages
 * - Estados disabled y readonly
 * - Tamaños sm, md, lg
 */

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  RADIUS,
  COLORS,
  ANIMATION_DURATIONS,
} from '../../styles/tokens';

// ============================================
// TIPOS
// ============================================

export type InputVariant = 'default' | 'success' | 'error' | 'warning';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// ============================================
// ESTILOS BASE
// ============================================

const baseStyles = `
  w-full
  bg-white dark:bg-neutral-800
  border
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-0
  disabled:opacity-50 disabled:cursor-not-allowed
  placeholder:text-neutral-400 dark:placeholder:text-neutral-500
`;

// Estilos por variante
const variantStyles: Record<InputVariant, string> = {
  default: `
    border-neutral-300 dark:border-neutral-600
    hover:border-neutral-400 dark:hover:border-neutral-500
    focus:border-primary-500 focus:ring-primary-500/20
    text-neutral-900 dark:text-white
  `,
  success: `
    border-success-500
    focus:border-success-600 focus:ring-success-500/20
    text-neutral-900 dark:text-white
  `,
  error: `
    border-error-500
    focus:border-error-600 focus:ring-error-500/20
    text-neutral-900 dark:text-white
  `,
  warning: `
    border-warning-500
    focus:border-warning-600 focus:ring-warning-500/20
    text-neutral-900 dark:text-white
  `,
};

// Estilos por tamaño
const sizeStyles: Record<InputSize, { input: string; label: string; helper: string }> = {
  sm: {
    input: 'px-3 py-1.5 text-sm rounded-md',
    label: 'text-sm mb-1',
    helper: 'text-xs mt-1',
  },
  md: {
    input: 'px-4 py-2.5 text-sm rounded-lg',
    label: 'text-sm mb-1.5',
    helper: 'text-sm mt-1.5',
  },
  lg: {
    input: 'px-5 py-3 text-base rounded-lg',
    label: 'text-base mb-2',
    helper: 'text-sm mt-2',
  },
};

// Iconos de validación
const validationIcons: Record<Exclude<InputVariant, 'default'>, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-success-500" />,
  error: <AlertCircle className="w-5 h-5 text-error-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning-500" />,
};

// ============================================
// COMPONENTE
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const styles = sizeStyles[size];
    const hasError = variant === 'error' || !!errorMessage;
    const actualVariant = hasError ? 'error' : variant;

    // Combinar clases del input
    const inputClasses = `
      ${baseStyles}
      ${variantStyles[actualVariant]}
      ${styles.input}
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon || actualVariant !== 'default' ? 'pr-10' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {/* Label */}
        {label && (
          <label className={`
            block font-medium text-neutral-700 dark:text-neutral-300
            ${styles.label}
          `}>
            {label}
          </label>
        )}

        {/* Input container con iconos */}
        <div className="relative">
          {/* Icono izquierdo */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />

          {/* Icono derecho o validación */}
          {(rightIcon || actualVariant !== 'default') && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon || (actualVariant !== 'default' && validationIcons[actualVariant])}
            </div>
          )}
        </div>

        {/* Helper text o error message */}
        {(helperText || errorMessage) && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.fast }}
            className={`
              ${styles.helper}
              ${hasError 
                ? 'text-error-600 dark:text-error-400' 
                : 'text-neutral-600 dark:text-neutral-400'
              }
            `}
          >
            {errorMessage || helperText}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// VARIANTES PREDEFINIDAS
// ============================================

export const SuccessInput = forwardRef<HTMLInputElement, Omit<InputProps, 'variant'>>(
  (props, ref) => <Input ref={ref} variant="success" {...props} />
);
SuccessInput.displayName = 'SuccessInput';

export const ErrorInput = forwardRef<HTMLInputElement, Omit<InputProps, 'variant'>>(
  (props, ref) => <Input ref={ref} variant="error" {...props} />
);
ErrorInput.displayName = 'ErrorInput';

export const WarningInput = forwardRef<HTMLInputElement, Omit<InputProps, 'variant'>>(
  (props, ref) => <Input ref={ref} variant="warning" {...props} />
);
WarningInput.displayName = 'WarningInput';

export default Input;

