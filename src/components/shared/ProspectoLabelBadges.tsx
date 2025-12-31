/**
 * ============================================
 * BADGES DE ETIQUETAS - SOLO LECTURA
 * ============================================
 * 
 * Componente reutilizable para mostrar badges de etiquetas
 * en diferentes módulos (Widget, Kanban, DataGrid)
 * Sin funcionalidad de edición (solo visualización)
 */

import React from 'react';
import type { ConversationLabel } from '../../services/whatsappLabelsService';

interface ProspectoLabelBadgesProps {
  labels: ConversationLabel[];
  size?: 'sm' | 'md';
  showShadow?: boolean; // Si mostrar el blur de fondo
}

export const ProspectoLabelBadges: React.FC<ProspectoLabelBadgesProps> = ({
  labels,
  size = 'sm',
  showShadow = false,
}) => {
  if (!labels || labels.length === 0) return null;

  const shadowLabel = showShadow ? labels.find(l => l.shadow_cell) : null;

  return (
    <div className="relative">
      {/* Blur de fondo si hay shadow_cell */}
      {shadowLabel && (
        <div
          className="absolute inset-0 pointer-events-none -m-2 rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${shadowLabel.color}10 0%, ${shadowLabel.color}05 100%)`,
            backdropFilter: 'blur(1px)',
            WebkitBackdropFilter: 'blur(1px)',
          }}
        />
      )}
      
      {/* Badges */}
      <div className="relative z-10 flex items-center gap-1 flex-wrap">
        {labels.map(label => (
          <span
            key={label.id}
            className={`inline-flex items-center rounded-md font-medium border ${
              size === 'sm'
                ? 'px-1.5 py-0.5 text-[9px]'
                : 'px-2 py-0.5 text-[10px]'
            }`}
            style={{
              backgroundColor: `${label.color}15`,
              borderColor: `${label.color}40`,
              color: label.color,
            }}
            title={label.description || label.name}
          >
            <div
              className={`rounded-full mr-1 ${size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}
              style={{ backgroundColor: label.color }}
            />
            {label.name}
          </span>
        ))}
      </div>
    </div>
  );
};

