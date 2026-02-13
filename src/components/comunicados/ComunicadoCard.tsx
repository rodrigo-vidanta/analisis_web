/**
 * ============================================
 * COMUNICADO CARD - Presentacional
 * ============================================
 *
 * Renderiza un comunicado simple (no interactivo).
 * Soporta body text, bullets, iconos y badges de tipo.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Info,
  Sparkles,
  GraduationCap,
  Wrench,
  AlertTriangle,
  Bell,
  Shield,
  Zap,
  Star,
  Heart,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Settings,
  Globe,
  Megaphone,
  TrendingUp,
} from 'lucide-react';
import type { Comunicado } from '../../types/comunicados';
import { COMUNICADO_TIPO_COLORS } from '../../types/comunicados';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Info,
  Sparkles,
  GraduationCap,
  Wrench,
  AlertTriangle,
  Bell,
  Shield,
  Zap,
  Star,
  Heart,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Settings,
  Globe,
  Megaphone,
  TrendingUp,
};

const DEFAULT_ICONS: Record<string, string> = {
  info: 'Info',
  feature: 'Sparkles',
  tutorial: 'GraduationCap',
  mantenimiento: 'Wrench',
  urgente: 'AlertTriangle',
};

interface ComunicadoCardProps {
  comunicado: Comunicado;
}

const ComunicadoCard: React.FC<ComunicadoCardProps> = ({ comunicado }) => {
  const colors = COMUNICADO_TIPO_COLORS[comunicado.tipo];
  const iconName = comunicado.contenido?.icon || DEFAULT_ICONS[comunicado.tipo] || 'Info';
  const IconComponent = ICON_MAP[iconName] || Info;

  const renderBody = (text: string) => {
    // Split by newlines and render with basic formatting
    return text.split('\n').map((line, i) => {
      // Bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className={`text-sm text-gray-300 ${i > 0 ? 'mt-2' : ''}`}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <span key={j} className="font-semibold text-white">
                  {part.slice(2, -2)}
                </span>
              );
            }
            // Links: [text](url)
            const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
            return linkParts.map((lp, k) => {
              const linkMatch = lp.match(/\[([^\]]+)\]\(([^)]+)\)/);
              if (linkMatch) {
                return (
                  <a
                    key={k}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {linkMatch[1]}
                  </a>
                );
              }
              return <React.Fragment key={k}>{lp}</React.Fragment>;
            });
          })}
        </p>
      );
    });
  };

  return (
    <div className="space-y-5">
      {/* Icon + Badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
          <IconComponent className={`w-6 h-6 ${colors.text}`} />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
          {comunicado.tipo.charAt(0).toUpperCase() + comunicado.tipo.slice(1)}
        </span>
      </motion.div>

      {/* Titulo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-white">{comunicado.titulo}</h2>
        {comunicado.subtitulo && (
          <p className="text-sm text-gray-400 mt-1">{comunicado.subtitulo}</p>
        )}
      </motion.div>

      {/* Body */}
      {comunicado.contenido?.body && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {renderBody(comunicado.contenido.body)}
        </motion.div>
      )}

      {/* Bullets */}
      {comunicado.contenido?.bullets && comunicado.contenido.bullets.length > 0 && (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          {comunicado.contenido.bullets.map((bullet, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-start gap-2 text-sm text-gray-300"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')} mt-2 flex-shrink-0`} />
              <span>{bullet}</span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
};

export default ComunicadoCard;
