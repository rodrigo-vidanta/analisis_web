/**
 * ============================================
 * GESTIÓN DE EJECUTIVOS - MÓDULO COORDINACIONES
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este componente solo es visible para coordinadores
 * 2. Permite gestionar ejecutivos de la coordinación del coordinador
 * 3. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { coordinacionService, type Ejecutivo } from '../../services/coordinacionService';
import { assignmentService } from '../../services/assignmentService';
import { permissionsService } from '../../services/permissionsService';
import { Users, Plus, Edit, Trash2, UserCheck, UserX, BarChart3, Mail, Phone, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
// NOTA: El hash de contraseña se debe generar en el backend o usar una función RPC
// Por ahora, se usará un placeholder que debe ser reemplazado por el hash real

const EjecutivosManager: React.FC = () => {
  const { user } = useAuth();
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<Ejecutivo | null>(null);
  const [coordinacionId, setCoordinacionId] = useState<string | null>(null);
  const [coordinacionesIds, setCoordinacionesIds] = useState<string[]>([]); // Todas las coordinaciones del coordinador
  const [isCoordinador, setIsCoordinador] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  useEffect(() => {
    checkPermissions();
  }, [user]);

  useEffect(() => {
    if (isCoordinador && coordinacionesIds.length > 0) {
      loadEjecutivos();
    }
  }, [isCoordinador, coordinacionesIds]);

  const checkPermissions = async () => {
    if (!user?.id) return;

    try {
      const isCoord = await permissionsService.isCoordinador(user.id);
      setIsCoordinador(isCoord);

      if (isCoord) {
        // Para coordinadores, obtener todas sus coordinaciones desde la tabla intermedia
        const coordinaciones = await permissionsService.getCoordinacionesFilter(user.id);
        
        if (coordinaciones && coordinaciones.length > 0) {
          // Guardar todas las coordinaciones
          setCoordinacionesIds(coordinaciones);
          // Usar la primera coordinación como coordinacionId principal
          setCoordinacionId(coordinaciones[0]);
          console.log('✅ Coordinador con coordinaciones:', coordinaciones);
        } else {
          console.warn('⚠️ Coordinador sin coordinaciones asignadas');
          toast.error('No se pudo identificar tu coordinación. Contacta al administrador.');
        }
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
      toast.error('Error al verificar permisos');
    }
  };

  const loadEjecutivos = async () => {
    if (!coordinacionesIds || coordinacionesIds.length === 0) return;

    try {
      setLoading(true);
      
      // Obtener ejecutivos de todas las coordinaciones del coordinador
      const ejecutivosPromises = coordinacionesIds.map(coordinacionId => 
        coordinacionService.getEjecutivosByCoordinacion(coordinacionId)
      );
      
      // Obtener coordinadores de todas las coordinaciones del coordinador
      const coordinadoresPromises = coordinacionesIds.map(coordinacionId => 
        coordinacionService.getCoordinadoresByCoordinacion(coordinacionId)
      );
      
      // Ejecutar todas las consultas en paralelo
      const [ejecutivosArrays, coordinadoresArrays] = await Promise.all([
        Promise.all(ejecutivosPromises),
        Promise.all(coordinadoresPromises)
      ]);
      
      // Combinar todos los ejecutivos y coordinadores
      const allEjecutivos = ejecutivosArrays.flat();
      const allCoordinadores = coordinadoresArrays.flat().map(coord => ({
        ...coord,
        is_coordinator: true
      }));
      
      // Combinar y eliminar duplicados por ID
      const combined = [...allEjecutivos, ...allCoordinadores];
      const uniqueEjecutivos = combined.filter((ejecutivo, index, self) =>
        index === self.findIndex(e => e.id === ejecutivo.id)
      );
      
      // Filtrar solo los que pertenecen a las coordinaciones del coordinador
      const filteredEjecutivos = uniqueEjecutivos.filter(ejecutivo => 
        ejecutivo.coordinacion_id && coordinacionesIds.includes(ejecutivo.coordinacion_id)
      );
      
      setEjecutivos(filteredEjecutivos);
      console.log('✅ Ejecutivos cargados para coordinaciones:', coordinacionesIds, 'Total:', filteredEjecutivos.length);
    } catch (error) {
      console.error('Error cargando ejecutivos:', error);
      toast.error('Error al cargar ejecutivos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEjecutivo = async () => {
    if (!coordinacionId) {
      toast.error('No se pudo identificar la coordinación');
      return;
    }

    if (!formData.email || !formData.full_name) {
      toast.error('Email y Nombre Completo son requeridos');
      return;
    }

    try {
      // Usar función RPC que maneja el hash de contraseña en el backend
      await coordinacionService.createEjecutivo(coordinacionId, {
        email: formData.email,
        password: formData.password || 'Admin$2025', // Contraseña en texto plano, se hasheará en el backend
        full_name: formData.full_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });

      toast.success('Ejecutivo creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadEjecutivos();
    } catch (error: any) {
      console.error('Error creando ejecutivo:', error);
      toast.error(error.message || 'Error al crear ejecutivo');
    }
  };

  const handleUpdateEjecutivo = async () => {
    if (!selectedEjecutivo) return;

    try {
      await coordinacionService.updateEjecutivo(selectedEjecutivo.id, {
        full_name: formData.full_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });

      toast.success('Ejecutivo actualizado exitosamente');
      setShowEditModal(false);
      setSelectedEjecutivo(null);
      resetForm();
      loadEjecutivos();
    } catch (error: any) {
      console.error('Error actualizando ejecutivo:', error);
      toast.error(error.message || 'Error al actualizar ejecutivo');
    }
  };

  const handleToggleActive = async (ejecutivo: Ejecutivo) => {
    try {
      await coordinacionService.updateEjecutivo(ejecutivo.id, {
        is_active: !ejecutivo.is_active,
      });

      toast.success(`Ejecutivo ${ejecutivo.is_active ? 'desactivado' : 'activado'} exitosamente`);
      loadEjecutivos();
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      toast.error(error.message || 'Error al cambiar estado');
    }
  };

  const handleToggleCoordinacion = async (ejecutivo: Ejecutivo) => {
    if (!coordinacionId || !user?.id) return;

    try {
      const isCurrentlyAssigned = ejecutivo.coordinacion_id === coordinacionId;
      const newCoordinacionId = isCurrentlyAssigned ? null : coordinacionId;

      await coordinacionService.assignEjecutivoToCoordinacion(
        ejecutivo.id,
        newCoordinacionId,
        user.id
      );

      toast.success(
        isCurrentlyAssigned
          ? 'Ejecutivo liberado de la coordinación'
          : 'Ejecutivo asignado a la coordinación'
      );
      loadEjecutivos();
    } catch (error: any) {
      console.error('Error cambiando coordinación:', error);
      toast.error(error.message || 'Error al cambiar coordinación');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      first_name: '',
      last_name: '',
      phone: '',
    });
  };

  const openEditModal = (ejecutivo: Ejecutivo) => {
    setSelectedEjecutivo(ejecutivo);
    setFormData({
      email: ejecutivo.email,
      password: '', // No mostrar contraseña
      full_name: ejecutivo.full_name,
      first_name: ejecutivo.first_name || '',
      last_name: ejecutivo.last_name || '',
      phone: ejecutivo.phone || '',
    });
    setShowEditModal(true);
  };

  const openStatsModal = (ejecutivo: Ejecutivo) => {
    setSelectedEjecutivo(ejecutivo);
    setShowStatsModal(true);
  };

  // Si no es coordinador, no mostrar nada
  if (!isCoordinador) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No tienes permisos para acceder a esta sección. Solo los coordinadores pueden gestionar ejecutivos.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7" />
            Gestión de Ejecutivos
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona los ejecutivos de tu coordinación
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Ejecutivo
        </motion.button>
      </div>

      {/* Lista de Ejecutivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ejecutivos.map((ejecutivo) => {
          const isAssignedToMyCoordinacion = ejecutivo.coordinacion_id && coordinacionesIds.includes(ejecutivo.coordinacion_id);
          const hasNoCoordinacion = !ejecutivo.coordinacion_id;

          return (
            <motion.div
              key={ejecutivo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-2 ${
                isAssignedToMyCoordinacion
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
                  : hasNoCoordinacion
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{ejecutivo.full_name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Mail className="w-4 h-4" />
                    {ejecutivo.email}
                  </p>
                  {ejecutivo.phone && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <Phone className="w-4 h-4" />
                      {ejecutivo.phone}
                    </p>
                  )}
                  {ejecutivo.coordinacion_nombre && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3" />
                      {ejecutivo.coordinacion_nombre}
                    </p>
                  )}
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  ejecutivo.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {ejecutivo.is_active ? 'Activo' : 'Inactivo'}
                </div>
              </div>

              {/* Toggle para unir/liberar de coordinación */}
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isAssignedToMyCoordinacion ? 'En mi coordinación' : hasNoCoordinacion ? 'Sin coordinación' : 'En otra coordinación'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isAssignedToMyCoordinacion}
                      onChange={() => handleToggleCoordinacion(ejecutivo)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      isAssignedToMyCoordinacion
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        isAssignedToMyCoordinacion ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEditModal(ejecutivo)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => openStatsModal(ejecutivo)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center gap-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  Estadísticas
                </button>
                <button
                  onClick={() => handleToggleActive(ejecutivo)}
                  className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center ${
                    ejecutivo.is_active
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  {ejecutivo.is_active ? (
                    <UserX className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {ejecutivos.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No hay ejecutivos registrados</p>
        </div>
      )}

      {/* Modal Crear Ejecutivo */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header con Avatar */}
              <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <motion.h3
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                      Nuevo Ejecutivo
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                    >
                      Crea un nuevo ejecutivo para tu coordinación
                    </motion.p>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Contenido con Scroll */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleCreateEjecutivo(); }}>
                  {/* Sección: Información Personal */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Personal
                      </h4>
                    </div>

                    {/* Email */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="group"
                    >
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Email *</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="ejecutivo@ejemplo.com"
                        required
                      />
                    </motion.div>

                    {/* Contraseña */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="group"
                    >
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Contraseña *</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Admin$2025 (por defecto)"
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      />
                    </motion.div>

                    {/* Nombre Completo */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="group"
                    >
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Nombre Completo *</span>
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="Nombre completo del ejecutivo"
                        required
                      />
                    </motion.div>

                    {/* Nombre y Apellido */}
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="group"
                      >
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Nombre</span>
                        </label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Nombre"
                        />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="group"
                      >
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Apellido</span>
                        </label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Apellido"
                        />
                      </motion.div>
                    </div>

                    {/* Teléfono */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="group"
                    >
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>Teléfono</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="+52 33 1234 5678"
                      />
                    </motion.div>
                  </motion.div>
                </form>
              </div>

              {/* Footer con Botones */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateEjecutivo}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  Crear Ejecutivo
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Ejecutivo */}
      <AnimatePresence>
        {showEditModal && selectedEjecutivo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowEditModal(false);
              setSelectedEjecutivo(null);
              resetForm();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editar Ejecutivo</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEjecutivo(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateEjecutivo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Estadísticas */}
      <AnimatePresence>
        {showStatsModal && selectedEjecutivo && (
          <EjecutivoStatsModal
            ejecutivo={selectedEjecutivo}
            isOpen={showStatsModal}
            onClose={() => {
              setShowStatsModal(false);
              setSelectedEjecutivo(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente Modal de Estadísticas
interface EjecutivoStatsModalProps {
  ejecutivo: Ejecutivo;
  isOpen: boolean;
  onClose: () => void;
}

const EjecutivoStatsModal: React.FC<EjecutivoStatsModalProps> = ({ ejecutivo, isOpen, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, ejecutivo.id]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const todayStats = await coordinacionService.getEjecutivoStatistics(ejecutivo.id);
      setStats(todayStats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Estadísticas - {ejecutivo.full_name}
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Prospectos asignados hoy</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.prospects_assigned_count || 0}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Llamadas asignadas hoy</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats?.calls_assigned_count || 0}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Conversaciones asignadas hoy</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats?.conversations_assigned_count || 0}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EjecutivosManager;

