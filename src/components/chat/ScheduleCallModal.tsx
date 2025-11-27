/**
 * Modal para programar una nueva llamada
 * Ahora usa ManualCallModal con toda la funcionalidad mejorada
 */

import React from 'react';
import { ManualCallModal } from '../shared/ManualCallModal';

interface ScheduleCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  prospectoNombre?: string;
  onScheduleSuccess?: () => void;
}

export const ScheduleCallModal: React.FC<ScheduleCallModalProps> = ({
  isOpen,
  onClose,
  prospectoId,
  prospectoNombre,
  onScheduleSuccess
}) => {
  return (
    <ManualCallModal
      isOpen={isOpen}
      onClose={onClose}
      prospectoId={prospectoId}
      prospectoNombre={prospectoNombre}
      onSuccess={onScheduleSuccess}
    />
  );
};

