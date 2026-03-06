/**
 * Rating de estrellas para grupos de plantillas.
 * Calcula un promedio entre la salud del grupo y la tasa de respuesta.
 * Salud: healthy=5, mixed=3.5, degraded=2, blocked=0.5, disabled=0
 * Reply rate: 0-100% mapeado a 0-5
 */

import React from 'react';
import { Star } from 'lucide-react';
import type { TemplateGroupStatus } from '../../types/whatsappTemplates';

const HEALTH_SCORE: Record<TemplateGroupStatus, number> = {
  healthy: 5,
  mixed: 3.5,
  degraded: 2,
  blocked: 0.5,
  disabled: 0,
};

/** Calcula rating 0-5 como promedio de salud y reply rate */
export function calcGroupRating(
  groupStatus: TemplateGroupStatus,
  avgReplyRate24h: string | null
): number {
  const healthScore = HEALTH_SCORE[groupStatus] ?? 0;
  const replyRate = avgReplyRate24h ? parseFloat(avgReplyRate24h) : 0;
  const replyScore = Math.min(replyRate / 20, 5); // 0-100% → 0-5
  return (healthScore + replyScore) / 2;
}

interface GroupStarRatingProps {
  status: TemplateGroupStatus;
  replyRate: string | null;
  size?: 'sm' | 'md';
  showValue?: boolean;
}

export const GroupStarRating: React.FC<GroupStarRatingProps> = ({
  status,
  replyRate,
  size = 'sm',
  showValue = false,
}) => {
  const rating = calcGroupRating(status, replyRate);
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const isFull = i <= fullStars;
        const isHalf = !isFull && i === fullStars + 1 && hasHalf;

        if (isFull) {
          return (
            <Star
              key={i}
              className={`${iconSize} text-amber-400 fill-amber-400`}
            />
          );
        }
        if (isHalf) {
          return (
            <span key={i} className={`relative ${iconSize}`}>
              <Star className={`${iconSize} text-gray-300 dark:text-gray-600 absolute inset-0`} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <Star className={`${iconSize} text-amber-400 fill-amber-400`} />
              </span>
            </span>
          );
        }
        return (
          <Star
            key={i}
            className={`${iconSize} text-gray-300 dark:text-gray-600`}
          />
        );
      })}
      {showValue && (
        <span className={`ml-0.5 font-medium text-gray-500 dark:text-gray-400 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
};
