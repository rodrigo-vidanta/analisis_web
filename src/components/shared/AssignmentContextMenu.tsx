/**
 * Componente de menú contextual para asignar prospectos a ejecutivos
 * Se muestra al hacer clic derecho sobre un prospecto o conversación
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X, Check } from 'lucide-react';
import { coordinacionService, type Ejecutivo } from '../../services/coordinacionService';
import { assignmentService } from '../../services/assignmentService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AssignmentContextMenuProps {
  prospectId: string;
  coordinacionId?: string;
  ejecutivoId?: string;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAssignmentComplete?: () => void;
}

export const AssignmentContextMenu: React.FC<AssignmentContextMenuProps> = ({
  prospectId,
  coordinacionId,
  ejecutivoId,
  isOpen,
  position,
  onClose,
  onAssignmentComplete
}) => {
  const { user } = useAuth();
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [currentCoordinacionId, setCurrentCoordinacionId] = useState<string | undefined>(coordinacionId);

  // Cargar ejecutivos de la coordinación
  useEffect(() => {
    if (isOpen && currentCoordinacionId) {
      loadEjecutivos();
    } else if (isOpen && !currentCoordinacionId && user?.id) {
      // Si no hay coordinacionId, obtenerlo del usuario
      loadUserCoordinacion();
    }
  }, [isOpen, currentCoordinacionId, user?.id]);

  const loadUserCoordinacion = async () => {
    try {
      const { permissionsService } = await import('../../services/permissionsService');
      const coordinacionId = await permissionsService.getCoordinacionFilter(user!.id);
      if (coordinacionId) {
        setCurrentCoordinacionId(coordinacionId);
      }
    } catch (error) {
      console.error('Error obteniendo coordinación del usuario:', error);
    }
  };

  const loadEjecutivos = async () => {
    if (!currentCoordinacionId) return;

    setLoading(true);
    try {
      const ejecutivosData = await coordinacionService.getEjecutivosByCoordinacion(currentCoordinacionId);
      setEjecutivos(ejecutivosData);
    } catch (error) {
      console.error('Error cargando ejecutivos:', error);
      toast.error('Error al cargar ejecutivos');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (ejecutivoIdToAssign: string) => {
    if (!currentCoordinacionId) {
      toast.error('No se puede asignar: falta coordinación');
      return;
    }

    setAssigning(ejecutivoIdToAssign);
    try {
      // Si ya tiene ejecutivo asignado, es una reasignación
      if (ejecutivoId) {
        // Desactivar asignación anterior
        await assignmentService.assignProspectManuallyToEjecutivo(
          prospectId,
          currentCoordinacionId,
          ejecutivoIdToAssign,
          user!.id,
          `Reasignación desde ${user?.full_name || user?.email}`
        );
      } else {
        // Nueva asignación
        await assignmentService.assignProspectManuallyToEjecutivo(
          prospectId,
          currentCoordinacionId,
          ejecutivoIdToAssign,
          user!.id,
          `Asignación manual desde ${user?.full_name || user?.email}`
        );
      }

      toast.success('Prospecto asignado exitosamente');
      onAssignmentComplete?.();
      onClose();
    } catch (error) {
      console.error('Error asignando prospecto:', error);
      toast.error('Error al asignar prospecto');
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassign = async () => {
    if (!ejecutivoId) return;

    setAssigning('unassign');
    try {
      // Desactivar asignación actual
      const { assignmentService } = await import('../../services/assignmentService');
      // Necesitamos una función para desasignar, por ahora actualizamos manualmente
      const { supabaseSystemUIAdmin } = await import('../../config/supabaseSystemUI');
      
      await supabaseSystemUIAdmin
        .from('prospect_assignments')
        .update({ 
          ejecutivo_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('prospect_id', prospectId)
        .eq('is_active', true);

      toast.success('Ejecutivo desasignado');
      onAssignmentComplete?.();
      onClose();
    } catch (error) {
      console.error('Error desasignando:', error);
      toast.error('Error al desasignar');
    } finally {
      setAssigning(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[280px] max-w-[320px] max-h-[400px] overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, 0)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Asignar a Ejecutivo
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[320px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Cargando ejecutivos...</p>
            </div>
          ) : ejecutivos.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay ejecutivos disponibles en esta coordinación
              </p>
            </div>
          ) : (
            <div className="py-2">
              {ejecutivoId && (
                <button
                  onClick={handleUnassign}
                  disabled={assigning === 'unassign'}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>Desasignar ejecutivo actual</span>
                </button>
              )}
              
              {ejecutivos.map((ejecutivo) => (
                <button
                  key={ejecutivo.id}
                  onClick={() => handleAssign(ejecutivo.id)}
                  disabled={assigning === ejecutivo.id || (ejecutivoId === ejecutivo.id && !assigning)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                    ejecutivoId === ejecutivo.id
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      ejecutivoId === ejecutivo.id
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <User className={`w-4 h-4 ${
                        ejecutivoId === ejecutivo.id
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ejecutivo.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ejecutivo.email}</p>
                    </div>
                  </div>
                  {ejecutivoId === ejecutivo.id && (
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 ml-2" />
                  )}
                  {assigning === ejecutivo.id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 flex-shrink-0 ml-2"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

