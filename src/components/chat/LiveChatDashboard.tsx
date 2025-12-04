/**
 * ============================================
 * COMPONENTE DASHBOARD - LIVE CHAT
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
  MessageCircle,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  MoreVertical,
  Phone,
  User,
  Calendar,
  Tag
} from 'lucide-react';
import { uchatService, type UChatConversation } from '../../services/uchatService';
import { Avatar } from '../shared/Avatar';

interface LiveChatDashboardProps {
  className?: string;
  onConversationSelect?: (conversation: UChatConversation) => void;
  onAssignConversation?: (conversation: UChatConversation) => void;
}

const LiveChatDashboard: React.FC<LiveChatDashboardProps> = ({ 
  className = '', 
  onConversationSelect,
  onAssignConversation 
}) => {
  const [conversations, setConversations] = useState<UChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<UChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<UChatConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0,
    transferredConversations: 0,
    closedConversations: 0,
    handoffRate: 0
  });

  useEffect(() => {
    loadConversations();
    loadMetrics();
  }, []);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchTerm, statusFilter, priorityFilter]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await uchatService.getConversations({ limit: 100 });
      setConversations(data);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const metricsData = await uchatService.getDashboardMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  };

  const filterConversations = () => {
    let filtered = conversations;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(conv => 
        conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.customer_phone.includes(searchTerm) ||
        conv.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }

    // Filtro por prioridad
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(conv => conv.priority === priorityFilter);
    }

    setFilteredConversations(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'transferred': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <MessageCircle className="w-4 h-4" />;
      case 'transferred': return <Users className="w-4 h-4" />;
      case 'closed': return <CheckCircle className="w-4 h-4" />;
      case 'archived': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const handleAssignConversation = async (conversationId: string, agentId: string) => {
    try {
      await uchatService.assignConversation(conversationId, agentId, 'manual');
      await loadConversations();
    } catch (error) {
      console.error('Error asignando conversación:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header con métricas */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Live Chat</h2>
            <p className="text-gray-600 mt-1">Gestión de conversaciones en tiempo real</p>
          </div>
          <button 
            onClick={loadConversations}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Actualizar
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <MessageCircle className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Total</p>
                <p className="text-2xl font-bold text-blue-900">{metrics.totalConversations}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <MessageCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Activas</p>
                <p className="text-2xl font-bold text-green-900">{metrics.activeConversations}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Transferidas</p>
                <p className="text-2xl font-bold text-purple-900">{metrics.transferredConversations}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-900">Handoff Rate</p>
                <p className="text-2xl font-bold text-orange-900">{metrics.handoffRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="transferred">Transferidas</option>
            <option value="closed">Cerradas</option>
            <option value="archived">Archivadas</option>
          </select>

          {/* Filtro por prioridad */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="divide-y divide-gray-200">
        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay conversaciones</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                ? 'No se encontraron conversaciones con los filtros aplicados.'
                : 'Aún no hay conversaciones activas.'
              }
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedConversation(conversation);
                onConversationSelect?.(conversation);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Avatar */}
                  <Avatar
                    name={conversation.customer_name}
                    size="lg"
                    showIcon={true}
                  />

                  {/* Información principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {conversation.customer_name || 'Cliente sin nombre'}
                      </h3>
                      
                      {/* Indicador de prioridad */}
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(conversation.priority)}`}></div>
                      
                      {/* Estado */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(conversation.status)}`}>
                        {getStatusIcon(conversation.status)}
                        <span className="ml-1 capitalize">{conversation.status}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        {conversation.customer_phone}
                      </div>
                      
                      {conversation.customer_email && (
                        <div className="flex items-center">
                          <span>📧</span>
                          <span className="ml-1">{conversation.customer_email}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {conversation.message_count} mensajes
                      </div>
                    </div>

                    {/* Agente asignado */}
                    {conversation.assigned_agent && (
                      <div className="flex items-center text-sm text-blue-600 mb-2">
                        <Users className="w-4 h-4 mr-1" />
                        Asignado a: {conversation.assigned_agent.full_name}
                      </div>
                    )}

                    {/* Tags */}
                    {conversation.tags.length > 0 && (
                      <div className="flex items-center space-x-1 mb-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        {conversation.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Última actividad */}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {conversation.last_message_at 
                        ? `Último mensaje: ${formatTimeAgo(conversation.last_message_at)}`
                        : `Creada: ${formatTimeAgo(conversation.created_at)}`
                      }
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2">
                  {!conversation.assigned_agent_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignConversation?.(conversation);
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      Asignar
                    </button>
                  )}
                  
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveChatDashboard;
