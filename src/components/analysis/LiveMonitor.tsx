import React, { useState, useEffect } from 'react';
import { liveMonitorService, type Prospect, type Agent, type FeedbackData } from '../../services/liveMonitorService';

// Tipos importados desde el servicio

// Función utilitaria para obtener progreso
const getCheckpointProgress = (checkpoint: string): number => {
  const progressMap: Record<string, number> = {
    'saludo_continuacion': 20,
    'conexion_emocional': 40,
    'introduccion_paraiso': 60,
    'presentacion_oferta': 80,
    'proceso_pago': 100
  };
  return progressMap[checkpoint] || 10;
};

// Función utilitaria para obtener color de temperatura
const getTemperatureColor = (temperatura?: string) => {
  switch (temperatura) {
    case 'caliente': return 'from-red-500 to-orange-500';
    case 'tibio': return 'from-yellow-500 to-amber-500';
    case 'frio': return 'from-blue-500 to-cyan-500';
    default: return 'from-slate-500 to-gray-500';
  }
};

// Componente Modal de Detalle Avanzado
interface ProspectDetailModalProps {
  prospect: Prospect;
  nextAgent: Agent | null;
  onClose: () => void;
  onFeedback: (type: 'contestada' | 'perdida' | 'colgada' | 'transferida') => void;
  onRefresh: () => void;
}

