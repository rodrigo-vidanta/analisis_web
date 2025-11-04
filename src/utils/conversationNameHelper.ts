/**
 * ============================================
 * HELPER: Determinar nombre a mostrar para conversaciones
 * ============================================
 * 
 * Prioriza el nombre según los siguientes criterios:
 * 1. nombre_completo (si existe y no está vacío)
 * 2. nombre_whatsapp (si existe Y cumple criterios: tiene caracteres válidos, no demasiados emojis)
 * 3. Número de teléfono a 10 dígitos
 */

interface ProspectoData {
  nombre_completo?: string | null;
  nombre_whatsapp?: string | null;
  whatsapp?: string | null;
}

/**
 * Valida si un nombre de WhatsApp es válido para mostrar
 * Criterios:
 * - Tiene al menos 2 caracteres válidos (letras, números, espacios, acentos)
 * - No tiene más emojis que caracteres válidos
 * - No tiene más de 5 emojis
 */
export function isValidWhatsAppName(name: string | null | undefined): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();
  if (trimmed === '') {
    return false;
  }

  // Contar caracteres válidos (letras, números, espacios, acentos básicos)
  const validChars = trimmed.match(/[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ]/g) || [];
  const validCharCount = validChars.length;

  // Contar emojis (aproximación: caracteres fuera del rango ASCII básico)
  // Los emojis suelen estar en rangos Unicode específicos
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = trimmed.match(emojiPattern) || [];
  const emojiCount = emojis.length;

  // Validar: debe tener al menos 2 caracteres válidos
  if (validCharCount < 2) {
    return false;
  }

  // Si tiene más emojis que caracteres válidos, no es válido
  if (emojiCount > validCharCount) {
    return false;
  }

  // Si tiene más de 5 emojis, no es válido
  if (emojiCount > 5) {
    return false;
  }

  return true;
}

/**
 * Formatea un número de teléfono a 10 dígitos
 * Extrae solo los últimos 10 dígitos numéricos
 */
export function formatPhoneTo10Digits(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Extraer solo dígitos
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) {
    return null;
  }

  // Tomar los últimos 10 dígitos
  const last10 = digits.slice(-10);

  if (last10.length < 10) {
    return null;
  }

  return last10;
}

/**
 * Determina el nombre a mostrar para una conversación
 * según la priorización especificada
 */
export function getDisplayName(prospecto: ProspectoData): string {
  // 1. Prioridad: nombre_completo (si existe y no está vacío)
  if (prospecto.nombre_completo && prospecto.nombre_completo.trim() !== '') {
    return prospecto.nombre_completo.trim();
  }

  // 2. Prioridad: nombre_whatsapp (si existe Y es válido)
  if (isValidWhatsAppName(prospecto.nombre_whatsapp)) {
    return prospecto.nombre_whatsapp!.trim();
  }

  // 3. Prioridad: Número de teléfono a 10 dígitos
  const phone10 = formatPhoneTo10Digits(prospecto.whatsapp);
  if (phone10) {
    return phone10;
  }

  // Fallback: mostrar el whatsapp original si no se puede formatear
  return prospecto.whatsapp || 'Sin nombre';
}

