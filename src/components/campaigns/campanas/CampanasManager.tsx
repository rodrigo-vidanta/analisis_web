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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { 
  WhatsAppCampaign, 
  WhatsAppTemplate, 
  WhatsAppAudience,
  CampaignStatus,
  CreateCampaignInput,
  BroadcastWebhookPayload
} from '../../../types/whatsappTemplates';
import { CAMPAIGN_STATUS_CONFIG } from '../../../types/whatsappTemplates';

// ============================================
// CONSTANTES
// ============================================

const BROADCAST_WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/broadcast';
const BROADCAST_WEBHOOK_AUTH = '4ydoA3HgTwWI5lSolmZW8VYqjpazPPap5M6a0EHLccHyXvOgv82evBMzMGj5sYVF';

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
      
      // Cargar campañas con joins
      const { data: campaignsData, error: campaignsError } = await analysisSupabase
        .from('whatsapp_campaigns')
        .select(`
          *,
          template:whatsapp_templates(*),
          audience:whatsapp_audiences(*)
        `)
        .order('created_at', { ascending: false });
      
      if (campaignsError) throw campaignsError;
      
      // Cargar plantillas activas
      const { data: templatesData, error: templatesError } = await analysisSupabase
        .from('whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('status', 'APPROVED')
        .order('name');
      
      if (templatesError) throw templatesError;
      
      // Cargar audiencias activas
      const { data: audiencesData, error: audiencesError } = await analysisSupabase
        .from('whatsapp_audiences')
        .select('*')
        .eq('is_active', true)
        .order('nombre');
      
      if (audiencesError) throw audiencesError;
      
      setCampaigns(campaignsData || []);
      setTemplates(templatesData || []);
      setAudiences(audiencesData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  // ============================================
  // FILTRADO Y ORDENAMIENTO
  // ============================================

  const filteredCampaigns = useMemo(() => {
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
    
    return filtered;
  }, [campaigns, searchQuery, statusFilter, sortColumn, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);

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
    
    if (!confirm(`¿Estás seguro de eliminar la campaña "${campaign.nombre}"?`)) {
      return;
    }
    
    try {
      const { error } = await analysisSupabase
        .from('whatsapp_campaigns')
        .delete()
        .eq('id', campaign.id);
      
      if (error) throw error;
      
      toast.success('Campaña eliminada');
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
      {filteredCampaigns.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredCampaigns.length} campaña{filteredCampaigns.length !== 1 ? 's' : ''} 
            {(searchQuery || statusFilter !== 'all') && ' encontrada' + (filteredCampaigns.length !== 1 ? 's' : '')}
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
      ) : filteredCampaigns.length === 0 ? (
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
              {paginatedCampaigns.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  index={index}
                  onEdit={() => {
                    setEditingCampaign(campaign);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDelete(campaign)}
                  onStatusChange={(status) => handleStatusChange(campaign, status)}
                />
              ))}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Plantilla</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Audiencia</th>
                    <SortableHeader column="status" label="Estado" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <SortableHeader column="total_recipients" label="Destinatarios" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <SortableHeader column="sent_count" label="Enviados" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <SortableHeader column="created_at" label="Creada" sortColumn={sortColumn} sortDirection={sortDirection} onSort={setSortColumn} onDirection={setSortDirection} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedCampaigns.map((campaign) => (
                    <motion.tr
                      key={campaign.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{campaign.nombre}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{campaign.template?.name || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{campaign.audience?.nombre || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        {campaign.total_recipients.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {campaign.sent_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(campaign.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCampaign(campaign);
                              setShowCreateModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(campaign)}
                            disabled={campaign.status === 'running'}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
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
            Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredCampaigns.length)} de {filteredCampaigns.length}
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
// CARD DE CAMPAÑA
// ============================================

interface CampaignCardProps {
  campaign: WhatsAppCampaign;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: CampaignStatus) => void;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, index, onEdit, onDelete, onStatusChange }) => {
  const config = CAMPAIGN_STATUS_CONFIG[campaign.status];
  
  const getStatusIcon = () => {
    switch (campaign.status) {
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
  
  const successRate = campaign.sent_count > 0 
    ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(1) 
    : '0';
  
  const replyRate = campaign.sent_count > 0 
    ? ((campaign.replied_count / campaign.sent_count) * 100).toFixed(1) 
    : '0';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-blue-500/5"
    >
      {/* Barra de estado superior */}
      <div className={`h-1.5 ${config.bgColor}`} />
      
      {/* Contenido */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={campaign.nombre}>
              {campaign.nombre}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={campaign.status} />
            </div>
          </div>
          
          {/* Acciones */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onDelete}
              disabled={campaign.status === 'running'}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
        
        {/* Plantilla y Audiencia */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{campaign.template?.name || 'Sin plantilla'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{campaign.audience?.nombre || 'Sin audiencia'}</span>
          </div>
        </div>
        
        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{campaign.total_recipients.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Destino</p>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-gray-700">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{campaign.sent_count.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Enviados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{campaign.replied_count.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Respuestas</p>
          </div>
        </div>
        
        {/* Tasas */}
        {campaign.sent_count > 0 && (
          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-3">
            <span>Entrega: {successRate}%</span>
            <span>Respuesta: {replyRate}%</span>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{new Date(campaign.created_at).toLocaleDateString('es-MX')}</span>
          </div>
          
          {/* Batch info */}
          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <Zap className="w-3 h-3" />
            <span>{campaign.batch_size}/min</span>
          </div>
        </div>
      </div>
    </motion.div>
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
  // Form state
  const [formData, setFormData] = useState<CreateCampaignInput>({
    nombre: '',
    descripcion: '',
    template_id: '',
    audience_id: '',
    batch_size: 10,
    batch_interval_seconds: 60,
    scheduled_at: null
  });
  
  const [saving, setSaving] = useState(false);
  const [prospectCount, setProspectCount] = useState(0);
  const [countingProspects, setCountingProspects] = useState(false);
  const [previewProspect, setPreviewProspect] = useState<any>(null);
  
  // Datos seleccionados
  const selectedTemplate = templates.find(t => t.id === formData.template_id);
  const selectedAudience = audiences.find(a => a.id === formData.audience_id);
  
  // Reset form cuando se abre/cierra
  useEffect(() => {
    if (editingCampaign) {
      setFormData({
        nombre: editingCampaign.nombre,
        descripcion: editingCampaign.descripcion || '',
        template_id: editingCampaign.template_id,
        audience_id: editingCampaign.audience_id,
        batch_size: editingCampaign.batch_size,
        batch_interval_seconds: editingCampaign.batch_interval_seconds,
        scheduled_at: editingCampaign.scheduled_at
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        template_id: '',
        audience_id: '',
        batch_size: 10,
        batch_interval_seconds: 60,
        scheduled_at: null
      });
    }
  }, [editingCampaign, isOpen]);
  
  // Contar prospectos y obtener uno de muestra cuando cambia la audiencia
  useEffect(() => {
    if (!formData.audience_id || !isOpen) return;
    
    const countAndSample = async () => {
      setCountingProspects(true);
      try {
        const audience = audiences.find(a => a.id === formData.audience_id);
        if (!audience) return;
        
        // Construir query
        let query = analysisSupabase
          .from('prospectos')
          .select('*', { count: 'exact' });
        
        if (audience.etapa) {
          query = query.eq('etapa', audience.etapa);
        }
        if (audience.estado_civil) {
          query = query.eq('estado_civil', audience.estado_civil);
        }
        if (audience.viaja_con && audience.viaja_con.length > 0) {
          query = query.in('viaja_con', audience.viaja_con);
        }
        if (audience.destinos && audience.destinos.length > 0) {
          query = query.overlaps('destino_preferencia', audience.destinos);
        }
        
        const { data, count, error } = await query.limit(1);
        
        if (error) throw error;
        
        setProspectCount(count || 0);
        setPreviewProspect(data?.[0] || null);
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
  
  // Generar preview del mensaje
  const getMessagePreview = () => {
    if (!selectedTemplate) return '';
    
    const bodyComponent = selectedTemplate.components?.find(c => c.type === 'BODY');
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
  
  // Guardar campaña
  const handleSubmit = async (launchNow = false) => {
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
    
    try {
      setSaving(true);
      
      // Construir query de audiencia para snapshot
      const audience = audiences.find(a => a.id === formData.audience_id);
      let audienceQuery = 'SELECT * FROM prospectos WHERE 1=1';
      if (audience?.etapa) audienceQuery += ` AND etapa = '${audience.etapa}'`;
      if (audience?.estado_civil) audienceQuery += ` AND estado_civil = '${audience.estado_civil}'`;
      if (audience?.viaja_con?.length) audienceQuery += ` AND viaja_con IN ('${audience.viaja_con.join("','")}')`;
      if (audience?.destinos?.length) audienceQuery += ` AND destino_preferencia && ARRAY['${audience.destinos.join("','")}']`;
      
      const campaignData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        template_id: formData.template_id,
        audience_id: formData.audience_id,
        batch_size: formData.batch_size,
        batch_interval_seconds: formData.batch_interval_seconds,
        scheduled_at: formData.scheduled_at,
        status: launchNow ? 'running' : (formData.scheduled_at ? 'scheduled' : 'draft'),
        total_recipients: prospectCount,
        created_by: user?.id,
        created_by_email: user?.email,
        audience_query_snapshot: audienceQuery
      };
      
      let campaignId: string;
      
      if (editingCampaign) {
        const { error } = await analysisSupabase
          .from('whatsapp_campaigns')
          .update(campaignData)
          .eq('id', editingCampaign.id);
        
        if (error) throw error;
        campaignId = editingCampaign.id;
        toast.success('Campaña actualizada');
      } else {
        const { data, error } = await analysisSupabase
          .from('whatsapp_campaigns')
          .insert(campaignData)
          .select()
          .single();
        
        if (error) throw error;
        campaignId = data.id;
        toast.success('Campaña creada');
      }
      
      // Si se lanza ahora, enviar al webhook
      if (launchNow) {
        const payload: BroadcastWebhookPayload = {
          campaign_id: campaignId,
          audience_id: formData.audience_id,
          template_id: formData.template_id,
          audience_query: audienceQuery,
          batch_size: formData.batch_size,
          batch_interval_seconds: formData.batch_interval_seconds,
          created_by_id: user?.id || '',
          created_by_email: user?.email || '',
          timestamp: new Date().toISOString()
        };
        
        try {
          const response = await fetch(BROADCAST_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Auth': BROADCAST_WEBHOOK_AUTH
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            throw new Error(`Webhook error: ${response.status}`);
          }
          
          const webhookResponse = await response.json();
          
          // Actualizar campaña con respuesta del webhook
          await analysisSupabase
            .from('whatsapp_campaigns')
            .update({
              webhook_execution_id: webhookResponse?.execution_id || null,
              webhook_response: webhookResponse,
              started_at: new Date().toISOString()
            })
            .eq('id', campaignId);
          
          toast.success('¡Campaña lanzada exitosamente!');
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
          toast.error('Campaña guardada pero hubo un error al lanzarla');
          
          // Marcar como fallida
          await analysisSupabase
            .from('whatsapp_campaigns')
            .update({ status: 'failed' })
            .eq('id', campaignId);
        }
      }
      
      onCreated();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      toast.error(error.message || 'Error al guardar campaña');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[60]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {editingCampaign ? 'Editar Campaña' : 'Crear Nueva Campaña'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configura tu campaña de envío masivo
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6">
                {/* Formulario */}
                <div className="p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Básica
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <FileText className="w-4 h-4" />
                          Nombre de la Campaña
                        </label>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="Ej: Promoción Verano 2026"
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <MessageSquare className="w-4 h-4" />
                          Descripción (opcional)
                        </label>
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                          placeholder="Describe el objetivo de la campaña..."
                          rows={2}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Selección de Plantilla y Audiencia */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Contenido y Destinatarios
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <MessageSquare className="w-4 h-4" />
                          Plantilla de Mensaje
                        </label>
                        <select
                          value={formData.template_id}
                          onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        >
                          <option value="">Selecciona una plantilla</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Users className="w-4 h-4" />
                          Audiencia
                        </label>
                        <select
                          value={formData.audience_id}
                          onChange={(e) => setFormData({ ...formData, audience_id: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
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
                  </div>
                  
                  {/* Configuración de Envío */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Configuración de Envío
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Zap className="w-4 h-4" />
                          Mensajes por Batch
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={formData.batch_size}
                          onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || 10 })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">1-100 mensajes por batch</p>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Clock className="w-4 h-4" />
                          Intervalo (segundos)
                        </label>
                        <input
                          type="number"
                          min={30}
                          max={300}
                          value={formData.batch_interval_seconds}
                          onChange={(e) => setFormData({ ...formData, batch_interval_seconds: parseInt(e.target.value) || 60 })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Mínimo 30 segundos</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Resumen */}
                  {formData.audience_id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                    >
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {countingProspects ? '...' : prospectCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Destinatarios</p>
                        </div>
                        <div className="text-center border-x border-blue-200 dark:border-blue-700">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {Math.ceil(prospectCount / formData.batch_size)}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Batches</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {getEstimatedTime()}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Duración Est.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {/* Preview de Celular */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                    Vista previa del mensaje
                  </p>
                  
                  {/* Mockup de celular */}
                  <div className="relative w-64 sm:w-72">
                    {/* Frame del celular */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                      {/* Notch */}
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-full z-10"></div>
                      
                      {/* Pantalla */}
                      <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden">
                        {/* Header de WhatsApp */}
                        <div className="bg-[#202c33] px-3 py-2 pt-8 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">V</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">Vidanta Vacations</p>
                            <p className="text-gray-400 text-[10px]">en línea</p>
                          </div>
                        </div>
                        
                        {/* Chat area */}
                        <div className="h-80 p-3 bg-[url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096e274d81826.jpg')] bg-cover bg-center">
                          {selectedTemplate ? (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-[#005c4b] rounded-lg rounded-tl-none p-3 max-w-[85%] shadow-lg"
                            >
                              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                {getMessagePreview()}
                              </p>
                              <p className="text-right text-[10px] text-gray-300 mt-1">
                                {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </motion.div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <div className="text-center">
                                <Smartphone className="w-12 h-12 text-gray-500 mx-auto mb-2 opacity-50" />
                                <p className="text-gray-400 text-xs">
                                  Selecciona una plantilla<br />para ver la vista previa
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Input area */}
                        <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
                          <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                            <p className="text-gray-400 text-xs">Escribe un mensaje</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
                            <Send className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info del prospecto de muestra */}
                  {previewProspect && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-center"
                    >
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Preview con datos de: <span className="font-medium">{previewProspect.nombre || 'Prospecto'}</span>
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
                <span>Los mensajes se enviarán según la configuración de batch</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubmit(false)}
                  disabled={saving || !formData.nombre.trim() || !formData.template_id || !formData.audience_id}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? 'Guardando...' : 'Guardar Borrador'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubmit(true)}
                  disabled={saving || !formData.nombre.trim() || !formData.template_id || !formData.audience_id || prospectCount === 0}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {saving ? 'Lanzando...' : 'Lanzar Ahora'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CampanasManager;
