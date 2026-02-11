import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Upload, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { userProfileEvents } from '../../utils/userProfileEvents';
import toast from 'react-hot-toast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  currentAvatarUrl?: string | null;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentAvatarUrl,
  onAvatarUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'avatar' | 'password'>('avatar');
  
  // Estados para avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Estados para contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

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

  // Manejar selección de archivo para avatar
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('El archivo es muy grande. Máximo 5MB permitido');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      
      // Usar cliente admin de PQNC (donde está el bucket user-avatars)
      // El bucket está en PQNC_AI (glsmifhkoaifvaegsozd.supabase.co)
      // Verificar que el cliente esté configurado correctamente
      if (!supabaseSystemUI) {
        throw new Error('Cliente Supabase no inicializado');
      }

      const { data: uploadData, error: uploadError } = await supabaseSystemUI.storage
        .from('user-avatars')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseSystemUI.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabaseSystemUI.rpc('upload_user_avatar', {
        p_user_id: userId,
        p_avatar_url: publicUrl,
        p_file_name: fileName,
        p_file_size: file.size,
        p_mime_type: file.type
      });

      if (dbError) throw dbError;

      toast.success('Foto de perfil actualizada exitosamente');
      setAvatarPreview(null);
      onAvatarUpdated?.(publicUrl);
      
      // Notificar actualización global del perfil
      userProfileEvents.notifyUpdate();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir avatar: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Eliminar avatar
  const handleRemoveAvatar = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return;

    setUploadingAvatar(true);
    try {
      if (!supabaseSystemUI) {
        throw new Error('Cliente Supabase no inicializado');
      }

      const { error } = await supabaseSystemUI
        .from('user_avatars')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Foto de perfil eliminada');
      setAvatarPreview(null);
      onAvatarUpdated?.('');
      
      // Notificar actualización global del perfil
      userProfileEvents.notifyUpdate();
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast.error('Error al eliminar avatar: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Manejar cambio de contraseña
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors([]);

    // Validar que las contraseñas coincidan
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErrors(['Las contraseñas no coinciden']);
      return;
    }

    // Validar requisitos de contraseña
    const passwordValidationErrors = validatePassword(passwordData.newPassword);
    if (passwordValidationErrors.length > 0) {
      setPasswordErrors(passwordValidationErrors);
      return;
    }

    // Validar que la nueva contraseña sea diferente a la actual
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordErrors(['La nueva contraseña debe ser diferente a la actual']);
      return;
    }

    setChangingPassword(true);

    try {
      // Usar Edge Function auth-admin-proxy para cambiar contraseña
      // La Edge Function verifica la contraseña actual y cambia a la nueva
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'changePassword',
          params: {
            userId,
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
            skipVerification: false
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setPasswordErrors(['La contraseña actual es incorrecta']);
          setChangingPassword(false);
          return;
        }
        throw new Error(result.error || 'Error al cambiar la contraseña');
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al cambiar la contraseña');
      }

      toast.success('Contraseña cambiada exitosamente');
      
      // Limpiar formulario
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      setPasswordErrors([error.message || 'Error al cambiar la contraseña']);
    } finally {
      setChangingPassword(false);
    }
  };

  // Verificar requisitos de contraseña en tiempo real
  const passwordRequirements = {
    length: passwordData.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(passwordData.newPassword),
    lowercase: /[a-z]/.test(passwordData.newPassword),
    number: /[0-9]/.test(passwordData.newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword),
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Mi Perfil
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setActiveTab('avatar')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'avatar'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Foto de Perfil</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'password'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Contraseña</span>
                  </div>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'avatar' && (
                  <div className="space-y-6">
                    {/* Avatar Preview */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
                          {avatarPreview || currentAvatarUrl ? (
                            <img
                              src={avatarPreview || currentAvatarUrl || ''}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-16 h-16 text-white" />
                          )}
                        </div>
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Upload Button */}
                      <div className="flex flex-col items-center space-y-3 w-full">
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          onChange={handleAvatarFileSelect}
                          className="hidden"
                          disabled={uploadingAvatar}
                        />
                        <label
                          htmlFor="avatar-upload"
                          className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingAvatar ? 'Subiendo...' : 'Cambiar Foto'}
                        </label>

                        {(currentAvatarUrl || avatarPreview) && !uploadingAvatar && (
                          <button
                            onClick={handleRemoveAvatar}
                            className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar Foto
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 5MB
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'password' && (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {/* Contraseña Actual */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contraseña Actual *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          required
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white pr-10"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nueva Contraseña *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          required
                          value={passwordData.newPassword}
                          onChange={(e) => {
                            setPasswordData({ ...passwordData, newPassword: e.target.value });
                            setPasswordErrors([]);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white pr-10"
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
                      {passwordData.newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Requisitos:
                          </div>
                          <div className="space-y-1">
                            {[
                              { key: 'length', label: 'Al menos 8 caracteres' },
                              { key: 'uppercase', label: 'Al menos una mayúscula' },
                              { key: 'lowercase', label: 'Al menos una minúscula' },
                              { key: 'number', label: 'Al menos un número' },
                              { key: 'special', label: 'Al menos un carácter especial' },
                            ].map((req) => (
                              <div
                                key={req.key}
                                className={`flex items-center space-x-2 text-xs ${
                                  passwordRequirements[req.key as keyof typeof passwordRequirements]
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                              >
                                {passwordRequirements[req.key as keyof typeof passwordRequirements] ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                <span>{req.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirmar Contraseña */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirmar Nueva Contraseña *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          required
                          value={passwordData.confirmPassword}
                          onChange={(e) => {
                            setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                            setPasswordErrors([]);
                          }}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white pr-10 ${
                            passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                              ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
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
                      {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                        <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                      )}
                    </div>

                    {/* Errores */}
                    {passwordErrors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <ul className="text-xs text-red-600 dark:text-red-300 space-y-1">
                              {passwordErrors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botón Submit */}
                    <button
                      type="submit"
                      disabled={
                        changingPassword ||
                        !passwordData.currentPassword ||
                        !passwordData.newPassword ||
                        !passwordData.confirmPassword
                      }
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Cambiando...</span>
                        </>
                      ) : (
                        <span>Cambiar Contraseña</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default UserProfileModal;

