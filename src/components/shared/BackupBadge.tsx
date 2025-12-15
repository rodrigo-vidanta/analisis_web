/**
 * Badge para indicar que un prospecto pertenece a un ejecutivo del cual el usuario actual es backup
 */

import React from 'react';
import { UserCheck } from 'lucide-react';

interface BackupBadgeProps {
  ejecutivoNombre: string;
  variant?: 'badge' | 'compact' | 'inline';
  className?: string;
}

export const BackupBadge: React.FC<BackupBadgeProps> = ({ 
  ejecutivoNombre, 
  variant = 'badge',
  className = '' 
}) => {
  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ${className}`}>
        <UserCheck className="w-3 h-3" />
        Backup de {ejecutivoNombre.split(' ')[0]}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 ${className}`}>
        <UserCheck className="w-3.5 h-3.5" />
        <span className="font-medium">Backup de {ejecutivoNombre}</span>
      </div>
    );
  }

  // Variant 'badge' (default)
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}>
      <UserCheck className="w-3.5 h-3.5" />
      <span>Backup de {ejecutivoNombre}</span>
    </div>
  );
};

