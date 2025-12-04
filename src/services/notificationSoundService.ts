/**
 * Servicio para manejar sonidos de notificación
 * Soporta diferentes tipos de notificaciones y control de volumen/silencio
 */

type NotificationType = 'message' | 'call';

interface NotificationPreferences {
  enabled: boolean;
  messageEnabled: boolean;
  callEnabled: boolean;
  volume: number; // 0.0 a 1.0
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  messageEnabled: true,
  callEnabled: true,
  volume: 0.5
};

class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private preferences: NotificationPreferences;

  constructor() {
    this.preferences = this.loadPreferences();
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext no disponible:', error);
    }
  }

  private loadPreferences(): NotificationPreferences {
    try {
      const saved = localStorage.getItem('dashboard-notification-preferences');
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Error cargando preferencias de notificaciones:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  private savePreferences() {
    try {
      localStorage.setItem('dashboard-notification-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Error guardando preferencias de notificaciones:', error);
    }
  }

  /**
   * Reproduce sonido de notificación desde archivo de audio según el tipo
   * Intenta cargar archivo personalizado, si no existe usa sonido generado
   */
  private async playNotificationSound(type: NotificationType): Promise<void> {
    // Determinar qué archivo usar según el tipo
    const soundFile = type === 'call' 
      ? '/sounds/notification-call.mp3'
      : '/sounds/notification-message.mp3';
    
    try {
      const audio = new Audio(soundFile);
      audio.volume = this.preferences.volume;
      audio.preload = 'auto';
      
      // Intentar reproducir
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        return; // Si se reproduce exitosamente, salir
      }
    } catch (error) {
      // Si falla, usar sonido generado como fallback
      this.playGeneratedSound();
    }
  }

  /**
   * Genera un sonido brillante tipo "ting" (fallback si no hay archivo)
   */
  private async playGeneratedSound(): Promise<void> {
    // Intentar reanudar el contexto de audio si está suspendido
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        // Ignorar errores al reanudar
      }
    }

    if (!this.audioContext) {
      this.initAudioContext();
      if (!this.audioContext) return;
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const volume = this.preferences.volume;

    // Crear oscilador principal con frecuencia alta y brillante (tipo "ting")
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Usar tipo 'sine' para un sonido más puro y brillante
    oscillator.type = 'sine';
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Frecuencia alta y brillante (1200 Hz) que baja rápidamente para crear el efecto "ting"
    oscillator.frequency.setValueAtTime(1200, now); // Frecuencia inicial alta y brillante
    oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.15); // Bajar suavemente
    
    // Envelope rápido: ataque rápido, decay rápido para efecto "ting"
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.01); // Ataque rápido
    gainNode.gain.exponentialRampToValueAtTime(volume * 0.2, now + 0.05); // Decay rápido
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Release
    
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  /**
   * Reproduce sonido de notificación según el tipo
   */
  async playNotification(type: NotificationType): Promise<void> {
    // Verificar si las notificaciones están habilitadas globalmente
    if (!this.preferences.enabled) {
      return;
    }

    // Verificar si el tipo específico está habilitado
    if (type === 'message' && !this.preferences.messageEnabled) {
      return;
    }

    if (type === 'call' && !this.preferences.callEnabled) {
      return;
    }

    // Reproducir sonido según el tipo
    await this.playNotificationSound(type);
  }

  /**
   * Obtiene las preferencias actuales
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Actualiza las preferencias
   */
  updatePreferences(updates: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  /**
   * Habilita/deshabilita todas las notificaciones
   */
  setEnabled(enabled: boolean): void {
    this.updatePreferences({ enabled });
  }

  /**
   * Habilita/deshabilita notificaciones de mensajes
   */
  setMessageEnabled(enabled: boolean): void {
    this.updatePreferences({ messageEnabled: enabled });
  }

  /**
   * Habilita/deshabilita notificaciones de llamadas
   */
  setCallEnabled(enabled: boolean): void {
    this.updatePreferences({ callEnabled: enabled });
  }

  /**
   * Establece el volumen (0.0 a 1.0)
   */
  setVolume(volume: number): void {
    this.updatePreferences({ volume: Math.max(0, Math.min(1, volume)) });
  }
}

// Instancia singleton
export const notificationSoundService = new NotificationSoundService();

