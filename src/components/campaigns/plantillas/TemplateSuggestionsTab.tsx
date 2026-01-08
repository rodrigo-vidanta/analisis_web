import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  Download,
  Eye,
  Ban,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplateSuggestionsService, type TemplateSuggestion } from '../../../services/whatsappTemplateSuggestionsService';
import { useAuth } from '../../../contexts/AuthContext';
import { useEffectivePermissions } from '../../../hooks/useEffectivePermissions';
import { whatsappTemplatesService } from '../../../services/whatsappTemplatesService';
import type { CreateTemplateInput } from '../../../types/whatsappTemplates';

interface TemplateSuggestionsTabProps {
  onImportToTemplate: (suggestion: TemplateSuggestion) => void;
}

const TemplateSuggestionsTab: React.FC<TemplateSuggestionsTabProps> = ({ onImportToTemplate }) => {
  const { user } = useAuth();
  const { isAdmin } = useEffectivePermissions();
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<TemplateSuggestion | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [filterStatus]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      const data = await whatsappTemplateSuggestionsService.getAllSuggestions(filters);
      setSuggestions(data);
    } catch (error: any) {
      console.error('Error cargando sugerencias:', error);
      toast.error('Error al cargar sugerencias');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (suggestionId: string, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      toast.error('Por favor proporciona una razón para el rechazo');
      return;
    }

    try {
      setUpdatingStatus(suggestionId);
      await whatsappTemplateSuggestionsService.updateSuggestionStatus(
        suggestionId,
        {
          status,
          rejection_reason: status === 'REJECTED' ? rejectionReason : undefined,
        },
        user?.id || ''
      );
      toast.success(`Sugerencia ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente`);
      setShowRejectionModal(false);
      setRejectionReason('');
      loadSuggestions();
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      toast.error(error.message || 'Error al actualizar estado');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleImportToTemplate = async (suggestion: TemplateSuggestion) => {
    try {
      // Preparar datos para importar
      const templateData: CreateTemplateInput = {
        name: suggestion.name,
        language: 'es_MX',
        category: 'MARKETING',
        components: [
          {
            type: 'BODY',
            text: suggestion.template_text,
          }
        ],
        description: suggestion.justification,
        variable_mappings: [],
      };

      // Llamar al callback para abrir el modal de creación
      onImportToTemplate(suggestion);
    } catch (error: any) {
      console.error('Error importando sugerencia:', error);
      toast.error('Error al importar sugerencia');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtrar por estado:</span>
        {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status === 'all' ? 'Todas' : status === 'PENDING' ? 'Pendientes' : status === 'APPROVED' ? 'Aprobadas' : 'Rechazadas'}
          </button>
        ))}
      </div>

      {/* Lista de sugerencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {suggestion.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <User className="w-3 h-3" />
                  <span>Usuario ID: {suggestion.suggested_by.substring(0, 8)}...</span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                suggestion.status === 'PENDING'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : suggestion.status === 'APPROVED'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {suggestion.status === 'PENDING' ? 'Pendiente' : suggestion.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
              </div>
            </div>

            {/* Contenido */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
                {suggestion.template_text}
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(suggestion.suggested_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSuggestion(suggestion)}
                className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver
              </button>
              {isAdmin && suggestion.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(suggestion.id, 'APPROVED')}
                    disabled={updatingStatus === suggestion.id}
                    className="px-3 py-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSuggestion(suggestion);
                      setShowRejectionModal(true);
                    }}
                    className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
              {suggestion.status === 'APPROVED' && !suggestion.imported_to_template_id && (
                <button
                  onClick={() => handleImportToTemplate(suggestion)}
                  className="px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Importar
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {suggestions.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No hay sugerencias {filterStatus !== 'all' ? `con estado ${filterStatus}` : ''}</p>
        </div>
      )}

      {/* Modal de detalles */}
      {selectedSuggestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedSuggestion(null)}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
          >
            <h3 className="text-xl font-bold mb-4">{selectedSuggestion.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contenido:</label>
                <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">{selectedSuggestion.template_text}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Justificación:</label>
                <p className="mt-1 text-gray-900 dark:text-white">{selectedSuggestion.justification}</p>
              </div>
              {selectedSuggestion.rejection_reason && (
                <div>
                  <label className="text-sm font-medium text-red-600 dark:text-red-400">Razón de rechazo:</label>
                  <p className="mt-1 text-red-700 dark:text-red-300">{selectedSuggestion.rejection_reason}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de rechazo */}
      {showRejectionModal && selectedSuggestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowRejectionModal(false);
            setRejectionReason('');
          }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <h3 className="text-lg font-bold mb-4">Rechazar Sugerencia</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explica por qué se rechaza esta sugerencia..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedSuggestion.id, 'REJECTED')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Rechazar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TemplateSuggestionsTab;

