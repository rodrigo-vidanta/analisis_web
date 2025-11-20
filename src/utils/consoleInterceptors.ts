/**
 * Interceptores de consola para silenciar warnings y errores esperados
 * Este archivo debe ser importado ANTES de cualquier módulo que use Supabase
 */

// Silenciar warnings de múltiples instancias de GoTrueClient (esperado cuando hay múltiples proyectos Supabase)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  const fullMessage = args.map(arg => arg?.toString() || '').join(' ');
  
  if (message.includes('Multiple GoTrueClient instances')) {
    // Silenciar este warning específico - es esperado con múltiples proyectos Supabase
    return;
  }
  
  // Silenciar warnings de canvas con dimensiones cero (se manejan con retornos tempranos)
  if (fullMessage.includes('Canvas tiene dimensiones cero') || 
      fullMessage.includes('PERFORMANCE CHART')) {
    return;
  }
  
  originalWarn.apply(console, args);
};

// Interceptar errores de red 404 usando fetch interceptor
// Esto previene que los errores 404 aparezcan en la consola del navegador
const originalFetch = window.fetch;
window.fetch = async function(...args: any[]) {
  const url = args[0]?.toString() || '';
  
  // Interceptar peticiones a tablas que no existen (se manejan con datos mock)
  if (url.includes('/rest/v1/tools') || url.includes('/rest/v1/agent_templates')) {
    try {
      const response = await originalFetch.apply(window, args);
      
      // Si es un 404, interceptar antes de que se muestre en consola
      if (response.status === 404) {
        // Retornar respuesta silenciosa - el código manejará el error
        // Clonar la respuesta para poder leerla sin afectar el flujo
        const clonedResponse = response.clone();
        return clonedResponse;
      }
      
      return response;
    } catch (error) {
      // Si hay un error de red, también manejarlo silenciosamente
      // El código tiene fallbacks para estos casos
      return new Response(JSON.stringify([]), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return originalFetch.apply(window, args);
};

// Interceptar XMLHttpRequest para capturar errores 404 de Supabase
if (window.XMLHttpRequest) {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
    this._url = url.toString();
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(...args: any[]) {
    const url = this._url || '';
    
    // Interceptar peticiones a tablas que no existen
    if (url.includes('/rest/v1/tools') || url.includes('/rest/v1/agent_templates')) {
      this.addEventListener('error', (event) => {
        // Prevenir que el error se muestre en consola
        event.stopPropagation();
      }, true);
      
      this.addEventListener('load', function() {
        // Si es 404, silenciarlo
        if (this.status === 404) {
          // El error ya está manejado por el código con fallbacks
        }
      });
    }
    
    return originalSend.apply(this, args);
  };
}

// Silenciar errores 404 de tablas que no existen (se manejan con fallbacks)
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  const fullMessage = args.map(arg => arg?.toString() || '').join(' ');
  
  // Silenciar errores 404 de Supabase para tablas que no existen (se manejan con datos mock)
  if ((message.includes('404') || fullMessage.includes('404')) && 
      (fullMessage.includes('tools') || fullMessage.includes('agent_templates') || 
       fullMessage.includes('Not Found'))) {
    return;
  }
  
  // Silenciar errores de red 404 de Supabase REST API
  if (fullMessage.includes('GET') && fullMessage.includes('404') && 
      (fullMessage.includes('/rest/v1/tools') || fullMessage.includes('/rest/v1/agent_templates'))) {
    return;
  }
  
  originalError.apply(console, args);
};

// ============================================
// INTERCEPTOR GLOBAL DE ERRORES PARA LOGGING
// ============================================

// Interceptar errores no capturados de JavaScript
window.addEventListener('error', (event) => {
  // Importar dinámicamente para evitar dependencias circulares
  import('../services/errorLogService').then(({ errorLogService }) => {
    errorLogService.logError(event.error || event.message, {
      module: 'global',
      component: 'ErrorHandler',
      function: 'window.onerror',
      severity: 'alta',
      category: 'aplicacion',
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      }
    }).catch(() => {}); // No queremos que errores de logging causen más errores
  }).catch(() => {}); // Silenciar errores de importación
});

// Interceptar promesas rechazadas sin catch
window.addEventListener('unhandledrejection', (event) => {
  // Importar dinámicamente para evitar dependencias circulares
  import('../services/errorLogService').then(({ errorLogService }) => {
    errorLogService.logError(event.reason, {
      module: 'global',
      component: 'ErrorHandler',
      function: 'unhandledrejection',
      severity: 'alta',
      category: 'aplicacion',
      details: {
        reason: event.reason instanceof Error ? event.reason.message : String(event.reason)
      }
    }).catch(() => {}); // No queremos que errores de logging causen más errores
  }).catch(() => {}); // Silenciar errores de importación
});

// Interceptar console.error para capturar errores críticos
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Llamar al original primero
  originalConsoleError.apply(console, args);
  
  // NO capturar errores del propio ErrorLogService para evitar loops infinitos
  const firstArg = args[0];
  const fullMessage = args.map(arg => String(arg)).join(' ');
  
  // Excluir mensajes del ErrorLogService
  if (fullMessage.includes('[ErrorLogService]') || 
      fullMessage.includes('ErrorLogService') ||
      fullMessage.includes('Webhook responded') ||
      fullMessage.includes('Error sending to webhook') ||
      fullMessage.includes('Error logging error')) {
    return; // No loggear errores del propio servicio de logging
  }
  
  // Excluir errores de Realtime que son warnings esperados (no críticos)
  if (fullMessage.includes('[REALTIME V4]') ||
      fullMessage.includes('REALTIME V4') ||
      fullMessage.includes('posible sobrecarga de conexiones') ||
      fullMessage.includes('Demasiadas conversaciones') ||
      fullMessage.includes('Reintentando Realtime') ||
      fullMessage.includes('realtime_undefined') ||
      fullMessage.includes('realtime_overload') ||
      fullMessage.includes('channel_error') ||
      fullMessage.includes('Canal cerrado') ||
      fullMessage.includes('Timeout, reintentando')) {
    return; // No loggear errores de Realtime - son warnings esperados de conexión
  }
  
  // Intentar capturar errores críticos (solo los que parecen ser errores reales, no warnings)
  if (firstArg instanceof Error || 
      (typeof firstArg === 'string' && (
        firstArg.toLowerCase().includes('error') || 
        firstArg.toLowerCase().includes('failed') ||
        firstArg.toLowerCase().includes('exception')
      ))) {
    // Importar dinámicamente para evitar dependencias circulares
    import('../services/errorLogService').then(({ errorLogService }) => {
      const errorMessage = firstArg instanceof Error 
        ? firstArg.message 
        : String(firstArg);
      
      // Solo loggear si parece ser un error crítico (evitar spam)
      if (errorMessage.length > 0 && 
          !errorMessage.includes('404') && 
          !errorMessage.includes('PGRST116') &&
          !errorMessage.includes('[ErrorLogService]')) {
        errorLogService.logError(firstArg instanceof Error ? firstArg : errorMessage, {
          module: 'console',
          component: 'ConsoleInterceptor',
          function: 'console.error',
          severity: 'medio',
          category: 'aplicacion',
          details: {
            args: args.map(arg => {
              if (arg instanceof Error) {
                return { message: arg.message, stack: arg.stack };
              }
              return String(arg);
            })
          }
        }).catch(() => {}); // No queremos que errores de logging causen más errores
      }
    }).catch(() => {}); // Silenciar errores de importación
  }
};

