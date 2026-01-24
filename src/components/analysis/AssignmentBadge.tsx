/**
 * Componente para mostrar información de asignación (coordinación/ejecutivo)
 * según el rol del usuario
 */

import React from 'react';
import { Users, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { getCoordinacionColor } from '../../utils/coordinacionColors';
import type { LiveCallData } from '../../services/liveMonitorService';

interface AssignmentBadgeProps {
  call: LiveCallData;
  variant?: 'badge' | 'inline' | 'compact' | 'header';
  className?: string;
}

export const AssignmentBadge: React.FC<AssignmentBadgeProps> = ({ 
  call, 
  variant = 'badge',
  className = '' 
}) => {
  const { user } = useAuth();
  const { isAdmin, isAdminOperativo, isCoordinador, isSupervisor, isEjecutivo } = useEffectivePermissions();

  // Determinar qué mostrar según el rol
  // Administrador: ve ambas (coordinación y ejecutivo)
  // Administrador Operativo: ve ambas (coordinación y ejecutivo)
  // Coordinador: ve AMBAS (coordinación y ejecutivo) - especialmente CALIDAD que ve todas las coordinaciones
  // Supervisor: ve AMBAS (coordinación y ejecutivo) - necesita supervisar a su equipo
  // Ejecutivo: ve solo coordinación
  const showCoordinacion = isAdmin || isAdminOperativo || isEjecutivo || isCoordinador || isSupervisor;
  const showEjecutivo = isAdmin || isAdminOperativo || isCoordinador || isSupervisor;

  // Si no hay información de asignación, no mostrar nada
  if (!showCoordinacion && !showEjecutivo) {
    return null;
  }

  // Variante header (solo para ejecutivos, muestra coordinación junto al avatar)
  if (variant === 'header' && isEjecutivo) {
    if (!call.coordinacion_codigo) return null;
    
    const colors = getCoordinacionColor(call.coordinacion_codigo);
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${colors.bg} ${colors.border} border ${className}`}>
        <Users className={`w-3 h-3 mr-1.5 ${colors.text}`} />
        <span className={`text-xs font-medium ${colors.text}`}>
          {call.coordinacion_codigo}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    // Si no hay nada que mostrar según el rol, retornar null
    const hasCoordinacion = showCoordinacion && call.coordinacion_codigo;
    const hasEjecutivo = showEjecutivo && call.ejecutivo_nombre;
    
    if (!hasCoordinacion && !hasEjecutivo) {
      return null;
    }
    
    return (
      <div className={`flex items-center gap-1 flex-wrap text-xs ${className}`}>
        {hasCoordinacion && (
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${getCoordinacionColor(call.coordinacion_codigo).bg} ${getCoordinacionColor(call.coordinacion_codigo).text}`}>
            <Users className="w-3 h-3 mr-1" />
            {call.coordinacion_codigo}
          </div>
        )}
        {hasEjecutivo && (
          <div className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <User className="w-3 h-3 mr-1" />
            {call.ejecutivo_nombre.split(' ')[0]}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`space-y-2 ${className}`}>
        {showCoordinacion && call.coordinacion_codigo && (
          <div className="flex items-center text-sm">
            <Users className={`w-4 h-4 mr-2 ${getCoordinacionColor(call.coordinacion_codigo).text}`} />
            <span className="font-medium text-gray-700 dark:text-gray-300">Coordinación:</span>
            <span className={`ml-2 ${getCoordinacionColor(call.coordinacion_codigo).text} font-medium`}>
              {call.coordinacion_nombre || call.coordinacion_codigo}
            </span>
          </div>
        )}
        {showEjecutivo && call.ejecutivo_nombre && (
          <div className="flex items-center text-sm">
            <User className="w-4 h-4 mr-2 text-blue-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Ejecutivo:</span>
            <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
              {call.ejecutivo_nombre}
            </span>
          </div>
        )}
        {!call.coordinacion_codigo && !call.ejecutivo_nombre && (
          <span className="text-gray-400 dark:text-gray-500 text-xs italic">
            Sin asignar
          </span>
        )}
      </div>
    );
  }

  // Variant 'badge' (default)
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showCoordinacion && call.coordinacion_codigo && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${getCoordinacionColor(call.coordinacion_codigo).bg} ${getCoordinacionColor(call.coordinacion_codigo).border} border`}>
          <Users className={`w-3.5 h-3.5 ${getCoordinacionColor(call.coordinacion_codigo).text}`} />
          <span className={`text-xs font-semibold ${getCoordinacionColor(call.coordinacion_codigo).text}`}>
            {call.coordinacion_codigo}
          </span>
          {call.coordinacion_nombre && (
            <span className={`text-xs ${getCoordinacionColor(call.coordinacion_codigo).text} opacity-75`}>
              {call.coordinacion_nombre}
            </span>
          )}
        </div>
      )}
      {showEjecutivo && call.ejecutivo_nombre && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            {call.ejecutivo_nombre}
          </span>
        </div>
      )}
      {!call.coordinacion_codigo && !call.ejecutivo_nombre && (
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
          Sin asignar
        </span>
      )}
    </div>
  );
};

