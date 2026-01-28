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
import { motion } from 'framer-motion';
import { MessageCircle, Settings, Users, BarChart3, MessageSquarePlus } from 'lucide-react';
import LiveChatCanvas from './LiveChatCanvas';
import AgentAssignmentModal from './AgentAssignmentModal';
import LiveChatAnalytics from './LiveChatAnalytics';
import QuickImportModal from './QuickImportModal';
import { SendTemplateToProspectModal } from './SendTemplateToProspectModal';
import { uchatService, type UChatConversation } from '../../services/uchatService';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { useNotifications } from '../../hooks/useNotifications';
import { Tabs, Card, Input, type Tab } from '../base';
import toast from 'react-hot-toast';

interface LiveChatModuleProps {
  className?: string;
}

const LiveChatModule: React.FC<LiveChatModuleProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { isAdmin } = useEffectivePermissions();
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'analytics'>('dashboard');
  const [selectedConversation, setSelectedConversation] = useState<UChatConversation | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [conversationToAssign, setConversationToAssign] = useState<UChatConversation | null>(null);
  const [showQuickImportModal, setShowQuickImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedProspectoId, setSelectedProspectoId] = useState<string | null>(null);
  const [prospectoData, setProspectoData] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0,
    transferredConversations: 0,
    closedConversations: 0,
    handoffRate: 0
  });
  
  // Determinar si el usuario puede ver configuración (solo admin)
  const canViewSettings = isAdmin;

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

  const handleQuickImportSuccess = async (prospectoId: string) => {
    setShowQuickImportModal(false);
    
    // Cargar datos del prospecto
    try {
      const { data: prospecto } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', prospectoId)
        .single();
      
      if (prospecto) {
        setProspectoData(prospecto);
        setSelectedProspectoId(prospectoId);
        setShowTemplateModal(true);
      } else {
        toast.error('No se pudo cargar el prospecto');
      }
    } catch (error) {
      console.error('Error cargando prospecto:', error);
      toast.error('Error al cargar datos del prospecto');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <LiveChatCanvas />;
      
      case 'settings':
        return (
          <div className="p-6 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-4xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Configuración</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Gestiona la configuración del sistema de chat</p>
              </div>
              
              <Card variant="elevated" size="lg">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3">API de UChat</h3>
                    <div className="space-y-3">
                      <Input 
                        type="password" 
                        label="API Key"
                        value="hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5"
                        readOnly
                        size="sm"
                      />
                      <Input 
                        type="text" 
                        label="URL de la API"
                        value="https://www.uchat.com.au/api"
                        readOnly
                        size="sm"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t border-neutral-100 dark:border-neutral-700 pt-6">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-3">Handoff Automático</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" checked readOnly className="rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700" />
                        <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Activar transferencia automática</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" checked readOnly className="rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700" />
                        <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Deshabilitar bot al recibir mensaje</span>
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="p-6 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
              <LiveChatAnalytics />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Configurar tabs para el módulo
  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Conversaciones', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analíticas', icon: <BarChart3 className="w-4 h-4" /> },
    ...(canViewSettings ? [{ id: 'settings' as const, label: 'Configuración', icon: <Settings className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-neutral-900 ${className}`}>
      {/* Navigation SLIM - Sin título, solo icono y tabs */}
      <div className="border-b border-neutral-100 dark:border-neutral-700 px-6 py-2.5 bg-white dark:bg-neutral-800 sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          {/* Icono del módulo WhatsApp con botón de + para nueva conversación */}
          <motion.button
            onClick={() => setShowQuickImportModal(true)}
            className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group relative shadow-lg shadow-emerald-500/30"
            title="Nueva conversación"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            <MessageSquarePlus className="w-6 h-6 text-white" />
            
            {/* Efecto de onda */}
            <motion.span
              className="absolute inset-0 rounded-xl bg-emerald-400/30"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.button>
          
          {/* Tabs homologadas */}
          <Tabs 
            tabs={tabs}
            activeTab={activeView}
            onChange={(tabId) => setActiveView(tabId as 'dashboard' | 'settings' | 'analytics')}
            variant="default"
          />
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

      {/* Modal de importación rápida */}
      {showQuickImportModal && (
        <QuickImportModal
          isOpen={showQuickImportModal}
          onClose={() => setShowQuickImportModal(false)}
          onSuccess={handleQuickImportSuccess}
        />
      )}

      {/* Modal de enviar plantilla (después de importar) */}
      {showTemplateModal && selectedProspectoId && prospectoData && (
        <SendTemplateToProspectModal
          isOpen={showTemplateModal}
          onClose={() => {
            setShowTemplateModal(false);
            setSelectedProspectoId(null);
            setProspectoData(null);
          }}
          prospectoId={selectedProspectoId}
          prospectoData={prospectoData}
          onSuccess={(conversacionId) => {
            setShowTemplateModal(false);
            setSelectedProspectoId(null);
            setProspectoData(null);
            
            if (conversacionId) {
              // ✅ Guardar conversación para que LiveChatCanvas la abra automáticamente
              console.log('🎯 Navegando a conversación:', conversacionId);
              
              // Usar evento personalizado para indicar al canvas que debe seleccionar esta conversación
              window.dispatchEvent(new CustomEvent('select-livechat-conversation', { 
                detail: conversacionId 
              }));
              
              // Notificar éxito
              toast.success('Conversación iniciada correctamente', {
                icon: '✅',
                duration: 3000
              });
            } else {
              // ⚠️ Si no hay conversacion_id, recargar lista
              console.warn('⚠️ No hay conversacion_id, recargando lista');
              window.dispatchEvent(new CustomEvent('refresh-livechat-conversations'));
            }
          }}
        />
      )}
    </div>
  );
};

export default LiveChatModule;
