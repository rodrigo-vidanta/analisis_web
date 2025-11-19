/**
 * Modal para validar y registrar datos faltantes de prospectos
 * Se muestra cuando un coordinador intenta asignar un prospecto sin id_dynamics
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, User, Mail, Save } from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import toast from 'react-hot-toast';

interface ProspectValidationModalProps {
  isOpen: boolean;
  prospectId: string;
  prospectData: {
    nombre_completo?: string | null;
    nombre_whatsapp?: string | null;
    email?: string | null;
    whatsapp?: string | null;
  };
  onClose: () => void;
  onValidationComplete: () => void;
}

export const ProspectValidationModal: React.FC<ProspectValidationModalProps> = ({
  isOpen,
  prospectId,
  prospectData,
  onClose,
  onValidationComplete
}) => {
  const [formData, setFormData] = useState({
    nombre_completo: prospectData.nombre_completo || prospectData.nombre_whatsapp || '',
    email: prospectData.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ nombre_completo?: string; email?: string }>({});

  // Validar campos requeridos
  const validateForm = (): boolean => {
    const newErrors: { nombre_completo?: string; email?: string } = {};

    if (!formData.nombre_completo || formData.nombre_completo.trim() === '') {
      newErrors.nombre_completo = 'El nombre completo es requerido';
    }

    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Guardar datos manualmente
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await analysisSupabase
        .from('prospectos')
        .update({
          nombre_completo: formData.nombre_completo.trim(),
          email: formData.email.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      if (error) {
        throw error;
      }

      toast.success('Datos del prospecto actualizados correctamente');
      onValidationComplete();
      onClose();
    } catch (error) {
      console.error('Error actualizando prospecto:', error);
      toast.error('Error al actualizar los datos del prospecto');
    } finally {
      setSaving(false);
    }
  };

  // Datos faltantes
  const missingFields = [];
  if (!prospectData.nombre_completo && !prospectData.nombre_whatsapp) {
    missingFields.push('Nombre completo');
  }
  if (!prospectData.email) {
    missingFields.push('Correo electrónico');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-0.5 shadow-lg flex-shrink-0"
                  >
                    <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <motion.h3
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-xl font-bold text-gray-900 dark:text-white mb-1"
                    >
                      Validación Requerida
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-sm text-gray-600 dark:text-gray-400"
                    >
                      El prospecto no tiene ID de Dynamics registrado
                    </motion.p>
                  </div>
                </div>
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={onClose}
                  disabled={saving}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cerrar"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              {/* Advertencia */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl"
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                      ⚠️ Advertencia Importante
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      Se recomienda <strong>NO</strong> dar de alta manualmente prospectos para evitar inconsistencias en la base de datos. 
                      Esta acción solo debe realizarse en casos excepcionales.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Datos faltantes */}
              {missingFields.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-6"
                >
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Datos faltantes detectados:
                  </p>
                  <ul className="space-y-2">
                    {missingFields.map((field, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        <span>{field}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Formulario */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                {/* Nombre Completo */}
                <div className="group">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <span>Nombre Completo *</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_completo}
                    onChange={(e) => {
                      setFormData({ ...formData, nombre_completo: e.target.value });
                      if (errors.nombre_completo) {
                        setErrors({ ...errors, nombre_completo: undefined });
                      }
                    }}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 ${
                      errors.nombre_completo
                        ? 'border-red-300 dark:border-red-700'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    placeholder="Ej: Juan Pérez García"
                  />
                  {errors.nombre_completo && (
                    <p className="mt-1 text-xs text-red-500">{errors.nombre_completo}</p>
                  )}
                </div>

                {/* Email */}
                <div className="group">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <span>Correo Electrónico *</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 ${
                      errors.email
                        ? 'border-red-300 dark:border-red-700'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    placeholder="Ej: juan.perez@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar y Continuar</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