const ProspectDetailModal: React.FC<ProspectDetailModalProps> = ({ 
  prospect, 
  nextAgent, 
  onClose, 
  onFeedback, 
  onRefresh 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [hangupStep, setHangupStep] = useState(0); // 0: inicial, 1: primer click, 2: confirmación
  const [transferLoading, setTransferLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [selectedPresetReason, setSelectedPresetReason] = useState('');

  // Razones predefinidas para transferencia
  const presetReasons = [
    'Dile que tu supervisor puede ofrecerle un mejor precio exclusivo',
    'Comenta que tu supervisor estaba atento a la llamada y quiere darle un beneficio adicional',
    'Explícale que tu supervisor maneja casos especiales como el suyo',
    'Menciona que tu supervisor tiene autorización para ofertas personalizadas',
    'Dile que tu supervisor puede resolver cualquier duda específica que tenga',
    'Comenta que tu supervisor quiere atenderle personalmente por ser un cliente especial',
    'Explica que tu supervisor tiene disponibilidad limitada solo para hoy'
  ];

  // Simular monitor de audio de VAPI
  const toggleAudioMonitor = () => {
    setIsListening(!isListening);
    // TODO: Reemplazar con WebSocket real de VAPI
    console.log('🎧 Audio monitor:', isListening ? 'OFF' : 'ON');
  };

  // Colgar llamada con doble confirmación
  const handleHangup = async () => {
    if (hangupStep === 0) {
      setHangupStep(1);
      setTimeout(() => setHangupStep(0), 5000); // Reset después de 5s
    } else if (hangupStep === 1) {
      setHangupStep(2);
      // Simular colgado de llamada
      setTimeout(() => {
        onFeedback('colgada');
        setHangupStep(0);
      }, 1000);
    }
  };

  // Solicitar transferencia (human handoff)
  const handleTransferRequest = () => {
    setShowTransferModal(true);
  };

  // Ejecutar transferencia con razón específica
  const executeTransfer = async () => {
    setTransferLoading(true);
    setShowTransferModal(false);
    
    const finalReason = selectedPresetReason || transferReason;
    
    if (!nextAgent?.agent_email) {
      console.error('❌ No hay agente asignado');
      setTransferLoading(false);
      return;
    }

    // Enviar susurro a la IA usando el servicio
    const success = await liveMonitorService.sendWhisperToAI(
      prospect.id,
      finalReason,
      nextAgent.agent_email
    );

    if (success) {
      // Marcar como transferido en la BD
      await liveMonitorService.markAsTransferred(
        prospect.id,
        nextAgent.agent_email,
        liveMonitorService.mapEtapaToCheckpoint(prospect.etapa)
      );
    }
    
    setTimeout(() => {
      setTransferLoading(false);
      onFeedback('transferida');
      // Reset form
      setTransferReason('');
      setSelectedPresetReason('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {(prospect.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {prospect.nombre_whatsapp || 'Sin nombre'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Monitor de Llamada en Vivo
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-3 gap-8">
            {/* COLUMNA IZQUIERDA - Información Completa del Cliente */}
            <div className="col-span-2 space-y-6">
              
              {/* Información Personal Completa */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-5">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Información Personal</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre Completo</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.nombre_completo || prospect.nombre_whatsapp || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre WhatsApp</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.nombre_whatsapp || 'No disponible'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Teléfono Principal</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.whatsapp}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.email || 'No proporcionado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Edad</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.edad || 'No especificada'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado Civil</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.estado_civil || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ciudad</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.ciudad_residencia || 'No especificada'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cónyuge</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.nombre_conyuge || 'No especificado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Discovery de Viaje */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-5">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span>Discovery de Viaje</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tamaño del Grupo</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.tamano_grupo ? `${prospect.tamano_grupo} personas` : 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Menores</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.cantidad_menores !== null ? `${prospect.cantidad_menores} menores` : 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Viaja Con</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.viaja_con || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Destino Preferido</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.destino_preferencia?.[0] || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Interés Principal</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.interes_principal || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Campaña Origen</label>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">
                      {prospect.campana_origen || 'No especificada'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado de Progreso */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-5">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                  <span>Progreso de la Llamada</span>
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">
                      {prospect.etapa}
                    </span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(prospect.etapa))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-6 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full bg-gradient-to-r ${getTemperatureColor(liveMonitorService.inferTemperature(prospect))} transition-all duration-1000 relative overflow-hidden`}
                      style={{width: `${getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(prospect.etapa))}%`}}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 animate-ping"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Temperatura</span>
                      <p className={`font-medium mt-1 ${
                        liveMonitorService.inferTemperature(prospect) === 'caliente' ? 'text-red-600 dark:text-red-400' :
                        liveMonitorService.inferTemperature(prospect) === 'tibio' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {liveMonitorService.inferTemperature(prospect).charAt(0).toUpperCase() + liveMonitorService.inferTemperature(prospect).slice(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tiempo Activo</span>
                      <p className="font-medium text-slate-900 dark:text-white mt-1">
                        {liveMonitorService.getTimeElapsed(prospect.updated_at)}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Próximo Agente</span>
                      <p className="font-medium text-green-600 dark:text-green-400 mt-1">
                        {nextAgent?.agent_name.split(' ')[0] || 'No asignado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de la IA */}
              {prospect.observaciones && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-700">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Contexto de la IA</span>
                  </h4>
                  <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                    {prospect.observaciones}
                  </p>
                </div>
              )}

              {/* Datos Técnicos */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-5">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Datos Técnicos</span>
                </h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">ID Prospecto</label>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">
                      {prospect.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">ID UChat</label>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">
                      {prospect.id_uchat || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">Score</label>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-1">
                      {prospect.score || 'No evaluado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA - Controles Minimalistas */}
            <div className="space-y-4">
              
              {/* Monitor de Audio Compacto */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                    </svg>
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Audio Monitor</span>
                  </div>
                  
                  {/* Visualizador de audio compacto */}
                  <div className="h-12 flex items-center justify-center">
                    {isListening ? (
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                          <div
                            key={i}
                            className="w-0.5 bg-green-500 rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 20 + 8}px`,
                              animationDelay: `${i * 0.1}s`,
                              animationDuration: '0.6s'
                            }}
                          ></div>
                        ))}
                      </div>
                    ) : (
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                      </svg>
                    )}
                  </div>
                  
                  <button
                    onClick={toggleAudioMonitor}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isListening 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isListening ? 'Detener' : 'Iniciar'}
                  </button>
                </div>
              </div>

              {/* Controles de Llamada Minimalistas */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Controles</h4>
                
                <div className="space-y-2">
                  {/* Human Handoff */}
                  <button
                    onClick={handleTransferRequest}
                    disabled={transferLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {transferLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                    <span>{transferLoading ? 'Interviniendo...' : 'Intervenir Llamada'}</span>
                  </button>

                  {/* Colgar Llamada */}
                  <button
                    onClick={handleHangup}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                      hangupStep === 0 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : hangupStep === 1
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-red-700 text-white'
                    }`}
                  >
                    {hangupStep === 2 ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2v12a4 4 0 01-4 4H6a4 4 0 01-4-4V6a4 4 0 014-4h4m8 0V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0h2m-2 0v2m-2-2v2" />
                      </svg>
                    )}
                    <span>
                      {hangupStep === 0 ? 'Colgar Llamada' : hangupStep === 1 ? 'Confirmar' : 'Colgando...'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Botones de Resultado Discretos */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Resultado</h4>
                
                <div className="space-y-2">
                  <button
                    onClick={() => onFeedback('contestada')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Llamada Contestada</span>
                  </button>
                  
                  <button
                    onClick={() => onFeedback('perdida')}
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Llamada Perdida</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Transferencia con Susurro */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Intervenir Llamada</span>
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Selecciona qué debe decirle la IA al cliente antes de transferirte la llamada
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Razones Predefinidas */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Razones Predefinidas
                </label>
                <div className="space-y-2">
                  {presetReasons.map((reason, index) => (
                    <label key={index} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="transferReason"
                        value={reason}
                        checked={selectedPresetReason === reason}
                        onChange={(e) => {
                          setSelectedPresetReason(e.target.value);
                          setTransferReason(''); // Limpiar texto personalizado
                        }}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        "{reason}"
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Razón Personalizada */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  O escribe una razón personalizada
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => {
                    setTransferReason(e.target.value);
                    setSelectedPresetReason(''); // Limpiar selección predefinida
                  }}
                  placeholder="Ejemplo: Dile que tu supervisor tiene una promoción especial que expira hoy..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white text-sm"
                />
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                  {transferReason.length}/200
                </div>
              </div>

              {/* Vista previa del mensaje */}
              {(selectedPresetReason || transferReason) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <label className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    La IA dirá al cliente:
                  </label>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1 italic">
                    "{selectedPresetReason || transferReason}"
                  </p>
                </div>
              )}

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferReason('');
                    setSelectedPresetReason('');
                  }}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white px-4 py-2.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeTransfer}
                  disabled={!selectedPresetReason && !transferReason.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
                >
                  Intervenir Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LiveMonitor: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [nextAgent, setNextAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'contestada' | 'perdida' | 'colgada' | 'transferida'>('contestada');
  const [sortField, setSortField] = useState<'progress' | 'cliente' | 'checkpoint' | 'temperatura' | 'tiempo'>('progress');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Cargar datos de prospectos usando el servicio
  const loadProspects = async () => {
    setLoading(true);
    const data = await liveMonitorService.getActiveProspects();
    setProspects(data);
    setLoading(false);
  };

  // Sortear próximo agente usando el servicio
  const selectNextAgent = async () => {
    const agent = await liveMonitorService.selectNextAgent();
    setNextAgent(agent);
  };

  // Cargar agentes usando el servicio
  const loadAgents = async () => {
    const agentsList = await liveMonitorService.getActiveAgents();
    setAgents(agentsList);
  };

  // Cargar datos al inicializar
  useEffect(() => {
    loadProspects();
    loadAgents();
    selectNextAgent();
    
    // Recargar cada 10 segundos
    const interval = setInterval(() => {
      loadProspects();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Obtener icono según checkpoint
  const getCheckpointIcon = (checkpoint?: string) => {
    switch (checkpoint) {
      case 'saludo_continuacion':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v8a2 2 0 002 2h8a2 2 0 002-2V8M9 16v-2m4 2v-2" />;
      case 'conexion_emocional':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />;
      case 'introduccion_paraiso':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />;
      case 'presentacion_oferta':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />;
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />;
    }
  };

  // Función de sorting
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Ordenar prospectos
  const sortedProspects = [...prospects].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case 'progress':
        aValue = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(a.etapa));
        bValue = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(b.etapa));
        break;
      case 'cliente':
        aValue = a.nombre_whatsapp || '';
        bValue = b.nombre_whatsapp || '';
        break;
      case 'checkpoint':
        aValue = a.etapa;
        bValue = b.etapa;
        break;
      case 'temperatura':
        const tempOrder = { 'caliente': 3, 'tibio': 2, 'frio': 1 };
        aValue = tempOrder[liveMonitorService.inferTemperature(a) as keyof typeof tempOrder] || 0;
        bValue = tempOrder[liveMonitorService.inferTemperature(b) as keyof typeof tempOrder] || 0;
        break;
      case 'tiempo':
        aValue = new Date(a.updated_at).getTime();
        bValue = new Date(b.updated_at).getTime();
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Componente para header sorteable
  const SortableHeader: React.FC<{ field: typeof sortField; children: React.ReactNode; className?: string }> = ({ field, children, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );

  // Función para obtener clases de fila según progreso
  const getRowClasses = (progress: number): string => {
    if (progress >= 80) {
      return 'animate-pulse bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    } else if (progress >= 60) {
      return 'animate-pulse bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
    return 'hover:bg-slate-50 dark:hover:bg-slate-700';
  };

  // Efecto de sonido para llamadas críticas
  useEffect(() => {
    const highPriorityProspects = sortedProspects.filter(p => {
      const progress = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(p.etapa));
      return progress >= 80;
    });

    if (highPriorityProspects.length > 0) {
      const interval = setInterval(() => {
        // TODO: Reemplazar con sonido real
        console.log('🔔 Llamada crítica requiere atención');
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [sortedProspects]);

  // Función para guardar feedback
  const handleSaveFeedback = async (resultado: 'exitosa' | 'perdida' | 'problemas_tecnicos') => {
    if (!selectedProspect) return;

    const feedbackData: FeedbackData = {
      prospect_id: selectedProspect.id,
      agent_email: nextAgent?.agent_email || 'unknown',
      resultado,
      comentarios: feedback,
      comentarios_ia: 'Transferencia desde Live Monitor'
    };

    const success = await liveMonitorService.saveFeedback(feedbackData);
    if (success) {
      setShowFeedbackModal(false);
      setFeedback('');
      setSelectedProspect(null);
      loadProspects(); // Recargar para quitar de la vista
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Live Monitor
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Monitor de llamadas en tiempo real y gestión de transferencias
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  En vivo
                </span>
              </div>
              <button
                onClick={() => {
                  loadProspects();
                  selectNextAgent();
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Próximo Agente en Cola - Compacto */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          {nextAgent && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Próximo Agente:</span>
              </div>
              
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {nextAgent.agent_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {nextAgent.agent_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {nextAgent.total_calls_handled} llamadas
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">En cola</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabla Visual de Checkpoints */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center space-x-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Pipeline de Llamadas</span>
              </h2>
              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                {prospects.length} en proceso
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg h-16"></div>
                ))}
              </div>
            </div>
          ) : prospects.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No hay llamadas activas
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Las llamadas en proceso aparecerán aquí en tiempo real
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <SortableHeader field="cliente">Cliente</SortableHeader>
                    <SortableHeader field="checkpoint">Checkpoint</SortableHeader>
                    <SortableHeader field="progress" className="w-1/3">Progreso</SortableHeader>
                    <SortableHeader field="temperatura">Temperatura</SortableHeader>
                    <SortableHeader field="tiempo" className="w-20">Tiempo</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-20">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {sortedProspects.map(prospect => {
                    const checkpoint = liveMonitorService.mapEtapaToCheckpoint(prospect.etapa);
                    const temperatura = liveMonitorService.inferTemperature(prospect);
                    const progressPercentage = getCheckpointProgress(checkpoint);
                    
                    return (
                      <tr 
                        key={prospect.id}
                        className={`transition-colors cursor-pointer border-l-4 ${getRowClasses(progressPercentage)} ${
                          progressPercentage >= 80 ? 'border-l-red-500' : 
                          progressPercentage >= 60 ? 'border-l-yellow-500' : 'border-l-transparent'
                        }`}
                        onClick={() => setSelectedProspect(prospect)}
                      >
                        {/* Cliente */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {(prospect.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {prospect.nombre_whatsapp || 'Sin nombre'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {prospect.whatsapp}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Checkpoint */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {getCheckpointIcon(checkpoint)}
                            </svg>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {prospect.etapa}
                            </span>
                          </div>
                        </td>

                        {/* Progreso con animación mejorada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {progressPercentage}%
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {prospect.etapa}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden shadow-inner">
                              <div 
                                className={`h-full bg-gradient-to-r ${getTemperatureColor(temperatura)} transition-all duration-1000 relative overflow-hidden`}
                                style={{width: `${progressPercentage}%`}}
                              >
                                {/* Animación de progreso */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                {progressPercentage >= 60 && (
                                  <div className="absolute inset-0 animate-pulse bg-white/10"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Temperatura */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            temperatura === 'caliente' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : temperatura === 'tibio'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-1.5 ${
                              temperatura === 'caliente' ? 'bg-red-500' :
                              temperatura === 'tibio' ? 'bg-yellow-500' : 'bg-blue-500'
                            } animate-pulse`}></div>
                            {temperatura.charAt(0).toUpperCase() + temperatura.slice(1)}
                          </span>
                        </td>

                        {/* Tiempo */}
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {liveMonitorService.getTimeElapsed(prospect.updated_at)}
                        </td>

                        {/* Acciones */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProspect(prospect);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                          >
                            Detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Detalle de Prospecto Avanzado */}
        {selectedProspect && (
          <ProspectDetailModal 
            prospect={selectedProspect}
            nextAgent={nextAgent}
            onClose={() => setSelectedProspect(null)}
            onFeedback={(type) => {
              setFeedbackType(type);
              setShowFeedbackModal(true);
              setSelectedProspect(null);
            }}
            onRefresh={loadProspects}
          />
        )}

        {/* Modal de Feedback */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Feedback del Agente
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Comentarios (máximo 600 caracteres)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    maxLength={600}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Describe el resultado de la llamada, comentarios sobre la IA, problemas técnicos, etc..."
                  />
                  <div className="text-right text-xs text-slate-400 mt-1">
                    {feedback.length}/600
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false);
                      setFeedback('');
                    }}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSaveFeedback('exitosa')}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Guardar Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitor;
