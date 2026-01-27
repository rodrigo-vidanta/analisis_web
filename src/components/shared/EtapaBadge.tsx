/**
 * ============================================
 * ETAPA BADGE - Componente para mostrar etapa
 * ============================================
 * 
 * Migración: etapa (string) → etapa_id (FK)
 * Fecha: 26 de Enero 2026
 * 
 * CARACTERÍSTICAS:
 * - Colores dinámicos desde BD (etapa.color_ui)
 * - Iconos dinámicos desde BD (etapa.icono)
 * - Compatibilidad con campo legacy (etapa string)
 * - Fallback a service si no hay JOIN
 */

import React from 'react';
import { etapasService } from '../../services/etapasService';
import { 
  CloudDownload, UserPlus, Search, ClipboardList, 
  Flame, Phone, UserCheck, CheckCircle, 
  BadgeCheck, UserX, HelpCircle 
} from 'lucide-react';

// Mapeo de iconos de string a componentes Lucide
const ICON_MAP: Record<string, React.ElementType> = {
  'cloud-download': CloudDownload,
  'user-plus': UserPlus,
  'search': Search,
  'clipboard-list': ClipboardList,
  'flame': Flame,
  'phone': Phone,
  'user-check': UserCheck,
  'check-circle': CheckCircle,
  'badge-check': BadgeCheck,
  'user-x': UserX,
  'help-circle': HelpCircle,
};

export interface EtapaBadgeProps {
  /** Prospecto con etapa_id (nuevo) o etapa (legacy) */
  prospecto: {
    etapa_id?: string | null;
    etapa?: string | null;
    etapa_info?: {
      id: string;
      codigo: string;
      nombre: string;
      color_ui: string;
      icono: string;
    } | null;
  };
  /** Mostrar icono */
  showIcon?: boolean;
  /** Tamaño del badge */
  size?: 'sm' | 'md' | 'lg';
  /** Variante de estilo */
  variant?: 'solid' | 'outline' | 'ghost';
}

export const EtapaBadge: React.FC<EtapaBadgeProps> = React.memo(({
  prospecto,
  showIcon = true,
  size = 'md',
  variant = 'solid',
}) => {
  // 0. Si el servicio aún no ha cargado, mostrar el valor legacy tal cual (SIN causar re-render)
  const [isLoaded, setIsLoaded] = React.useState(etapasService.isLoaded());
  
  React.useEffect(() => {
    // Si ya está cargado, no hacer nada
    if (isLoaded) return;
    
    // Verificar periódicamente si el servicio ya cargó
    const checkInterval = setInterval(() => {
      if (etapasService.isLoaded()) {
        setIsLoaded(true);
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Timeout de seguridad (5 segundos máximo)
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      setIsLoaded(true); // Forzar loaded después de 5s
    }, 5000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [isLoaded]);
  
  if (!isLoaded) {
    // Mostrar el valor de etapa string tal como está (fallback SIN causar re-renders)
    const etapaDisplay = prospecto.etapa || 'Cargando...';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400`}>
        {etapaDisplay}
      </span>
    );
  }

  // 1. Intentar obtener etapa desde JOIN (etapa_info)
  let etapa = prospecto.etapa_info;

  // 2. Si no hay JOIN, buscar por etapa_id
  if (!etapa && prospecto.etapa_id) {
    etapa = etapasService.getById(prospecto.etapa_id);
  }

  // 3. Fallback: buscar por nombre legacy (string)
  if (!etapa && prospecto.etapa) {
    etapa = etapasService.getByNombreLegacy(prospecto.etapa);
  }

  // 4. Si no se encontró nada, mostrar placeholder
  if (!etapa) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400`}>
        <HelpCircle size={12} />
        Sin etapa
      </span>
    );
  }

  // Obtener componente de icono
  const IconComponent = ICON_MAP[etapa.icono] || HelpCircle;

  // Estilos según tamaño
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  // Estilos según variante
  const getVariantStyles = () => {
    const baseColor = etapa!.color_ui;
    
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: `${baseColor}20`, // 20% opacity
          color: baseColor,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: baseColor,
          borderColor: baseColor,
          borderWidth: '1px',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: baseColor,
        };
    }
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} rounded-full font-medium`}
      style={getVariantStyles()}
    >
      {showIcon && <IconComponent size={iconSizes[size]} />}
      {etapa.nombre}
    </span>
  );
}, (prevProps, nextProps) => {
  // Custom comparison para evitar re-renders innecesarios
  return (
    prevProps.prospecto.etapa_id === nextProps.prospecto.etapa_id &&
    prevProps.prospecto.etapa === nextProps.prospecto.etapa &&
    prevProps.showIcon === nextProps.showIcon &&
    prevProps.size === nextProps.size &&
    prevProps.variant === nextProps.variant
  );
});
