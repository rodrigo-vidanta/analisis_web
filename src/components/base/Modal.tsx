/**
 * ============================================
 * COMPONENTE BASE: MODAL
 * ============================================
 * 
 * Modal homologado con el sistema de diseño corporativo.
 * Usa tokens de diseño para animaciones, sombras y formas.
 * 
 * Características:
 * - Animaciones corporativas con Framer Motion
 * - Backdrop con blur
 * - Scroll interno
 * - Cierre con ESC o click outside
 * - Header, content y footer separados
 * 
 * Tamaños:
 * - sm: 400px max-width
 * - md: 600px max-width (default)
 * - lg: 800px max-width
 * - xl: 1000px max-width
 * - full: 95vw max-width
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { 
  BACKDROP_VARIANTS,
  BACKDROP_TRANSITION,
  SCALE_IN,
  MODAL_TRANSITION,
  RADIUS,
  SHADOWS,
} from '../../styles/tokens';

// ============================================
// TIPOS
// ============================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// ============================================
// ESTILOS
// ============================================

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]',
};

// ============================================
// COMPONENTE
// ============================================

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  title,
  description,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnBackdrop = true,
  header,
  footer,
  children,
  className = '',
}) => {
  // Manejar cierre con ESC
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, isOpen, onClose]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Manejar click en backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
            variants={BACKDROP_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={BACKDROP_TRANSITION}
            onClick={handleBackdropClick}
          />

          {/* Modal Container */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
          >
            <motion.div
              className={`
                bg-white dark:bg-neutral-800
                rounded-2xl
                shadow-2xl
                w-full
                ${sizeStyles[size]}
                max-h-[92vh]
                flex flex-col
                border border-neutral-100 dark:border-neutral-700
                ${className}
              `}
              variants={SCALE_IN}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={MODAL_TRANSITION}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(header || title || showCloseButton) && (
                <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                  {/* Título o header personalizado */}
                  {header || (
                    <div className="flex-1 pr-4">
                      {title && (
                        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          {description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Botón de cierre */}
                  {showCloseButton && (
                    <motion.button
                      onClick={onClose}
                      className="
                        w-8 h-8 
                        rounded-lg 
                        flex items-center justify-center
                        text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300
                        hover:bg-neutral-100 dark:hover:bg-neutral-700
                        transition-colors
                        flex-shrink-0
                      "
                      whileHover={{ scale: 1.05, rotate: 90 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content (con scroll) */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================
// SUB-COMPONENTES PARA CONTENT
// ============================================

export const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

export const ModalTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <h3 className={`text-lg font-semibold text-neutral-900 dark:text-white ${className}`}>
    {children}
  </h3>
);

export const ModalDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <p className={`text-sm text-neutral-600 dark:text-neutral-400 mt-1 ${className}`}>
    {children}
  </p>
);

export const ModalFooter: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  align?: 'left' | 'center' | 'right';
}> = ({ 
  children, 
  className = '',
  align = 'right',
}) => {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={`flex items-center gap-3 ${alignStyles[align]} ${className}`}>
      {children}
    </div>
  );
};

export default Modal;

