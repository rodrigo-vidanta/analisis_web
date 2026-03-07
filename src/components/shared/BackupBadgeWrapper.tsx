/**
 * Wrapper para mostrar BackupBadge de forma asíncrona.
 * Se suscribe a broadcasts de Realtime para actualizar el badge
 * cuando se asigna o remueve un backup.
 */

import React, { useCallback, useEffect, useState } from 'react';
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

  const checkBackup = useCallback(async () => {
    if (!currentUserId || !prospectoEjecutivoId) {
      setBackupInfo(null);
      setLoading(false);
      return;
    }

    try {
      const result = await backupService.isProspectFromBackupEjecutivo(
        currentUserId,
        prospectoEjecutivoId
      );

      if (result.isBackup && result.ejecutivo_nombre) {
        setBackupInfo({
          ejecutivo_nombre: result.ejecutivo_nombre,
          ejecutivo_email: result.ejecutivo_email
        });
      } else {
        setBackupInfo(null);
      }
    } catch (error) {
      console.error('Error verificando backup:', error);
      setBackupInfo(null);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, prospectoEjecutivoId]);

  // Check inicial + suscripción a broadcasts de backup
  useEffect(() => {
    checkBackup();

    if (!currentUserId) return;

    // Inicializar listener de broadcast (idempotente)
    backupService.initBackupListener(currentUserId);

    // Re-verificar cuando se recibe un broadcast de cambio de backup
    const unsubscribe = backupService.onBackupChange(() => {
      checkBackup();
    });

    return unsubscribe;
  }, [currentUserId, prospectoEjecutivoId, checkBackup]);

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
