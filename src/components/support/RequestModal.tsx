// ============================================
// MODAL DE REQUERIMIENTO
// ============================================
// Formulario dinámico con categorías y subcategorías

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService, REQUIREMENT_CATEGORIES, type RequirementCategory } from '../../services/ticketService';
import toast from 'react-hot-toast';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'category' | 'subcategory' | 'form'>('category');
  const [selectedCategory, setSelectedCategory] = useState<RequirementCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetear al cerrar
  const handleClose = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setFormData({});
    setAdditionalNotes('');
    onClose();
  };

  // Seleccionar categoría
  const handleCategorySelect = (category: RequirementCategory) => {
    setSelectedCategory(category);
    setStep('subcategory');
  };

  // Seleccionar subcategoría
  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setFormData({});
    setStep('form');
  };

  // Volver atrás
  const handleBack = () => {
    if (step === 'form') {
      setStep('subcategory');
      setSelectedSubcategory(null);
      setFormData({});
    } else if (step === 'subcategory') {
      setStep('category');
      setSelectedCategory(null);
    }
  };

  // Obtener preguntas del formulario actual
  const getCurrentQuestions = () => {
    if (!selectedCategory || !selectedSubcategory) return [];
    const category = REQUIREMENT_CATEGORIES[selectedCategory];
    const subcategory = category.subcategories.find(s => s.value === selectedSubcategory);
    return subcategory?.questions || [];
  };

  // Enviar requerimiento
  const handleSubmit = async () => {
    if (!user || !selectedCategory || !selectedSubcategory) return;

    // Validar campos requeridos
    const questions = getCurrentQuestions();
    for (const q of questions) {
      if (!formData[q.field]?.trim()) {
        toast.error(`El campo "${q.label}" es requerido`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const category = REQUIREMENT_CATEGORIES[selectedCategory];
      const subcategory = category.subcategories.find(s => s.value === selectedSubcategory);

      const { ticket, error } = await ticketService.createTicket({
        type: 'requerimiento',
        title: `${category.label}: ${subcategory?.label}`,
        description: additionalNotes || `Requerimiento de ${category.label} - ${subcategory?.label}`,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        priority: 'normal',
        form_data: formData,
        reporter_id: user.id,
        reporter_name: user.full_name || user.email,
        reporter_email: user.email,
        reporter_role: user.role_name
      });

      if (error) {
        throw new Error(error);
      }

      toast.success(`Ticket ${ticket?.ticket_number} creado exitosamente`);
      handleClose();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Error al crear el requerimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{ zIndex: 100000, margin: 'auto' }}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {step !== 'category' && (
                  <button
                    onClick={handleBack}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Nuevo Requerimiento</h2>
                  <p className="text-sm text-blue-100">
                    {step === 'category' && 'Selecciona el tipo de solicitud'}
                    {step === 'subcategory' && selectedCategory && REQUIREMENT_CATEGORIES[selectedCategory].label}
                    {step === 'form' && 'Completa la información'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center space-x-2 mt-4">
              {['category', 'subcategory', 'form'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s ? 'bg-white text-blue-600' : 
                    (['category', 'subcategory', 'form'].indexOf(step) > i) ? 'bg-white/80 text-blue-600' : 
                    'bg-white/30 text-white'
                  }`}>
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-1 rounded ${
                      (['category', 'subcategory', 'form'].indexOf(step) > i) ? 'bg-white/80' : 'bg-white/30'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* Paso 1: Selección de categoría */}
              {step === 'category' && (
                <motion.div
                  key="category"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 gap-4"
                >
                  {(Object.entries(REQUIREMENT_CATEGORIES) as [RequirementCategory, typeof REQUIREMENT_CATEGORIES[RequirementCategory]][]).map(([key, category]) => (
                    <motion.button
                      key={key}
                      onClick={() => handleCategorySelect(key)}
                      className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center ${
                        key === 'reasignacion_prospectos' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                        key === 'cambio_roles' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                        key === 'bloquear_usuario' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                        key === 'anadir_funciones' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                        key === 'mejorar_funciones' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                        'bg-slate-100 dark:bg-slate-700 text-slate-600'
                      }`}>
                        {key === 'reasignacion_prospectos' && (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        )}
                        {key === 'cambio_roles' && (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        )}
                        {key === 'bloquear_usuario' && (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        )}
                        {key === 'anadir_funciones' && (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        )}
                        {key === 'mejorar_funciones' && (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {key === 'otro' && (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {category.label}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {category.description}
                      </p>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Paso 2: Selección de subcategoría */}
              {step === 'subcategory' && selectedCategory && (
                <motion.div
                  key="subcategory"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  {REQUIREMENT_CATEGORIES[selectedCategory].subcategories.map((sub) => (
                    <motion.button
                      key={sub.value}
                      onClick={() => handleSubcategorySelect(sub.value)}
                      className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left flex items-center justify-between group"
                      whileHover={{ x: 8 }}
                    >
                      <span className="font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {sub.label}
                      </span>
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Paso 3: Formulario */}
              {step === 'form' && selectedCategory && selectedSubcategory && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {getCurrentQuestions().map((question, idx) => (
                    <div key={question.field}>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {question.label} <span className="text-red-500">*</span>
                      </label>
                      
                      {question.type === 'text' && (
                        <input
                          type="text"
                          value={formData[question.field] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [question.field]: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
                          placeholder={`Ingresa ${question.label.toLowerCase()}`}
                        />
                      )}
                      
                      {question.type === 'textarea' && (
                        <textarea
                          value={formData[question.field] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [question.field]: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white resize-none h-24"
                          placeholder={`Ingresa ${question.label.toLowerCase()}`}
                        />
                      )}
                      
                      {question.type === 'select' && question.options && (
                        <select
                          value={formData[question.field] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [question.field]: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="">Selecciona una opción</option>
                          {question.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}

                  {/* Notas adicionales */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Notas adicionales (opcional)
                    </label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-white resize-none h-20"
                      placeholder="Cualquier información adicional que quieras agregar..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {step === 'form' && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end space-x-3">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Atrás
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Enviando...</span>
                  </span>
                ) : (
                  'Enviar Requerimiento'
                )}
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default RequestModal;
