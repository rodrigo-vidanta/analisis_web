/**
 * Wrapper para mostrar BackupBadge de forma asíncrona
 */

import React, { useEffect, useState } from 'react';
import { backupService } from '../../services/backupService';
import { BackupBadge } from './BackupBadge';

interface BackupBadgeWrapperProps {
  currentUserId: string;
  prospectoEjecutivoId: string | null | undefined;
  variant?: 'badge' | 'compact' | 'inline';
  className?: string;
}

export const BackupBadgeWrapper: React.FC<BackupBadgeWrapperProps> = ({
  currentUserId,
  prospectoEjecutivoId,
  variant = 'compact',
  className = ''
}) => {
  const [backupInfo, setBackupInfo] = useState<{
    ejecutivo_nombre: string;
    ejecutivo_email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !prospectoEjecutivoId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const checkBackup = async () => {
      try {
        const result = await backupService.isProspectFromBackupEjecutivo(
          currentUserId,
          prospectoEjecutivoId
        );

        if (!cancelled && result.isBackup && result.ejecutivo_nombre) {
          setBackupInfo({
            ejecutivo_nombre: result.ejecutivo_nombre,
            ejecutivo_email: result.ejecutivo_email
          });
        } else if (!cancelled) {
          setBackupInfo(null);
        }
      } catch (error) {
        console.error('Error verificando backup:', error);
        if (!cancelled) {
          setBackupInfo(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkBackup();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, prospectoEjecutivoId]);

  if (loading || !backupInfo) {
    return null;
  }

  return (
    <BackupBadge
      ejecutivoNombre={backupInfo.ejecutivo_nombre}
      variant={variant}
      className={className}
    />
  );
};

