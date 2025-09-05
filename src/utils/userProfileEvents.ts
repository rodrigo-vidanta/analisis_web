// Sistema de eventos para actualizar perfil de usuario en tiempo real

type UserProfileListener = () => void;

class UserProfileEventManager {
  private listeners: UserProfileListener[] = [];

  addListener(listener: UserProfileListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: UserProfileListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyUpdate() {
    this.listeners.forEach(listener => listener());
  }
}

export const userProfileEvents = new UserProfileEventManager();
