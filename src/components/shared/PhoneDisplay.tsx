/**
 * ============================================
 * PHONE DISPLAY COMPONENT
 * ============================================
 * 
 * Componente reutilizable para mostrar números de teléfono
 * con enmascaramiento automático según permisos del usuario.
 * 
 * REGLAS DE VISIBILIDAD:
 * - Admin/AdminOp/CoordCalidad: siempre ven el teléfono
 * - Coordinador/Ejecutivo: solo si prospecto tiene id_dynamics, es "Activo PQNC" o "Es miembro"
 * - Otros: no ven teléfonos
 * 
 * @example
 * ```tsx
 * <PhoneDisplay 
 *   phone={prospecto.telefono_principal}
 *   prospecto={prospecto}
 *   showIcon
 *   copyable
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import { Phone, Eye, EyeOff, Copy, Check, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { usePhoneVisibility, MASKED_PHONE, HIDDEN_PHONE_REASON } from '../../hooks/usePhoneVisibility';
import type { ProspectoPhoneData } from '../../hooks/usePhoneVisibility';

// ============================================
// INTERFACES
// ============================================

export interface PhoneDisplayProps {
  /** Número de teléfono a mostrar */
  phone: string | null | undefined;
  
  /** Datos del prospecto para determinar visibilidad */
  prospecto: ProspectoPhoneData;
  
  /** Mostrar icono de teléfono */
  showIcon?: boolean;
  
  /** Permitir copiar el teléfono */
  copyable?: boolean;
  
  /** Mostrar tooltip explicativo cuando está oculto */
  showTooltip?: boolean;
  
  /** Clases CSS adicionales para el contenedor */
  className?: string;
  
  /** Clases CSS para el texto del teléfono */
  textClassName?: string;
  
  /** Label a mostrar antes del teléfono */
  label?: string;
  
  /** Mostrar label encima del teléfono */
  showLabel?: boolean;
  
  /** Tamaño del componente */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  
  /** Texto a mostrar cuando no hay teléfono */
  emptyText?: string;
  
  /** Si está en modo inline (sin saltos de línea) */
  inline?: boolean;
}

// ============================================
// CONSTANTES DE ESTILO
// ============================================

