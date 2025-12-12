import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  Users, 
  Heart, 
  User as UserIcon, 
  UserPlus, 
  Baby,
  FileText,
  MessageSquare,
  Tag,
  MapPin,
  Edit2,
  Trash2,
  LayoutGrid,
  Table,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analysisSupabase } from '../../../config/analysisSupabase';
import type {
  WhatsAppAudience,
  CreateAudienceInput,
  ProspectoEtapa,
  EstadoCivil,
} from '../../../types/whatsappTemplates';
import {
  PROSPECTO_ETAPAS,
  DESTINOS,
  ESTADOS_CIVILES,
  VIAJA_CON_OPTIONS,
} from '../../../types/whatsappTemplates';

const AudienciasManager: React.FC = () => {
  const [audiences, setAudiences] = useState<WhatsAppAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAudience, setEditingAudience] = useState<WhatsAppAudience | null>(null);
  
  // Estados para vista y paginación
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('grid');
  const [currentPageCards, setCurrentPageCards] = useState(1);
  const [currentPageGrid, setCurrentPageGrid] = useState(1);
  const itemsPerPageCards = 20;
  const itemsPerPageGrid = 50;
  
  // Estados para ordenamiento del grid
  const [sortColumn, setSortColumn] = useState<keyof WhatsAppAudience | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAudiences();
  }, []);

  const loadAudiences = async () => {
    try {
      setLoading(true);
      
      // Cargar todas las audiencias de la BD (incluyendo Global y las de etapa)
      const dynamicAudiences: WhatsAppAudience[] = [];
      
      try {
        const { data: savedAudiences, error } = await analysisSupabase
          .from('whatsapp_audiences')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && savedAudiences && savedAudiences.length > 0) {
          // Recalcular conteo para cada audiencia guardada usando filtros de prospectos
          for (const aud of savedAudiences) {
            let query = analysisSupabase
              .from('prospectos')
              .select('id', { count: 'exact', head: true });
            
            // Filtro de etapa
            if (aud.etapa) {
              query = query.eq('etapa', aud.etapa);
            }
            
            // Filtro de estado civil
            if (aud.estado_civil) {
              query = query.eq('estado_civil', aud.estado_civil);
            }
            
            // Filtro de viaja_con
            if (aud.viaja_con && aud.viaja_con.length > 0) {
              query = query.in('viaja_con', aud.viaja_con);
            }
            
            // Filtro de destinos (overlaps con el array)
            if (aud.destinos && aud.destinos.length > 0) {
              query = query.overlaps('destino_preferencia', aud.destinos);
            }
            
            const { count } = await query;
            
            dynamicAudiences.push({
              ...aud,
              prospectos_count: count || 0,
            });
          }
        }
      } catch (dbError) {
        console.log('Error cargando audiencias de BD:', dbError);
      }
      
      setAudiences(dynamicAudiences);
    } catch (error) {
      console.error('Error loading audiences:', error);
      toast.error('Error al cargar audiencias');
      
      // Fallback: mostrar al menos la audiencia Global
      setAudiences([{
        id: 'global',
        nombre: 'Global - Todos los Prospectos',
        descripcion: 'Incluye a todos los prospectos',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
        prospectos_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'global' || id.startsWith('etapa-')) {
      toast.error('No se pueden eliminar audiencias del sistema');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta audiencia?')) {
      return;
    }

    try {
      const { error } = await analysisSupabase
        .from('whatsapp_audiences')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Audiencia eliminada');
      loadAudiences();
    } catch (error) {
      console.error('Error deleting audience:', error);
      toast.error('Error al eliminar audiencia');
    }
  };

  // Filtrar y ordenar audiencias
  const filteredAudiences = useMemo(() => {
    let filtered = [...audiences];

    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a => 
          a.nombre.toLowerCase().includes(query) ||
          a.descripcion?.toLowerCase().includes(query) ||
          a.etapa?.toLowerCase().includes(query) ||
          a.destinos?.some(d => d.toLowerCase().includes(query)) ||
          a.viaja_con?.some(v => v.toLowerCase().includes(query))
      );
    }

    // Filtros rápidos (etiquetas) - acumulativos
    if (activeQuickFilters.size > 0) {
      const etapaFilters = Array.from(activeQuickFilters).filter(f => f.startsWith('etapa-'));
      const estadoCivilFilters = Array.from(activeQuickFilters).filter(f => f.startsWith('estado_civil-'));
      const viajaConFilters = Array.from(activeQuickFilters).filter(f => f.startsWith('viaja_con-'));
      const destinosFilters = Array.from(activeQuickFilters).filter(f => f.startsWith('destinos-'));

      filtered = filtered.filter(a => {
        // Si hay filtros de etapa, debe coincidir con al menos uno
        if (etapaFilters.length > 0) {
          const matchesEtapa = etapaFilters.some(filter => {
            const etapaValue = filter.replace('etapa-', '');
            return a.etapa === etapaValue;
          });
          if (!matchesEtapa) return false;
        }

        // Si hay filtros de estado civil, debe coincidir con al menos uno
        if (estadoCivilFilters.length > 0) {
          const matchesEstadoCivil = estadoCivilFilters.some(filter => {
            const estadoCivilValue = filter.replace('estado_civil-', '');
            return a.estado_civil === estadoCivilValue;
          });
          if (!matchesEstadoCivil) return false;
        }

        // Si hay filtros de viaja_con, debe coincidir con al menos uno
        if (viajaConFilters.length > 0) {
          const matchesViajaCon = viajaConFilters.some(filter => {
            const viajaConValue = filter.replace('viaja_con-', '');
            return a.viaja_con?.includes(viajaConValue);
          });
          if (!matchesViajaCon) return false;
        }

        // Si hay filtros de destinos, debe coincidir con al menos uno
        if (destinosFilters.length > 0) {
          const matchesDestinos = destinosFilters.some(filter => {
            const destinoValue = filter.replace('destinos-', '');
            return a.destinos?.includes(destinoValue);
          });
          if (!matchesDestinos) return false;
        }

        return true;
      });
    }

    // Ordenamiento para grid
    if (viewMode === 'grid' && sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        if (Array.isArray(aValue) && Array.isArray(bValue)) {
          const comparison = aValue.length - bValue.length;
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        return 0;
      });
    }

    return filtered;
  }, [audiences, searchQuery, activeQuickFilters, viewMode, sortColumn, sortDirection]);

  // Toggle filtro rápido
  const toggleQuickFilter = (filter: string) => {
    setActiveQuickFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filter)) {
        newSet.delete(filter);
      } else {
        newSet.add(filter);
      }
      return newSet;
    });
  };

  // Manejar ordenamiento
  const handleSort = (column: keyof WhatsAppAudience) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Calcular paginación
  const totalPagesCards = Math.ceil(filteredAudiences.length / itemsPerPageCards);
  const totalPagesGrid = Math.ceil(filteredAudiences.length / itemsPerPageGrid);
  
  const startIndexCards = (currentPageCards - 1) * itemsPerPageCards;
  const endIndexCards = startIndexCards + itemsPerPageCards;
  const paginatedAudiencesCards = filteredAudiences.slice(startIndexCards, endIndexCards);
  
  const startIndexGrid = (currentPageGrid - 1) * itemsPerPageGrid;
  const endIndexGrid = startIndexGrid + itemsPerPageGrid;
  const paginatedAudiencesGrid = filteredAudiences.slice(startIndexGrid, endIndexGrid);

  // Resetear páginas cuando cambian los filtros
  useEffect(() => {
    setCurrentPageCards(1);
    setCurrentPageGrid(1);
  }, [searchQuery, activeQuickFilters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Audiencias
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crea y gestiona audiencias para tus campañas de WhatsApp
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingAudience(null);
            setShowCreateModal(true);
          }}
          className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          Crear Audiencia
        </motion.button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar audiencias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white"
            />
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
              <span className="text-sm font-medium">Cards</span>
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
              <span className="text-sm font-medium">Grid</span>
            </button>
          </div>
        </div>

        {/* Filtros rápidos tipo etiquetas */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Filtros rápidos:</span>
          
          {/* Etapas */}
          {PROSPECTO_ETAPAS.map((etapa) => (
            <button
              key={`etapa-${etapa.value}`}
              onClick={() => toggleQuickFilter(`etapa-${etapa.value}`)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeQuickFilters.has(`etapa-${etapa.value}`)
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-2 border-purple-500'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
              }`}
            >
              {etapa.label}
            </button>
          ))}

          {/* Estados Civiles */}
          {ESTADOS_CIVILES.map((ec) => (
            <button
              key={`estado_civil-${ec.value}`}
              onClick={() => toggleQuickFilter(`estado_civil-${ec.value}`)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeQuickFilters.has(`estado_civil-${ec.value}`)
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
              }`}
            >
              {ec.label}
            </button>
          ))}

          {/* Viaja Con */}
          {VIAJA_CON_OPTIONS.map((vc) => (
            <button
              key={`viaja_con-${vc.value}`}
              onClick={() => toggleQuickFilter(`viaja_con-${vc.value}`)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeQuickFilters.has(`viaja_con-${vc.value}`)
                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-2 border-pink-500'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
              }`}
            >
              {vc.label}
            </button>
          ))}

          {/* Destinos */}
          {DESTINOS.slice(0, 5).map((destino) => (
            <button
              key={`destinos-${destino.value}`}
              onClick={() => toggleQuickFilter(`destinos-${destino.value}`)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeQuickFilters.has(`destinos-${destino.value}`)
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-2 border-emerald-500'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'
              }`}
            >
              {destino.label}
            </button>
          ))}

          {/* Limpiar filtros */}
          {activeQuickFilters.size > 0 && (
            <button
              onClick={() => setActiveQuickFilters(new Set())}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-2 border-transparent hover:border-gray-300 transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      {filteredAudiences.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredAudiences.length} audiencia{filteredAudiences.length !== 1 ? 's' : ''} 
            {searchQuery || activeQuickFilters.size > 0
              ? ' encontrada' + (filteredAudiences.length !== 1 ? 's' : '') 
              : ''}
          </p>
        </div>
      )}

      {/* Vista de audiencias */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredAudiences.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || activeQuickFilters.size > 0
              ? 'No se encontraron audiencias con los filtros aplicados'
              : 'No hay audiencias creadas'}
          </p>
          {!searchQuery && activeQuickFilters.size === 0 && (
            <button
              onClick={() => {
                setEditingAudience(null);
                setShowCreateModal(true);
              }}
              className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Crear primera audiencia
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <>
          {/* Vista de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedAudiencesCards.map((audience, index) => {
                const isSystem = audience.id === 'global' || audience.id.startsWith('etapa-');
                return (
                  <AudienceCard
                    key={audience.id}
                    audience={audience}
                    isSystem={isSystem}
                    index={index}
                    onEdit={() => {
                      setEditingAudience(audience);
                      setShowCreateModal(true);
                    }}
                    onDelete={() => handleDelete(audience.id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          {/* Paginación Cards */}
          {totalPagesCards > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {startIndexCards + 1} - {Math.min(endIndexCards, filteredAudiences.length)} de {filteredAudiences.length} audiencias
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageCards(prev => Math.max(1, prev - 1))}
                  disabled={currentPageCards === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                  Página {currentPageCards} de {totalPagesCards}
                </span>
                <button
                  onClick={() => setCurrentPageCards(prev => Math.min(totalPagesCards, prev + 1))}
                  disabled={currentPageCards === totalPagesCards}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Vista de Data Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('nombre')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Nombre
                        {sortColumn === 'nombre' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('etapa')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Etapa
                        {sortColumn === 'etapa' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Descripción
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Criterios
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('prospectos_count')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Prospectos
                        {sortColumn === 'prospectos_count' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedAudiencesGrid.map((audience) => {
                    const isSystem = audience.id === 'global' || audience.id.startsWith('etapa-');
                    return (
                      <motion.tr
                        key={audience.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {audience.nombre}
                            </span>
                            {isSystem && (
                              <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                                Sistema
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {audience.etapa ? (
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
                              {audience.etapa}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-xs">
                            {audience.descripcion || 'Sin descripción'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {audience.destinos && audience.destinos.length > 0 && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                {audience.destinos.length} destino{audience.destinos.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {audience.viaja_con && audience.viaja_con.length > 0 && (
                              <span className="px-2 py-0.5 text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 rounded">
                                {audience.viaja_con.length} tipo{audience.viaja_con.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {audience.estado_civil && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">
                                {audience.estado_civil}
                              </span>
                            )}
                            {!audience.destinos?.length && !audience.viaja_con?.length && !audience.estado_civil && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">Sin criterios</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {audience.prospectos_count.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {!isSystem && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingAudience(audience);
                                  setShowCreateModal(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(audience.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación Grid */}
            {totalPagesGrid > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Mostrando {startIndexGrid + 1} - {Math.min(endIndexGrid, filteredAudiences.length)} de {filteredAudiences.length} audiencias
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageGrid(prev => Math.max(1, prev - 1))}
                    disabled={currentPageGrid === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                    Página {currentPageGrid} de {totalPagesGrid}
                  </span>
                  <button
                    onClick={() => setCurrentPageGrid(prev => Math.min(totalPagesGrid, prev + 1))}
                    disabled={currentPageGrid === totalPagesGrid}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de crear/editar audiencia */}
      <CreateAudienceModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingAudience(null);
        }}
        onCreated={() => {
          loadAudiences();
          setShowCreateModal(false);
          setEditingAudience(null);
        }}
        editingAudience={editingAudience}
      />
    </div>
  );
};

// ============================================
// MODAL DE CREACIÓN/EDICIÓN DE AUDIENCIA
// ============================================

interface CreateAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  editingAudience?: WhatsAppAudience | null;
}

const CreateAudienceModal: React.FC<CreateAudienceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  editingAudience,
}) => {
  const [formData, setFormData] = useState<CreateAudienceInput>({
    nombre: '',
    descripcion: '',
    etapa: null,
    destinos: [],
    estado_civil: null,
    viaja_con: [],
  });
  const [saving, setSaving] = useState(false);
  const [prospectCount, setProspectCount] = useState<number>(0);
  const [countingProspects, setCountingProspects] = useState(false);

  useEffect(() => {
    if (editingAudience) {
      setFormData({
        nombre: editingAudience.nombre,
        descripcion: editingAudience.descripcion || '',
        etapa: editingAudience.etapa,
        destinos: editingAudience.destinos || [],
        estado_civil: editingAudience.estado_civil,
        viaja_con: editingAudience.viaja_con || [],
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
      });
    }
  }, [editingAudience, isOpen]);

  // Calcular prospectos en tiempo real desde la BD
  useEffect(() => {
    if (!isOpen) return;

    const countProspects = async () => {
      setCountingProspects(true);
      try {
        let query = analysisSupabase
          .from('prospectos')
          .select('id', { count: 'exact', head: true });
        
        if (formData.etapa) {
          query = query.eq('etapa', formData.etapa);
        }
        
        if (formData.estado_civil) {
          query = query.eq('estado_civil', formData.estado_civil);
        }
        
        if (formData.viaja_con && formData.viaja_con.length > 0) {
          query = query.in('viaja_con', formData.viaja_con);
        }
        
        if (formData.destinos && formData.destinos.length > 0) {
          query = query.overlaps('destino_preferencia', formData.destinos);
        }
        
        const { count, error } = await query;
        
        if (error) {
          console.error('Error counting prospectos:', error);
          setProspectCount(0);
        } else {
          setProspectCount(count || 0);
        }
      } catch (err) {
        console.error('Error in countProspects:', err);
        setProspectCount(0);
      } finally {
        setCountingProspects(false);
      }
    };
    
    const timer = setTimeout(countProspects, 300);
    return () => clearTimeout(timer);
  }, [formData.etapa, formData.destinos, formData.estado_civil, formData.viaja_con, isOpen]);

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la audiencia es requerido');
      return;
    }

    try {
      setSaving(true);
      
      const audienceData: any = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        etapa: formData.etapa || null,
        estado_civil: formData.estado_civil || null,
        prospectos_count: prospectCount,
        is_active: true,
      };
      
      if (formData.destinos && formData.destinos.length > 0) {
        audienceData.destinos = formData.destinos;
      }
      if (formData.viaja_con && formData.viaja_con.length > 0) {
        audienceData.viaja_con = formData.viaja_con;
      }
      
      if (editingAudience) {
        // Actualizar
        const { error } = await analysisSupabase
          .from('whatsapp_audiences')
          .update(audienceData)
          .eq('id', editingAudience.id);
        
        if (error) throw error;
        toast.success(`Audiencia "${formData.nombre}" actualizada`);
      } else {
        // Crear
        const { error } = await analysisSupabase
          .from('whatsapp_audiences')
          .insert(audienceData)
          .select()
          .single();
        
        if (error) throw error;
        toast.success(`Audiencia "${formData.nombre}" guardada (${prospectCount} prospectos)`);
      }
      
      setFormData({
        nombre: '',
        descripcion: '',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
      });
      
      onCreated();
    } catch (error: any) {
      console.error('Error saving audience:', error);
      if (error.message?.includes('destinos') || error.message?.includes('viaja_con')) {
        toast.error(
          'Error: Las columnas destinos/viaja_con no existen. Por favor ejecuta el script SQL: docs/sql/add_destinos_viaja_con_to_audiences.sql',
          { duration: 8000 }
        );
      } else {
        toast.error('Error al guardar audiencia: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleDestino = (destino: string) => {
    const current = formData.destinos || [];
    if (current.includes(destino)) {
      setFormData({ ...formData, destinos: current.filter(d => d !== destino) });
    } else {
      setFormData({ ...formData, destinos: [...current, destino] });
    }
  };

  const toggleViajaCon = (tipo: string) => {
    const current = formData.viaja_con || [];
    if (current.includes(tipo)) {
      setFormData({ ...formData, viaja_con: current.filter(t => t !== tipo) });
    } else {
      setFormData({ ...formData, viaja_con: [...current, tipo] });
    }
  };

  const getIconForViajaCon = (tipo: string) => {
    switch (tipo) {
      case 'Familia': return Users;
      case 'Pareja': return Heart;
      case 'Solo': return UserIcon;
      case 'Amigos': return UserPlus;
      case 'Hijos': return Baby;
      default: return Users;
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
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingAudience ? 'Editar Audiencia' : 'Crear Nueva Audiencia'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Define los criterios de segmentación
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Nombre de audiencia */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>Nombre de Audiencia</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Interesados Riviera Maya"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Descripción de Audiencia</span>
                  </div>
                  <span className={`${(formData.descripcion?.length || 0) > 300 ? 'text-red-500' : ''}`}>
                    {formData.descripcion?.length || 0}/300
                  </span>
                </label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value.slice(0, 300) })}
                  placeholder="Describe el propósito de esta audiencia..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-none"
                />
              </div>

              {/* Grid de criterios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Etapa */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Tag className="w-4 h-4" />
                    <span>Etapa del Prospecto</span>
                  </label>
                  <select
                    value={formData.etapa || ''}
                    onChange={(e) => setFormData({ ...formData, etapa: e.target.value as ProspectoEtapa || null })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                  >
                    <option value="">No aplica</option>
                    {PROSPECTO_ETAPAS.map((etapa) => (
                      <option key={etapa.value} value={etapa.value}>
                        {etapa.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado Civil */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Heart className="w-4 h-4" />
                    <span>Estado Civil</span>
                  </label>
                  <select
                    value={formData.estado_civil || ''}
                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value as EstadoCivil || null })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                  >
                    <option value="">No aplica</option>
                    {ESTADOS_CIVILES.map((ec) => (
                      <option key={ec.value} value={ec.value}>
                        {ec.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destinos (Multi-select) */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Destinos Preferidos</span>
                    </div>
                    {(formData.destinos?.length || 0) > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {formData.destinos?.length} seleccionados
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DESTINOS.map((destino) => {
                      const isSelected = formData.destinos?.includes(destino.value);
                      return (
                        <button
                          key={destino.value}
                          type="button"
                          onClick={() => toggleDestino(destino.value)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {destino.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Viaja Con (Multi-select) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Viaja Con
                    </h4>
                  </div>
                  {(formData.viaja_con?.length || 0) > 0 && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      {formData.viaja_con?.length} seleccionados
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {VIAJA_CON_OPTIONS.map((tipo) => {
                    const Icon = getIconForViajaCon(tipo.value);
                    const isSelected = formData.viaja_con?.includes(tipo.value);
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => toggleViajaCon(tipo.value)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className={`text-xs font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {tipo.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contador de prospectos */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Prospectos que coinciden
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Basado en los criterios seleccionados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.p 
                      key={prospectCount}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl font-bold text-blue-600 dark:text-blue-400"
                    >
                      {countingProspects ? '...' : prospectCount.toLocaleString()}
                    </motion.p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">prospectos</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={saving || !formData.nombre.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                {saving ? 'Guardando...' : editingAudience ? 'Actualizar' : 'Crear Audiencia'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Componente de Card de Audiencia (diseño similar a TemplateGridCard)
interface AudienceCardProps {
  audience: WhatsAppAudience;
  isSystem: boolean;
  onEdit: () => void;
  onDelete: () => void;
  index: number;
}

const AudienceCard: React.FC<AudienceCardProps> = ({
  audience,
  isSystem,
  onEdit,
  onDelete,
  index,
}) => {
  // Determinar color de la barra superior según el tipo de audiencia (colores acordes al diseño UI)
  const getBarColor = () => {
    if (isSystem) {
      return 'bg-gradient-to-r from-blue-500 to-indigo-600';
    }
    if (audience.prospectos_count > 1000) {
      return 'bg-gradient-to-r from-emerald-500 to-teal-600';
    }
    if (audience.prospectos_count > 100) {
      return 'bg-gradient-to-r from-blue-500 to-purple-600';
    }
    return 'bg-gradient-to-r from-indigo-500 to-purple-600';
  };

  const getBarTextColor = () => {
    if (isSystem) {
      return 'text-blue-50 dark:text-blue-100';
    }
    if (audience.prospectos_count > 1000) {
      return 'text-emerald-50 dark:text-emerald-100';
    }
    if (audience.prospectos_count > 100) {
      return 'text-blue-50 dark:text-blue-100';
    }
    return 'text-indigo-50 dark:text-indigo-100';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-blue-500/5"
    >
      {/* Indicador de estado superior */}
      <div className={`absolute top-0 left-0 right-0 h-5 relative ${getBarColor()}`}>
        {/* Barra de color inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-50" />
        {/* Texto del estado alineado a la derecha */}
        <span className={`absolute top-0.5 right-2 text-[10px] font-medium ${getBarTextColor()}`}>
          {isSystem ? 'Sistema' : `${audience.prospectos_count.toLocaleString()} prospectos`}
        </span>
      </div>

      {/* Contenido principal */}
      <div className="p-4 pt-6">
        {/* Header con nombre y badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={audience.nombre}>
              {audience.nombre}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {isSystem && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                  Sistema
                </span>
              )}
              {audience.etapa && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
                  {audience.etapa}
                </span>
              )}
            </div>
          </div>
          
          {/* Menu de acciones */}
          {!isSystem && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Descripción */}
        {audience.descripcion && (
          <div 
            className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3 min-h-[40px] line-clamp-2"
          >
            {audience.descripcion}
          </div>
        )}

        {/* Contador de prospectos destacado */}
        <div className="mb-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Prospectos
              </span>
            </div>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {audience.prospectos_count.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tags de criterios */}
        {((audience.destinos && audience.destinos.length > 0) || (audience.viaja_con && audience.viaja_con.length > 0) || audience.estado_civil) && (
          <div className="mb-3 space-y-1">
            <div className="flex flex-wrap gap-1">
              {audience.destinos && audience.destinos.length > 0 && (
                <span className="px-2 py-0.5 text-[9px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {audience.destinos.length === 1 ? audience.destinos[0] : `${audience.destinos.length} destinos`}
                </span>
              )}
              {audience.viaja_con && audience.viaja_con.slice(0, 2).map((tipo) => (
                <span 
                  key={tipo}
                  className="px-2 py-0.5 text-[9px] font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 rounded-md"
                >
                  {tipo}
                </span>
              ))}
              {audience.viaja_con && audience.viaja_con.length > 2 && (
                <span className="px-2 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-md">
                  +{audience.viaja_con.length - 2} más
                </span>
              )}
              {audience.estado_civil && (
                <span className="px-2 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md">
                  {audience.estado_civil}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer con metadata */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
            {audience.destinos && audience.destinos.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {audience.destinos.length} destino{(audience.destinos.length || 0) !== 1 ? 's' : ''}
              </span>
            )}
            {audience.viaja_con && audience.viaja_con.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {audience.viaja_con.length} tipo{(audience.viaja_con.length || 0) !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {/* Indicador de tipo */}
          <div className="flex items-center gap-1">
            {isSystem ? (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                <Tag className="w-3 h-3" />
                Sistema
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
                <Users className="w-3 h-3" />
                Personalizada
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AudienciasManager;

