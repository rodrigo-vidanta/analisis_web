/**
 * ============================================
 * MODAL DE CAMBIO DE CONTRASEÑA OBLIGATORIO
 * ============================================
 *
 * Modal que se muestra cuando un usuario debe cambiar su contraseña en el primer inicio de sesión
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChangePasswordModalProps {
  userId: string;
  onSuccess: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validar contraseña según requisitos
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que las contraseñas coincidan
    if (formData.newPassword !== formData.confirmPassword) {
      setValidationErrors(['Las contraseñas no coinciden']);
      return;
    }

    // Validar requisitos de contraseña
    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }

    // Validar que la nueva contraseña sea diferente a la actual
    if (formData.currentPassword === formData.newPassword) {
      setValidationErrors(['La nueva contraseña debe ser diferente a la actual']);
      return;
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      // Verificar contraseña actual usando función RPC
      const { data: authResult, error: authError } = await supabaseSystemUI.rpc(
        'authenticate_user',
        {
          user_email: '', // No necesario, solo verificamos password
          user_password: formData.currentPassword,
        }
      );

      // Obtener email del usuario para verificar contraseña
      const { data: userData, error: userError } = await supabaseSystemUI
        .from('auth_users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('Error al obtener datos del usuario');
      }

      // Verificar contraseña actual
      const { data: verifyResult, error: verifyError } = await supabaseSystemUI.rpc(
        'authenticate_user',
        {
          user_email: userData.email,
          user_password: formData.currentPassword,
        }
      );

      if (verifyError || !verifyResult || verifyResult.length === 0 || !verifyResult[0].is_valid) {
        setValidationErrors(['La contraseña actual es incorrecta']);
        setLoading(false);
        return;
      }

      // Cambiar contraseña usando función RPC
      const { error: changeError } = await supabaseSystemUI.rpc('change_user_password', {
        p_user_id: userId,
        p_new_password: formData.newPassword,
      });

      if (changeError) {
        throw changeError;
      }

      // Actualizar must_change_password a false
      const { error: updateError } = await supabaseSystemUI
        .from('auth_users')
        .update({
          must_change_password: false,
        })
        .eq('id', userId);

      if (updateError) {
        console.warn('Error actualizando must_change_password:', updateError);
        // No fallar si solo falla esta actualización
      }

      toast.success('Contraseña cambiada exitosamente');
      onSuccess();
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      setValidationErrors([error.message || 'Error al cambiar la contraseña']);
    } finally {
      setLoading(false);
    }
  };

  // Verificar requisitos en tiempo real
  const passwordRequirements = {
    length: formData.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(formData.newPassword),
    lowercase: /[a-z]/.test(formData.newPassword),
    number: /[0-9]/.test(formData.newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Cambio de Contraseña Requerido
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Debes cambiar tu contraseña para continuar
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contraseña Actual */}
            <div className="group">
              <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <span>Contraseña Actual *</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  required
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 pr-12"
                  placeholder="Ingresa tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div className="group">
              <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <span>Nueva Contraseña *</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  required
                  value={formData.newPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, newPassword: e.target.value });
                    setValidationErrors([]);
                  }}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 pr-12"
                  placeholder="Ingresa tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Requisitos de contraseña */}
              {formData.newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Requisitos de contraseña:
                  </div>
                  <div className="space-y-1.5">
                    <div className={`flex items-center space-x-2 text-xs ${
                      passwordRequirements.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {passwordRequirements.length ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Al menos 8 caracteres</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${
                      passwordRequirements.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {passwordRequirements.uppercase ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Al menos una letra mayúscula</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${
                      passwordRequirements.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {passwordRequirements.lowercase ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Al menos una letra minúscula</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${
                      passwordRequirements.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {passwordRequirements.number ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Al menos un número</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${
                      passwordRequirements.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {passwordRequirements.special ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Al menos un carácter especial</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="group">
              <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <span>Confirmar Nueva Contraseña *</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    setValidationErrors([]);
                  }}
                  className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 dark:bg-gray-800/50 dark:text-white transition-all duration-200 pr-12 ${
                    formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                      ? 'border-red-300 dark:border-red-700 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  placeholder="Confirma tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Errores de validación */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Errores de validación:
                    </div>
                    <ul className="text-xs text-red-600 dark:text-red-300 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cambiando...</span>
                  </>
                ) : (
                  <span>Cambiar Contraseña</span>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ChangePasswordModal;