const sizeClasses = {
  xs: {
    text: 'text-xs',
    icon: 'w-3 h-3',
    padding: 'px-1.5 py-0.5',
  },
  sm: {
    text: 'text-sm',
    icon: 'w-3.5 h-3.5',
    padding: 'px-2 py-1',
  },
  md: {
    text: 'text-base',
    icon: 'w-4 h-4',
    padding: 'px-2.5 py-1.5',
  },
  lg: {
    text: 'text-lg',
    icon: 'w-5 h-5',
    padding: 'px-3 py-2',
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const PhoneDisplay: React.FC<PhoneDisplayProps> = ({
  phone,
  prospecto,
  showIcon = false,
  copyable = false,
  showTooltip = true,
  className = '',
  textClassName = '',
  label = 'Teléfono',
  showLabel = false,
  size = 'sm',
  emptyText = 'No disponible',
  inline = false,
}) => {
  const { canViewPhone, loading } = usePhoneVisibility();
  const [copied, setCopied] = useState(false);
  const [showHiddenMessage, setShowHiddenMessage] = useState(false);
  
  const isVisible = canViewPhone(prospecto);
  const hasPhone = phone && phone.trim() !== '';
  const displayValue = hasPhone
    ? (isVisible ? phone : MASKED_PHONE)
    : emptyText;
  
  const sizeClass = sizeClasses[size];
  
  // Handler para copiar
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!hasPhone || !isVisible) {
      if (!isVisible && hasPhone) {
        toast.error('No tienes permiso para copiar este teléfono');
      }
      return;
    }
    
    try {
      await navigator.clipboard.writeText(phone!);
      setCopied(true);
      toast.success('Teléfono copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  }, [hasPhone, isVisible, phone]);
  
  // Handler para mostrar mensaje de oculto
  const handleHiddenClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isVisible && hasPhone) {
      setShowHiddenMessage(true);
      setTimeout(() => setShowHiddenMessage(false), 3000);
    }
  }, [isVisible, hasPhone]);
  
  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${sizeClass.padding} w-24`}>
          <span className="invisible">Loading...</span>
        </div>
      </div>
    );
  }
  
  // Contenedor inline vs block
  const Container = inline ? 'span' : 'div';
  const containerClass = inline 
    ? `inline-flex items-center gap-1.5 ${className}`
    : `flex flex-col ${className}`;
  
  return (
    <Container className={containerClass}>
      {/* Label (solo si no es inline) */}
      {showLabel && !inline && (
        <label className={`flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1`}>
          {showIcon && <Phone className={sizeClass.icon} />}
          {label}
        </label>
      )}
      
      {/* Teléfono */}
      <div className="relative inline-flex items-center gap-1.5 group">
        {/* Icono (si showLabel es false pero showIcon es true) */}
        {showIcon && !showLabel && (
          <Phone className={`${sizeClass.icon} text-gray-400 flex-shrink-0`} />
        )}
        
        {/* Valor del teléfono */}
        <span 
          className={`
            font-mono ${sizeClass.text}
            ${hasPhone && isVisible 
              ? 'text-gray-900 dark:text-white' 
              : hasPhone && !isVisible
                ? 'text-gray-400 dark:text-gray-500 cursor-help'
                : 'text-gray-500 dark:text-gray-400'
            }
            ${textClassName}
          `}
          onClick={!isVisible && hasPhone ? handleHiddenClick : undefined}
          title={!isVisible && hasPhone && showTooltip ? HIDDEN_PHONE_REASON : undefined}
        >
          {displayValue}
        </span>
        
        {/* Indicador de oculto */}
        {!isVisible && hasPhone && (
          <Lock 
            className={`${sizeClass.icon} text-amber-500 flex-shrink-0 cursor-help`}
            onClick={handleHiddenClick}
            title={HIDDEN_PHONE_REASON}
          />
        )}
        
        {/* Botón de copiar (solo si visible y copyable) */}
        {copyable && isVisible && hasPhone && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Copiar teléfono"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className={`${sizeClass.icon} text-green-500`} />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className={`${sizeClass.icon} text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
        
        {/* Mensaje cuando está oculto */}
        <AnimatePresence>
          {showHiddenMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 z-50 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded shadow-lg whitespace-nowrap"
            >
              <Lock className="w-3 h-3 inline mr-1" />
              {HIDDEN_PHONE_REASON}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Container>
  );
};

// ============================================
// COMPONENTE SIMPLIFICADO PARA TABLAS/LISTAS
// ============================================

export interface PhoneTextProps {
  phone: string | null | undefined;
  prospecto: ProspectoPhoneData;
  className?: string;
}

/**
 * Versión simplificada solo texto, sin iconos ni interactividad
 */
export const PhoneText: React.FC<PhoneTextProps> = ({ phone, prospecto, className = '' }) => {
  const { canViewPhone, loading } = usePhoneVisibility();
  
  if (loading) {
    return <span className={`animate-pulse ${className}`}>...</span>;
  }
  
  const isVisible = canViewPhone(prospecto);
  const hasPhone = phone && phone.trim() !== '';
  
  if (!hasPhone) {
    return <span className={`text-gray-400 ${className}`}>No disponible</span>;
  }
  
  if (!isVisible) {
    return (
      <span className={`text-gray-400 font-mono ${className}`} title={HIDDEN_PHONE_REASON}>
        {MASKED_PHONE}
      </span>
    );
  }
  
  return <span className={`font-mono ${className}`}>{phone}</span>;
};

// ============================================
// EXPORTS
// ============================================

export default PhoneDisplay;

