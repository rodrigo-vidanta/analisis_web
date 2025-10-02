import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Phone,
  Clock,
  User,
  MessageSquare,
  CheckCircle2,
  Circle,
  ArrowUpRight
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

interface LiveChatDashboardV2Props {
  className?: string;
  onConversationSelect?: (conversation: UChatConversation) => void;
  onAssignConversation?: (conversation: UChatConversation) => void;
}

const LiveChatDashboardV2: React.FC<LiveChatDashboardV2Props> = ({ 
  className = '', 
  onConversationSelect,
  onAssignConversation 
}) => {
  const [conversations, setConversations] = useState<UChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<UChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
  }, [conversations, searchTerm, statusFilter]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando conversaciones...');
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error:', error);
        return;
      }
      console.log('✅ Conversaciones cargadas:', data.length);
      setConversations(data);
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data: conversations } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*');

      const totalConversations = conversations?.length || 0;
      const activeConversations = conversations?.filter(c => c.status === 'active').length || 0;
      const transferredConversations = conversations?.filter(c => c.status === 'transferred').length || 0;
      const closedConversations = conversations?.filter(c => c.status === 'closed').length || 0;

      const metricsData = {
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0
      };
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  };

  const addTestData = async () => {
    try {
      setSyncing(true);
      console.log('🔄 Agregando conversaciones de prueba...');
      
      console.log('🔄 Sincronizando conversaciones reales...');
      // Las conversaciones ya están cargadas desde pqnc_ia
      
      // Recargar conversaciones después de agregar datos
      await loadConversations();
      await loadMetrics();
      
      console.log('✅ Conversaciones de prueba agregadas');
    } catch (error) {
      console.error('❌ Error agregando datos de prueba:', error);
    } finally {
      setSyncing(false);
    }
  };

  const filterConversations = () => {
    let filtered = conversations;

    if (searchTerm) {
      filtered = filtered.filter(conv => 
        conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.customer_phone.includes(searchTerm) ||
        conv.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }

    setFilteredConversations(filtered);
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active': 
        return <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />;
      case 'transferred': 
        return <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />;
      case 'closed': 
        return <Circle className="w-2 h-2 fill-slate-400 text-slate-400" />;
      default: 
        return <Circle className="w-2 h-2 fill-slate-300 text-slate-300" />;
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Header con métricas minimalistas */}
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Conversaciones</h1>
            <p className="text-sm text-slate-500 mt-1">Gestión de chat en tiempo real</p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={addTestData}
              disabled={syncing}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                  Cargando...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  Sincronizar UChat
                </>
              )}
            </button>
            
            <button 
              onClick={loadConversations}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* Métricas compactas */}
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-slate-900">{metrics.totalConversations}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-emerald-600">{metrics.activeConversations}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Activas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-blue-600">{metrics.transferredConversations}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Transferidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-slate-600">{metrics.handoffRate.toFixed(0)}%</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Handoff</div>
          </div>
        </div>
      </div>

      {/* Controles de filtrado minimalistas */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300"
            >
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="transferred">Transferidas</option>
              <option value="closed">Cerradas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de conversaciones elegante */}
      <div className="divide-y divide-slate-50">
        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-2">No hay conversaciones</h3>
            <p className="text-sm text-slate-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron conversaciones con los filtros aplicados.'
                : 'Aún no hay conversaciones activas.'
              }
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-4 hover:bg-slate-25 transition-colors cursor-pointer group"
              onClick={() => onConversationSelect?.(conversation)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  {/* Avatar minimalista */}
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {conversation.customer_name 
                      ? <span className="text-sm font-medium text-slate-600">
                          {conversation.customer_name.charAt(0).toUpperCase()}
                        </span>
                      : <User className="w-5 h-5 text-slate-400" />
                    }
                  </div>

                  {/* Información principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {conversation.customer_name || 'Cliente sin nombre'}
                      </h3>
                      {getStatusIndicator(conversation.status)}
                      <span className="text-xs text-slate-500 capitalize">
                        {conversation.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{conversation.customer_phone}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{conversation.message_count} mensajes</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {conversation.last_message_at 
                            ? formatTimeAgo(conversation.last_message_at)
                            : formatTimeAgo(conversation.created_at)
                          }
                        </span>
                      </div>
                    </div>

                    {/* Agente asignado */}
                    {conversation.assigned_agent && (
                      <div className="flex items-center text-xs text-blue-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Asignado a: {conversation.assigned_agent.full_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones minimalistas */}
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!conversation.assigned_agent_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignConversation?.(conversation);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      Asignar
                    </button>
                  )}
                  
                  <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
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

export default LiveChatDashboardV2;
