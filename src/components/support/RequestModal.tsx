// ============================================
// MODAL DE REQUERIMIENTO - DISEÑO ELEGANTE
// ============================================
// Siguiendo la guía de diseño del sistema

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService, REQUIREMENT_CATEGORIES, type RequirementCategory } from '../../services/ticketService';
import toast from 'react-hot-toast';

// Iconos de categorías
const CATEGORY_ICONS: Record<RequirementCategory, string> = {
  reasignacion_prospectos: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  cambio_roles: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  bloquear_usuario: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  anadir_funciones: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
  mejorar_funciones: 'M13 10V3L4 14h7v7l9-11h-7z',
  otro: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

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

  const handleClose = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setFormData({});
    setAdditionalNotes('');
    onClose();
  };

  const handleCategorySelect = (category: RequirementCategory) => {
    setSelectedCategory(category);
    setStep('subcategory');
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setFormData({});
    setStep('form');
  };

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

  const getCurrentQuestions = () => {
    if (!selectedCategory || !selectedSubcategory) return [];
    const category = REQUIREMENT_CATEGORIES[selectedCategory];
    const subcategory = category.subcategories.find(s => s.value === selectedSubcategory);
    return subcategory?.questions || [];
  };

  const handleSubmit = async () => {
    if (!user || !selectedCategory || !selectedSubcategory) return;

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

      if (error) throw new Error(error);
      toast.success(`Ticket ${ticket?.ticket_number} creado`);
      handleClose();
    } catch (error) {
      console.error("Error creating ticket:", error);
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
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={handleClose}
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
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {step !== 'category' && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleBack}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </motion.button>
                )}
                
                {/* Avatar con borde degradado */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-0.5 shadow-lg shadow-blue-500/25"
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                </motion.div>
                
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Requerimiento</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {step === 'category' && 'Selecciona el tipo de solicitud'}
                    {step === 'subcategory' && selectedCategory && REQUIREMENT_CATEGORIES[selectedCategory].label}
                    {step === 'form' && 'Completa la información'}
                  </p>
                </div>
              </div>
              
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.25 }}
                onClick={handleClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-5">
              {[
                { id: 'category', label: 'Tipo' },
                { id: 'subcategory', label: 'Detalle' },
                { id: 'form', label: 'Datos' }
              ].map((s, i) => {
                const stepIndex = ['category', 'subcategory', 'form'].indexOf(step);
                const isCompleted = ['category', 'subcategory', 'form'].indexOf(s.id as any) < stepIndex;
                const isCurrent = step === s.id;

                return (
                  <React.Fragment key={s.id}>
                    <div className={`flex items-center gap-2 ${isCurrent || isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25' 
                          : isCurrent 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${
                        isCurrent ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className={`flex-1 h-0.5 max-w-[60px] rounded-full ${
                        isCompleted ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Contenido con scroll */}
          <div className="overflow-y-auto flex-1 p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <AnimatePresence mode="wait">
              {/* Paso 1: Categorías */}
              {step === 'category' && (
                <motion.div
                  key="category"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {(Object.entries(REQUIREMENT_CATEGORIES) as [RequirementCategory, typeof REQUIREMENT_CATEGORIES[RequirementCategory]][]).map(([key, category], index) => (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleCategorySelect(key)}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left group hover:shadow-md"
                      whileHover={{ y: -2 }}
                    >
                      <div className="w-11 h-11 rounded-xl mb-3 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500 p-0.5 shadow-md shadow-blue-500/20">
                        <div className="w-full h-full rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[key]} />
                          </svg>
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-1 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {category.label}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {category.description}
                      </p>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Paso 2: Subcategorías */}
              {step === 'subcategory' && selectedCategory && (
                <motion.div
                  key="subcategory"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-2"
                >
                  {REQUIREMENT_CATEGORIES[selectedCategory].subcategories.map((sub, index) => (
                    <motion.button
                      key={sub.value}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSubcategorySelect(sub.value)}
                      className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left flex items-center justify-between group hover:shadow-md"
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {sub.label}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="space-y-5"
                >
                  {/* Barra de sección */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Información del Requerimiento
                    </h4>
                  </div>

                  {getCurrentQuestions().map((question, idx) => (
                    <motion.div
                      key={question.field}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group"
                    >
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{question.label} <span className="text-red-500">*</span></span>
                      </label>

                      {question.type === 'text' && (
                        <input
                          type="text"
                          value={formData[question.field] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [question.field]: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder={`Ingresa ${question.label.toLowerCase()}`}
                        />
                      )}

                      {question.type === 'textarea' && (
                        <textarea
                          value={formData[question.field] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [question.field]: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-none h-24 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder={`Ingresa ${question.label.toLowerCase()}`}
                        />
                      )}

                      {question.type === 'select' && question.options && (
                        <select
                          value={formData[question.field] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [question.field]: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white cursor-pointer transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        >
                          <option value="">Selecciona una opción</option>
                          {question.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </motion.div>
                  ))}

                  {/* Notas adicionales */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: getCurrentQuestions().length * 0.05 }}
                    className="group"
                  >
                    <div className="flex items-center space-x-2 mb-4 mt-6">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Notas Adicionales <span className="text-gray-400 font-normal">(opcional)</span>
                      </h4>
                    </div>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white resize-none h-24 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      placeholder="Información adicional que quieras agregar..."
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer - Solo en paso 3 */}
          {step === 'form' && (
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <button
                onClick={handleBack}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Atrás
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
