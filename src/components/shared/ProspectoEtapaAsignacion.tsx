/**
 * ProspectoEtapaAsignacion - Componente centralizado para mostrar Etapa y Asignación
 * 
 * IMPORTANTE: Este componente es la fuente única de verdad para la visualización
 * de la etapa actual y asignación del prospecto en TODOS los sidebars.
 * 
 * Sidebars que lo usan:
 * - ProspectosManager.tsx (Módulo Prospectos)
 * - ProspectoSidebar.tsx (Módulo Llamadas Programadas)
 * - AnalysisIAComplete.tsx (Módulo Llamadas IA)
 * - LiveMonitor.tsx (Módulo Live Monitor)
 * - ProspectDetailSidebar.tsx (Módulo WhatsApp)
 * - ConversacionesWidget.tsx (Dashboard - Inicio)
 * - ProspectosNuevosWidget.tsx (Dashboard - Inicio)
 * 
 * MODIFICACIONES: Si necesitas cambiar cómo se muestra la etapa/asignación,
 * SOLO modifica este archivo para que se refleje en todos los módulos.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Users, User, AlertTriangle } from 'lucide-react';
import { EtapaBadge } from './EtapaBadge';

export interface ProspectoAsignacionData {
  etapa?: string | null;
  etapa_id?: string | null; // ✅ AGREGADO para migración FK
  score?: string | null;
  coordinacion_codigo?: string | null;
  coordinacion_nombre?: string | null;
  ejecutivo_nombre?: string | null;
  asesor_asignado?: string | null;
  ejecutivo_email?: string | null;
  requiere_atencion_humana?: boolean;
  motivo_handoff?: string | null;
}

export interface ProspectoEtapaAsignacionProps {
  prospecto: ProspectoAsignacionData;
  /** Si true, muestra el bloque de alerta cuando requiere_atencion_humana */
  showAlertBlock?: boolean;
  /** Animación delay de framer-motion (default: 0.2) */
  animationDelay?: number;
  /** Variante de estilo: 'card' (con fondo y borde) o 'inline' (solo badges) */
  variant?: 'card' | 'inline';
  /** Tamaño compacto para espacios reducidos */
  compact?: boolean;
  /** Mostrar el score */
  showScore?: boolean;
}

/**
 * Formatea el nombre del ejecutivo para mostrar solo primer nombre y primer apellido
 */
const formatEjecutivoNombre = (nombre: string | null | undefined): string => {
  if (!nombre) return '';
  const partes = nombre.trim().split(/\s+/);
  const primerNombre = partes[0] || '';
  const primerApellido = partes[1] || '';
  return primerApellido ? `${primerNombre} ${primerApellido}` : primerNombre;
};

export const ProspectoEtapaAsignacion: React.FC<ProspectoEtapaAsignacionProps> = ({
  prospecto,
  showAlertBlock = true,
  animationDelay = 0.2,
  variant = 'card',
  compact = false,
  showScore = true
}) => {
  const hasAsignacion = prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre || prospecto.asesor_asignado;
  const ejecutivoDisplay = formatEjecutivoNombre(prospecto.ejecutivo_nombre || prospecto.asesor_asignado);

  if (variant === 'inline') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: animationDelay, ease: "easeOut" }}
        className="flex items-center gap-3 flex-wrap"
      >
        {/* Etapa con Badge Dinámico */}
        <EtapaBadge 
          prospecto={{ 
            etapa_id: prospecto.etapa_id, 
            etapa: prospecto.etapa 
          }} 
          size="sm" 
          variant="solid"
        />
        
        {/* Score (opcional) */}
        {showScore && prospecto.score && (
          <div className="flex items-center gap-1.5">
            <Star className="text-yellow-500 dark:text-yellow-400" size={14} />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {prospecto.score}
            </span>
          </div>
        )}

        {/* Separador */}
        {hasAsignacion && (
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
        )}

        {/* Coordinación */}
        {prospecto.coordinacion_codigo && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            <Users size={12} />
            {prospecto.coordinacion_codigo}
          </div>
        )}

        {/* Ejecutivo */}
        {ejecutivoDisplay && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <User size={12} />
            {ejecutivoDisplay}
          </div>
        )}

        {/* Alerta */}
        {prospecto.requiere_atencion_humana && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="text-orange-600 dark:text-orange-400" size={14} />
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Requiere atención
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  // Variant: 'card' (default)
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: animationDelay, ease: "easeOut" }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Etapa Actual con Badge Dinámico */}
          <div className={`flex-1 ${compact ? 'min-w-[100px]' : 'min-w-[120px]'}`}>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Etapa Actual</p>
            <EtapaBadge 
              prospecto={{ 
                etapa_id: prospecto.etapa_id, 
                etapa: prospecto.etapa 
              }} 
              size={compact ? "sm" : "md"} 
              variant="solid"
              showIcon={!compact}
            />
          </div>

          {/* Separador visual */}
          {hasAsignacion && (
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
          )}

          {/* Asignación */}
          {hasAsignacion && (
            <div className={`flex-1 ${compact ? 'min-w-[120px]' : 'min-w-[140px]'}`}>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Asignación</p>
              <div className="flex items-center gap-2 flex-wrap">
                {prospecto.coordinacion_codigo && (
                  <span className={`inline-flex items-center gap-1.5 ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300`}>
                    <Users size={compact ? 10 : 12} />
                    {prospecto.coordinacion_codigo}
                  </span>
                )}
                {ejecutivoDisplay && (
                  <span className={`inline-flex items-center gap-1.5 ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>
                    <User size={compact ? 10 : 12} />
                    {ejecutivoDisplay}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Score */}
          {showScore && prospecto.score && (
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
              <Star className="text-yellow-500 dark:text-yellow-400" size={16} />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {prospecto.score}
              </span>
            </div>
          )}
        </div>

        {/* Bloque de alerta si requiere atención humana */}
        {showAlertBlock && prospecto.requiere_atencion_humana && (
          <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-3 rounded-lg border border-orange-200 dark:border-orange-800 w-full">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={16} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300 block mb-1">
                  Requiere atención
                </span>
                {prospecto.motivo_handoff && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 leading-relaxed break-words">
                    {prospecto.motivo_handoff}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProspectoEtapaAsignacion;

