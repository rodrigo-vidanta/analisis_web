/**
 * Catálogo de Códigos de Error WhatsApp/N8N
 * 
 * Generado a partir de análisis de logs de producción
 * Última actualización: 3 de Febrero 2026
 */

export enum ErrorCategory {
  WHATSAPP_API = 'whatsapp_api',
  CONNECTIVITY = 'connectivity',
  SYSTEM = 'system',
  MEDIA = 'media',
  TEMPLATE = 'template',
  TIMEOUT = 'timeout',
  BUSINESS_RULES = 'business_rules'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',    // Requiere acción inmediata
  HIGH = 'high',           // Problema importante que afecta funcionalidad
  MEDIUM = 'medium',       // Problema que puede resolverse con reintentos
  LOW = 'low',             // Informativo, no bloquea operación
  INFO = 'info'            // Solo informativo
}

export interface ErrorCode {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  description: string;
  userMessage: string;
  technicalDetails: string;
  suggestedAction: string;
  retryable: boolean;
  documentationUrl?: string;
}

/**
 * Catálogo completo de códigos de error
 */
export const ERROR_CATALOG: Record<string, ErrorCode> = {
  // ===== ERRORES DE ENTREGA DE MENSAJES =====
  '131026': {
    code: '131026',
    category: ErrorCategory.WHATSAPP_API,
    severity: ErrorSeverity.HIGH,
    title: 'Mensaje no entregable',
    description: 'El mensaje no pudo ser entregado al destinatario',
    userMessage: 'No pudimos entregar tu mensaje. El número podría estar inactivo o bloqueado.',
    technicalDetails: 'Message Undeliverable - Número inválido, bloqueado o WhatsApp desinstalado',
    suggestedAction: 'Verificar validez del número de teléfono. Considerar marcar como inactivo.',
    retryable: false
  },

  // ===== ERRORES DE ENGAGEMENT =====
  '131049': {
    code: '131049',
    category: ErrorCategory.BUSINESS_RULES,
    severity: ErrorSeverity.MEDIUM,
    title: 'Límite de engagement alcanzado',
    description: 'Mensaje no entregado para mantener un ecosistema saludable',
    userMessage: 'Este contacto ha alcanzado su límite de mensajes. Espera antes de enviar más.',
    technicalDetails: 'WhatsApp bloqueó el mensaje para mantener healthy ecosystem engagement',
    suggestedAction: 'Reducir frecuencia de mensajes. Esperar 24-48 horas antes de reintentar.',
    retryable: true,
    documentationUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/'
  },

  // ===== ERRORES DE USUARIO EN EXPERIMENTO =====
  '130472': {
    code: '130472',
    category: ErrorCategory.WHATSAPP_API,
    severity: ErrorSeverity.LOW,
    title: 'Usuario en experimento',
    description: 'El número del usuario está en un experimento de WhatsApp',
    userMessage: 'Este número no está disponible temporalmente.',
    technicalDetails: 'User\'s number is part of an experiment - Número en pruebas de WhatsApp',
    suggestedAction: 'Marcar como no disponible temporalmente. Reintentar en 24 horas.',
    retryable: true,
    documentationUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/'
  },

  // ===== ERRORES DE OPT-OUT =====
  '131050': {
    code: '131050',
    category: ErrorCategory.BUSINESS_RULES,
    severity: ErrorSeverity.CRITICAL,
    title: 'Usuario solicitó no recibir mensajes',
    description: 'El destinatario ha elegido dejar de recibir mensajes de marketing',
    userMessage: 'Este contacto se ha dado de baja de mensajes de marketing.',
    technicalDetails: 'User has chosen to stop receiving marketing messages from your business',
    suggestedAction: 'Marcar como opt-out. NO enviar más mensajes hasta que el usuario se suscriba nuevamente.',
    retryable: false,
    documentationUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/'
  },

  // ===== ERRORES DE MEDIA =====
  '131053': {
    code: '131053',
    category: ErrorCategory.MEDIA,
    severity: ErrorSeverity.MEDIUM,
    title: 'Error de carga de media',
    description: 'Fallo al subir archivo multimedia',
    userMessage: 'El archivo es demasiado grande o tiene un formato no soportado.',
    technicalDetails: 'Media upload error - Tamaño excede 5MB o formato no válido (solo PNG/JPEG)',
    suggestedAction: 'Validar: imágenes <5MB, solo PNG/JPEG. Comprimir antes de enviar.',
    retryable: true
  },

  // ===== ERRORES GENÉRICOS DE WHATSAPP =====
  '131000': {
    code: '131000',
    category: ErrorCategory.WHATSAPP_API,
    severity: ErrorSeverity.HIGH,
    title: 'Error genérico de WhatsApp',
    description: 'Algo salió mal en la API de WhatsApp',
    userMessage: 'Error temporal en el servicio de mensajería. Intenta de nuevo.',
    technicalDetails: 'Something went wrong - Error genérico de WhatsApp Business API',
    suggestedAction: 'Verificar status de WhatsApp API. Reintentar en 5 minutos.',
    retryable: true
  },

  // ===== ERRORES DE TEMPLATES =====
  '132000': {
    code: '132000',
    category: ErrorCategory.TEMPLATE,
    severity: ErrorSeverity.HIGH,
    title: 'Error en parámetros de template',
    description: 'Número de parámetros no coincide con el template',
    userMessage: 'Error en el formato del mensaje. Contacta a soporte.',
    technicalDetails: 'Number of parameters does not match the expected number of params',
    suggestedAction: 'Verificar template y parámetros enviados. Corregir localizable_params.',
    retryable: true
  },

  // ===== ERRORES DE VENTANA DE 24 HORAS =====
  'MSG_OUTSIDE_24H': {
    code: 'MSG_OUTSIDE_24H',
    category: ErrorCategory.BUSINESS_RULES,
    severity: ErrorSeverity.MEDIUM,
    title: 'Fuera de ventana de 24 horas',
    description: 'No se puede enviar mensaje fuera de la ventana de conversación',
    userMessage: 'No podemos enviar el mensaje porque han pasado más de 24 horas sin respuesta.',
    technicalDetails: 'Message not sent because outside 24 hours - Requiere template aprobado',
    suggestedAction: 'Usar template aprobado o esperar a que el usuario inicie conversación.',
    retryable: false
  },

  // ===== ERRORES DE CONEXIÓN =====
  'CONNECTION_ERROR': {
    code: 'CONNECTION_ERROR',
    category: ErrorCategory.CONNECTIVITY,
    severity: ErrorSeverity.HIGH,
    title: 'Error de conexión',
    description: 'Fallo en la conexión con el servicio',
    userMessage: 'Problema de conexión. Reintentando automáticamente...',
    technicalDetails: 'Connection error - Timeout o conexión rechazada',
    suggestedAction: 'Verificar conectividad. Reintentar con backoff exponencial.',
    retryable: true
  },

  // ===== ERRORES DE TIMEOUT =====
  'REQUEST_TIMEOUT': {
    code: 'REQUEST_TIMEOUT',
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    title: 'Timeout de solicitud',
    description: 'La solicitud tardó demasiado tiempo',
    userMessage: 'La solicitud tardó mucho. Reintentando...',
    technicalDetails: 'Request timeout - No response within time limit',
    suggestedAction: 'Reintentar con timeout mayor. Verificar carga del servidor.',
    retryable: true
  },

  // ===== ERRORES DE cURL =====
  'CURL_TIMEOUT': {
    code: 'CURL_TIMEOUT',
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.HIGH,
    title: 'Timeout de cURL',
    description: 'Operación de red expiró después de 15 segundos',
    userMessage: 'Error de red. Reintentando...',
    technicalDetails: 'cURL error 28: Operation timed out after 15000+ milliseconds',
    suggestedAction: 'Verificar latencia de red. Aumentar timeout si persiste.',
    retryable: true
  }
};

