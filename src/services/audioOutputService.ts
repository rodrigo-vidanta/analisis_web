/**
 * Servicio para reproducir audio en TODOS los dispositivos de salida simultaneamente.
 * Resuelve el problema de agentes con bocinas + audifonos donde el audio solo
 * sale por el dispositivo predeterminado.
 *
 * Usa HTMLMediaElement.setSinkId() (Chrome 110+) para enrutar audio a cada dispositivo.
 * Fallback: si setSinkId no esta soportado, reproduce solo en dispositivo predeterminado.
 */

interface AudioOutputPreferences {
  multiDeviceEnabled: boolean;
}

interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

const STORAGE_KEY = 'dashboard-audio-output-preferences';

const DEFAULT_PREFERENCES: AudioOutputPreferences = {
  multiDeviceEnabled: false,
};

class AudioOutputService {
  private preferences: AudioOutputPreferences;
  private devices: AudioOutputDevice[] = [];
  private audioUnlocked = false;
  private deviceChangeListeners: Array<(devices: AudioOutputDevice[]) => void> = [];
  private setSinkIdSupported: boolean;

  constructor() {
    this.preferences = this.loadPreferences();
    this.setSinkIdSupported = this.checkSetSinkIdSupport();
    this.setupDeviceChangeListener();
    this.setupAutoplayUnlock();
    this.refreshDevices();
  }

  private checkSetSinkIdSupport(): boolean {
    if (typeof HTMLMediaElement === 'undefined') return false;
    return typeof HTMLMediaElement.prototype.setSinkId === 'function';
  }

  // --- Preferences ---

  private loadPreferences(): AudioOutputPreferences {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_PREFERENCES };
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch { /* ignore */ }
  }

  isMultiDeviceEnabled(): boolean {
    return this.preferences.multiDeviceEnabled && this.setSinkIdSupported;
  }

  setMultiDeviceEnabled(enabled: boolean): void {
    this.preferences.multiDeviceEnabled = enabled;
    this.savePreferences();
    if (enabled) {
      this.requestDeviceAccess();
    }
  }

  isSupported(): boolean {
    return this.setSinkIdSupported;
  }

  // --- Device enumeration ---

  async requestDeviceAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      await this.refreshDevices();
      return true;
    } catch (error) {
      console.warn('[AudioOutput] Error requesting device access:', error);
      return false;
    }
  }

  async refreshDevices(): Promise<void> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();

      // Filtrar pseudo-devices (default, communications) que son alias
      // y causarian sonido duplicado en el mismo dispositivo fisico
      const realDevices = allDevices
        .filter(d =>
          d.kind === 'audiooutput' &&
          d.deviceId !== '' &&
          d.deviceId !== 'default' &&
          d.deviceId !== 'communications'
        )
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Dispositivo ${d.deviceId.slice(0, 8)}`,
        }));

      // Si no hay devices especificos, agregar default como fallback
      if (realDevices.length === 0) {
        this.devices = [{ deviceId: '', label: 'Dispositivo predeterminado' }];
      } else {
        this.devices = realDevices;
      }

      this.notifyDeviceChange();
    } catch (error) {
      console.warn('[AudioOutput] Error enumerating devices:', error);
    }
  }

  private setupDeviceChangeListener(): void {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.refreshDevices();
      });
    }
  }

  getDevices(): AudioOutputDevice[] {
    return [...this.devices];
  }

  getDeviceCount(): number {
    return this.devices.length;
  }

  onDeviceChange(listener: (devices: AudioOutputDevice[]) => void): () => void {
    this.deviceChangeListeners.push(listener);
    return () => {
      this.deviceChangeListeners = this.deviceChangeListeners.filter(l => l !== listener);
    };
  }

  private notifyDeviceChange(): void {
    const devices = this.getDevices();
    this.deviceChangeListeners.forEach(l => l(devices));
  }

  // --- Autoplay unlock ---

  private setupAutoplayUnlock(): void {
    if (typeof document === 'undefined') return;

    const unlock = () => {
      if (this.audioUnlocked) return;
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        this.audioUnlocked = true;
        document.removeEventListener('click', unlock);
        document.removeEventListener('keydown', unlock);
        document.removeEventListener('touchstart', unlock);
      }).catch(() => { /* retry on next interaction */ });
    };

    document.addEventListener('click', unlock, { passive: true });
    document.addEventListener('keydown', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
  }

  // --- Core playback ---

  /**
   * Reproduce un sonido en todos los dispositivos de salida disponibles.
   * Si multi-device esta deshabilitado o no soportado, reproduce solo en el default.
   */
  async playOnAllDevices(soundUrl: string, volume: number): Promise<void> {
    if (!this.isMultiDeviceEnabled() || this.devices.length <= 1) {
      return this.playOnDefaultDevice(soundUrl, volume);
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));

    const playPromises = this.devices.map(async (device) => {
      try {
        const audio = new Audio(soundUrl);
        audio.volume = clampedVolume;
        audio.preload = 'auto';
        await audio.setSinkId(device.deviceId);
        await audio.play();
        audio.addEventListener('ended', () => { audio.remove(); }, { once: true });
      } catch (error) {
        console.warn(`[AudioOutput] Error playing on ${device.label}:`, error);
      }
    });

    await Promise.allSettled(playPromises);
  }

  /**
   * Reproduce solo en el dispositivo predeterminado (fallback / single-device).
   */
  async playOnDefaultDevice(soundUrl: string, volume: number): Promise<void> {
    const audio = new Audio(soundUrl);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.preload = 'auto';
    await audio.play();
    audio.addEventListener('ended', () => { audio.remove(); }, { once: true });
  }

  getPreferences(): AudioOutputPreferences {
    return { ...this.preferences };
  }
}

export const audioOutputService = new AudioOutputService();
export type { AudioOutputDevice, AudioOutputPreferences };
