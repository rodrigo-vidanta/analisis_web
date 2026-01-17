/**
 * ============================================
 * COMPONENTE LINEAR - MÓDULO LIVE MONITOR
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

import React, { useState, useEffect } from 'react';
import { liveMonitorService, type LiveCallData, type Agent, type FeedbackData } from '../../services/liveMonitorService';
import { classifyCallStatus, CALL_STATUS_CONFIG, type CallStatusGranular } from '../../services/callStatusClassifier';

// Definición de checkpoints con diseño Linear
const LINEAR_CHECKPOINTS = {
  'checkpoint #1': {
    title: 'Saludo',
    subtitle: 'Conexión inicial',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    )
  },
  'checkpoint #2': {
    title: 'Conexión',
    subtitle: 'Rapport emocional',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/10',
    border: 'border-purple-200 dark:border-purple-800',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  'checkpoint #3': {
    title: 'Paraíso',
    subtitle: 'Presentación destino',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  'checkpoint #4': {
    title: 'Urgencia',
    subtitle: 'Oportunidad limitada',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/10',
    border: 'border-orange-200 dark:border-orange-800',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  'checkpoint #5': {
    title: 'Cierre',
    subtitle: 'Presentación final',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    )
  }
} as const;

type CheckpointKey = keyof typeof LINEAR_CHECKPOINTS;

interface LinearKanbanCall extends LiveCallData {
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
}

const LinearLiveMonitor: React.FC = () => {
  const [activeCalls, setActiveCalls] = useState<LinearKanbanCall[]>([]);
  const [finishedCalls, setFinishedCalls] = useState<LinearKanbanCall[]>([]);
  const [failedCalls, setFailedCalls] = useState<LinearKanbanCall[]>([]);
  const [allCalls, setAllCalls] = useState<LinearKanbanCall[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'finished' | 'failed' | 'all'>('active');
  const [selectedCall, setSelectedCall] = useState<LinearKanbanCall | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para feedback y controles
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'contestada' | 'perdida' | 'transferida' | 'colgada' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [hangupLoading, setHangupLoading] = useState(false);

  // Mensajes predefinidos para transferencia
  const transferReasons = [
    "Mi supervisor puede ofrecerle un mejor precio exclusivo que tengo autorización limitada",
    "Mi supervisor maneja casos especiales como el suyo y quiere atenderle personalmente", 
    "Tengo un supervisor especializado en su destino que puede darle beneficios adicionales",
    "Mi supervisor tiene disponibilidad muy limitada solo para hoy y quiere hablar con usted",
    "Como mostró tanto interés, mi supervisor quiere ofrecerle algo especial que yo no puedo autorizar",
    "Mi supervisor estaba escuchando la llamada y quiere darle un beneficio exclusivo inmediatamente"
  ];

  // Función para transferir llamada
  const handleTransferCall = async (reason: string) => {
    if (!selectedCall?.call_id) return;
    setTransferLoading(true);
    
    try {
      const transferData = {
        action: "transfer",
        call_id: selectedCall.call_id,
        control_url: selectedCall.control_url,
        message: reason,
        destination: { number: "+523222264000", extension: "60973" }
      };

      const response = await fetch('https://primary-dev-d75a.up.railway.app/functions/v1/tools-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData)
      });

      if (response.ok) {
        setShowTransferModal(false);
        setFeedbackType('transferida');
        setShowFeedbackModal(true);
        await liveMonitorService.updateCallStatus(selectedCall.call_id, 'transferida');
        await loadCalls();
      }
    } catch (error) {
      console.error('Error en transferencia:', error);
    } finally {
      setTransferLoading(false);
    }
  };

  // Función para colgar llamada
  const handleHangupCall = async () => {
    if (!selectedCall?.call_id) return;
    setHangupLoading(true);
    
    try {
      const hangupData = {
        action: "hangup",
        call_id: selectedCall.call_id,
        control_url: selectedCall.control_url
      };

      const response = await fetch('https://primary-dev-d75a.up.railway.app/functions/v1/tools-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hangupData)
      });

      if (response.ok) {
        setFeedbackType('colgada');
        setShowFeedbackModal(true);
        await liveMonitorService.updateCallStatus(selectedCall.call_id, 'colgada');
        await loadCalls();
      }
    } catch (error) {
      console.error('Error al colgar:', error);
    } finally {
      setHangupLoading(false);
    }
  };

  // Cargar datos
  const loadCalls = async () => {
    try {
      const allCallsData = await liveMonitorService.getActiveCalls() as LinearKanbanCall[];
      
      const active: LinearKanbanCall[] = [];
      const finished: LinearKanbanCall[] = [];
      const failed: LinearKanbanCall[] = [];
      
      allCallsData.forEach(call => {
        const hasFeedback = call.tiene_feedback === true;
        
        // Usar clasificador centralizado
        const classifiedStatus = classifyCallStatus({
          call_id: call.call_id,
          call_status: call.call_status,
          fecha_llamada: call.fecha_llamada,
          duracion_segundos: call.duracion_segundos,
          audio_ruta_bucket: call.audio_ruta_bucket,
          monitor_url: call.monitor_url,
          datos_llamada: call.datos_llamada
        });
        
        // Actualizar el status en el objeto
        call.call_status = classifiedStatus;
        
        if (classifiedStatus === 'activa') {
          active.push(call);
        }
        else if (classifiedStatus === 'transferida' || classifiedStatus === 'atendida') {
          if (!hasFeedback) {
            finished.push(call);
          }
        }
        else if (classifiedStatus === 'perdida' || classifiedStatus === 'no_contestada' || classifiedStatus === 'buzon') {
          if (!hasFeedback) {
            failed.push(call);
          }
        }
      });

      const completedCalls = allCallsData.filter(call => {
        const hasFeedback = call.tiene_feedback === true;
        const isCompleted = ['transferida', 'atendida', 'no_contestada', 'buzon', 'perdida'].includes(call.call_status || '');
        return hasFeedback && isCompleted;
      });

      setActiveCalls(active);
      setFinishedCalls(finished);
      setFailedCalls(failed);
      setAllCalls(completedCalls);
      
    } catch (error) {
      console.error('Error cargando llamadas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
    const interval = setInterval(loadCalls, 3000);
    return () => clearInterval(interval);
  }, []);

  // Agrupar llamadas por checkpoint
  const groupCallsByCheckpoint = (calls: LinearKanbanCall[]) => {
    const groups: Record<CheckpointKey, LinearKanbanCall[]> = {
      'checkpoint #1': [],
      'checkpoint #2': [],
      'checkpoint #3': [],
      'checkpoint #4': [],
      'checkpoint #5': []
    };

    calls.forEach(call => {
      const checkpoint = (call.checkpoint_venta_actual || 'checkpoint #1') as CheckpointKey;
      if (groups[checkpoint]) {
        groups[checkpoint].push(call);
      } else {
        groups['checkpoint #1'].push(call);
      }
    });

    return groups;
  };

  // Renderizar card de llamada con diseño Linear
  const renderLinearCallCard = (call: LinearKanbanCall) => (
    <div
      key={call.call_id}
      onClick={() => setSelectedCall(call)}
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Header de la card */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-white">
              {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {call.whatsapp}
            </p>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
      </div>

      {/* Información clave */}
      <div className="space-y-2">
        {call.destino_preferido && (
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <svg className="w-3 h-3 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {call.destino_preferido.replace('_', ' ')}
          </div>
        )}
        
        {call.composicion_familiar_numero && (
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <svg className="w-3 h-3 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            {call.composicion_familiar_numero} personas
          </div>
        )}
        
        {(call.propuesta_economica_ofrecida || call.precio_ofertado) && (
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <svg className="w-3 h-3 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            ${(call.propuesta_economica_ofrecida || call.precio_ofertado)?.toLocaleString()}
          </div>
        )}
      </div>

      {/* Footer de la card */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {liveMonitorService.getTimeElapsed(call.updated_at)}
        </span>
        <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      </div>
    </div>
  );

  // Renderizar columna de checkpoint
  const renderCheckpointColumn = (checkpointKey: CheckpointKey, calls: LinearKanbanCall[]) => {
    const checkpoint = LINEAR_CHECKPOINTS[checkpointKey];
    
    return (
      <div key={checkpointKey} className="flex-1 min-w-0 h-full">
        {/* Header de columna sin bordes redondeados */}
        <div className={`${checkpoint.bg} border-b ${checkpoint.border} p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className={`${checkpoint.color}`}>
                  {checkpoint.icon}
                </div>
                <h3 className={`text-sm font-semibold ${checkpoint.color}`}>
                  {checkpoint.title}
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {checkpoint.subtitle}
              </p>
            </div>
            <div className={`w-6 h-6 ${checkpoint.bg} ${checkpoint.border} border rounded-full flex items-center justify-center`}>
              <span className={`text-xs font-bold ${checkpoint.color}`}>
                {calls.length}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de llamadas */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {calls.map(renderLinearCallCard)}
          
          {calls.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <div className={`w-12 h-12 ${checkpoint.bg} rounded-full flex items-center justify-center mx-auto mb-3 opacity-50`}>
                <div className={`${checkpoint.color} opacity-50`}>
                  {checkpoint.icon}
                </div>
              </div>
              <p className="text-xs">Sin llamadas</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando llamadas...</p>
        </div>
      </div>
    );
  }

  const groupedActiveCalls = groupCallsByCheckpoint(activeCalls);

  return (
    <div className="h-full flex flex-col">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Live Monitor
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gestión visual del proceso de ventas
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activeCalls.length} activas
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {finishedCalls.length} pendientes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'active', label: 'Activas', count: activeCalls.length, color: 'text-emerald-600' },
            { key: 'finished', label: 'Finalizadas', count: finishedCalls.length, color: 'text-blue-600' },
            { key: 'failed', label: 'Fallidas', count: failedCalls.length, color: 'text-red-600' },
            { key: 'all', label: 'Historial', count: allCalls.length, color: 'text-purple-600' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                selectedTab === tab.key
                  ? `${tab.color} border-current`
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{tab.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full ${
                  selectedTab === tab.key
                    ? 'bg-current text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedTab === 'active' && (
          <div className="flex gap-0 min-h-full animate-in fade-in duration-300 -mx-6">
            {Object.entries(groupedActiveCalls).map(([checkpointKey, calls], index) => (
              <div
                key={checkpointKey}
                className="flex-1 animate-in slide-in-from-bottom duration-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {renderCheckpointColumn(checkpointKey as CheckpointKey, calls)}
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'finished' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
            {finishedCalls.map((call, index) => (
              <div 
                key={call.call_id}
                onClick={() => setSelectedCall(call)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer animate-in slide-in-from-left duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Finalizada • {call.duracion_segundos ? `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')}` : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  {(() => {
                    const status = (call.call_status || 'perdida') as CallStatusGranular;
                    const config = CALL_STATUS_CONFIG[status] || CALL_STATUS_CONFIG.perdida;
                    return (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                        {config.label}
                      </span>
                    );
                  })()}
                  
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Requiere feedback
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'failed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {failedCalls.map(call => (
              <div 
                key={call.call_id}
                onClick={() => {
                  setSelectedCall(call);
                  setFeedbackType('perdida');
                  setShowFeedbackModal(true);
                }}
                className="bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      No contestó
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-red-600 dark:text-red-400">
                  Clic para marcar como perdida
                </p>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'all' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Checkpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duración</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Feedback</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {allCalls.map((call) => (
                  <tr 
                    key={call.call_id}
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {(call.nombre_completo || call.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {call.nombre_completo || call.nombre_whatsapp || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {call.whatsapp}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const status = (call.call_status || 'perdida') as CallStatusGranular;
                        const config = CALL_STATUS_CONFIG[status] || CALL_STATUS_CONFIG.perdida;
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {call.checkpoint_venta_actual || 'checkpoint #1'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {call.duracion_segundos ? `${Math.floor(call.duracion_segundos / 60)}:${(call.duracion_segundos % 60).toString().padStart(2, '0')}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${(call.propuesta_economica_ofrecida || call.precio_ofertado)?.toLocaleString() || 'Sin precio'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Completado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalles minimalista */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden modal-content">
            
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {(selectedCall.nombre_completo || selectedCall.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedCall.nombre_completo || selectedCall.nombre_whatsapp || 'Sin nombre'}
                    </h2>
                    <p className={`text-sm font-medium ${
                      selectedCall.call_status === 'activa' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {selectedCall.call_status === 'activa' ? 'Llamada Activa' : 'Llamada Finalizada'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Información Personal */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Información Personal
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'Teléfono', value: selectedCall.whatsapp },
                      { label: 'Email', value: selectedCall.email || 'N/A' },
                      { label: 'Ciudad', value: selectedCall.ciudad_residencia || 'N/A' },
                      { label: 'Estado Civil', value: selectedCall.estado_civil || 'N/A' }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}:</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-white text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Información de Viaje */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                    <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Viaje
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'Checkpoint', value: selectedCall.checkpoint_venta_actual || 'checkpoint #1' },
                      { label: 'Grupo', value: selectedCall.composicion_familiar_numero ? `${selectedCall.composicion_familiar_numero} personas` : 'N/A' },
                      { label: 'Destino', value: selectedCall.destino_preferido?.replace('_', ' ') || 'N/A' },
                      { label: 'Noches', value: selectedCall.numero_noches || 'N/A' }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}:</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-white text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detalles de Llamada */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                    <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Llamada
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'Duración', value: selectedCall.duracion_segundos ? `${Math.floor(selectedCall.duracion_segundos / 60)}:${(selectedCall.duracion_segundos % 60).toString().padStart(2, '0')}` : 'En curso' },
                      { label: 'Interés', value: selectedCall.nivel_interes || 'En evaluación' },
                      { label: 'Precio', value: (selectedCall.propuesta_economica_ofrecida || selectedCall.precio_ofertado) ? `$${(selectedCall.propuesta_economica_ofrecida || selectedCall.precio_ofertado)?.toLocaleString()}` : 'Sin oferta' },
                      { label: 'Costo', value: selectedCall.costo_total ? `$${selectedCall.costo_total}` : 'N/A' }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}:</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-white text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Controles para llamadas activas */}
                  {selectedCall.call_status === 'activa' && (
                    <div className="pt-4 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Controles:</h4>
                      
                      <button
                        disabled
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs font-medium py-2 px-3 rounded-lg opacity-50"
                      >
                        🎧 Escuchar (En desarrollo)
                      </button>
                      
                      <button
                        onClick={() => setShowTransferModal(true)}
                        disabled={transferLoading}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-150"
                      >
                        {transferLoading ? 'Transfiriendo...' : '📞 Solicitar Transferencia'}
                      </button>
                      
                      <button
                        onClick={handleHangupCall}
                        disabled={hangupLoading}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-150"
                      >
                        {hangupLoading ? 'Colgando...' : '📞 Colgar Llamada'}
                      </button>
                    </div>
                  )}

                  {/* Botones de feedback */}
                  {!selectedCall.tiene_feedback && (
                    <div className="pt-4 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Resultado:</h4>
                      <button
                        onClick={() => {
                          setFeedbackType('contestada');
                          setShowFeedbackModal(true);
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-150"
                      >
                        ✅ Marcar como Contestada
                      </button>
                      <button
                        onClick={() => {
                          setFeedbackType('perdida');
                          setShowFeedbackModal(true);
                        }}
                        className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-150"
                      >
                        ❌ Marcar como Perdida
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen */}
              {(() => {
                let resumen = selectedCall.resumen_llamada;
                
                if (selectedCall.datos_llamada) {
                  try {
                    const datosLlamada = typeof selectedCall.datos_llamada === 'string' 
                      ? JSON.parse(selectedCall.datos_llamada) 
                      : selectedCall.datos_llamada;
                    
                    if (datosLlamada.resumen) {
                      resumen = datosLlamada.resumen;
                    }
                  } catch (e) {
                    // Ignorar errores de parsing
                  }
                }
                
                if (!resumen && selectedCall.call_status === 'activa') {
                  resumen = 'Llamada en progreso - el resumen se actualiza en tiempo real';
                }
                
                return resumen ? (
                  <div className="mt-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Resumen de la Llamada
                      {selectedCall.call_status === 'activa' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                          En vivo
                        </span>
                      )}
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {resumen}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de transferencia */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-60 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full modal-content">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Solicitar Transferencia
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selecciona el motivo de la transferencia:
              </p>
              
              <div className="space-y-2 mb-6">
                {transferReasons.map((reason, index) => (
                  <button
                    key={index}
                    onClick={() => handleTransferCall(reason)}
                    disabled={transferLoading}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-xs text-gray-900 dark:text-white transition-colors disabled:opacity-50"
                  >
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">Opción {index + 1}:</span>
                    <br />
                    {reason}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowTransferModal(false)}
                disabled={transferLoading}
                className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de feedback */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-60 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full modal-content">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Feedback Obligatorio - {
                  feedbackType === 'contestada' ? 'Llamada Contestada' :
                  feedbackType === 'perdida' ? 'Llamada Perdida' :
                  feedbackType === 'transferida' ? 'Llamada Transferida' :
                  feedbackType === 'colgada' ? 'Llamada Finalizada' : 'Feedback'
                }
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comentarios sobre la llamada: *
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  placeholder={
                    feedbackType === 'transferida' ? 'Explica por qué se transfirió la llamada...' :
                    feedbackType === 'colgada' ? 'Explica por qué se finalizó la llamada...' :
                    'Describe qué pasó en la llamada...'
                  }
                  autoFocus
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackType(null);
                    setFeedbackComment('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!feedbackComment.trim()) {
                      alert('Por favor, proporciona un comentario');
                      return;
                    }
                    // Aquí iría la lógica de guardar feedback
                    setShowFeedbackModal(false);
                    setSelectedCall(null);
                    setFeedbackComment('');
                    await loadCalls();
                  }}
                  disabled={!feedbackComment.trim()}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg"
                >
                  Guardar Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinearLiveMonitor;