/**
 * Extrae código de error de un mensaje de log
 */
export function extractErrorCode(description: string): string | null {
  // Patrón 1: WhatsApp Error con código JSON
  const whatsappErrorMatch = description.match(/"code":(\d+)/);
  if (whatsappErrorMatch) {
    return whatsappErrorMatch[1];
  }

  // Patrón 2: Error genérico (#CODE)
  const genericErrorMatch = description.match(/\(#(\d+)\)/);
  if (genericErrorMatch) {
    return genericErrorMatch[1];
  }

  // Patrón 3: Errores específicos sin código numérico
  if (description.includes('Message not sent because outside 24 hours')) {
    return 'MSG_OUTSIDE_24H';
  }

  if (description.includes('connection error')) {
    return 'CONNECTION_ERROR';
  }

  if (description.includes('Request timeout')) {
    return 'REQUEST_TIMEOUT';
  }

  if (description.includes('cURL error 28')) {
    return 'CURL_TIMEOUT';
  }

  return null;
}

/**
 * Obtiene información completa del error
 */
export function getErrorInfo(description: string): ErrorCode | null {
  const code = extractErrorCode(description);
  if (!code) return null;

  return ERROR_CATALOG[code] || null;
}

/**
 * Clasifica error por severidad
 */
export function classifyErrorSeverity(description: string): ErrorSeverity {
  const errorInfo = getErrorInfo(description);
  return errorInfo?.severity || ErrorSeverity.MEDIUM;
}

/**
 * Determina si un error puede ser reintentado
 */
export function isRetryable(description: string): boolean {
  const errorInfo = getErrorInfo(description);
  return errorInfo?.retryable ?? true;
}

/**
 * Obtiene mensaje amigable para el usuario
 */
export function getUserFriendlyMessage(description: string): string {
  const errorInfo = getErrorInfo(description);
  return errorInfo?.userMessage || 'Ocurrió un error inesperado. Intenta nuevamente.';
}

/**
 * Obtiene acción sugerida para resolver el error
 */
export function getSuggestedAction(description: string): string {
  const errorInfo = getErrorInfo(description);
  return errorInfo?.suggestedAction || 'Contactar a soporte técnico.';
}

/**
 * Agrupa errores por categoría
 */
export function groupErrorsByCategory(errors: string[]): Record<ErrorCategory, number> {
  const grouped: Record<ErrorCategory, number> = {
    [ErrorCategory.WHATSAPP_API]: 0,
    [ErrorCategory.CONNECTIVITY]: 0,
    [ErrorCategory.SYSTEM]: 0,
    [ErrorCategory.MEDIA]: 0,
    [ErrorCategory.TEMPLATE]: 0,
    [ErrorCategory.TIMEOUT]: 0,
    [ErrorCategory.BUSINESS_RULES]: 0
  };

  errors.forEach(errorDesc => {
    const errorInfo = getErrorInfo(errorDesc);
    if (errorInfo) {
      grouped[errorInfo.category]++;
    }
  });

  return grouped;
}

/**
 * Estadísticas de errores
 */
export interface ErrorStats {
  totalErrors: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  topErrors: Array<{ code: string; count: number; title: string }>;
  retryableCount: number;
  nonRetryableCount: number;
}

/**
 * Genera estadísticas de una lista de descripciones de error
 */
export function generateErrorStats(descriptions: string[]): ErrorStats {
  const byCategory: Record<ErrorCategory, number> = {
    [ErrorCategory.WHATSAPP_API]: 0,
    [ErrorCategory.CONNECTIVITY]: 0,
    [ErrorCategory.SYSTEM]: 0,
    [ErrorCategory.MEDIA]: 0,
    [ErrorCategory.TEMPLATE]: 0,
    [ErrorCategory.TIMEOUT]: 0,
    [ErrorCategory.BUSINESS_RULES]: 0
  };

  const bySeverity: Record<ErrorSeverity, number> = {
    [ErrorSeverity.CRITICAL]: 0,
    [ErrorSeverity.HIGH]: 0,
    [ErrorSeverity.MEDIUM]: 0,
    [ErrorSeverity.LOW]: 0,
    [ErrorSeverity.INFO]: 0
  };

  const errorCounts: Record<string, { count: number; title: string }> = {};
  let retryableCount = 0;
  let nonRetryableCount = 0;

  descriptions.forEach(desc => {
    const code = extractErrorCode(desc);
    const errorInfo = getErrorInfo(desc);

    if (errorInfo) {
      byCategory[errorInfo.category]++;
      bySeverity[errorInfo.severity]++;

      if (errorInfo.retryable) {
        retryableCount++;
      } else {
        nonRetryableCount++;
      }

      if (code) {
        if (!errorCounts[code]) {
          errorCounts[code] = { count: 0, title: errorInfo.title };
        }
        errorCounts[code].count++;
      }
    }
  });

  const topErrors = Object.entries(errorCounts)
    .map(([code, data]) => ({ code, count: data.count, title: data.title }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalErrors: descriptions.length,
    byCategory,
    bySeverity,
    topErrors,
    retryableCount,
    nonRetryableCount
  };
}
