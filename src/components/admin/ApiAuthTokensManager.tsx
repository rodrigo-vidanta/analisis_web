/**
 * ============================================
 * GESTIÓN DE CREDENCIALES Y TOKENS
 * ============================================
 * 
 * Módulo centralizado para gestionar credenciales de APIs y webhooks.
 * Diseño basado en UserManagementV2 para máximo aprovechamiento del espacio.
 * 
 * Incluye:
 * - Sidebar con filtros por tipo
 * - Tabla compacta con edición inline
 * - Historial de cambios y auditoría
 * - Búsqueda en tiempo real
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RefreshCw, 
  Save,
  Shield,
  AlertTriangle,
  Search,
  X,
  Plus,
  Webhook,
  Mic2,
  Phone,
  MessageSquare,
  Bot,
  Image,
  Link2,
  User,
  Clock,
  History,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Filter,
  ArrowUpDown,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
  Settings
} from 'lucide-react';
import { supabaseSystemUIAdmin } from '../../config/supabaseSystemUI';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface ApiToken {
  id: string;
  module_name: string;
  service_name?: string;
  token_key: string;
  token_type?: string;
  token_value: string;
  description: string;
  endpoint_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by_id?: string;
  updated_by_name?: string;
  updated_by_email?: string;
  previous_value?: string;
  change_reason?: string;
  version?: number;
}

interface TokenHistory {
  id: string;
  token_id: string;
  module_name: string;
  token_value: string;
  version: number;
  changed_at: string;
  changed_by_name?: string;
  change_type: string;
  change_reason?: string;
}

type FilterType = 'all' | 'webhooks' | 'apis' | 'active' | 'inactive';
type SortField = 'module_name' | 'updated_at' | 'version';
type SortDirection = 'asc' | 'desc';

// ============================================
// CONSTANTS
// ============================================

const SIDEBAR_KEY = 'credentials_sidebar_visible';

const FILTER_OPTIONS: { id: FilterType; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'all', name: 'Todas', icon: <Key className="w-4 h-4" />, color: 'text-gray-600' },
  { id: 'webhooks', name: 'Webhooks N8N', icon: <Webhook className="w-4 h-4" />, color: 'text-pink-500' },
  { id: 'apis', name: 'APIs Externas', icon: <Settings className="w-4 h-4" />, color: 'text-purple-500' },
  { id: 'active', name: 'Activas', icon: <Check className="w-4 h-4" />, color: 'text-emerald-500' },
  { id: 'inactive', name: 'Inactivas', icon: <X className="w-4 h-4" />, color: 'text-red-500' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const getTokenType = (token: ApiToken): 'webhook' | 'api' => {
  if (token.endpoint_url?.includes('railway') || token.token_type === 'bearer') {
    return 'webhook';
  }
  return 'api';
};

const getTokenIcon = (token: ApiToken) => {
  const module = token.module_name.toLowerCase();
  
  if (module.includes('elevenlabs')) return <Mic2 className="w-4 h-4" />;
  if (module.includes('llamada')) return <Phone className="w-4 h-4" />;
  if (module.includes('mensaje') || module.includes('whatsapp') || module.includes('plantilla')) return <MessageSquare className="w-4 h-4" />;
  if (module.includes('bot') || module.includes('pausar')) return <Bot className="w-4 h-4" />;
  if (module.includes('imagen') || module.includes('media')) return <Image className="w-4 h-4" />;
  if (module.includes('log') || module.includes('error')) return <AlertCircle className="w-4 h-4" />;
  return <Webhook className="w-4 h-4" />;
};

const getTokenColor = (token: ApiToken): string => {
  const module = token.module_name.toLowerCase();
  
  if (module.includes('elevenlabs')) return 'bg-gradient-to-br from-gray-800 to-gray-900';
  if (module.includes('llamada')) return 'bg-gradient-to-br from-green-500 to-emerald-600';
  if (module.includes('whatsapp') || module.includes('mensaje') || module.includes('plantilla')) return 'bg-gradient-to-br from-green-400 to-green-600';
  if (module.includes('bot')) return 'bg-gradient-to-br from-purple-500 to-indigo-600';
  if (module.includes('imagen') || module.includes('media')) return 'bg-gradient-to-br from-blue-500 to-cyan-500';
  if (module.includes('log') || module.includes('error')) return 'bg-gradient-to-br from-orange-500 to-red-500';
  return 'bg-gradient-to-br from-pink-500 to-rose-600';
};

const maskToken = (value: string): string => {
  if (!value || value.length <= 8) return '••••••••';
  return '••••' + value.slice(-4);
};

const formatDate = (date: string | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

// ============================================
// MAIN COMPONENT
// ============================================

const ApiAuthTokensManager: React.FC = () => {
  // State
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('module_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // UI State
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved === null ? window.innerWidth >= 1024 : saved === 'true';
  });
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Edit State
  const [editingToken, setEditingToken] = useState<ApiToken | null>(null);
  const [editForm, setEditForm] = useState({
    token_value: '',
    description: '',
    endpoint_url: '',
    change_reason: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!supabaseSystemUIAdmin) {
        console.warn('⚠️ Supabase client not available');
        setTokens([]);
        return;
      }
      
      const { data, error } = await supabaseSystemUIAdmin
        .from('api_auth_tokens')
        .select('*')
        .order('module_name');
      
      if (error) {
        if (error.code === '42P01') {
          console.log('📋 Tabla api_auth_tokens no existe');
          setTokens([]);
        } else {
          throw error;
        }
      } else {
        setTokens(data || []);
      }
    } catch (error) {
      console.error('❌ Error cargando tokens:', error);
      toast.error('Error al cargar credenciales');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredTokens = useMemo(() => {
    let result = [...tokens];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.module_name.toLowerCase().includes(query) ||
        t.token_key.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.endpoint_url?.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    switch (filterType) {
      case 'webhooks':
        result = result.filter(t => getTokenType(t) === 'webhook');
        break;
      case 'apis':
        result = result.filter(t => getTokenType(t) === 'api');
        break;
      case 'active':
        result = result.filter(t => t.is_active !== false);
        break;
      case 'inactive':
        result = result.filter(t => t.is_active === false);
        break;
    }
    
    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'module_name':
          comparison = a.module_name.localeCompare(b.module_name);
          break;
        case 'updated_at':
          comparison = new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
          break;
        case 'version':
          comparison = (b.version || 1) - (a.version || 1);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [tokens, searchQuery, filterType, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredTokens.length / itemsPerPage);
  const paginatedTokens = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTokens.slice(start, start + itemsPerPage);
  }, [filteredTokens, currentPage, itemsPerPage]);

  // Stats
  const stats = useMemo(() => ({
    total: tokens.length,
    webhooks: tokens.filter(t => getTokenType(t) === 'webhook').length,
    apis: tokens.filter(t => getTokenType(t) === 'api').length,
    active: tokens.filter(t => t.is_active !== false).length
  }), [tokens]);

  // ============================================
  // HANDLERS
  // ============================================

  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const toggleTokenVisibility = (tokenId: string) => {
    setVisibleTokens(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  };

  const copyToken = async (value: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToken(tokenId);
      toast.success('Copiado');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const startEditing = (token: ApiToken) => {
    setEditingToken(token);
    setEditForm({
      token_value: token.token_value,
      description: token.description || '',
      endpoint_url: token.endpoint_url || '',
      change_reason: ''
    });
  };

  const cancelEditing = () => {
    setEditingToken(null);
    setEditForm({ token_value: '', description: '', endpoint_url: '', change_reason: '' });
  };

  const saveToken = async () => {
    if (!editingToken || !editForm.token_value.trim()) {
      toast.error('El token no puede estar vacío');
      return;
    }

    try {
      setSaving(editingToken.id);
      const newVersion = (editingToken.version || 1) + 1;
      const now = new Date().toISOString();

      // Save to history
      await supabaseSystemUIAdmin
        ?.from('api_auth_tokens_history')
        .insert({
          token_id: editingToken.id,
          module_name: editingToken.module_name,
          service_name: editingToken.service_name || '',
          token_key: editingToken.token_key,
          token_value: editingToken.token_value,
          description: editingToken.description,
          endpoint_url: editingToken.endpoint_url,
          version: editingToken.version || 1,
          change_type: 'UPDATE',
          change_reason: editForm.change_reason || 'Actualización desde UI'
        });

      // Update token
      const { error } = await supabaseSystemUIAdmin!
        .from('api_auth_tokens')
        .update({
          token_value: editForm.token_value.trim(),
          description: editForm.description.trim(),
          endpoint_url: editForm.endpoint_url.trim(),
          previous_value: editingToken.token_value,
          updated_at: now,
          version: newVersion,
          change_reason: editForm.change_reason || 'Actualización desde UI'
        })
        .eq('id', editingToken.id);

      if (error) throw error;

      // Limpiar cache de credenciales si es necesario
      if (editingToken.module_name === 'N8N Webhooks' && editingToken.token_key === 'DYNAMICS_TOKEN') {
        // Limpiar cache del servicio de Dynamics
        try {
          const { clearDynamicsCredentialsCache } = await import('../../services/dynamicsLeadService');
          clearDynamicsCredentialsCache();
        } catch (err) {
          console.warn('No se pudo limpiar cache de Dynamics:', err);
        }
      }

      toast.success('Credencial actualizada');
      cancelEditing();
      await loadTokens();
    } catch (error) {
      console.error('❌ Error guardando:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex w-full h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 180, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0 border-r border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900 overflow-hidden"
          >
            <div className="p-2 h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center gap-2 mb-3 px-0.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Key className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Directorio
                </span>
              </div>

              {/* Filter Options */}
              <div className="space-y-0.5 flex-1">
                {FILTER_OPTIONS.map(option => {
                  const count = option.id === 'all' ? stats.total :
                    option.id === 'webhooks' ? stats.webhooks :
                    option.id === 'apis' ? stats.apis :
                    option.id === 'active' ? stats.active :
                    tokens.filter(t => t.is_active === false).length;
                    
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setFilterType(option.id);
                        setCurrentPage(1);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all text-xs ${
                        filterType === option.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={option.color}>{option.icon}</span>
                      <span className="flex-1">{option.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        filterType === option.id
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Stats Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 px-1">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                    {stats.webhooks} webhooks
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {stats.apis} APIs
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100/50 dark:border-gray-800/50">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={toggleSidebar}
              className={`p-1 rounded transition-colors flex-shrink-0 ${
                showSidebar 
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={showSidebar ? 'Ocultar filtros' : 'Mostrar filtros'}
            >
              {showSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <Shield className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" />
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                Credenciales y Tokens
              </h1>
            </div>
          </div>

          {/* Stats inline */}
          <div className="flex items-center gap-3 text-[11px] flex-shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-gray-900 dark:text-white">{stats.active}</span>
              <span className="text-gray-500 hidden sm:inline">activas</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="font-medium text-gray-900 dark:text-white">{stats.total}</span>
              <span className="text-gray-500 hidden sm:inline">total</span>
            </span>
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] font-medium hidden sm:inline">Sensible</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-100/50 dark:border-gray-800/50">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nombre, key, url..."
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={loadTokens}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Results count */}
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            {filteredTokens.length} resultado{filteredTokens.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {editingToken ? (
              /* Edit Panel */
              <motion.div
                key="edit-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full overflow-auto p-3 pb-[120px]"
              >
                <div className="max-w-2xl">
                  {/* Edit Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={cancelEditing}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className={`w-10 h-10 rounded-xl ${getTokenColor(editingToken)} flex items-center justify-center text-white`}>
                      {getTokenIcon(editingToken)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {editingToken.module_name}
                      </h2>
                      <p className="text-xs text-gray-500">{editingToken.token_key}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {editingToken.version && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          v{editingToken.version}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit Form */}
                  <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    {/* Token Value */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        <Key className="w-3.5 h-3.5" />
                        Token / API Key
                      </label>
                      <input
                        type="text"
                        value={editForm.token_value}
                        onChange={(e) => setEditForm(prev => ({ ...prev, token_value: e.target.value }))}
                        className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Token o API Key"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Descripción de la credencial"
                      />
                    </div>

                    {/* Endpoint URL */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        <Link2 className="w-3.5 h-3.5" />
                        Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={editForm.endpoint_url}
                        onChange={(e) => setEditForm(prev => ({ ...prev, endpoint_url: e.target.value }))}
                        className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    {/* Change Reason */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        <History className="w-3.5 h-3.5" />
                        Motivo del cambio
                      </label>
                      <input
                        type="text"
                        value={editForm.change_reason}
                        onChange={(e) => setEditForm(prev => ({ ...prev, change_reason: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Ej: Rotación de credenciales, actualización de token..."
                      />
                    </div>

                    {/* Audit Info */}
                    {editingToken.updated_by_name && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {editingToken.updated_by_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(editingToken.updated_at)}
                          </span>
                          {editingToken.change_reason && (
                            <span className="italic truncate">"{editingToken.change_reason}"</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveToken}
                      disabled={saving === editingToken.id}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                    >
                      {saving === editingToken.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Guardar
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Token Table */
              <motion.div
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                {loading && tokens.length === 0 ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-500">Cargando credenciales...</span>
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <Key className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="text-sm">No se encontraron credenciales</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-xs text-blue-500 hover:text-blue-600"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Table */}
                    <div className="flex-1 overflow-auto pb-[120px]">
                      <table className="w-full">
                        <thead className="bg-gray-50/80 dark:bg-gray-800/30 sticky top-0 z-10">
                          <tr className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <th className="text-left px-2 py-1.5">
                              <button
                                onClick={() => handleSort('module_name')}
                                className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                Credencial
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="text-left px-2 py-1.5 hidden md:table-cell">Token</th>
                            <th className="text-left px-2 py-1.5 hidden lg:table-cell">Endpoint</th>
                            <th className="text-left px-2 py-1.5 hidden sm:table-cell">
                              <button
                                onClick={() => handleSort('updated_at')}
                                className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                Modificado
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="text-left px-2 py-1.5 hidden xl:table-cell">Por</th>
                            <th className="text-right px-2 py-1.5 w-20">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {paginatedTokens.map((token) => {
                            const isVisible = visibleTokens.has(token.id);
                            const isCopied = copiedToken === token.id;
                            
                            return (
                              <tr
                                key={token.id}
                                className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                              >
                                {/* Credential Info */}
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg ${getTokenColor(token)} flex items-center justify-center text-white flex-shrink-0`}>
                                      {getTokenIcon(token)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                          {token.module_name}
                                        </span>
                                        {token.version && token.version > 1 && (
                                          <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                            v{token.version}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                                          {token.token_key}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Token Value */}
                                <td className="px-2 py-1.5 hidden md:table-cell">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-mono text-xs px-2 py-1 rounded ${
                                      isVisible 
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    }`}>
                                      {isVisible ? token.token_value.slice(0, 20) + '...' : maskToken(token.token_value)}
                                    </span>
                                    <button
                                      onClick={() => toggleTokenVisibility(token.id)}
                                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      onClick={() => copyToken(token.token_value, token.id)}
                                      className={`p-1 transition-colors ${
                                        isCopied ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                      }`}
                                    >
                                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>

                                {/* Endpoint */}
                                <td className="px-2 py-1.5 hidden lg:table-cell">
                                  {token.endpoint_url ? (
                                    <a
                                      href={token.endpoint_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-mono truncate max-w-[200px]"
                                    >
                                      {token.endpoint_url.replace('https://', '').slice(0, 30)}...
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>

                                {/* Modified Date */}
                                <td className="px-2 py-1.5 hidden sm:table-cell">
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {formatDate(token.updated_at)}
                                  </span>
                                </td>

                                {/* Modified By */}
                                <td className="px-2 py-1.5 hidden xl:table-cell">
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                    {token.updated_by_name || '-'}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="px-2 py-1.5 text-right">
                                  <button
                                    onClick={() => startEditing(token)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Editar</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-100/50 dark:border-gray-800/50">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTokens.length)}/{filteredTokens.length}</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                          {currentPage} / {totalPages || 1}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ApiAuthTokensManager;
