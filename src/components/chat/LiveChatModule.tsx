/**
 * ============================================
 * MÓDULO INTEGRADO - LIVE CHAT
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/chat/README.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/chat/README.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/chat/CHANGELOG_LIVECHAT.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, Settings, Users, BarChart3 } from 'lucide-react';
import LiveChatCanvas from './LiveChatCanvas';
import AgentAssignmentModal from './AgentAssignmentModal';
import LiveChatAnalytics from './LiveChatAnalytics';
import { uchatService, type UChatConversation } from '../../services/uchatService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

interface LiveChatModuleProps {
  className?: string;
}

const LiveChatModule: React.FC<LiveChatModuleProps> = ({ className = '' }) => {
  const { user } = useAuth();
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
  
  // Determinar si el usuario puede ver configuración (solo admin)
  const canViewSettings = user?.role_name === 'admin';

  // Marcar notificaciones de Live Chat como leídas al entrar al módulo
  useNotifications({ currentModule: 'live-chat' });

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
          <div className="p-6 bg-slate-25 dark:bg-gray-900">
            <div className="max-w-4xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Configuración</h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">Gestiona la configuración del sistema de chat</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">API de UChat</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">API Key</label>
                        <input 
                          type="password" 
                          value="hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5"
                          readOnly
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">URL de la API</label>
                        <input 
                          type="text" 
                          value="https://www.uchat.com.au/api"
                          readOnly
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-100 dark:border-gray-700 pt-6">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Handoff Automático</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" checked readOnly className="rounded border-slate-300 dark:border-gray-600 dark:bg-gray-700" />
                        <span className="ml-2 text-sm text-slate-700 dark:text-gray-300">Activar transferencia automática</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" checked readOnly className="rounded border-slate-300 dark:border-gray-600 dark:bg-gray-700" />
                        <span className="ml-2 text-sm text-slate-700 dark:text-gray-300">Deshabilitar bot al recibir mensaje</span>
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
          <div className="p-6 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
              <LiveChatAnalytics />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Navigation FIJA - No se mueve con scroll */}
      <div className="border-b border-slate-100 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-800 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-900 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-700'
                }`}
              >
                Conversaciones
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'analytics'
                    ? 'bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-700'
                }`}
              >
                Analíticas
              </button>
              {canViewSettings && (
                <button
                  onClick={() => setActiveView('settings')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'settings'
                      ? 'bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Configuración
                </button>
              )}
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
