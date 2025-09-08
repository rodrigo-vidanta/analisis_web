import React, { useState } from 'react';
import { supabaseMainAdmin } from '../../config/supabase';
import type { AgentTemplate } from '../../config/supabase';

interface DeleteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AgentTemplate | null;
  onSuccess: () => void;
}

const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({ 
  isOpen, 
  onClose, 
  template, 
  onSuccess 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

  const handleDelete = async () => {
    if (!template) return;

    if (confirmationText !== template.name) {
      setError(`Debe escribir exactamente "${template.name}" para confirmar`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Eliminar relaciones primero
      await supabaseMainAdmin
        .from('agent_prompts')
        .delete()
        .eq('agent_template_id', template.id);

      await supabaseMainAdmin
        .from('agent_tools')
        .delete()
        .eq('agent_template_id', template.id);

      // Eliminar el template
      const { error: deleteError } = await supabaseMainAdmin
        .from('agent_templates')
        .delete()
        .eq('id', template.id);

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
      setConfirmationText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la plantilla');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Eliminar Plantilla
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">
                  Esta acción no se puede deshacer
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Se eliminará permanentemente la plantilla y todos sus datos asociados.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-slate-700 dark:text-slate-300 mb-2">
              Para confirmar la eliminación, escriba el nombre exacto de la plantilla:
            </p>
            <p className="font-medium text-slate-900 dark:text-white mb-3">
              "{template.name}"
            </p>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Escriba el nombre de la plantilla aquí"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading || confirmationText !== template.name}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Eliminando...' : 'Eliminar Plantilla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteTemplateModal;
