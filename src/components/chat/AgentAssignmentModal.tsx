/**
 * ============================================
 * MODAL DE ASIGNACIÓN DE AGENTES - LIVE CHAT
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
import {
  X,
  User,
  Search,
  UserCheck,
  Clock,
  MessageCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { uchatService, type UChatConversation } from '../../services/uchatService';
import { Avatar } from '../shared/Avatar';
import { formatExecutiveDisplayName } from '../../utils/nameFormatter';

interface Agent {
  id: string;
  full_name: string;
  email: string;
  department?: string;
  position?: string;
  is_active: boolean;
  // Estadísticas calculadas
  active_conversations?: number;
  total_conversations?: number;
  avg_response_time?: number;
  last_activity?: string;
}

interface AgentAssignmentModalProps {
  conversation: UChatConversation;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (agentId: string, agentName: string) => void;
  className?: string;
}

const AgentAssignmentModal: React.FC<AgentAssignmentModalProps> = ({
  conversation,
  isOpen,
  onClose,
  onAssign,
  className = ''
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [assignmentReason, setAssignmentReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAgents();
    }
  }, [isOpen]);

  useEffect(() => {
    filterAgents();
  }, [agents, searchTerm]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      
      // Obtener agentes activos
      const { data: agentsData, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          full_name,
          email,
          department,
          position,
          is_active
        `)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      // Obtener estadísticas de conversaciones para cada agente
      const agentsWithStats = await Promise.all(
        (agentsData || []).map(async (agent) => {
          try {
            const { data: conversations } = await supabaseSystemUI
              .from('uchat_conversations')
              .select('id, status, created_at, last_message_at')
              .eq('assigned_agent_id', agent.id);

            const activeConversations = conversations?.filter(c => 
              c.status === 'active' || c.status === 'transferred'
            ).length || 0;

            const totalConversations = conversations?.length || 0;

            // Calcular tiempo promedio de respuesta (simulado por ahora)
            const avgResponseTime = Math.floor(Math.random() * 300) + 60; // 1-5 minutos

            // Última actividad
            const lastActivity = conversations?.length > 0 
              ? conversations.reduce((latest, conv) => {
                  const convDate = new Date(conv.last_message_at || conv.created_at);
                  return convDate > latest ? convDate : latest;
                }, new Date(0))
              : null;

            return {
              ...agent,
              active_conversations: activeConversations,
              total_conversations: totalConversations,
              avg_response_time: avgResponseTime,
              last_activity: lastActivity?.toISOString()
            };
          } catch (error) {
            console.error(`Error obteniendo estadísticas para agente ${agent.id}:`, error);
            return {
              ...agent,
              active_conversations: 0,
              total_conversations: 0,
              avg_response_time: 0
            };
          }
        })
      );

      setAgents(agentsWithStats);
    } catch (error) {
      console.error('Error cargando agentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = agents;

    if (searchTerm) {
      filtered = filtered.filter(agent =>
        agent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por disponibilidad (menos conversaciones activas primero)
    filtered.sort((a, b) => {
      const aLoad = a.active_conversations || 0;
      const bLoad = b.active_conversations || 0;
      return aLoad - bLoad;
    });

    setFilteredAgents(filtered);
  };

  const handleAssign = async () => {
    if (!selectedAgent || assigning) return;

    try {
      setAssigning(selectedAgent.id);
      
      await uchatService.assignConversation(
        conversation.id,
        selectedAgent.id,
        'manual', // assigned_by (podría ser el ID del usuario actual)
        assignmentReason || 'Asignación manual desde dashboard'
      );

      onAssign(selectedAgent.id, formatExecutiveDisplayName(selectedAgent.full_name));
      onClose();
    } catch (error) {
      console.error('Error asignando conversación:', error);
    } finally {
      setAssigning(null);
    }
  };

  const getAvailabilityStatus = (agent: Agent) => {
    const activeConversations = agent.active_conversations || 0;
    
    if (activeConversations === 0) {
      return { status: 'available', label: 'Disponible', color: 'text-green-600 bg-green-100' };
    } else if (activeConversations <= 3) {
      return { status: 'busy', label: 'Ocupado', color: 'text-yellow-600 bg-yellow-100' };
    } else {
      return { status: 'overloaded', label: 'Sobrecargado', color: 'text-red-600 bg-red-100' };
    }
  };

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return 'Sin actividad';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Asignar Conversación</h2>
            <p className="text-gray-600 mt-1">
              Cliente: {conversation.customer_name || conversation.customer_phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar agente por nombre, email o departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de agentes */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay agentes disponibles</h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'No se encontraron agentes con los criterios de búsqueda.'
                  : 'No hay agentes activos en el sistema.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAgents.map((agent) => {
                const availability = getAvailabilityStatus(agent);
                const isSelected = selectedAgent?.id === agent.id;
                
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {/* Avatar */}
                        <Avatar
                          name={agent.full_name}
                          size="md"
                          showIcon={false}
                        />

                        {/* Información del agente */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {formatExecutiveDisplayName(agent.full_name)}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${availability.color}`}>
                              {availability.label}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">{agent.email}</p>

                          {(agent.department || agent.position) && (
                            <p className="text-sm text-gray-500 mb-2">
                              {[agent.position, agent.department].filter(Boolean).join(' • ')}
                            </p>
                          )}

                          {/* Estadísticas */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              {agent.active_conversations || 0} activas
                            </div>
                            <div className="flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {agent.total_conversations || 0} total
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatResponseTime(agent.avg_response_time || 0)} resp.
                            </div>
                            <div className="flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {formatLastActivity(agent.last_activity)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Indicador de selección */}
                      {isSelected && (
                        <div className="ml-3">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Razón de asignación */}
        {selectedAgent && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón de asignación (opcional)
            </label>
            <textarea
              value={assignmentReason}
              onChange={(e) => setAssignmentReason(e.target.value)}
              placeholder="Describe por qué asignas esta conversación a este agente..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedAgent || assigning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {assigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Asignando...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Asignar Conversación</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentAssignmentModal;
