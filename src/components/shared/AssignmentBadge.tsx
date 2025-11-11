/**
 * Componente para mostrar información de asignación (coordinación/ejecutivo)
 * según el rol del usuario
 */

import React from 'react';
import { Users, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCoordinacionColor } from '../../utils/coordinacionColors';

interface AssignmentBadgeProps {
  coordinacionCodigo?: string | null;
  coordinacionNombre?: string | null;
  ejecutivoNombre?: string | null;
  ejecutivoEmail?: string | null;
  variant?: 'badge' | 'inline' | 'compact' | 'header';
}

export const AssignmentBadge: React.FC<AssignmentBadgeProps> = ({
  coordinacionCodigo,
  coordinacionNombre,
  ejecutivoNombre,
  ejecutivoEmail,
  variant = 'badge'
}) => {
  const { user } = useAuth();

  const isAdmin = user?.role_name === 'admin';
  const isCoordinador = user?.role_name === 'coordinador';
  const isEjecutivo = user?.role_name === 'ejecutivo';

  // Determinar qué mostrar según el rol
  const showCoordinacion = isAdmin || isEjecutivo;
  const showEjecutivo = isAdmin || isCoordinador;

  // Si no hay nada que mostrar, retornar null
  if (!showCoordinacion && !showEjecutivo) {
    return null;
  }

  if ((showCoordinacion && !coordinacionCodigo) && (showEjecutivo && !ejecutivoNombre)) {
    return null;
  }

  // Variante header (solo para ejecutivos, muestra coordinación junto al avatar)
  if (variant === 'header' && isEjecutivo) {
    if (!coordinacionCodigo) return null;
    
    const colors = getCoordinacionColor(coordinacionCodigo);
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${colors.bg} ${colors.border} border`}>
        <Users className={`w-3 h-3 mr-1.5 ${colors.text}`} />
        <span className={`text-xs font-medium ${colors.text}`}>
          {coordinacionCodigo}
        </span>
      </div>
    );
  }

  // Variante compact (para miniaturas)
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {showCoordinacion && coordinacionCodigo && (
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCoordinacionColor(coordinacionCodigo).bg} ${getCoordinacionColor(coordinacionCodigo).text}`}>
            <Users className="w-3 h-3 mr-1" />
            {coordinacionCodigo}
          </div>
        )}
        {showEjecutivo && ejecutivoNombre && (
          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <User className="w-3 h-3 mr-1" />
            {ejecutivoNombre.split(' ')[0]}
          </div>
        )}
      </div>
    );
  }

  // Variante inline (para modales)
  if (variant === 'inline') {
    return (
      <div className="space-y-2">
        {showCoordinacion && coordinacionCodigo && (
          <div className="flex items-center text-sm">
            <Users className={`w-4 h-4 mr-2 ${getCoordinacionColor(coordinacionCodigo).text}`} />
            <span className="font-medium text-gray-700 dark:text-gray-300">Coordinación:</span>
            <span className={`ml-2 ${getCoordinacionColor(coordinacionCodigo).text} font-medium`}>
              {coordinacionNombre || coordinacionCodigo}
            </span>
          </div>
        )}
        {showEjecutivo && ejecutivoNombre && (
          <div className="flex items-center text-sm">
            <User className="w-4 h-4 mr-2 text-blue-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Ejecutivo:</span>
            <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
              {ejecutivoNombre}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Variante badge (por defecto)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showCoordinacion && coordinacionCodigo && (
        <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getCoordinacionColor(coordinacionCodigo).bg} ${getCoordinacionColor(coordinacionCodigo).text} ${getCoordinacionColor(coordinacionCodigo).border} border`}>
          <Users className="w-3.5 h-3.5 mr-1.5" />
          {coordinacionNombre || coordinacionCodigo}
        </div>
      )}
      {showEjecutivo && ejecutivoNombre && (
        <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <User className="w-3.5 h-3.5 mr-1.5" />
          {ejecutivoNombre}
        </div>
      )}
    </div>
  );
};

