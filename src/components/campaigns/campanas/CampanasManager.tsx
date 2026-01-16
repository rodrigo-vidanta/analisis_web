/**
 * ============================================
 * GESTOR DE CAMPAÑAS WHATSAPP
 * ============================================
 * 
 * Sistema completo para crear y gestionar campañas de envío masivo de WhatsApp.
 * - Vista de cards con búsqueda y filtros
 * - Modal de creación tipo Meta con preview de celular
 * - Integración con plantillas y audiencias
 * - Webhook para ejecución de campañas
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Ban,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  Send,
  Smartphone,
  X,
  RefreshCw,
  Zap,
  TrendingUp,
  BarChart3,
  Loader2,
  GitBranch,
  Split,
  Sparkles,
  Rocket
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { supabaseSystemUI } from '../../../config/supabaseSystemUI';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiToken } from '../../../services/apiTokensService';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { 
  WhatsAppCampaign, 
  WhatsAppTemplate, 
  WhatsAppAudience,
  CampaignStatus,
  CampaignType,
  CreateCampaignInput,
  BroadcastWebhookPayload
} from '../../../types/whatsappTemplates';
import { CAMPAIGN_STATUS_CONFIG, CAMPAIGN_TYPE_CONFIG } from '../../../types/whatsappTemplates';

// ============================================
// CONSTANTES
// ============================================

const BROADCAST_WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/broadcast';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const CampanasManager: React.FC = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [audiences, setAudiences] = useState<WhatsAppAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal de creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<WhatsAppCampaign | null>(null);
  
  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  
  // Vista y paginación
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'cards' ? 12 : 25;
  
  // Ordenamiento
  const [sortColumn, setSortColumn] = useState<keyof WhatsAppCampaign>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar campañas con join a template y audience
      const { data: campaignsData, error: campaignsError } = await analysisSupabase
        .from('whatsapp_campaigns')
        .select(`
          *,
          template:whatsapp_templates!template_id(*),
          audience:whatsapp_audiences!audience_id(*)
        `)
        .order('created_at', { ascending: false });
      
      if (campaignsError) {
        console.error('Error loading campaigns:', campaignsError);
      }
      
      // Cargar analítica desde la vista v_campaign_analytics
      const { data: analyticsData, error: analyticsError } = await analysisSupabase
        .from('v_campaign_analytics')
        .select('*');
      
      if (analyticsError) {
        console.error('Error loading analytics:', analyticsError);
      }
      
      // Crear mapa de analítica por campaign_id
      const analyticsMap = new Map<string, any>();
      (analyticsData || []).forEach(a => {
        analyticsMap.set(a.campaign_id, a);
      });
      
      // Normalizar y enriquecer campañas con analítica
      const normalizedCampaigns = (campaignsData || []).map(c => {
        const analytics = analyticsMap.get(c.id);
        return {
          ...c,
          campaign_type: c.campaign_type || 'standard',
          ab_distribution_a: c.ab_distribution_a ?? 50,
          // Añadir datos de analítica desde la vista
          sent_count: analytics?.actual_sends ?? c.sent_count ?? 0,
          delivered_count: analytics?.delivered_count ?? 0,
          read_count: analytics?.read_count ?? 0,
          replied_count: analytics?.total_replies ?? 0,
          failed_count: analytics?.sent_failed ?? 0,
          reply_rate_percent: analytics?.reply_rate_percent ?? 0,
          effectiveness_score: analytics?.effectiveness_score ?? 0,
        };
      });
      
      // Cargar plantillas activas (sin filtro is_deleted para más flexibilidad)
      const { data: templatesData, error: templatesError } = await analysisSupabase
        .from('whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'APPROVED')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('name');
      
      if (templatesError) {
        console.error('Error loading templates:', templatesError);
      }
      
      // Cargar audiencias activas
      const { data: audiencesData, error: audiencesError } = await analysisSupabase
        .from('whatsapp_audiences')
        .select('*')
        .eq('is_active', true)
        .order('nombre');
      
      if (audiencesError) {
        console.error('Error loading audiences:', audiencesError);
      }
      
      setCampaigns(normalizedCampaigns);
      setTemplates(templatesData || []);
      setAudiences(audiencesData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Referencia para el canal de Realtime
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadData();
    
    // Configurar suscripción Realtime para campañas
    const setupRealtimeSubscription = () => {
      // Limpiar suscripción anterior si existe
      if (realtimeChannelRef.current) {
        analysisSupabase.removeChannel(realtimeChannelRef.current);
      }
      
      // Crear nueva suscripción
      const channel = analysisSupabase
        .channel('whatsapp_campaigns_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'whatsapp_campaigns'
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              // Nueva campaña - cargar con joins
              const { data: newCampaign } = await analysisSupabase
                .from('whatsapp_campaigns')
                .select(`
                  *,
                  template:whatsapp_templates!template_id(*),
                  audience:whatsapp_audiences!audience_id(*)
                `)
                .eq('id', payload.new.id)
                .single();
              
              // Cargar analítica para esta campaña
              const { data: analytics } = await analysisSupabase
                .from('v_campaign_analytics')
                .select('*')
                .eq('campaign_id', payload.new.id)
                .single();
              
              if (newCampaign) {
                setCampaigns(prev => [
                  {
                    ...newCampaign,
                    campaign_type: newCampaign.campaign_type || 'standard',
                    ab_distribution_a: newCampaign.ab_distribution_a ?? 50,
                    // Datos de analítica
                    sent_count: analytics?.actual_sends ?? 0,
                    delivered_count: analytics?.delivered_count ?? 0,
                    read_count: analytics?.read_count ?? 0,
                    replied_count: analytics?.total_replies ?? 0,
                    failed_count: analytics?.sent_failed ?? 0,
                  },
                  ...prev
                ]);
                toast.success('Nueva campaña creada');
              }
            } else if (payload.eventType === 'UPDATE') {
              // Actualizar campaña existente - cargar con joins
              const { data: updatedCampaign } = await analysisSupabase
                .from('whatsapp_campaigns')
                .select(`
                  *,
                  template:whatsapp_templates!template_id(*),
                  audience:whatsapp_audiences!audience_id(*)
                `)
                .eq('id', payload.new.id)
                .single();
              
              // Cargar analítica actualizada
              const { data: updatedAnalytics } = await analysisSupabase
                .from('v_campaign_analytics')
                .select('*')
                .eq('campaign_id', payload.new.id)
                .single();
              
              if (updatedCampaign) {
                setCampaigns(prev => prev.map(c => 
                  c.id === payload.new.id 
                    ? {
                        ...updatedCampaign,
                        campaign_type: updatedCampaign.campaign_type || 'standard',
                        ab_distribution_a: updatedCampaign.ab_distribution_a ?? 50,
                        // Datos de analítica
                        sent_count: updatedAnalytics?.actual_sends ?? updatedCampaign.sent_count ?? 0,
                        delivered_count: updatedAnalytics?.delivered_count ?? 0,
                        read_count: updatedAnalytics?.read_count ?? 0,
                        replied_count: updatedAnalytics?.total_replies ?? 0,
                        failed_count: updatedAnalytics?.sent_failed ?? 0,
                      }
                    : c
                ));
              }
            } else if (payload.eventType === 'DELETE') {
              // Eliminar campaña
              setCampaigns(prev => prev.filter(c => c.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      
      realtimeChannelRef.current = channel;
    };
    
    setupRealtimeSubscription();
    
    // Cleanup al desmontar
    return () => {
      if (realtimeChannelRef.current) {
        analysisSupabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  // ============================================
  // FILTRADO, AGRUPACIÓN Y ORDENAMIENTO
  // ============================================

  // Agrupar campañas A/B por ab_group_id
  const groupedCampaigns = useMemo((): GroupedCampaign[] => {
    let filtered = [...campaigns];
    
    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.nombre.toLowerCase().includes(query) ||
        c.descripcion?.toLowerCase().includes(query) ||
        c.template?.name?.toLowerCase().includes(query) ||
        c.audience?.nombre?.toLowerCase().includes(query)
      );
    }
    
    // Filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    // Ordenamiento
    filtered.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Agrupar por ab_group_id
    const abGroups = new Map<string, WhatsAppCampaign[]>();
    const standaloneCampaigns: WhatsAppCampaign[] = [];
    const processedGroupIds = new Set<string>();
    
    // Separar campañas con ab_group_id de las individuales
    filtered.forEach(campaign => {
      if (campaign.ab_group_id) {
        const existing = abGroups.get(campaign.ab_group_id) || [];
        existing.push(campaign);
        abGroups.set(campaign.ab_group_id, existing);
      } else {
        standaloneCampaigns.push(campaign);
      }
    });
    
    // Construir lista de GroupedCampaign
    const result: GroupedCampaign[] = [];
    
    // Agregar grupos A/B
    abGroups.forEach((groupCampaigns, groupId) => {
      // Ordenar por variante (A primero, B después)
      groupCampaigns.sort((a, b) => {
        const aVariant = a.ab_variant || '';
        const bVariant = b.ab_variant || '';
        return aVariant.localeCompare(bVariant);
      });
      
      const variantA = groupCampaigns.find(c => c.ab_variant === 'A');
      const variantB = groupCampaigns.find(c => c.ab_variant === 'B');
      
      // Calcular estadísticas combinadas
      const combinedStats = {
        totalRecipients: groupCampaigns.reduce((sum, c) => sum + c.total_recipients, 0),
        sentCount: groupCampaigns.reduce((sum, c) => sum + c.sent_count, 0),
        deliveredCount: groupCampaigns.reduce((sum, c) => sum + c.delivered_count, 0),
        readCount: groupCampaigns.reduce((sum, c) => sum + c.read_count, 0),
        repliedCount: groupCampaigns.reduce((sum, c) => sum + c.replied_count, 0),
        failedCount: groupCampaigns.reduce((sum, c) => sum + c.failed_count, 0),
      };
      
      // Extraer nombre base (sin " - Variante A/B")
      const baseName = variantA?.nombre.replace(/ - Variante [AB]$/i, '') || 
                       variantB?.nombre.replace(/ - Variante [AB]$/i, '') || 
                       'Campaña A/B';
      
      result.push({
        type: 'ab_group',
        abGroupId: groupId,
        variantA,
        variantB,
        combinedName: baseName,
        combinedStats,
      });
    });
    
    // Agregar campañas individuales
    standaloneCampaigns.forEach(campaign => {
      result.push({
        type: 'single',
        campaign,
      });
    });
    
    // Re-ordenar por fecha de creación
    result.sort((a, b) => {
      const aDate = a.type === 'ab_group' 
        ? (a.variantA?.created_at || a.variantB?.created_at || '') 
        : (a.campaign?.created_at || '');
      const bDate = b.type === 'ab_group' 
        ? (b.variantA?.created_at || b.variantB?.created_at || '') 
        : (b.campaign?.created_at || '');
      
      return sortDirection === 'asc' 
        ? aDate.localeCompare(bDate) 
        : bDate.localeCompare(aDate);
    });
    
    return result;
  }, [campaigns, searchQuery, statusFilter, sortColumn, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(groupedCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = groupedCampaigns.slice(startIndex, startIndex + itemsPerPage);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, viewMode]);

  // ============================================
  // ACCIONES DE CAMPAÑA
  // ============================================

  const handleDelete = async (campaign: WhatsAppCampaign) => {
    if (campaign.status === 'running') {
      toast.error('No se puede eliminar una campaña en ejecución');
      return;
    }
    
    // Para campañas A/B con ab_group_id, eliminar ambas variantes
    const isABWithGroup = campaign.ab_group_id && campaign.campaign_type === 'ab_test';
    const confirmMessage = isABWithGroup
      ? `¿Estás seguro de eliminar la campaña A/B "${campaign.nombre.replace(/ - Variante [AB]$/i, '')}" y sus variantes?`
      : `¿Estás seguro de eliminar la campaña "${campaign.nombre}"?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      if (isABWithGroup && campaign.ab_group_id) {
        // Eliminar todas las campañas del grupo A/B
        const { error } = await analysisSupabase
          .from('whatsapp_campaigns')
          .delete()
          .eq('ab_group_id', campaign.ab_group_id);
        
        if (error) throw error;
        
        toast.success('Campaña A/B eliminada (ambas variantes)');
      } else {
        // Eliminar campaña individual
        const { error } = await analysisSupabase
          .from('whatsapp_campaigns')
          .delete()
          .eq('id', campaign.id);
        
        if (error) throw error;
        
        toast.success('Campaña eliminada');
      }
      
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Error al eliminar campaña');
    }
  };

  const handleStatusChange = async (campaign: WhatsAppCampaign, newStatus: CampaignStatus) => {
    try {
      const { error } = await analysisSupabase
        .from('whatsapp_campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);
      
      if (error) throw error;
      
      toast.success(`Estado actualizado a: ${CAMPAIGN_STATUS_CONFIG[newStatus].label}`);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const stats = useMemo(() => {
    const total = campaigns.length;
    const running = campaigns.filter(c => c.status === 'running').length;
    const scheduled = campaigns.filter(c => c.status === 'scheduled').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
    const totalReplied = campaigns.reduce((acc, c) => acc + c.replied_count, 0);
    
    return { total, running, scheduled, completed, totalSent, totalReplied };
  }, [campaigns]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestión de Campañas
        </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crea y gestiona campañas de envío masivo de WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingCampaign(null);
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Crear Campaña
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Play className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.running}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">En ejecución</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scheduled}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Programadas</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completadas</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Send className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSent.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enviados</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReplied.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Respuestas</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar campañas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
            />
          </div>

          {/* Filtro de estado */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(CAMPAIGN_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Selector de vista */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Table className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contador de resultados */}
      {groupedCampaigns.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {groupedCampaigns.length} campaña{groupedCampaigns.length !== 1 ? 's' : ''} 
            {(searchQuery || statusFilter !== 'all') && ' encontrada' + (groupedCampaigns.length !== 1 ? 's' : '')}
          </p>
        </div>
      )}

      {/* Vista de campañas */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400">Cargando campañas...</p>
          </div>
        </div>
      ) : groupedCampaigns.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery || statusFilter !== 'all' 
              ? 'No se encontraron campañas'
              : 'No hay campañas creadas'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Intenta con otros filtros de búsqueda'
              : 'Crea tu primera campaña para comenzar a enviar mensajes masivos'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all inline-flex items-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Campaña
            </motion.button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <>
          {/* Vista de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedCampaigns.map((grouped, index) => {
                const key = grouped.type === 'ab_group' 
                  ? grouped.abGroupId 
                  : grouped.campaign?.id;
                const primaryCampaign = grouped.type === 'ab_group' 
                  ? grouped.variantA 
                  : grouped.campaign;
                
                return (
                  <CampaignCard
                    key={key}
                    groupedCampaign={grouped}
                    index={index}
                    onEdit={(campaign) => {
                      setEditingCampaign(campaign);
                      setShowCreateModal(true);
                    }}
                    onDelete={(campaign) => handleDelete(campaign)}
                    onStatusChange={(campaign, status) => handleStatusChange(campaign, status)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <>
          {/* Vista de Grid/Tabla */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <SortableHeader column="nombre" label="Nombre" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Plantilla(s)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Audiencia</th>
                    <SortableHeader column="status" label="Estado" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <SortableHeader column="total_recipients" label="Destinatarios" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <SortableHeader column="sent_count" label="Enviados" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <SortableHeader column="created_at" label="Creada" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedCampaigns.map((grouped) => {
                    const isABGroup = grouped.type === 'ab_group';
                    const displayCampaign = isABGroup ? grouped.variantA : grouped.campaign;
                    if (!displayCampaign) return null;
                    
                    const key = isABGroup ? grouped.abGroupId : displayCampaign.id;
                    const displayName = isABGroup 
                      ? grouped.combinedName 
                      : displayCampaign.nombre;
                    const stats = isABGroup && grouped.combinedStats 
                      ? grouped.combinedStats 
                      : {
                          totalRecipients: displayCampaign.total_recipients,
                          sentCount: displayCampaign.sent_count,
                        };
                    const isRunning = isABGroup 
                      ? (grouped.variantA?.status === 'running' || grouped.variantB?.status === 'running')
                      : displayCampaign.status === 'running';
                    
                    return (
                      <motion.tr
                        key={key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isABGroup ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded">A/B</span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Estándar</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isABGroup ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="text-blue-500 font-medium">A:</span> {grouped.variantA?.template?.name || '-'}
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="text-pink-500 font-medium">B:</span> {grouped.variantB?.template?.name || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600 dark:text-gray-400">{displayCampaign.template?.name || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{displayCampaign.audience?.nombre || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={displayCampaign.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                          {stats.totalRecipients.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {stats.sentCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(displayCampaign.created_at).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingCampaign(displayCampaign);
                                setShowCreateModal(true);
                              }}
                              disabled={isRunning}
                              title={isRunning ? 'No se puede editar una campaña en ejecución' : 'Editar campaña'}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(displayCampaign)}
                              disabled={isRunning}
                              title={isRunning ? 'No se puede eliminar una campaña en ejecución' : 'Eliminar campaña'}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, groupedCampaigns.length)} de {groupedCampaigns.length} campañas
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCampaign(null);
        }}
        onCreated={() => {
          loadData();
          setShowCreateModal(false);
          setEditingCampaign(null);
        }}
        templates={templates}
        audiences={audiences}
        editingCampaign={editingCampaign}
        user={user}
      />
    </div>
  );
};

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface SortableHeaderProps {
  column: keyof WhatsAppCampaign;
  label: string;
  sortColumn: keyof WhatsAppCampaign;
  sortDirection: 'asc' | 'desc';
  onSort: (column: keyof WhatsAppCampaign) => void;
  onDirection: (dir: 'asc' | 'desc') => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ column, label, sortColumn, sortDirection, onSort, onDirection }) => (
  <th className="px-4 py-3 text-left">
    <button
      onClick={() => {
        if (sortColumn === column) {
          onDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
          onSort(column);
          onDirection('asc');
        }
      }}
      className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      {label}
      {sortColumn === column ? (
        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  </th>
);

const StatusBadge: React.FC<{ status: CampaignStatus }> = ({ status }) => {
  const config = CAMPAIGN_STATUS_CONFIG[status];
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${config.color} ${config.bgColor}`}>
      {config.label}
    </span>
  );
};

// ============================================
// TIPOS PARA CAMPAÑAS AGRUPADAS
// ============================================

interface GroupedCampaign {
  type: 'single' | 'ab_group';
  // Para campañas individuales (standard o A/B sin grupo)
  campaign?: WhatsAppCampaign;
  // Para grupos A/B
  abGroupId?: string;
  variantA?: WhatsAppCampaign;
  variantB?: WhatsAppCampaign;
  // Datos combinados para A/B
  combinedName?: string;
  combinedStats?: {
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    repliedCount: number;
    failedCount: number;
  };
}

// ============================================
// CARD DE CAMPAÑA (SOPORTA INDIVIDUAL Y A/B AGRUPADO)
// ============================================

interface CampaignCardProps {
  groupedCampaign: GroupedCampaign;
  index: number;
  onEdit: (campaign: WhatsAppCampaign) => void;
  onDelete: (campaign: WhatsAppCampaign) => void;
  onStatusChange: (campaign: WhatsAppCampaign, status: CampaignStatus) => void;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ groupedCampaign, index, onEdit, onDelete, onStatusChange }) => {
  const isABGroup = groupedCampaign.type === 'ab_group';
  
  // Para campañas individuales
  const campaign = groupedCampaign.campaign;
  
  // Para grupos A/B
  const variantA = groupedCampaign.variantA;
  const variantB = groupedCampaign.variantB;
  
  // Determinar datos a mostrar
  const displayCampaign = isABGroup ? variantA : campaign;
  if (!displayCampaign) return null;
  
  const config = CAMPAIGN_STATUS_CONFIG[displayCampaign.status];
  const isABTest = isABGroup || displayCampaign.campaign_type === 'ab_test';
  
  // Estadísticas combinadas para A/B
  const stats = isABGroup && groupedCampaign.combinedStats 
    ? groupedCampaign.combinedStats 
    : {
        totalRecipients: displayCampaign.total_recipients,
        sentCount: displayCampaign.sent_count,
        deliveredCount: displayCampaign.delivered_count,
        readCount: displayCampaign.read_count,
        repliedCount: displayCampaign.replied_count,
        failedCount: displayCampaign.failed_count,
      };
  
  // Nombre a mostrar
  const displayName = isABGroup 
    ? groupedCampaign.combinedName || variantA?.nombre.replace(' - Variante A', '') || 'Campaña A/B'
    : displayCampaign.nombre;
  
  // Determinar si alguna variante está en ejecución
  const isRunning = isABGroup 
    ? variantA?.status === 'running' || variantB?.status === 'running'
    : displayCampaign.status === 'running';
  
  const getStatusIcon = () => {
    switch (displayCampaign.status) {
      case 'draft': return FileText;
      case 'scheduled': return Calendar;
      case 'running': return Play;
      case 'paused': return Pause;
      case 'completed': return CheckCircle;
      case 'failed': return XCircle;
      case 'cancelled': return Ban;
      default: return FileText;
    }
  };
  
  const StatusIcon = getStatusIcon();
  
  const successRate = stats.sentCount > 0 
    ? ((stats.deliveredCount / stats.sentCount) * 100).toFixed(1) 
    : '0';
  
  const replyRate = stats.sentCount > 0 
    ? ((stats.repliedCount / stats.sentCount) * 100).toFixed(1) 
    : '0';
  
  // Distribución A/B
  const distributionA = isABGroup && variantA && variantB
    ? Math.round((variantA.total_recipients / (variantA.total_recipients + variantB.total_recipients)) * 100)
    : displayCampaign.ab_distribution_a || 50;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 overflow-hidden hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-gray-500/5"
    >
      {/* Barra de estado superior */}
      <div className={`h-1.5 ${isABTest ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'}`} />
      
      {/* Contenido */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={displayName}>
                {displayName}
              </h3>
              {isABTest && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded">
                  A/B
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={displayCampaign.status} />
              {isABGroup && variantB && variantB.status !== variantA?.status && (
                <StatusBadge status={variantB.status} />
              )}
            </div>
          </div>
          
          {/* Acciones */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.button
              whileHover={!isRunning ? { scale: 1.1 } : {}}
              whileTap={!isRunning ? { scale: 0.9 } : {}}
              onClick={() => onEdit(displayCampaign)}
              disabled={isRunning}
              title={isRunning ? 'No se puede editar una campaña en ejecución' : 'Editar campaña'}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={!isRunning ? { scale: 1.1 } : {}}
              whileTap={!isRunning ? { scale: 0.9 } : {}}
              onClick={() => {
                // Para grupos A/B, eliminar ambas variantes
                if (isABGroup && variantA && variantB) {
                  onDelete(variantA);
                  // La segunda eliminación se manejará en el handler
                } else {
                  onDelete(displayCampaign);
                }
              }}
              disabled={isRunning}
              title={isRunning ? 'No se puede eliminar una campaña en ejecución' : 'Eliminar campaña'}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
        
        {/* Fecha de ejecución */}
        {displayCampaign.execute_at && (
          <div className={`mb-3 p-2 rounded-lg text-xs flex items-center gap-2 ${
            displayCampaign.status === 'scheduled' 
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
              : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
          }`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(displayCampaign.execute_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        )}
        
        {/* Plantillas y Audiencia */}
        <div className="space-y-2 mb-3">
          {/* Plantilla A */}
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{isABGroup ? variantA?.template?.name : displayCampaign.template?.name || 'Sin plantilla'}</span>
            {isABTest && (
              <span className="px-1 py-0.5 text-[8px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">A</span>
            )}
          </div>
          
          {/* Plantilla B (para grupos A/B) */}
          {isABGroup && variantB && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{variantB.template?.name || 'Sin plantilla'}</span>
              <span className="px-1 py-0.5 text-[8px] font-bold bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded">B</span>
            </div>
          )}
          
          {/* Audiencia */}
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{displayCampaign.audience?.nombre || 'Sin audiencia'}</span>
          </div>
        </div>
        
        {/* Barra de progreso y estadísticas de envío */}
        {isABTest ? (
          // Distribución y progreso A/B
          <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-pink-50 dark:from-blue-900/20 dark:to-pink-900/20 rounded-lg">
            {/* Header con destinatarios */}
            <div className="flex items-center justify-between text-[10px] font-medium mb-2">
              <span className="text-blue-600 dark:text-blue-400">
                A: {isABGroup && variantA ? variantA.total_recipients.toLocaleString() : `${distributionA}%`}
              </span>
              <span className="text-pink-600 dark:text-pink-400">
                B: {isABGroup && variantB ? variantB.total_recipients.toLocaleString() : `${100 - distributionA}%`}
              </span>
            </div>
            
            {/* Barras de progreso por variante: 3 estados */}
            <div className="grid grid-cols-2 gap-3">
              {/* Variante A */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Variante A</span>
                  <span className="text-purple-500 font-medium">
                    {variantA && variantA.sent_count > 0
                      ? Math.round((variantA.replied_count / variantA.sent_count) * 100)
                      : 0}% resp
                  </span>
                </div>
                {/* Barra 3 colores: [Respondidos|Enviados sin resp|No enviados] */}
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {/* Respondidos (púrpura) */}
                  <div 
                    className="bg-purple-500 transition-all duration-500" 
                    style={{ 
                      width: `${variantA && variantA.total_recipients > 0
                        ? Math.min(100, (variantA.replied_count / variantA.total_recipients) * 100)
                        : 0}%` 
                    }}
                  />
                  {/* Enviados sin respuesta (azul) */}
                  <div 
                    className="bg-blue-400 transition-all duration-500" 
                    style={{ 
                      width: `${variantA && variantA.total_recipients > 0
                        ? Math.min(100, ((variantA.sent_count - variantA.replied_count) / variantA.total_recipients) * 100)
                        : 0}%` 
                    }}
                  />
                  {/* No enviados = fondo gris (flex-1 no necesario, ya está el bg) */}
                </div>
                {/* Stats con iconos */}
                <div className="flex items-center justify-between text-[8px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-0.5">
                    <Send className="w-2.5 h-2.5 text-blue-500" />
                    <span>{variantA?.sent_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5 text-emerald-500" />
                    <span>{variantA?.read_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MessageSquare className="w-2.5 h-2.5 text-purple-500" />
                    <span>{variantA?.replied_count || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Variante B */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-pink-600 dark:text-pink-400 font-semibold">Variante B</span>
                  <span className="text-purple-500 font-medium">
                    {variantB && variantB.sent_count > 0
                      ? Math.round((variantB.replied_count / variantB.sent_count) * 100)
                      : 0}% resp
                  </span>
                </div>
                {/* Barra 3 colores: [Respondidos|Enviados sin resp|No enviados] */}
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {/* Respondidos (púrpura) */}
                  <div 
                    className="bg-purple-500 transition-all duration-500" 
                    style={{ 
                      width: `${variantB && variantB.total_recipients > 0
                        ? Math.min(100, (variantB.replied_count / variantB.total_recipients) * 100)
                        : 0}%` 
                    }}
                  />
                  {/* Enviados sin respuesta (rosa) */}
                  <div 
                    className="bg-pink-400 transition-all duration-500" 
                    style={{ 
                      width: `${variantB && variantB.total_recipients > 0
                        ? Math.min(100, ((variantB.sent_count - variantB.replied_count) / variantB.total_recipients) * 100)
                        : 0}%` 
                    }}
                  />
                  {/* No enviados = fondo gris */}
                </div>
                {/* Stats con iconos */}
                <div className="flex items-center justify-between text-[8px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-0.5">
                    <Send className="w-2.5 h-2.5 text-pink-500" />
                    <span>{variantB?.sent_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5 text-emerald-500" />
                    <span>{variantB?.read_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MessageSquare className="w-2.5 h-2.5 text-purple-500" />
                    <span>{variantB?.replied_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Leyenda */}
            <div className="mt-2 flex items-center justify-center gap-3 text-[7px] text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-purple-500" />
                <span>Resp</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-blue-400" />
                <span>Env</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-gray-200 dark:bg-gray-700" />
                <span>Pend</span>
              </div>
            </div>
          </div>
        ) : (
          // Barra de progreso para campaña estándar - 3 colores
          <div className="mb-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between text-[10px] font-medium mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                Tasa de respuesta
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                {stats.sentCount > 0 
                  ? Math.round((stats.repliedCount / stats.sentCount) * 100) 
                  : 0}%
              </span>
            </div>
            {/* Barra 3 colores: [Respondidos|Enviados sin resp|No enviados] */}
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {/* Respondidos (púrpura) */}
              <div 
                className="bg-purple-500 transition-all duration-500" 
                style={{ 
                  width: `${stats.totalRecipients > 0 
                    ? Math.min(100, (stats.repliedCount / stats.totalRecipients) * 100) 
                    : 0}%` 
                }}
              />
              {/* Enviados sin respuesta (azul) */}
              <div 
                className="bg-blue-400 transition-all duration-500" 
                style={{ 
                  width: `${stats.totalRecipients > 0 
                    ? Math.min(100, ((stats.sentCount - stats.repliedCount) / stats.totalRecipients) * 100) 
                    : 0}%` 
                }}
              />
              {/* No enviados = fondo gris */}
            </div>
            {/* Leyenda */}
            <div className="mt-2 flex items-center justify-center gap-3 text-[8px] text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-purple-500" />
                <span>Resp</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-blue-400" />
                <span>Env</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-gray-200 dark:bg-gray-700" />
                <span>Pend</span>
              </div>
            </div>
            {/* Estadísticas con iconos */}
            <div className="mt-2.5 flex items-center justify-center gap-3 text-[9px]">
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100/50 dark:bg-blue-900/30 rounded">
                <Send className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">{stats.sentCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100/50 dark:bg-emerald-900/30 rounded">
                <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300">{stats.readCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100/50 dark:bg-purple-900/30 rounded">
                <MessageSquare className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="text-purple-700 dark:text-purple-300">{stats.repliedCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Estadísticas Combinadas */}
        <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalRecipients.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-gray-700">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.sentCount.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Enviados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.repliedCount.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Respuestas</p>
          </div>
        </div>
        
        {/* Tasas */}
        {stats.sentCount > 0 && (
          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-3">
            <span>Entrega: {successRate}%</span>
            <span>Respuesta: {replyRate}%</span>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{new Date(displayCampaign.created_at).toLocaleDateString('es-MX')}</span>
          </div>
          
          {/* Batch info */}
          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <Zap className="w-3 h-3" />
            <span>{displayCampaign.batch_size}/min</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// PHONE MOCKUP COMPONENT
// ============================================

interface PhoneMockupProps {
  template: WhatsAppTemplate | undefined;
  message: string;
  variant?: 'A' | 'B';
  recipients: number;
  previewProspect: any;
}

const PhoneMockup: React.FC<PhoneMockupProps> = ({ template, message, variant, recipients, previewProspect }) => {
  const gradientFrom = variant === 'A' ? 'from-blue-500' : variant === 'B' ? 'from-pink-500' : 'from-emerald-500';
  const gradientTo = variant === 'A' ? 'to-cyan-500' : variant === 'B' ? 'to-rose-500' : 'to-teal-500';
  
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      {/* Etiqueta variante */}
      {variant && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-3 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg ${
            variant === 'A' 
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
              : 'bg-gradient-to-r from-pink-500 to-rose-500'
          }`}
        >
          Variante {variant} • {recipients.toLocaleString()} prospectos
        </motion.div>
      )}
      
      {/* Mockup de celular */}
      <div className="relative w-52 sm:w-56 md:w-60">
        {/* Frame del celular */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: variant === 'B' ? 0.1 : 0 }}
          className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl"
        >
          {/* Notch */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-700"></div>
          </div>
          
          {/* Pantalla */}
          <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden">
            {/* Header de WhatsApp */}
            <div className="bg-[#202c33] px-3 py-2 pt-8 flex items-center gap-2">
              {/* Logo de hoja animado */}
              <motion.div 
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg`}
                animate={{ 
                  rotate: [0, 3, -3, 0],
                  scale: [1, 1.03, 1]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              >
                {/* Icono de hoja (como el del sidebar) */}
                <motion.svg 
                  className="w-5 h-5 text-white" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  animate={{ 
                    y: [0, -1, 0],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                </motion.svg>
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">Vidanta Vacations</p>
                <div className="flex items-center gap-1">
                  <motion.div 
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <p className="text-gray-400 text-[10px]">en línea</p>
                </div>
              </div>
            </div>
            
            {/* Chat area - Fondo estilo WhatsApp con scroll */}
            <div 
              className="h-80 sm:h-96 relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cpattern id='pattern' patternUnits='userSpaceOnUse' width='40' height='40'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='%23128c7e' stroke-width='0.3' opacity='0.15'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='%23090e11'/%3E%3Crect width='200' height='200' fill='url(%23pattern)'/%3E%3C/svg%3E")`,
                backgroundColor: '#090e11'
              }}
            >
              {template ? (
                <div className="h-full flex flex-col">
                  {/* Contenedor scrolleable para el mensaje */}
                  <div 
                    className="flex-1 overflow-y-auto p-3"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    }}
                  >
                    <style>{`
                      .chat-scroll::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="chat-scroll"
                    >
                      {/* Mensaje principal */}
                      <div className="bg-[#005c4b] rounded-xl rounded-tl-sm p-3 max-w-[90%] shadow-lg">
                        <p className="text-white text-[13px] leading-relaxed whitespace-pre-wrap">
                          {message || 'Mensaje de ejemplo...'}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          <span className="text-[10px] text-gray-300">
                            {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            <path d="M5 16.17L0.83 12l-1.42 1.41L5 19 17 7l-1.41-1.41L5 16.17z" transform="translate(4,0)"/>
          </svg>
        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <motion.div 
                    className="text-center"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Smartphone className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">
                      Selecciona una<br />plantilla
                    </p>
                  </motion.div>
      </div>
              )}
            </div>
            
            {/* Input area */}
            <div className="bg-[#202c33] px-3 py-2.5 flex items-center gap-2">
              <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                <p className="text-gray-500 text-xs">Escribe un mensaje</p>
              </div>
              <motion.div 
                className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Label de plantilla - debajo del celular */}
      {template && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800/80 text-[11px] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <span className="text-emerald-500">📋</span>
            <span className="truncate max-w-[150px]">{template.name}</span>
          </span>
        </motion.div>
      )}
    </div>
  );
};

// ============================================
// MODAL DE CREACIÓN DE CAMPAÑA
// ============================================

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  templates: WhatsAppTemplate[];
  audiences: WhatsAppAudience[];
  editingCampaign: WhatsAppCampaign | null;
  user: any;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  templates,
  audiences,
  editingCampaign,
  user
}) => {
  // Verificar si la campaña está en ejecución (bloquear edición)
  const isRunning = editingCampaign?.status === 'running';
  
  // Form state
  const [formData, setFormData] = useState<CreateCampaignInput>({
    nombre: '',
    descripcion: '',
    campaign_type: 'standard',
    template_id: '',
    audience_id: '',
    ab_template_b_id: null,
    ab_distribution_a: 50,
    batch_size: 10,
    batch_interval_seconds: 60,
    execute_at: null,
    scheduled_at: null
  });
  
  const [saving, setSaving] = useState(false);
  const [prospectCount, setProspectCount] = useState(0);
  const [countingProspects, setCountingProspects] = useState(false);
  const [previewProspect, setPreviewProspect] = useState<any>(null);
  const [executeOption, setExecuteOption] = useState<'now' | 'scheduled'>('now');
  
  // ============================================
  // VALIDACIÓN DE COBERTURA DE VARIABLES - PLANTILLA A
  // ============================================
  const [variableCoverage, setVariableCoverage] = useState<{
    totalProspects: number;
    prospectsWithVariables: number;
    prospectsWithoutVariables: number;
    coveragePercent: number;
    requiredFields: string[];
    isAnalyzing: boolean;
    requiresABTest: boolean;
  }>({
    totalProspects: 0,
    prospectsWithVariables: 0,
    prospectsWithoutVariables: 0,
    coveragePercent: 100,
    requiredFields: [],
    isAnalyzing: false,
    requiresABTest: false
  });
  
  // ============================================
  // VALIDACIÓN DE COBERTURA DE VARIABLES - PLANTILLA B
  // ============================================
  const [templateBCoverage, setTemplateBCoverage] = useState<{
    isValid: boolean;
    coveragePercent: number;
    requiredFields: string[];
    isAnalyzing: boolean;
    errorMessage: string;
  }>({
    isValid: true,
    coveragePercent: 100,
    requiredFields: [],
    isAnalyzing: false,
    errorMessage: ''
  });
  
  // ============================================
  // PLANTILLAS VÁLIDAS PARA B (100% cobertura)
  // ============================================
  const [validTemplatesForB, setValidTemplatesForB] = useState<{
    templateIds: string[];
    isCalculating: boolean;
  }>({
    templateIds: [],
    isCalculating: false
  });
  
  // Datos seleccionados
  const selectedTemplate = templates.find(t => t.id === formData.template_id);
  const selectedTemplateB = templates.find(t => t.id === formData.ab_template_b_id);
  const selectedAudience = audiences.find(a => a.id === formData.audience_id);
  
  // ============================================
  // HELPER: Extraer campos requeridos de variable_mappings
  // ============================================
  const getRequiredFieldsFromTemplate = useCallback((template: WhatsAppTemplate | undefined): string[] => {
    if (!template?.variable_mappings) return [];
    
    let mappings: any[] = [];
    
    // Parsear variable_mappings (puede venir como string, array, o objeto)
    try {
      if (typeof template.variable_mappings === 'string') {
        mappings = JSON.parse(template.variable_mappings);
      } else if (Array.isArray(template.variable_mappings)) {
        mappings = template.variable_mappings;
      } else if (typeof template.variable_mappings === 'object' && 'mappings' in (template.variable_mappings as any)) {
        mappings = (template.variable_mappings as any).mappings || [];
      }
    } catch (e) {
      console.error('Error parsing variable_mappings:', e);
      return [];
    }
    
    if (!Array.isArray(mappings)) return [];
    
    // Filtrar solo campos de la tabla prospectos (no variables del sistema)
    const prospectoFields = mappings
      .filter((m: any) => 
        m.table_name === 'prospectos' && 
        !m.is_system_variable &&
        m.field_name
      )
      .map((m: any) => m.field_name);
    
    return [...new Set(prospectoFields)]; // Eliminar duplicados
  }, []);
  
  // ============================================
  // HELPER: Verificar si plantilla tiene variables dinámicas
  // ============================================
  const templateHasVariables = useCallback((template: WhatsAppTemplate | undefined): boolean => {
    const fields = getRequiredFieldsFromTemplate(template);
    return fields.length > 0;
  }, [getRequiredFieldsFromTemplate]);
  
  // ============================================
  // HELPER: Filtrar plantillas sin variables (para B)
  // ============================================
  const templatesWithoutVariables = useMemo(() => {
    return templates.filter(t => !templateHasVariables(t));
  }, [templates, templateHasVariables]);
  
  // Cálculos A/B - usar cobertura de variables cuando hay datos
  const recipientsA = formData.campaign_type === 'ab_test' 
    ? (variableCoverage.requiresABTest 
        ? variableCoverage.prospectsWithVariables 
        : Math.floor(prospectCount * (formData.ab_distribution_a || 50) / 100))
    : prospectCount;
  const recipientsB = formData.campaign_type === 'ab_test' 
    ? (variableCoverage.requiresABTest 
        ? variableCoverage.prospectsWithoutVariables 
        : prospectCount - recipientsA)
    : 0;
  
  // Reset form cuando se abre/cierra
  useEffect(() => {
    if (editingCampaign) {
      setFormData({
        nombre: editingCampaign.nombre,
        descripcion: editingCampaign.descripcion || '',
        campaign_type: editingCampaign.campaign_type || 'standard',
        template_id: editingCampaign.template_id,
        audience_id: editingCampaign.audience_id,
        ab_template_b_id: editingCampaign.ab_template_b_id || null,
        ab_distribution_a: editingCampaign.ab_distribution_a || 50,
        batch_size: editingCampaign.batch_size,
        batch_interval_seconds: editingCampaign.batch_interval_seconds,
        execute_at: editingCampaign.execute_at || null,
        scheduled_at: editingCampaign.scheduled_at
      });
      setExecuteOption(editingCampaign.execute_at ? 'scheduled' : 'now');
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        campaign_type: 'standard',
        template_id: '',
        audience_id: '',
        ab_template_b_id: null,
        ab_distribution_a: 50,
        batch_size: 10,
        batch_interval_seconds: 60,
        execute_at: null,
        scheduled_at: null
      });
      setExecuteOption('now');
    }
    
    // Resetear estado de cobertura cuando se abre/cierra el modal
    if (!isOpen) {
      setVariableCoverage({
        totalProspects: 0,
        prospectsWithVariables: 0,
        prospectsWithoutVariables: 0,
        coveragePercent: 100,
        requiredFields: [],
        isAnalyzing: false,
        requiresABTest: false
      });
      setTemplateBCoverage({
        isValid: true,
        coveragePercent: 100,
        requiredFields: [],
        isAnalyzing: false,
        errorMessage: ''
      });
      setValidTemplatesForB({
        templateIds: [],
        isCalculating: false
      });
    }
  }, [editingCampaign, isOpen]);
  
  // ============================================
  // EFECTO: Calcular qué plantillas son válidas para B (100% cobertura)
  // ============================================
  useEffect(() => {
    // Si no es A/B test, limpiar
    if (formData.campaign_type !== 'ab_test' || !isOpen) {
      setValidTemplatesForB({ templateIds: [], isCalculating: false });
      return;
    }
    
    // Las plantillas sin variables SIEMPRE son válidas (100% cobertura garantizada)
    const templatesNoVarsIds = templates
      .filter(t => t.id !== formData.template_id && !templateHasVariables(t))
      .map(t => t.id);
    
    // Si no hay audiencia aún, mostrar al menos las plantillas sin variables
    if (!formData.audience_id) {
      setValidTemplatesForB({ 
        templateIds: templatesNoVarsIds, 
        isCalculating: false 
      });
      return;
    }
    
    const calculateValidTemplatesForB = async () => {
      setValidTemplatesForB(prev => ({ ...prev, isCalculating: true }));
      
      try {
        const audience = audiences.find(a => a.id === formData.audience_id);
        if (!audience) {
          // Si no se encuentra audiencia, al menos mostrar las sin variables
          setValidTemplatesForB({ 
            templateIds: templatesNoVarsIds, 
            isCalculating: false 
          });
          return;
        }
        
        // Para plantillas con variables, calcular cobertura sobre audiencia B
        const templatesWithVars = templates.filter(t => 
          t.id !== formData.template_id && templateHasVariables(t)
        );
        
        const validWithVarsIds: string[] = [];
        
        // Solo calcular para plantillas con variables si hay alguna
        if (templatesWithVars.length > 0) {
          for (const template of templatesWithVars) {
            const templateFields = getRequiredFieldsFromTemplate(template);
            if (templateFields.length === 0) {
              // Si no tiene campos requeridos, es válida
              validWithVarsIds.push(template.id);
              continue;
            }
            
            try {
              // Construir query base para audiencia (o audiencia B si es forzado)
              let queryBuilder = analysisSupabase
                .from('prospectos')
                .select('id', { count: 'exact' });
              
              // Filtros de audiencia
              if (audience.etapas?.length) {
                queryBuilder = queryBuilder.in('etapa', audience.etapas);
              } else if (audience.etapa) {
                queryBuilder = queryBuilder.eq('etapa', audience.etapa);
              }
              if (audience.estado_civil) queryBuilder = queryBuilder.eq('estado_civil', audience.estado_civil);
              if (audience.viaja_con?.length) queryBuilder = queryBuilder.in('viaja_con', audience.viaja_con);
              if (audience.destinos?.length) queryBuilder = queryBuilder.overlaps('destino_preferencia', audience.destinos);
              
              // Filtrar a audiencia B (los que NO tienen variables de A) solo si hay cobertura forzada
              if (variableCoverage.requiresABTest && variableCoverage.requiredFields.length > 0) {
                for (const field of variableCoverage.requiredFields) {
                  queryBuilder = queryBuilder.or(`${field}.is.null,${field}.eq.`);
                }
              }
              
              // Contar total de audiencia (o audiencia B)
              const { count: totalCount } = await queryBuilder.limit(0);
              
              // Ahora contar los que SÍ tienen las variables de esta plantilla
              let withVarsQuery = analysisSupabase
                .from('prospectos')
                .select('id', { count: 'exact' });
              
              if (audience.etapas?.length) {
                withVarsQuery = withVarsQuery.in('etapa', audience.etapas);
              } else if (audience.etapa) {
                withVarsQuery = withVarsQuery.eq('etapa', audience.etapa);
              }
              if (audience.estado_civil) withVarsQuery = withVarsQuery.eq('estado_civil', audience.estado_civil);
              if (audience.viaja_con?.length) withVarsQuery = withVarsQuery.in('viaja_con', audience.viaja_con);
              if (audience.destinos?.length) withVarsQuery = withVarsQuery.overlaps('destino_preferencia', audience.destinos);
              
              if (variableCoverage.requiresABTest && variableCoverage.requiredFields.length > 0) {
                for (const field of variableCoverage.requiredFields) {
                  withVarsQuery = withVarsQuery.or(`${field}.is.null,${field}.eq.`);
                }
              }
              
              // Los que tienen las variables de esta plantilla
              for (const field of templateFields) {
                withVarsQuery = withVarsQuery.not(field, 'is', null);
                withVarsQuery = withVarsQuery.neq(field, '');
              }
              
              const { count: withVars } = await withVarsQuery.limit(0);
              
              // Si cobertura es 100%, agregar a válidos
              const total = totalCount || 0;
              const valid = withVars || 0;
              if (total > 0 && valid === total) {
                validWithVarsIds.push(template.id);
              } else if (total === 0) {
                // Si no hay audiencia objetivo, cualquier plantilla es válida
                validWithVarsIds.push(template.id);
              }
            } catch (err) {
              console.error(`Error checking template ${template.id}:`, err);
            }
          }
        }
        
        // Combinar: plantillas sin variables + plantillas con variables que tienen 100% cobertura
        setValidTemplatesForB({
          templateIds: [...templatesNoVarsIds, ...validWithVarsIds],
          isCalculating: false
        });
        
      } catch (error) {
        console.error('Error calculating valid templates for B:', error);
        // En caso de error, al menos mostrar las sin variables
        setValidTemplatesForB({ 
          templateIds: templatesNoVarsIds, 
          isCalculating: false 
        });
      }
    };
    
    const timer = setTimeout(calculateValidTemplatesForB, 600);
    return () => clearTimeout(timer);
  }, [formData.audience_id, formData.template_id, formData.campaign_type, templates, audiences, isOpen, variableCoverage.requiresABTest, variableCoverage.requiredFields, templateHasVariables, getRequiredFieldsFromTemplate]);
  
  // ============================================
  // EFECTO: Limpiar Plantilla B si ya no es válida
  // ============================================
  useEffect(() => {
    // Si hay una plantilla B seleccionada pero ya no está en la lista de válidas, limpiarla
    if (
      formData.ab_template_b_id && 
      !validTemplatesForB.isCalculating && 
      validTemplatesForB.templateIds.length > 0 &&
      !validTemplatesForB.templateIds.includes(formData.ab_template_b_id)
    ) {
      setFormData(prev => ({ ...prev, ab_template_b_id: null }));
    }
  }, [validTemplatesForB.templateIds, validTemplatesForB.isCalculating, formData.ab_template_b_id]);
  
  // ============================================
  // EFECTO: Validar cobertura de Plantilla B cuando se selecciona
  // La Plantilla B debe tener 100% de cobertura sobre la audiencia B
  // (prospectos que NO tienen las variables de A)
  // ============================================
  useEffect(() => {
    // Si no hay plantilla B seleccionada, es válido
    if (!formData.ab_template_b_id) {
      setTemplateBCoverage({
        isValid: true,
        coveragePercent: 100,
        requiredFields: [],
        isAnalyzing: false,
        errorMessage: ''
      });
      return;
    }
    
    const templateB = templates.find(t => t.id === formData.ab_template_b_id);
    if (!templateB) return;
    
    const templateBFields = getRequiredFieldsFromTemplate(templateB);
    
    // Si la plantilla B no tiene variables dinámicas, es válida (100% cobertura garantizada)
    if (templateBFields.length === 0) {
      setTemplateBCoverage({
        isValid: true,
        coveragePercent: 100,
        requiredFields: [],
        isAnalyzing: false,
        errorMessage: ''
      });
      return;
    }
    
    // Si la plantilla B tiene variables, necesitamos verificar cobertura sobre audiencia B
    const validateTemplateBCoverage = async () => {
      if (!formData.audience_id || !isOpen) return;
      
      setTemplateBCoverage(prev => ({ ...prev, isAnalyzing: true }));
      
      try {
        const audience = audiences.find(a => a.id === formData.audience_id);
        if (!audience) return;
        
        // Construir query base para la audiencia
        let baseQuery = analysisSupabase
          .from('prospectos')
          .select('id', { count: 'exact' });
        
        if (audience.etapas?.length) {
          baseQuery = baseQuery.in('etapa', audience.etapas);
        } else if (audience.etapa) {
          baseQuery = baseQuery.eq('etapa', audience.etapa);
        }
        if (audience.estado_civil) baseQuery = baseQuery.eq('estado_civil', audience.estado_civil);
        if (audience.viaja_con?.length) baseQuery = baseQuery.in('viaja_con', audience.viaja_con);
        if (audience.destinos?.length) baseQuery = baseQuery.overlaps('destino_preferencia', audience.destinos);
        
        // Audiencia B = prospectos que NO tienen las variables de A
        // (solo aplicar si hay cobertura forzada)
        if (variableCoverage.requiresABTest && variableCoverage.requiredFields.length > 0) {
          // Filtrar los que NO tienen las variables de A
          for (const field of variableCoverage.requiredFields) {
            // Usamos .or para obtener los que tienen NULL o están vacíos
            baseQuery = baseQuery.or(`${field}.is.null,${field}.eq.`);
          }
        }
        
        // Ahora contar cuántos de la audiencia B tienen las variables de la plantilla B
        const { count: totalAudienceB } = await baseQuery.limit(0);
        
        // Construir query para los que SÍ tienen las variables de B
        let withBVarsQuery = analysisSupabase
          .from('prospectos')
          .select('id', { count: 'exact' });
        
        if (audience.etapas?.length) {
          withBVarsQuery = withBVarsQuery.in('etapa', audience.etapas);
        } else if (audience.etapa) {
          withBVarsQuery = withBVarsQuery.eq('etapa', audience.etapa);
        }
        if (audience.estado_civil) withBVarsQuery = withBVarsQuery.eq('estado_civil', audience.estado_civil);
        if (audience.viaja_con?.length) withBVarsQuery = withBVarsQuery.in('viaja_con', audience.viaja_con);
        if (audience.destinos?.length) withBVarsQuery = withBVarsQuery.overlaps('destino_preferencia', audience.destinos);
        
        // Filtrar los que NO tienen las variables de A (audiencia B)
        if (variableCoverage.requiresABTest && variableCoverage.requiredFields.length > 0) {
          for (const field of variableCoverage.requiredFields) {
            withBVarsQuery = withBVarsQuery.or(`${field}.is.null,${field}.eq.`);
          }
        }
        
        // Agregar filtro: deben tener las variables de la plantilla B
        for (const field of templateBFields) {
          withBVarsQuery = withBVarsQuery.not(field, 'is', null);
          withBVarsQuery = withBVarsQuery.neq(field, '');
        }
        
        const { count: withBVars } = await withBVarsQuery.limit(0);
        
        const totalB = totalAudienceB || 0;
        const withVars = withBVars || 0;
        const coverage = totalB > 0 ? Math.round((withVars / totalB) * 100) : 100;
        const isValid = coverage === 100;
        
        setTemplateBCoverage({
          isValid,
          coveragePercent: coverage,
          requiredFields: templateBFields,
          isAnalyzing: false,
          errorMessage: isValid 
            ? '' 
            : `La Plantilla B solo cubre ${coverage}% de la audiencia B. Se requiere 100% para evitar prueba C.`
        });
        
        // Si no es válida, mostrar toast de advertencia
        if (!isValid) {
          toast.error(`Plantilla B inválida: solo cubre ${coverage}% de la audiencia B`, {
            duration: 5000
          });
        }
        
      } catch (error) {
        console.error('Error validating template B coverage:', error);
        setTemplateBCoverage(prev => ({ ...prev, isAnalyzing: false }));
      }
    };
    
    const timer = setTimeout(validateTemplateBCoverage, 500);
    return () => clearTimeout(timer);
  }, [formData.ab_template_b_id, formData.audience_id, templates, audiences, isOpen, variableCoverage.requiresABTest, variableCoverage.requiredFields, getRequiredFieldsFromTemplate]);
  
  // Contar prospectos y obtener uno de muestra cuando cambia la audiencia
  useEffect(() => {
    if (!formData.audience_id || !isOpen) return;
    
    const countAndSample = async () => {
      setCountingProspects(true);
      try {
        const audience = audiences.find(a => a.id === formData.audience_id);
        if (!audience) return;
        
        // Construir query con TODOS los filtros de la audiencia
        let query = analysisSupabase
          .from('prospectos')
          .select('*', { count: 'exact' });
        
        // Filtro de etapas (múltiple)
        if (audience.etapas?.length) {
          query = query.in('etapa', audience.etapas);
        } else if (audience.etapa) {
          query = query.eq('etapa', audience.etapa);
        }
        
        // Filtro de estado civil
        if (audience.estado_civil) {
          query = query.eq('estado_civil', audience.estado_civil);
        }
        
        // Filtro de viaja_con
        if (audience.viaja_con && audience.viaja_con.length > 0) {
          query = query.in('viaja_con', audience.viaja_con);
        }
        
        // Filtro de destinos
        if (audience.destinos && audience.destinos.length > 0) {
          query = query.overlaps('destino_preferencia', audience.destinos);
        }
        
        // Filtro de tiene_email
        if (audience.tiene_email === true) {
          query = query.not('email', 'is', null).neq('email', '');
        } else if (audience.tiene_email === false) {
          query = query.or('email.is.null,email.eq.');
        }
        
        // Filtro de con_menores (cantidad_menores > 0)
        if (audience.con_menores === true) {
          query = query.gt('cantidad_menores', 0);
        } else if (audience.con_menores === false) {
          query = query.or('cantidad_menores.is.null,cantidad_menores.eq.0');
        }
        
        // Filtro de etiquetas (requiere consulta a SystemUI)
        if (audience.etiquetas && audience.etiquetas.length > 0) {
          try {
            const { data: labeledProspects } = await supabaseSystemUI
              .from('whatsapp_conversation_labels')
              .select('prospecto_id')
              .in('label_id', audience.etiquetas)
              .eq('label_type', 'preset');
            
            if (labeledProspects && labeledProspects.length > 0) {
              const prospectoIds = [...new Set(labeledProspects.map(lp => lp.prospecto_id))];
              query = query.in('id', prospectoIds);
            } else {
              // No hay prospectos con esas etiquetas
              setProspectCount(0);
              setPreviewProspect(null);
              setCountingProspects(false);
              return;
            }
          } catch (labelError) {
            console.error('Error fetching labeled prospects:', labelError);
          }
        }
        
        // Nota: El filtro de dias_sin_contacto desde mensajes_whatsapp
        // requiere una consulta más compleja. El conteo aquí es aproximado.
        // El valor exacto se calcula cuando se construye la query final para el webhook.
        // Para el preview, usamos una aproximación si hay filtro de días sin contacto.
        
        const { data, count, error } = await query.limit(1);
        
        if (error) throw error;
        
        // Si hay filtro de días sin contacto, hacer conteo adicional
        if (audience.dias_sin_contacto && audience.dias_sin_contacto > 0) {
          // Obtener IDs de prospectos que SÍ tienen mensajes recientes
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - audience.dias_sin_contacto);
          
          try {
            // Obtener prospectos con mensajes recientes (los que NO queremos)
            const { data: recentContacts } = await analysisSupabase
              .from('mensajes_whatsapp')
              .select('prospecto_id')
              .gte('fecha_hora', cutoffDate.toISOString());
            
            const recentIds = new Set((recentContacts || []).map(m => m.prospecto_id));
            
            // Filtrar del conteo total los que tienen mensajes recientes
            // Re-hacer la consulta sin filtro de dias_sin_contacto pero excluyendo los recientes
            if (data && data.length > 0) {
              // Obtener todos los IDs y filtrar
              const { data: allProspects } = await query;
              const filteredCount = (allProspects || []).filter(p => !recentIds.has(p.id)).length;
              setProspectCount(filteredCount);
              // Obtener un prospecto de muestra de los filtrados
              const sampleProspect = (allProspects || []).find(p => !recentIds.has(p.id));
              setPreviewProspect(sampleProspect || null);
            } else {
              setProspectCount(0);
              setPreviewProspect(null);
            }
          } catch (msgError) {
            console.error('Error checking recent messages:', msgError);
            // Fallback al conteo básico
            setProspectCount(count || 0);
            setPreviewProspect(data?.[0] || null);
          }
        } else {
          setProspectCount(count || 0);
          setPreviewProspect(data?.[0] || null);
        }
      } catch (error) {
        console.error('Error counting prospects:', error);
        setProspectCount(0);
        setPreviewProspect(null);
      } finally {
        setCountingProspects(false);
      }
    };
    
    const timer = setTimeout(countAndSample, 300);
    return () => clearTimeout(timer);
  }, [formData.audience_id, audiences, isOpen]);
  
  // ============================================
  // EFECTO: Analizar cobertura de variables cuando cambia plantilla o audiencia
  // ============================================
  useEffect(() => {
    if (!formData.audience_id || !formData.template_id || !isOpen) {
      setVariableCoverage(prev => ({
        ...prev,
        isAnalyzing: false,
        requiresABTest: false,
        coveragePercent: 100
      }));
      return;
    }
    
    const analyzeVariableCoverage = async () => {
      setVariableCoverage(prev => ({ ...prev, isAnalyzing: true }));
      
      try {
        const template = templates.find(t => t.id === formData.template_id);
        const audience = audiences.find(a => a.id === formData.audience_id);
        
        if (!template || !audience) return;
        
        // Obtener campos requeridos de la plantilla
        const requiredFields = getRequiredFieldsFromTemplate(template);
        
        // Si no hay variables dinámicas, cobertura es 100%
        if (requiredFields.length === 0) {
          setVariableCoverage({
            totalProspects: prospectCount,
            prospectsWithVariables: prospectCount,
            prospectsWithoutVariables: 0,
            coveragePercent: 100,
            requiredFields: [],
            isAnalyzing: false,
            requiresABTest: false
          });
          return;
        }
        
        // Construir query base para la audiencia
        let baseQueryBuilder = analysisSupabase
          .from('prospectos')
          .select('id', { count: 'exact' });
        
        if (audience.etapas?.length) {
          baseQueryBuilder = baseQueryBuilder.in('etapa', audience.etapas);
        } else if (audience.etapa) {
          baseQueryBuilder = baseQueryBuilder.eq('etapa', audience.etapa);
        }
        if (audience.estado_civil) {
          baseQueryBuilder = baseQueryBuilder.eq('estado_civil', audience.estado_civil);
        }
        if (audience.viaja_con && audience.viaja_con.length > 0) {
          baseQueryBuilder = baseQueryBuilder.in('viaja_con', audience.viaja_con);
        }
        if (audience.destinos && audience.destinos.length > 0) {
          baseQueryBuilder = baseQueryBuilder.overlaps('destino_preferencia', audience.destinos);
        }
        
        // Contar total de prospectos en la audiencia
        const { count: totalCount } = await baseQueryBuilder.limit(0);
        const total = totalCount || 0;
        
        // Construir query con filtro de campos requeridos (IS NOT NULL para todos)
        let withVariablesQuery = analysisSupabase
          .from('prospectos')
          .select('id', { count: 'exact' });
        
        // Aplicar filtros de audiencia
        if (audience.etapas?.length) {
          withVariablesQuery = withVariablesQuery.in('etapa', audience.etapas);
        } else if (audience.etapa) {
          withVariablesQuery = withVariablesQuery.eq('etapa', audience.etapa);
        }
        if (audience.estado_civil) {
          withVariablesQuery = withVariablesQuery.eq('estado_civil', audience.estado_civil);
        }
        if (audience.viaja_con && audience.viaja_con.length > 0) {
          withVariablesQuery = withVariablesQuery.in('viaja_con', audience.viaja_con);
        }
        if (audience.destinos && audience.destinos.length > 0) {
          withVariablesQuery = withVariablesQuery.overlaps('destino_preferencia', audience.destinos);
        }
        
        // Agregar filtro de campos requeridos (todos deben tener valor)
        for (const field of requiredFields) {
          withVariablesQuery = withVariablesQuery.not(field, 'is', null);
          // También verificar que no esté vacío para strings
          withVariablesQuery = withVariablesQuery.neq(field, '');
        }
        
        const { count: withVarsCount } = await withVariablesQuery.limit(0);
        const withVariables = withVarsCount || 0;
        const withoutVariables = total - withVariables;
        const coverage = total > 0 ? Math.round((withVariables / total) * 100) : 100;
        
        const requiresAB = coverage < 100 && withoutVariables > 0;
        
        setVariableCoverage({
          totalProspects: total,
          prospectsWithVariables: withVariables,
          prospectsWithoutVariables: withoutVariables,
          coveragePercent: coverage,
          requiredFields,
          isAnalyzing: false,
          requiresABTest: requiresAB
        });
        
        // Si requiere A/B test, forzar el tipo de campaña y ajustar distribución
        if (requiresAB && formData.campaign_type === 'standard') {
          setFormData(prev => ({
            ...prev,
            campaign_type: 'ab_test',
            ab_distribution_a: coverage // La distribución A es el % de cobertura
          }));
          toast('Plantilla no aplica a todos los prospectos. Se requiere A/B Test.', {
            icon: '⚠️',
            duration: 4000
          });
        } else if (requiresAB && formData.campaign_type === 'ab_test') {
          // Actualizar distribución automáticamente
          setFormData(prev => ({
            ...prev,
            ab_distribution_a: coverage
          }));
        }
        
      } catch (error) {
        console.error('Error analyzing variable coverage:', error);
        setVariableCoverage(prev => ({ ...prev, isAnalyzing: false }));
      }
    };
    
    const timer = setTimeout(analyzeVariableCoverage, 500);
    return () => clearTimeout(timer);
  }, [formData.audience_id, formData.template_id, templates, audiences, isOpen, prospectCount, getRequiredFieldsFromTemplate]);
  
  // Generar preview del mensaje
  const getMessagePreview = (template: WhatsAppTemplate | undefined) => {
    if (!template) return '';
    
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return '';
    
    let message = bodyComponent.text;
    
    // Reemplazar variables con datos del prospecto de muestra o dummy
    if (previewProspect) {
      message = message.replace(/\{\{1\}\}/g, previewProspect.nombre || 'Juan');
      message = message.replace(/\{\{2\}\}/g, previewProspect.apellido_paterno || '');
      message = message.replace(/\{\{3\}\}/g, previewProspect.destino_preferencia?.[0] || 'Cancún');
    } else {
      message = message.replace(/\{\{1\}\}/g, 'Juan');
      message = message.replace(/\{\{2\}\}/g, 'Pérez');
      message = message.replace(/\{\{3\}\}/g, 'Cancún');
    }
    
    // Limpiar variables restantes
    message = message.replace(/\{\{\d+\}\}/g, '...');
    
    return message;
  };
  
  // Calcular tiempo estimado
  const getEstimatedTime = () => {
    if (!prospectCount || !formData.batch_size) return '-';
    
    const batches = Math.ceil(prospectCount / formData.batch_size);
    const totalSeconds = batches * formData.batch_interval_seconds;
    
    if (totalSeconds < 60) return `${totalSeconds} segundos`;
    if (totalSeconds < 3600) return `${Math.ceil(totalSeconds / 60)} minutos`;
    return `${(totalSeconds / 3600).toFixed(1)} horas`;
  };
  
  // Enviar campaña al webhook (N8N maneja la inserción en BD)
  // SEGURIDAD: No enviamos queries SQL, solo filtros estructurados para evitar SQL injection
  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!formData.template_id) {
      toast.error('Selecciona una plantilla');
      return;
    }
    if (!formData.audience_id) {
      toast.error('Selecciona una audiencia');
      return;
    }
    
    // Validación adicional para A/B obligatorio
    if (variableCoverage.requiresABTest && !formData.ab_template_b_id) {
      toast.error('Debes seleccionar una Plantilla B para los prospectos sin datos completos');
      return;
    }
    
    // Validar que la Plantilla B tenga 100% de cobertura
    if (formData.campaign_type === 'ab_test' && formData.ab_template_b_id && !templateBCoverage.isValid) {
      toast.error(`La Plantilla B solo cubre ${templateBCoverage.coveragePercent}% de la audiencia B. Se requiere 100%.`);
      return;
    }
    
    try {
      setSaving(true);
      
      // Obtener token de autenticación (mismo que livechat)
      const authToken = await getApiToken('pause_bot_auth');
      
      // Obtener datos de la audiencia
      const audience = audiences.find(a => a.id === formData.audience_id);
      
      // Determinar fecha de ejecución
      const executeAt = executeOption === 'now' 
        ? new Date().toISOString() 
        : formData.execute_at;
      
      // Obtener datos de templates para el payload
      const templateA = templates.find(t => t.id === formData.template_id);
      const templateB = formData.ab_template_b_id 
        ? templates.find(t => t.id === formData.ab_template_b_id)
        : null;
      
      const isABTestPayload = formData.campaign_type === 'ab_test' && formData.ab_template_b_id;
      
      // ===========================================
      // Construir cláusulas WHERE (sin SELECT FROM)
      // N8N agregará: SELECT * FROM prospectos + where_clause
      // Lógica EXACTA de AudienciasManager
      // ===========================================
      
      // WHERE base de la audiencia
      let baseWhere = 'WHERE 1=1';
      
      // Filtro de etapas (IN - múltiple)
      if (audience?.etapas?.length) {
        baseWhere += ` AND etapa IN ('${audience.etapas.join("','")}')`;
      } else if (audience?.etapa) {
        // Compatibilidad legacy: etapa singular
        baseWhere += ` AND etapa = '${audience.etapa}'`;
      }
      
      // Filtro de estado civil (eq)
      if (audience?.estado_civil) {
        baseWhere += ` AND estado_civil = '${audience.estado_civil}'`;
      }
      
      // Filtro de viaja_con (IN - el valor del prospecto está en el array de filtros)
      if (audience?.viaja_con?.length) {
        baseWhere += ` AND viaja_con IN ('${audience.viaja_con.join("','")}')`;
      }
      
      // Filtro de destinos (overlaps - el array del prospecto tiene intersección con el filtro)
      if (audience?.destinos?.length) {
        baseWhere += ` AND destino_preferencia && ARRAY['${audience.destinos.join("','")}']::text[]`;
      }
      
      // Filtro de días sin contacto usando mensajes_whatsapp
      // Lógica: última interacción en mensajes_whatsapp < (hoy - X días)
      // Nota: Esta subquery encuentra prospectos cuya última interacción sea anterior a la fecha de corte
      if (audience?.dias_sin_contacto && audience.dias_sin_contacto > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - audience.dias_sin_contacto);
        // Usamos una subquery para verificar la última interacción en mensajes_whatsapp
        baseWhere += ` AND (id NOT IN (
          SELECT DISTINCT prospecto_id FROM mensajes_whatsapp 
          WHERE fecha_hora >= '${cutoffDate.toISOString()}'::timestamptz
        ) OR id NOT IN (SELECT DISTINCT prospecto_id FROM mensajes_whatsapp))`;
      }
      
      // Filtro de tiene_email
      if (audience?.tiene_email === true) {
        baseWhere += ` AND email IS NOT NULL AND email != ''`;
      } else if (audience?.tiene_email === false) {
        baseWhere += ` AND (email IS NULL OR email = '')`;
      }
      
      // Filtro de con_menores (cantidad_menores > 0)
      if (audience?.con_menores === true) {
        baseWhere += ` AND cantidad_menores > 0`;
      } else if (audience?.con_menores === false) {
        baseWhere += ` AND (cantidad_menores IS NULL OR cantidad_menores = 0)`;
      }
      
      // Filtro de etiquetas (requiere consulta a SystemUI)
      // Obtener los IDs de prospectos que tienen las etiquetas seleccionadas
      // y agregarlos directamente al WHERE clause
      if (audience?.etiquetas && audience.etiquetas.length > 0) {
        try {
          const { data: labeledProspects, error: labelError } = await supabaseSystemUI
            .from('whatsapp_conversation_labels')
            .select('prospecto_id')
            .in('label_id', audience.etiquetas)
            .eq('label_type', 'preset');
          
          if (labelError) {
            console.error('Error fetching labeled prospects for WHERE:', labelError);
            toast.error('Error al obtener prospectos con etiquetas');
            throw labelError;
          }
          
          if (labeledProspects && labeledProspects.length > 0) {
            // Obtener IDs únicos
            const prospectoIds = [...new Set(labeledProspects.map(lp => lp.prospecto_id))];
            // Agregar al WHERE clause
            // Escapar los UUIDs para SQL (aunque son UUIDs válidos, es buena práctica)
            const escapedIds = prospectoIds.map(id => `'${id}'`).join(',');
            baseWhere += ` AND id IN (${escapedIds})`;
            console.log(`[Campaign] Filtro etiquetas: ${prospectoIds.length} prospectos encontrados`);
          } else {
            // No hay prospectos con esas etiquetas - la campaña no debería continuar
            console.warn('[Campaign] No se encontraron prospectos con las etiquetas seleccionadas');
            toast.error('No hay prospectos con las etiquetas seleccionadas');
            setSaving(false);
            return;
          }
        } catch (labelQueryError) {
          console.error('Error querying labels:', labelQueryError);
          setSaving(false);
          return;
        }
      }
      
      // WHERE para variante A (prospectos CON variables)
      let whereA = baseWhere;
      if (variableCoverage.requiredFields.length > 0) {
        const hasVarsCondition = variableCoverage.requiredFields
          .map(field => `(${field} IS NOT NULL AND ${field} != '')`)
          .join(' AND ');
        whereA += ` AND (${hasVarsCondition})`;
      }
      
      // WHERE para variante B (prospectos SIN variables)
      let whereB = baseWhere;
      if (isABTestPayload && variableCoverage.requiredFields.length > 0) {
        const missingVarsCondition = variableCoverage.requiredFields
          .map(field => `(${field} IS NULL OR ${field} = '')`)
          .join(' OR ');
        whereB += ` AND (${missingVarsCondition})`;
      }
      
      const payload = {
        // Datos para insertar en whatsapp_campaigns
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        campaign_type: formData.campaign_type || 'standard',
        template_id: formData.template_id,
        audience_id: formData.audience_id,
        ab_template_b_id: isABTestPayload ? formData.ab_template_b_id : null,
        ab_distribution_a: isABTestPayload 
          ? (variableCoverage.requiresABTest ? variableCoverage.coveragePercent : formData.ab_distribution_a)
          : null,
        batch_size: formData.batch_size,
        batch_interval_seconds: formData.batch_interval_seconds,
        execute_at: executeAt,
        status: executeOption === 'now' ? 'running' : 'scheduled',
        total_recipients: prospectCount,
        created_by: user?.id,
        created_by_email: user?.email,
        
        // Cláusulas WHERE (tú agregas SELECT * FROM prospectos)
        // Para estándar: usa where_clause_a
        // Para A/B: usa where_clause_a y where_clause_b
        where_clause_a: isABTestPayload ? whereA : baseWhere,
        where_clause_b: isABTestPayload ? whereB : null,
        
        // Conteos
        recipients_a: isABTestPayload ? recipientsA : prospectCount,
        recipients_b: isABTestPayload ? recipientsB : null,
        
        // Filtros adicionales para N8N (etiquetas están en SystemUI, N8N debe filtrar)
        audience_etiquetas: audience?.etiquetas || null,
      };
      
      // Enviar al webhook con auth de livechat
      const response = await fetch(BROADCAST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'livechat_auth': authToken
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook error: ${response.status} - ${errorText}`);
      }
      
      const webhookResponse = await response.json();
      
      toast.success(isABTestPayload 
        ? '¡Campaña A/B enviada! Se actualizará automáticamente.' 
        : '¡Campaña enviada! Se actualizará automáticamente.'
      );
      
      // Cerrar modal - los datos se actualizarán vía Realtime
      onCreated();
      
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.message || 'Error al enviar campaña');
    } finally {
      setSaving(false);
    }
  };
  
  // Determinar si es A/B test
  const isABTest = formData.campaign_type === 'ab_test';
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[60]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800 ${
              isABTest ? 'max-w-[95vw] xl:max-w-[1600px]' : 'max-w-5xl'
            }`}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    initial={{ rotate: -10 }}
                    animate={{ rotate: 0 }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isABTest 
                        ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}
                  >
                    {isABTest ? (
                      <GitBranch className="w-5 h-5 text-white" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-white" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {editingCampaign ? 'Editar Campaña' : 'Crear Nueva Campaña'}
                      {isABTest && <span className="ml-2 text-purple-500">A/B Test</span>}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isABTest 
                        ? 'Compara dos plantillas con tu audiencia' 
                        : 'Configura tu campaña de envío masivo'}
                    </p>
                  </div>
                </div>
                
                {/* Selector tipo de campaña */}
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                    <button
                      onClick={() => {
                        // No permitir cambiar a estándar si se requiere A/B por cobertura
                        if (variableCoverage.requiresABTest) {
                          toast.error('La plantilla seleccionada requiere A/B Test por cobertura incompleta');
                          return;
                        }
                        setFormData({ ...formData, campaign_type: 'standard' });
                      }}
                      disabled={variableCoverage.requiresABTest}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        !isABTest
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : variableCoverage.requiresABTest 
                            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Estándar
                      </span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, campaign_type: 'ab_test' })}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        isABTest
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        A/B Test
                        {variableCoverage.requiresABTest && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-amber-500 text-white rounded font-bold">
                            REQUERIDO
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className={`grid gap-0 ${isABTest ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {/* Formulario */}
                <div className="p-6 space-y-5 border-b xl:border-b-0 xl:border-r border-gray-100 dark:border-gray-800">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Básica
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Nombre de la Campaña
                        </label>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="Ej: Promoción Verano 2026"
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Descripción (opcional)
                        </label>
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                          placeholder="Describe el objetivo..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Audiencia (solo una para A/B) */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Audiencia
                      </label>
                    </div>
                    <div className="pt-2">
                      <select
                        value={formData.audience_id}
                        onChange={(e) => setFormData({ ...formData, audience_id: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                      >
                        <option value="">Selecciona una audiencia</option>
                        {audiences.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} ({a.prospectos_count} prospectos)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Plantillas */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-1 h-5 bg-gradient-to-b rounded-full ${isABTest ? 'from-purple-500 to-pink-500' : 'from-purple-500 to-pink-500'}`}></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        {isABTest ? 'Plantillas A/B' : 'Plantilla'}
                      </label>
                    </div>
                    <div className={`grid gap-3 pt-2 ${isABTest ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          {isABTest && <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded flex items-center justify-center">A</span>}
                          <MessageSquare className="w-3.5 h-3.5" />
                          Plantilla {isABTest && 'Variante A'}
                        </label>
                        <select
                          value={formData.template_id}
                          onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        >
                          <option value="">Selecciona plantilla</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      {isABTest && (
                        <div>
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            <span className="w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded flex items-center justify-center">B</span>
                            <MessageSquare className="w-3.5 h-3.5" />
                            Plantilla Variante B
                            {/* Indicador de cálculo */}
                            {validTemplatesForB.isCalculating && (
                              <Loader2 className="w-3 h-3 animate-spin text-pink-500" />
                            )}
                            {!validTemplatesForB.isCalculating && formData.ab_template_b_id && templateBCoverage.isValid && (
                              <span className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="w-3 h-3" />
                                100%
                              </span>
                            )}
                          </label>
                          <select
                            value={formData.ab_template_b_id || ''}
                            onChange={(e) => setFormData({ ...formData, ab_template_b_id: e.target.value || null })}
                            disabled={validTemplatesForB.isCalculating}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 dark:bg-gray-800/50 dark:text-white transition-all disabled:opacity-50"
                          >
                            <option value="">
                              {validTemplatesForB.isCalculating 
                                ? 'Calculando plantillas válidas...' 
                                : 'Selecciona plantilla'}
                            </option>
                            {/* Solo mostrar plantillas con 100% de cobertura */}
                            {templates
                              .filter(t => 
                                t.id !== formData.template_id && 
                                validTemplatesForB.templateIds.includes(t.id)
                              )
                              .map((t) => {
                                const hasVars = templateHasVariables(t);
                                return (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                    {!hasVars ? ' ✓ Sin variables' : ' ✓ 100% cobertura'}
                                  </option>
                                );
                              })}
                          </select>
                          
                          {/* Mensaje si no hay plantillas válidas */}
                          {!validTemplatesForB.isCalculating && validTemplatesForB.templateIds.filter(id => id !== formData.template_id).length === 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                            >
                              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>No hay plantillas con 100% de cobertura disponibles</span>
                              </p>
                            </motion.div>
                          )}
                          
                          {/* Indicador de plantilla seleccionada válida */}
                          {!validTemplatesForB.isCalculating && formData.ab_template_b_id && templateBCoverage.isValid && templateBCoverage.requiredFields.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                            >
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Plantilla B válida: 100% de cobertura</span>
                              </p>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Panel de cobertura de variables */}
                  {isABTest && variableCoverage.requiredFields.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-red-500 rounded-full"></div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Cobertura de Variables
                        </label>
                      </div>
                      <div className={`p-4 rounded-xl border-2 ${
                        variableCoverage.coveragePercent === 100 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      }`}>
                        {variableCoverage.isAnalyzing ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Analizando cobertura...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Prospectos con variables completas
                              </span>
                              <span className={`text-lg font-bold ${
                                variableCoverage.coveragePercent === 100 ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {variableCoverage.coveragePercent}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${variableCoverage.coveragePercent}%` }}
                                className={`h-full ${
                                  variableCoverage.coveragePercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  Con variables: <span className="font-semibold text-gray-900 dark:text-white">{variableCoverage.prospectsWithVariables.toLocaleString()}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-pink-500 rounded-full" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  Sin variables: <span className="font-semibold text-gray-900 dark:text-white">{variableCoverage.prospectsWithoutVariables.toLocaleString()}</span>
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>
                                  Campos requeridos: <span className="font-mono">{variableCoverage.requiredFields.join(', ')}</span>
                                </span>
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Slider A/B Distribution */}
                  {isABTest && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full"></div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Distribución
                          {variableCoverage.requiresABTest && (
                            <span className="ml-2 text-[9px] text-amber-600 dark:text-amber-400 font-normal normal-case">(calculada automáticamente)</span>
                          )}
                        </label>
                      </div>
                      <div className={`p-4 rounded-xl ${
                        variableCoverage.requiresABTest 
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800' 
                          : 'bg-gray-50 dark:bg-gray-800/50'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded flex items-center justify-center">A</span>
                            <span className="text-lg font-bold text-blue-600">{formData.ab_distribution_a}%</span>
                          </div>
                          <Split className="w-5 h-5 text-gray-400" />
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-pink-600">{100 - (formData.ab_distribution_a || 50)}%</span>
                            <span className="w-6 h-6 bg-pink-500 text-white text-xs font-bold rounded flex items-center justify-center">B</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={90}
                          step={5}
                          value={formData.ab_distribution_a}
                          onChange={(e) => setFormData({ ...formData, ab_distribution_a: parseInt(e.target.value) })}
                          disabled={variableCoverage.requiresABTest}
                          className={`w-full h-2 rounded-lg appearance-none ${
                            variableCoverage.requiresABTest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                          }`}
                          style={{
                            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${formData.ab_distribution_a}%, #EC4899 ${formData.ab_distribution_a}%, #EC4899 100%)`
                          }}
                        />
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          <span>{recipientsA.toLocaleString()} prospectos</span>
                          <span>{recipientsB.toLocaleString()} prospectos</span>
                        </div>
                        {variableCoverage.requiresABTest && (
                          <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Distribución basada en cobertura de variables de la Plantilla A
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Fecha de ejecución */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Fecha de Ejecución
                      </label>
                    </div>
                    <div className="pt-2 space-y-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExecuteOption('now');
                            setFormData({ ...formData, execute_at: null });
                          }}
                          className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                            executeOption === 'now'
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          <Rocket className="w-4 h-4" />
                          <span className="text-sm font-medium">Ahora</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExecuteOption('scheduled')}
                          className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                            executeOption === 'scheduled'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm font-medium">Programar</span>
                        </button>
                      </div>
                      
                      {executeOption === 'scheduled' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3"
                        >
                          {/* Date picker moderno */}
                          <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                            {/* Presets rápidos */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {[
                                { label: 'En 1 hora', hours: 1 },
                                { label: 'En 3 horas', hours: 3 },
                                { label: 'Mañana 9am', preset: 'tomorrow9' },
                                { label: 'Mañana 2pm', preset: 'tomorrow14' },
                              ].map((option, idx) => {
                                const getPresetDate = () => {
                                  const now = new Date();
                                  if (option.hours) {
                                    now.setHours(now.getHours() + option.hours);
                                    return now;
                                  }
                                  if (option.preset === 'tomorrow9') {
                                    now.setDate(now.getDate() + 1);
                                    now.setHours(9, 0, 0, 0);
                                    return now;
                                  }
                                  if (option.preset === 'tomorrow14') {
                                    now.setDate(now.getDate() + 1);
                                    now.setHours(14, 0, 0, 0);
                                    return now;
                                  }
                                  return now;
                                };
                                
                                return (
                                  <motion.button
                                    key={idx}
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setFormData({ ...formData, execute_at: getPresetDate().toISOString() })}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all shadow-sm"
                                  >
                                    {option.label}
                                  </motion.button>
                                );
                              })}
                            </div>
                            
                            {/* Selector de fecha y hora personalizado */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase mb-1 block">
                                  Fecha
                                </label>
                                <input
                                  type="date"
                                  value={formData.execute_at ? formData.execute_at.slice(0, 10) : ''}
                                  min={new Date().toISOString().slice(0, 10)}
                                  onChange={(e) => {
                                    const currentTime = formData.execute_at ? formData.execute_at.slice(11, 16) : '09:00';
                                    const newDate = new Date(`${e.target.value}T${currentTime}`);
                                    setFormData({ ...formData, execute_at: newDate.toISOString() });
                                  }}
                                  className="w-full px-3 py-2.5 text-sm border border-purple-200 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase mb-1 block">
                                  Hora
                                </label>
                                <input
                                  type="time"
                                  value={formData.execute_at ? formData.execute_at.slice(11, 16) : '09:00'}
                                  onChange={(e) => {
                                    const currentDate = formData.execute_at ? formData.execute_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
                                    const newDate = new Date(`${currentDate}T${e.target.value}`);
                                    setFormData({ ...formData, execute_at: newDate.toISOString() });
                                  }}
                                  className="w-full px-3 py-2.5 text-sm border border-purple-200 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                                />
                              </div>
                            </div>
                            
                            {/* Vista previa de la fecha seleccionada */}
                            {formData.execute_at && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 flex items-center gap-3"
                              >
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {new Date(formData.execute_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                                  </p>
                                  <p className="text-xs text-purple-600 dark:text-purple-400">
                                    {new Date(formData.execute_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  
                  {/* Configuración de Envío */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Velocidad de Envío
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          Por Batch
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={formData.batch_size}
                          onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || 10 })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Intervalo (s)
                        </label>
                        <input
                          type="number"
                          min={30}
                          max={300}
                          value={formData.batch_interval_seconds}
                          onChange={(e) => setFormData({ ...formData, batch_interval_seconds: parseInt(e.target.value) || 60 })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Resumen */}
                  {formData.audience_id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border ${
                        isABTest 
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800'
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className={`grid gap-3 ${isABTest ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        <div className="text-center">
                          <p className={`text-xl font-bold ${isABTest ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {countingProspects ? '...' : prospectCount.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400">Total</p>
                        </div>
                        {isABTest ? (
                          <>
                            <div className="text-center">
                              <p className="text-xl font-bold text-pink-600 dark:text-pink-400">
                                {getEstimatedTime()}
                              </p>
                              <p className="text-[10px] text-gray-600 dark:text-gray-400">Duración</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center border-x border-blue-200 dark:border-blue-700">
                              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {Math.ceil(prospectCount / (formData.batch_size || 10))}
                              </p>
                              <p className="text-[10px] text-gray-600 dark:text-gray-400">Batches</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {getEstimatedTime()}
                              </p>
                              <p className="text-[10px] text-gray-600 dark:text-gray-400">Duración</p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {/* Preview de Celular(es) */}
                <div className={`p-4 sm:p-6 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-[#0d1117] dark:via-[#0d1117] dark:to-[#151b23] flex flex-col items-center justify-center min-h-[500px] ${isABTest ? 'xl:col-span-2' : ''}`}>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Vista previa del mensaje
                  </p>
                  
                  {/* Contenedor de previews - centrado y responsivo */}
                  <div className={`flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 w-full ${
                    isABTest 
                      ? 'flex-col md:flex-row' 
                      : 'flex-col'
                  }`}>
                    
                    {/* Phone Mockup A */}
                    <PhoneMockup 
                      template={selectedTemplate}
                      message={getMessagePreview(selectedTemplate)}
                      variant={isABTest ? 'A' : undefined}
                      recipients={isABTest ? recipientsA : prospectCount}
                      previewProspect={previewProspect}
                    />
                    
                    {/* Phone Mockup B (solo A/B) */}
                    {isABTest && (
                      <PhoneMockup 
                        template={selectedTemplateB}
                        message={getMessagePreview(selectedTemplateB)}
                        variant="B"
                        recipients={recipientsB}
                        previewProspect={previewProspect}
                      />
                    )}
                  </div>
                  
                  {/* Info del prospecto de muestra */}
                  {previewProspect && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-center"
                    >
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Preview con datos de: <span className="font-medium text-emerald-600 dark:text-emerald-400">{previewProspect.nombre || previewProspect.nombre_completo || 'Prospecto'}</span>
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {executeOption === 'now' 
                    ? 'La campaña se ejecutará inmediatamente' 
                    : formData.execute_at 
                      ? `Programada para: ${new Date(formData.execute_at).toLocaleString('es-MX')}`
                      : 'Selecciona fecha de ejecución'
                  }
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Banner de advertencia si está en ejecución */}
                {isRunning && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <Play className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Campaña en ejecución
                    </span>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  {isRunning ? 'Cerrar' : 'Cancelar'}
                </button>
                {!isRunning && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSubmit()}
                    disabled={
                      saving || 
                      !formData.nombre.trim() || 
                      !formData.template_id || 
                      !formData.audience_id || 
                      prospectCount === 0 ||
                      (isABTest && !formData.ab_template_b_id) ||
                      (executeOption === 'scheduled' && !formData.execute_at)
                    }
                    className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2 ${
                      isABTest 
                        ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 shadow-purple-500/25' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-500/25'
                    }`}
                  >
                    {executeOption === 'now' ? (
                      <>
                        <Rocket className="w-4 h-4" />
                        {saving ? 'Lanzando...' : isABTest ? 'Lanzar A/B Test' : 'Lanzar Ahora'}
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        {saving ? 'Programando...' : 'Programar Envío'}
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CampanasManager;
