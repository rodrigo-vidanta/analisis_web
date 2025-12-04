/**
 * Componente de control de notificaciones de sonido y del sistema para el dashboard
 * Permite habilitar/deshabilitar notificaciones de mensajes y llamadas
 * Incluye control de notificaciones del sistema operativo
 */

import React, { useState, useEffect } from 'react';
import { Volume2, MessageSquare, Phone, Bell, BellOff, Calendar, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationSoundService } from '../../services/notificationSoundService';
import { systemNotificationService } from '../../services/systemNotificationService';

export const NotificationControl: React.FC = () => {
  const [soundPreferences, setSoundPreferences] = useState(notificationSoundService.getPreferences());
  const [systemPreferences, setSystemPreferences] = useState(systemNotificationService.getPreferences());
  const [showMenu, setShowMenu] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Actualizar preferencias cuando cambien
    const interval = setInterval(() => {
      setSoundPreferences(notificationSoundService.getPreferences());
      setSystemPreferences(systemNotificationService.getPreferences());
      setPermissionStatus(systemNotificationService.getPermissionStatus());
    }, 100);

    // Verificar permisos al montar
    setPermissionStatus(systemNotificationService.getPermissionStatus());

    return () => clearInterval(interval);
  }, []);

  // Solicitar permisos automáticamente si no están concedidos
  useEffect(() => {
    if (permissionStatus === 'default' && systemPreferences.enabled) {
      // Esperar un poco antes de solicitar para no ser intrusivo
      const timer = setTimeout(() => {
        systemNotificationService.requestPermission().then(() => {
          setPermissionStatus(systemNotificationService.getPermissionStatus());
          setSystemPreferences(systemNotificationService.getPreferences());
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [permissionStatus, systemPreferences.enabled]);

  const handleToggleSoundAll = () => {
    const newEnabled = !soundPreferences.enabled;
    notificationSoundService.setEnabled(newEnabled);
    setSoundPreferences(notificationSoundService.getPreferences());
  };

  const handleToggleSoundMessages = () => {
    const newEnabled = !soundPreferences.messageEnabled;
    notificationSoundService.setMessageEnabled(newEnabled);
    setSoundPreferences(notificationSoundService.getPreferences());
  };

  const handleToggleSoundCalls = () => {
    const newEnabled = !soundPreferences.callEnabled;
    notificationSoundService.setCallEnabled(newEnabled);
    setSoundPreferences(notificationSoundService.getPreferences());
  };

  const handleRequestSystemPermission = async () => {
    const granted = await systemNotificationService.requestPermission();
    setPermissionStatus(systemNotificationService.getPermissionStatus());
    setSystemPreferences(systemNotificationService.getPreferences());
    if (!granted) {
      alert('Para recibir notificaciones del sistema, por favor habilita los permisos en la configuración de tu navegador.');
    }
  };

  const handleToggleSystemAll = () => {
    const newEnabled = !systemPreferences.enabled;
    systemNotificationService.setEnabled(newEnabled);
    setSystemPreferences(systemNotificationService.getPreferences());
  };

  const handleToggleSystemMessages = () => {
    const newEnabled = !systemPreferences.messageEnabled;
    systemNotificationService.setMessageEnabled(newEnabled);
    setSystemPreferences(systemNotificationService.getPreferences());
  };

  const handleToggleSystemCalls = () => {
    const newEnabled = !systemPreferences.callEnabled;
    systemNotificationService.setCallEnabled(newEnabled);
    setSystemPreferences(systemNotificationService.getPreferences());
  };

  const handleToggleSystemScheduledCalls = () => {
    const newEnabled = !systemPreferences.scheduledCallEnabled;
    systemNotificationService.setScheduledCallEnabled(newEnabled);
    setSystemPreferences(systemNotificationService.getPreferences());
  };

  const handleToggleSystemNewProspects = () => {
    const newEnabled = !systemPreferences.newProspectEnabled;
    systemNotificationService.setNewProspectEnabled(newEnabled);
    setSystemPreferences(systemNotificationService.getPreferences());
  };

  const handleTestSound = async (type: 'message' | 'call') => {
    // Reproducir sonido de prueba directamente desde el archivo
    try {
      const soundFile = type === 'call' 
        ? '/sounds/notification-call.mp3'
        : '/sounds/notification-message.mp3';
      
      const audio = new Audio(soundFile);
      audio.volume = soundPreferences.volume;
      await audio.play();
    } catch (error) {
      // Si falla, usar el servicio como fallback
      await notificationSoundService.playNotification(type);
    }
  };

  const handleTestSystemNotification = (type: 'message' | 'call' | 'scheduled_call' | 'new_prospect') => {
    if (!systemNotificationService.hasPermission()) {
      handleRequestSystemPermission();
      return;
    }

    switch (type) {
      case 'message':
        systemNotificationService.showMessageNotification({
          customerName: 'Cliente de Prueba',
          messagePreview: 'Este es un mensaje de prueba para verificar las notificaciones del sistema.',
          conversationId: 'test'
        });
        break;
      case 'call':
        systemNotificationService.showCallNotification({
          prospectName: 'Prospecto de Prueba',
          callStatus: 'En curso',
          callId: 'test'
        });
        break;
      case 'scheduled_call':
        systemNotificationService.showScheduledCallNotification({
          prospectName: 'Prospecto de Prueba',
          scheduledTime: new Date().toISOString(),
          callId: 'test'
        });
        break;
      case 'new_prospect':
        systemNotificationService.showNewProspectNotification({
          prospectName: 'Prospecto de Prueba',
          prospectId: 'test'
        });
        break;
    }
  };

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`p-2 rounded-lg transition-all duration-200 relative ${
          soundPreferences.enabled || systemPreferences.enabled
            ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={
          soundPreferences.enabled || systemPreferences.enabled
            ? 'Notificaciones activas'
            : 'Notificaciones silenciadas'
        }
      >
        {systemPreferences.enabled && systemPreferences.permissionGranted ? (
          <Bell className="w-5 h-5" />
        ) : soundPreferences.enabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <BellOff className="w-5 h-5" />
        )}
        {permissionStatus === 'default' && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
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
              className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {/* Título - Sonidos */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Sonidos
                  </h3>
                  <button
                    onClick={handleToggleSoundAll}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      soundPreferences.enabled
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {soundPreferences.enabled ? 'Activos' : 'Silenciados'}
                  </button>
                </div>

                {/* Opción: Mensajes - Sonido */}
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
                      onClick={handleToggleSoundMessages}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        soundPreferences.messageEnabled && soundPreferences.enabled
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          soundPreferences.messageEnabled && soundPreferences.enabled
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Opción: Llamadas - Sonido */}
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
                      onClick={handleToggleSoundCalls}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        soundPreferences.callEnabled && soundPreferences.enabled
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          soundPreferences.callEnabled && soundPreferences.enabled
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  {/* Título - Notificaciones del Sistema */}
                  <div className="flex items-center justify-between pb-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notificaciones del Sistema
                    </h3>
                    {permissionStatus !== 'granted' ? (
                      <button
                        onClick={handleRequestSystemPermission}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          permissionStatus === 'denied'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}
                      >
                        {permissionStatus === 'denied' ? 'Denegado' : 'Solicitar'}
                      </button>
                    ) : (
                      <button
                        onClick={handleToggleSystemAll}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          systemPreferences.enabled
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {systemPreferences.enabled ? 'Activas' : 'Desactivadas'}
                      </button>
                    )}
                  </div>

                  {permissionStatus === 'denied' && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                      Los permisos fueron denegados. Habilítalos en la configuración de tu navegador.
                    </p>
                  )}

                  {/* Opción: Mensajes - Sistema */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Mensajes nuevos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestSystemNotification('message')}
                        className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Probar notificación"
                        disabled={permissionStatus !== 'granted'}
                      >
                        🔔
                      </button>
                      <button
                        onClick={handleToggleSystemMessages}
                        disabled={permissionStatus !== 'granted' || !systemPreferences.enabled}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          systemPreferences.messageEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                            ? 'bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        } ${permissionStatus !== 'granted' || !systemPreferences.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            systemPreferences.messageEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Opción: Llamadas - Sistema */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Llamadas activas
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestSystemNotification('call')}
                        className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Probar notificación"
                        disabled={permissionStatus !== 'granted'}
                      >
                        🔔
                      </button>
                      <button
                        onClick={handleToggleSystemCalls}
                        disabled={permissionStatus !== 'granted' || !systemPreferences.enabled}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          systemPreferences.callEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                            ? 'bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        } ${permissionStatus !== 'granted' || !systemPreferences.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            systemPreferences.callEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Opción: Llamadas Programadas - Sistema */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Llamadas programadas
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestSystemNotification('scheduled_call')}
                        className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Probar notificación"
                        disabled={permissionStatus !== 'granted'}
                      >
                        🔔
                      </button>
                      <button
                        onClick={handleToggleSystemScheduledCalls}
                        disabled={permissionStatus !== 'granted' || !systemPreferences.enabled}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          systemPreferences.scheduledCallEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                            ? 'bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        } ${permissionStatus !== 'granted' || !systemPreferences.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            systemPreferences.scheduledCallEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Opción: Nuevos Prospectos - Sistema */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Nuevos prospectos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestSystemNotification('new_prospect')}
                        className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Probar notificación"
                        disabled={permissionStatus !== 'granted'}
                      >
                        🔔
                      </button>
                      <button
                        onClick={handleToggleSystemNewProspects}
                        disabled={permissionStatus !== 'granted' || !systemPreferences.enabled}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          systemPreferences.newProspectEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                            ? 'bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        } ${permissionStatus !== 'granted' || !systemPreferences.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            systemPreferences.newProspectEnabled && systemPreferences.enabled && permissionStatus === 'granted'
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
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

