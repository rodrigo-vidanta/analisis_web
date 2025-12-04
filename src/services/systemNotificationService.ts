/**
 * Servicio para manejar notificaciones del sistema operativo
 * Usa la API de Notifications del navegador para mostrar notificaciones
 * incluso cuando el usuario no está en la pestaña activa
 */

interface SystemNotificationPreferences {
  enabled: boolean;
  messageEnabled: boolean;
  callEnabled: boolean;
  scheduledCallEnabled: boolean;
  newProspectEnabled: boolean;
  permissionGranted: boolean;
}

const DEFAULT_PREFERENCES: SystemNotificationPreferences = {
  enabled: true,
  messageEnabled: true,
  callEnabled: true,
  scheduledCallEnabled: true,
  newProspectEnabled: true,
  permissionGranted: false
};

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // Para agrupar notificaciones similares
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any; // Datos adicionales para manejar clicks
}

class SystemNotificationService {
  private preferences: SystemNotificationPreferences;
  private permissionStatus: NotificationPermission = 'default';

  constructor() {
    this.preferences = this.loadPreferences();
    this.checkPermission();
  }

  private loadPreferences(): SystemNotificationPreferences {
    try {
      const saved = localStorage.getItem('dashboard-system-notification-preferences');
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Error cargando preferencias de notificaciones del sistema:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  private savePreferences() {
    try {
      localStorage.setItem('dashboard-system-notification-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Error guardando preferencias de notificaciones del sistema:', error);
    }
  }

  /**
   * Verificar el estado del permiso de notificaciones
   */
  private checkPermission() {
    if ('Notification' in window) {
      this.permissionStatus = Notification.permission;
      this.preferences.permissionGranted = this.permissionStatus === 'granted';
    } else {
      console.warn('Las notificaciones del navegador no están disponibles');
      this.permissionStatus = 'denied';
      this.preferences.permissionGranted = false;
    }
  }

  /**
   * Solicitar permiso para mostrar notificaciones
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Las notificaciones del navegador no están disponibles en este navegador');
      return false;
    }

    if (this.permissionStatus === 'granted') {
      this.preferences.permissionGranted = true;
      this.savePreferences();
      return true;
    }

    if (this.permissionStatus === 'denied') {
      console.warn('El permiso de notificaciones fue denegado. El usuario debe habilitarlo manualmente en la configuración del navegador.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      this.preferences.permissionGranted = permission === 'granted';
      this.savePreferences();
      
      if (permission === 'granted') {
        // Mostrar una notificación de prueba
        this.showNotification({
          title: 'Notificaciones activadas',
          body: 'Ahora recibirás notificaciones del sistema cuando haya actividad en el dashboard.',
          icon: '/favicon.ico',
          tag: 'permission-granted',
          silent: false
        });
      }
      
      return permission === 'granted';
    } catch (error) {
      console.error('Error solicitando permiso de notificaciones:', error);
      return false;
    }
  }

  /**
   * Verificar si se tienen permisos
   */
  hasPermission(): boolean {
    this.checkPermission();
    return this.permissionStatus === 'granted';
  }

  /**
   * Mostrar una notificación del sistema
   */
  private showNotification(options: NotificationOptions): void {
    if (!this.preferences.enabled) {
      return;
    }

    if (!this.hasPermission()) {
      console.warn('No se tienen permisos para mostrar notificaciones');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data
      });

      // Cerrar automáticamente después de 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Manejar click en la notificación
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // Si hay datos, navegar a la página correspondiente
        if (options.data) {
          if (options.data.url) {
            window.location.href = options.data.url;
          } else if (options.data.module) {
            // Navegar al módulo correspondiente
            const moduleMap: Record<string, string> = {
              'live-chat': '/live-chat',
              'live-monitor': '/live-monitor',
              'dashboard': '/operative-dashboard'
            };
            const url = moduleMap[options.data.module] || '/operative-dashboard';
            window.location.href = url;
          }
        }
      };
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  /**
   * Mostrar notificación de nuevo mensaje
   */
  showMessageNotification(data: {
    customerName: string;
    messagePreview: string;
    conversationId?: string;
    prospectId?: string;
  }): void {
    if (!this.preferences.messageEnabled) {
      return;
    }

    this.showNotification({
      title: `Nuevo mensaje de ${data.customerName}`,
      body: data.messagePreview.length > 100 
        ? `${data.messagePreview.substring(0, 100)}...` 
        : data.messagePreview,
      icon: '/favicon.ico',
      tag: `message-${data.conversationId || data.prospectId}`,
      data: {
        module: 'live-chat',
        conversationId: data.conversationId,
        prospectId: data.prospectId
      }
    });
  }

  /**
   * Mostrar notificación de nueva llamada
   */
  showCallNotification(data: {
    prospectName: string;
    callStatus: string;
    callId?: string;
    prospectId?: string;
  }): void {
    if (!this.preferences.callEnabled) {
      return;
    }

    this.showNotification({
      title: `Nueva llamada: ${data.prospectName}`,
      body: `Estado: ${data.callStatus}`,
      icon: '/favicon.ico',
      tag: `call-${data.callId}`,
      requireInteraction: true, // Las llamadas requieren atención inmediata
      data: {
        module: 'live-monitor',
        callId: data.callId,
        prospectId: data.prospectId
      }
    });
  }

  /**
   * Mostrar notificación de llamada programada
   */
  showScheduledCallNotification(data: {
    prospectName: string;
    scheduledTime: string;
    callId?: string;
    prospectId?: string;
  }): void {
    if (!this.preferences.scheduledCallEnabled) {
      return;
    }

    const time = new Date(data.scheduledTime).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    this.showNotification({
      title: `Llamada programada: ${data.prospectName}`,
      body: `Programada para las ${time}`,
      icon: '/favicon.ico',
      tag: `scheduled-call-${data.callId}`,
      data: {
        module: 'dashboard',
        callId: data.callId,
        prospectId: data.prospectId
      }
    });
  }

  /**
   * Mostrar notificación de nuevo prospecto
   */
  showNewProspectNotification(data: {
    prospectName: string;
    prospectId?: string;
  }): void {
    if (!this.preferences.newProspectEnabled) {
      return;
    }

    this.showNotification({
      title: 'Nuevo prospecto',
      body: `${data.prospectName} ha sido agregado`,
      icon: '/favicon.ico',
      tag: `prospect-${data.prospectId}`,
      data: {
        module: 'dashboard',
        prospectId: data.prospectId
      }
    });
  }

  /**
   * Obtener las preferencias actuales
   */
  getPreferences(): SystemNotificationPreferences {
    this.checkPermission();
    return { ...this.preferences };
  }

  /**
   * Actualizar preferencias
   */
  updatePreferences(updates: Partial<SystemNotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  /**
   * Habilitar/deshabilitar todas las notificaciones
   */
  setEnabled(enabled: boolean): void {
    this.updatePreferences({ enabled });
  }

  /**
   * Habilitar/deshabilitar notificaciones de mensajes
   */
  setMessageEnabled(enabled: boolean): void {
    this.updatePreferences({ messageEnabled: enabled });
  }

  /**
   * Habilitar/deshabilitar notificaciones de llamadas
   */
  setCallEnabled(enabled: boolean): void {
    this.updatePreferences({ callEnabled: enabled });
  }

  /**
   * Habilitar/deshabilitar notificaciones de llamadas programadas
   */
  setScheduledCallEnabled(enabled: boolean): void {
    this.updatePreferences({ scheduledCallEnabled: enabled });
  }

  /**
   * Habilitar/deshabilitar notificaciones de nuevos prospectos
   */
  setNewProspectEnabled(enabled: boolean): void {
    this.updatePreferences({ newProspectEnabled: enabled });
  }

  /**
   * Obtener el estado del permiso
   */
  getPermissionStatus(): NotificationPermission {
    this.checkPermission();
    return this.permissionStatus;
  }
}

// Instancia singleton
export const systemNotificationService = new SystemNotificationService();

