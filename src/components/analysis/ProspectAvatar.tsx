/**
 * Componente reutilizable para mostrar avatar de prospecto
 * Muestra iniciales del prospecto o icono de usuario si no hay nombre
 */

import React from 'react';
import { User } from 'lucide-react';

interface ProspectAvatarProps {
  nombreCompleto?: string | null;
  nombreWhatsapp?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl'
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32
};

export const ProspectAvatar: React.FC<ProspectAvatarProps> = ({
  nombreCompleto,
  nombreWhatsapp,
  size = 'md',
  className = ''
}) => {
  // Obtener iniciales del nombre
  const getInitials = (): string | null => {
    const name = nombreCompleto || nombreWhatsapp;
    if (!name || name.trim() === '') return null;
    
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return null;
    
    if (parts.length === 1) {
      // Si solo hay una palabra, tomar las primeras 2 letras (máximo)
      const word = parts[0];
      return word.length >= 2 
        ? word.substring(0, 2).toUpperCase()
        : word.charAt(0).toUpperCase();
    }
    
    // Si hay múltiples palabras, tomar la primera letra de la primera y última palabra
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials();
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm ${className}`}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <User size={iconSize} className="text-white/90" />
      )}
    </div>
  );
};

