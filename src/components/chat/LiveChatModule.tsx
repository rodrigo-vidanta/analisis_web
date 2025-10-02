import React, { useState, useEffect } from 'react';
import { MessageCircle, Settings, Users, BarChart3 } from 'lucide-react';
import LiveChatCanvas from './LiveChatCanvas';
import AgentAssignmentModal from './AgentAssignmentModal';
import { uchatService, type UChatConversation } from '../../services/uchatService';

interface LiveChatModuleProps {
  className?: string;
}

const LiveChatModule: React.FC<LiveChatModuleProps> = ({ className = '' }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'analytics'>('dashboard');
  const [selectedConversation, setSelectedConversation] = useState<UChatConversation | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [conversationToAssign, setConversationToAssign] = useState<UChatConversation | null>(null);
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0,
    transferredConversations: 0,
    closedConversations: 0,
    handoffRate: 0
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const metricsData = await uchatService.getDashboardMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  };

  const handleConversationSelect = (conversation: UChatConversation) => {
    setSelectedConversation(conversation);
  };

  const handleConversationClose = () => {
    setSelectedConversation(null);
  };

  const handleAssignConversation = (conversation: UChatConversation) => {
    setConversationToAssign(conversation);
    setShowAssignmentModal(true);
  };

  const handleAssignmentComplete = (agentId: string, agentName: string) => {
    setShowAssignmentModal(false);
    setConversationToAssign(null);
    // Aquí podrías actualizar la lista de conversaciones o mostrar una notificación
    console.log(`Conversación asignada a ${agentName}`);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <LiveChatCanvas />;
      
      case 'settings':
        return (
          <div className="p-6 bg-slate-25">
            <div className="max-w-4xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Configuración</h2>
                <p className="text-sm text-slate-600">Gestiona la configuración del sistema de chat</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 mb-3">API de UChat</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">API Key</label>
                        <input 
                          type="password" 
                          value="hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5"
                          readOnly
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">URL de la API</label>
                        <input 
                          type="text" 
                          value="https://www.uchat.com.au/api"
                          readOnly
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-medium text-slate-900 mb-3">Handoff Automático</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" checked readOnly className="rounded border-slate-300" />
                        <span className="ml-2 text-sm text-slate-700">Activar transferencia automática</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" checked readOnly className="rounded border-slate-300" />
                        <span className="ml-2 text-sm text-slate-700">Deshabilitar bot al recibir mensaje</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="p-6 bg-slate-25">
            <div className="max-w-6xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Analíticas</h2>
                <p className="text-sm text-slate-600">Métricas y estadísticas del sistema de chat</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-slate-900">{metrics.totalConversations}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Total Conversaciones</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-emerald-600">{metrics.activeConversations}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Activas</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-blue-600">{metrics.transferredConversations}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Transferidas</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-slate-600">{metrics.handoffRate.toFixed(0)}%</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Tasa Handoff</div>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-slate-900 mb-4">Próximamente</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div>• Gráficos de tendencias de conversaciones</div>
                  <div>• Métricas de tiempo de respuesta</div>
                  <div>• Análisis de satisfacción del cliente</div>
                  <div>• Reportes de rendimiento por agente</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* Navigation FIJA - No se mueve con scroll */}
      <div className="border-b border-slate-100 px-6 py-4 bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-slate-900">Live Chat</h1>
            </div>
            
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Conversaciones
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'analytics'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Analíticas
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'settings'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Configuración
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content - Sin overflow para evitar scroll global */}
      <div className="flex-1" style={{ height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        {renderContent()}
      </div>

      {/* Modal de asignación */}
      {showAssignmentModal && conversationToAssign && (
        <AgentAssignmentModal
          conversation={conversationToAssign}
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setConversationToAssign(null);
          }}
          onAssign={handleAssignmentComplete}
        />
      )}
    </div>
  );
};

export default LiveChatModule;
