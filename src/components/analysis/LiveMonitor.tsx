import React, { useState, useEffect } from 'react';
import { liveMonitorService, type Prospect, type Agent, type FeedbackData } from '../../services/liveMonitorService';

// Tipos importados desde el servicio

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
  const handleTransferRequest = async () => {
    setTransferLoading(true);
    
    // TODO: Reemplazar con webhook real
    const webhookData = {
      prospect_id: prospect.id,
      agent_email: nextAgent?.agent_email,
      reason: 'Transferencia solicitada desde Live Monitor',
      timestamp: new Date().toISOString()
    };

    // Simular llamada al webhook
    console.log('🔄 Solicitando transferencia:', webhookData);
    
    setTimeout(() => {
      setTransferLoading(false);
      onFeedback('transferida');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
        
        <div className="p-6 space-y-6">
          {/* Información del Prospecto */}
          <div className="grid grid-cols-3 gap-6">
            {/* Datos Básicos */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-white">Información Básica</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Cliente</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {prospect.nombre_whatsapp || 'Sin nombre'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Teléfono</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {prospect.whatsapp}
                  </p>
                </div>
                {prospect.email && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Email</label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {prospect.email}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Discovery */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-white">Discovery Actualizado</h4>
              <div className="space-y-3">
                {prospect.tamano_grupo && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Grupo</label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {prospect.tamano_grupo} personas
                    </p>
                  </div>
                )}
                {prospect.destino_preferencia && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Destino</label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {prospect.destino_preferencia[0]}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Temperatura</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    prospect.temperatura_prospecto === 'caliente' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : prospect.temperatura_prospecto === 'tibio'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {prospect.temperatura_prospecto || 'Tibio'}
                  </span>
                </div>
              </div>
            </div>

            {/* Estado de Llamada */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-white">Estado de Llamada</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Checkpoint</label>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {prospect.etapa}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Última Actualización</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {liveMonitorService.getTimeElapsed(prospect.updated_at)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Próximo Agente</label>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {nextAgent?.agent_name || 'No asignado'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de la IA */}
          {prospect.observaciones && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Resumen de la Llamada (IA)</h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  {prospect.observaciones}
                </p>
              </div>
            </div>
          )}

          {/* Controles de Llamada */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 dark:text-white">Controles de Llamada</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Monitor de Audio */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Monitor de Audio</span>
                  <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                </div>
                <button
                  onClick={toggleAudioMonitor}
                  className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isListening ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-6.219-8.56" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                  <span>{isListening ? 'Detener Monitor' : 'Iniciar Monitor'}</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {/* TODO: Reemplazar con WebSocket real de VAPI */}
                  WebSocket VAPI (Demo)
                </p>
              </div>

              {/* Solicitar Transferencia */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Human Handoff</span>
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <button
                  onClick={handleTransferRequest}
                  disabled={transferLoading}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
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
                  <span>{transferLoading ? 'Transfiriendo...' : 'Solicitar Transferencia'}</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Intervenir la llamada y transferir al agente
                </p>
              </div>
            </div>
          </div>

          {/* Botones de Resultado */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 dark:text-white">Resultado de Llamada</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => onFeedback('contestada')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors flex flex-col items-center space-y-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">Contestada</span>
              </button>
              
              <button
                onClick={() => onFeedback('perdida')}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg transition-colors flex flex-col items-center space-y-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-medium">Perdida</span>
              </button>
              
              <button
                onClick={handleHangup}
                className={`px-4 py-3 rounded-lg transition-colors flex flex-col items-center space-y-2 ${
                  hangupStep === 0 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : hangupStep === 1
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-red-700 text-white'
                }`}
              >
                {hangupStep === 2 ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2v12a4 4 0 01-4 4H6a4 4 0 01-4-4V6a4 4 0 014-4h4m8 0V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0h2m-2 0v2m-2-2v2" />
                  </svg>
                )}
                <span className="text-sm font-medium">
                  {hangupStep === 0 ? 'Colgar' : hangupStep === 1 ? 'Confirmar' : 'Colgando...'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
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

  // Obtener color según temperatura
  const getTemperatureColor = (temperatura?: string) => {
    switch (temperatura) {
      case 'caliente': return 'from-red-500 to-orange-500';
      case 'tibio': return 'from-yellow-500 to-amber-500';
      case 'frio': return 'from-blue-500 to-cyan-500';
      default: return 'from-slate-500 to-gray-500';
    }
  };

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

  // Obtener porcentaje de progreso según checkpoint
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Checkpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Progreso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Temperatura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Tiempo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {prospects.map(prospect => {
                    const checkpoint = liveMonitorService.mapEtapaToCheckpoint(prospect.etapa);
                    const temperatura = liveMonitorService.inferTemperature(prospect);
                    const progressPercentage = getCheckpointProgress(checkpoint);
                    
                    return (
                      <tr 
                        key={prospect.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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

                        {/* Progreso con animación */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${getTemperatureColor(temperatura)} animate-pulse transition-all duration-1000`}
                              style={{width: `${progressPercentage}%`}}
                            ></div>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {progressPercentage}% completado
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {liveMonitorService.getTimeElapsed(prospect.updated_at)}
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProspect(prospect);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Ver detalle
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
