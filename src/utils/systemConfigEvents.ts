// Sistema de eventos para actualizar configuración del sistema en tiempo real

type SystemConfigListener = () => void;

class SystemConfigEventManager {
  private listeners: SystemConfigListener[] = [];

  addListener(listener: SystemConfigListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: SystemConfigListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyUpdate() {
    this.listeners.forEach(listener => listener());
  }
}

export const systemConfigEvents = new SystemConfigEventManager();
