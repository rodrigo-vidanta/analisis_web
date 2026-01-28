/**
 * Modal para solicitar desbloqueo de cuenta
 * 
 * Fix 2026-01-14: Agregado campo de email editable para casos donde 
 * el email no se captura correctamente del formulario de login
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Unlock, AlertTriangle, Mail } from 'lucide-react';
import { adminMessagesService } from '../../services/adminMessagesService';
import toast from 'react-hot-toast';

interface AccountUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  lockedUntil?: string;
}

const AccountUnlockModal: React.FC<AccountUnlockModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  lockedUntil
}) => {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  // Estado local para el email - permite edición si viene vacío
  const [localEmail, setLocalEmail] = useState(userEmail || '');
  const [emailError, setEmailError] = useState('');

  // Sincronizar con prop cuando cambia
  useEffect(() => {
    if (userEmail) {
      setLocalEmail(userEmail);
    }
  }, [userEmail]);

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setEmailError('');
    }
  }, [isOpen]);

  // Validar formato de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar email antes de enviar
    const emailToSend = localEmail.trim().toLowerCase();
    
    if (!emailToSend) {
      setEmailError('Por favor ingresa tu correo electrónico');
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    if (!isValidEmail(emailToSend)) {
      setEmailError('Por favor ingresa un correo electrónico válido');
      toast.error('Por favor ingresa un correo electrónico válido');
      return;
    }

    setEmailError('');
    setSending(true);
    
    try {
      // Crear mensaje para administradores
      const message = await adminMessagesService.createMessage({
        category: 'user_unblock_request',
        title: `Solicitud de desbloqueo de cuenta - ${emailToSend}`,
        message: `El usuario ${emailToSend} solicita desbloquear su cuenta.\n\nLa cuenta fue bloqueada después de 4 intentos fallidos de inicio de sesión.\n\nBloqueado hasta: ${lockedUntil || '30 minutos desde el bloqueo'}`,
        sender_email: emailToSend,
        priority: 'urgent',
        recipient_role: 'admin',
        metadata: {
          user_email: emailToSend,
          request_type: 'account_unlock',
          locked_until: lockedUntil || null
        }
      });

      if (message) {
        console.log('✅ Mensaje creado exitosamente:', message);
        setSuccess(true);
        toast.success('Solicitud enviada. El administrador se pondrá en contacto contigo pronto.');
        // Esperar 2.5 segundos antes de cerrar para que el usuario vea el mensaje
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2500);
      } else {
        console.error('❌ No se pudo crear el mensaje');
        toast.error('Error al enviar la solicitud. Por favor intenta más tarde.');
      }
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      toast.error('Error al enviar la solicitud');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Cuenta Bloqueada
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          {success ? (
            <div className="p-6 space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-200 mb-2">
                  ¡Solicitud Enviada!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Tu solicitud de desbloqueo de cuenta ha sido enviada al administrador.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  El administrador revisará tu solicitud y se pondrá en contacto contigo pronto.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                      Tu cuenta ha sido bloqueada
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      Se detectaron 4 intentos fallidos de inicio de sesión. Por seguridad, tu cuenta ha sido bloqueada temporalmente.
                    </p>
                    {lockedUntil && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                        Bloqueado hasta: {new Date(lockedUntil).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Mexico_City',
                          hour12: false
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Para desbloquear tu cuenta, envía una solicitud al administrador. El administrador se pondrá en contacto contigo pronto.
              </p>

              {/* Campo de email - editable si viene vacío o si hay error */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>Correo Electrónico</span>
                </label>
                {userEmail && !emailError ? (
                  // Si tenemos email válido, mostrar como texto con opción de editar
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex items-center justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {localEmail}
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocalEmail('')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  // Si no hay email o hubo error, mostrar campo de texto
                  <div>
                    <input
                      type="email"
                      value={localEmail}
                      onChange={(e) => {
                        setLocalEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="tu-correo@empresa.com"
                      className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                        emailError 
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                          : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                      autoComplete="email"
                      autoFocus
                    />
                    {emailError && (
                      <p className="mt-1 text-xs text-red-500">{emailError}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Ingresa el correo electrónico con el que intentaste iniciar sesión
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={sending || !localEmail.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Contactar Administrador</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AccountUnlockModal;

