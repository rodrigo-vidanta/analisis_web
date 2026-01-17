// ============================================
// SERVICIO DE LOGGING DE ERRORES CRÍTICOS
// ============================================

import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface ErrorLogData {
  // Identificación
  error_id: string; // UUID único del error
  error_type: string; // Tipo de error (ej: 'API_ERROR', 'AUTH_ERROR', 'DB_ERROR')
  error_code?: string; // Código de error si existe
  
  // Información del error
  mensaje: string; // Mensaje del error (en español para N8N)
  stack_trace?: string; // Stack trace completo
  error_details?: Record<string, any>; // Detalles adicionales del error
  
  // Contexto de la aplicación
  module: string; // Módulo donde ocurrió (ej: 'agent-studio', 'live-monitor')
  component?: string; // Componente específico
  function?: string; // Función donde ocurrió
  
  // Información del usuario
  user_id?: string; // ID del usuario (si está autenticado)
  user_email?: string; // Email del usuario
  user_role?: string; // Rol del usuario
  
  // Información del entorno
  environment: 'desarrollo' | 'produccion' | 'preproduccion'; // En español - valores oficiales de BD
  browser?: string; // User agent
  url?: string; // URL donde ocurrió el error
  timestamp: string; // ISO timestamp
  
  // Metadatos adicionales
  severity: 'critico' | 'alto' | 'medio' | 'bajo'; // En español masculino - valores oficiales de BD y documentación
  session_id?: string; // ID de sesión si existe
  request_id?: string; // ID de request si existe
  
  // Clasificación para dashboard
  category: string; // Categoría del error (ej: 'autenticacion', 'api', 'base_datos')
  subcategoria?: string; // Módulo activo cuando ocurrió el error (live-chat, live-monitor, etc.)
  tags?: string[]; // Tags adicionales para filtrado
}

export interface LogServerConfig {
  id?: string;
  webhook_url: string;
  webhook_auth_token?: string; // Token de autenticación para el webhook
  enabled: boolean;
  rate_limit: number; // Número máximo de errores antes de pausar
  rate_limit_window: number; // Ventana de tiempo en minutos
  updated_at?: string;
  updated_by?: string;
}

// ============================================
// CLASE DE SERVICIO
// ============================================

