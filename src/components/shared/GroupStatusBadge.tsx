/**
 * Badge reutilizable para status de grupo de plantillas.
 * Muestra icono + label con colores segun GROUP_STATUS_CONFIG.
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, Ban, Power } from 'lucide-react';
import { GROUP_STATUS_CONFIG, type TemplateGroupStatus } from '../../types/whatsappTemplates';

const ICON_MAP = {
  CheckCircle2,
  AlertTriangle,
  Ban,
  Power,
} as const;

interface GroupStatusBadgeProps {
  status: TemplateGroupStatus;
  size?: 'sm' | 'md';
}

export const GroupStatusBadge: React.FC<GroupStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const config = GROUP_STATUS_CONFIG[status];
  if (!config) return null;

  const IconComponent = ICON_MAP[config.icon];
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.bgColor} ${config.color} ${config.borderColor} ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <IconComponent className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
};
