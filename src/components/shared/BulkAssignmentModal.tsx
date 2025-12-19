/**
 * Modal para reasignación masiva de prospectos
 * Disponible para administradores, administradores operativos y coordinadores de Calidad
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X, Search, Loader2 } from 'lucide-react';
import { coordinacionService, type Ejecutivo } from '../../services/coordinacionService';
import { assignmentService } from '../../services/assignmentService';
import { permissionsService } from '../../services/permissionsService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface BulkAssignmentModalProps {
  prospectIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onAssignmentComplete?: () => void;
}

export const BulkAssignmentModal: React.FC<BulkAssignmentModalProps> = ({
  prospectIds,
  isOpen,
  onClose,
  onAssignmentComplete
}) => {
  const { user } = useAuth();
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedCoordinacionId, setSelectedCoordinacionId] = useState<string | null>(null);
  const [selectedEjecutivoId, setSelectedEjecutivoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [coordinaciones, setCoordinaciones] = useState<any[]>([]);
  const [isCoordinadorCalidad, setIsCoordinadorCalidad] = useState(false);

  const isAdmin = user?.role_name === 'admin';
  const isAdminOperativo = user?.role_name === 'administrador_operativo';
  const isCoordinador = user?.role_name === 'coordinador';

  // Verificar si es coordinador de Calidad y cargar datos
  useEffect(() => {
    const checkAndLoad = async () => {
      if (!isOpen || !user?.id) return;
      
      // Verificar si es coordinador de Calidad
      let esCoordCalidad = false;
      if (isCoordinador && !isAdmin && !isAdminOperativo) {
        esCoordCalidad = await permissionsService.isCoordinadorCalidad(user.id);
        setIsCoordinadorCalidad(esCoordCalidad);
      }
      
      // Cargar datos si tiene permisos
      if (isAdmin || isAdminOperativo || esCoordCalidad) {
        loadCoordinaciones();
        loadAllEjecutivos(esCoordCalidad);
      }
    };
    
    checkAndLoad();
  }, [isOpen, user?.id, isAdmin, isAdminOperativo, isCoordinador]);

  const loadCoordinaciones = async () => {
    try {
      const coordinacionesData = await coordinacionService.getCoordinaciones();
      setCoordinaciones(coordinacionesData.filter(c => c.is_active && !c.archivado));
    } catch (error) {
      console.error('Error cargando coordinaciones:', error);
      toast.error('Error al cargar coordinaciones');
    }
  };

  const loadAllEjecutivos = async (esCoordCalidad: boolean = false) => {
    setLoading(true);
    try {
      // IMPORTANTE: Para admin, admin operativo y coordinadores de Calidad, obtener TODAS las coordinaciones
      let todasCoordinaciones: any[] = [];
      try {
        todasCoordinaciones = await coordinacionService.getCoordinaciones();
        console.log(`📋 [BulkAssignmentModal] Todas las coordinaciones encontradas: ${todasCoordinaciones.length}`);
      } catch (coordError) {
        console.error('Error obteniendo coordinaciones:', coordError);
        toast.error('Error al cargar coordinaciones. Mostrando todos los ejecutivos activos.');
      }
      
      // Obtener todos los ejecutivos
      const allEjecutivos = await coordinacionService.getAllEjecutivos();
      
      // IMPORTANTE: Si el usuario es admin, admin operativo o coordinador de Calidad, también incluir coordinadores
      let allCoordinadores: Ejecutivo[] = [];
      if (isAdmin || isAdminOperativo || esCoordCalidad) {
        try {
          console.log(`🔍 [BulkAssignmentModal] Cargando coordinadores para admin/admin operativo/coord. calidad`);
          
          // Intentar obtener todos los coordinadores directamente (más eficiente)
          try {
            const todosCoordinadores = await coordinacionService.getAllCoordinadores();
            console.log(`📋 [BulkAssignmentModal] getAllCoordinadores() devolvió ${todosCoordinadores.length} coordinadores`);
            
            // Mostrar TODOS los coordinadores activos con coordinación asignada
            allCoordinadores = todosCoordinadores.filter(coord => {
              const isActive = coord.is_active;
              const hasCoordinacion = !!coord.coordinacion_id;
              return isActive && hasCoordinacion;
            });
            
            console.log(`✅ [BulkAssignmentModal] ${allCoordinadores.length} coordinadores filtrados de ${todosCoordinadores.length} totales`);
          } catch (getAllError) {
            console.warn('⚠️ [BulkAssignmentModal] getAllCoordinadores() falló, intentando por coordinación:', getAllError);
            
            // Fallback: obtener coordinadores de TODAS las coordinaciones
            const coordinadoresPromises = todasCoordinaciones.map(async (coord) => {
              try {
                const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coord.id);
                return coordinadores;
              } catch (error) {
                console.error(`❌ [BulkAssignmentModal] Error cargando coordinadores de ${coord.nombre}:`, error);
                return [];
              }
            });
            
            const coordinadoresArrays = await Promise.all(coordinadoresPromises);
            
            // Aplanar y marcar como coordinadores
            allCoordinadores = coordinadoresArrays.flat().map(coord => ({
              ...coord,
              is_coordinator: true
            }));
            
            // Eliminar duplicados por ID
            const uniqueCoordinadores = Array.from(
              new Map(allCoordinadores.map(coord => [coord.id, coord])).values()
            );
            
            console.log(`✅ [BulkAssignmentModal] Cargados ${uniqueCoordinadores.length} coordinadores únicos`);
            allCoordinadores = uniqueCoordinadores;
          }
        } catch (coordError) {
          console.error('❌ [BulkAssignmentModal] Error cargando coordinadores:', coordError);
        }
      }
      
      // Filtrar ejecutivos activos con coordinación asignada
      let ejecutivosFiltrados = allEjecutivos.filter(e => {
        const isActive = e.is_active;
        const hasCoordinacion = !!e.coordinacion_id;
        return isActive && hasCoordinacion;
      });
      
      console.log(`✅ [BulkAssignmentModal] ${ejecutivosFiltrados.length} ejecutivos activos cargados (de ${allEjecutivos.length} totales)`);
      
      // Agregar coordinadores a la lista si hay
      if (allCoordinadores.length > 0) {
        console.log(`🔍 [BulkAssignmentModal] Agregando ${allCoordinadores.length} coordinadores a la lista`);
        
        const coordinadoresMarcados = allCoordinadores.map(coord => ({
          ...coord,
          is_coordinator: true,
          coordinacion_nombre: todasCoordinaciones.find(c => c.id === coord.coordinacion_id)?.nombre || 'Sin coordinación'
        }));
        
        ejecutivosFiltrados = [...ejecutivosFiltrados, ...coordinadoresMarcados];
      }
      
      // NOTA: Coordinadores de Calidad pueden reasignar a CUALQUIER ejecutivo o coordinador
      // sin restricciones de id_dynamics o teléfono (igual que admins)
      if (esCoordCalidad && !isAdmin && !isAdminOperativo) {
        console.log(`🔍 [BulkAssignmentModal] Coordinador de CALIDAD - Acceso completo a todos los ejecutivos/coordinadores`);
        console.log(`✅ [BulkAssignmentModal] ${ejecutivosFiltrados.length} ejecutivos/coordinadores disponibles para reasignación`);
      }
      
      // Enriquecer ejecutivos con información de coordinación
      const ejecutivosEnriquecidos = ejecutivosFiltrados.map(ejecutivo => {
        const coordinacion = todasCoordinaciones.find(c => c.id === ejecutivo.coordinacion_id);
        return {
          ...ejecutivo,
          coordinacion_nombre: coordinacion?.nombre || 'Sin coordinación'
        };
      });
      
      setEjecutivos(ejecutivosEnriquecidos);
      console.log(`✅ [BulkAssignmentModal] Total de ejecutivos y coordinadores cargados: ${ejecutivosEnriquecidos.length}`);
    } catch (error) {
      console.error('Error cargando ejecutivos:', error);
      toast.error('Error al cargar ejecutivos');
    } finally {
      setLoading(false);
    }
  };

  const filteredEjecutivos = useMemo(() => {
    if (!searchTerm) return ejecutivos;
    
    const term = searchTerm.toLowerCase();
    return ejecutivos.filter(e => 
      e.full_name?.toLowerCase().includes(term) ||
      e.email?.toLowerCase().includes(term) ||
      e.coordinacion_nombre?.toLowerCase().includes(term)
    );
  }, [ejecutivos, searchTerm]);

  const handleAssign = async () => {
    if (!selectedEjecutivoId || !selectedCoordinacionId || !user?.id) {
      toast.error('Selecciona un ejecutivo y coordinación');
      return;
    }

    setAssigning(true);
    try {
      const selectedEjecutivo = ejecutivos.find(e => e.id === selectedEjecutivoId);
      const result = await assignmentService.assignProspectsBulkToEjecutivo(
        Array.from(prospectIds),
        selectedCoordinacionId,
        selectedEjecutivoId,
        user.id,
        `Reasignación masiva de ${prospectIds.length} prospectos a ${selectedEjecutivo?.full_name || 'ejecutivo'}`
      );

      if (result.success > 0) {
        toast.success(`${result.success} prospecto${result.success > 1 ? 's' : ''} reasignado${result.success > 1 ? 's' : ''} exitosamente`);
        if (result.failed > 0) {
          toast.error(`${result.failed} prospecto${result.failed > 1 ? 's' : ''} fallaron`);
        }
        onAssignmentComplete?.();
        onClose();
        setSelectedEjecutivoId(null);
        setSelectedCoordinacionId(null);
        setSearchTerm('');
      } else {
        toast.error('No se pudo reasignar ningún prospecto');
      }
    } catch (error) {
      console.error('Error en asignación masiva:', error);
      toast.error('Error al reasignar prospectos');
    } finally {
      setAssigning(false);
    }
  };

  // Cuando se selecciona un ejecutivo, actualizar la coordinación
  useEffect(() => {
    if (selectedEjecutivoId) {
      const ejecutivo = ejecutivos.find(e => e.id === selectedEjecutivoId);
      if (ejecutivo?.coordinacion_id) {
        setSelectedCoordinacionId(ejecutivo.coordinacion_id);
      }
    }
  }, [selectedEjecutivoId, ejecutivos]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reasignación Masiva
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {prospectIds.length} prospecto{prospectIds.length > 1 ? 's' : ''} seleccionado{prospectIds.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Buscador */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar ejecutivo o coordinación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Lista de ejecutivos */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredEjecutivos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No se encontraron ejecutivos
                  </div>
                ) : (
                  filteredEjecutivos.map((ejecutivo) => (
                    <motion.button
                      key={ejecutivo.id}
                      onClick={() => {
                        setSelectedEjecutivoId(ejecutivo.id);
                        if (ejecutivo.coordinacion_id) {
                          setSelectedCoordinacionId(ejecutivo.coordinacion_id);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedEjecutivoId === ejecutivo.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            ejecutivo.is_coordinator 
                              ? 'bg-purple-100 dark:bg-purple-900/30' 
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            {ejecutivo.is_coordinator ? (
                              <Users size={18} className="text-purple-600 dark:text-purple-400" />
                            ) : (
                              <User size={18} className="text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {ejecutivo.full_name}
                              {ejecutivo.is_coordinator && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                                  Coordinador
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {ejecutivo.email}
                            </div>
                            {ejecutivo.coordinacion_nombre && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                {ejecutivo.coordinacion_nombre}
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedEjecutivoId === ejecutivo.id && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={assigning}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedEjecutivoId || assigning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {assigning ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Reasignando...
                </>
              ) : (
                `Reasignar ${prospectIds.length} prospecto${prospectIds.length > 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

