/**
 * Componente Avatar reutilizable para toda la plataforma
 * Usa la paleta de gradientes unificada basada en iniciales
 */

import React from 'react';
import { User } from 'lucide-react';
import { getAvatarGradient } from '../../utils/avatarGradient';

interface AvatarProps {
  /** Nombre completo o iniciales para generar el gradiente */
  name?: string | null;
  /** Tamaño del avatar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Clases adicionales */
  className?: string;
  /** Si se debe mostrar un icono cuando no hay nombre */
  showIcon?: boolean;
  /** Callback al hacer click */
  onClick?: () => void;
  /** Si el avatar es clickeable */
  clickable?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl'
};

const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  className = '',
  showIcon = true,
  onClick,
  clickable = false
}) => {
  const { gradientClass, initials } = getAvatarGradient(name);
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  
  const displayInitials = initials !== '?' ? initials : null;
  const shouldShowIcon = showIcon && !displayInitials;

  const baseClasses = `${sizeClass} rounded-full ${gradientClass} flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm`;
  const clickableClasses = clickable || onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';
  const finalClasses = `${baseClasses} ${clickableClasses} ${className}`.trim();

  return (
    <div
      className={finalClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {displayInitials ? (
        <span>{displayInitials}</span>
      ) : shouldShowIcon ? (
        <User size={iconSize} className="text-white/90" />
      ) : (
        <span>?</span>
      )}
    </div>
  );
};