class ErrorLogService {
  private config: LogServerConfig | null = null;
  private errorCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private configCacheTime: number = 0;
  private activeModule: string | undefined; // Módulo activo actual (subcategoria)
  private readonly CONFIG_CACHE_TTL = 60000; // 1 minuto

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  async initialize(): Promise<void> {
    await this.loadConfig();
    // Log de inicialización removido - solo mantener logs de error
  }

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  async loadConfig(): Promise<LogServerConfig | null> {
    const now = Date.now();
    
    // Usar cache si está disponible y no ha expirado
    if (this.config && (now - this.configCacheTime) < this.CONFIG_CACHE_TTL) {
      return this.config;
    }

    // Intentar cargar desde localStorage primero (fallback)
    const localStorageKey = 'log_server_config';
    try {
      const storedConfig = localStorage.getItem(localStorageKey);
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig) as LogServerConfig;
        this.config = parsedConfig;
        this.configCacheTime = now;
      }
    } catch (e) {
      // Ignorar errores de localStorage
    }

    // Intentar cargar desde Supabase (usar cliente normal para lectura)
    try {
      const { data, error } = await supabaseSystemUI
        .from('log_server_config_safe')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // Si la tabla no existe (404 o PGRST116), usar configuración por defecto
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
          // Tabla no existe, usar configuración por defecto y guardar en localStorage
          const defaultConfig: LogServerConfig = {
            webhook_url: 'https://primary-dev-d75a.up.railway.app/webhook/error-log',
            webhook_auth_token: '', // Se carga desde BD (log_server_config)
            enabled: true,
            rate_limit: 300,
            rate_limit_window: 1
          };
          
          this.config = defaultConfig;
          this.configCacheTime = now;
          
          // Guardar en localStorage como fallback
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(defaultConfig));
          } catch (e) {
            // Ignorar errores de localStorage
          }
          
          return this.config;
        }
        
        // Otro tipo de error, usar configuración existente o por defecto
        if (!this.config) {
          this.config = {
            webhook_url: 'https://primary-dev-d75a.up.railway.app/webhook/error-log',
            enabled: true,
            rate_limit: 300,
            rate_limit_window: 1
          };
        }
        return this.config;
      }

      if (data) {
        this.config = data as LogServerConfig;
        this.configCacheTime = now;
        
        // Sincronizar con localStorage
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(this.config));
        } catch (e) {
          // Ignorar errores de localStorage
        }
      } else {
        // No hay datos, usar configuración por defecto
        const defaultConfig: LogServerConfig = {
          webhook_url: 'https://primary-dev-d75a.up.railway.app/webhook/error-log',
          enabled: true,
          rate_limit: 300,
          rate_limit_window: 1
        };
        this.config = defaultConfig;
        this.configCacheTime = now;
      }

      return this.config;
    } catch (error) {
      // Error de red u otro error, usar configuración existente o por defecto
      if (!this.config) {
        this.config = {
          webhook_url: 'https://primary-dev-d75a.up.railway.app/webhook/error-log',
          enabled: true,
          rate_limit: 300,
          rate_limit_window: 1
        };
      }
      return this.config;
    }
  }

  async saveConfig(config: Partial<LogServerConfig>, userId?: string): Promise<boolean> {
    try {
      const configToSave: LogServerConfig = {
        ...this.config,
        ...config,
        updated_at: new Date().toISOString(),
        updated_by: userId
      } as LogServerConfig;

      // Guardar en localStorage primero (siempre funciona)
      const localStorageKey = 'log_server_config';
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(configToSave));
      } catch (e) {
        // Ignorar errores de localStorage
      }

      // Intentar guardar en Supabase usando cliente admin para evitar problemas de RLS
      try {
        const { data, error } = await supabaseSystemUI
          .from('log_server_config_safe')
          .upsert(configToSave, { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          // Si la tabla no existe, solo guardar en localStorage
          if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
            this.config = configToSave;
            this.configCacheTime = Date.now();
            return true; // Retornar true porque se guardó en localStorage
          }
          
          console.error('Error saving log server config:', error);
          // Aún así, actualizar la configuración local porque se guardó en localStorage
          this.config = configToSave;
          this.configCacheTime = Date.now();
          return false;
        }

        if (data) {
          this.config = data as LogServerConfig;
          this.configCacheTime = Date.now();
          
          // Sincronizar con localStorage
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(this.config));
          } catch (e) {
            // Ignorar errores de localStorage
          }
        }
        
        return true;
      } catch (dbError) {
        // Error de base de datos, pero la configuración ya está en localStorage
        this.config = configToSave;
        this.configCacheTime = Date.now();
        return true; // Retornar true porque se guardó en localStorage
      }
    } catch (error) {
      console.error('Error saving log server config:', error);
      return false;
    }
  }

  getConfig(): LogServerConfig | null {
    return this.config;
  }

  /**
   * Establece el módulo activo actual (para subcategoria)
   */
  setActiveModule(module: string | undefined): void {
    this.activeModule = module;
  }

  /**
   * Obtiene el módulo activo actual
   */
  getActiveModule(): string | undefined {
    return this.activeModule;
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  private getErrorKey(errorData: ErrorLogData): string {
    // Crear una clave única basada en el tipo de error y mensaje
    // Esto permite agrupar errores similares
    const keyParts = [
      errorData.error_type,
      errorData.module,
      errorData.mensaje.substring(0, 100) // Primeros 100 caracteres del mensaje
    ];
    return keyParts.join('|');
  }

  private isRateLimited(errorKey: string): boolean {
    const now = Date.now();
    const config = this.config;

    if (!config || !config.enabled) {
      return false;
    }

    const errorInfo = this.errorCounts.get(errorKey);

    if (!errorInfo) {
      // Primera vez que vemos este error
      this.errorCounts.set(errorKey, {
        count: 1,
        resetTime: now + (config.rate_limit_window * 60 * 1000)
      });
      return false;
    }

    // Verificar si la ventana de tiempo ha expirado
    if (now > errorInfo.resetTime) {
      // Resetear contador
      this.errorCounts.set(errorKey, {
        count: 1,
        resetTime: now + (config.rate_limit_window * 60 * 1000)
      });
      return false;
    }

    // Incrementar contador
    errorInfo.count++;

    // Verificar si excede el límite
    if (errorInfo.count > config.rate_limit) {
      return true; // Rate limited
    }

    return false;
  }

  // Limpiar contadores expirados periódicamente
  private cleanupExpiredCounters(): void {
    const now = Date.now();
    for (const [key, info] of this.errorCounts.entries()) {
      if (now > info.resetTime) {
        this.errorCounts.delete(key);
      }
    }
  }

  // ============================================
  // LOGGING DE ERRORES
  // ============================================

  /**
   * Registra un error crítico y lo envía al webhook si está configurado
   */
  async logError(
    error: Error | string | unknown,
    context: {
      module: string;
      component?: string;
      function?: string;
      userId?: string;
      userEmail?: string;
      userRole?: string;
      severity?: 'critico' | 'alto' | 'medio' | 'bajo';
      category?: string;
      tags?: string[];
      details?: Record<string, any>;
      subcategoria?: string; // Módulo activo (live-chat, live-monitor, etc.)
    }
  ): Promise<void> {
    try {
      // Asegurar que la configuración esté cargada
      if (!this.config) {
        await this.loadConfig();
      }

      // Limpiar contadores expirados
      this.cleanupExpiredCounters();

      // Construir estructura de datos del error
      const errorData = this.buildErrorData(error, context);

      // Verificar rate limiting
      const errorKey = this.getErrorKey(errorData);
      if (this.isRateLimited(errorKey)) {
        return;
      }

      // Enviar al webhook si está habilitado
      if (this.config?.enabled && this.config?.webhook_url) {
        await this.sendToWebhook(errorData);
      }
    } catch (logError) {
      // No queremos que errores en el logging causen más errores
      console.error('[ErrorLogService] Error logging error:', logError);
    }
  }

  /**
   * Construye la estructura de datos del error de forma consistente
   */
  private buildErrorData(
    error: Error | string | unknown,
    context: {
      module: string;
      component?: string;
      function?: string;
      userId?: string;
      userEmail?: string;
      userRole?: string;
      severity?: 'critico' | 'alto' | 'medio' | 'bajo';
      category?: string;
      tags?: string[];
      details?: Record<string, any>;
      subcategoria?: string;
    }
  ): ErrorLogData {
    // Determinar tipo y mensaje del error
    let errorType = 'UNKNOWN_ERROR';
    let message = 'Unknown error';
    let stackTrace: string | undefined;
    let errorCode: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      stackTrace = error.stack;
      errorType = error.name || 'ERROR';
      errorCode = (error as any).code;
    } else if (typeof error === 'string') {
      message = error;
      errorType = 'STRING_ERROR';
    } else if (error && typeof error === 'object') {
      message = (error as any).message || JSON.stringify(error);
      errorType = (error as any).type || (error as any).name || 'OBJECT_ERROR';
      errorCode = (error as any).code;
      stackTrace = (error as any).stack;
    }

    // Agregar información del usuario al mensaje si es un error de autenticación/login
    if ((context.module === 'auth' || context.category === 'autenticacion' || 
         message.toLowerCase().includes('credenciales') || 
         message.toLowerCase().includes('login') ||
         message.toLowerCase().includes('authentication')) &&
        (context.userEmail || context.details?.email)) {
      const userEmail = context.userEmail || context.details?.email;
      message = `Login error, user: ${userEmail} - ${message}`;
    }

    // Determinar categoría si no se proporciona
    const category = context.category || this.inferCategory(errorType, context.module);

    // Determinar severidad si no se proporciona (convertir a español)
    const severity = context.severity || this.inferSeverity(errorType, message);

    // Obtener información del navegador
    const browser = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;
    const url = typeof window !== 'undefined' ? window.location.href : undefined;

    // Determinar entorno (convertir a español)
    const environment = this.getEnvironment();

    // Obtener módulo activo (subcategoria) si no se proporciona
    const subcategoria = context.subcategoria || this.activeModule || this.detectActiveModule();

    return {
      error_id: this.generateErrorId(),
      error_type: errorType,
      error_code: errorCode,
      mensaje: message, // Campo renombrado a español para N8N
      stack_trace: stackTrace,
      error_details: context.details || {},
      module: context.module,
      component: context.component,
      function: context.function,
      user_id: context.userId,
      user_email: context.userEmail,
      user_role: context.userRole,
      environment,
      browser,
      url,
      timestamp: new Date().toISOString(),
      severity,
      category,
      subcategoria,
      tags: context.tags || [],
      session_id: this.getSessionId(),
      request_id: this.generateRequestId()
    };
  }

  /**
   * Infiere la categoría del error basándose en el tipo y módulo (en español)
   */
  private inferCategory(errorType: string, module: string): string {
    const typeLower = errorType.toLowerCase();
    const moduleLower = module.toLowerCase();

    if (typeLower.includes('auth') || typeLower.includes('login') || typeLower.includes('permission')) {
      return 'autenticacion';
    }
    if (typeLower.includes('api') || typeLower.includes('fetch') || typeLower.includes('network')) {
      return 'api';
    }
    if (typeLower.includes('db') || typeLower.includes('database') || typeLower.includes('query')) {
      return 'base_datos';
    }
    if (typeLower.includes('validation') || typeLower.includes('invalid')) {
      return 'validacion';
    }
    if (moduleLower.includes('vapi') || moduleLower.includes('twilio') || moduleLower.includes('11labs')) {
      return 'servicio_externo';
    }
    if (moduleLower.includes('aws') || moduleLower.includes('ecs') || moduleLower.includes('rds')) {
      return 'infraestructura';
    }

    return 'aplicacion';
  }

  /**
   * Infiere la severidad basándose en el tipo y mensaje del error (en español masculino)
   * Valores oficiales de BD y documentación: 'critico', 'alto', 'medio', 'bajo'
   */
  private inferSeverity(errorType: string, message: string): 'critico' | 'alto' | 'medio' | 'bajo' {
    const typeLower = errorType.toLowerCase();
    const messageLower = message.toLowerCase();

    // Errores críticos
    if (
      typeLower.includes('critical') ||
      typeLower.includes('fatal') ||
      messageLower.includes('cannot connect') ||
      messageLower.includes('database connection') ||
      messageLower.includes('authentication failed')
    ) {
      return 'critico';
    }

    // Errores de alta severidad
    if (
      typeLower.includes('error') ||
      messageLower.includes('failed') ||
      messageLower.includes('exception')
    ) {
      return 'alto';
    }

    // Errores de severidad media
    if (
      typeLower.includes('warning') ||
      messageLower.includes('warning') ||
      messageLower.includes('deprecated')
    ) {
      return 'medio';
    }

    return 'bajo';
  }

  /**
   * Obtiene el entorno actual (en español)
   * Valores oficiales de BD: 'desarrollo', 'produccion', 'preproduccion'
   */
  private getEnvironment(): 'desarrollo' | 'produccion' | 'preproduccion' {
    if (typeof window === 'undefined') {
      return 'produccion';
    }

    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'desarrollo';
    }
    if (hostname.includes('staging') || hostname.includes('dev') || hostname.includes('preprod')) {
      return 'preproduccion';
    }
    return 'produccion';
  }

  /**
   * Detecta el módulo activo actual (subcategoria) desde diferentes fuentes
   */
  private detectActiveModule(): string | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    try {
      // Intentar obtener del store de Zustand directamente desde el DOM
      // Zustand puede guardar el estado en diferentes lugares, intentar varios métodos
      
      // Método 1: Intentar obtener desde el store global si está disponible
      if ((window as any).__ZUSTAND_STORE__) {
        const store = (window as any).__ZUSTAND_STORE__;
        if (store.getState && store.getState().appMode) {
          return store.getState().appMode;
        }
      }

      // Método 2: Intentar obtener del localStorage con diferentes claves posibles
      const possibleKeys = ['app-store', 'zustand-app-store', 'app-state'];
      for (const key of possibleKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Zustand puede guardar como { state: {...} } o directamente {...}
            const appMode = parsed?.state?.appMode || parsed?.appMode;
            if (appMode) {
              return appMode;
            }
          } catch (e) {
            // Continuar con el siguiente método
          }
        }
      }

      // Método 3: Intentar obtener de la URL o del contexto
      const moduleMap: Record<string, string> = {
        'live-chat': 'live-chat',
        'live-monitor': 'live-monitor',
        'admin': 'admin',
        'ai-models': 'ai-models',
        'aws-manager': 'aws-manager',
        'log-server': 'log-server',
        'prospectos': 'prospectos',
        'pqnc': 'pqnc',
        'natalia': 'natalia'
      };

      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      const fullPath = path + hash + search;

      for (const [key, value] of Object.entries(moduleMap)) {
        if (fullPath.includes(key)) {
          return value;
        }
      }
    } catch (e) {
      // Ignorar errores al obtener el módulo activo
    }

    return undefined;
  }

  /**
   * Genera un ID único para el error
   */
  private generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera un ID único para la request
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 12);
  }

  /**
   * Obtiene el ID de sesión si existe
   */
  private getSessionId(): string | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }
    // Intentar obtener de sessionStorage o localStorage
    return sessionStorage.getItem('session_id') || localStorage.getItem('session_id') || undefined;
  }

  /**
   * Envía el error al webhook
   */
  private async sendToWebhook(errorData: ErrorLogData): Promise<void> {
    if (!this.config?.webhook_url) {
      return;
    }

    try {
      // Preparar headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Añadir header de autorización si existe token
      const token = this.config.webhook_auth_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const payloadToSend = JSON.stringify(errorData);
      
      const response = await fetch(this.config.webhook_url, {
        method: 'POST',
        headers,
        body: payloadToSend,
      });

      if (!response.ok) {
        // Error silencioso para evitar loops - solo registrar en caso de fallo crítico
        const errorText = await response.text().catch(() => 'Unable to read error');
        // No loguear para mantener consola limpia
      }
    } catch (error) {
      // No queremos que errores de red causen más errores
      // Error silencioso para mantener consola limpia
    }
  }
}

// ============================================
// INSTANCIA SINGLETON
// ============================================

export const errorLogService = new ErrorLogService();

// Inicializar automáticamente
errorLogService.initialize().catch(console.error);

// ============================================
// EXPORTACIÓN
// ============================================

export default errorLogService;

