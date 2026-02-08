/**
 * Componente compartido para mostrar llamadas programadas
 * Reutilizable en todos los sidebars de prospecto
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, FileText, Plus } from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { ScheduleCallModal } from '../chat/ScheduleCallModal';
import { canScheduleCall, getRestrictionMessage } from '../../utils/prospectRestrictions';

interface ScheduledCall {
  id: string;
  prospecto: string; // La columna se llama 'prospecto', no 'prospecto_id'
  fecha_programada: string;
  motivo: string;
  estatus?: string; // 'ejecutada', 'programada', 'no contesto'
  created_at?: string;
  updated_at?: string;
}

interface ScheduledCallsSectionProps {
  prospectoId: string;
  prospectoNombre?: string;
  delay?: number;
  // ✅ AGREGADO: Datos de etapa para restricciones
  etapaId?: string | null;
  etapaLegacy?: string | null;
  userRole?: string | null; // ✅ AGREGADO: Rol del usuario para verificar restricciones
}

export const ScheduledCallsSection: React.FC<ScheduledCallsSectionProps> = ({
  prospectoId,
  prospectoNombre,
  delay = 0.55,
  etapaId,
  etapaLegacy,
  userRole
}) => {
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [loadingScheduledCalls, setLoadingScheduledCalls] = useState(true);
  const [scheduleCallModalOpen, setScheduleCallModalOpen] = useState(false);
  
  // ✅ RESTRICCIÓN TEMPORAL: Verificar si se puede programar llamadas (excepto admins)
  // Manejo defensivo: si userRole es undefined, se aplicarán restricciones normalmente
  const canSchedule = canScheduleCall(etapaId ?? null, etapaLegacy ?? null, userRole ?? null);

  useEffect(() => {
    if (prospectoId) {
      loadScheduledCalls();
    }
  }, [prospectoId]);

  const loadScheduledCalls = async () => {
    setLoadingScheduledCalls(true);
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await analysisSupabase
        .from('llamadas_programadas')
        .select('*')
        .eq('prospecto', prospectoId) // La columna se llama 'prospecto', no 'prospecto_id'
        .eq('estatus', 'programada') // Solo llamadas con estatus 'programada'
        .gte('fecha_programada', now) // Solo llamadas con fecha >= ahora (pendientes)
        .order('fecha_programada', { ascending: true });

      if (error) {
        console.error('Error cargando llamadas programadas:', error);
        throw error;
      }
      
      setScheduledCalls(data || []);
    } catch (error) {
      console.error('Error cargando llamadas programadas:', error);
    } finally {
      setLoadingScheduledCalls(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay, ease: "easeOut" }}
        className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 space-y-3 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
            Llamadas Programadas ({scheduledCalls.length})
          </h3>
          {canSchedule ? (
            <button
              onClick={() => setScheduleCallModalOpen(true)}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Programar nueva llamada"
            >
              <Plus size={16} />
            </button>
          ) : (
            <div className="relative group">
              <button
                disabled
                className="p-1.5 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                title={getRestrictionMessage('schedule')}
              >
                <Plus size={16} />
              </button>
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs">
                {getRestrictionMessage('schedule')}
              </div>
            </div>
          )}
        </div>
        {loadingScheduledCalls ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cargando llamadas programadas...</p>
          </div>
        ) : scheduledCalls.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scheduledCalls.map((scheduledCall) => {
              const fechaProgramada = new Date(scheduledCall.fecha_programada);
              
              return (
                <div
                  key={scheduledCall.id}
                  className="bg-white dark:bg-gray-700 rounded-lg p-3 space-y-2 border border-blue-200 dark:border-blue-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        Pendiente
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {fechaProgramada.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Mexico_City'
                      })}
                    </div>
                  </div>
                  
                  {scheduledCall.motivo && (
                    <div className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {scheduledCall.motivo.length > 100 
                        ? `${scheduledCall.motivo.substring(0, 100)}...` 
                        : scheduledCall.motivo}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No hay llamadas programadas
            </p>
          </div>
        )}
      </motion.div>

      {/* Modal de Programar Llamada */}
      <ScheduleCallModal
        isOpen={scheduleCallModalOpen}
        onClose={() => setScheduleCallModalOpen(false)}
        prospectoId={prospectoId}
        prospectoNombre={prospectoNombre}
        onScheduleSuccess={() => {
          loadScheduledCalls();
        }}
      />
    </>
  );
};

