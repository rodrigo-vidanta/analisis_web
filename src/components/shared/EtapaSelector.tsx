/**
 * ============================================
 * ETAPA SELECTOR - Dropdown para seleccionar etapas
 * ============================================
 * 
 * Migración: etapa (string) → etapa_id (FK)
 * Fecha: 26 de Enero 2026
 * 
 * CARACTERÍSTICAS:
 * - Lista ordenada desde BD (orden_funnel)
 * - Colores dinámicos por etapa
 * - Value es UUID (etapa_id)
 * - Opción "Todas las etapas" para filtros
 */

import React, { useEffect, useState } from 'react';
import { etapasService } from '../../services/etapasService';
import type { EtapaOption } from '../../types/etapas';

export interface EtapaSelectorProps {
  /** Valor actual (UUID de etapa_id) */
  value: string | null | undefined;
  /** Callback al cambiar */
  onChange: (etapaId: string | null) => void;
  /** Placeholder */
  placeholder?: string;
  /** Mostrar opción "Todas" */
  showAllOption?: boolean;
  /** Label para opción "Todas" */
  allOptionLabel?: string;
  /** Estilo personalizado */
  className?: string;
  /** Deshabilitado */
  disabled?: boolean;
  /** Tamaño */
  size?: 'sm' | 'md' | 'lg';
}

export const EtapaSelector: React.FC<EtapaSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Seleccionar etapa',
  showAllOption = true,
  allOptionLabel = 'Todas las etapas',
  className = '',
  disabled = false,
  size = 'md',
}) => {
  const [opciones, setOpciones] = useState<EtapaOption[]>([]);

  useEffect(() => {
    // Cargar opciones desde el servicio
    const loadOpciones = async () => {
      if (!etapasService.isLoaded()) {
        await etapasService.loadEtapas();
      }
      setOpciones(etapasService.getOptions());
    };

    loadOpciones();
  }, []);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        border border-gray-200 dark:border-gray-700 
        rounded-xl 
        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
        dark:bg-gray-800/50 dark:text-white 
        transition-all duration-200 
        hover:border-gray-300 dark:hover:border-gray-600
        disabled:opacity-50 disabled:cursor-not-allowed
        appearance-none 
        bg-white dark:bg-gray-800
        ${className}
      `}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
        paddingRight: '2.5rem',
      }}
    >
      {showAllOption && (
        <option value="">{allOptionLabel}</option>
      )}
      
      {opciones.map((opcion) => (
        <option key={opcion.value} value={opcion.value}>
          {opcion.label}
        </option>
      ))}
    </select>
  );
};
