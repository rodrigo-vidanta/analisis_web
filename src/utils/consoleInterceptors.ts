/**
 * Interceptores de consola para silenciar warnings y errores esperados
 * Este archivo debe ser importado ANTES de cualquier módulo que use Supabase
 */

// Silenciar logs de fetch del navegador (DevTools) y logs de depuración del Dashboard
const originalLog = console.log;
console.log = (...args: any[]) => {
  const fullMessage = args.map(arg => arg?.toString() || '').join(' ');
  
  // Silenciar logs de Vite dev server
  if (fullMessage.includes('[vite]') ||
      fullMessage.includes('connecting...') ||
      fullMessage.includes('connected.') ||
      fullMessage.includes('Navigated to')) {
    return;
  }
  
  // Silenciar logs de Realtime
  if (fullMessage.includes('[Realtime]') ||
      fullMessage.includes('Suscribiendo a notificaciones') ||
      fullMessage.includes('Estado de suscripción:') ||
      fullMessage.includes('user_notifications_')) {
    return;
  }
  
  // Silenciar logs de fetch del navegador
  if (fullMessage.includes('Fetch finished loading') || 
      fullMessage.includes('Fetch failed loading') ||
      fullMessage.includes('window.fetch')) {
    return;
  }
  
  // Silenciar logs de depuración del Dashboard
  if (fullMessage.includes('[ConversacionesWidget]') ||
      fullMessage.includes('[AdminDashboardTabs]') ||
      fullMessage.includes('[CallDetailModalSidebar]') ||
      fullMessage.includes('[DailyView]') ||
      fullMessage.includes('[DynamicsLead]') ||
      fullMessage.includes('EVENTO RECIBIDO') ||
      fullMessage.includes('Cambio en keys') ||
      fullMessage.includes('Estado actualizado') ||
      fullMessage.includes('pausas activas') ||
      fullMessage.includes('Cambio detectado') ||
      fullMessage.includes('Verificando permisos') ||
      fullMessage.includes('Cargando contador de mensajes') ||
      fullMessage.includes('Contador de mensajes:') ||
      fullMessage.includes('Render Debug') ||
      fullMessage.includes('Prospecto data (useEffect)') ||
      fullMessage.includes('Cargando detalle de llamada:') ||
      fullMessage.includes('[ProspectDetailSidebar]') ||
      fullMessage.includes('Estados del modal actualizados') ||
      fullMessage.includes('Prospecto cargado:') ||
      fullMessage.includes('handleOpenCallDetail llamado') ||
      fullMessage.includes('Estados actualizados - selectedCallId') ||
      fullMessage.includes('Abriendo CallDetailModalSidebar') ||
      fullMessage.includes('Cerrando CallDetailModalSidebar') ||
      fullMessage.includes('Cambiando llamada a:') ||
      fullMessage.includes('puede ver llamadas programadas') ||
      fullMessage.includes('puede ver conversaciones') ||
      fullMessage.includes('ejecutivos como backup') ||
      fullMessage.includes('Carga inicial') ||
      fullMessage.includes('Columna') ||
      fullMessage.includes('cargada:') ||
      fullMessage.includes('Fecha seleccionada:') ||
      fullMessage.includes('Total llamadas:') ||
      fullMessage.includes('Filtradas:') ||
      fullMessage.includes('loadEtapaTotals') ||
      fullMessage.includes('prospectos procesados') ||
      fullMessage.includes('Cambiando tema a:') ||
      fullMessage.includes('Header:') ||
      fullMessage.includes('Buscando lead') ||
      fullMessage.includes('Respuesta recibida')) {
    return;
  }
  
  // Silenciar mensaje de React DevTools
  if (fullMessage.includes('Download the React DevTools') ||
      fullMessage.includes('react.dev/link/react-devtools')) {
    return;
  }
  
  originalLog.apply(console, args);
};

