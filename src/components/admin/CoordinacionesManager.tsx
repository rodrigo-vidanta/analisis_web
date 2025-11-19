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
import { coordinacionService, type Coordinacion, type Ejecutivo } from '../../services/coordinacionService';
import { supabaseSystemUIAdmin } from '../../config/supabaseSystemUI';
import { 
  Building2, Plus, Edit, Trash2, Power, PowerOff, BarChart3, Users, 
  X, Loader2, Search, Filter, CheckCircle2, XCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CoordinacionWithStats extends Coordinacion {
  ejecutivos_count?: number;
  prospects_count?: number;
  calls_count?: number;
}

const CoordinacionesManager: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'admin';
  
  const [coordinaciones, setCoordinaciones] = useState<CoordinacionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showEjecutivosModal, setShowEjecutivosModal] = useState(false);
  
  const [selectedCoordinacion, setSelectedCoordinacion] = useState<CoordinacionWithStats | null>(null);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    is_active: true,
  });

  useEffect(() => {
    if (isAdmin) {
      loadCoordinaciones();
    }
  }, [isAdmin]);

  const loadCoordinaciones = async () => {
    try {
      setLoading(true);
      // Cargar todas las coordinaciones (activas e inactivas)
      const { data, error } = await supabaseSystemUIAdmin
        .from('coordinaciones')
        .select('*')
        .order('codigo');

      if (error) throw error;

      // Enriquecer con estadísticas
      const coordinacionesWithStats = await Promise.all(
        (data || []).map(async (coord) => {
          // Contar ejecutivos asignados
          const { count: ejecutivosCount } = await supabaseSystemUIAdmin
            .from('auth_users')
            .select('*', { count: 'exact', head: true })
            .eq('coordinacion_id', coord.id)
            .eq('is_ejecutivo', true)
            .eq('is_active', true);

          // Contar prospectos asignados (desde base de análisis)
          // Esto requeriría una consulta a la base de análisis, por ahora lo dejamos como 0
          const prospectsCount = 0;

          // Contar llamadas asignadas (desde base de análisis)
          // Esto requeriría una consulta a la base de análisis, por ahora lo dejamos como 0
          const callsCount = 0;

          return {
            ...coord,
            ejecutivos_count: ejecutivosCount || 0,
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
      await coordinacionService.createCoordinacion({
        codigo: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        is_active: formData.is_active,
      });

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
      await coordinacionService.updateCoordinacion(selectedCoordinacion.id, {
        codigo: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        is_active: formData.is_active,
      });

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

  const handleToggleActive = async (coordinacion: CoordinacionWithStats) => {
    try {
      setLoading(true);
      await coordinacionService.toggleCoordinacionActive(coordinacion.id, !coordinacion.is_active);
      toast.success(`Coordinación ${!coordinacion.is_active ? 'activada' : 'desactivada'} exitosamente`);
      await loadCoordinaciones();
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      toast.error(error.message || 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
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
      is_active: coordinacion.is_active,
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
      is_active: true,
    });
    setSelectedCoordinacion(null);
  };

  // Filtrar coordinaciones
  const filteredCoordinaciones = coordinaciones.filter((coord) => {
    const matchesSearch = 
      coord.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coord.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coord.descripcion && coord.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = 
      filterActive === 'all' ||
      (filterActive === 'active' && coord.is_active) ||
      (filterActive === 'inactive' && !coord.is_active);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Coordinaciones
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra coordinaciones, ejecutivos y analíticas
          </p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Coordinación</span>
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de coordinaciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading && coordinaciones.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando coordinaciones...</p>
          </div>
        ) : filteredCoordinaciones.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterActive !== 'all' 
                ? 'No se encontraron coordinaciones con los filtros aplicados'
                : 'No hay coordinaciones registradas'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ejecutivos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCoordinaciones.map((coord) => (
                  <tr key={coord.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {coord.codigo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {coord.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                        {coord.descripcion || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openEjecutivosModal(coord)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <Users className="w-4 h-4" />
                        <span>{coord.ejecutivos_count || 0}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        coord.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {coord.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openStatsModal(coord)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Ver analíticas"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(coord)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(coord)}
                          className={`${
                            coord.is_active
                              ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300'
                              : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300'
                          }`}
                          title={coord.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {coord.is_active ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openDeleteModal(coord)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

                  {/* Toggle Switch para Estado Activo */}
                  <label className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all duration-200 group">
                    <div className="flex items-center space-x-3">
                      <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        formData.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}>
                        <motion.div
                          animate={{ x: formData.is_active ? 24 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Coordinación Activa
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formData.is_active 
                            ? 'La coordinación está activa y puede recibir asignaciones'
                            : 'La coordinación está inactiva y no recibirá asignaciones automáticas'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  </label>
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
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
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
    </div>
  );
};

export default CoordinacionesManager;

