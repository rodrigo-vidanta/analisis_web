/**
 * ============================================
 * GESTIÓN DE COORDINACIONES - MÓDULO ADMINISTRACIÓN
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este componente solo es visible para administradores
 * 2. Permite CRUD completo de coordinaciones (crear, editar, eliminar, activar/desactivar)
 * 3. Incluye analíticas por coordinación y gestión de ejecutivos asignados
 * 4. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import { coordinacionService, type Coordinacion, type Ejecutivo } from '../../services/coordinacionService';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { 
  Building2, Plus, Edit, Trash2, Power, PowerOff, BarChart3, Users, 
  X, Loader2, Search, Filter, XCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CoordinacionWithStats extends Coordinacion {
  ejecutivos_count?: number;
  prospects_count?: number;
  calls_count?: number;
}

const CoordinacionesManager: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useEffectivePermissions();
  
  const [coordinaciones, setCoordinaciones] = useState<CoordinacionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'archived'>('all');
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showEjecutivosModal, setShowEjecutivosModal] = useState(false);
  const [showReasignacionModal, setShowReasignacionModal] = useState(false);
  
  const [selectedCoordinacion, setSelectedCoordinacion] = useState<CoordinacionWithStats | null>(null);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [coordinadores, setCoordinadores] = useState<Ejecutivo[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [coordinacionesDisponibles, setCoordinacionesDisponibles] = useState<Coordinacion[]>([]);
  const [nuevaCoordinacionId, setNuevaCoordinacionId] = useState<string>('');
  const [confirmDelay, setConfirmDelay] = useState<number>(0);
  const [confirmInterval, setConfirmInterval] = useState<NodeJS.Timeout | null>(null);
  const [confirmacionIniciada, setConfirmacionIniciada] = useState<boolean>(false);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    archivado: false,
    is_operativo: true,
  });

  useEffect(() => {
    if (isAdmin) {
      loadCoordinaciones();
    }
  }, [isAdmin]);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (confirmInterval) {
        clearInterval(confirmInterval);
      }
    };
  }, [confirmInterval]);

  const loadCoordinaciones = async () => {
    try {
      setLoading(true);
      // Cargar todas las coordinaciones (activas e inactivas)
      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .order('codigo');

      if (error) throw error;

      // Enriquecer con estadísticas y normalizar campos
      const coordinacionesWithStats = await Promise.all(
        (data || []).map(async (coord: any) => {
          // Normalizar campos: si no existen archivado/is_operativo, usar is_active
          const archivado = coord.archivado !== undefined ? coord.archivado : !coord.is_active;
          const is_operativo = coord.is_operativo !== undefined ? coord.is_operativo : true;

          // Contar ejecutivos asignados (solo si no está archivada)
          let ejecutivosCount = 0;
          if (!archivado) {
            // Usar user_profiles_v2 que ya tiene role_name incluido
            const { count } = await supabaseSystemUI
              .from('user_profiles_v2')
              .select('id', { count: 'exact', head: true })
              .eq('coordinacion_id', coord.id)
              .eq('role_name', 'ejecutivo')
              .eq('is_active', true);
            ejecutivosCount = count || 0;
          }

          // Contar prospectos asignados (desde base de análisis)
          // Esto requeriría una consulta a la base de análisis, por ahora lo dejamos como 0
          const prospectsCount = 0;

          // Contar llamadas asignadas (desde base de análisis)
          // Esto requeriría una consulta a la base de análisis, por ahora lo dejamos como 0
          const callsCount = 0;

          return {
            ...coord,
            archivado,
            is_operativo: is_operativo !== undefined ? is_operativo : (coord.is_active !== false), // Si is_active es true o null, es operativa
            ejecutivos_count: ejecutivosCount,
            prospects_count: prospectsCount,
            calls_count: callsCount,
          };
        })
      );

      setCoordinaciones(coordinacionesWithStats);
    } catch (error) {
      console.error('Error cargando coordinaciones:', error);
      toast.error('Error al cargar coordinaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadEjecutivos = async (coordinacionId: string) => {
    try {
      const ejecutivosData = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
      setEjecutivos(ejecutivosData);
    } catch (error) {
      console.error('Error cargando ejecutivos:', error);
      toast.error('Error al cargar ejecutivos');
    }
  };

  const loadStats = async (coordinacionId: string) => {
    try {
      const statsData = await coordinacionService.getCoordinacionStatistics(coordinacionId);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      toast.error('Error al cargar estadísticas');
    }
  };

  const handleCreate = async () => {
    if (!formData.codigo || !formData.nombre) {
      toast.error('Código y Nombre son requeridos');
      return;
    }

    try {
      setLoading(true);
      
      // Intentar crear con nuevos campos, pero manejar errores
      try {
        await coordinacionService.createCoordinacion({
          codigo: formData.codigo.trim().toUpperCase(),
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined,
          archivado: formData.archivado,
          is_operativo: formData.is_operativo,
        });
      } catch (createError: any) {
        // Si falla por columnas nuevas, crear solo con campos básicos
        if (createError.code === 'PGRST204' || createError.message?.includes('archivado') || createError.message?.includes('is_operativo')) {
          console.warn('Usando fallback: creando solo con campos básicos');
          await supabaseSystemUI
            .from('coordinaciones')
            .insert({
              codigo: formData.codigo.trim().toUpperCase(),
              nombre: formData.nombre.trim(),
              descripcion: formData.descripcion.trim() || null,
              is_active: !formData.archivado, // Mapear archivado a is_active
            });
        } else {
          throw createError;
        }
      }

      toast.success('Coordinación creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      await loadCoordinaciones();
    } catch (error: any) {
      console.error('Error creando coordinación:', error);
      toast.error(error.message || 'Error al crear coordinación');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCoordinacion || !formData.codigo || !formData.nombre) {
      toast.error('Código y Nombre son requeridos');
      return;
    }

    try {
      setLoading(true);
      
      // Actualizar coordinación normalmente (sin archivado, eso se maneja en el botón de archivar)
      // Simplificar: solo actualizar campos básicos directamente
      const { error } = await supabaseSystemUI
        .from('coordinaciones')
        .update({
          codigo: formData.codigo.trim().toUpperCase(),
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCoordinacion.id);
      
      if (error) {
        throw error;
      }

      toast.success('Coordinación actualizada exitosamente');
      setShowEditModal(false);
      resetForm();
      await loadCoordinaciones();
    } catch (error: any) {
      console.error('Error actualizando coordinación:', error);
      toast.error(error.message || 'Error al actualizar coordinación');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCoordinacion) return;

    try {
      setLoading(true);
      // Verificar si tiene ejecutivos asignados
      const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(selectedCoordinacion.id);
      if (ejecutivos.length > 0) {
        toast.error('No se puede eliminar una coordinación con ejecutivos asignados');
        setShowDeleteModal(false);
        return;
      }

      await coordinacionService.deleteCoordinacion(selectedCoordinacion.id);
      toast.success('Coordinación eliminada exitosamente');
      setShowDeleteModal(false);
      await loadCoordinaciones();
    } catch (error: any) {
      console.error('Error eliminando coordinación:', error);
      toast.error(error.message || 'Error al eliminar coordinación');
    } finally {
      setLoading(false);
    }
  };

  const loadUsuariosParaReasignacion = async (coordinacionId: string) => {
    try {
      const usuarios = await coordinacionService.getUsuariosParaReasignacion(coordinacionId);
      setEjecutivos(usuarios.ejecutivos);
      setCoordinadores(usuarios.coordinadores);
    } catch (error) {
      console.error('Error cargando usuarios para reasignación:', error);
      toast.error('Error al cargar usuarios');
    }
  };

  const loadCoordinacionesDisponibles = async (excludeId: string) => {
    try {
      const coordinaciones = await coordinacionService.getCoordinaciones();
      // Filtrar coordinaciones disponibles (excluir la que se está archivando y las archivadas)
      const disponibles = coordinaciones.filter(c => {
        if (c.id === excludeId) return false;
        // Si archivado existe, usar archivado; si no, usar !is_active
        const archivado = c.archivado !== undefined ? c.archivado : !c.is_active;
        return !archivado;
      });
      setCoordinacionesDisponibles(disponibles);
    } catch (error) {
      console.error('Error cargando coordinaciones disponibles:', error);
      toast.error('Error al cargar coordinaciones');
    }
  };

  const handleConfirmarReasignacion = async () => {
    if (!selectedCoordinacion || !nuevaCoordinacionId) {
      toast.error('Debes seleccionar una coordinación destino');
      return;
    }

    try {
      setLoading(true);
      const resultado = await coordinacionService.archivarCoordinacionYReasignar(
        selectedCoordinacion.id,
        nuevaCoordinacionId,
        user?.id || 'system'
      );

      if (resultado.success) {
        toast.success(
          `Coordinación archivada. ${resultado.ejecutivos_reasignados} ejecutivos y ${resultado.coordinadores_reasignados} coordinadores reasignados.`
        );
        setShowReasignacionModal(false);
        setNuevaCoordinacionId('');
        setConfirmDelay(0);
        setConfirmacionIniciada(false);
        if (confirmInterval) {
          clearInterval(confirmInterval);
          setConfirmInterval(null);
        }
        await loadCoordinaciones();
      } else {
        toast.error(resultado.error || 'Error al archivar coordinación');
      }
    } catch (error: any) {
      console.error('Error archivando coordinación:', error);
      toast.error(error.message || 'Error al archivar coordinación');
    } finally {
      setLoading(false);
    }
  };

  const iniciarDelayConfirmacion = () => {
    // Limpiar intervalo anterior si existe
    if (confirmInterval) {
      clearInterval(confirmInterval);
      setConfirmInterval(null);
    }
    
    // Marcar que la confirmación se inició
    setConfirmacionIniciada(true);
    setConfirmDelay(5); // 5 segundos de delay
    
    const interval = setInterval(() => {
      setConfirmDelay((prev) => {
        const nuevoValor = prev - 1;
        if (nuevoValor <= 0) {
          // Limpiar intervalo y asegurar que el estado se actualice a 0
          clearInterval(interval);
          setConfirmInterval(null);
          return 0;
        }
        return nuevoValor;
      });
    }, 1000);
    
    setConfirmInterval(interval);
  };

  const handleRemoveEjecutivo = async (ejecutivoId: string) => {
    if (!selectedCoordinacion) return;

    try {
      setLoading(true);
      await coordinacionService.assignEjecutivoToCoordinacion(
        ejecutivoId,
        null,
        user?.id || 'system'
      );
      toast.success('Ejecutivo removido de la coordinación');
      await loadEjecutivos(selectedCoordinacion.id);
      await loadCoordinaciones();
    } catch (error: any) {
      console.error('Error removiendo ejecutivo:', error);
      toast.error(error.message || 'Error al remover ejecutivo');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (coordinacion: CoordinacionWithStats) => {
    setSelectedCoordinacion(coordinacion);
    setFormData({
      codigo: coordinacion.codigo,
      nombre: coordinacion.nombre,
      descripcion: coordinacion.descripcion || '',
      archivado: coordinacion.archivado || false,
      is_operativo: coordinacion.is_operativo !== undefined ? coordinacion.is_operativo : true,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (coordinacion: CoordinacionWithStats) => {
    setSelectedCoordinacion(coordinacion);
    setShowDeleteModal(true);
  };

  const openStatsModal = async (coordinacion: CoordinacionWithStats) => {
    setSelectedCoordinacion(coordinacion);
    await loadStats(coordinacion.id);
    setShowStatsModal(true);
  };

  const openEjecutivosModal = async (coordinacion: CoordinacionWithStats) => {
    setSelectedCoordinacion(coordinacion);
    await loadEjecutivos(coordinacion.id);
    setShowEjecutivosModal(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      archivado: false,
      is_operativo: true,
    });
    setSelectedCoordinacion(null);
  };

  // Filtrar coordinaciones (por defecto solo mostrar activas/no archivadas)
  const filteredCoordinaciones = coordinaciones.filter((coord) => {
    const matchesSearch = 
      coord.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coord.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coord.descripcion && coord.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Normalizar archivado (si no existe, usar is_active)
    const archivado = coord.archivado !== undefined ? coord.archivado : !coord.is_active;
    
    const matchesFilter = 
      filterActive === 'all' ||
      (filterActive === 'active' && !archivado) ||
      (filterActive === 'archived' && archivado);

    return matchesSearch && matchesFilter;
  });

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg">
          Solo los administradores pueden acceder a esta sección
        </div>
      </div>
    );
  }

  // Calcular métricas
  const totalCoordinaciones = coordinaciones.length;
  const coordinacionesActivas = coordinaciones.filter(c => !c.archivado && c.is_operativo).length;
  const totalEjecutivos = coordinaciones.reduce((acc, c) => acc + (c.ejecutivos_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header minimalista y profesional */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Título e información */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Coordinaciones
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gestión de coordinaciones y ejecutivos
              </p>
            </div>
          </div>

          {/* Métricas inline */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{coordinacionesActivas}</span> activas
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{totalCoordinaciones}</span> total
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{totalEjecutivos}</span> ejecutivos
              </span>
            </div>
          </div>

          {/* Botón agregar */}
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 dark:bg-slate-600 rounded-lg hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda - más compacto */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar coordinación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'archived')}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="archived">Archivadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Coordinaciones - Diseño minimalista */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading && coordinaciones.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Cargando coordinaciones...</p>
          </div>
        ) : filteredCoordinaciones.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || filterActive !== 'all' 
                ? 'No se encontraron coordinaciones'
                : 'No hay coordinaciones registradas'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredCoordinaciones.map((coord) => {
              const archivado = coord.archivado !== undefined ? coord.archivado : !coord.is_active;
              const isOperativo = coord.is_operativo !== undefined ? coord.is_operativo : true;
              
              return (
                <div
                  key={coord.id}
                  className={`group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                    archivado ? 'opacity-50' : ''
                  }`}
                >
                  {/* Indicador de estado */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={async () => {
                        if (archivado) return;
                        try {
                          setLoading(true);
                          const nuevoEstado = !isOperativo;
                          const { error } = await supabaseSystemUI
                            .from('coordinaciones')
                            .update({ is_operativo: nuevoEstado, updated_at: new Date().toISOString() })
                            .eq('id', coord.id);
                          
                          if (error) {
                            toast.error(error.message || 'Error al actualizar');
                            return;
                          }
                          toast.success(`Coordinación ${nuevoEstado ? 'operativa' : 'pausada'}`);
                          await loadCoordinaciones();
                        } catch (error: any) {
                          toast.error(error.message || 'Error');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={archivado}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        archivado
                          ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                          : isOperativo
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={archivado ? 'Archivada' : isOperativo ? 'Operativa (clic para pausar)' : 'Pausada (clic para activar)'}
                    >
                      {isOperativo && !archivado ? (
                        <Power className="w-4 h-4" />
                      ) : (
                        <PowerOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {coord.nombre}
                      </span>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {coord.codigo}
                      </span>
                      {archivado && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                          Archivada
                        </span>
                      )}
                    </div>
                    {coord.descripcion && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {coord.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => openEjecutivosModal(coord)}
                      className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="font-medium">{coord.ejecutivos_count || 0}</span>
                    </button>
                    <button
                      onClick={() => openStatsModal(coord)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Ver analíticas"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(coord)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!archivado && (coord.ejecutivos_count || 0) === 0 && (
                      <button
                        onClick={() => openDeleteModal(coord)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar Coordinación */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {showCreateModal ? 'Nueva Coordinación' : 'Editar Coordinación'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {showCreateModal 
                        ? 'Crea una nueva coordinación en el sistema'
                        : 'Modifica los datos de la coordinación'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (showCreateModal) handleCreate();
                    else handleUpdate();
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Building2 className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <span>Código *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                        placeholder="Ej: COORD-001"
                        maxLength={20}
                      />
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <span>Nombre *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                        placeholder="Nombre de la coordinación"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <span>Descripción</span>
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                      placeholder="Descripción opcional de la coordinación"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  {/* Botón para Archivar (solo en modal de edición, solo si no está archivada) */}
                  {showEditModal && selectedCoordinacion && (() => {
                    const archivadoActual = selectedCoordinacion.archivado !== undefined 
                      ? selectedCoordinacion.archivado 
                      : !selectedCoordinacion.is_active;
                    
                    if (!archivadoActual) {
                      return (
                        <div className="p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                Archivar Coordinación
                              </h4>
                              <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                                Al archivar, se abrirá un modal para reasignar ejecutivos y coordinadores a otra coordinación.
                              </p>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={async () => {
                                  if (!selectedCoordinacion) return;
                                  
                                  // Guardar referencia antes de cerrar modal
                                  const coordinacionId = selectedCoordinacion.id;
                                  const coordinacionData = { ...selectedCoordinacion };
                                  
                                  // Cerrar modal de edición
                                  setShowEditModal(false);
                                  resetForm();
                                  
                                  // Pequeño delay para asegurar que el modal se cierre
                                  await new Promise(resolve => setTimeout(resolve, 100));
                                  
                                  // Establecer coordinación seleccionada antes de cargar datos
                                  setSelectedCoordinacion(coordinacionData);
                                  
                                  // Cargar datos en paralelo
                                  await Promise.all([
                                    loadUsuariosParaReasignacion(coordinacionId),
                                    loadCoordinacionesDisponibles(coordinacionId)
                                  ]);
                                  
                                  // Abrir modal de reasignación
                                  setShowReasignacionModal(true);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/25"
                              >
                                Archivar Coordinación
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                Coordinación Archivada
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                Esta coordinación está archivada. Puedes desarchivarla para reactivarla.
                              </p>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    // Desarchivar: actualizar archivado a false e is_operativo a true
                                    const { error } = await supabaseSystemUI
                                      .from('coordinaciones')
                                      .update({
                                        archivado: false,
                                        is_operativo: true,
                                        is_active: true,
                                        updated_at: new Date().toISOString(),
                                      })
                                      .eq('id', selectedCoordinacion.id);
                                    
                                    if (error) {
                                      // Si falla por columnas nuevas, usar solo is_active
                                      if (error.code === 'PGRST204' || error.message?.includes('archivado') || error.message?.includes('is_operativo')) {
                                        const { error: fallbackError } = await supabaseSystemUI
                                          .from('coordinaciones')
                                          .update({
                                            is_active: true,
                                            updated_at: new Date().toISOString(),
                                          })
                                          .eq('id', selectedCoordinacion.id);
                                        
                                        if (fallbackError) throw fallbackError;
                                      } else {
                                        throw error;
                                      }
                                    }
                                    
                                    toast.success('Coordinación desarchivada exitosamente');
                                    setShowEditModal(false);
                                    resetForm();
                                    await loadCoordinaciones();
                                  } catch (error: any) {
                                    console.error('Error desarchivando:', error);
                                    toast.error(error.message || 'Error al desarchivar');
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-500/25"
                              >
                                Desarchivar Coordinación
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </form>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  onClick={() => {
                    if (showCreateModal) handleCreate();
                    else handleUpdate();
                  }}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-slate-700 dark:bg-slate-600 rounded-xl hover:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{showCreateModal ? 'Creando...' : 'Actualizando...'}</span>
                    </span>
                  ) : (
                    showCreateModal ? 'Crear Coordinación' : 'Guardar Cambios'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Eliminar */}
      <AnimatePresence>
        {showDeleteModal && selectedCoordinacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                ¿Eliminar Coordinación?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                ¿Estás seguro de que deseas eliminar la coordinación <strong>{selectedCoordinacion.nombre}</strong>?
                Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Analíticas */}
      <AnimatePresence>
        {showStatsModal && selectedCoordinacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setShowStatsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Analíticas - {selectedCoordinacion.nombre}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Estadísticas y métricas de la coordinación
                    </p>
                  </div>
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 px-8 py-6">
                {stats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Prospectos Asignados</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.prospects_assigned_count || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Llamadas Asignadas</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.calls_assigned_count || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Conversaciones</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.conversations_assigned_count || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Última Asignación</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {stats.last_assignment_time 
                          ? new Date(stats.last_assignment_time).toLocaleDateString()
                          : 'Nunca'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No hay estadísticas disponibles</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Ejecutivos */}
      <AnimatePresence>
        {showEjecutivosModal && selectedCoordinacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setShowEjecutivosModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Ejecutivos - {selectedCoordinacion.nombre}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Gestiona los ejecutivos asignados a esta coordinación
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEjecutivosModal(false)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 px-8 py-6">
                {ejecutivos.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No hay ejecutivos asignados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ejecutivos.map((ejecutivo) => (
                      <div
                        key={ejecutivo.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {ejecutivo.full_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {ejecutivo.email}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveEjecutivo(ejecutivo.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remover de coordinación"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Reasignación al Archivar */}
      <AnimatePresence>
        {showReasignacionModal && selectedCoordinacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => {
              if (confirmDelay === 0) {
                setShowReasignacionModal(false);
                setNuevaCoordinacionId('');
                if (confirmInterval) {
                  clearInterval(confirmInterval);
                  setConfirmInterval(null);
                }
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-red-900/20 dark:via-gray-900 dark:to-red-900/20 border-b border-red-100 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Archivar Coordinación
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">
                      Esta operación es irreversible. Todos los ejecutivos y coordinadores serán reasignados.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowReasignacionModal(false);
                      setNuevaCoordinacionId('');
                      setConfirmDelay(0);
                      setConfirmacionIniciada(false);
                      if (confirmInterval) {
                        clearInterval(confirmInterval);
                        setConfirmInterval(null);
                      }
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="space-y-6">
                  {/* Advertencia */}
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                          Advertencia: Operación Irreversible
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Al archivar la coordinación <strong>{selectedCoordinacion.nombre}</strong>, todos los ejecutivos y coordinadores asignados serán reasignados automáticamente a la coordinación destino que selecciones.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Usuarios a reasignar */}
                  <div className="space-y-4">
                    {ejecutivos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Ejecutivos a Reasignar ({ejecutivos.length})</span>
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                          <div className="space-y-1">
                            {ejecutivos.map((ejecutivo) => (
                              <div key={ejecutivo.id} className="text-sm text-gray-600 dark:text-gray-400">
                                • {ejecutivo.full_name} ({ejecutivo.email})
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {coordinadores.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Coordinadores a Reasignar ({coordinadores.length})</span>
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                          <div className="space-y-1">
                            {coordinadores.map((coordinador) => (
                              <div key={coordinador.id} className="text-sm text-gray-600 dark:text-gray-400">
                                • {coordinador.full_name} ({coordinador.email})
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {ejecutivos.length === 0 && coordinadores.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No hay usuarios asignados a esta coordinación</p>
                      </div>
                    )}
                  </div>

                  {/* Selector de coordinación destino */}
                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <Building2 className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <span>Coordinación Destino *</span>
                    </label>
                    <select
                      value={nuevaCoordinacionId}
                      onChange={(e) => {
                        setNuevaCoordinacionId(e.target.value);
                        // Si se cambia la coordinación destino, resetear el conteo
                        if (confirmDelay > 0 || confirmacionIniciada) {
                          setConfirmDelay(0);
                          setConfirmacionIniciada(false);
                          if (confirmInterval) {
                            clearInterval(confirmInterval);
                            setConfirmInterval(null);
                          }
                        }
                      }}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                      required
                    >
                      <option value="">Selecciona una coordinación...</option>
                      {coordinacionesDisponibles.map((coord) => (
                        <option key={coord.id} value={coord.id}>
                          {coord.codigo} - {coord.nombre}
                        </option>
                      ))}
                    </select>
                    {coordinacionesDisponibles.length === 0 && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        No hay coordinaciones disponibles para reasignación
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: confirmDelay === 0 ? 1.02 : 1 }}
                  whileTap={{ scale: confirmDelay === 0 ? 0.98 : 1 }}
                  type="button"
                  onClick={() => {
                    if (confirmDelay === 0) {
                      setShowReasignacionModal(false);
                      setNuevaCoordinacionId('');
                      setConfirmDelay(0);
                      if (confirmInterval) {
                        clearInterval(confirmInterval);
                        setConfirmInterval(null);
                      }
                    }
                  }}
                  disabled={confirmDelay > 0}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </motion.button>
                {!confirmacionIniciada ? (
                  <motion.button
                    whileHover={{ scale: nuevaCoordinacionId ? 1.02 : 1 }}
                    whileTap={{ scale: nuevaCoordinacionId ? 0.98 : 1 }}
                    type="button"
                    onClick={() => {
                      if (nuevaCoordinacionId) {
                        iniciarDelayConfirmacion();
                      } else {
                        toast.error('Debes seleccionar una coordinación destino');
                      }
                    }}
                    disabled={loading || !nuevaCoordinacionId}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-red-500/25"
                  >
                    Iniciar Confirmación
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: confirmDelay === 0 && !loading ? 1.02 : 1 }}
                    whileTap={{ scale: confirmDelay === 0 && !loading ? 0.98 : 1 }}
                    type="button"
                    onClick={() => {
                      if (confirmDelay === 0 && !loading) {
                        handleConfirmarReasignacion();
                      }
                    }}
                    disabled={loading || confirmDelay > 0}
                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 shadow-lg ${
                      confirmDelay === 0 && !loading
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/25 cursor-pointer'
                        : 'bg-gradient-to-r from-red-400 to-red-500 shadow-red-500/10 cursor-not-allowed opacity-75'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Archivando...</span>
                      </span>
                    ) : confirmDelay > 0 ? (
                      `Espera ${confirmDelay}s para confirmar`
                    ) : (
                      'Confirmar Archivado'
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoordinacionesManager;