// También interceptar console.info por si los logs aparecen ahí
const originalInfo = console.info;
console.info = (...args: any[]) => {
  const fullMessage = args.map(arg => arg?.toString() || '').join(' ');
  
  // Silenciar logs de Vite dev server
  if (fullMessage.includes('[vite]') ||
      fullMessage.includes('connecting...') ||
      fullMessage.includes('connected.') ||
      fullMessage.includes('Navigated to')) {
    return;
  }
  
  // Silenciar logs de Realtime
  if (fullMessage.includes('[Realtime]') ||
      fullMessage.includes('Suscribiendo a notificaciones') ||
      fullMessage.includes('Estado de suscripción:') ||
      fullMessage.includes('user_notifications_')) {
    return;
  }
  
  // Silenciar logs de fetch del navegador
  if (fullMessage.includes('Fetch finished loading') || 
      fullMessage.includes('Fetch failed loading') ||
      fullMessage.includes('window.fetch')) {
    return;
  }
  
  // Silenciar logs de depuración del Dashboard
  if (fullMessage.includes('[ConversacionesWidget]') ||
      fullMessage.includes('[AdminDashboardTabs]') ||
      fullMessage.includes('[CallDetailModalSidebar]') ||
      fullMessage.includes('[DailyView]') ||
      fullMessage.includes('[DynamicsLead]') ||
      fullMessage.includes('EVENTO RECIBIDO') ||
      fullMessage.includes('Cambio en keys') ||
      fullMessage.includes('Estado actualizado') ||
      fullMessage.includes('pausas activas') ||
      fullMessage.includes('Cambio detectado') ||
      fullMessage.includes('Verificando permisos') ||
      fullMessage.includes('Cargando contador de mensajes') ||
      fullMessage.includes('Contador de mensajes:') ||
      fullMessage.includes('Render Debug') ||
      fullMessage.includes('Prospecto data (useEffect)') ||
      fullMessage.includes('Cargando detalle de llamada:') ||
      fullMessage.includes('[ProspectDetailSidebar]') ||
      fullMessage.includes('Estados del modal actualizados') ||
      fullMessage.includes('Prospecto cargado:') ||
      fullMessage.includes('handleOpenCallDetail llamado') ||
      fullMessage.includes('Estados actualizados - selectedCallId') ||
      fullMessage.includes('Abriendo CallDetailModalSidebar') ||
      fullMessage.includes('Cerrando CallDetailModalSidebar') ||
      fullMessage.includes('Cambiando llamada a:') ||
      fullMessage.includes('puede ver llamadas programadas') ||
      fullMessage.includes('puede ver conversaciones') ||
      fullMessage.includes('ejecutivos como backup') ||
      fullMessage.includes('Carga inicial') ||
      fullMessage.includes('Columna') ||
      fullMessage.includes('cargada:') ||
      fullMessage.includes('Fecha seleccionada:') ||
      fullMessage.includes('Total llamadas:') ||
      fullMessage.includes('Filtradas:') ||
      fullMessage.includes('loadEtapaTotals') ||
      fullMessage.includes('prospectos procesados') ||
      fullMessage.includes('Cambiando tema a:') ||
      fullMessage.includes('Header:') ||
      fullMessage.includes('Buscando lead') ||
      fullMessage.includes('Respuesta recibida')) {
    return;
  }
  
  // Silenciar mensaje de React DevTools
  if (fullMessage.includes('Download the React DevTools') ||
      fullMessage.includes('react.dev/link/react-devtools')) {
    return;
  }
  
  originalInfo.apply(console, args);
};

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
  
  // Silenciar logs de fetch del navegador en warnings también
  if (fullMessage.includes('Fetch finished loading') || 
      fullMessage.includes('Fetch failed loading') ||
      fullMessage.includes('window.fetch')) {
    return;
  }
  
  // Silenciar warnings sobre system_config (tabla puede no existir en todas las BDs)
  // Y warnings de Realtime que son esperados
  if (fullMessage.includes('system_config') || 
      fullMessage.includes('selected_logo') ||
      fullMessage.includes('error cargando logo') ||
      fullMessage.includes('could not find the table') ||
      fullMessage.includes('schema cache') ||
      fullMessage.includes('[Realtime] Estado de suscripción') ||
      fullMessage.includes('CHANNEL_ERROR') ||
      fullMessage.includes('posible sobrecarga de conexiones') ||
      fullMessage.includes('[REALTIME V4]') ||
      fullMessage.includes('[Widget] Error en suscripción realtime')) {
    return;
  }
  
  originalWarn.apply(console, args);
};

