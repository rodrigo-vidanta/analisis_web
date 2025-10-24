/**
 * ============================================
 * COMPONENTE DATAGRID - MÓDULO LIVE MONITOR
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_LIVEMONITOR.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_LIVEMONITOR.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_LIVEMONITOR.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState } from 'react';
import { Check, Phone, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import type { LiveCallData } from '../../services/liveMonitorService';

interface KanbanCall extends LiveCallData {
  checkpoint_venta_actual?: string;
  composicion_familiar_numero?: number;
  destino_preferido?: string;
  preferencia_vacaciones?: string[];
  numero_noches?: number;
  mes_preferencia?: string;
  edad?: number;
  propuesta_economica_ofrecida?: number;
  habitacion_ofertada?: string;
  resort_ofertado?: string;
  principales_objeciones?: string;
  resumen_llamada?: string;
  conversacion_completa?: any;
}

interface DataGridProps {
  calls: KanbanCall[];
  title: string;
  onCallClick: (call: KanbanCall) => void;
  onFinalize: (call: KanbanCall) => void;
}

export const LiveMonitorDataGrid: React.FC<DataGridProps> = ({ calls, title, onCallClick, onFinalize }) => {
  const [hoveredCallId, setHoveredCallId] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCheckpointBadge = (checkpoint?: string) => {
    if (!checkpoint) return null;
    
    const checkpointNum = checkpoint.match(/\d+/)?.[0];
    const colors: Record<string, string> = {
      '1': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      '2': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      '3': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      '4': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      '5': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[checkpointNum || '1']}`}>
        {checkpoint}
      </span>
    );
  };

  const getStatusBadge = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    
    if (statusLower.includes('activa') || statusLower.includes('active')) {
      colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    } else if (statusLower.includes('transferida') || statusLower.includes('transferred')) {
      colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    } else if (statusLower.includes('perdida') || statusLower.includes('lost')) {
      colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {status || 'N/A'}
      </span>
    );
  };

  const getInterestBadge = (interest?: any) => {
    const interestStr = typeof interest === 'string' ? interest : interest?.nivel || 'Desconocido';
    const interestLower = interestStr.toLowerCase();
    
    let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    if (interestLower.includes('alto') || interestLower.includes('high')) {
      colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    } else if (interestLower.includes('medio') || interestLower.includes('medium')) {
      colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    } else if (interestLower.includes('bajo') || interestLower.includes('low')) {
      colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {interestStr}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg mb-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {title}
          <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full">
            {calls.length}
          </span>
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Checkpoint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Duración
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Interés
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
            {calls.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay llamadas en esta sección</p>
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr
                  key={call.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  onClick={() => onCallClick(call)}
                >
                  {/* Cliente con Avatar */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm transition-all"
                        onMouseEnter={() => setHoveredCallId(call.id)}
                        onMouseLeave={() => setHoveredCallId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFinalize(call);
                        }}
                      >
                        {hoveredCallId === call.id ? (
                          <Check className="w-6 h-6" />
                        ) : (
                          <span>
                            {(call.nombre_completo || call.nombre_whatsapp || 'N/A')
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                        </span>
                        {call.ciudad && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {call.ciudad}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Teléfono */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {call.whatsapp || 'N/A'}
                    </div>
                  </td>

                  {/* Checkpoint */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCheckpointBadge(call.checkpoint_venta_actual)}
                  </td>

                  {/* Duración */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDuration(call.duracion_segundos || 0)}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(call.call_status)}
                  </td>

                  {/* Interés */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getInterestBadge(call.nivel_interes)}
                  </td>

                  {/* Acción */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFinalize(call);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Finalizar llamada"
                    >
                      <Check className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

