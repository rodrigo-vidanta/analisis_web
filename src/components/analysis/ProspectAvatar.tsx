/**
 * Componente reutilizable para mostrar avatar de prospecto
 * Usa el componente Avatar unificado con la paleta de gradientes global
 */

import React from 'react';
import { Avatar } from '../shared/Avatar';

interface ProspectAvatarProps {
  nombreCompleto?: string | null;
  nombreWhatsapp?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ProspectAvatar: React.FC<ProspectAvatarProps> = ({
  nombreCompleto,
  nombreWhatsapp,
  size = 'md',
  className = ''
}) => {
  const name = nombreCompleto || nombreWhatsapp;

  return (
    <Avatar
      name={name}
      size={size}
      className={className}
      showIcon={true}
    />
  );
};