// Interceptar errores de red 404 usando fetch interceptor
// Esto previene que los errores 404 aparezcan en la consola del navegador
const originalFetch = window.fetch;
window.fetch = async function(...args: any[]) {
  const url = args[0]?.toString() || '';
  
  // Interceptar peticiones a tablas que no existen (se manejan con datos mock o fallbacks)
  // También interceptar queries muy largas que causan 400
  if (url.includes('/rest/v1/tools') || 
      url.includes('/rest/v1/agent_templates') ||
      url.includes('/rest/v1/coordinaciones') ||
      url.includes('/rest/v1/ejecutivos') ||
      url.includes('/rest/v1/system_config') ||
      (url.includes('/rest/v1/llamadas_ventas') && url.length > 8000) ||
      (url.includes('/rest/v1/mensajes_whatsapp') && url.length > 8000)) {
    try {
      // Usar un try-catch interno para capturar cualquier error antes de que se muestre
      const response = await originalFetch.apply(window, args);
      
      // Si es un 404 o 406, interceptar antes de que se muestre en consola
      if (response.status === 404 || response.status === 406) {
        // Para system_config, retornar una respuesta que no cause errores en consola
        if (url.includes('/rest/v1/system_config')) {
          // Retornar una respuesta que Supabase pueda procesar sin mostrar errores
          // El 406 indica que la tabla no está expuesta o tiene RLS restrictivo
          return new Response(JSON.stringify({ message: 'No rows returned', code: 'PGRST116', details: null, hint: null }), {
            status: 200,
            statusText: 'OK',
            headers: { 
              'Content-Type': 'application/json',
              'Content-Range': '*/0'
            }
          });
        }
        
        // Para otras tablas, retornar respuesta silenciosa
        const clonedResponse = response.clone();
        return clonedResponse;
      }
      
      return response;
    } catch (error) {
      // Si hay un error de red, también manejarlo silenciosamente
      // El código tiene fallbacks para estos casos
      if (url.includes('/rest/v1/system_config')) {
        return new Response(JSON.stringify({ message: 'No rows returned', code: 'PGRST116', details: null, hint: null }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 
            'Content-Type': 'application/json',
            'Content-Range': '*/0'
          }
        });
      }
      
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
    // También interceptar queries muy largas que causan 400
    if (url.includes('/rest/v1/tools') || 
        url.includes('/rest/v1/agent_templates') ||
        url.includes('/rest/v1/coordinaciones') ||
        url.includes('/rest/v1/ejecutivos') ||
        url.includes('/rest/v1/system_config') ||
        (url.includes('/rest/v1/llamadas_ventas') && url.length > 8000) ||
        (url.includes('/rest/v1/mensajes_whatsapp') && url.length > 8000)) {
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

// NOTA: El interceptor de console.error principal está más abajo (línea ~308)
// Este interceptor anterior se mantiene para compatibilidad pero el principal tiene prioridad

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
      severity: 'alto',
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
      severity: 'alto',
      category: 'aplicacion',
      details: {
        reason: event.reason instanceof Error ? event.reason.message : String(event.reason)
      }
    }).catch(() => {}); // No queremos que errores de logging causen más errores
  }).catch(() => {}); // Silenciar errores de importación
});

// Interceptar console.error para capturar errores críticos
// IMPORTANTE: Este interceptor debe filtrar ANTES de llamar al original para evitar mostrar errores esperados
// NOTA: Este interceptor sobrescribe el anterior, así que debe incluir toda la lógica de filtrado
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const firstArg = args[0];
  const message = args[0]?.toString() || '';
  const fullMessage = args.map(arg => String(arg)).join(' ').toLowerCase();
  
  // Filtrar errores 404 y 406 de system_config ANTES de mostrar (PRIORIDAD ALTA)
  if ((fullMessage.includes('404') || fullMessage.includes('406') || 
       fullMessage.includes('not found') || fullMessage.includes('not acceptable')) && 
      (fullMessage.includes('system_config') || 
       fullMessage.includes('selected_logo') ||
       fullMessage.includes('/rest/v1/system_config'))) {
    return; // Silenciar completamente - no mostrar ni loggear
  }
  
  // Silenciar errores 404 de Supabase para tablas que no existen (se manejan con datos mock o fallbacks)
  if ((message.includes('404') || fullMessage.includes('404')) && 
      (fullMessage.includes('tools') || 
       fullMessage.includes('agent_templates') || 
       fullMessage.includes('coordinaciones') ||
       fullMessage.includes('ejecutivos') ||
       fullMessage.includes('system_config') ||
       fullMessage.includes('not found'))) {
    return;
  }
  
  // Silenciar errores de red 404 de Supabase REST API
  if (fullMessage.includes('get') && fullMessage.includes('404') && 
      (fullMessage.includes('/rest/v1/tools') || 
       fullMessage.includes('/rest/v1/agent_templates') ||
       fullMessage.includes('/rest/v1/coordinaciones') ||
       fullMessage.includes('/rest/v1/ejecutivos') ||
       fullMessage.includes('/rest/v1/system_config'))) {
    return;
  }
  
  // Silenciar errores 400 de queries muy largas (se manejan con batches)
  if ((message.includes('400') || fullMessage.includes('400')) && 
      (fullMessage.includes('llamadas_ventas') || fullMessage.includes('mensajes_whatsapp')) &&
      fullMessage.includes('bad request')) {
    return;
  }
  
  // Silenciar errores 406 de system_config (tabla puede no existir o no estar expuesta)
  if ((message.includes('406') || fullMessage.includes('406')) && 
      (fullMessage.includes('system_config') || 
       fullMessage.includes('selected_logo') ||
       fullMessage.includes('/rest/v1/system_config'))) {
    return;
  }
  
  // Excluir mensajes del ErrorLogService
  if (fullMessage.includes('[errorlogservice]') || 
      fullMessage.includes('errorlogservice') ||
      fullMessage.includes('webhook responded') ||
      fullMessage.includes('error sending to webhook') ||
      fullMessage.includes('error logging error')) {
    return; // No loggear errores del propio servicio de logging
  }
  
  // Llamar al original solo si no es un error que debe silenciarse
  originalConsoleError.apply(console, args);
  
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

