/**
 * Componente de control de notificaciones de sonido para el dashboard
 * Permite habilitar/deshabilitar notificaciones de mensajes y llamadas
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MessageSquare, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationSoundService } from '../../services/notificationSoundService';

export const NotificationControl: React.FC = () => {
  const [preferences, setPreferences] = useState(notificationSoundService.getPreferences());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Actualizar preferencias cuando cambien
    const interval = setInterval(() => {
      setPreferences(notificationSoundService.getPreferences());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleToggleAll = () => {
    const newEnabled = !preferences.enabled;
    notificationSoundService.setEnabled(newEnabled);
    setPreferences(notificationSoundService.getPreferences());
  };

  const handleToggleMessages = () => {
    const newEnabled = !preferences.messageEnabled;
    notificationSoundService.setMessageEnabled(newEnabled);
    setPreferences(notificationSoundService.getPreferences());
  };

  const handleToggleCalls = () => {
    const newEnabled = !preferences.callEnabled;
    notificationSoundService.setCallEnabled(newEnabled);
    setPreferences(notificationSoundService.getPreferences());
  };

  const handleTestSound = async (type: 'message' | 'call') => {
    // Reproducir sonido de prueba directamente desde el archivo
    try {
      const soundFile = type === 'call' 
        ? '/sounds/notification-call.mp3'
        : '/sounds/notification-message.mp3';
      
      const audio = new Audio(soundFile);
      audio.volume = preferences.volume;
      await audio.play();
    } catch (error) {
      // Si falla, usar el servicio como fallback
      await notificationSoundService.playNotification(type);
    }
  };

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`p-2 rounded-lg transition-all duration-200 ${
          preferences.enabled
            ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={preferences.enabled ? 'Notificaciones activas' : 'Notificaciones silenciadas'}
      >
        {preferences.enabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Menú desplegable */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Overlay para cerrar al hacer clic fuera */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menú */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {/* Título */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notificaciones
                  </h3>
                  <button
                    onClick={handleToggleAll}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      preferences.enabled
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {preferences.enabled ? 'Activas' : 'Silenciadas'}
                  </button>
                </div>

                {/* Opción: Mensajes */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Mensajes nuevos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestSound('message')}
                      className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      title="Probar sonido"
                    >
                      🔊
                    </button>
                    <button
                      onClick={handleToggleMessages}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        preferences.messageEnabled && preferences.enabled
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.messageEnabled && preferences.enabled
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Opción: Llamadas */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Llamadas activas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestSound('call')}
                      className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      title="Probar sonido"
                    >
                      🔊
                    </button>
                    <button
                      onClick={handleToggleCalls}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        preferences.callEnabled && preferences.enabled
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.callEnabled && preferences.enabled
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

