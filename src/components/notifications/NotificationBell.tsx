/**
 * ============================================
 * COMPONENTE DE NOTIFICACIONES
 * ============================================
 * 
 * Muestra notificaciones en tiempo real en el header
 * - Badge con contador de llamadas activas y mensajes nuevos
 * - Sonido tipo WhatsApp cuando hay nuevas notificaciones
 * - Usa tabla user_notifications para persistencia por usuario
 * - Botón para silenciar notificaciones
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
// pqncSupabase removido - ya no se usa (migración 2025-01-13)
import { userNotificationService } from '../../services/userNotificationService';
import { Bell, MessageSquare, Phone, Volume2, VolumeX } from 'lucide-react';

// AudioContext global que se inicializa después de un gesto del usuario
let audioContext: AudioContext | null = null;
let audioContextInitialized = false;

// Función para inicializar AudioContext después de un gesto del usuario
const initAudioContext = () => {
  if (!audioContextInitialized && typeof window !== 'undefined') {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextInitialized = true;
    } catch (error) {
      // Silenciar errores
    }
  }
};

// Función para reproducir sonido tipo WhatsApp
const playWhatsAppNotification = () => {
  // Inicializar AudioContext si no está inicializado
  if (!audioContextInitialized) {
    initAudioContext();
  }

  if (!audioContext) {
    // Si no se puede crear, intentar crear uno nuevo
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextInitialized = true;
    } catch (error) {
      return; // No reproducir si no se puede crear
    }
  }

  try {
    // Resumir AudioContext si está suspendido (requerido por algunos navegadores)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configurar osciladores para sonido tipo WhatsApp (dos tonos)
    oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    // Conectar a gain node
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Volumen discreto
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    // Reproducir dos tonos cortos
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.15);
    
    // Segundo tono después de breve pausa
    setTimeout(() => {
      if (!audioContext) return;
      
      const oscillator3 = audioContext.createOscillator();
      const oscillator4 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator3.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator4.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator3.type = 'sine';
      oscillator4.type = 'sine';
      
      oscillator3.connect(gainNode2);
      oscillator4.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      gainNode2.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator3.start(audioContext.currentTime);
      oscillator4.start(audioContext.currentTime);
      oscillator3.stop(audioContext.currentTime + 0.15);
      oscillator4.stop(audioContext.currentTime + 0.15);
    }, 200);
  } catch (error) {
    // Silenciar errores de audio
  }
};

interface NotificationCounts {
  total: number;
  activeCalls: number;
  newMessages: number;
}

interface NotificationBellProps {
  darkMode?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ darkMode = false }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, activeCalls: 0, newMessages: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousCountsRef = useRef<NotificationCounts>({ total: 0, activeCalls: 0, newMessages: 0 });
  const lastSoundTimeRef = useRef<number>(0);

  // Cargar contadores iniciales
  const loadCounts = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ [NotificationBell] loadCounts: No hay usuario');
      return;
    }

    try {
      setLoading(true);
      console.log(`🔄 [NotificationBell] Cargando contadores para usuario: ${user.id}`);
      userNotificationService.setUserId(user.id);
      const counts = await userNotificationService.getUnreadCount();
      console.log(`📊 [NotificationBell] Contadores obtenidos:`, counts);
      setCounts(counts);
    } catch (error) {
      console.error('❌ [NotificationBell] Error cargando contadores:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Cargar estado de mute
  const loadMuteStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const muted = await userNotificationService.getMuteStatus();
      setIsMuted(muted);
    } catch (error) {
      // Ignorar errores
    }
  }, [user?.id]);

  // Configurar suscripciones en tiempo real
  useEffect(() => {
    if (!user?.id) {
      console.log('⚠️ [NotificationBell] No hay usuario, cancelando suscripción');
      return;
    }

    console.log(`✅ [NotificationBell] Configurando notificaciones para usuario: ${user.id}`);

    // IMPORTANTE: Configurar userId ANTES de cualquier otra operación
    userNotificationService.setUserId(user.id);

    // Cargar contadores iniciales
    loadCounts();
    loadMuteStatus();

    // Suscribirse a cambios en notificaciones del usuario
    const unsubscribe = userNotificationService.subscribeToNotifications(
      (notification) => {
        console.log('🔔 [NotificationBell] Nueva notificación recibida:', notification);
        // Cuando llega una nueva notificación, actualizar contadores
        loadCounts();
      },
      (newCounts) => {
        console.log('📊 [NotificationBell] Contadores actualizados:', newCounts);
        // Actualizar contadores cuando cambian
        setCounts(newCounts);
      }
    );

    // Polling cada 30 segundos como respaldo
    const interval = setInterval(() => {
      console.log('🔄 [NotificationBell] Polling de respaldo ejecutado');
      loadCounts();
    }, 30000);

    return () => {
      console.log('🛑 [NotificationBell] Limpiando suscripciones');
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, loadCounts, loadMuteStatus]);

  // Reproducir sonido cuando hay nuevas notificaciones (solo si no está silenciado)
  useEffect(() => {
    const prev = previousCountsRef.current;
    const now = Date.now();
    
    // Solo reproducir si:
    // 1. Hay un aumento en las notificaciones
    // 2. Han pasado al menos 2 segundos desde el último sonido
    // 3. No está silenciado
    if (
      !isMuted &&
      counts.total > prev.total &&
      now - lastSoundTimeRef.current > 2000
    ) {
      // Inicializar AudioContext en el primer click del usuario
      if (!audioContextInitialized) {
        // Esperar a que el usuario haga un gesto
        const handleUserGesture = () => {
          initAudioContext();
          playWhatsAppNotification();
          document.removeEventListener('click', handleUserGesture);
          document.removeEventListener('touchstart', handleUserGesture);
        };
        
        document.addEventListener('click', handleUserGesture, { once: true });
        document.addEventListener('touchstart', handleUserGesture, { once: true });
      } else {
        playWhatsAppNotification();
      }
      
      lastSoundTimeRef.current = now;
    }
    
    previousCountsRef.current = counts;
  }, [counts.total, isMuted]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (type: 'calls' | 'messages') => {
    if (type === 'calls') {
      window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'live-monitor' }));
    } else if (type === 'messages') {
      window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'live-chat' }));
    }
    setIsOpen(false);
  };

  const handleToggleMute = async () => {
    if (!user?.id) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Actualizar todas las notificaciones no leídas para silenciar/activar sonido
    try {
      if (!pqncSupabase) {
        console.error('Error: pqncSupabase no está configurado');
        setIsMuted(!newMutedState);
        return;
      }

      const { error } = await pqncSupabase
        .from('user_notifications')
        .update({ is_muted: newMutedState })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error actualizando estado de mute:', error);
        // Revertir estado local si falla
        setIsMuted(!newMutedState);
      }
    } catch (error) {
      console.error('Error en toggleMute:', error);
      setIsMuted(!newMutedState);
    }
  };

  if (!user?.id) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de notificaciones */}
      <button
        onClick={() => {
          // Inicializar AudioContext en el primer click
          if (!audioContextInitialized) {
            initAudioContext();
          }
          setIsOpen(!isOpen);
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
        title={`Notificaciones: ${counts.total} (${counts.activeCalls} llamadas, ${counts.newMessages} mensajes)`}
      >
        <Bell className="w-5 h-5" />
        {counts.total > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1"
          >
            {counts.total > 99 ? '99+' : counts.total}
          </motion.div>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50"
          >
            {/* Header con botón de silenciar */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Notificaciones
              </h3>
              <button
                onClick={handleToggleMute}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar notificaciones'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            </div>

            {/* Contadores */}
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <>
                  {/* Llamadas activas */}
                  <button
                    onClick={() => handleNotificationClick('calls')}
                    className="w-full p-3 rounded-lg bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Llamadas Activas
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          En curso ahora
                        </p>
                      </div>
                    </div>
                    {counts.activeCalls > 0 && (
                      <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                        {counts.activeCalls}
                      </span>
                    )}
                  </button>

                  {/* Mensajes nuevos */}
                  <button
                    onClick={() => handleNotificationClick('messages')}
                    className="w-full p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Mensajes Nuevos
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Sin leer
                        </p>
                      </div>
                    </div>
                    {counts.newMessages > 0 && (
                      <span className="px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                        {counts.newMessages}
                      </span>
                    )}
                  </button>

                  {counts.total === 0 && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No hay notificaciones</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
