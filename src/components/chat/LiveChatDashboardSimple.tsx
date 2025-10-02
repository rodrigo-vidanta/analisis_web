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
import ChatWindowReal from './ChatWindowReal';

interface Conversation {
  id: string;
  conversation_id: string;
  customer_phone: string;
  customer_name: string;
  customer_email?: string;
  status: string;
  message_count: number;
  priority: string;
  last_message_at: string;
  platform: string;
  metadata: any;
  created_at: string;
}

interface LiveChatDashboardSimpleProps {
  className?: string;
  onConversationSelect?: (conversation: Conversation) => void;
}

const LiveChatDashboardSimple: React.FC<LiveChatDashboardSimpleProps> = ({ 
  className = '', 
  onConversationSelect
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando conversaciones reales...');
      
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error:', error);
        setConversations([]);
        return;
      }

      console.log('✅ Conversaciones REALES cargadas:', data.length);
      setConversations(data || []);
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

      setMetrics({
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0
      });
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    !searchTerm || 
    conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer_phone.includes(searchTerm)
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Cargando conversaciones reales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* Columna 1: Lista de conversaciones */}
      <div className={`${selectedConversation ? 'w-2/5' : 'w-full'} transition-all duration-300 bg-white`}>
      {/* Header */}
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Live Chat - Conversaciones Reales</h1>
            <p className="text-sm text-slate-500 mt-1">Datos sincronizados desde UChat y pqnc_ia</p>
          </div>
          <button 
            onClick={loadConversations}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
          >
            Actualizar
          </button>
        </div>

        {/* Métricas */}
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

      {/* Búsqueda */}
      <div className="border-b border-slate-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar conversaciones reales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300"
          />
        </div>
      </div>

      {/* Lista de conversaciones REALES */}
      <div className="divide-y divide-slate-50">
        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-slate-900 mb-2">No hay conversaciones</h3>
            <p className="text-sm text-slate-500">
              {searchTerm 
                ? 'No se encontraron conversaciones con los filtros aplicados.'
                : 'No hay conversaciones reales disponibles.'
              }
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-4 hover:bg-slate-25 transition-colors cursor-pointer group"
              onClick={() => {
                setSelectedConversation(conversation);
                onConversationSelect?.(conversation);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {conversation.customer_name 
                      ? <span className="text-sm font-medium text-slate-600">
                          {conversation.customer_name.charAt(0).toUpperCase()}
                        </span>
                      : <User className="w-5 h-5 text-slate-400" />
                    }
                  </div>

                  {/* Información */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {conversation.customer_name || 'Cliente sin nombre'}
                      </h3>
                      {getStatusIndicator(conversation.status)}
                      <span className="text-xs text-slate-500 capitalize">
                        {conversation.status}
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        {conversation.metadata?.etapa || 'Sin etapa'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{conversation.customer_phone}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{conversation.message_count} mensajes REALES</span>
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

                    {/* ID UChat */}
                    <div className="text-xs text-slate-400">
                      UChat ID: {conversation.metadata?.id_uchat || conversation.conversation_id}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Columna 2: Ventana de chat */}
      {selectedConversation && (
        <div className="w-3/5">
          <ChatWindowReal
            conversation={selectedConversation}
            onClose={() => setSelectedConversation(null)}
          />
        </div>
      )}
    </div>
  );
};

export default LiveChatDashboardSimple;
