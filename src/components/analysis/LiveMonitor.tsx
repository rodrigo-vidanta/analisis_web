import React, { useState, useEffect } from 'react';
import { liveMonitorService, type Prospect, type Agent, type FeedbackData } from '../../services/liveMonitorService';

// Tipos importados desde el servicio

const LiveMonitor: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [nextAgent, setNextAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');

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

        {/* Próximo Agente en Cola */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center space-x-3">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>Próximo Agente en Cola</span>
            </h2>
            
            <button
              onClick={selectNextAgent}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sortear</span>
            </button>
          </div>

          {nextAgent && (
            <div className="relative">
              {/* Animación de fondo */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg animate-pulse"></div>
              
              <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center space-x-4">
                  {/* Avatar animado */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {nextAgent.agent_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {nextAgent.agent_name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {nextAgent.agent_email}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        📞 {nextAgent.total_calls_handled} llamadas atendidas
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Próximo en recibir transferencia
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicador visual */}
                  <div className="text-right">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Llamadas por Checkpoint */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center space-x-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Llamadas en Proceso</span>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-sm font-medium">
              {prospects.length} activas
            </span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 dark:bg-slate-700 rounded-lg h-32"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prospects.map(prospect => {
                const checkpoint = liveMonitorService.mapEtapaToCheckpoint(prospect.etapa);
                const temperatura = liveMonitorService.inferTemperature(prospect);
                
                return (
                  <div
                    key={prospect.id}
                    onClick={() => setSelectedProspect(prospect)}
                    className="relative bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  >
                    {/* Indicador de temperatura animado */}
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full bg-gradient-to-r ${getTemperatureColor(temperatura)} animate-pulse`}></div>
                    
                    {/* Barra de progreso animada */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-600 rounded-t-lg overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${getTemperatureColor(temperatura)} animate-pulse`} style={{width: '60%'}}></div>
                    </div>

                    <div className="mt-2">
                      {/* Cliente */}
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium text-slate-900 dark:text-white truncate">
                          {prospect.nombre_whatsapp || 'Sin nombre'}
                        </span>
                      </div>

                      {/* Checkpoint */}
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {getCheckpointIcon(checkpoint)}
                        </svg>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {prospect.etapa}
                        </span>
                      </div>

                      {/* Información adicional */}
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <div>📱 {prospect.whatsapp}</div>
                        {prospect.tamano_grupo && (
                          <div>👥 {prospect.tamano_grupo} personas</div>
                        )}
                        {prospect.destino_preferencia && (
                          <div>🏖️ {prospect.destino_preferencia[0]}</div>
                        )}
                      </div>

                      {/* Tiempo transcurrido */}
                      <div className="mt-3 text-xs text-slate-400">
                        {liveMonitorService.getTimeElapsed(prospect.updated_at)}
                      </div>
                    </div>

                    {/* Overlay de hover */}
                    <div className="absolute inset-0 bg-blue-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </div>
                );
              })}
            </div>
          )}

          {prospects.length === 0 && !loading && (
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
          )}
        </div>

        {/* Modal de Detalle de Prospecto */}
        {selectedProspect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Detalle del Prospecto
                  </h3>
                  <button
                    onClick={() => setSelectedProspect(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Cliente</label>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedProspect.nombre_whatsapp || 'Sin nombre'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Teléfono</label>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedProspect.whatsapp}
                    </p>
                  </div>
                </div>

                {/* Etapa y temperatura */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Etapa Actual</label>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {selectedProspect.etapa}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Temperatura</label>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedProspect.temperatura_prospecto === 'caliente' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : selectedProspect.temperatura_prospecto === 'tibio'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {selectedProspect.temperatura_prospecto || 'Tibio'}
                    </span>
                  </div>
                </div>

                {/* Discovery */}
                {(selectedProspect.tamano_grupo || selectedProspect.destino_preferencia) && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Discovery</label>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-2">
                      {selectedProspect.tamano_grupo && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span>Grupo de {selectedProspect.tamano_grupo} personas</span>
                        </div>
                      )}
                      {selectedProspect.destino_preferencia && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span>Destino: {selectedProspect.destino_preferencia[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Observaciones */}
                {selectedProspect.observaciones && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Resumen IA</label>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                      <p className="text-slate-700 dark:text-slate-300">
                        {selectedProspect.observaciones}
                      </p>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Llamada Contestada</span>
                  </button>
                  
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
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
