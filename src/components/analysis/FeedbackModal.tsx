import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface FeedbackData {
  id?: string;
  call_id: string;
  feedback_text: string;
  feedback_summary?: string;
  created_by?: {
    id: string;
    name: string;
    email: string;
  };
  updated_by?: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
  helpful_votes?: number;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  callInfo: {
    customer_name: string;
    agent_name: string;
    call_type: string;
    start_time: string;
  };
  existingFeedback?: FeedbackData | null;
  onSave: (feedback: FeedbackData) => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  callId,
  callInfo,
  existingFeedback,
  onSave
}) => {
  // Estados del componente
  const [feedbackText, setFeedbackText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Hooks de autenticación
  const { user } = useAuth();
  
  // Constantes
  const MAX_CHARACTERS = 1500;
  const remainingCharacters = MAX_CHARACTERS - feedbackText.length;
  
  // ============================================
  // EFECTOS
  // ============================================
  
  // Cargar feedback existente cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (existingFeedback?.feedback_text) {
        setFeedbackText(existingFeedback.feedback_text);
        setIsEditing(true);
      } else {
        setFeedbackText('');
        setIsEditing(false);
      }
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, existingFeedback]);
  
  // Limpiar estados al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFeedbackText('');
      setError(null);
      setSuccess(null);
      setIsLoading(false);
      setIsEditing(false);
    }
  }, [isOpen]);
  
  // ============================================
  // HANDLERS
  // ============================================
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= MAX_CHARACTERS) {
      setFeedbackText(newText);
      setError(null);
    }
  };
  
  const handleSave = async () => {
    // Validaciones
    if (!feedbackText.trim()) {
      setError('La retroalimentación no puede estar vacía');
      return;
    }
    
    if (feedbackText.length > MAX_CHARACTERS) {
      setError(`La retroalimentación no puede exceder ${MAX_CHARACTERS} caracteres`);
      return;
    }
    
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Simular llamada a la API (se implementará en el siguiente paso)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Crear objeto de feedback
      const feedbackData: FeedbackData = {
        id: existingFeedback?.id || `temp-${Date.now()}`,
        call_id: callId,
        feedback_text: feedbackText.trim(),
        feedback_summary: feedbackText.trim().substring(0, 100) + (feedbackText.length > 100 ? '...' : ''),
        created_by: existingFeedback?.created_by || {
          id: user.id,
          name: user.full_name,
          email: user.email
        },
        updated_by: isEditing ? {
          id: user.id,
          name: user.full_name,
          email: user.email
        } : null,
        created_at: existingFeedback?.created_at || new Date().toISOString(),
        updated_at: isEditing ? new Date().toISOString() : existingFeedback?.updated_at,
        view_count: existingFeedback?.view_count || 0,
        helpful_votes: existingFeedback?.helpful_votes || 0
      };
      
      // Callback al componente padre
      onSave(feedbackData);
      
      setSuccess(isEditing ? 'Retroalimentación actualizada exitosamente' : 'Retroalimentación guardada exitosamente');
      
      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      console.error('Error saving feedback:', err);
      setError('Error al guardar la retroalimentación. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    if (isLoading) return; // Prevenir cierre durante carga
    onClose();
  };
  
  // ============================================
  // HELPERS
  // ============================================
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getCharacterCountColor = () => {
    if (remainingCharacters < 50) return 'text-red-600 dark:text-red-400';
    if (remainingCharacters < 150) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-500 dark:text-gray-400';
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
              {isEditing ? 'Editar Retroalimentación' : 'Agregar Retroalimentación'}
            </h2>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p><strong>Cliente:</strong> {callInfo.customer_name}</p>
              <p><strong>Agente:</strong> {callInfo.agent_name} • {callInfo.call_type}</p>
              <p><strong>Fecha:</strong> {formatDate(callInfo.start_time)}</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* CONTENIDO */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* Información existente si está editando */}
          {isEditing && existingFeedback && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                📝 Retroalimentación Existente
              </h3>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>Creada por:</strong> {existingFeedback.created_by?.name} ({formatDate(existingFeedback.created_at!)})</p>
                {existingFeedback.updated_by && (
                  <p><strong>Última edición:</strong> {existingFeedback.updated_by.name} ({formatDate(existingFeedback.updated_at!)})</p>
                )}
                <p><strong>Visualizaciones:</strong> {existingFeedback.view_count} • <strong>Votos útiles:</strong> {existingFeedback.helpful_votes}</p>
              </div>
            </div>
          )}
          
          {/* Área de texto */}
          <div className="mb-4">
            <label htmlFor="feedback-text" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Retroalimentación <span className="text-red-500">*</span>
            </label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={handleTextChange}
              disabled={isLoading}
              placeholder="Escribe tu retroalimentación sobre esta llamada. Incluye aspectos positivos, áreas de mejora, técnicas utilizadas, y recomendaciones específicas..."
              className="w-full h-48 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         placeholder-slate-400 dark:placeholder-slate-500
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         resize-none transition-colors"
              maxLength={MAX_CHARACTERS}
            />
            
            {/* Contador de caracteres */}
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Máximo {MAX_CHARACTERS} caracteres. Esta retroalimentación será visible para todos los usuarios.
              </p>
              <span className={`text-xs font-medium ${getCharacterCountColor()}`}>
                {remainingCharacters} restantes
              </span>
            </div>
          </div>
          
          {/* Mensajes de estado */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700 dark:text-green-300">{success}</span>
              </div>
            </div>
          )}
          
        </div>
        
        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 
                       rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={isLoading || !feedbackText.trim() || remainingCharacters < 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEditing ? 'Actualizar' : 'Guardar'}
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default FeedbackModal;
